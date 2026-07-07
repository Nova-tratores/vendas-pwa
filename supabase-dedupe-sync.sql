-- ============================================
-- SYNC IDEMPOTENTE + SOFT-DELETE + PRIMEIRA VISITA + DEDUPE (2026-07-06)
--
-- Problema: visitas e propriedades duplicavam porque (1) o push era INSERT
-- puro sem idempotência (retry após resposta perdida re-inseria) e (2) o
-- pull não conseguia casar o registro local com o do servidor (comparação
-- de timestamp como string: local "…Z" vs PostgREST "…+00:00"). A exclusão
-- de visita só apagava o IndexedDB — o pull ressuscitava a visita.
--
-- Solução: client_uuid (uuid gerado no celular) + UNIQUE parcial + upsert
-- no push; soft-delete (deleted_at) que propaga a exclusão via pull;
-- trigger que marca primeira_visita no servidor (visão global).
--
-- ORDEM DE EXECUÇÃO (importante):
--   1. Rodar blocos 1 a 4 (colunas/índices/trigger/policy) ANTES do deploy
--      do app novo — o push novo envia client_uuid e a coluna precisa existir.
--   2. Deploy do app no Railway.
--   3. FAZER BACKUP (Database -> Backups) e rodar o dedupe, sempre com o
--      preview antes: bloco 5 (visitas); depois 8a — se acusar clientes
--      duplicados, rode 8b + 8c (o 8c substitui o 6b); se 8a vier vazio,
--      rode o 6b.
--   4. Rodar o bloco 7 (force_resync) por último — cada celular envia os
--      pendentes, limpa o cache sincronizado e re-baixa a base já limpa.
--
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Colunas novas ------------------------------------------------------
-- Todas nullable e sem default: seguras na tabela compartilhada com o ERP
-- (não altera linhas existentes nem inserts do portal).
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS client_uuid     uuid;
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS deleted_at      timestamptz;
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS primeira_visita boolean;

ALTER TABLE "portal_nt_clientes_PRINCIPAL" ADD COLUMN IF NOT EXISTS client_uuid uuid;

-- 2. Índices UNIQUE (idempotência do push) -------------------------------
-- SEM predicado parcial: `ON CONFLICT (client_uuid)` do upsert NÃO casa com
-- índice parcial (erro 42P10 — travou o sync do Pedro em 2026-07-07).
-- NULLs são distintos por padrão no Postgres, então as linhas do ERP/legadas
-- (client_uuid NULL) convivem numa UNIQUE cheia sem conflito.
DROP INDEX IF EXISTS visitas_client_uuid_uniq;
DROP INDEX IF EXISTS portal_nt_clientes_client_uuid_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS visitas_client_uuid_uniq
  ON visitas (client_uuid);

CREATE UNIQUE INDEX IF NOT EXISTS portal_nt_clientes_client_uuid_uniq
  ON "portal_nt_clientes_PRINCIPAL" (client_uuid);

-- 3. Trigger primeira_visita --------------------------------------------
-- O celular offline só enxerga as visitas do próprio vendedor; o servidor
-- vê todas — por isso a palavra final é do trigger. BEFORE INSERT apenas:
-- o upsert em conflito vira UPDATE e não recalcula (comportamento certo).
CREATE OR REPLACE FUNCTION set_primeira_visita() RETURNS trigger AS $$
BEGIN
  IF NEW.propriedade_id IS NOT NULL THEN
    -- Ignora a linha com o MESMO client_uuid: num retry de upsert o BEFORE
    -- INSERT roda de novo e, sem isso, a própria visita zeraria a flag.
    NEW.primeira_visita := NOT EXISTS (
      SELECT 1 FROM visitas v
      WHERE v.propriedade_id = NEW.propriedade_id
        AND v.deleted_at IS NULL
        AND (NEW.client_uuid IS NULL OR v.client_uuid IS DISTINCT FROM NEW.client_uuid)
    );
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_primeira_visita ON visitas;
CREATE TRIGGER trg_primeira_visita BEFORE INSERT ON visitas
  FOR EACH ROW EXECUTE FUNCTION set_primeira_visita();

