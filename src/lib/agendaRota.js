// Rota da semana → Agenda coletiva do Portal (rota /api/vendas-app/agenda-rota).
// Cada visita da semana vira um compromisso do vendedor na agenda do Portal.
// Republicar manda a semana inteira: o Portal cria o novo, atualiza o que mudou
// e cancela o que saiu (só os compromissos que vieram da rota; os manuais ficam).
import { supabase } from './sync'

const PORTAL = (import.meta.env.VITE_PORTAL_ORIGIN || 'https://portal.novatratores.com').replace(/\/+$/, '')
const URL_API = `${PORTAL}/api/vendas-app/agenda-rota`

const ROTULO_TIPO = { carteira: 'Carteira', recuperar: 'Recuperar', novos: 'Cliente novo' }

async function chamar(metodo, query = '', corpo) {
  if (!navigator.onLine) throw new Error('Sem internet. A agenda precisa de conexão para ser enviada ao Portal.')
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre de novo no app.')
  let res
  try {
    res = await fetch(URL_API + query, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    // Rede caiu ou o Portal ainda não tem esta rota publicada (o navegador bloqueia a resposta sem CORS)
    throw new Error('Não foi possível falar com a Agenda do Portal agora. Tente de novo mais tarde.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha ao falar com o Portal (${res.status})`)
  return json
}

/** Texto do compromisso no Portal: por que visitar, o tipo e o link do mapa. */
function descricaoDoItem(it) {
  const partes = []
  if (it.tipo) partes.push(`Rota NT Vendas · ${ROTULO_TIPO[it.tipo] || it.tipo}`)
  else partes.push('Rota NT Vendas')
  if (it.obs) partes.push(String(it.obs))
  if (it.lat != null && it.lng != null) partes.push(`Como chegar: https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`)
  return partes.join('\n\n').slice(0, 4000)
}

/**
 * Publica a semana inteira na Agenda do Portal. Lança erro se falhar.
 * @param {{ semana: string, itens: Array<{ ref: string, dia: string, horaIni: string, horaFim: string,
 *   titulo: string, local?: string, cidade?: string, tipo?: string, obs?: string, lat?: number, lng?: number }> }} p
 * @returns {Promise<{ criados: number, atualizados: number, cancelados: number, iguais: number }>}
 */
export async function publicarRotaDaSemana({ semana, itens }) {
  const corpo = {
    semana,
    itens: (itens || []).map((it) => ({
      ref: String(it.ref),
      dia: it.dia,
      horaIni: it.horaIni,
      horaFim: it.horaFim,
      titulo: String(it.titulo || 'Visita').slice(0, 200),
      local: [it.local, it.cidade].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ').slice(0, 200) || null,
      descricao: descricaoDoItem(it),
    })),
  }
  return chamar('PUT', '', corpo)
}

/** Compromissos do vendedor na Agenda do Portal entre duas datas (YYYY-MM-DD, até 62 dias). */
export async function lerAgendaPortal(de, ate) {
  const r = await chamar('GET', `?de=${de}&ate=${ate}`)
  return r.eventos || []
}
