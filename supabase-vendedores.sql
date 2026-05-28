-- ============================================
-- Tabela `vendedores` independente (2026-05-28)
-- Cria vendedores como entidade pr�pria. Tecnicos n�o � tocada.
-- Troca FKs em clientes_vendas / negocios / visitas / gps_rastreador
-- de Tecnicos.Id para vendedores.id.
-- Atualiza views do supervisor pra fazer JOIN com vendedores.
--
-- Pr�-condi��o: dados de teste em clientes_vendas (3 linhas) e
-- maquinas (1 linha) s�o apagados antes do swap das FKs.
--
-- Idempotente: pode rodar mais de uma vez sem quebrar.
-- ============================================

-- ============================================
-- 1. Limpeza de dados de teste (vendedor_id=1 apontava para Tecnicos)
-- ============================================
DELETE FROM maquinas;
DELETE FROM clientes_vendas;
-- pessoas / negocios / visitas / audit_logs_vendas j� est�o vazias

-- ============================================
-- 2. Tabela vendedores
-- ============================================
CREATE TABLE IF NOT EXISTS vendedores (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_uid      uuid REFERENCES auth.users(id),
  nome          text NOT NULL,
  email         text UNIQUE NOT NULL,
  telefone      text,
  ativo         boolean DEFAULT true,
  feature_flags jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Trigger para manter updated_at em sync
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendedores_set_updated_at ON vendedores;
CREATE TRIGGER vendedores_set_updated_at
  BEFORE UPDATE ON vendedores
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- ============================================
-- 3. RLS
-- ============================================
ALTER TABLE vendedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vendedor_read       ON vendedores;
DROP POLICY IF EXISTS vendedor_update_self ON vendedores;

CREATE POLICY vendedor_read
  ON vendedores FOR SELECT
  USING (true);

CREATE POLICY vendedor_update_self
  ON vendedores FOR UPDATE
  USING (auth.uid() = auth_uid);

-- Sem policy de INSERT/DELETE -> bloqueado para anon.
-- Supervisor faz INSERT direto no Supabase (com service_role).

-- ============================================
-- 4. Trocar FKs (de Tecnicos.Id para vendedores.id)
-- ============================================
ALTER TABLE clientes_vendas DROP CONSTRAINT IF EXISTS clientes_vendas_vendedor_id_fkey;
ALTER TABLE negocios        DROP CONSTRAINT IF EXISTS negocios_vendedor_id_fkey;
ALTER TABLE visitas         DROP CONSTRAINT IF EXISTS visitas_vendedor_id_fkey;
ALTER TABLE gps_rastreador  DROP CONSTRAINT IF EXISTS gps_rastreador_vendedor_id_fkey;

ALTER TABLE clientes_vendas
  ADD CONSTRAINT clientes_vendas_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);

ALTER TABLE negocios
  ADD CONSTRAINT negocios_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);

ALTER TABLE visitas
  ADD CONSTRAINT visitas_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);

ALTER TABLE gps_rastreador
  ADD CONSTRAINT gps_rastreador_vendedor_id_fkey
  FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);

-- ============================================
-- 5. Atualizar views do supervisor
--    (antes faziam JOIN com Tecnicos t ON t."Id" = v.vendedor_id)
-- ============================================
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

CREATE OR REPLACE VIEW vw_negocios_detalhados AS
SELECT
  n.*,
  vd.nome AS vendedor_nome,
  cv.nome AS cliente_nome
FROM negocios n
LEFT JOIN vendedores vd      ON vd.id = n.vendedor_id
LEFT JOIN clientes_vendas cv ON cv.id = n.cliente_id;

-- ============================================
-- 6. Como criar um vendedor real (manualmente quando tiver o usu�rio Auth)
-- ============================================
--
-- Passo 1: Authentication -> Users -> Add User
--          Email: vendedor@novatratores.com.br
--          Senha: (definir)
--
-- Passo 2: Copiar o User UID gerado
--
-- Passo 3: Rodar (substituindo UID e dados):
--   INSERT INTO vendedores (auth_uid, nome, email, telefone)
--   VALUES ('UID-AQUI', 'Nome do Vendedor', 'vendedor@novatratores.com.br', '14...');
--
-- O Login.jsx j� vincula auth_uid automaticamente se o vendedor for criado
-- s� com email (passo 3 sem auth_uid, primeira tentativa de login conecta).
