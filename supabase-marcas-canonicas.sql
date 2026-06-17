-- ============================================================================
-- Marcas canônicas + mapa de aliases do Omie (2026-06-17)  [PROPOSTA — revisar]
--
-- O campo `marca` do Omie está sujo (~130 variações: duplicatas, nomes jurídicos
-- longos, erros de digitação). Aqui consolidamos nas MARCAS REAIS (canônicas) e
-- guardamos um mapa alias→canônica pra resolver as variações.
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

-- 1) Corrige a marca existente grafada errada (Tatu "Marquesan" → "Marchesan").
update catalogo_marcas
set nome = 'Tatu Marchesan', slug = 'tatu-marchesan'
where slug = 'Tatu-Marquesan';

-- 2) Garante as marcas canônicas (clean). Só insere o que falta.
insert into catalogo_marcas (nome, slug, ordem, visivel) values
  ('Mahindra','mahindra',0,true),
  ('Kuhn','kuhn',10,true),
  ('Kamaq','kamaq',10,true),
  ('Marispan','marispan',10,true),
  ('Tatu Marchesan','tatu-marchesan',10,true),
  ('Ventura','ventura',10,true),
  ('Luma','luma',10,true),
  ('Haramaq','haramaq',10,true),
  ('Cemag','cemag',10,true),
  ('Vicon','vicon',10,true),
  ('Baldan','baldan',10,true),
  ('Ipacol','ipacol',10,true),
  ('Acton','acton',10,true),
  ('Cadioli','cadioli',10,true),
  ('Terris','terris',10,true),
  ('Imep','imep',10,true),
  ('Tadeu','tadeu',10,true),
  ('New Holland','new-holland',10,true),
  ('Lavrale','lavrale',10,true),
  ('Tritucap','tritucap',10,true),
  ('Schemaq','schemaq',10,true),
  ('Orion','orion',10,true),
  ('Indutar','indutar',10,true),
  ('Nogueira','nogueira',10,true),
  ('MFW','mfw',10,true),
  ('Stara','stara',10,true),
  ('JF','jf',10,true),
  ('Rubemaq','rubemaq',10,true),
  ('Civemasa','civemasa',10,true),
  ('HM Agro','hm-agro',10,true),
  ('GTM','gtm',10,true),
  ('Implemaster','implemaster',10,true),
  ('Piccin','piccin',10,true),
  ('Asus','asus-agro',10,true),
  ('Ikeda','ikeda',10,true),
  ('Massey Ferguson','massey-ferguson',10,true),
  ('Herder','herder',10,true),
  ('Matão','matao',10,true),
  ('São José','sao-jose',10,true),
  ('Santa Izabel','santa-izabel',10,true)
on conflict (slug) do nothing;

-- 3) Tabela de aliases: marca do Omie (normalizada upper+trim) → marca canônica.
create table if not exists catalogo_marca_alias (
  alias    text primary key,
  marca_id bigint not null references catalogo_marcas(id) on delete cascade
);
alter table catalogo_marca_alias enable row level security;
drop policy if exists catalogo_marca_alias_read on catalogo_marca_alias;
create policy catalogo_marca_alias_read on catalogo_marca_alias for select using (true);

