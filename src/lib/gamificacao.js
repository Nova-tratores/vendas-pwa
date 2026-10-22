// Gamificação do NT Vendas — regras puras (sem rede, funcionam offline).
// Tudo é DERIVADO das visitas já registradas: não há tabela de XP para burlar.
// O XP sempre vem colado ao comportamento certo (registrar bem a visita):
//   XP da visita = nota de completude (0–100, lib/completudeVisita).
// Sequência = dias úteis seguidos com pelo menos 1 visita completa (nota ≥ 80),
// com 1 proteção automática por mês (chuva, doença, estrada fechada).
import { notaVisita, visitaParaNota } from './completudeVisita'

export const NIVEIS = [
  { cv: 50, xp: 0 },
  { cv: 75, xp: 500 },
  { cv: 100, xp: 1500 },
  { cv: 125, xp: 3000 },
  { cv: 150, xp: 5000 },
  { cv: 200, xp: 8000 },
  { cv: 250, xp: 12000 },
]

export function nivelDe(xp) {
  let i = 0
  while (i + 1 < NIVEIS.length && xp >= NIVEIS[i + 1].xp) i++
  const atual = NIVEIS[i]
  const proximo = NIVEIS[i + 1] || null
  const pct = proximo ? Math.round(((xp - atual.xp) / (proximo.xp - atual.xp)) * 100) : 100
  return { indice: i, ...atual, proximo, faltaXp: proximo ? proximo.xp - xp : 0, pct }
}

/** Subiu de nível entre dois totais de XP? Devolve o nível novo ou null. */
export function subiuDeNivel(xpAntes, xpDepois) {
  const a = nivelDe(xpAntes), b = nivelDe(xpDepois)
  return b.indice > a.indice ? b : null
}

const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const util = (d) => d.getDay() !== 0 && d.getDay() !== 6

/**
 * Sequência de dias úteis com visita completa, contando para trás a partir de
 * hoje. Hoje ainda está aberto: sem visita completa hoje, a conta começa ontem
 * (a chama não apaga de manhã). Um dia útil sem visita é coberto pela proteção
 * do mês, uma vez por mês; o segundo buraco no mesmo mês encerra a sequência.
 */
export function sequencia(diasCompletos, hoje = new Date()) {
  const feitos = new Set(diasCompletos)
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  if (!feitos.has(dia(cursor))) cursor.setDate(cursor.getDate() - 1)
  let dias = 0
  const protecoesUsadas = []
  for (let guarda = 0; guarda < 400; guarda++) {
    if (!util(cursor)) { cursor.setDate(cursor.getDate() - 1); continue }
    const d = dia(cursor)
    if (feitos.has(d)) dias++
    else {
      const mes = d.slice(0, 7)
      if (dias === 0 || protecoesUsadas.some((p) => p.startsWith(mes))) break
      protecoesUsadas.push(d)
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  const mesAtual = dia(hoje).slice(0, 7)
  return { dias, protecoesUsadas, protecaoDisponivel: !protecoesUsadas.some((p) => p.startsWith(mesAtual)) }
}

/** Tamanho da chama: cresce aos 5, 10 e 20 dias. */
export const chama = (dias) => (dias >= 20 ? 4 : dias >= 10 ? 3 : dias >= 5 ? 2 : dias >= 1 ? 1 : 0)

/** Perfil do vendedor a partir das visitas dele (IndexedDB). */
export function perfilVendedor(visitas, ctx, hoje = new Date()) {
  let xp = 0
  const diasCompletos = new Set()
  for (const v of visitas) {
    if (v.deleted_at || v.duplicada_de) continue
    const n = notaVisita(visitaParaNota(v, ctx)).nota
    xp += n
    if (n >= 80 && v.data_visita) diasCompletos.add(dia(new Date(v.data_visita)))
  }
  const seq = sequencia([...diasCompletos], hoje)
  return { xp, nivel: nivelDe(xp), sequencia: seq, chama: chama(seq.dias) }
}

/**
 * "Quase lá": quantos campos faltam, no mínimo, para a visita ficar verde.
 * Pega os faltantes de maior peso primeiro.
 */
export function camposParaVerde(nota) {
  if (nota.nota >= 80) return 0
  const faltam = nota.itens.filter((i) => !i.ok).map((i) => i.pontos).sort((a, b) => b - a)
  let soma = nota.nota
  for (let i = 0; i < faltam.length; i++) {
    soma += faltam[i]
    if (soma >= 80) return i + 1
  }
  return faltam.length
}
