-- ============================================
-- Níveis de supervisor: 'admin' (acesso total) e 'gestor' (só gestão de vendedores)
-- Rodar no SQL Editor do Supabase.
-- ============================================

-- Coluna de papel. Supervisores existentes viram 'admin' (sem regressão).
ALTER TABLE supervisores
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'admin';

ALTER TABLE supervisores DROP CONSTRAINT IF EXISTS supervisores_tipo_check;
ALTER TABLE supervisores ADD CONSTRAINT supervisores_tipo_check
  CHECK (tipo IN ('admin', 'gestor'));

-- Como criar/rebaixar um gestor:
--   UPDATE supervisores SET tipo = 'gestor' WHERE email = 'fulano@empresa.com';
-- Como promover de volta para admin:
--   UPDATE supervisores SET tipo = 'admin'  WHERE email = 'fulano@empresa.com';

-- O 'gestor' enxerga: Equipe, Vendas, Análise e VER catálogo.
-- Não acessa: Gerir catálogo, Produtos, Configurações nem o painel de Consumo/Infra.
-- (O bloqueio é por navegação no app; o RLS atual já é permissivo p/ qualquer supervisor logado.)
