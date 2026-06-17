-- ============================================================================
-- Modelos comuns de mercado (tratores, autopropelidos, colheitadeiras, implementos)
-- pra enriquecer o dropdown de cadastro de máquina (cliente pode ter marca concorrente).
-- Fonte: pesquisa de IA, revisada. Mercado brasileiro. (2026-06-17)
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

-- 1) Marcas novas (concorrentes / fabricantes que aparecem nas propriedades).
insert into catalogo_marcas (nome, slug, ordem, visivel) values
  ('John Deere','john-deere',20,true),
  ('Valtra','valtra',20,true),
  ('Case IH','case-ih',20,true),
  ('Agrale','agrale',20,true),
  ('Fendt','fendt',20,true),
  ('LS Tractor','ls-tractor',20,true),
  ('Solis','solis',20,true),
  ('Yanmar','yanmar',20,true),
  ('Ford','ford',20,true),
  ('Fiatagri','fiatagri',20,true),
  ('CBT','cbt',20,true),
  ('Montana','montana',20,true),
  ('Metalfor','metalfor',20,true),
  ('Jacto','jacto',20,true),
  ('Semeato','semeato',20,true),
  ('Jan','jan',20,true),
  ('Vence Tudo','vence-tudo',20,true)
on conflict (slug) do nothing;

-- 2) Tabela de modelos comuns (curados, não vêm do Omie).
create table if not exists modelos_comuns (
  id       bigint generated always as identity primary key,
  marca_id bigint not null references catalogo_marcas(id) on delete cascade,
  modelo   text not null,
  tipo     text,
  unique (marca_id, modelo)
);
alter table modelos_comuns enable row level security;
drop policy if exists modelos_comuns_read on modelos_comuns;
create policy modelos_comuns_read on modelos_comuns for select using (true);

