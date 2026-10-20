// Regras puras do mapa do supervisor (sem rede, testáveis).

export const STATUS = {
  andando: { label: 'Andando', cor: '#16a34a' },
  ligado_parado: { label: 'Parado com motor ligado', cor: '#d97706' },
  desligado: { label: 'Desligado', cor: '#64748b' },
  sem_sinal: { label: 'Sem sinal', cor: '#dc2626' },
}

/** Dia (AAAA-MM-DD) em horário de Brasília. */
export function hojeBR(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(d)
}

export const fmtHora = (iso) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '--:--'
    : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

export const fmtDuracao = (min) => {
  const m = Math.max(0, Math.round(Number(min) || 0))
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') + 'min' : ''}` : `${m}min`
}

export const fmtDia = (d) => {
  if (!d) return ''
  const [y, m, dia] = d.split('-')
  return `${dia}/${m}/${y.slice(2)}`
}

export const fmtKm = (km) => `${(Math.round((Number(km) || 0) * 10) / 10).toLocaleString('pt-BR')} km`

/** "agora" · "há 7 min" · "há 3 h" · "há 2 dias" */
export function haQuanto(dt, agora = Date.now()) {
  if (!dt) return 'sem posição'
  const min = (agora - new Date(dt).getTime()) / 60000
  if (!Number.isFinite(min)) return 'sem posição'
  if (min < 2) return 'agora'
  if (min < 60) return `há ${Math.floor(min)} min`
  if (min < 48 * 60) return `há ${Math.floor(min / 60)} h`
  return `há ${Math.floor(min / 1440)} dias`
}

/** Cor da parada pelo tempo parado (a mesma do mapa da Frota). */
export const corParada = (min) => (min > 60 ? '#DC2626' : min > 30 ? '#EA580C' : '#F59E0B')

/** Timeline do carro + as visitas que o vendedor registrou, em ordem de hora. */
export function juntarVisitas(timeline, visitas) {
  const evs = (timeline || []).map((e) => ({ ...e, quando: e.hora || e.de || '' }))
  for (const v of visitas || []) {
    evs.push({ tipo: 'visita', quando: v.data_visita, hora: v.data_visita, cliente: v.cliente_nome, tipoVisita: v.tipo, id: v.id })
  }
  // início fica no topo e fim embaixo mesmo com visita registrada antes/depois
  const peso = (e) => (e.tipo === 'inicio' ? 0 : e.tipo === 'fim' ? 2 : 1)
  return evs.sort((a, b) => peso(a) - peso(b) || String(a.quando).localeCompare(String(b.quando)))
}
