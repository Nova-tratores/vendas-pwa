-- ============================================
-- Funil de 11 etapas + 4 campos no negócio (cidade + máquina) +
-- Solicitação da Proposta + tabelas de opções (cidades / opcoes_maquina) (2026-06-04)
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- ============================================
-- 1. NEGÓCIOS: funil novo (11 etapas)
-- ============================================
-- IMPORTANTE: dropar a constraint ANTES do UPDATE — senão gravar os status novos
-- (ex.: 'andamento') viola a constraint antiga, que só conhece os 5 valores velhos.
ALTER TABLE negocios DROP CONSTRAINT IF EXISTS negocios_status_check;

-- Mapeia os status antigos (dados de teste) para os novos.
UPDATE negocios SET status = CASE status
  WHEN 'prospect'         THEN 'prospeccao'
  WHEN 'em_negociacao'    THEN 'andamento'
  WHEN 'proposta_enviada' THEN 'apresentacao_proposta'
  WHEN 'fechado_ganho'    THEN 'fechamento_positivo'
  WHEN 'fechado_perdido'  THEN 'fechamento_negativo'
  ELSE status
END
WHERE status IN ('prospect','em_negociacao','proposta_enviada','fechado_ganho','fechado_perdido');

ALTER TABLE negocios ADD CONSTRAINT negocios_status_check CHECK (status IN (
  'prospeccao','andamento','solicitacao_proposta','apresentacao_proposta',
  'contorno_objecoes','fechamento_positivo','fechamento_negativo','fechamento_adiado',
  'pre_entrega','entrega','pos_vendas'
));
ALTER TABLE negocios ALTER COLUMN status SET DEFAULT 'prospeccao';

-- ============================================
-- 2. NEGÓCIOS: colunas novas (cidade, máquina, dados da proposta)
-- ============================================
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS cidade                 text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS maquina_familia        text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS maquina_marca          text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS maquina_modelo         text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS proposta_dados         jsonb;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS proposta_solicitada_em timestamptz;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS proposta_resolvida     boolean DEFAULT false;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS proposta_resolvida_em  timestamptz;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS proposta_resolvida_por text;

-- ============================================
-- 3. View detalhada do supervisor (DROP + CREATE p/ pegar colunas novas)
-- ============================================
DROP VIEW IF EXISTS vw_negocios_detalhados;
CREATE VIEW vw_negocios_detalhados AS
SELECT
  n.*,
  vd.nome AS vendedor_nome,
  cv.nome AS cliente_nome
FROM negocios n
LEFT JOIN vendedores vd      ON vd.id = n.vendedor_id
LEFT JOIN clientes_vendas cv ON cv.id = n.cliente_id;

-- 4. Supervisor pode atualizar negócios (resolver a fila de propostas)
DROP POLICY IF EXISTS supervisor_update_negocios ON negocios;
CREATE POLICY supervisor_update_negocios ON negocios FOR UPDATE USING (true);

-- ============================================
-- 5. CIDADES (lista compartilhada, criável pelo vendedor)
-- ============================================
CREATE TABLE IF NOT EXISTS cidades (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       text NOT NULL,
  uf         text,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cidades_nome_uf_idx ON cidades (lower(nome), coalesce(upper(uf), ''));

-- Seed a partir das cidades já cadastradas nas propriedades (tabela "Clientes").
INSERT INTO cidades (nome, uf)
SELECT DISTINCT trim(cidade), nullif(upper(trim(estado)), '')
FROM "Clientes"
WHERE cidade IS NOT NULL AND trim(cidade) <> ''
ON CONFLICT DO NOTHING;

ALTER TABLE cidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cidades_read   ON cidades;
DROP POLICY IF EXISTS cidades_insert ON cidades;
CREATE POLICY cidades_read   ON cidades FOR SELECT USING (true);
CREATE POLICY cidades_insert ON cidades FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vendedores WHERE auth_uid = auth.uid()));

-- ============================================
-- 6. OPÇÕES DE MÁQUINA criadas pelo vendedor (marca/modelo que não estão no ERP).
--    Família sempre vem do ERP (produtos.familia_nome); não é criável.
-- ============================================
CREATE TABLE IF NOT EXISTS opcoes_maquina (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  familia_nome text,
  marca        text,
  modelo       text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE opcoes_maquina ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS opcoes_maquina_read   ON opcoes_maquina;
DROP POLICY IF EXISTS opcoes_maquina_insert ON opcoes_maquina;
CREATE POLICY opcoes_maquina_read   ON opcoes_maquina FOR SELECT USING (true);
CREATE POLICY opcoes_maquina_insert ON opcoes_maquina FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM vendedores WHERE auth_uid = auth.uid()));
