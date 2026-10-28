-- =============================================================================
-- Quests do vendedor (26/10/2026)
-- Tarefa com ALVO (trator, cliente ou livre) e lista de ITENS para trazer da
-- visita — horímetro, fotos, relato do operador, relato do dono, pergunta
-- sim/não ou texto. Duas origens:
--   manual     — o supervisor cria (Supervisor → Quests → Nova quest);
--   automatica — o portal SUGERE por regra (trator sem notícia, revisão
--                chegando, aniversário de entrega, cliente sumido; agendamento
--                vendas-quests-sugerir) e a quest nasce `sugerida`: só chega ao
--                vendedor depois que o supervisor aprova e escolhe quem vai.
-- O vendedor responde pelo app (funciona sem internet: a resposta fica na fila
-- do aparelho) e ganha o XP da quest ao enviar. O supervisor pode devolver.
--
-- Fotos no bucket PRIVADO `vendas-quests` (<quest_id>/<uuid>.jpg).
-- Leitura e escrita pelo navegador com RLS: supervisor ativo vê e grava tudo;
-- vendedor vê as quests dele (aberta/concluída) e grava só a própria resposta.
-- Idempotente. Rodar no SQL Editor do Supabase.
-- =============================================================================

-- quem é o vendedor deste login (id de vendedores), para as policies
create or replace function public.vendas_meu_vendedor_id()
returns bigint language sql stable security definer set search_path = public as $$
  select id from public.vendedores where auth_uid = auth.uid() and ativo is not false limit 1
$$;
create or replace function public.vendas_sou_supervisor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.supervisores s where s.auth_uid = auth.uid() and s.ativo is not false)
$$;
revoke all on function public.vendas_meu_vendedor_id() from anon;
revoke all on function public.vendas_sou_supervisor() from anon;

create table if not exists public.vendas_quests (
  id                   bigserial primary key,
  titulo               text not null,
  descricao            text,
  origem               text not null default 'manual' check (origem in ('manual', 'automatica')),
  regra                text check (regra in ('trator_sem_noticia', 'revisao_chegando', 'aniversario_entrega', 'cliente_sumido')),
  chave                text unique,            -- idempotência das automáticas: regra:alvo:período
  alvo_tipo            text not null default 'trator' check (alvo_tipo in ('trator', 'cliente', 'livre')),
  chassis              text,
  modelo               text,
  cliente_nome         text,
  cidade               text,
  propriedade_id       bigint,
  motivo               text,                   -- por que foi sugerida (texto pronto para o supervisor)
  itens                jsonb not null default '[]'::jsonb,  -- [{chave, tipo, rotulo, obrigatorio, min}]
  xp                   integer not null default 50 check (xp between 0 and 500),
  vendedor_id          bigint references public.vendedores(id),
  vendedor_sugerido_id bigint references public.vendedores(id),
  prazo                date,
  status               text not null default 'aberta'
                       check (status in ('sugerida', 'aberta', 'concluida', 'descartada', 'cancelada')),
  nota_supervisor      text,                   -- motivo do descarte ou da devolução
  criado_por           text,
  aprovado_por         text,
  aprovado_em          timestamptz,
  concluida_em         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (status = 'sugerida' or status in ('descartada', 'cancelada') or vendedor_id is not null)
);
create index if not exists idx_vendas_quests_vendedor on public.vendas_quests (vendedor_id, status);
create index if not exists idx_vendas_quests_status on public.vendas_quests (status, created_at desc);
create index if not exists idx_vendas_quests_chassis on public.vendas_quests (chassis);

create table if not exists public.vendas_quest_respostas (
  id              bigserial primary key,
  quest_id        bigint not null unique references public.vendas_quests(id) on delete cascade,
  vendedor_id     bigint not null references public.vendedores(id),
  respostas       jsonb not null default '{}'::jsonb,  -- {chave_do_item: valor}; fotos = [caminhos no bucket]
  lat             double precision,
  lng             double precision,
  gps_precisao_m  numeric,
  client_uuid     uuid unique,
  enviado_em      timestamptz not null default now()
);

-- responder conclui a quest (e reenviar depois de uma devolução conclui de novo)
create or replace function public.vendas_quest_resposta_conclui()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.vendas_quests
     set status = 'concluida', concluida_em = now(), updated_at = now()
   where id = new.quest_id and status = 'aberta';
  return new;