-- 3) Insere os modelos (resolve marca pelo slug).
insert into modelos_comuns (marca_id, modelo, tipo)
select m.id, v.modelo, v.tipo
from (values
  ('mahindra','2025','trator'),('mahindra','OJA 3140','trator'),('mahindra','5050','trator'),('mahindra','6060','trator'),('mahindra','6065','trator'),('mahindra','6075','trator'),('mahindra','6075E','trator'),('mahindra','7095','trator'),('mahindra','7585','trator'),('mahindra','8090','trator'),('mahindra','8110','trator'),('mahindra','9500S','trator'),
  ('mahindra','Pulverizador 200L','implemento'),('mahindra','Pulverizador 600L','implemento'),('mahindra','Pulverizador 1500L','implemento'),('mahindra','Pulverizador 2000L','implemento'),('mahindra','Carregador Frontal L15','implemento'),('mahindra','Carregador Frontal T41','implemento'),('mahindra','Carregador Frontal M65','implemento'),
  ('john-deere','5050E','trator'),('john-deere','5055E','trator'),('john-deere','5065E','trator'),('john-deere','5075E','trator'),('john-deere','5078E','trator'),('john-deere','5085E','trator'),('john-deere','5090E','trator'),('john-deere','5100E','trator'),('john-deere','6100J','trator'),('john-deere','6110J','trator'),('john-deere','6125J','trator'),('john-deere','6130J','trator'),('john-deere','6135J','trator'),('john-deere','6145J','trator'),('john-deere','6155J','trator'),('john-deere','6175J','trator'),('john-deere','6190J','trator'),('john-deere','6210J','trator'),('john-deere','6110M','trator'),('john-deere','6135M','trator'),('john-deere','6155M','trator'),('john-deere','6175M','trator'),('john-deere','6195M','trator'),('john-deere','7200J','trator'),('john-deere','7205J','trator'),('john-deere','7215J','trator'),('john-deere','7230J','trator'),
  ('john-deere','4030','pulverizador_autopropelido'),('john-deere','4040','pulverizador_autopropelido'),('john-deere','M4025','pulverizador_autopropelido'),('john-deere','M4030','pulverizador_autopropelido'),('john-deere','M4040','pulverizador_autopropelido'),('john-deere','4630','pulverizador_autopropelido'),('john-deere','4730','pulverizador_autopropelido'),('john-deere','4830','pulverizador_autopropelido'),('john-deere','R4045','pulverizador_autopropelido'),
  ('john-deere','S540','colheitadeira'),('john-deere','S550','colheitadeira'),('john-deere','S660','colheitadeira'),('john-deere','S670','colheitadeira'),('john-deere','S680','colheitadeira'),('john-deere','S760','colheitadeira'),('john-deere','S770','colheitadeira'),('john-deere','S780','colheitadeira'),('john-deere','S790','colheitadeira'),('john-deere','CH570','colheitadeira'),
  ('massey-ferguson','275','trator'),('massey-ferguson','283','trator'),('massey-ferguson','290','trator'),('massey-ferguson','292','trator'),('massey-ferguson','296','trator'),('massey-ferguson','297','trator'),('massey-ferguson','299','trator'),('massey-ferguson','4275','trator'),('massey-ferguson','4283','trator'),('massey-ferguson','4290','trator'),('massey-ferguson','4291','trator'),('massey-ferguson','4292','trator'),('massey-ferguson','4297','trator'),('massey-ferguson','4707','trator'),('massey-ferguson','4708','trator'),('massey-ferguson','4709','trator'),('massey-ferguson','5650','trator'),('massey-ferguson','5660','trator'),('massey-ferguson','5670','trator'),('massey-ferguson','5680','trator'),('massey-ferguson','6350','trator'),('massey-ferguson','6360','trator'),('massey-ferguson','7140','trator'),('massey-ferguson','7170','trator'),('massey-ferguson','7180','trator'),('massey-ferguson','7350','trator'),('massey-ferguson','7370','trator'),('massey-ferguson','7390','trator'),('massey-ferguson','7415','trator'),('massey-ferguson','8690','trator'),
  ('massey-ferguson','MF 9030','pulverizador_autopropelido'),('massey-ferguson','MF 9130','pulverizador_autopropelido'),
  ('massey-ferguson','MF 5650','colheitadeira'),('massey-ferguson','MF 5690','colheitadeira'),('massey-ferguson','MF 6690','colheitadeira'),('massey-ferguson','MF 9690','colheitadeira'),('massey-ferguson','MF 9790','colheitadeira'),('massey-ferguson','MF 9795','colheitadeira'),('massey-ferguson','Ideal 7','colheitadeira'),('massey-ferguson','Ideal 8','colheitadeira'),('massey-ferguson','Ideal 9','colheitadeira'),
  ('new-holland','TL60','trator'),('new-holland','TL75','trator'),('new-holland','TL75E','trator'),('new-holland','TL85E','trator'),('new-holland','TL95E','trator'),('new-holland','TL5.80','trator'),('new-holland','TL5.90','trator'),('new-holland','TL5.100','trator'),('new-holland','TT3840','trator'),('new-holland','TT4030','trator'),('new-holland','TD5.90','trator'),('new-holland','TD5.110','trator'),('new-holland','TS6.110','trator'),('new-holland','TS6.120','trator'),('new-holland','TS6.130','trator'),('new-holland','TS6.140','trator'),('new-holland','TM7010','trator'),('new-holland','TM7020','trator'),('new-holland','TM7030','trator'),('new-holland','TM7040','trator'),('new-holland','T6.110','trator'),('new-holland','T6.130','trator'),('new-holland','T7.175','trator'),('new-holland','T7.205','trator'),('new-holland','T7.245','trator'),
  ('new-holland','SP2500','pulverizador_autopropelido'),('new-holland','SP3500','pulverizador_autopropelido'),('new-holland','Defensor','pulverizador_autopropelido'),
  ('new-holland','TC5.30','colheitadeira'),('new-holland','TC5070','colheitadeira'),('new-holland','TC5090','colheitadeira'),('new-holland','TX5.90','colheitadeira'),('new-holland','CR5.85','colheitadeira'),('new-holland','CR6.80','colheitadeira'),('new-holland','CR7.90','colheitadeira'),('new-holland','CR8.90','colheitadeira'),('new-holland','CR Evo 7.80','colheitadeira'),
  ('valtra','685','trator'),('valtra','785','trator'),('valtra','885','trator'),('valtra','985','trator'),('valtra','A550','trator'),('valtra','A650','trator'),('valtra','A750','trator'),('valtra','A850','trator'),('valtra','A950','trator'),('valtra','A990','trator'),('valtra','A114','trator'),('valtra','A124','trator'),('valtra','A134','trator'),('valtra','BM85','trator'),('valtra','BM100','trator'),('valtra','BM110','trator'),('valtra','BM125','trator'),('valtra','BH140','trator'),('valtra','BH160','trator'),('valtra','BH180','trator'),('valtra','BH205','trator'),('valtra','BH225','trator'),('valtra','BT150','trator'),('valtra','BT170','trator'),('valtra','BT190','trator'),('valtra','BT210','trator'),('valtra','T140','trator'),('valtra','T160','trator'),('valtra','T180','trator'),('valtra','T190','trator'),('valtra','T210','trator'),('valtra','T230','trator'),
  ('valtra','BS3020','pulverizador_autopropelido'),
  ('valtra','BC 4500','colheitadeira'),('valtra','BC 5500','colheitadeira'),('valtra','BC 6500','colheitadeira'),('valtra','BC 6700','colheitadeira'),('valtra','BC 7800','colheitadeira'),
  ('case-ih','Farmall 80','trator'),('case-ih','Farmall 95','trator'),('case-ih','Farmall 110','trator'),('case-ih','Farmall 120','trator'),('case-ih','Maxxum 110','trator'),('case-ih','Maxxum 125','trator'),('case-ih','Maxxum 140','trator'),('case-ih','Maxxum 150','trator'),('case-ih','Puma 155','trator'),('case-ih','Puma 165','trator'),('case-ih','Puma 185','trator'),('case-ih','Puma 200','trator'),('case-ih','Puma 215','trator'),('case-ih','Puma 230','trator'),('case-ih','Magnum 235','trator'),('case-ih','Magnum 250','trator'),('case-ih','Magnum 290','trator'),('case-ih','Magnum 315','trator'),('case-ih','Magnum 340','trator'),
  ('case-ih','Patriot 250','pulverizador_autopropelido'),('case-ih','Patriot 350','pulverizador_autopropelido'),('case-ih','Patriot 3340','pulverizador_autopropelido'),('case-ih','Patriot 4440','pulverizador_autopropelido'),
  ('case-ih','Axial-Flow 4150','colheitadeira'),('case-ih','Axial-Flow 5150','colheitadeira'),('case-ih','Axial-Flow 6150','colheitadeira'),('case-ih','Axial-Flow 7150','colheitadeira'),('case-ih','Axial-Flow 8250','colheitadeira'),('case-ih','Axial-Flow 9250','colheitadeira'),('case-ih','Austoft 8000','colheitadeira'),('case-ih','Austoft 8800','colheitadeira'),('case-ih','A8810','colheitadeira'),
  ('agrale','4100','trator'),('agrale','4118','trator'),('agrale','4230','trator'),('agrale','5075','trator'),('agrale','5085','trator'),('agrale','5105','trator'),('agrale','6110','trator'),('agrale','6150','trator'),('agrale','BX 4.150','trator'),('agrale','BX 6.150','trator'),
  ('fendt','936 Vario','trator'),('fendt','942 Vario','trator'),('fendt','1046 Vario','trator'),('fendt','1050 Vario','trator'),
  ('ls-tractor','Plus 80','trator'),('ls-tractor','Plus 90','trator'),('ls-tractor','Plus 110','trator'),
  ('solis','Solis 26','trator'),('solis','Solis 4520','trator'),('solis','Solis 6024','trator'),
  ('yanmar','1050','trator'),('yanmar','1155','trator'),('yanmar','1175','trator'),
  ('ford','4600','trator'),('ford','4610','trator'),('ford','5600','trator'),('ford','5610','trator'),('ford','6600','trator'),('ford','6610','trator'),('ford','7600','trator'),
  ('fiatagri','540','trator'),('fiatagri','640','trator'),('fiatagri','750','trator'),('fiatagri','780','trator'),('fiatagri','80-66','trator'),('fiatagri','100-90','trator'),
  ('cbt','8060','trator'),('cbt','1105','trator'),('cbt','2105','trator'),
  ('jacto','Uniport 2000','pulverizador_autopropelido'),('jacto','Uniport 2030','pulverizador_autopropelido'),('jacto','Uniport 2500 Star','pulverizador_autopropelido'),('jacto','Uniport 2530','pulverizador_autopropelido'),('jacto','Uniport 3030','pulverizador_autopropelido'),('jacto','Uniport 4530','pulverizador_autopropelido'),('jacto','Uniport 5030','pulverizador_autopropelido'),('jacto','Arbus 2000','pulverizador_autopropelido'),('jacto','Arbus 4000','pulverizador_autopropelido'),
  ('jacto','KTR350','colheitadeira'),('jacto','K3 Millennium','colheitadeira'),
  ('jacto','Pulverizador Advance','implemento'),('jacto','Pulverizador Columbia','implemento'),('jacto','Pulverizador Condor','implemento'),('jacto','Atomizador Arbus','implemento'),
  ('stara','Imperador 2000','pulverizador_autopropelido'),('stara','Imperador 3.0','pulverizador_autopropelido'),('stara','Imperador 3000','pulverizador_autopropelido'),('stara','Imperador 3100','pulverizador_autopropelido'),
  ('stara','Plantadeira Estrela','implemento'),('stara','Plantadeira Ceres','implemento'),('stara','Plantadeira Victória','implemento'),('stara','Distribuidor Hércules','implemento'),('stara','Transbordo Reboke','implemento'),
  ('montana','Parruda','pulverizador_autopropelido'),('montana','Gladiador 2300','pulverizador_autopropelido'),('montana','Fenix 3000','pulverizador_autopropelido'),
  ('metalfor','Multiple 2500','pulverizador_autopropelido'),('metalfor','Multiple 3200','pulverizador_autopropelido'),
  ('kuhn','Plantadeira PL','implemento'),('kuhn','Pulverizador de Arrasto','implemento'),('kuhn','Enfardadora','implemento'),('kuhn','Segadora','implemento'),('kuhn','Distribuidor de Fertilizante','implemento'),
  ('kamaq','Plataforma de Milho','implemento'),('kamaq','Carreta Agrícola','implemento'),('kamaq','Distribuidor de Calcário','implemento'),
  ('marispan','Distribuidor de Adubo','implemento'),('marispan','Carreta Basculante','implemento'),('marispan','Tanque de Água','implemento'),
  ('tatu-marchesan','Grade Aradora','implemento'),('tatu-marchesan','Grade Niveladora','implemento'),('tatu-marchesan','Plantadeira PST','implemento'),('tatu-marchesan','Plantadeira COP','implemento'),('tatu-marchesan','Subsolador','implemento'),('tatu-marchesan','Distribuidor de Calcário','implemento'),
  ('baldan','Plantadeira PP Solo','implemento'),('baldan','Plantadeira SPE','implemento'),('baldan','Grade Aradora','implemento'),('baldan','Grade Niveladora','implemento'),('baldan','Subsolador','implemento'),('baldan','Distribuidor de Calcário','implemento'),
  ('ventura','Plataforma de Milho','implemento'),('ventura','Plataforma Draper','implemento'),('ventura','Esteira Recolhedora','implemento'),
  ('semeato','Plantadeira TDNG','implemento'),('semeato','Plantadeira SHM','implemento'),('semeato','Plantadeira SHX','implemento'),('semeato','Plantadeira Personale Drill','implemento'),
  ('jan','Distribuidor de Fertilizante','implemento'),('jan','Pulverizador de Arrasto','implemento'),('jan','Plataforma de Corte','implemento'),
  ('vence-tudo','Plantadeira SA','implemento'),('vence-tudo','Grade','implemento'),('vence-tudo','Subsolador','implemento'),
  ('civemasa','Grade Aradora','implemento'),('civemasa','Grade Niveladora','implemento'),('civemasa','Subsolador','implemento'),('civemasa','Roçadeira','implemento'),
  ('piccin','Distribuidor de Calcário','implemento'),('piccin','Carreta Agrícola','implemento'),('piccin','Tanque de Água','implemento'),
  ('jf','Ensiladeira','implemento'),('jf','Forrageira','implemento'),('jf','Vagão Forrageiro','implemento')
) as v(slug, modelo, tipo)
join catalogo_marcas m on m.slug = v.slug
on conflict (marca_id, modelo) do nothing;
