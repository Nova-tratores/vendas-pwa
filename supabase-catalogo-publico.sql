-- ============================================================================
-- API pública do catálogo pro site (WordPress + Elementor) — 2026-06-17
--
-- View denormalizada (1 linha por ficha visível do portfólio curado), com URLs
-- ABSOLUTAS, pronta pra ser consumida pelo sync do WordPress (etapa 2).
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
--
-- security_invoker = on → respeita a RLS das tabelas base (que já é leitura pública);
-- a própria view filtra visivel=true, então só dado público é exposto. Grant pra anon.
-- ============================================================================

drop view if exists public.vw_catalogo_publico;

create view public.vw_catalogo_publico
with (security_invoker = on) as
select
  p.id,
  p.slug,
  p.titulo,
  p.subtitulo,
  p.categoria,
  p.descricao,
  p.argumentos_de_venda,   -- jsonb array
  p.especificacoes,        -- jsonb object
  p.url_site,
  p.ordem,
  p.updated_at,
  m.nome as marca_nome,
  m.slug as marca_slug,
  case when m.logo_url ~~ 'http%' then m.logo_url
       when nullif(m.logo_url, '') is not null then 'https://vendas-pwa-production.up.railway.app' || m.logo_url
       else null end as marca_logo_url,
  -- Foto principal: vira URL absoluta (a maioria é arquivo local servido pela PWA).
  case when p.foto_principal_url ~~ 'http%' then p.foto_principal_url
       when nullif(p.foto_principal_url, '') is not null then 'https://vendas-pwa-production.up.railway.app' || p.foto_principal_url
       else null end as foto_principal_url,
  p.folheto_url,           -- já é URL absoluta (Storage)
  -- Fotos extras da galeria (Storage)
  coalesce((
    select jsonb_agg(jsonb_build_object('titulo', mid.titulo,
             'url', 'https://midia.novatratores.com/storage/v1/object/public/catalogo-midia/' || mid.storage_path)
             order by mid.ordem, mid.created_at)
    from catalogo_midia mid
    where mid.catalogo_produto_id = p.id and mid.tipo = 'foto' and mid.storage_path is not null
  ), '[]'::jsonb) as fotos_extras,
  -- Vídeos prontos (Storage) — reusa o pipeline do worker-youtube
  coalesce((
    select jsonb_agg(jsonb_build_object('titulo', mid.titulo,
             'url', 'https://midia.novatratores.com/storage/v1/object/public/catalogo-midia/' || mid.storage_path)
             order by mid.ordem, mid.created_at)
    from catalogo_midia mid
    where mid.catalogo_produto_id = p.id and mid.tipo = 'video' and mid.status = 'pronto' and mid.storage_path is not null
  ), '[]'::jsonb) as videos
from catalogo_produtos p
join catalogo_marcas m on m.id = p.marca_id
where p.visivel = true and m.visivel = true;

grant select on public.vw_catalogo_publico to anon, authenticated;

-- OPCIONAL (controle de visibilidade do site separado do app do vendedor):
-- alter table catalogo_produtos add column if not exists visivel_site boolean not null default true;
-- e na view trocar "p.visivel = true" por "p.visivel = true and p.visivel_site = true".
