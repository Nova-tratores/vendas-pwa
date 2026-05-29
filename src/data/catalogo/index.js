// Loader do catalogo curado (Mahindra). Importa todos os produto.json via glob.
// Para adicionar/remover produto: criar/deletar arquivo em ./produtos/<id>.json
// (e fotos em /public/catalogo/fotos/<id>/) e o glob pega no proximo build.

const modules = import.meta.glob('./produtos/*.json', { eager: true })

const produtos = Object.values(modules).map((mod) => mod.default || mod)

// Posicoes fixas pra produtos que precisam furar a ordem alfabetica.
// Ids sem entrada caem pro 999 e ordenam por titulo.
const ORDEM_CUSTOM = {
  'mahindra-2025': 1,
  'oja-3140': 2,
}

produtos.sort((a, b) => {
  const ord = { tratores: 1, implementos: 2, pulverizadores: 3 }
  const da = ord[a.categoria] ?? 99
  const db = ord[b.categoria] ?? 99
  if (da !== db) return da - db

  const oa = ORDEM_CUSTOM[a.id] ?? 999
  const ob = ORDEM_CUSTOM[b.id] ?? 999
  if (oa !== ob) return oa - ob

  return a.titulo.localeCompare(b.titulo)
})

export const CATEGORIAS = [
  { key: 'tratores', label: 'Tratores' },
  { key: 'implementos', label: 'Implementos' },
  { key: 'pulverizadores', label: 'Pulverizadores' },
]

export function getProdutos() {
  return produtos
}

export function getProdutoById(id) {
  return produtos.find((p) => p.id === id)
}

export function getFotosLocais(produtoId) {
  // Glob das fotos em /public/catalogo/fotos/<id>/*.webp
  // Como /public/ nao passa por import, montamos URLs diretas
  // O catalogo tem maximo de 13 fotos (carregador-frontal)
  // Vamos retornar so a foto-principal por padrao + lista completa quando necessario
  return {
    principal: `/catalogo/fotos/${produtoId}/foto-principal.webp`,
  }
}
