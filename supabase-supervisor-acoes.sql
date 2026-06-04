-- ============================================
-- Ações do supervisor sobre visitas/negócios (2026-06-04)
--   1. Sinalizar visita (flag + motivo)
--   2. Juntar visitas repetidas (marca a duplicada apontando pra principal)
--   3. Comentários do supervisor em visita ou negócio
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Colunas novas em visitas
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS sinalizada        boolean DEFAULT false;
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS sinalizada_motivo text;
-- duplicada_de aponta pra visita "principal" (a que fica). NULL = visita normal.
ALTER TABLE visitas ADD COLUMN IF NOT EXISTS duplicada_de      bigint REFERENCES visitas(id) ON DELETE SET NULL;

-- 2. Recriar a view: como ela usa "v.*", as colunas novas só aparecem após o replace.
--    (mesma definição da migração de vendedores: JOIN com vendedores)
CREATE OR REPLACE VIEW vw_visitas_detalhadas AS
SELECT
  v.*,
  vd.nome              AS vendedor_nome,
  cv.nome              AS cliente_nome,
  c.nome_fantasia      AS propriedade_nome
FROM visitas v
LEFT JOIN vendedores vd      ON vd.id = v.vendedor_id
LEFT JOIN "Clientes" c       ON c.id  = v.propriedade_id
LEFT JOIN clientes_vendas cv ON cv.id = c.cliente_dono_id;

-- supervisor_update_visitas (FOR UPDATE USING(true)) já existe e cobre sinalizada/duplicada_de.

-- 3. Comentários do supervisor (servem para visita OU negócio)
CREATE TABLE IF NOT EXISTS comentarios_supervisor (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entidade    text   NOT NULL CHECK (entidade IN ('visita', 'negocio')),
  entidade_id bigint NOT NULL,
  autor_id    bigint,
  autor_nome  text,
  texto       text   NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coment_sup_entidade
  ON comentarios_supervisor (entidade, entidade_id);

ALTER TABLE comentarios_supervisor ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (mesmo padrão das demais do supervisor).
DROP POLICY IF EXISTS sup_coment_read   ON comentarios_supervisor;
DROP POLICY IF EXISTS sup_coment_insert ON comentarios_supervisor;
DROP POLICY IF EXISTS sup_coment_delete ON comentarios_supervisor;

CREATE POLICY sup_coment_read   ON comentarios_supervisor FOR SELECT USING (true);
CREATE POLICY sup_coment_insert ON comentarios_supervisor FOR INSERT WITH CHECK (true);
CREATE POLICY sup_coment_delete ON comentarios_supervisor FOR DELETE USING (true);
