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

/** Dias (AAAA-MM-DD) de um período, no máximo `max` (o rastreador é consultado dia a dia). */
export function diasDoPeriodo(de, ate, max = 31) {
  if (!de || !ate || de > ate) return []
  const out = []
  const d = new Date(de + 'T12:00:00')
  const fim = new Date(ate + 'T12:00:00')
  while (d <= fim && out.length < max) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    d.setDate(d.getDate() + 1)
  }
  return out
}

/** Junta as rotas de vários dias num desenho só (resumo somado, dias separados na timeline). */
export function combinarRotas(rotas) {
  const lista = (rotas || []).filter(Boolean)
  if (!lista.length) return null
  const comTrajeto = lista.filter((r) => r.inicio)
  const soma = (k) => lista.reduce((s, r) => s + (Number(r.resumo?.[k]) || 0), 0)
  const primeiro = lista[0].data, ultimo = lista[lista.length - 1].data
  return {
    dias: lista,
    rotulo: primeiro === ultimo ? fmtDia(primeiro) : `${fmtDia(primeiro)} a ${fmtDia(ultimo)}`,
    unico: lista.length === 1,
    motorista_dia: lista.length === 1 ? lista[0].motorista_dia : null,
    resumo: {
      km: soma('km'), paradas: soma('paradas'), visitas: soma('visitas'), dirigindo_min: soma('dirigindo_min'),
      inicio: comTrajeto[0]?.resumo?.inicio || null,
      fim: comTrajeto[comTrajeto.length - 1]?.resumo?.fim || null,
    },
    segmentos: lista.flatMap((r) => r.segmentos || []),
    buracos: lista.flatMap((r) => r.buracos || []),
    paradas: lista.flatMap((r) => (r.paradas || []).map((p) => ({ ...p, data: r.data }))),
    // início do 1º dia com trajeto e fim do último
    inicio: comTrajeto[0]?.inicio || null,
    fim: comTrajeto[comTrajeto.length - 1]?.fim || null,
  }
}
