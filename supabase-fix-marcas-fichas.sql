-- ============================================================================
-- Correção de marca em fichas do catálogo curado (2026-06-23)
--
-- Sintoma: várias fichas criadas pelo botão "Adicionar" da tela Mais Vendidas
-- caíram em MAHINDRA por padrão. Causa: o "Adicionar" resolve a marca por NOME
-- EXATO; quando vem o nome jurídico cru do Omie ("KAMAQ MAQUINAS E IMPLEMENTOS
-- AGRICOLAS LTDA", "KUHN DO BRASIL S/A"…) o match falha e cai em marcas[0] =
-- Mahindra (ordem 0).
--
-- Este script SÓ corrige a marca_id. NÃO apaga fichas (a 64 é duplicata da 20,
-- mas com conteúdo diferente — mesclar é decisão manual na UI).
--
-- Rodar em:
-- https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================================================

-- 1) Bônus: deixa o Kamaq na ordem alfabética esperada no dropdown (estava ordem 4,
--    aparecia lá no topo em vez de na seção do "K"). Comente se preferir manter no topo.
update catalogo_marcas set ordem = 10 where slug = 'kamaq';

-- 2) Repontar as fichas com marca claramente errada (marca canônica já existe).
update catalogo_produtos set marca_id = 4  where id = 64;  -- "KAMAQ KD152"            -> Kamaq
update catalogo_produtos set marca_id = 6  where id = 81;  -- "KUHN DO BRASIL ... PORTER 800-ST" -> Kuhn
update catalogo_produtos set marca_id = 2  where id = 87;  -- "MARCHESAN PERFURADOR DE SOLO"     -> Tatu Marchesan
update catalogo_produtos set marca_id = 12 where id = 77;  -- "HARAMAQ VAGAO MISTURADOR PROHMIX" -> Haramaq

-- 3) Conferência: o que ainda está em Mahindra depois da correção.
--    Revise estas na tela (algumas SÃO Mahindra de verdade; outras você decide a marca).
--    Ambíguas conhecidas: 71 ROTOSIS (marca não existe no catálogo ainda),
--    85 EZPILOT (Trimble), 74 GLOBALMIX, 58 GAICR, 68 CT-6000A, 88 plantadeira de
--    cana, 17 plantadora de batatas, 1/2 carregador frontal, 18 retroescavadeira VX90.
select id, titulo, slug
from catalogo_produtos
where marca_id = 1
order by titulo;
