// Auditoria: log de ações do SUPERVISOR (admin) + leitura unificada pro painel.
// As ações do VENDEDOR já caem em audit_logs_vendas via o sync (registrarLog do db.js).
// Aqui logamos o que o admin faz (subir vídeo/PDF/foto, criar ficha, etc.) e lemos tudo.

import { supabase } from './sync'

/**
 * Registra uma ação do supervisor. Best-effort: nunca lança (não pode atrapalhar a ação).
 */
export async function registrarLogSupervisor(acao, entidade, entidadeId, detalhes) {
  try {
    let sup = {}
    try { sup = JSON.parse(localStorage.getItem('supervisor') || '{}') } catch { /* ignora */ }
    await supabase.from('audit_logs_vendas').insert({
      acao,
      entidade,
      entidade_id: entidadeId != null ? Number(entidadeId) || null : null,
      detalhes: detalhes || '',
      ator_tipo: 'supervisor',
      ator_nome: sup?.nome || 'Supervisor',
      data_hora: new Date().toISOString(),
    })
  } catch (err) {
    console.warn('[log supervisor]', err)
  }
}

/**
 * Lê os logs de um dia (YYYY-MM-DD, hora local). Retorna ordenado do mais recente.
 * Normaliza o "ator" (nome + tipo) juntando vendedor e supervisor.
 */
export async function getAuditLogs({ dia }) {
  const inicio = new Date(`${dia}T00:00:00`)
  const fim = new Date(`${dia}T23:59:59.999`)
  const { data, error } = await supabase
    .from('audit_logs_vendas')
    .select('*')
    .gte('data_hora', inicio.toISOString())
    .lte('data_hora', fim.toISOString())
    .order('data_hora', { ascending: false })
  if (error) {
    console.error('[auditoria]', error.message)
    return []
  }
  return (data || []).map((l) => ({
    ...l,
    ator: l.ator_nome || l.vendedor_nome || 'Desconhecido',
    tipo_ator: l.ator_tipo || (l.vendedor_id != null ? 'vendedor' : 'sistema'),
  }))
}
