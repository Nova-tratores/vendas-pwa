-- Gamificação NT Vendas — fase 3 (22/10/2026)
-- 1) Bônus de Safra: cerca de 15% das visitas valem XP em dobro (só conta se a
--    visita estiver COMPLETA, nota >= 80, regra no app). O sorteio é feito AQUI,
--    no banco, quando a visita chega no sync — no celular dava para burlar.
--    Uma vez sorteado, não muda mais (nem o app consegue trocar).
-- 2) Missões relâmpago: o supervisor cria pelo app ("visita com máquina vale 3x
--    nas próximas 24 h"). Todo vendedor logado lê; só supervisor ativo grava.
-- Idempotente.

-- 1) Bônus de Safra -------------------------------------------------------------
alter table public.visitas add column if not exists bonus_safra boolean;

create or replace function public.visitas_bonus_safra()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.bonus_safra := random() < 0.15;
  else
    -- o valor sorteado não muda (o app manda a linha inteira de volta no sync)
    new.bonus_safra := coalesce(old.bonus_safra, random() < 0.15);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_visitas_bonus_safra on public.visitas;
create trigger trg_visitas_bonus_safra
  before insert or update on public.visitas
  for each row execute function public.visitas_bonus_safra();

-- 2) Missões relâmpago -----------------------------------------------------------
create table if not exists public.vendas_missoes (
  id bigserial primary key,
  titulo text not null,
  -- campo da nota de completude que a visita precisa ter (lib/completudeVisita):
  -- resumo | pessoa | cultura | maquina | passos | retorno | negocio | qualquer
  campo text not null default 'qualquer'
    check (campo in ('qualquer', 'resumo', 'pessoa', 'cultura', 'maquina', 'passos', 'retorno', 'negocio')),
  multiplicador numeric not null default 2 check (multiplicador in (2, 3)),
  inicio timestamptz not null default now(),
  fim timestamptz not null default (now() + interval '24 hours'),
  ativo boolean not null default true,
  criado_por text,
  created_at timestamptz not null default now(),
  check (fim > inicio)
);
alter table public.vendas_missoes enable row level security;
revoke all on public.vendas_missoes from anon;
grant select, insert, update on public.vendas_missoes to authenticated;
grant usage, select on sequence public.vendas_missoes_id_seq to authenticated;

drop policy if exists vendas_missoes_ler on public.vendas_missoes;
create policy vendas_missoes_ler on public.vendas_missoes
  for select to authenticated using (true);

drop policy if exists vendas_missoes_supervisor on public.vendas_missoes;
create policy vendas_missoes_supervisor on public.vendas_missoes
  for all to authenticated
  using (exists (select 1 from public.supervisores s where s.auth_uid = auth.uid() and s.ativo is not false))
  with check (exists (select 1 from public.supervisores s where s.auth_uid = auth.uid() and s.ativo is not false));

notify pgrst, 'reload schema';
