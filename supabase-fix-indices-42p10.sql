-- ============================================
-- HOTFIX (2026-07-07): sync do Pedro travado — erro 42P10 no upsert
--
-- Causa: os índices UNIQUE de client_uuid foram criados PARCIAIS
-- (WHERE client_uuid IS NOT NULL) e o `ON CONFLICT (client_uuid)` do
-- upsert não casa com índice parcial. Resultado: TODA propriedade/visita
-- nova falhava no push (ficava pendente no celular; nada chegava ao
-- supervisor). O app ganhou um contorno (deploy de 2026-07-07), mas o
-- índice cheio devolve o caminho rápido e a garantia no banco.
--
-- NULLs são distintos por padrão no Postgres: as linhas do ERP/legadas
-- (client_uuid NULL) convivem numa UNIQUE cheia sem conflito.
--
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Troca os índices parciais por índices cheios -------------------------
DROP INDEX IF EXISTS visitas_client_uuid_uniq;
DROP INDEX IF EXISTS portal_nt_clientes_client_uuid_uniq;

CREATE UNIQUE INDEX visitas_client_uuid_uniq
  ON visitas (client_uuid);

CREATE UNIQUE INDEX portal_nt_clientes_client_uuid_uniq
  ON "portal_nt_clientes_PRINCIPAL" (client_uuid);

-- 2. (Recomendado) client_uuid também em clientes/pessoas/máquinas/negócios
-- Hoje (2026-07-07) o retry sem idempotência duplicou de novo: cliente
-- "José Sidney Aparecido Medeiros" 3x e pessoa "Julio Cesar Gabriel" 2x.
-- Colunas nullable — o app só começa a usá-las após o próximo deploy.
ALTER TABLE clientes_vendas ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE pessoas         ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE maquinas        ADD COLUMN IF NOT EXISTS client_uuid uuid;
ALTER TABLE negocios        ADD COLUMN IF NOT EXISTS client_uuid uuid;

CREATE UNIQUE INDEX IF NOT EXISTS clientes_vendas_client_uuid_uniq ON clientes_vendas (client_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS pessoas_client_uuid_uniq         ON pessoas (client_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS maquinas_client_uuid_uniq        ON maquinas (client_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS negocios_client_uuid_uniq        ON negocios (client_uuid);
