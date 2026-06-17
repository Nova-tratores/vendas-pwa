-- ============================================================================
-- Log de atividades (tela do supervisor) — 2026-06-17
-- audit_logs_vendas já recebe as ações do VENDEDOR (via sync do app).
-- Aqui só identificamos o ator quando é o SUPERVISOR (admin), pra distinguir.
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

alter table audit_logs_vendas add column if not exists ator_tipo text;  -- 'vendedor' | 'supervisor'
alter table audit_logs_vendas add column if not exists ator_nome text;

create index if not exists idx_audit_data_hora on audit_logs_vendas (data_hora);
