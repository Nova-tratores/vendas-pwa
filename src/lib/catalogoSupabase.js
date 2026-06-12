// Cross-reference do catalogo curado (DESIGN) com a tabela `produtos` do Supabase
// para trazer estoque agregado e preco em runtime.

import { supabase } from './sync'

// Cache em memoria por sessao (evita refetch a cada navegacao)
const cache = new Map()

/**
 * Busca SKUs no Supabase que casam com o produto do catalogo curado.
 * Retorna agregado pronto pra UI.
 *
 * @param {object} produto - JSON do catalogo curado
 * @returns {Promise<{matched: boolean, sku_count: number, estoque_total: number,
 *                    valor_min: number|null, valor_max: number|null,
 *                    valor_medio: number|null, ambientes: string[],
 *                    atualizado_em: string|null, skus: Array}>}
 */
export async function getEstoqueProduto(produto) {
  const filtro = produto.filtro_supabase
  const modelos = produto.modelos_supabase || []

  if (!filtro || modelos.length === 0) {
    return { matched: false, sku_count: 0, estoque_total: 0, valor_min: null, valor_max: null, valor_medio: null, ambientes: [], atualizado_em: null, skus: [] }
  }

  const cacheKey = `${produto.id}|${modelos.join(',')}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)

  try {
    let q = supabase
      .from('produtos')
      .select('codigo, modelo, estoque, valor_unitario, ambiente, atualizado_em, descricao')
      .in('modelo', modelos)
      .in('familia_nome', filtro.familia_nome)

    if (filtro.marca_like) {
      q = q.ilike('marca', `%${filtro.marca_like}%`)
    }

    const { data, error } = await q

    if (error) {
      console.error('[catalogo cross-ref]', error.message)
      return { matched: false, sku_count: 0, estoque_total: 0, valor_min: null, valor_max: null, valor_medio: null, ambientes: [], atualizado_em: null, skus: [] }
    }

    const skus = data || []
    const estoque_total = skus.reduce((s, r) => s + (Number(r.estoque) || 0), 0)
    const valores = skus.map((r) => Number(r.valor_unitario) || 0).filter((v) => v > 0)
    const valor_min = valores.length ? Math.min(...valores) : null
    const valor_max = valores.length ? Math.max(...valores) : null
    const valor_medio = valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null
    const ambientes = [...new Set(skus.map((r) => r.ambiente).filter(Boolean))]
    const atualizado_em = skus
      .map((r) => r.atualizado_em)
      .filter(Boolean)
      .sort()
      .pop() || null

    const result = {
      matched: true,
      sku_count: skus.length,
      estoque_total,
      valor_min,
      valor_max,
      valor_medio,
      ambientes,
      atualizado_em,
      skus,
    }
    cache.set(cacheKey, result)
    return result
  } catch (err) {
    console.error('[catalogo cross-ref]', err)
    return { matched: false, sku_count: 0, estoque_total: 0, valor_min: null, valor_max: null, valor_medio: null, ambientes: [], atualizado_em: null, skus: [] }
  }
}

export function clearCache() {
  cache.clear()
}

export function formatBRL(v) {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

export function frescorEstoque(atualizado_em) {
  if (!atualizado_em) return { label: '—', color: 'text-slate-400' }
  const ms = Date.now() - new Date(atualizado_em).getTime()
  const dias = Math.floor(ms / 86400000)
  if (dias < 1) return { label: 'Atualizado hoje', color: 'text-green-600' }
  if (dias < 7) return { label: `Atualizado ${dias}d atrás`, color: 'text-green-600' }
  if (dias < 30) return { label: `Atualizado ${dias}d atrás`, color: 'text-amber-600' }
  return { label: `Atualizado ${dias}d atrás`, color: 'text-red-600' }
}

// ====================================================================
// ESTOQUE ATUAL: produtos diretos do Supabase (ambiente=patio)
// + overrides de admin (preço/estoque manual + visibilidade)
// ====================================================================

let estoqueAtualCache = null
let overridesCache = null

/**
 * Busca produtos do "Estoque atual" — máquinas com estoque em QUALQUER ambiente
 * (pátio, showroom, fartura, barracão, oficina…), ativos, não arquivados,
 * não-peças. Faz merge com a tabela catalogo_overrides para preço/estoque
 * sobrescritos manualmente pelo admin.
 */
export async function getEstoqueAtual({ force = false } = {}) {
  if (!force && estoqueAtualCache) return estoqueAtualCache

  const [produtosRes, overridesRes] = await Promise.all([
    supabase
      .from('produtos')
      .select('codigo_produto, codigo, descricao, marca, modelo, familia_nome, estoque, valor_unitario, imagem_url, ambiente, atualizado_em')
      .eq('inativo', false)
      .eq('arquivado', false)
      .neq('familia_nome', 'Peças')
      .order('familia_nome', { ascending: true })
      .order('descricao', { ascending: true }),
    supabase
      .from('catalogo_overrides')
      .select('*'),
  ])

  if (produtosRes.error) {
    console.error('[Estoque atual]', produtosRes.error.message)
    return []
  }

  const overrides = {}
  if (!overridesRes.error && overridesRes.data) {
    for (const o of overridesRes.data) overrides[o.codigo_produto] = o
  }
  overridesCache = overrides

  const merged = (produtosRes.data || []).map((p) => {
    const ov = overrides[p.codigo_produto]
    return {
      ...p,
      preco_efetivo: ov?.preco_override != null ? Number(ov.preco_override) : Number(p.valor_unitario) || 0,
      estoque_efetivo: ov?.estoque_override != null ? Number(ov.estoque_override) : Number(p.estoque) || 0,
      visivel: ov?.visivel !== false,
      tem_override: !!ov,
      override: ov || null,
    }
  })

  // Filtra invisíveis e zerados (não mostra produto sem estoque na vitrine)
  const visiveis = merged.filter((p) => p.visivel && p.estoque_efetivo > 0)

  // Agrupa por modelo (case-insensitive). Modelo vazio = item individual.
  const grupos = new Map()  // key -> { items: [], total: ... }
  for (const p of visiveis) {
    const modeloNorm = (p.modelo || '').trim().toUpperCase()
    const key = modeloNorm ? `m:${modeloNorm}` : `i:${p.codigo_produto}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key).push(p)
  }

  // Cada grupo vira 1 card. Atributos agregados.
  const resultado = []
  for (const items of grupos.values()) {
    const primario = items[0]                                       // pra rota /catalogo/sb-{id}
    const estoque_total = items.reduce((s, x) => s + x.estoque_efetivo, 0)
    const precos = items.map((x) => x.preco_efetivo).filter((v) => v > 0)
    const preco_min = precos.length ? Math.min(...precos) : 0
    const preco_max = precos.length ? Math.max(...precos) : 0
    const imagem_url = items.map((x) => x.imagem_url).find((u) => !!u) || null
    resultado.push({
      ...primario,
      estoque_efetivo: estoque_total,       // soma do grupo
      preco_efetivo: preco_min || 0,        // referência (card mostra faixa via preco_min/max)
      preco_min,
      preco_max,
      imagem_url,
      n_variacoes: items.length,
      grupo_codigos: items.map((x) => x.codigo_produto),
    })
  }

  estoqueAtualCache = resultado
  return estoqueAtualCache
}

