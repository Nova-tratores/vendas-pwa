-- ============================================
-- Mídia extra por produto (foto/video/pdf) - 2026-05-29
--
-- Admin sobe arquivos extras pelos produtos do estoque atual
-- (codigo_produto refere a tabela produtos do Omie). Vendedor ve na
-- tela de detalhe do produto.
--
-- Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Tabela
CREATE TABLE IF NOT EXISTS catalogo_midia (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo_produto  bigint NOT NULL,
  tipo            text NOT NULL CHECK (tipo IN ('foto', 'video', 'pdf')),
  storage_path    text NOT NULL,             -- ex: 1991227691/1717012345-frente.webp
  titulo          text,                       -- ex: "Lateral direita" (opcional)
  ordem           int DEFAULT 0,              -- pra galeria; menor = primeiro
  created_at      timestamptz DEFAULT now(),
  created_by      bigint REFERENCES supervisores(id)
);

CREATE INDEX IF NOT EXISTS catalogo_midia_codigo_produto_idx
  ON catalogo_midia (codigo_produto, ordem);

-- 2. RLS - leitura aberta, escrita só supervisor
ALTER TABLE catalogo_midia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_midia_read  ON catalogo_midia;
DROP POLICY IF EXISTS catalogo_midia_write ON catalogo_midia;

CREATE POLICY catalogo_midia_read
  ON catalogo_midia FOR SELECT
  USING (true);

CREATE POLICY catalogo_midia_write
  ON catalogo_midia FOR ALL
  USING (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()));

-- ============================================
-- 3. BUCKET DE STORAGE
-- ============================================
-- Tentativa via API. Se falhar (depende de RLS de buckets), criar manual:
-- Dashboard > Storage > New bucket:
--   Name: catalogo-midia
--   Public bucket: SIM
--   File size limit: 25 MB
--   Allowed MIME types: image/*, video/*, application/pdf
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalogo-midia',
  'catalogo-midia',
  true,
  26214400,  -- 25 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime','video/webm','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Policies do Storage para o bucket catalogo-midia
DROP POLICY IF EXISTS catalogo_midia_storage_read   ON storage.objects;
DROP POLICY IF EXISTS catalogo_midia_storage_write  ON storage.objects;
DROP POLICY IF EXISTS catalogo_midia_storage_delete ON storage.objects;

-- Leitura: qualquer um (bucket eh publico)
CREATE POLICY catalogo_midia_storage_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'catalogo-midia');

-- Upload e update: somente supervisor logado
CREATE POLICY catalogo_midia_storage_write
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'catalogo-midia'
    AND EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid())
  );

CREATE POLICY catalogo_midia_storage_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'catalogo-midia'
    AND EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid())
  );