end;
$$;
drop trigger if exists trg_vendas_quest_resposta on public.vendas_quest_respostas;
create trigger trg_vendas_quest_resposta
  after insert or update on public.vendas_quest_respostas
  for each row execute function public.vendas_quest_resposta_conclui();

alter table public.vendas_quests enable row level security;
alter table public.vendas_quest_respostas enable row level security;
revoke all on public.vendas_quests from anon;
revoke all on public.vendas_quest_respostas from anon;
grant select, insert, update, delete on public.vendas_quests to authenticated;
grant select, insert, update on public.vendas_quest_respostas to authenticated;
grant usage, select on sequence public.vendas_quests_id_seq to authenticated;
grant usage, select on sequence public.vendas_quest_respostas_id_seq to authenticated;

drop policy if exists vendas_quests_supervisor on public.vendas_quests;
create policy vendas_quests_supervisor on public.vendas_quests
  for all to authenticated using (public.vendas_sou_supervisor()) with check (public.vendas_sou_supervisor());
drop policy if exists vendas_quests_vendedor_le on public.vendas_quests;
create policy vendas_quests_vendedor_le on public.vendas_quests
  for select to authenticated
  using (vendedor_id = public.vendas_meu_vendedor_id() and status in ('aberta', 'concluida'));

drop policy if exists vendas_quest_resp_supervisor on public.vendas_quest_respostas;
create policy vendas_quest_resp_supervisor on public.vendas_quest_respostas
  for select to authenticated using (public.vendas_sou_supervisor());
drop policy if exists vendas_quest_resp_vendedor_le on public.vendas_quest_respostas;
create policy vendas_quest_resp_vendedor_le on public.vendas_quest_respostas
  for select to authenticated using (vendedor_id = public.vendas_meu_vendedor_id());
-- só responde a quest ABERTA que é dele
drop policy if exists vendas_quest_resp_vendedor_grava on public.vendas_quest_respostas;
create policy vendas_quest_resp_vendedor_grava on public.vendas_quest_respostas
  for insert to authenticated
  with check (vendedor_id = public.vendas_meu_vendedor_id()
    and exists (select 1 from public.vendas_quests q where q.id = quest_id and q.vendedor_id = public.vendas_meu_vendedor_id() and q.status = 'aberta'));
drop policy if exists vendas_quest_resp_vendedor_atualiza on public.vendas_quest_respostas;
create policy vendas_quest_resp_vendedor_atualiza on public.vendas_quest_respostas
  for update to authenticated
  using (vendedor_id = public.vendas_meu_vendedor_id())
  with check (vendedor_id = public.vendas_meu_vendedor_id()
    and exists (select 1 from public.vendas_quests q where q.id = quest_id and q.vendedor_id = public.vendas_meu_vendedor_id() and q.status = 'aberta'));

-- fotos (bucket privado): vendedor e supervisor logados sobem e leem
insert into storage.buckets (id, name, public) values ('vendas-quests', 'vendas-quests', false)
on conflict (id) do nothing;
drop policy if exists vendas_quests_fotos_sobe on storage.objects;
create policy vendas_quests_fotos_sobe on storage.objects
  for insert to authenticated with check (bucket_id = 'vendas-quests');
drop policy if exists vendas_quests_fotos_le on storage.objects;
create policy vendas_quests_fotos_le on storage.objects
  for select to authenticated using (bucket_id = 'vendas-quests');

-- agendamento diário das sugestões (agendador do portal), se existir neste banco
do $$
begin
  if to_regclass('public.agendamentos') is not null then
    insert into public.agendamentos (chave, handler, nome, modulo, descricao, tipo, hora, parametros, prioridade, usa_omie, duracao_max_min, ativo)
    values ('vendas-quests-sugerir', 'vendas-quests-sugerir', 'Quests sugeridas aos vendedores', 'CRM Vendas',
      'Sugere quests (trator sem notícia, revisão chegando, aniversário de entrega, cliente sumido) para o supervisor aprovar. Até 10 novas por dia.',
      'diario', '06:30', '{"limite": 10}'::jsonb, 'rapido', false, 10, true)
    on conflict (chave) do nothing;
  end if;
end $$;

notify pgrst, 'reload schema';