/**
 * Busca 1 produto do Estoque atual por codigo_produto.
 * Aceita string ou number.
 */
export async function getEstoqueAtualById(codigoProduto) {
  const id = Number(codigoProduto)
  const lista = await getEstoqueAtual()
  return lista.find((p) => p.codigo_produto === id) || null
}

/**
 * Lista TODOS produtos do escopo (inclui invisíveis) — pra tela admin.
 */
export async function getProdutosAdmin() {
  const { data, error } = await supabase
    .from('produtos')
    .select('codigo_produto, codigo, descricao, marca, modelo, familia_nome, estoque, valor_unitario, imagem_url, ambiente, atualizado_em')
    .eq('inativo', false)
    .eq('arquivado', false)
    .neq('familia_nome', 'Peças')
    .order('descricao', { ascending: true })
  if (error) throw error

  const { data: overridesData } = await supabase.from('catalogo_overrides').select('*')
  const overrides = {}
  for (const o of (overridesData || [])) overrides[o.codigo_produto] = o

  return (data || []).map((p) => ({
    ...p,
    override: overrides[p.codigo_produto] || null,
  }))
}

/**
 * Upsert de override (admin).
 */
export async function salvarOverride(codigoProduto, fields, supervisorId) {
  const payload = {
    codigo_produto: codigoProduto,
    ...fields,
    updated_at: new Date().toISOString(),
    updated_by: supervisorId,
  }
  const { error } = await supabase
    .from('catalogo_overrides')
    .upsert(payload, { onConflict: 'codigo_produto' })
  if (error) throw error
  // Limpa cache pra próximas leituras pegarem o valor novo
  estoqueAtualCache = null
  overridesCache = null
}

