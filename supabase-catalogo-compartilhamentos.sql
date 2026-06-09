-- ============================================================
-- Registro de compartilhamentos do catálogo (WhatsApp)
-- ------------------------------------------------------------
-- Cada vez que o vendedor envia um produto pelo WhatsApp (estoque atual OU
-- catálogo curado) gravamos uma linha aqui: qual produto, para qual telefone,
-- por qual canal e o que foi enviado. Serve para o supervisor acompanhar como
-- os vendedores estão usando o catálogo.
--
-- codigo_produto       -> item do "Estoque atual" (Omie)
-- catalogo_produto_id  -> item do catálogo curado
-- (um dos dois vem preenchido)
-- telefone             -> só dígitos; null quando enviou pelo seletor de apps
--                         do celular (share sheet) sem digitar o número
-- canal                -> 'whatsapp_wame' (link wa.me) | 'whatsapp_share' (anexo)
-- itens                -> o que foi marcado pra enviar (titulo, foto, descricao,
--                         valor, folheto)
-- ============================================================

create table if not exists catalogo_compartilhamentos (
  id                  bigint generated always as identity primary key,
  vendedor_id         bigint references vendedores(id) on delete set null,
  vendedor_nome       text,
  codigo_produto      bigint,
  catalogo_produto_id bigint,
  produto_titulo      text,
  telefone            text,
  canal               text default 'whatsapp_wame',
  itens               text[],
  created_at          timestamptz not null default now()
);

create index if not exists idx_catalogo_compart_vendedor on catalogo_compartilhamentos(vendedor_id);
create index if not exists idx_catalogo_compart_created  on catalogo_compartilhamentos(created_at desc);
create index if not exists idx_catalogo_compart_produto  on catalogo_compartilhamentos(codigo_produto);

alter table catalogo_compartilhamentos enable row level security;

drop policy if exists "catalogo_compart_select" on catalogo_compartilhamentos;
create policy "catalogo_compart_select" on catalogo_compartilhamentos
  for select using (true);

drop policy if exists "catalogo_compart_write" on catalogo_compartilhamentos;
create policy "catalogo_compart_write" on catalogo_compartilhamentos
  for all to authenticated using (true) with check (true);
