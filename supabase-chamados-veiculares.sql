-- ============================================================
-- Chamados veiculares (frota)
-- ------------------------------------------------------------
-- Vendedor abre uma solicitação de manutenção (corretiva/preventiva) ou
-- registra um checklist do veículo. "Só registrar por enquanto": a tela de
-- gestão (quem resolve) entra numa etapa futura — a coluna `status` já prevê.
-- Placas vêm da tabela existente "SupaPlacas" (IdPlaca, NumPlaca).
-- Checklists são fixos no código: src/lib/checklists.js.
-- ============================================================

create table if not exists chamados_veiculares (
  id             bigint generated always as identity primary key,
  vendedor_id    bigint references vendedores(id) on delete set null,
  vendedor_nome  text,
  placa_id       bigint,           -- SupaPlacas.IdPlaca
  placa          text,             -- NumPlaca (denormalizado p/ exibição)
  tipo           text not null,    -- 'corretiva' | 'preventiva' | 'checklist'
  descricao      text,             -- corretiva/preventiva
  checklist_chave text,            -- qual modelo (tipo=checklist)
  checklist_nome  text,
  respostas      jsonb,            -- [{ item, status:'ok'|'nok'|'na', obs }]
  tem_pendencia  boolean not null default false,  -- algum item 'nok'
  status         text not null default 'aberto',  -- aberto | resolvido (futuro)
  created_at     timestamptz not null default now()
);

create index if not exists idx_chamados_veiculares_vendedor on chamados_veiculares(vendedor_id);
create index if not exists idx_chamados_veiculares_status   on chamados_veiculares(status);
create index if not exists idx_chamados_veiculares_created  on chamados_veiculares(created_at desc);

alter table chamados_veiculares enable row level security;

-- Leitura liberada (vendedor vê os próprios; supervisor verá todos na tela futura).
drop policy if exists "chamados_veiculares_select" on chamados_veiculares;
create policy "chamados_veiculares_select" on chamados_veiculares
  for select using (true);

-- Escrita por sessão autenticada (vendedor abre o chamado).
drop policy if exists "chamados_veiculares_write" on chamados_veiculares;
create policy "chamados_veiculares_write" on chamados_veiculares
  for all to authenticated using (true) with check (true);