export function clearEstoqueCache() {
  estoqueAtualCache = null
  overridesCache = null
}

// ====================================================================
// MÍDIA POR PRODUTO (foto/video/pdf adicionados pelo admin)
// ====================================================================

const MIDIA_BUCKET = 'catalogo-midia'

function midiaComUrl(m) {
  return {
    ...m,
    url_publica: `${supabase.supabaseUrl}/storage/v1/object/public/${MIDIA_BUCKET}/${m.storage_path}`,
  }
}

async function listarMidias(coluna, valor) {
  const { data, error } = await supabase
    .from('catalogo_midia')
    .select('*')
    .eq(coluna, valor)
    .order('ordem', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[Midia list]', error.message)
    return []
  }
  return (data || []).map(midiaComUrl)
}

/**
 * Lista mídias de um produto do Estoque atual (Omie), por codigo_produto.
 */
export async function getMidiasProduto(codigoProduto) {
  return listarMidias('codigo_produto', codigoProduto)
}

/**
 * Lista mídias de um produto do catálogo curado, por catalogo_produto_id.
 */
export async function getMidiasCatalogoProduto(catalogoProdutoId) {
  return listarMidias('catalogo_produto_id', catalogoProdutoId)
}

/**
 * Resumo de mídias (1 consulta) pra montar os ícones de conteúdo no admin.
 * Retorna contagens por tipo agrupadas por dono (curado e estoque).
 */
export async function getResumoMidias() {
  const { data, error } = await supabase
    .from('catalogo_midia')
    .select('catalogo_produto_id, codigo_produto, tipo')
  if (error) {
    console.error('[Resumo midias]', error.message)
    return { porCatalogo: {}, porCodigo: {} }
  }
  const porCatalogo = {}
  const porCodigo = {}
  for (const m of (data || [])) {
    const alvo = m.catalogo_produto_id != null
      ? (porCatalogo[m.catalogo_produto_id] ||= { foto: 0, video: 0, pdf: 0 })
      : m.codigo_produto != null
        ? (porCodigo[m.codigo_produto] ||= { foto: 0, video: 0, pdf: 0 })
        : null
    if (alvo && (m.tipo in alvo)) alvo[m.tipo]++
  }
  return { porCatalogo, porCodigo }
}

/**
 * Upload de arquivo + insert em catalogo_midia.
 * Retorna o registro criado (com url_publica).
 */
export async function uploadMidia({ codigoProduto, catalogoProdutoId, file, tipo, titulo, supervisorId, onProgress }) {
  if (!file) throw new Error('Arquivo é obrigatório')
  if (!['foto', 'video', 'pdf'].includes(tipo)) throw new Error(`Tipo inválido: ${tipo}`)
  if (!codigoProduto && !catalogoProdutoId) throw new Error('Informe codigoProduto ou catalogoProdutoId')

  // path único: {dono}/{timestamp}-{slug do nome}. Produto curado usa prefixo cat-.
  const ts = Date.now()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const slug = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .slice(0, 40) || 'arquivo'
  const ownerPrefix = catalogoProdutoId ? `cat-${catalogoProdutoId}` : `${codigoProduto}`
  const storagePath = `${ownerPrefix}/${ts}-${slug}.${ext}`

  // Upload
  const { error: upErr } = await supabase.storage
    .from(MIDIA_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || (tipo === 'pdf' ? 'application/pdf' : undefined),
      upsert: false,
    })
  if (upErr) throw new Error(`Upload falhou: ${upErr.message}`)

  // Insert na tabela
  const { data, error: insErr } = await supabase
    .from('catalogo_midia')
    .insert({
      codigo_produto: codigoProduto ?? null,
      catalogo_produto_id: catalogoProdutoId ?? null,
      tipo,
      storage_path: storagePath,
      titulo: titulo || null,
      ordem: 0,
      created_by: supervisorId || null,
    })
    .select()
    .single()

  if (insErr) {
    // rollback do storage se a insert falhar
    await supabase.storage.from(MIDIA_BUCKET).remove([storagePath])
    throw new Error(`Insert falhou: ${insErr.message}`)
  }

  return {
    ...data,
    url_publica: `${supabase.supabaseUrl}/storage/v1/object/public/${MIDIA_BUCKET}/${data.storage_path}`,
  }
}

