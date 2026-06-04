import { supabase } from './sync'

// ============================================
// Queries do Supervisor (direto no Supabase)
// ============================================

export async function getVendedores() {
  const { data } = await supabase.from('vendedores').select('*').eq('ativo', true)
  return data || []
}

export async function getVisitas({ vendedorId, dateFrom, dateTo, tipo, retroativa, posVendas } = {}) {
  let query = supabase.from('vw_visitas_detalhadas').select('*')
  if (vendedorId) query = query.eq('vendedor_id', vendedorId)
  if (dateFrom) query = query.gte('data_visita', dateFrom)
  if (dateTo) query = query.lte('data_visita', dateTo)
  if (tipo) query = query.eq('tipo', tipo)
  if (retroativa !== undefined) query = query.eq('retroativa', retroativa)
  if (posVendas !== undefined) query = query.eq('acionar_pos_vendas', posVendas)
  query = query.order('data_visita', { ascending: false })
  const { data } = await query
  return data || []
}

export async function getNegocios({ vendedorId, status } = {}) {
  let query = supabase.from('vw_negocios_detalhados').select('*')
  if (vendedorId) query = query.eq('vendedor_id', vendedorId)
  if (status) query = query.eq('status', status)
  query = query.order('created_at', { ascending: false })
  const { data } = await query
  return data || []
}

export async function getClientes() {
  const { data } = await supabase.from('clientes_vendas').select('*')
  return data || []
}

export async function getPropriedades() {
  const { data } = await supabase.from('Clientes').select('*')
  return data || []
}

export async function getAuditLogs({ vendedorId, dateFrom, dateTo } = {}) {
  let query = supabase.from('audit_logs_vendas').select('*')
  if (vendedorId) query = query.eq('vendedor_id', vendedorId)
  if (dateFrom) query = query.gte('data_hora', dateFrom)
  if (dateTo) query = query.lte('data_hora', dateTo)
  query = query.order('data_hora', { ascending: false }).limit(200)
  const { data } = await query
  return data || []
}

export async function marcarPosVendasResolvido(visitaId, resolvido = true) {
  const { error } = await supabase
    .from('visitas')
    .update({ pos_vendas_resolvido: resolvido })
    .eq('id', visitaId)
  return !error
}

// ============================================
// Configurações globais (singleton id=1)
// ============================================

export const CONFIG_DEFAULT = { dias_lembrete_negocio: 7, dias_inativo_visita: 3 }
let configCache = null

export async function getConfig({ force = false } = {}) {
  if (!force && configCache) return configCache
  const { data, error } = await supabase
    .from('configuracoes')
    .select('*')
    .eq('id', 1)
    .maybeSingle()
  if (error || !data) {
    if (error) console.warn('[config]', error.message)
    return { ...CONFIG_DEFAULT }
  }
  configCache = data
  return data
}

export async function salvarConfig(fields, supervisorId) {
  const payload = {
    id: 1,
    ...fields,
    updated_at: new Date().toISOString(),
    updated_by: supervisorId,
  }
  const { error } = await supabase.from('configuracoes').upsert(payload, { onConflict: 'id' })
  if (error) throw error
  configCache = null
}

// Status de negócio "em andamento" (não fechado)
export const STATUS_EM_ANDAMENTO = ['prospect', 'proposta_enviada', 'em_negociacao']

