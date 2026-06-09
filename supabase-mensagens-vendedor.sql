-- ============================================================
-- Mensagens do supervisor para vendedores (Notificações)
-- ------------------------------------------------------------
-- O supervisor envia recados; o vendedor lê na tela Notificações (junto com
-- os alertas automáticos gerados no app). vendedor_id NULL = mensagem para
-- TODOS os vendedores; preenchido = mensagem direcionada.
-- ============================================================

create table if not exists mensagens_vendedor (
  id          bigint generated always as identity primary key,
  vendedor_id bigint references vendedores(id) on delete cascade,  -- null = todos
  titulo      text,
  corpo       text not null,
  created_by  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_mensagens_vendedor_vendedor on mensagens_vendedor(vendedor_id);
create index if not exists idx_mensagens_vendedor_created  on mensagens_vendedor(created_at desc);

alter table mensagens_vendedor enable row level security;

drop policy if exists "mensagens_vendedor_select" on mensagens_vendedor;
create policy "mensagens_vendedor_select" on mensagens_vendedor
  for select using (true);

drop policy if exists "mensagens_vendedor_write" on mensagens_vendedor;
create policy "mensagens_vendedor_write" on mensagens_vendedor
  for all to authenticated using (true) with check (true);
