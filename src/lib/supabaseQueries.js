import { supabase } from './sync'
import { STATUS_EM_ANDAMENTO, isPerdido, isGanho } from './funil'

// Re-export pra quem já importava daqui (ex.: Dashboard).
export { STATUS_EM_ANDAMENTO } from './funil'

// ============================================
// Queries do Supervisor (direto no Supabase)
// ============================================

export async function getVendedores() {
  const { data } = await supabase.from('vendedores').select('*').eq('ativo', true)
  return data || []
}

export async function getVisitas({ vendedorId, dateFrom, dateTo, tipo, retroativa, posVendas, incluirDuplicadas = false } = {}) {
  let query = supabase.from('vw_visitas_detalhadas').select('*')
  if (vendedorId) query = query.eq('vendedor_id', vendedorId)
  if (dateFrom) query = query.gte('data_visita', dateFrom)
  if (dateTo) query = query.lte('data_visita', dateTo)
  if (tipo) query = query.eq('tipo', tipo)
  if (retroativa !== undefined) query = query.eq('retroativa', retroativa)
  if (posVendas !== undefined) query = query.eq('acionar_pos_vendas', posVendas)
  query = query.order('data_visita', { ascending: false })
  const { data } = await query
  // Esconde as visitas juntadas (marcadas como duplicada de outra). Filtro client-side
  // pra não quebrar caso a coluna ainda não exista (migração não rodada).
  if (incluirDuplicadas) return data || []
  return (data || []).filter((v) => !v.duplicada_de)
}

// Liga/desliga a sinalização de uma visita (com motivo opcional).
export async function setSinalizada(visitaId, sinalizada, motivo = null) {
  const { error } = await supabase
    .from('visitas')
    .update({ sinalizada, sinalizada_motivo: sinalizada ? motivo : null })
    .eq('id', visitaId)
  if (error) throw error
}

// Junta duas visitas repetidas: marca a duplicada apontando pra principal (reversível).
export async function juntarVisitas(duplicadaId, principalId) {
  const { error } = await supabase
    .from('visitas')
    .update({ duplicada_de: principalId })
    .eq('id', duplicadaId)
  if (error) throw error
}

export async function desfazerJuntar(visitaId) {
  const { error } = await supabase
    .from('visitas')
    .update({ duplicada_de: null })
    .eq('id', visitaId)
  if (error) throw error
}

// ============================================
// Comentários do supervisor (entidade: 'visita' | 'negocio')
// ============================================

export async function getComentarios(entidade, entidadeId) {
  const { data, error } = await supabase
    .from('comentarios_supervisor')
    .select('*')
    .eq('entidade', entidade)
    .eq('entidade_id', entidadeId)
    .order('created_at', { ascending: true })
  if (error) { console.warn('[comentarios]', error.message); return [] }
  return data || []
}

// Conta comentários de vários itens de uma vez (pra mostrar badge na lista).
export async function getComentariosCount(entidade, ids = []) {
  if (!ids.length) return {}
  const { data, error } = await supabase
    .from('comentarios_supervisor')
    .select('entidade_id')
    .eq('entidade', entidade)
    .in('entidade_id', ids)
  if (error) { console.warn('[comentarios count]', error.message); return {} }
  const mapa = {}
  for (const row of data || []) mapa[row.entidade_id] = (mapa[row.entidade_id] || 0) + 1
  return mapa
}

export async function addComentario({ entidade, entidade_id, texto, autor_id, autor_nome }) {
  const { data, error } = await supabase
    .from('comentarios_supervisor')
    .insert({ entidade, entidade_id, texto, autor_id, autor_nome })
    .select()
  if (error) throw error
  return data?.[0]
}

export async function deleteComentario(id) {
  const { error } = await supabase.from('comentarios_supervisor').delete().eq('id', id)
  if (error) throw error
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

export async function getPessoas() {
  const { data } = await supabase.from('pessoas').select('*')
  return data || []
}

// ============================================
// Atribuição de cidades a vendedores
// ============================================

// Cidades distintas da base de clientes (ERP) com contagem de propriedades.
export async function getCidadesContagem() {
  const { data, error } = await supabase.from('Clientes').select('cidade')
  if (error) { console.warn('[cidades]', error.message); return [] }
  const mapa = new Map()
  for (const r of data || []) {
    const c = (r.cidade || '').trim()
    if (!c) continue
    mapa.set(c, (mapa.get(c) || 0) + 1)
  }
  return [...mapa.entries()]
    .map(([cidade, total]) => ({ cidade, total }))
    .sort((a, b) => a.cidade.localeCompare(b.cidade))
}

export async function getVendedorCidades() {
  const { data, error } = await supabase.from('vendedor_cidades').select('*')
  if (error) { console.warn('[vendedor_cidades]', error.message); return [] }
  return data || []
}

export async function addVendedorCidade(vendedorId, cidade) {
  const { error } = await supabase.from('vendedor_cidades')
    .upsert({ vendedor_id: vendedorId, cidade }, { onConflict: 'vendedor_id,cidade' })
  if (error) throw error
}

export async function removeVendedorCidade(vendedorId, cidade) {
  const { error } = await supabase.from('vendedor_cidades')
    .delete().eq('vendedor_id', vendedorId).eq('cidade', cidade)
  if (error) throw error
}

// ============================================
// Mensagens do supervisor para vendedores (Notificações)
// ============================================

export async function enviarMensagem({ vendedorId, titulo, corpo, autorNome }) {
  const { error } = await supabase.from('mensagens_vendedor').insert({
    vendedor_id: vendedorId ?? null, // null = todos
    titulo: titulo || null,
    corpo,
    created_by: autorNome || 'Supervisor',
  })
  if (error) throw error
}

export async function getMensagensEnviadas() {
  const { data, error } = await supabase
    .from('mensagens_vendedor')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) { console.warn('[mensagens enviadas]', error.message); return [] }
  return data || []
}

export async function deletarMensagem(id) {
  const { error } = await supabase.from('mensagens_vendedor').delete().eq('id', id)
  if (error) throw error
}

export async function getMaquinas() {
  const { data } = await supabase.from('maquinas').select('*')
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

// Fila de Solicitação da Proposta: negócios que pediram proposta.
export async function getPropostas() {
  const { data, error } = await supabase
    .from('vw_negocios_detalhados')
    .select('*')
    .not('proposta_solicitada_em', 'is', null)
    .order('proposta_solicitada_em', { ascending: false })
  if (error) { console.warn('[propostas]', error.message); return [] }
  return data || []
}

export async function marcarPropostaResolvida(negocioId, resolvido = true) {
  const sup = JSON.parse(localStorage.getItem('supervisor') || '{}')
  const { error } = await supabase.from('negocios').update({
    proposta_resolvida: resolvido,
    proposta_resolvida_em: resolvido ? new Date().toISOString() : null,
    proposta_resolvida_por: resolvido ? (sup.nome || 'Supervisor') : null,
  }).eq('id', negocioId)
  return !error
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
    .filter((n) => !isPerdido(n.status))
    .reduce((acc, n) => acc + (n.valor || 0), 0)

  const pipelineList = negocios.filter((n) => !['fechado_perdido'].includes(n.status))

  const negociosFechadosMesList = negocios
    .filter((n) => isGanho(n.status) && n.updated_at >= mes)

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
      .filter((n) => !isPerdido(n.status))
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