/**
 * Remove mídia: deleta do Storage + da tabela.
 */
export async function deletarMidia(midia) {
  // delete do storage (se falhar, ainda tenta remover a row pra nao deixar orfa)
  if (midia.storage_path) {
    const { error: stErr } = await supabase.storage.from(MIDIA_BUCKET).remove([midia.storage_path])
    if (stErr) console.warn('[Midia storage delete]', stErr.message)
  }
  const { error } = await supabase.from('catalogo_midia').delete().eq('id', midia.id)
  if (error) throw new Error(`Delete falhou: ${error.message}`)
}

/**
 * Helper pra resize de foto no cliente antes do upload (Canvas, max 1280px, webp q82).
 * Retorna um novo File pronto pra upload.
 */
export async function resizeFotoParaUpload(file, { maxDim = 1280, quality = 0.82 } = {}) {
  if (!file.type.startsWith('image/')) return file
  // Não tenta resize de gif/webp animado: passa raw
  if (file.type === 'image/gif') return file

  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = URL.createObjectURL(file)
  })

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, w, h)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality))
  URL.revokeObjectURL(img.src)
  if (!blob) return file
  // Mantém .webp na extensão e content-type
  const baseName = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

// ====================================================================
// CATÁLOGO CURADO (multi-marca, gerenciável pela tela de admin)
// Substitui o portfólio antes estático em src/data/catalogo/.
// Vendedor vê só o que está visível (marca E produto); admin vê tudo.
// ====================================================================

// Categorias do catálogo curado. Usadas como filtro (vendedor) e sugestões (admin).
export const CATEGORIAS = [
  { key: 'tratores', label: 'Tratores' },
  { key: 'implementos', label: 'Implementos' },
  { key: 'pulverizadores', label: 'Pulverizadores' },
]

let marcasCache = null
let produtosCatalogoCache = null

export function clearCatalogoCache() {
  marcasCache = null
  produtosCatalogoCache = null
}

/**
 * Lista marcas. adminMode=true traz invisíveis também.
 */
export async function getMarcas({ adminMode = false } = {}) {
  if (!adminMode && marcasCache) return marcasCache
  let q = supabase
    .from('catalogo_marcas')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  if (!adminMode) q = q.eq('visivel', true)
  const { data, error } = await q
  if (error) {
    console.error('[catalogo marcas]', error.message)
    return []
  }
  const marcas = data || []
  if (!adminMode) marcasCache = marcas
  return marcas
}

/**
 * Lista produtos do catálogo curado, com a marca embutida.
 * Vendedor (adminMode=false): só produto.visivel E marca.visivel.
 */
export async function getProdutosCatalogo({ adminMode = false } = {}) {
  if (!adminMode && produtosCatalogoCache) return produtosCatalogoCache

  let q = supabase
    .from('catalogo_produtos')
    .select('*, marca:catalogo_marcas(id, nome, slug, visivel, ordem)')
  if (!adminMode) q = q.eq('visivel', true)
  const { data, error } = await q
  if (error) {
    console.error('[catalogo produtos]', error.message)
    return []
  }

  let produtos = data || []
  // marca invisível esconde todos os produtos dela (só no app do vendedor)
  if (!adminMode) produtos = produtos.filter((p) => p.marca?.visivel !== false)

  const ordCat = { tratores: 1, implementos: 2, pulverizadores: 3 }
  produtos.sort((a, b) => {
    const ma = a.marca?.ordem ?? 99, mb = b.marca?.ordem ?? 99
    if (ma !== mb) return ma - mb
    const ca = ordCat[a.categoria] ?? 99, cb = ordCat[b.categoria] ?? 99
    if (ca !== cb) return ca - cb
    if ((a.ordem ?? 99) !== (b.ordem ?? 99)) return (a.ordem ?? 99) - (b.ordem ?? 99)
    return (a.titulo || '').localeCompare(b.titulo || '')
  })

  if (!adminMode) produtosCatalogoCache = produtos
  return produtos
}

/**
 * Busca 1 produto curado por slug (tela de detalhe do vendedor).
 */
export async function getProdutoCatalogoBySlug(slug) {
  const { data, error } = await supabase
    .from('catalogo_produtos')
    .select('*, marca:catalogo_marcas(id, nome, slug, visivel)')
    .eq('slug', slug)
    .maybeSingle()
  if (error) {
    console.error('[catalogo produto slug]', error.message)
    return null
  }
  return data
}

