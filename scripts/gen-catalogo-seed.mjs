// Gerador do supabase-catalogo-engine.sql (schema + seed dos produtos curados).
// Lê os JSON em src/data/catalogo/produtos/ e emite o SQL completo.
// Rodar: node scripts/gen-catalogo-seed.mjs > supabase-catalogo-engine.sql
//
// Idempotente: usa ON CONFLICT (slug) DO NOTHING, então rodar de novo não
// sobrescreve edições feitas pelo admin depois da migração inicial.

import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PRODUTOS_DIR = join(__dirname, '..', 'src', 'data', 'catalogo', 'produtos')

// Posições fixas (espelha ORDEM_CUSTOM de src/data/catalogo/index.js)
const ORDEM_CUSTOM = { 'mahindra-2025': 1, 'oja-3140': 2 }

// Postgres dollar-quoting pra texto livre (descrições com aspas/acentos).
function dq(str) {
  if (str == null || str === '') return 'NULL'
  return `$txt$${str}$txt$`
}
// jsonb literal: serializa e escapa aspas simples.
function jb(val) {
  if (val == null) return 'NULL'
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
}

const files = readdirSync(PRODUTOS_DIR).filter((f) => f.endsWith('.json'))
const produtos = files.map((f) => JSON.parse(readFileSync(join(PRODUTOS_DIR, f), 'utf8')))

const DDL = `-- ============================================
-- Engine de Catálogo multi-marca (2026-06-02)
-- Migra o portfólio curado (antes JSON estático em src/data/catalogo/)
-- para tabelas gerenciáveis pela tela de admin do supervisor.
--
-- Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
--
-- GERADO por scripts/gen-catalogo-seed.mjs — não editar à mão; regenerar.
-- ============================================

-- 1. MARCAS ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_marcas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome        text NOT NULL UNIQUE,
  slug        text NOT NULL UNIQUE,
  logo_url    text,
  ordem       int DEFAULT 0,
  visivel     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  updated_by  bigint REFERENCES supervisores(id)
);

-- 2. PRODUTOS CURADOS ------------------------------------------------
CREATE TABLE IF NOT EXISTS catalogo_produtos (
  id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  marca_id            bigint NOT NULL REFERENCES catalogo_marcas(id) ON DELETE RESTRICT,
  titulo              text NOT NULL,
  subtitulo           text,
  categoria           text,
  descricao           text,
  argumentos_de_venda jsonb DEFAULT '[]'::jsonb,
  especificacoes      jsonb DEFAULT '{}'::jsonb,
  url_site            text,
  foto_principal_url  text,
  folheto_url         text,
  modelos_supabase    jsonb DEFAULT '[]'::jsonb,
  filtro_supabase     jsonb,
  visivel             boolean DEFAULT true,
  ordem               int DEFAULT 0,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  updated_by          bigint REFERENCES supervisores(id)
);

CREATE INDEX IF NOT EXISTS catalogo_produtos_marca_idx ON catalogo_produtos (marca_id, ordem);

-- 3. MÍDIA: estende catalogo_midia pra também chavear por produto curado.
ALTER TABLE catalogo_midia ADD COLUMN IF NOT EXISTS catalogo_produto_id bigint REFERENCES catalogo_produtos(id) ON DELETE CASCADE;
-- codigo_produto (Omie) passa a ser opcional; mídia pertence a UM dos dois.
ALTER TABLE catalogo_midia ALTER COLUMN codigo_produto DROP NOT NULL;
DO $$ BEGIN
  ALTER TABLE catalogo_midia ADD CONSTRAINT catalogo_midia_um_dono CHECK (
    (codigo_produto IS NOT NULL)::int + (catalogo_produto_id IS NOT NULL)::int = 1
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS catalogo_midia_produto_idx ON catalogo_midia (catalogo_produto_id, ordem);

-- 4. TRIGGERS de updated_at (reusa trg_set_updated_at já existente)
DROP TRIGGER IF EXISTS catalogo_marcas_set_updated_at ON catalogo_marcas;
CREATE TRIGGER catalogo_marcas_set_updated_at BEFORE UPDATE ON catalogo_marcas
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
DROP TRIGGER IF EXISTS catalogo_produtos_set_updated_at ON catalogo_produtos;
CREATE TRIGGER catalogo_produtos_set_updated_at BEFORE UPDATE ON catalogo_produtos
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

-- 5. RLS: leitura aberta, escrita só supervisor (igual catalogo_overrides)
ALTER TABLE catalogo_marcas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_produtos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_marcas_read    ON catalogo_marcas;
DROP POLICY IF EXISTS catalogo_marcas_write   ON catalogo_marcas;
DROP POLICY IF EXISTS catalogo_produtos_read  ON catalogo_produtos;
DROP POLICY IF EXISTS catalogo_produtos_write ON catalogo_produtos;

CREATE POLICY catalogo_marcas_read   ON catalogo_marcas   FOR SELECT USING (true);
CREATE POLICY catalogo_marcas_write  ON catalogo_marcas   FOR ALL
  USING (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()));
CREATE POLICY catalogo_produtos_read ON catalogo_produtos FOR SELECT USING (true);
CREATE POLICY catalogo_produtos_write ON catalogo_produtos FOR ALL
  USING (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()));

-- ============================================
-- 6. SEED — marca Mahindra + ${produtos.length} produtos migrados dos JSON
-- ============================================
INSERT INTO catalogo_marcas (nome, slug, ordem, visivel)
VALUES ('Mahindra', 'mahindra', 0, true)
ON CONFLICT (slug) DO NOTHING;
`

function rowSql(p) {
  const subtitulo = p.subtitulo && p.subtitulo.trim() ? p.subtitulo : null
  const fotoUrl = `/catalogo/fotos/${p.id}/foto-principal.webp`
  const folhetoUrl = p.ficha_tecnica?.url_storage || null
  const ordem = ORDEM_CUSTOM[p.id] ?? 99
  return `INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  ${dq(p.id)},
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  ${dq(p.titulo)},
  ${dq(subtitulo)},
  ${dq(p.categoria)},
  ${dq(p.descricao)},
  ${jb(p.argumentos_de_venda || [])},
  ${jb(p.especificacoes || {})},
  ${dq(p.url_site)},
  ${dq(fotoUrl)},
  ${dq(folhetoUrl)},
  ${jb(p.modelos_supabase || [])},
  ${jb(p.filtro_supabase ?? null)},
  ${ordem}
)
ON CONFLICT (slug) DO NOTHING;`
}

const seed = produtos
  .sort((a, b) => a.id.localeCompare(b.id))
  .map(rowSql)
  .join('\n\n')

process.stdout.write(DDL + '\n' + seed + '\n')
