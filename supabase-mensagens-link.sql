-- ============================================================================
-- Notificação com link (2026-10-19): o portal (Frota → Checklists, "Pedir
-- checklist") manda recado ao vendedor com um link interno do app, ex.:
--   /chamado-veicular?placa=SEB9J47&tipo=checklist&checklist=mensal
-- O app mostra o botão "Abrir". Idempotente. O portal funciona sem a coluna
-- (manda o recado sem o botão).
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================
alter table public.mensagens_vendedor add column if not exists link text;
