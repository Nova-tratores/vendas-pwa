-- ============================================================
-- Atribuição de cidades a vendedores
-- ------------------------------------------------------------
-- Define quais clientes (tabela "Clientes" do ERP, agrupados por cidade)
-- cada vendedor enxerga/baixa no app. Relação many-to-many: uma cidade
-- pode ser atendida por mais de um vendedor (sobreposição permitida).
--
-- O pull do app (src/lib/sync.js) baixa as propriedades do vendedor pela
-- UNIÃO de: (a) cidades atribuídas aqui, (b) clientes que ele criou no
-- check-in (cliente_dono_id), (c) histórico (propriedades com visita/negócio).
-- ============================================================

create table if not exists vendedor_cidades (
  id          bigint generated always as identity primary key,
  vendedor_id bigint not null references vendedores(id) on delete cascade,
  cidade      text   not null,
  created_at  timestamptz not null default now(),
  unique (vendedor_id, cidade)
);

create index if not exists idx_vendedor_cidades_vendedor on vendedor_cidades(vendedor_id);
create index if not exists idx_vendedor_cidades_cidade   on vendedor_cidades(cidade);

-- Acelera o filtro do pull (Clientes WHERE cidade IN (...)).
create index if not exists idx_clientes_cidade on "Clientes"(cidade);

alter table vendedor_cidades enable row level security;

-- Leitura liberada: o vendedor lê as próprias cidades no pull e o supervisor
-- lê todas no painel. (Mesmo padrão permissivo das demais tabelas — o
-- fechamento por app_role no JWT está no backlog A3.)
drop policy if exists "vendedor_cidades_select" on vendedor_cidades;
create policy "vendedor_cidades_select" on vendedor_cidades
  for select using (true);

-- Escrita pelo painel do supervisor (sessão autenticada).
drop policy if exists "vendedor_cidades_write" on vendedor_cidades;
create policy "vendedor_cidades_write" on vendedor_cidades
  for all to authenticated using (true) with check (true);
