// Helpers de tempo relativo, compartilhados pelas telas.

/** Dias inteiros decorridos desde uma data ISO (ou null). null => Infinity. */
export function diasDesde(iso) {
  if (!iso) return Infinity
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86400000)
}

/**
 * Rótulo de "tempo atrás" + cor (Tailwind) conforme a idade.
 * Ex.: "hoje", "há 3d", "há 12d". Sem data => "nunca" (vermelho).
 */
export function tempoRelativo(iso, { verde = 1, amarelo = 7 } = {}) {
  if (!iso) return { label: 'nunca', dias: Infinity, color: 'text-red-600' }
  const dias = diasDesde(iso)
  const label = dias < 1 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias}d`
  let color = 'text-green-600'
  if (dias >= amarelo) color = 'text-red-600'
  else if (dias >= verde) color = 'text-amber-600'
  return { label, dias, color }
}

// Períodos nomeados usados nos filtros de data (dropdown do mapa de visitas etc.)
export const PERIODOS = [
  { key: 'tudo', label: 'Todas as datas' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana_passada', label: 'Semana passada' },
  { key: 'mes', label: 'Mês atual' },
  { key: 'mes_passado', label: 'Mês passado' },
]

/**
 * Intervalo [inicio, fim) como datas para um período nomeado, relativo a `agora`.
 * 'tudo' devolve [null, null] (sem limite). Semana começa na segunda-feira.
 */
export function periodoRange(periodo, agora = new Date()) {
  const inicioDia = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y }
  const hoje0 = inicioDia(agora)
  const diaSemana = (hoje0.getDay() + 6) % 7 // 0 = segunda, 6 = domingo
  const segunda = new Date(hoje0); segunda.setDate(hoje0.getDate() - diaSemana)
  const mesInicio = new Date(agora.getFullYear(), agora.getMonth(), 1)
  const DIA = 86400000
  switch (periodo) {
    case 'hoje':           return [hoje0, new Date(hoje0.getTime() + DIA)]
    case 'ontem':          return [new Date(hoje0.getTime() - DIA), hoje0]
    case 'semana':         return [segunda, new Date(segunda.getTime() + 7 * DIA)]
    case 'semana_passada': return [new Date(segunda.getTime() - 7 * DIA), segunda]
    case 'mes':            return [mesInicio, new Date(agora.getFullYear(), agora.getMonth() + 1, 1)]
    case 'mes_passado':    return [new Date(agora.getFullYear(), agora.getMonth() - 1, 1), mesInicio]
    default:               return [null, null] // 'tudo'
  }
}

/** True se a data ISO/Date cai dentro do período nomeado. */
export function dentroDoPeriodo(data, periodo, agora = new Date()) {
  const [ini, fim] = periodoRange(periodo, agora)
  if (!ini && !fim) return true
  const t = new Date(data).getTime()
  if (Number.isNaN(t)) return false
  return t >= ini.getTime() && t < fim.getTime()
}
