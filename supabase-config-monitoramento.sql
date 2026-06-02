-- ============================================
-- Configurações globais do supervisor + monitoramento (2026-06-02)
--
-- Tabela singleton `configuracoes` (1 linha, id=1) com os parâmetros que o
-- supervisor ajusta: dias pro lembrete de negócio parado e dias pra alertar
-- vendedor inativo. Leitura aberta (o app do vendedor precisa do X pro
-- lembrete in-app); escrita só supervisor.
--
-- O rastreio de acesso reusa audit_logs_vendas com acao='login' (sem mudança
-- de schema). Essa tabela já recebe inserts do app (push de logs), então o
-- insert de login funciona com a sessão autenticada do vendedor.
--
-- Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

CREATE TABLE IF NOT EXISTS configuracoes (
  id                     int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dias_lembrete_negocio  int NOT NULL DEFAULT 7,
  dias_inativo_visita    int NOT NULL DEFAULT 3,
  updated_at             timestamptz DEFAULT now(),
  updated_by             bigint REFERENCES supervisores(id)
);

-- Trigger de updated_at (reusa a função já existente)
DROP TRIGGER IF EXISTS configuracoes_set_updated_at ON configuracoes;
CREATE TRIGGER configuracoes_set_updated_at
  BEFORE UPDATE ON configuracoes
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- RLS: leitura aberta (vendedor lê o X), escrita só supervisor
ALTER TABLE configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS configuracoes_read  ON configuracoes;
DROP POLICY IF EXISTS configuracoes_write ON configuracoes;

CREATE POLICY configuracoes_read ON configuracoes FOR SELECT USING (true);
CREATE POLICY configuracoes_write ON configuracoes FOR ALL
  USING (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()));

-- Linha única com os defaults
INSERT INTO configuracoes (id, dias_lembrete_negocio, dias_inativo_visita)
VALUES (1, 7, 3)
ON CONFLICT (id) DO NOTHING;
