// Cidade "oficial" a partir do texto livre do cadastro de clientes.
// O cadastro (vindo do Omie e do app) tem a mesma cidade escrita de vários
// jeitos: "Carlopolis", "CARLOPOLIS (PR)", "Carloplolis", "Fartura/B Guaiuvira".
// Aqui cada grafia é ligada ao município do IBGE (SP, PR, MG, MS), aceitando
// erro de digitação de até 2 letras. Regras puras (sem rede).
import MUNICIPIOS from './municipiosIbge.json'

const sem = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const ORDEM_UF = { SP: 0, PR: 1, MG: 2, MS: 3 }
// sigla de qualquer estado no fim: "(SP)", "/SP", "- SP", " SP"
const SUFIXO_UF = /\s*(?:\(|\/|-|\s)\s*(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\s*\)?$/

/** Texto limpo: sem acento, maiúsculo, sem UF e sem bairro depois da barra. */
export function limparCidade(texto) {
  let t = sem(texto).toUpperCase().replace(/\s+/g, ' ').trim()
  const uf = (t.match(SUFIXO_UF) || [])[1] || null
  t = t.replace(SUFIXO_UF, '').trim()
  t = t.split('/')[0].trim() // "FARTURA/B GUAIUVIRA" -> "FARTURA"
  t = t.replace(/^STA\.? /, 'SANTA ').replace(/^STO\.? /, 'SANTO ').replace(/^S\.? /, 'SAO ')
    .replace(/^CEL\.? /, 'CORONEL ').replace(/^PRES\.? /, 'PRESIDENTE ').replace(/^1\s*[°ºO]?\s+DE /, 'PRIMEIRO DE ')
  t = t.replace(/[^A-Z0-9' ]/g, '').replace(/\s+/g, ' ').trim()
  return { nome: t, uf }
}

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 99
  const m = a.length, n = b.length
  let ant = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    ant = cur
  }
  return ant[n]
}

const INDICE = MUNICIPIOS.map(([nome, uf, ibge]) => ({ nome, uf, ibge, chave: limparCidade(nome).nome }))
const POR_CHAVE = new Map()
for (const m of INDICE) POR_CHAVE.set(m.chave, [...(POR_CHAVE.get(m.chave) || []), m])

const escolher = (lista, uf) =>
  [...lista].sort((a, b) => (a.uf === uf ? -1 : 0) - (b.uf === uf ? -1 : 0) || ORDEM_UF[a.uf] - ORDEM_UF[b.uf])[0]

/**
 * Município oficial de um texto de cidade.
 * @returns {{ chave, nome, uf, ibge, oficial: boolean }}
 */
export function cidadeCanonica(texto) {
  const { nome, uf } = limparCidade(texto)
  if (!nome) return { chave: '', nome: '', uf: null, ibge: null, oficial: false }
  // com a sigla do estado no texto, só vale município daquele estado
  const doEstado = (m) => !uf || m.uf === uf
  const exato = (POR_CHAVE.get(nome) || []).filter(doEstado)
  if (exato.length) { const m = escolher(exato, uf); return { chave: `${m.uf}:${m.chave}`, nome: m.nome, uf: m.uf, ibge: m.ibge, oficial: true } }
  // erro de digitação: até 1 letra em nome curto, até 2 em nome com 8+ letras
  const limite = nome.length >= 8 ? 2 : nome.length >= 5 ? 1 : 0
  let melhor = null, dMin = 99
  for (const m of INDICE) {
    if (m.chave[0] !== nome[0] || !doEstado(m)) continue
    const d = distancia(nome, m.chave)
    if (d < dMin || (d === dMin && melhor && escolher([melhor, m], uf) === m)) { dMin = d; melhor = m }
  }
  if (melhor && dMin <= limite) return { chave: `${melhor.uf}:${melhor.chave}`, nome: melhor.nome, uf: melhor.uf, ibge: melhor.ibge, oficial: true }
  return { chave: `?:${uf || ""}:${nome}`, nome, uf, ibge: null, oficial: false }
}

/**
 * Agrupa a contagem de cidades do cadastro ([{ cidade, total }]) pelo município oficial.
 * @returns [{ chave, nome, uf, oficial, total, grafias: [{ cidade, total }] }]
 */
export function agruparCidades(cidades) {
  const grupos = new Map()
  for (const c of cidades) {
    const can = cidadeCanonica(c.cidade)
    if (!can.chave) continue
    const g = grupos.get(can.chave) || { ...can, total: 0, grafias: [] }
    g.total += c.total
    g.grafias.push(c)
    grupos.set(can.chave, g)
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}