-- 3b. Recria a view do supervisor ----------------------------------------
-- A view foi criada antes das colunas novas ("v.*" congela na criação), então
-- deleted_at/primeira_visita/client_uuid não apareceriam. DROP + CREATE porque
-- OR REPLACE não aceita colunas novas no meio da lista.
DROP VIEW IF EXISTS vw_visitas_detalhadas;
CREATE VIEW vw_visitas_detalhadas AS
SELECT
  v.*,
  vd.nome          AS vendedor_nome,
  cv.nome          AS cliente_nome,
  c.nome_fantasia  AS propriedade_nome
FROM visitas v
LEFT JOIN vendedores vd                     ON vd.id = v.vendedor_id
LEFT JOIN "portal_nt_clientes_PRINCIPAL" c  ON c.id  = v.propriedade_id
LEFT JOIN clientes_vendas cv                ON cv.id = c.cliente_dono_id;

-- 4. RLS: UPDATE para o upsert ------------------------------------------
-- visitas já tem rw_visitas FOR ALL USING(true) (supabase-fix-rls-visitas.sql).
-- Na tabela do ERP garante o UPDATE (necessário quando o upsert conflita).
-- Se a RLS estiver desabilitada nessa tabela, a policy fica inerte — ok.
DROP POLICY IF EXISTS "app_update_portal_clientes" ON "portal_nt_clientes_PRINCIPAL";
CREATE POLICY "app_update_portal_clientes" ON "portal_nt_clientes_PRINCIPAL"
  FOR UPDATE USING (true) WITH CHECK (true);

-- 5. Dedupe de visitas ---------------------------------------------------
-- Duplicatas são cópias idênticas com id diferente (retry do push).
-- Mantém o MENOR id (o mais antigo) e reponta as referências antes de apagar.

-- 5a. PREVIEW — rodar primeiro e conferir o que será apagado:
SELECT vendedor_id, propriedade_id, data_visita, created_at,
       count(*) AS copias, array_agg(id ORDER BY id) AS ids
FROM visitas
GROUP BY vendedor_id, propriedade_id, data_visita, created_at, coalesce(resumo, '')
HAVING count(*) > 1
ORDER BY created_at DESC;

-- 5b. EXECUÇÃO:
WITH dup AS (
  SELECT id,
         min(id) OVER (PARTITION BY vendedor_id, propriedade_id, data_visita,
                                    created_at, coalesce(resumo, '')) AS keeper
  FROM visitas
),
del AS (
  SELECT id, keeper FROM dup WHERE id <> keeper
),
fix_coment AS (
  UPDATE comentarios_supervisor c SET entidade_id = d.keeper
  FROM del d WHERE c.entidade = 'visita' AND c.entidade_id = d.id
  RETURNING c.id
),
fix_dupref AS (
  UPDATE visitas v SET duplicada_de = d.keeper
  FROM del d WHERE v.duplicada_de = d.id
  RETURNING v.id
)
DELETE FROM visitas WHERE id IN (SELECT id FROM del);

-- 6. Dedupe de portal_nt_clientes_PRINCIPAL ------------------------------
-- SÓ mexe em linhas criadas pelo app (cliente_dono_id IS NOT NULL) — as do
-- ERP têm cliente_dono_id NULL e ficam intocadas. BACKUP ANTES DESTE BLOCO.

-- 6a. PREVIEW:
SELECT nome_fantasia, cidade, cliente_dono_id, created_at,
       count(*) AS copias, array_agg(id ORDER BY id) AS ids
FROM "portal_nt_clientes_PRINCIPAL"
WHERE cliente_dono_id IS NOT NULL
GROUP BY nome_fantasia, coalesce(cidade, ''), cliente_dono_id, created_at, cidade
HAVING count(*) > 1
ORDER BY created_at DESC;