// ============================================
// Helpers de agregação (client-side)
// ============================================

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)) // segunda-feira
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function getKPIs() {
  const hoje = startOfDay()
  const semana = startOfWeek()
  const mes = startOfMonth()

  const [visitas, negocios] = await Promise.all([
    getVisitas({}),
    getNegocios({}),
  ])

  const visitasHoje = visitas.filter((v) => v.data_visita >= hoje).length
  const visitasSemana = visitas.filter((v) => v.data_visita >= semana).length
  const visitasMes = visitas.filter((v) => v.data_visita >= mes).length
  const visitasRetroativas = visitas.filter((v) => v.retroativa).length
  const posVendasPendentes = visitas.filter((v) => v.acionar_pos_vendas && !v.pos_vendas_resolvido).length

  const pipeline = negocios
    .filter((n) => !['fechado_perdido'].includes(n.status))
    .reduce((acc, n) => acc + (n.valor || 0), 0)

  const pipelineList = negocios.filter((n) => !['fechado_perdido'].includes(n.status))

  const negociosFechadosMesList = negocios
    .filter((n) => n.status === 'fechado_ganho' && n.updated_at >= mes)

  return {
    visitasHoje,
    visitasSemana,
    visitasMes,
    visitasRetroativas,
    posVendasPendentes,
    pipeline,
    negociosFechadosMes: negociosFechadosMesList.length,
    totalVisitas: visitas.length,
    totalNegocios: negocios.length,
    // Listas que compõem cada valor (para popups e relatório detalhado)
    listas: {
      visitasHoje: visitas.filter((v) => v.data_visita >= hoje),
      visitasSemana: visitas.filter((v) => v.data_visita >= semana),
      visitasMes: visitas.filter((v) => v.data_visita >= mes),
      visitasRetroativas: visitas.filter((v) => v.retroativa),
      posVendasPendentes: visitas.filter((v) => v.acionar_pos_vendas && !v.pos_vendas_resolvido),
      pipeline: pipelineList,
      negociosFechadosMes: negociosFechadosMesList,
      totalVisitas: visitas,
      totalNegocios: negocios,
    },
  }
}

export async function getMetricasPorVendedor() {
  const semana = startOfWeek()

  const [vendedores, visitas, negocios, logins, config] = await Promise.all([
    getVendedores(),
    getVisitas({}),
    getNegocios({}),
    getAuditLogs({}),
    getConfig(),
  ])

  const limiteParado = Date.now() - config.dias_lembrete_negocio * 86400000

  return vendedores.map((v) => {
    const vendId = v.id
    const visitasVend = visitas
      .filter((vis) => vis.vendedor_id === vendId)
      .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))
    const visitasSemana = visitasVend.filter((vis) => vis.data_visita >= semana).length
    const negociosVend = negocios.filter((n) => n.vendedor_id === vendId)
    const pipeline = negociosVend
      .filter((n) => !['fechado_perdido'].includes(n.status))
      .reduce((acc, n) => acc + (n.valor || 0), 0)
    const ultimaVisita = visitasVend.length > 0 ? visitasVend[0].data_visita : null

    // Último GPS conhecido: visita mais recente com coordenadas
    const visitaComGps = visitasVend.find((vis) => vis.latitude && vis.longitude)
    const ultimoGps = visitaComGps
      ? { lat: visitaComGps.latitude, lng: visitaComGps.longitude, data: visitaComGps.data_visita }
      : null

    // Último acesso: log de login mais recente (logs já vêm ordenados desc)
    const ultimoLogin = logins.find((l) => l.acao === 'login' && l.vendedor_id === vendId)
    const ultimoAcesso = ultimoLogin ? ultimoLogin.data_hora : null

    const emAndamento = negociosVend.filter((n) => STATUS_EM_ANDAMENTO.includes(n.status))
    const pipelineList = negociosVend.filter((n) => !['fechado_perdido'].includes(n.status))
    const negociosParados = emAndamento.filter(
      (n) => new Date(n.updated_at || n.created_at).getTime() < limiteParado
    ).length

    return {
      id: vendId,
      nome: v.nome,
      visitasSemana,
      totalVisitas: visitasVend.length,
      pipeline,
      ultimaVisita,
      ultimoGps,
      ultimoAcesso,
      negociosAndamento: emAndamento.length,
      negociosParados,
      retroativas: visitasVend.filter((vis) => vis.retroativa).length,
      // Listas que compõem cada métrica (para popups e relatório detalhado)
      listas: {
        visitasSemana: visitasVend.filter((vis) => vis.data_visita >= semana),
        totalVisitas: visitasVend,
        pipeline: pipelineList,
        negociosAndamento: emAndamento,
      },
    }
  })
}
