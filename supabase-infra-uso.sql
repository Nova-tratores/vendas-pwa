-- ============================================
-- Painel de Consumo de Dados (admin)
-- Mede o que dá pra medir com precisão via SQL:
--   • tamanho e nº de linhas de cada tabela (qual parte pesa mais no banco)
--   • uso do Storage por bucket (fotos de visitas, mídias do catálogo, etc.)
--   • consumo do worker do Railway (jobs/MB/erros) via tabela worker_uso
-- Banda/egress e cobrança ao vivo ficam nos dashboards do Supabase/Railway.
-- Rodar no SQL Editor do Supabase.
-- ============================================

-- 1) Tabela onde o worker (Railway) grava o que processou, 1 linha por job.
CREATE TABLE IF NOT EXISTS worker_uso (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  worker text NOT NULL DEFAULT 'youtube',
  midia_id bigint,
  status text,                       -- 'pronto' | 'erro'
  bytes_baixados bigint,             -- tamanho bruto baixado do YouTube
  bytes_final bigint,               -- tamanho do mp4 enviado ao Storage
  duracao_video_seg integer,        -- duração do vídeo processado
  processamento_seg numeric(10,2),  -- tempo de CPU/parede gasto no job
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_worker_uso_created ON worker_uso (created_at DESC);

ALTER TABLE worker_uso ENABLE ROW LEVEL SECURITY;
-- Supervisor logado lê (o service_role do worker ignora RLS no insert).
DROP POLICY IF EXISTS "worker_uso_read" ON worker_uso;
CREATE POLICY "worker_uso_read" ON worker_uso FOR SELECT USING (true);

-- 2) Tamanho + nº de linhas por tabela do schema public.
CREATE OR REPLACE FUNCTION infra_tamanho_tabelas()
RETURNS TABLE (
  tabela text,
  total_bytes bigint,
  dados_bytes bigint,
  indices_bytes bigint,
  linhas bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::text AS tabela,
    pg_total_relation_size(c.oid) AS total_bytes,
    pg_table_size(c.oid)         AS dados_bytes,
    pg_indexes_size(c.oid)       AS indices_bytes,
    c.reltuples::bigint          AS linhas
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_total_relation_size(c.oid) DESC;
$$;

-- 3) Uso do Storage por bucket (soma do tamanho dos objetos).
CREATE OR REPLACE FUNCTION infra_uso_storage()
RETURNS TABLE (
  bucket text,
  arquivos bigint,
  total_bytes bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = storage, pg_catalog
AS $$
  SELECT
    o.bucket_id::text AS bucket,
    count(*)          AS arquivos,
    COALESCE(sum( (o.metadata->>'size')::bigint ), 0) AS total_bytes
  FROM storage.objects o
  GROUP BY o.bucket_id
  ORDER BY 3 DESC;
$$;

-- 4) Resumo do worker num intervalo de dias (default 30).
CREATE OR REPLACE FUNCTION infra_uso_worker(dias integer DEFAULT 30)
RETURNS TABLE (
  jobs bigint,
  jobs_ok bigint,
  jobs_erro bigint,
  bytes_baixados bigint,
  bytes_final bigint,
  processamento_seg numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    count(*) AS jobs,
    count(*) FILTER (WHERE status = 'pronto') AS jobs_ok,
    count(*) FILTER (WHERE status = 'erro')   AS jobs_erro,
    COALESCE(sum(bytes_baixados), 0)  AS bytes_baixados,
    COALESCE(sum(bytes_final), 0)     AS bytes_final,
    COALESCE(sum(processamento_seg), 0) AS processamento_seg
  FROM worker_uso
  WHERE created_at >= now() - (dias || ' days')::interval;
$$;

-- Permissões de execução para o cliente autenticado (supervisor logado).
GRANT EXECUTE ON FUNCTION infra_tamanho_tabelas() TO authenticated;
GRANT EXECUTE ON FUNCTION infra_uso_storage()     TO authenticated;
GRANT EXECUTE ON FUNCTION infra_uso_worker(integer) TO authenticated;
