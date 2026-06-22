-- supabase-catalogo-aplicacao-calibracao.sql
-- Calibração da taxonomia de aplicação (depois de ver vw_familia_categoria_resolvida).
-- Idempotente. Roda DEPOIS de supabase-catalogo-aplicacao.sql.
--   - 2 categorias novas que o front já referencia (agricultura de precisão, ATV/UTV)
--   - regras seed_v2 p/ famílias que caíram em "a_classificar" e dá pra automatizar
--   - reaplica o resolver nas fichas curadas (só onde está nulo)

-- 1. Categorias novas (o Showroom já tem ícone pra elas)
insert into catalogo_categorias (id, nome, ordem, icone) values
  ('agricultura_precisao', 'Agricultura de precisão', 85, 'satellite'),
  ('atv_utv',              'ATV e UTV',               88, 'atv')
on conflict (id) do nothing;

-- 2. Regras de calibração (seed_v2). Re-semeia só as v2, preserva v1 e overrides.
delete from catalogo_familia_regra where observacao = 'seed_v2';

insert into catalogo_familia_regra (prioridade, padrao, categoria_id, observacao) values
  -- "Vagões" não casava em %VAGÃO%/%VAGAO% (acento/plural) → cobre VAGÕ*
  (20, '%VAGÕ%',     'forragem_pecuaria',       'seed_v2'),
  (20, '%TRINCHA%',  'forragem_pecuaria',       'seed_v2'),
  -- Conjunto/Carregador Frontal = movimentação de carga
  (20, '%FRONTAL%',  'transporte_movimentacao', 'seed_v2'),
  -- Agricultura de Precisão
  (20, '%PRECIS%',   'agricultura_precisao',    'seed_v2'),
  -- ATV / UTV
  (20, '%ATV%',      'atv_utv',                 'seed_v2'),
  (20, '%UTV%',      'atv_utv',                 'seed_v2');

-- 3. Reaplica nas fichas curadas (não sobrescreve curadoria manual existente)
update catalogo_produtos cp
set categoria_aplicacao = resolve_categoria_familia(cp.filtro_supabase -> 'familia_nome' ->> 0)
where cp.categoria_aplicacao is null
  and cp.filtro_supabase ? 'familia_nome';