-- 4) Popula o mapa (resolve a marca pelo slug). As variações sujas → canônica.
insert into catalogo_marca_alias (alias, marca_id)
select a.alias, m.id
from (values
  ('MAHINDRA','mahindra'),
  ('MAHINDRA DO BRASIL','mahindra'),
  ('MAHINDRA DO BRASIL INDUSTRIAL LTDA','mahindra'),
  ('KUHN','kuhn'),
  ('KUHN DO BRASIL S/A - PF','kuhn'),
  ('KHUN','kuhn'),
  ('KAMAQ','kamaq'),
  ('KAMAQ MAQUINAS E IMPLEMENTOS AGRICOLAS LTDA','kamaq'),
  ('MARISPAN','marispan'),
  ('IMPLEMENTOS AGRICOLAS MARISPANNLTDA','marispan'),
  ('TATU MARCHESAN','tatu-marchesan'),
  ('MARCHESAN TATU','tatu-marchesan'),
  ('TATU','tatu-marchesan'),
  ('MARCHESAN','tatu-marchesan'),
  ('MARCHESAN IMPLEMENTOS E MAQUINAS AGRICOLAS TATU S A','tatu-marchesan'),
  ('VENTURA','ventura'),
  ('LUMA','luma'),
  ('LUMA IMPLEMENTOS AGRICOLAS LTDA','luma'),
  ('HARAMAQ','haramaq'),
  ('HARAMAQ INDUSTRIA E COMERCIO DE MAQUINAS AGRICOLA LTDA','haramaq'),
  ('CEMAG','cemag'),
  ('CEMAG - CEARA MAQUINAS AGRICOLAS LTDA','cemag'),
  ('VICON','vicon'),
  ('BALDAN','baldan'),
  ('BALDAN IMPLEMENTOS AGRICOLAS S/A','baldan'),
  ('IPACOL','ipacol'),
  ('ACTON','acton'),
  ('CADIOLI','cadioli'),
  ('TERRIS','terris'),
  ('IMEP','imep'),
  ('TADEU','tadeu'),
  ('FABRICA DE IMPLEMENTOS AGRICOLA TADEU LTDA','tadeu'),
  ('NEW HOLLAND','new-holland'),
  ('LAVRALE','lavrale'),
  ('AGRITECH LAVRALE INDUSTRIA DE MAQUINARIO AGRICOLA E COMPONEN','lavrale'),
  ('TRITUCAP','tritucap'),
  ('SCHEMAQ','schemaq'),
  ('ORION','orion'),
  ('ORION TECNOLOGIA E SISTEMAS AGRICOLAS LTDA','orion'),
  ('INDUTAR','indutar'),
  ('NOGUEIRA','nogueira'),
  ('MFW','mfw'),
  ('STARA','stara'),
  ('STARA S.A. IND DE IMPLEMENTOS AGRÍCOLAS','stara'),
  ('JF','jf'),
  ('RUBEMAQ','rubemaq'),
  ('CIVEMASA','civemasa'),
  ('HM AGRO','hm-agro'),
  ('HM','hm-agro'),
  ('GTM','gtm'),
  ('IMPLEMASTER','implemaster'),
  ('IMPLEMASTER - INDUSTRIA DE EQUIPAMENTOS AGRICOLAS LTDA.','implemaster'),
  ('PICCIN','piccin'),
  ('PICCIN MAQUINAS AGRICOLAS LTDA','piccin'),
  ('ASUS','asus-agro'),
  ('ASUS - INDUSTRIA DE MAQUINAS AGRICOLAS LTDA','asus-agro'),
  ('IKEDA','ikeda'),
  ('MASSEY FERGUSON','massey-ferguson'),
  ('MF','massey-ferguson'),
  ('HERDER','herder'),
  ('MATÃO','matao'),
  ('SÃO JOSÉ','sao-jose'),
  ('SANTA IZABEL','santa-izabel')
) as a(alias, slug)
join catalogo_marcas m on m.slug = a.slug
on conflict (alias) do update set marca_id = excluded.marca_id;

-- OBS: a "cauda longa" do Omie (marcas com 1-2 produtos, ex.: Jacto, Semeato, Stara,
-- Suzuki, Can Am, etc.) ficou de fora desta 1ª leva — dá pra adicionar conforme você
-- for criar fichas. As que parecem "lixo" (nome jurídico solto, sem marca clara) não
-- entram no catálogo.

-- 5) View de MODELOS por marca canônica (pro dropdown de cadastro de máquina).
create or replace view public.vw_modelos_por_marca
with (security_invoker = on) as
select distinct a.marca_id, upper(btrim(p.modelo)) as modelo
from produtos p
join catalogo_marca_alias a on a.alias = upper(btrim(p.marca))
where p.inativo = false and p.arquivado = false
  and coalesce(btrim(p.modelo),'') <> ''
  and p.familia_nome is not null
  and upper(btrim(p.familia_nome)) not in ('PEÇAS','PECAS')
  and left(btrim(p.familia_nome),1) <> '#'
  and upper(p.familia_nome) not like '%N/D%';

grant select on public.vw_modelos_por_marca to anon, authenticated;
