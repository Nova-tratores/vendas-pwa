import { saveRecord, registrarLog } from './db'

/**
 * Contato planejado VIGENTE de cada propriedade: o da visita mais recente
 * (data_visita) que definiu data_proximo_contato. Regra única pra Agenda,
 * Clientes, Dashboard e Notificações — antes algumas usavam a data mais
 * distante, e antecipar um contato não aparecia nelas.
 * @returns {Map<propriedade_id, visita>}
 */
export function contatoVigentePorPropriedade(visitas) {
  const out = new Map()
  for (const v of visitas) {
    if (v.deleted_at || !v.data_proximo_contato) continue
    const atual = out.get(v.propriedade_id)
    if (!atual || chave(v) > chave(atual)) out.set(v.propriedade_id, v)
  }
  return out
}

const chave = (v) => `${v.data_visita || ''}|${v.created_at || ''}`

/**
 * Troca só a data do próximo contato (liberado a qualquer tempo, mesmo com a
 * visita travada pra edição). '' / null remove o agendamento.
 */
export async function alterarDataProximoContato(visita, novaData) {
  const antiga = visita.data_proximo_contato || ''
  const nova = novaData || ''
  if (antiga === nova) return
  await saveRecord('visitas', { ...visita, data_proximo_contato: nova || null, status_sync: 'pending' })
  await registrarLog('alterar', 'visitas', visita.id, `data próximo contato: "${antiga}" → "${nova}"`)
}
