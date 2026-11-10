// Contato do cliente/trator de uma quest: telefones (Ligar / WhatsApp), endereço
// e local, buscados no portal (/api/crm-vendas/quests/contato — cadastro Omie,
// CRM, onde o trator foi visto). Guarda a última resposta no aparelho para abrir
// sem internet. Sem telefone/endereço, "Pedir ao suporte" avisa o Mariano no portal.
import { supabase } from './sync'
import { PORTAL } from './checklistVeiculo'
import { telefoneDaQuest } from './quests'

const CHAVE = 'nt-quest-contato'
const CHAVE_PEDIDOS = 'nt-quest-contato-pedidos'

function ler(chave) { try { return JSON.parse(localStorage.getItem(chave) || '{}') || {} } catch { return {} } }
function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)) } catch { /* sem espaço */ } }

async function token() {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  return t
}

/** Cópia guardada no aparelho (ou só o telefone escrito na descrição da quest). */
export function contatoGuardado(quest) {
  const c = ler(CHAVE)[quest.id]
  if (c) return c
  const tel = telefoneDaQuest(quest.descricao)
  if (!tel) return null
  return { telefones: [{ numero: tel, exibir: tel, celular: tel.length === 11, origem: 'quest' }], endereco: null, locais: [], falta: [], soDescricao: true }
}

export async function buscarContato(quest) {
  const res = await fetch(`${PORTAL}/api/crm-vendas/quests/contato?id=${quest.id}`, { headers: { Authorization: `Bearer ${await token()}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  const todos = ler(CHAVE)
  todos[quest.id] = { ...json, em: new Date().toISOString() }
  gravar(CHAVE, todos)
  return todos[quest.id]
}

export async function pedirAoSuporte(quest, falta, obs) {
  const res = await fetch(`${PORTAL}/api/crm-vendas/quests/contato`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: quest.id, falta, obs }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  const p = ler(CHAVE_PEDIDOS)
  p[quest.id] = new Date().toISOString()
  gravar(CHAVE_PEDIDOS, p)
  return json
}

export const pedidoFeitoEm = (quest) => ler(CHAVE_PEDIDOS)[quest.id] || null

export const ROTULO_FALTA = { telefone: 'Telefone', whatsapp: 'Celular / WhatsApp', endereco: 'Endereço / localização' }

/** Link do mapa: o ponto mais confiável, senão o endereço escrito. */
export function linkMapa(contato) {
  const l = contato?.locais?.[0]
  if (l) return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
  if (contato?.endereco) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contato.endereco)}`
  return null
}
