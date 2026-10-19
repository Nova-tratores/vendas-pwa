-- ============================================================================
-- Cadastro de máquina (2026-10-19):
--   1) coluna maquinas.frequencia_uso (dropdown no app)
--   2) view vw_marcas_por_tipo: quais marcas fazem sentido pra cada tipo de máquina
--      (tipo do app = familia_nome do Omie) + concorrentes de modelos_comuns.
--
-- Idempotente. RODAR ANTES do deploy do app (o push de máquina manda frequencia_uso;
-- sem a coluna o sync falha e prende as máquinas pendentes no celular).
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

-- 1) Frequência de uso
alter table public.maquinas add column if not exists frequencia_uso text;

-- 2) Marcas por tipo
create or replace view public.vw_marcas_por_tipo
with (security_invoker = on) as
select distinct btrim(p.familia_nome) as tipo, a.marca_id
from produtos p
join catalogo_marca_alias a on a.alias = upper(btrim(p.marca))
where coalesce(btrim(p.familia_nome), '') <> ''
  and upper(btrim(p.familia_nome)) not in ('PEÇAS', 'PECAS')
union
select t.tipo, mc.marca_id
from modelos_comuns mc
join (values
  ('trator', 'Trator Novo'),
  ('trator', 'Trator Seminovo'),
  ('pulverizador_autopropelido', 'Autopropelido'),
  ('pulverizador_autopropelido', 'Pulverizador'),
  ('implemento', 'Implemento Novo'),
  ('implemento', 'Implemento Seminovo')
) as t(tipo_comum, tipo) on t.tipo_comum = mc.tipo;

grant select on public.vw_marcas_por_tipo to anon, authenticated;

-- Conferir: marcas por tipo
select v.tipo, string_agg(m.nome, ', ' order by m.nome) as marcas
from vw_marcas_por_tipo v join catalogo_marcas m on m.id = v.marca_id
group by v.tipo order by v.tipo;
