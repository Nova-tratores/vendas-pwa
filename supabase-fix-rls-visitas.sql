-- ============================================
-- FIX (2026-06-02): visitas/negócios/pessoas/máquinas não eram registrados
--
-- Causa raiz: as policies RLS dessas tabelas (do supabase-setup.sql) usavam
-- current_setting('app.vendedor_id'), parâmetro que o app NUNCA seta (ele usa
-- Supabase Auth). No INSERT, a avaliação da policy lançava
--   42704: unrecognized configuration parameter "app.vendedor_id"
-- e abortava a gravação. Resultado: o vendedor via "sucesso" (gravou no
-- IndexedDB local), mas o push pro Supabase falhava em silêncio — então nada
-- chegava ao supervisor, e o cache local podia ser apagado depois.
--
-- Além disso: as FKs de vendedor_id e as views do supervisor ainda apontavam
-- pra tabela legada "Tecnicos" em vez de "vendedores".
--
-- Mantém o MESMO nível de RLS do resto do app (USING true; isolamento por
-- vendedor é feito no pull client-side). Apertar RLS = item A3 (pendente).
--
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Remove as policies quebradas (current_setting) -------------------
DROP POLICY IF EXISTS "vendedor_visitas"  ON visitas;
DROP POLICY IF EXISTS "vendedor_negocios" ON negocios;
DROP POLICY IF EXISTS "vendedor_pessoas"  ON pessoas;
DROP POLICY IF EXISTS "vendedor_maquinas" ON maquinas;
DROP POLICY IF EXISTS "vendedor_clientes" ON clientes_vendas;

-- 2. Policies permissivas (leitura + escrita) -------------------------
DROP POLICY IF EXISTS "rw_visitas"  ON visitas;
DROP POLICY IF EXISTS "rw_negocios" ON negocios;
DROP POLICY IF EXISTS "rw_pessoas"  ON pessoas;
DROP POLICY IF EXISTS "rw_maquinas" ON maquinas;

CREATE POLICY "rw_visitas"  ON visitas  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rw_negocios" ON negocios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rw_pessoas"  ON pessoas  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "rw_maquinas" ON maquinas FOR ALL USING (true) WITH CHECK (true);

-- 3. Corrige FK vendedor_id: "Tecnicos" -> vendedores ------------------
-- Remove qualquer FK de visitas/negocios que aponte pra "Tecnicos".
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT con.conname, rel.relname AS tbl
    FROM pg_constraint con
    JOIN pg_class rel  ON rel.oid  = con.conrelid
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE con.contype = 'f'
      AND rel.relname IN ('visitas','negocios')
      AND frel.relname = 'Tecnicos'
  LOOP
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- Cria a FK correta pra vendedores(id) se ainda não existir.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visitas_vendedor_fk') THEN
    ALTER TABLE visitas  ADD CONSTRAINT visitas_vendedor_fk
      FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'negocios_vendedor_fk') THEN
    ALTER TABLE negocios ADD CONSTRAINT negocios_vendedor_fk
      FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);
  END IF;
END $$;

-- 4. Views do supervisor: juntar com vendedores (não "Tecnicos") -------
CREATE OR REPLACE VIEW vw_visitas_detalhadas AS
SELECT
  v.*,
  vd.nome          AS vendedor_nome,
  cv.nome          AS cliente_nome,
  c.nome_fantasia  AS propriedade_nome
FROM visitas v
LEFT JOIN vendedores vd      ON vd.id = v.vendedor_id
LEFT JOIN "Clientes" c       ON c.id  = v.propriedade_id
LEFT JOIN clientes_vendas cv ON cv.id = c.cliente_dono_id;

CREATE OR REPLACE VIEW vw_negocios_detalhados AS
SELECT
  n.*,
  vd.nome AS vendedor_nome,
  cv.nome AS cliente_nome
FROM negocios n
LEFT JOIN vendedores vd      ON vd.id = n.vendedor_id
LEFT JOIN clientes_vendas cv ON cv.id = n.cliente_id;
