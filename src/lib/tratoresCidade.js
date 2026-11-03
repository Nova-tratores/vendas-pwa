// Cidade de um trator vendido. A tabela `tratores` tem cliente e cidade digitados
// à mão no controle de revisões, e a cidade erra bastante (o Uguccione está como
// PIRAJU e é de Carlópolis; vários de Fartura/Taguaí estão como PIRAJU). Por isso:
// achou o cliente no Clientes_Omie pelo nome → vale a cidade do Omie; senão, a
// digitada. Mesma regra da aba Vendas do Dashboard Agro. Regras puras (sem rede).
import { cidadeCanonica } from './cidadesCanon'

/** Nome comparável: sem acento, maiúsculo, só letras e espaço. */
export function nomeChave(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim()
}

/** a e b diferem em no máximo 1 letra (troca, sobra ou falta). */
export function umaLetraDeDiferenca(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, dif = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++dif > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return dif + (a.length - i) + (b.length - j) <= 1
}

/** Cidade digitada sem "FAZ ...", "BUSCA E APREENSÃO" e bairro depois da barra. */
export function limparCidadeDigitada(raw) {
  return String(raw || '').split('/')[0]
    .replace(/\s+(faz|fazenda)\s+.*/i, '').replace(/\s+busca\s+e\s+apreens.*/i, '').trim()
}

/** Linhas do Clientes_Omie ({ nome, cidade }) prontas para procurar. */
export function indexarClientesOmie(rows) {
  return (rows || []).map((c) => ({ k: nomeChave(c.nome), cidade: String(c.cidade || '').trim() }))
    .filter((c) => c.k.length > 2 && c.cidade)
}

/** Cliente do Omie com esse nome: exato; um começando pelo outro (o Omie às vezes
 *  tem CPF/sufixo no fim); ou 1 letra de diferença em nome longo (UGUCCIONE × UGUCCIONI). */
function candidatos(clientes, nome) {
  const k = nomeChave(nome)
  if (!k || k === 'NOVA TRATORES') return [] // trator da própria loja = estoque
  let c = clientes.filter((x) => x.k === k)
  if (!c.length && k.length >= 10) c = clientes.filter((x) => x.k.startsWith(k + ' ') || k.startsWith(x.k + ' '))
  if (!c.length && k.length >= 12) c = clientes.filter((x) => umaLetraDeDiferenca(x.k, k))
  return c
}

/**
 * Cidade do trator: { chave, nome, uf, origem: 'omie' | 'controle', digitada }.
 * Homônimos no Omie em cidades diferentes: fica a do Omie que bate com a digitada,
 * ou a digitada se nenhuma bate.
 */
export function cidadeDoTrator(trator, clientes) {
  const digitada = limparCidadeDigitada(trator?.Cidade)
  const canonDig = cidadeCanonica(digitada)
  const doOmie = new Map()
  for (const c of candidatos(clientes, trator?.Cliente)) {
    const canon = cidadeCanonica(c.cidade)
    if (canon.chave) doOmie.set(canon.chave, canon)
  }
  let escolhida = null
  if (doOmie.size === 1) escolhida = [...doOmie.values()][0]
  else if (doOmie.size > 1 && doOmie.has(canonDig.chave)) escolhida = doOmie.get(canonDig.chave)
  if (escolhida) return { chave: escolhida.chave, nome: escolhida.nome, uf: escolhida.uf, origem: 'omie', digitada: trator?.Cidade || '' }
  return { chave: canonDig.chave, nome: canonDig.nome || digitada, uf: canonDig.uf, origem: 'controle', digitada: trator?.Cidade || '' }
}

/** Título padrão da quest de um trator. */
export const tituloQuestTrator = (t) => `Visitar ${t.Modelo || 'trator'} …${String(t.Chassis || '').slice(-6)} — ${t.Cliente || ''}`.trim()
