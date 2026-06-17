-- ============================================================================
-- Vídeos do YouTube no catálogo + reel do Showroom (2026-06-17)
--
-- Idempotente. Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
--
-- Parte deste script já foi aplicada via MCP (colunas origem_url/status/erro/
-- visivel_vendedor, modelo, destaque_showroom, limite do bucket). As linhas abaixo
-- são todas IF NOT EXISTS / idempotentes — re-rodar é seguro.
-- ============================================================================

-- 1) Fila de download do YouTube embutida em catalogo_midia ------------------
alter table catalogo_midia add column if not exists origem_url       text;
alter table catalogo_midia add column if not exists status           text    not null default 'pronto';
alter table catalogo_midia add column if not exists erro             text;
alter table catalogo_midia add column if not exists visivel_vendedor boolean not null default false;
alter table catalogo_midia alter column storage_path drop not null;

alter table catalogo_midia drop constraint if exists catalogo_midia_status_chk;
alter table catalogo_midia add constraint catalogo_midia_status_chk
  check (status in ('pendente','baixando','pronto','erro'));

create index if not exists idx_catalogo_midia_fila
  on catalogo_midia (status) where status in ('pendente','baixando');

-- 2) Mídia de estoque compartilhada por MARCA + MODELO ----------------------
-- Um vídeo/foto subido num SKU vale pra todas as máquinas da mesma marca+modelo.
alter table catalogo_midia add column if not exists modelo text;
alter table catalogo_midia add column if not exists marca  text;

create index if not exists idx_catalogo_midia_modelo on catalogo_midia (modelo) where modelo is not null;
create index if not exists idx_catalogo_midia_marca_modelo on catalogo_midia (marca, modelo);

-- Backfill marca/modelo (normalizados) a partir do codigo_produto das mídias existentes.
update catalogo_midia cm
set modelo = coalesce(cm.modelo, upper(trim(p.modelo))),
    marca  = coalesce(cm.marca,  upper(trim(p.marca)))
from produtos p
where cm.codigo_produto = p.codigo_produto
  and cm.codigo_produto is not null
  and (cm.modelo is null or cm.marca is null);

-- 3) Reel do Showroom + corte de início do vídeo ----------------------------
alter table catalogo_midia add column if not exists destaque_showroom boolean not null default false;
alter table catalogo_midia add column if not exists inicio_seg        integer;   -- corte do começo (s)

create index if not exists idx_catalogo_midia_destaque
  on catalogo_midia (destaque_showroom) where destaque_showroom = true;

-- 4) Limite do bucket (vídeo comprimido) ------------------------------------
update storage.buckets set file_size_limit = 104857600 where id = 'catalogo-midia';