-- 6b. EXECUÇÃO:
WITH dup AS (
  SELECT id,
         min(id) OVER (PARTITION BY nome_fantasia, coalesce(cidade, ''),
                                    cliente_dono_id, created_at) AS keeper
  FROM "portal_nt_clientes_PRINCIPAL"
  WHERE cliente_dono_id IS NOT NULL
),
del AS (
  SELECT id, keeper FROM dup WHERE id <> keeper
),
fix_visitas AS (
  UPDATE visitas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_negocios AS (
  UPDATE negocios t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_pessoas AS (
  UPDATE pessoas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_maquinas AS (
  UPDATE maquinas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
)
DELETE FROM "portal_nt_clientes_PRINCIPAL" WHERE id IN (SELECT id FROM del);

-- 8. Dedupe de clientes_vendas (donos duplicados) ------------------------
-- O preview do bloco 6 mostrou a MESMA propriedade ("Sítio São Sebastião",
-- Fartura) em ~24 cliente_dono_id diferentes, todos criados no mesmo minuto:
-- o CLIENTE também duplicou, cada cópia arrastando a sua propriedade.
-- Fluxo: rode 8a; se houver duplicatas, rode 8b e DEPOIS 8c (o 8c substitui
-- o 6b — mesma limpeza, mas ignorando created_at, que difere entre as cópias
-- do dono). Se 8a vier vazio, use só o 6b.

-- 8a. PREVIEW — clientes duplicados (mesmo nome no mesmo vendedor).
-- btrim: várias cópias têm espaço sobrando no fim do nome.
SELECT btrim(nome) AS nome, vendedor_id, count(*) AS copias, array_agg(id ORDER BY id) AS ids
FROM clientes_vendas
GROUP BY btrim(nome), vendedor_id
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- 8b. EXECUÇÃO — mantém o menor id do cliente e reponta os filhos:
WITH dup AS (
  SELECT id, min(id) OVER (PARTITION BY btrim(nome), vendedor_id) AS keeper
  FROM clientes_vendas
),
del AS (
  SELECT id, keeper FROM dup WHERE id <> keeper
),
fix_props AS (
  UPDATE "portal_nt_clientes_PRINCIPAL" t SET cliente_dono_id = d.keeper
  FROM del d WHERE t.cliente_dono_id = d.id RETURNING t.id
),
fix_negocios AS (
  UPDATE negocios t SET cliente_id = d.keeper
  FROM del d WHERE t.cliente_id = d.id RETURNING t.id
)
DELETE FROM clientes_vendas WHERE id IN (SELECT id FROM del);

-- 8c. Propriedades do mesmo dono com o mesmo nome (substitui o 6b) --------
-- Depois do 8b as cópias caem todas no mesmo dono; aqui elas se fundem.
-- Sem created_at na partição: as cópias nasceram com segundos de diferença.

-- PREVIEW:
SELECT btrim(nome_fantasia) AS nome_fantasia, cidade, cliente_dono_id,
       count(*) AS copias, array_agg(id ORDER BY id) AS ids
FROM "portal_nt_clientes_PRINCIPAL"
WHERE cliente_dono_id IS NOT NULL
GROUP BY btrim(nome_fantasia), btrim(coalesce(cidade, '')), cliente_dono_id, cidade
HAVING count(*) > 1
ORDER BY count(*) DESC;

-- EXECUÇÃO:
WITH dup AS (
  SELECT id,
         min(id) OVER (PARTITION BY btrim(nome_fantasia), btrim(coalesce(cidade, '')),
                                    cliente_dono_id) AS keeper
  FROM "portal_nt_clientes_PRINCIPAL"
  WHERE cliente_dono_id IS NOT NULL
),
del AS (
  SELECT id, keeper FROM dup WHERE id <> keeper
),
fix_visitas AS (
  UPDATE visitas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_negocios AS (
  UPDATE negocios t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_pessoas AS (
  UPDATE pessoas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
),
fix_maquinas AS (
  UPDATE maquinas t SET propriedade_id = d.keeper
  FROM del d WHERE t.propriedade_id = d.id RETURNING t.id
)
DELETE FROM "portal_nt_clientes_PRINCIPAL" WHERE id IN (SELECT id FROM del);

-- 7. Force resync (rodar POR ÚLTIMO, depois do deploy + dedupe) ----------
-- Cada celular: envia pendentes -> limpa cache sincronizado -> re-baixa a
-- base já sem duplicatas. As duplicatas locais somem sozinhas.
UPDATE vendedores SET force_resync_at = now();
