// Notificações do vendedor = alertas automáticos (gerados a partir do que está
// no IndexedDB) + mensagens enviadas pelo supervisor (tabela mensagens_vendedor).

import { getAllRecords } from './db'
import { contatoVigentePorPropriedade } from './agenda'
import { isPerdido, isGanho, statusLabel } from './funil'
import { incompletasDoDia, horaDoAvisoDoDia, faltouNaUltima } from './completudeVisita'

const LAST_SEEN_KEY = 'notif_last_seen'
const DIAS_NEGOCIO_PARADO = 7

/** Alertas automáticos calculados localmente (offline-safe). */
export async function construirAlertas() {
  const [visitas, negocios, propriedades, pessoas] = await Promise.all([
    getAllRecords('visitas').then((vs) => vs.filter((v) => !v.deleted_at)),
    getAllRecords('negocios'),
    getAllRecords('propriedades'),
    getAllRecords('pessoas'),
  ])
  const hojeStr = new Date().toISOString().slice(0, 10)
  const propById = Object.fromEntries(propriedades.map((p) => [p.id, p]))
  const ctxNota = { propById, pessoasById: Object.fromEntries(pessoas.map((p) => [p.id, p])) }
  const alertas = []

  // 0) Fim do dia: visitas de hoje incompletas (nota de completude < 80).
  //    Um toque abre direto o que falta na mais antiga.
  if (horaDoAvisoDoDia()) {
    const inc = incompletasDoDia(visitas, ctxNota)
    if (inc.length) {
      alertas.push({
        tipo: 'completude',
        urgencia: 'alta',
        icon: 'ClipboardList',
        titulo: `${inc.length} visita${inc.length > 1 ? 's' : ''} de hoje ${inc.length > 1 ? 'estão incompletas' : 'está incompleta'}`,
        detalhe: `Completar agora leva 1 minuto · ${propById[inc[0].v.propriedade_id]?.nome || 'visita'}: falta ${inc[0].n.faltam.join(', ')}`,
        data: hojeStr,
        link: `/completar-visita/${inc[0].v.id}`,
      })
    }
  }

  // 1) Próximo contato planejado atrasado/hoje (último por propriedade)
  for (const v of contatoVigentePorPropriedade(visitas).values()) {
    if (v.data_proximo_contato <= hojeStr) {
      const atrasado = v.data_proximo_contato < hojeStr
      // no dia do retorno: o que ainda falta saber deste cliente (da última visita)
      const falta = faltouNaUltima(visitas.filter((x) => x.propriedade_id === v.propriedade_id), ctxNota)
      alertas.push({
        tipo: 'contato',
        urgencia: atrasado ? 'alta' : 'media',
        icon: 'Calendar',
        titulo: atrasado ? 'Contato atrasado' : 'Contato hoje',
        detalhe: `${propById[v.propriedade_id]?.nome || 'Propriedade'} — ${new Date(v.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}`
          + (v.resumo ? ` · última visita: ${String(v.resumo).slice(0, 80)}${String(v.resumo).length > 80 ? '…' : ''}` : '')
          + (falta ? ` · falta saber: ${falta.faltam.join(', ')}` : ''),
        data: v.data_proximo_contato,
        link: v.propriedade_id ? `/historico-visitas/${v.propriedade_id}` : undefined,
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
        icon: 'Wallet',
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
        icon: 'Wrench',
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
