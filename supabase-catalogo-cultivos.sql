-- Eixo "Por cultivo/manejo" do Showroom.
-- JÁ APLICADO no banco (2026-06-19) via MCP. Mantido aqui pra histórico.
-- Taxonomia editável (catalogo_cultivos) + marcação multivalorada na máquina
-- (catalogo_produtos.cultivos = array de ids). Uma máquina pode servir vários cultivos.

create table if not exists catalogo_cultivos (
  id    text primary key,
  nome  text not null,
  icone text,            -- emoji exibido nos cards do Showroom
  ordem int  default 0,
  ativo boolean default true
);

alter table catalogo_produtos
  add column if not exists cultivos text[] default '{}';

-- Filtro do Showroom é client-side, mas o índice ajuda consultas futuras.
create index if not exists idx_catalogo_produtos_cultivos
  on catalogo_produtos using gin (cultivos);

-- Lista inicial (renomeie/adicione/remova à vontade nesta tabela).
insert into catalogo_cultivos (id, nome, icone, ordem) values
  ('graos',        'Grãos (soja, milho, trigo)',  '🌾', 1),
  ('cafe',         'Café',                         '☕', 2),
  ('cana',         'Cana-de-açúcar',               '🎋', 3),
  ('algodao',      'Algodão',                      '☁️', 4),
  ('pastagem',     'Pastagem / Pecuária',          '🐄', 5),
  ('hortifruti',   'Hortifruti / Olericultura',    '🥬', 6),
  ('fruticultura', 'Fruticultura',                 '🍊', 7),
  ('silagem',      'Silagem / Forragem',           '🌽', 8)
on conflict (id) do nothing;

-- Leitura pública (mesma política das outras tabelas do catálogo).
alter table catalogo_cultivos enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='catalogo_cultivos' and policyname='cultivos_select_all') then
    create policy cultivos_select_all on catalogo_cultivos for select using (true);
  end if;
end $$;