/**
 * Upsert de marca (admin). Sem id = insert; com id = update.
 */
export async function salvarMarca(marca, supervisorId) {
  const payload = { ...marca, updated_at: new Date().toISOString(), updated_by: supervisorId }
  const { data, error } = await supabase
    .from('catalogo_marcas')
    .upsert(payload)
    .select()
    .single()
  if (error) throw error
  clearCatalogoCache()
  return data
}

export async function deletarMarca(id) {
  const { error } = await supabase.from('catalogo_marcas').delete().eq('id', id)
  if (error) throw error
  clearCatalogoCache()
}

/**
 * Upsert de produto curado (admin). Sem id = insert; com id = update.
 */
export async function salvarProdutoCatalogo(produto, supervisorId) {
  const payload = { ...produto, updated_at: new Date().toISOString(), updated_by: supervisorId }
  const { data, error } = await supabase
    .from('catalogo_produtos')
    .upsert(payload)
    .select()
    .single()
  if (error) throw error
  clearCatalogoCache()
  return data
}

export async function deletarProdutoCatalogo(id) {
  const { error } = await supabase.from('catalogo_produtos').delete().eq('id', id)
  if (error) throw error
  clearCatalogoCache()
}

/**
 * Sobe um arquivo avulso (foto principal ou folheto) pro Storage e devolve a
 * URL pública. NÃO cria registro em catalogo_midia (a galeria usa uploadMidia).
 * Usa o slug como prefixo de pasta (único por produto).
 */
export async function uploadArquivoCatalogo({ slug, file }) {
  if (!file) throw new Error('Arquivo é obrigatório')
  if (!slug) throw new Error('Defina o slug antes de enviar arquivos')
  const ts = Date.now()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const nome = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .slice(0, 40) || 'arquivo'
  const storagePath = `cat-${slug}/${ts}-${nome}.${ext}`
  const { error } = await supabase.storage
    .from(MIDIA_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })
  if (error) throw new Error(`Upload falhou: ${error.message}`)
  return `${supabase.supabaseUrl}/storage/v1/object/public/${MIDIA_BUCKET}/${storagePath}`
}

// ====================================================================
// COMPARTILHAMENTOS (WhatsApp) — métrica de uso do catálogo pelo vendedor
// ====================================================================

/**
 * Registra um compartilhamento de produto pelo WhatsApp. Best-effort: nunca
 * lança (uma falha aqui não pode atrapalhar o envio em si).
 *
 * @param {object} p
 * @param {number|string|null} p.codigoProduto      - item do estoque atual (Omie)
 * @param {number|string|null} p.catalogoProdutoId  - item do catálogo curado
 * @param {string} p.produtoTitulo
 * @param {string} p.telefone   - só dígitos (pode vir vazio no share nativo)
 * @param {string} p.canal      - 'whatsapp_wame' | 'whatsapp_share'
 * @param {string[]} p.itens    - o que foi enviado (titulo, foto, descricao, valor, folheto)
 */
export async function registrarCompartilhamento({ codigoProduto, catalogoProdutoId, produtoTitulo, telefone, canal, itens }) {
  try {
    let vendedor = {}
    try { vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}') } catch { /* ignora */ }
    const { error } = await supabase.from('catalogo_compartilhamentos').insert({
      vendedor_id: vendedor?.id ?? null,
      vendedor_nome: vendedor?.nome || null,
      codigo_produto: codigoProduto != null ? Number(codigoProduto) : null,
      catalogo_produto_id: catalogoProdutoId != null ? Number(catalogoProdutoId) : null,
      produto_titulo: produtoTitulo || null,
      telefone: telefone ? String(telefone).replace(/\D/g, '') : null,
      canal: canal || 'whatsapp_wame',
      itens: itens && itens.length ? itens : null,
    })
    if (error) console.warn('[compartilhamento]', error.message)
  } catch (err) {
    console.warn('[compartilhamento]', err)
  }
}

/**
 * Lista compartilhamentos (supervisor). Traz os mais recentes primeiro.
 */
export async function getCompartilhamentos({ limit = 500 } = {}) {
  const { data, error } = await supabase
    .from('catalogo_compartilhamentos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[compartilhamentos]', error.message)
    return []
  }
  return data || []
}
