-- ============================================================================
-- View: vw_maquinas_mais_vendidas
-- Ranking de máquinas mais vendidas (histórico completo do Omie) para a tela
-- Supervisor › Catálogo › Mais vendidas. Cruza vendas_itens com produtos (marca/
-- modelo) e com catalogo_produtos (o que já está no catálogo curado), pra priorizar
-- o que falta cadastrar.
--
-- Fonte de vendas: vendas_itens (itens de pedido do Omie). NÃO usa o funil do app
-- (negocios) — esse não tem volume.
--
-- Escopo "máquinas, sem peças": exclui Peças e itens internos (Ativo Imobilizado,
-- Kit Revisão, Cabine, Requisição, .Inativo) e família vazia. Mantém Distribuidor,
-- Conjunto Frontal, Roçadeira, ATV E UTV, Carreta, Grade, Plantadeira, etc.
--
-- Limitação conhecida (v1): grafias divergentes de marca (KAMAQ vs KAMAQ MAQUINAS...)
-- e modelo (KD152 vs KD 152) podem gerar linhas duplicadas. Não bloqueia a
-- priorização visual; normalização fina fica como melhoria futura.
--
-- Aplicar no SQL Editor do projeto citrhumdkfivdzbmayde.
-- ============================================================================

drop view if exists public.vw_maquinas_mais_vendidas;

create view public.vw_maquinas_mais_vendidas as
with cat as (
  -- todos os modelos já curados no catálogo, normalizados
  select distinct upper(trim(m)) as modelo_norm
  from public.catalogo_produtos cp
  cross join lateral jsonb_array_elements_text(cp.modelos_supabase) as m
  where coalesce(trim(m), '') <> ''
),
maq as (
  select
    nullif(upper(trim(coalesce(p.marca, ''))), '')   as marca,
    nullif(upper(trim(coalesce(p.modelo, ''))), '')  as modelo,
    -- chave de exibição: usa o modelo do Omie; quando não houver, cai na descrição
    -- do item (evita colapsar todos os "sem modelo" de uma família numa linha só)
    upper(trim(coalesce(nullif(trim(p.modelo), ''), vi.descricao))) as item,
    vi.familia,
    coalesce(vi.quantidade, 0)  as quantidade,
    coalesce(vi.valor_total, 0) as valor_total
  from public.vendas_itens vi
  left join public.produtos p
    on p.codigo_produto::text = vi.codigo_produto
  where coalesce(vi.familia, '') not in (
      'Peças', 'Ativo Imobilizado', 'KIT REVISÃO', 'Cabine',
      '####Requisição####', '.Inativo'
    )
    and coalesce(vi.familia, '') <> ''
)
select
  maq.marca,
  maq.item,
  maq.familia,
  sum(maq.quantidade)               as qtd,
  round(sum(maq.valor_total))       as valor_total,
  count(*)                          as pedidos,
  exists (
    select 1 from cat where cat.modelo_norm = maq.modelo
  )                                 as em_catalogo
from maq
group by maq.marca, maq.item, maq.familia
order by qtd desc nulls last;

comment on view public.vw_maquinas_mais_vendidas is
  'Ranking de máquinas vendidas (vendas_itens, histórico completo), com flag em_catalogo cruzando catalogo_produtos.modelos_supabase. Usado na tela Supervisor › Mais vendidas.';

-- A view roda com privilégio do owner (postgres), então não esbarra na RLS de
-- vendas_itens. O app supervisor lê com anon key + sessão autenticada.
grant select on public.vw_maquinas_mais_vendidas to anon, authenticated;
