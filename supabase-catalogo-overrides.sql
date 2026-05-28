-- ============================================
-- Tabela catalogo_overrides (2026-05-28)
-- Permite ao supervisor ajustar preco/estoque/visibilidade de produtos
-- do estoque atual (que vem do Omie via produtos table) sem mexer no Omie.
--
-- App le: preco_efetivo = COALESCE(override.preco_override, produtos.valor_unitario)
--          estoque_efetivo = COALESCE(override.estoque_override, produtos.estoque)
-- ============================================

CREATE TABLE IF NOT EXISTS catalogo_overrides (
  codigo_produto    bigint PRIMARY KEY,
  preco_override    numeric(12,2),
  estoque_override  integer,
  visivel           boolean DEFAULT true,
  notas             text,
  updated_at        timestamptz DEFAULT now(),
  updated_by        bigint REFERENCES supervisores(id)
);

-- Trigger pra atualizar updated_at
DROP TRIGGER IF EXISTS catalogo_overrides_set_updated_at ON catalogo_overrides;
CREATE TRIGGER catalogo_overrides_set_updated_at
  BEFORE UPDATE ON catalogo_overrides
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS: leitura aberta (todo vendedor le), escrita restrita ao supervisor
ALTER TABLE catalogo_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_overrides_read   ON catalogo_overrides;
DROP POLICY IF EXISTS catalogo_overrides_write  ON catalogo_overrides;

CREATE POLICY catalogo_overrides_read
  ON catalogo_overrides FOR SELECT
  USING (true);

-- Escrita: qualquer auth.uid() que esteja na tabela supervisores pode upsert.
-- (Os vendedores em vendedores nao passam neste filtro.)
CREATE POLICY catalogo_overrides_write
  ON catalogo_overrides FOR ALL
  USING (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()));
