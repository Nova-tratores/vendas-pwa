-- ============================================
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
-- 6. SEED — marca Mahindra + 18 produtos migrados dos JSON
-- ============================================
INSERT INTO catalogo_marcas (nome, slug, ordem, visivel)
VALUES ('Mahindra', 'mahindra', 0, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$carregador-frontal$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$CARREGADOR FRONTAL$txt$,
  NULL,
  $txt$implementos$txt$,
  $txt$Carregador frontal Mahindra oferece versatilidade para operações agrícolas e pecuárias. Disponível em diversos modelos com capacidades de 800kg a 1.500kg, adaptável a tratores de diferentes potências. Ideal para movimentação de terra, grãos, esterco e outros materiais, com acessórios especializados que ampliam sua funcionalidade no campo.$txt$,
  '["Capacidade de carga até 1.500kg","Versões básicas e autonivelantes","Compatível com múltiplos modelos Mahindra","Altura máxima de 3,7 metros","Diversos acessórios para diferentes aplicações","Ideal para pecuária e agricultura"]'::jsonb,
  '{"modelos":"T41, M45, T61, M65, T81, M85, M105","carga_maxima_kg":"800 a 1.500","altura_maxima_m":"2,85 a 3,7","versoes":"Básica e Autonivelante","compatibilidade_tratores":"4530, 5050, 6060, 6065, 6065E, 6065F, 6075, 8000S, 9500S, 86-110P"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/carregador-frontal/$txt$,
  $txt$/catalogo/fotos/carregador-frontal/foto-principal.webp$txt$,
  NULL,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$carregador-frontal-l15$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$CARREGADOR FRONTAL L15$txt$,
  NULL,
  $txt$implementos$txt$,
  $txt$O Carregador Frontal L15 é um implemento compacto e versátil, ideal para pequenos e médios produtores rurais. Com capacidade de carga de 300kg e compatibilidade com tratores de 15 a 40cv, oferece agilidade na movimentação de terra, areia, grãos e esterco. Seu design autonivelante e comando monoalavanca garantem facilidade operacional, enquanto a troca rápida de acessórios potencializa a produtividade em diferentes aplicações.$txt$,
  '["Capacidade máxima de 300kg de carga","Compatível com tratores 15 a 40cv","Comando monoalavanca para fácil operação","Troca rápida de acessórios disponível","Acople e desacople sem ferramentas","Autonivelante para maior precisão","Peso reduzido de apenas 190kg"]'::jsonb,
  '{"capacidade_maxima_carga":"300kg","altura_maxima":"2,10m","potencia_compativel":"15 a 40cv","peso":"190kg","autonivelante":"Sim","acople_desacople":"Sim","troca_rapida_acessorios":"Sim","comando_monoalavanca":"Sim"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/carregador-frontal-l15/$txt$,
  $txt$/catalogo/fotos/carregador-frontal-l15/foto-principal.webp$txt$,
  NULL,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-2025$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 2025$txt$,
  $txt$25 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 2025 é um trator subcompacto de 25 cv desenvolvido especialmente para produtores de hortifrutigranjeiros, uva e fumo. Ideal para agricultura familiar, sua estrutura compacta permite trabalhos em estufas e espaços reduzidos de até 80 cm, oferecendo versatilidade e eficiência em operações agrícolas intensivas.$txt$,
  '["Capô basculante em metal para fácil manutenção","Menor raio de giro do segmento para manobras precisas","Sistema hidráulico 3 pontos com 750 kg de levante","Transmissão mecânica 8F+4R com versatilidade operacional","Powertrain estrutural para maior resistência","Ideal para agricultura familiar e produção intensiva"]'::jsonb,
  '{"potência":"25 cv","tipo":"Trator subcompacto","transmissão":"Mecânica 8F+4R","sistema_hidráulico":"3 pontos com capacidade de levante de 750 kg","aplicações":"Hortifrutigranjeiros, uva, fumo, estufas, canteiros até 80 cm"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-2025/$txt$,
  $txt$/catalogo/fotos/mahindra-2025/foto-principal.webp$txt$,
  NULL,
  '["JIVO 2025"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  1
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-5050$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 5050$txt$,
  $txt$49 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 5050 com 49,3 cv é ideal para produtores de horticultura, oferecendo grande capacidade operacional com mínimo consumo de combustível. Equipado com motor agrícola Mahindra de última geração, transmissão mecânica versátil e sistema hidráulico de 3 pontos potente, é um trator multitarefas que entrega economia e desempenho.$txt$,
  '["Motor Mahindra MTDHI30 com baixo consumo combustível","Transmissão mecânica 12F + 12R com reversor","Capô basculante metal facilitando manutenção","Tomada potência 540E com menor ruído","Sistema hidráulico 3 pontos 1.700 kg levante","Versátil para diversas atividades agrícolas"]'::jsonb,
  '{"potencia":"49,3 cv @ 2100 rpm","motor":"Mahindra MTDHI30, 4 cilindros, 2,9 litros","transmissao":"Mecânica com reversor 12F + 12R","sistema_hidraulico":"3 pontos","capacidade_levante":"1.700 kg","vazao_controle_remoto":"27,3 l/min","tomada_potencia":"540E disponível"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-5050/$txt$,
  $txt$/catalogo/fotos/mahindra-5050/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/AF_Folheto_5050_A4.pdf$txt$,
  '["5050"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-6060$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 6060$txt$,
  $txt$60 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 6060 oferece 57 cv de potência com motor de nova geração, transmissão sincronizada de 40 marchas e excelente capacidade de levante hidráulico. Ideal para pequenos e médios produtores que buscam economia de combustível, desempenho confiável e fácil manutenção em operações agrícolas diversificadas.$txt$,
  '["Motor Mahindra MTDHI30 de 57 cv com torque em baixas rotações","Transmissão mecânica sincronizada 20 marchas frente e ré","Capacidade de levante hidráulico de 2.700 kg","Vazão de controle remoto de 42 l/min","Capô basculante de metal com fácil acesso","Opção de TDP 540E com menor consumo","Velocidade mínima de 0,360 km/h"]'::jsonb,
  '{"potencia":"57 cv @ 2100 rpm","motor":"Mahindra MTDHI30, 4 cilindros, 2,9 litros","transmissao":"Mecânica sincronizada com reversor, 20F + 20R","capacidade_levante_hidraulico":"2.700 kg","vazao_controle_remoto":"42 l/min","tomada_potencia":"540E disponível","velocidade_minima":"0,360 km/h"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-6060/$txt$,
  $txt$/catalogo/fotos/mahindra-6060/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/ficha-tecnica-6060.pdf$txt$,
  '["6060"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-6065$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 6065$txt$,
  $txt$65 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 6065 é o mais novo modelo da linha 6000, equipado com motor agrícola de última geração que proporciona excelente economia. Com transmissão sincronizada, sistema hidráulico de 3 pontos e capacidade de levante superior, é ideal para produtores que buscam versatilidade e eficiência operacional em diversas condições de trabalho.$txt$,
  '["Motor MSI-475 65 cv com baixo consumo combustível","Capacidade levante 2.900 kg maior segmento","40 marchas totais 20 frente e 20 ré","Tomada potência com 3 velocidades incluindo reversora","Capô metal basculante fácil manutenção preventiva","Transmissão sincronizada redutor velocidades 0,36 km/h"]'::jsonb,
  '{"potência":"65 cv @2100 rpm (ISO 14396)","motor":"Mahindra MSI-475, 4 cilindros, 3.8 Litros","torque":"Ideal em baixas rotações","transmissão":"Mecânica sincronizada com reversor e redutor, 20 marchas frente e 20 marchas ré","sistema_hidraulico":"3 pontos com capacidade levante 2.900 kg","vazão_controle_remoto":"58 l/min","tomada_potencia":"3 opções velocidade (540 + 540 E + Reversora)","velocidade_minima":"0,36 km/h"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-6065/$txt$,
  $txt$/catalogo/fotos/mahindra-6065/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/ficha-tecnica-6065.pdf$txt$,
  '["6065","6065 CAB"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-6075$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 6075$txt$,
  $txt$80 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 6075 é o único no segmento com TDP reversora, garantindo mais segurança e agilidade ao operador. Com transmissão mecânica sincronizada e 9 marchas na faixa de trabalho, oferece versatilidade para diversas condições. É cerca de 15% mais econômico comparado aos principais concorrentes, representando o menor custo operacional do Brasil.$txt$,
  '["TDP reversora única no segmento","Transmissão sincronizada com 20F+20R","Motor Mahindra MSI-475 de 80 cv","15% mais econômico que concorrentes","Capô basculante de peça única","Nove marchas na faixa de trabalho","Robustez e confiabilidade comprovadas"]'::jsonb,
  '{"potência":"80 cv @2100 rpm","motor":"Mahindra MSI-475, 4 cilindros, 3.8 litros","transmissão":"Mecânica sincronizada com reversor (20F+20R)","marchas":"9 marchas na faixa de trabalho","torque":"Ideal em baixas rotações","tipo":"Trator Agrícola"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-6075/$txt$,
  $txt$/catalogo/fotos/mahindra-6075/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/ficha-tecnica-6075.pdf$txt$,
  '["6075","6075 BR","6075 BR CAB","6075 CAB","6075 CBU","6075 PLAT","6075L CBU P"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-6075e$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 6075E$txt$,
  $txt$80 CV$txt$,
  $txt$tratores$txt$,
  $txt$Trator Mahindra 6075E de 80 cv desenvolvido especialmente para culturas semi adensadas como café. Único da categoria com TDP reversora, oferece transmissão mecânica sincronizada com reversor e 9 marchas na faixa de trabalho, garantindo segurança, agilidade e versatilidade em diversas condições operacionais.$txt$,
  '["TDP reversora única no segmento","Motor MSI-475 com baixo consumo combustível","Transmissão com 20 marchas à frente e ré","Capô metálico basculante para fácil manutenção","Largura otimizada para culturas adensadas","Torque ideal em baixas rotações"]'::jsonb,
  '{"potencia":"80 cv @ 2100 rpm","motor":"Mahindra MSI-475, 4 cilindros, 3.8 litros","transmissao":"Mecânica sincronizada com reversor (20F+20R)","marchas_trabalho":"9 marchas na faixa de trabalho","tdp":"Reversora","pneus_padrao":"12.4-28 R1","largura_total":"1,58 m a 1,67 m (face a face)","versoes":"Cabinado ou plataformado"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-6075e/$txt$,
  $txt$/catalogo/fotos/mahindra-6075e/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/ficha-tecnica-6075E.pdf$txt$,
  '["6075E","6075E CAB"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-6675f$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 6675F$txt$,
  $txt$80 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 6675F de 80 cv foi eleito Trator do Ano 23/24 na Categoria Especiais, sendo ideal para produtores de frutas de caroço e maçã. Equipado com motor Perkins de injeção mecânica, oferece transmissão mecânica sincronizada, sistema hidráulico potente e cabine inovadora que proporciona conforto e produtividade nas operações agrícolas especializadas.$txt$,
  '["Trator do Ano 23/24 em categoria especiais","Motor Perkins 1104D-44T com baixo consumo","Transmissão 16 marchas à frente e 8 à ré","Sistema hidráulico com 2.800 kg de levante","TDP 540 Econômica reduz ruído e combustível","Cabine design inovador adequada para frutas","Controle remoto com 2 válvulas dupla ação"]'::jsonb,
  '{"potencia":"80 cv","motor":"Perkins 1104D-44T injeção mecânica","transmissao":"Mecânica sincronizada 16 marchas à frente, 8 à ré","sistema_hidraulico":"3 pontos com capacidade de levante 2.800 kg","controle_remoto":"2 válvulas de dupla ação com vazão 48,5 l/min","tdp":"540 Econômica","categoria":"Especiais - frutas de caroço e maçã"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-6675f/$txt$,
  $txt$/catalogo/fotos/mahindra-6675f/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/AF_Folheto_6675F_A4.pdf$txt$,
  '[]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-7095$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 7095$txt$,
  $txt$95 CV$txt$,
  $txt$tratores$txt$,
  $txt$O Trator Mahindra 7095 é uma solução moderna e prática para produtores rurais, oferecendo design contemporâneo, melhor ergonomia, sistema de iluminação LED de última geração e custo operacional competitivo. Projetado com capô de abertura total e plataforma integral de operação, atende às necessidades de quem busca eficiência e durabilidade no campo.$txt$,
  '["Design contemporâneo com faróis LED automotivos","Capô com abertura total para melhor manutenção","Sistema hidráulico 3 pontos com 3.700 kg de levante","Transmissão sincronizada com reversor mecânico (12F+12R)","Embreagem sinterizada de alta durabilidade","Custo operacional sem igual no mercado","Plataforma integral de operação ergonômica"]'::jsonb,
  '{"potência":"95 CV","transmissão":"Sincronizada com reversor mecânico (12F + 12R)","sistema_hidráulico":"3 pontos","capacidade_levante":"3.700 kg","iluminação":"LED","embreagem":"Discos sinterizados"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-7095/$txt$,
  $txt$/catalogo/fotos/mahindra-7095/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/P2_AF_Folheto_7095_A4_dez2024-1.pdf$txt$,
  '["7095","7095 95CV","7095 CAB","7095 CAB 95CV","7095CAB"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mahindra-8110$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA 8110$txt$,
  $txt$110 CV$txt$,
  $txt$tratores$txt$,
  $txt$O trator Mahindra 8110 é o único no segmento com TDP de 6 velocidades, oferecendo versatilidade e agilidade operacional incomparáveis. Fabricado no Brasil com transmissão sincronizada de 16 marchas (10 na faixa principal) e sistema hidráulico potente, é a solução completa para o produtor rural que busca eficiência, facilidade de manutenção e acesso a financiamento via BNDES.$txt$,
  '["TDP com 6 opções de velocidade para versatilidade máxima","Transmissão sincronizada 16F+16R com 10 marchas trabalho","Capacidade levante 5.000kg no sistema 3 pontos","Capô basculante facilita manutenção preventiva","Financiamento BNDES e especificações 86-110","Sistema freio pneumático carreta categoria","Ar comprimido com 2 tomadas limpeza calibração"]'::jsonb,
  '{"potencia":"110 CV","transmissao":"Mecânica sincronizada com reversor (16F+16R)","marchas_trabalho":"10 marchas na faixa principal","tdp":"6 opções de velocidade","capacidade_levante":"5.000kg","sistema_hidraulico":"3 pontos hidráulicos","fabricacao":"Brasil","freios":"Pneumático para carreta"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/trator-mahindra-8110/$txt$,
  $txt$/catalogo/fotos/mahindra-8110/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/AF_Folheto_8110_A4.pdf$txt$,
  '["86-110P"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mitra-1500l$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA BY MITRA 1500L$txt$,
  $txt$1500L$txt$,
  $txt$pulverizadores$txt$,
  $txt$Pulverizador de 1500 litros especialmente desenvolvido para agricultura familiar, ideal para produtores de frutas, café e outras culturas. Equipamento único no mercado que trabalha com rotação de TDP de 450 RPM, proporcionando economia de combustível e maior longevidade. Bomba de diafragma de alta pressão com 75 litros por minuto garante aplicação eficiente e homogênea.$txt$,
  '["Rotação TDP 450 RPM única no mercado brasileiro","Economia de combustível com motor agrícola em baixa rotação","Bomba 75 litros/minuto alta pressão para aplicação eficiente","Agitação cruzada para mistura contínua de químicos","Chassis galvanizado com pintura a pó e laca","Cinco modos de controle com bicos de duas vias"]'::jsonb,
  '{"capacidade_tanque":"1500L","tanque_enxague":"115L","tanque_lavagem_maos":"18L","vazao_bomba":"75 l/min","numero_bicos":"14","diametro_ventilador":"712mm","velocidade_ar":"38m/s (137km/h)","alcance_vertical":"9m","alcance_horizontal":"3,5m","potencia_requerida":"45 CV","peso":"675kg"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/mahindra-by-mitra-1500l/$txt$,
  $txt$/catalogo/fotos/mitra-1500l/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/Folheto_Airotec_A4_2022_V4.pdf$txt$,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mitra-2000l$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA BY MITRA 2000L$txt$,
  $txt$2000L$txt$,
  $txt$pulverizadores$txt$,
  $txt$Pulverizador agrícola de alta capacidade com 2000 litros, desenvolvido para culturas diversas. Oferece versatilidade em pulverização com controlador de 5 modos, carcaça em aço inoxidável 304 que resiste à corrosão de produtos químicos, e sistema de filtragem dupla. Ideal para propriedades que buscam eficiência, durabilidade e precisão na aplicação de defensivos.$txt$,
  '["Tanque de 2000L com dupla filtragem para máxima eficiência","Carcaça de aço inox 304 com alta resistência à corrosão","Versatilidade: pulverização baixo e alto volume no mesmo equipamento","Controle de saída de ar com 2 velocidades e caixa neutra","Válvula limitadora de pressão protege a bomba","Chassi galvanizado por imersão a quente para durabilidade","Sistema de agitação contínua garante mistura uniforme"]'::jsonb,
  '{"capacidade_tanque":"2000L","tanque_enxague":"145L","tanque_lavagem_maos":"20L","vazao_bomba_modelo_1":"75 l/min","vazao_bomba_modelo_2":"100 l/min","numero_bicos_modelo_1":"14","numero_bicos_modelo_2":"16","diametro_ventilador_modelo_1":"712mm","diametro_ventilador_modelo_2":"815mm","velocidade_saida_ar_modelo_1":"38m/s (137km/h)","velocidade_saida_ar_modelo_2":"44m/s (158km/h)","alcance_vertical_modelo_1":"9m","alcance_vertical_modelo_2":"11m","alcance_horizontal_modelo_1":"3,5m","alcance_horizontal_modelo_2":"5m","potencia_requerida_modelo_1":"50 CV","potencia_requerida_modelo_2":"55 CV","peso_modelo_1":"780kg","peso_modelo_2":"810kg"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/mahindra-by-mitra-2000l/$txt$,
  $txt$/catalogo/fotos/mitra-2000l/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/Folheto_Airotec_A4_2022_V4.pdf$txt$,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mitra-200l$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA BY MITRA 200L$txt$,
  $txt$200L$txt$,
  $txt$pulverizadores$txt$,
  $txt$Pulverizador Airotec Turbo 200L projetado para aplicações em culturas variadas como uva e pomares. Tanque com capacidade de 200 litros, equipado com agitador para mistura adequada de produtos químicos. Oferece eficiência em pequenas áreas sem restrição de giro, combinando capacidade, controle e versatilidade para proteção e manutenção de plantas.$txt$,
  '["Tanque 200 litros com indicador de nível","Caixa ventilador aço inox contra corrosão","Pulverização baixo e alto volume","Sistema dupla filtragem operação suave","Chassi galvanizado alta durabilidade","Dispositivos segurança pressão e proteção"]'::jsonb,
  '{"capacidade_tanque":"200L","vazao_bomba_opcao1":"55 l/min","vazao_bomba_opcao2":"65 l/min","numero_bicos_opcao1":"10","numero_bicos_opcao2":"12","diametro_ventilador_opcao1":"550mm","diametro_ventilador_opcao2":"616mm","velocidade_ar_opcao1":"24m/s (87km/h)","velocidade_ar_opcao2":"32m/s (115km/h)","alcance_vertical_opcao1":"4m","alcance_vertical_opcao2":"6m","alcance_horizontal_opcao1":"2m","alcance_horizontal_opcao2":"2,5m","potencia_requerida":"24 CV","material_tanque":"HDPE","material_chassi":"Galvanizado imersão quente","material_ventilador":"Aço inoxidável 304"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/mahindra-by-mitra-200l/$txt$,
  $txt$/catalogo/fotos/mitra-200l/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/Folheto_Airotec_A4_2022_V4.pdf$txt$,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$mitra-600l$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$MAHINDRA BY MITRA 600L$txt$,
  $txt$600L$txt$,
  $txt$pulverizadores$txt$,
  $txt$Pulverizador desenvolvido para agricultura familiar, ideal para fruticultores de uva, maçã, romã e outras culturas. Trabalha com rotação TDP de 450 RPM, garantindo economia de combustível e longevidade. Equipado com bomba de diafragma de alta pressão 75 l/min e agitação cruzada para mistura contínua de químicos.$txt$,
  '["Única máquina do mercado com 450 RPM de TDP","Duas velocidades + neutro reguláveis","Bomba 75 l/min com alta pressão","Agitação cruzada para mistura contínua","Alcance vertical até 9 metros","Chassis galvanizado com pintura a pó"]'::jsonb,
  '{"capacidade":"600L","tanque_enxague":"70L","tanque_lavagem":"20L","vazao_bomba":"75 l/min","numero_bicos":"12-14","diametro_ventilador":"616-712mm","velocidade_ar":"32-38 m/s","alcance_vertical":"6-9m","alcance_horizontal":"2,5-3,5m","potencia_requerida":"24-36 CV","peso":"475-490kg","rotacao_tdp":"450 RPM"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/mahindra-by-mitra-600l/$txt$,
  $txt$/catalogo/fotos/mitra-600l/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/Folheto_Airotec_A4_2022_V4.pdf$txt$,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$oja-3140$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$OJA 3140$txt$,
  $txt$40 CV$txt$,
  $txt$tratores$txt$,
  $txt$O OJA 3140 é uma retroescavadeira compacta Mahindra projetada para trabalhos de precisão em espaços reduzidos. Com motor de 40 CV, oferece excelente capacidade de levante hidráulico e agilidade em manobras. Ideal para operações agrícolas e de construção que exigem eficiência e controle.$txt$,
  '["Redutor garante velocidade a partir de 0,3 km/h","Reversor proporciona maior agilidade em manobras","TDP eletro-hidráulica com acionamento por botão","Eixo dianteiro portal com menor raio de giro","Capacidade de levante hidráulico de 950 kg","Transmissão com velocidades independentes 540 e 540e"]'::jsonb,
  '{"motor":"Mahindra DI","potencia":"40 CV @ 2500 RPM","torque_maximo":"133 Nm @ 1650 RPM","tomada_de_potencia":"540 @ 2258 RPM / 540e @ 1786 RPM (Eletro-Hidráulico)","tanque_combustivel":"33 Litros","capacidade_levante":"950 kg","acionamento_tdp":"Independente Eletro-Hidráulico"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/oja-3140/$txt$,
  $txt$/catalogo/fotos/oja-3140/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/AF_Folheto_oja3140_A4-BX-1.pdf$txt$,
  '["OJA 3140"]'::jsonb,
  '{"familia_nome":["Trator Novo","Trator Seminovo"],"marca_like":"mahindra"}'::jsonb,
  2
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$plantadora-batatas$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$PLANTADORA DE BATATAS$txt$,
  NULL,
  $txt$implementos$txt$,
  $txt$Plantadora de Batatas Mahindra oferece plantio de alta precisão com padronização impecável, eliminando faltas e duplicações. Aumenta a produção de culturas em 10 a 20%, ideal para agricultores que buscam eficiência e rentabilidade no plantio mecanizado de batatas.$txt$,
  '["Plantio de alta precisão e padronizado","Aumenta produção de culturas em 10 a 20%","Capacidade de 4000 m² por hora","Tanque fixo com 500 kg de capacidade","Acionamento mecânico e confiável","Distâncias ajustáveis entre linhas"]'::jsonb,
  '{"tipo_de_tanque":"Fixo","capacidade_do_tanque":"500 Kg","capacidade_de_fertilizante":"130 Litros","acionamento":"Mecânico","peso_bruto":"1000 Kg","peso_total_carregada":"1624 Kg","capacidade_de_plantio":"4000 m²/h @ 3-5 km/h","distancia_entre_linhas":"61, 66, 71 e 76 cm","agitador_de_correia":"Mecânico / Eletrônico"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/plantadora-batatas/$txt$,
  $txt$/catalogo/fotos/plantadora-batatas/foto-principal.webp$txt$,
  NULL,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO catalogo_produtos
  (slug, marca_id, titulo, subtitulo, categoria, descricao, argumentos_de_venda, especificacoes, url_site, foto_principal_url, folheto_url, modelos_supabase, filtro_supabase, ordem)
VALUES (
  $txt$retroescavadeira-vx90$txt$,
  (SELECT id FROM catalogo_marcas WHERE slug = 'mahindra'),
  $txt$RETROESCAVADEIRA VX90$txt$,
  $txt$90 CV$txt$,
  $txt$tratores$txt$,
  $txt$A Retroescavadeira Mahindra VX90 é uma máquina de construção com motor diesel turbo-intercooler de alta eficiência, destinada a operadores profissionais que buscam produtividade, economia de combustível e conforto. Ideal para obras de escavação, drenagem e infraestrutura, oferece melhor desempenho na categoria com baixo custo de manutenção e cabine climatizada.$txt$,
  '["Motor diesel 91cv com melhor eficiência de combustível","Profundidade máxima de escavação 4350mm","Transmissão Carraro com 4 marchas à frente e ré","Cabine com ar-condicionado para conforto total","Baixo custo de manutenção e maior economia","Ergonomia superior e design confortável","Produtividade e desempenho superiores na categoria"]'::jsonb,
  '{"tipo_motor":"Diesel 4 cilindros Turbo-intercooler","potencia":"91cv @ 2200rpm","torque_maximo":"345Nm @ 1400rpm","cilindros_cilindrada":"4/3532cc","transmissao":"Carraro TLB1 (4F + 4R)","profundidade_maxima_escavacao":"4350mm","altura_maxima_descarga":"3606mm"}'::jsonb,
  $txt$https://www.mahindrabrasil.com.br/retroescavadeira-vx90/$txt$,
  $txt$/catalogo/fotos/retroescavadeira-vx90/foto-principal.webp$txt$,
  $txt$https://citrhumdkfivdzbmayde.supabase.co/storage/v1/object/public/catalogo-pdfs/AF_Folheto_VX90_A4.pdf$txt$,
  '[]'::jsonb,
  NULL,
  99
)
ON CONFLICT (slug) DO NOTHING;
