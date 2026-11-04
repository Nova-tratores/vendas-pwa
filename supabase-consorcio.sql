-- =============================================================================
-- Consórcio Mahindra no NT Vendas (/consorcio) — 04/11/2026
-- Projeto Supabase do PORTAL: citrhumdkfivdzbmayde
--
-- Guarda a planilha de cotas da administradora (CSV inteiro, como veio). O app
-- lê a mais recente e faz as contas no aparelho (lib/consorcio.js). Cada
-- "Atualizar planilha" no app grava uma linha nova; as antigas ficam de histórico.
-- Só lê/grava quem está logado E é vendedor ativo ou supervisor: o repositório
-- do app é público, por isso os nomes dos clientes ficam só aqui.
-- =============================================================================

-- 1) Tabela
create table if not exists public.consorcio_planilhas (
  id bigint generated always as identity primary key,
  nome text not null default 'planilha.csv',
  texto text not null,
  criado_em timestamptz not null default now(),
  criado_por uuid default auth.uid() references auth.users(id)
);
create index if not exists consorcio_planilhas_criado_em on public.consorcio_planilhas (criado_em desc);

-- 2) Segurança: anon não vê nada; vendedor ativo e supervisor leem e enviam planilha nova
alter table public.consorcio_planilhas enable row level security;
revoke all on public.consorcio_planilhas from anon;
grant select, insert on public.consorcio_planilhas to authenticated;

drop policy if exists consorcio_planilhas_ler on public.consorcio_planilhas;
create policy consorcio_planilhas_ler on public.consorcio_planilhas
  for select to authenticated
  using (
    exists (select 1 from public.vendedores v where v.auth_uid = auth.uid() and v.ativo is not false)
    or exists (select 1 from public.supervisores s where s.auth_uid = auth.uid() and s.ativo is not false)
  );

drop policy if exists consorcio_planilhas_enviar on public.consorcio_planilhas;
create policy consorcio_planilhas_enviar on public.consorcio_planilhas
  for insert to authenticated
  with check (
    exists (select 1 from public.vendedores v where v.auth_uid = auth.uid() and v.ativo is not false)
    or exists (select 1 from public.supervisores s where s.auth_uid = auth.uid() and s.ativo is not false)
  );
