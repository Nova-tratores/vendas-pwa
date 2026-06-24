-- ============================================================================
-- Migra as URLs de mídia já gravadas pro domínio próprio (2026-06-24)
--
-- De:  https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/...
-- Pra: https://midia.novatratores.com/storage/v1/object/public/...
--
-- Só troca o HOST; o path do Storage é idêntico. A API (banco/login) continua
-- no domínio supabase.co — isto aqui é só pros arquivos públicos (fotos/folhetos).
--
-- Idempotente (o WHERE só pega o que ainda está no domínio antigo).
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
--
-- IMPORTANTE: rode também o supabase-catalogo-publico.sql (recria a view
-- vw_catalogo_publico já apontando pro domínio novo).
-- ============================================================================

-- 1) PRÉVIA: quantas linhas serão afetadas (rode antes pra conferir).
select 'catalogo_produtos.foto_principal_url' as alvo, count(*) as linhas
from catalogo_produtos
where foto_principal_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%'
union all
select 'catalogo_produtos.folheto_url', count(*)
from catalogo_produtos
where folheto_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%'
union all
select 'catalogo_marcas.logo_url', count(*)
from catalogo_marcas
where logo_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%';

-- 2) Foto principal das fichas curadas.
update catalogo_produtos
set foto_principal_url = replace(
      foto_principal_url,
      'https://citrhumdkfivdzbmayde.supabase.co/storage',
      'https://midia.novatratores.com/storage')
where foto_principal_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%';

-- 3) Folheto técnico das fichas curadas.
update catalogo_produtos
set folheto_url = replace(
      folheto_url,
      'https://citrhumdkfivdzbmayde.supabase.co/storage',
      'https://midia.novatratores.com/storage')
where folheto_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%';

-- 4) Logo de marca (só as que estão no Storage; logos locais não casam o WHERE).
update catalogo_marcas
set logo_url = replace(
      logo_url,
      'https://citrhumdkfivdzbmayde.supabase.co/storage',
      'https://midia.novatratores.com/storage')
where logo_url like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%';

-- 5) CONFERÊNCIA: deve voltar zero linhas no domínio antigo.
select 'ainda no antigo' as status, count(*) as linhas from (
  select foto_principal_url u from catalogo_produtos
  union all select folheto_url from catalogo_produtos
  union all select logo_url from catalogo_marcas
) t
where u like 'https://citrhumdkfivdzbmayde.supabase.co/storage/%';

-- Obs: a galeria (catalogo_midia) guarda só o storage_path — a URL é montada em
-- runtime pelo app já com o domínio novo, então não precisa de UPDATE aqui.
