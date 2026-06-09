// Notificações do vendedor = alertas automáticos (gerados a partir do que está
// no IndexedDB) + mensagens enviadas pelo supervisor (tabela mensagens_vendedor).

import { getAllRecords } from './db'
import { isPerdido, isGanho, statusLabel } from './funil'

const LAST_SEEN_KEY = 'notif_last_seen'
const DIAS_NEGOCIO_PARADO = 7

/** Alertas automáticos calculados localmente (offline-safe). */
export async function construirAlertas() {
  const [visitas, negocios, propriedades] = await Promise.all([
    getAllRecords('visitas'),
    getAllRecords('negocios'),
    getAllRecords('propriedades'),
  ])
  const hojeStr = new Date().toISOString().slice(0, 10)
  const propById = Object.fromEntries(propriedades.map((p) => [p.id, p]))
  const alertas = []

  // 1) Próximo contato planejado atrasado/hoje (último por propriedade)
  const ultimoContato = {}
  for (const v of visitas) {
    if (!v.data_proximo_contato) continue
    const cur = ultimoContato[v.propriedade_id]
    if (!cur || v.data_proximo_contato > cur.data_proximo_contato) ultimoContato[v.propriedade_id] = v
  }
  for (const v of Object.values(ultimoContato)) {
    if (v.data_proximo_contato <= hojeStr) {
      const atrasado = v.data_proximo_contato < hojeStr
      alertas.push({
        tipo: 'contato',
        urgencia: atrasado ? 'alta' : 'media',
        icon: '📅',
        titulo: atrasado ? 'Contato atrasado' : 'Contato hoje',
        detalhe: `${propById[v.propriedade_id]?.nome || 'Propriedade'} — ${new Date(v.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}`,
        data: v.data_proximo_contato,
      })
    }
  }

  // 2) Negócio em andamento parado há muitos dias
  const limite = Date.now() - DIAS_NEGOCIO_PARADO * 86400000
  for (const n of negocios) {
    if (isPerdido(n.status) || isGanho(n.status)) continue
    const t = new Date(n.updated_at || n.created_at || 0).getTime()
    if (t && t < limite) {
      alertas.push({
        tipo: 'negocio',
        urgencia: 'media',
        icon: '💰',
        titulo: 'Negócio parado',
        detalhe: `${statusLabel(n.status)}${n.valor ? ` · R$ ${Number(n.valor).toLocaleString('pt-BR')}` : ''}`,
        data: (n.updated_at || n.created_at || '').slice(0, 10),
      })
    }
  }

  // 3) Pós-vendas pendente
  for (const v of visitas) {
    if (v.acionar_pos_vendas && !v.pos_vendas_resolvido) {
      alertas.push({
        tipo: 'posvendas',
        urgencia: 'media',
        icon: '🛠️',
        titulo: 'Pós-vendas pendente',
        detalhe: propById[v.propriedade_id]?.nome || 'Visita com máquina',
        data: (v.data_visita || '').slice(0, 10),
      })
    }
  }

  const ordU = { alta: 0, media: 1, baixa: 2 }
  alertas.sort((a, b) => (ordU[a.urgencia] - ordU[b.urgencia]) || (b.data || '').localeCompare(a.data || ''))
  return alertas
}

/** Mensagens do supervisor para este vendedor (ou para todos). */
export async function getMensagens(vendedorId) {
  try {
    const { supabase } = await import('./sync')
    let q = supabase.from('mensagens_vendedor').select('*').order('created_at', { ascending: false }).limit(50)
    q = vendedorId != null
      ? q.or(`vendedor_id.is.null,vendedor_id.eq.${vendedorId}`)
      : q.is('vendedor_id', null)
    const { data, error } = await q
    if (error) { console.warn('[notificacoes] mensagens:', error.message); return [] }
    return data || []
  } catch { return [] }
}

export function marcarLido() {
  try { localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString()) } catch { /* ignore */ }
}

function lastSeen() {
  return localStorage.getItem(LAST_SEEN_KEY) || ''
}

export function contarMensagensNaoLidas(mensagens) {
  const ls = lastSeen()
  return mensagens.filter((m) => (m.created_at || '') > ls).length
}

/** Contagem pro badge do menu: alertas + mensagens não lidas. */
export async function contarNotificacoes(vendedorId) {
  const [alertas, mensagens] = await Promise.all([
    construirAlertas().catch(() => []),
    getMensagens(vendedorId),
  ])
  const naoLidas = contarMensagensNaoLidas(mensagens)
  return { alertas: alertas.length, naoLidas, total: alertas.length + naoLidas }
}
