// Port de lib/inteligencia-vendas/painel-vendedores.ts do Portal (parte de períodos):
// a tela escolhe semana · mês · trimestre · ano e soma os eventos com somar() de fonte.js.
import { somar } from '../../../lib/iv/fonte'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const ymd = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10)
export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  return ymd(a, m - 1, d + n)
}

export const ESCALAS = [['semana', 'Semana'], ['mes', 'Mês'], ['trimestre', 'Trimestre'], ['ano', 'Ano']]

/** Período que contém `ref` (ISO). Semana = segunda a domingo. */
export function periodo(escala, ref) {
  const y = Number(ref.slice(0, 4)), m = Number(ref.slice(5, 7)) - 1
  if (escala === 'semana') {
    const dow = (new Date(`${ref}T12:00:00Z`).getUTCDay() + 6) % 7
    const de = somarDias(ref, -dow), ate = somarDias(de, 6)
    const f = (s) => `${s.slice(8, 10)}/${s.slice(5, 7)}`
    return { de, ate, rotulo: `${f(de)} a ${f(ate)}`, curto: f(de) }
  }
  if (escala === 'mes') return { de: ymd(y, m, 1), ate: ymd(y, m + 1, 0), rotulo: `${MESES[m]}/${y}`, curto: MESES[m] }
  if (escala === 'trimestre') {
    const q = Math.floor(m / 3)
    return { de: ymd(y, q * 3, 1), ate: ymd(y, q * 3 + 3, 0), rotulo: `${q + 1}º trimestre de ${y}`, curto: `T${q + 1}/${String(y).slice(2)}` }
  }
  return { de: ymd(y, 0, 1), ate: ymd(y, 11, 31), rotulo: String(y), curto: String(y) }
}

/** Anda n períodos a partir de ref. */
export function andar(escala, ref, n) {
  const p = periodo(escala, ref)
  if (escala === 'semana') return somarDias(p.de, 7 * n)
  const y = Number(p.de.slice(0, 4)), m = Number(p.de.slice(5, 7)) - 1
  if (escala === 'mes') return ymd(y, m + n, 1)
  if (escala === 'trimestre') return ymd(y, m + 3 * n, 1)
  return ymd(y + n, 0, 1)
}

/** Conversão = ganhas ÷ (ganhas + perdidas); null sem nenhuma fechada. */
export const conversao = (s) => (s.ganhas + s.perdidas ? s.ganhas / (s.ganhas + s.perdidas) : null)

/** Os últimos n períodos (do mais antigo ao atual) com a soma de cada um. */
export function serie(eventos, escala, ref, n = 8, v) {
  return Array.from({ length: n }, (_, i) => {
    const p = periodo(escala, andar(escala, ref, i - (n - 1)))
    return { ...p, ref: p.de, soma: somar(eventos, p.de, p.ate, v) }
  })
}

/**
 * Período anterior para comparar. Se o atual está em andamento, corta o anterior
 * no MESMO dia (18 dias de outubro x 18 primeiros dias de setembro).
 */
export function anteriorComparavel(escala, ref, hoje) {
  const p = periodo(escala, ref)
  const a = periodo(escala, andar(escala, ref, -1))
  if (hoje < p.de || hoje > p.ate) return { de: a.de, ate: a.ate, mesmoDia: false }
  const dias = Math.round((Date.parse(hoje) - Date.parse(p.de)) / 86400000)
  const ate = somarDias(a.de, dias)
  return { de: a.de, ate: ate < a.ate ? ate : a.ate, mesmoDia: true }
}
