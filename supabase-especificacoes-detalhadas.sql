-- ============================================================================
-- Ficha técnica detalhada (specs agrupadas por categoria) — 2026-06-24
--
-- Acrescenta um campo de especificações AGRUPADAS (Motor, Transmissão, etc.),
-- separado do `especificacoes` plano atual (que vira "Destaques" na tela).
-- Alimenta a nova seção "Ficha técnica" do detalhe e a tela de Comparativo.
--
-- Formato: array ordenado de grupos
--   [ { "grupo": "Motor", "itens": [ {"label":"Motor","valor":"..."}, ... ] }, ... ]
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

alter table catalogo_produtos
  add column if not exists especificacoes_detalhadas jsonb not null default '[]'::jsonb;
