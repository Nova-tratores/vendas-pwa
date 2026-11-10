// Contato do cliente de uma QUEST ou de um NEGÓCIO: telefones (Ligar / WhatsApp),
// endereço e local, buscados no portal (/api/crm-vendas/quests/contato — cadastro
// Omie, CRM, pessoas da propriedade, onde o trator foi visto). Guarda a última
// resposta no aparelho para abrir sem internet. Sem telefone/endereço, "Pedir ao
// suporte" avisa o Mariano no portal.
// alvo = { tipo: 'quest' | 'negocio', id, quest?, local? } — `local` = contato
// montado com o que já está no celular (negócio ainda não sincronizado, offline).
import { supabase } from './sync'
import { PORTAL } from './checklistVeiculo'
import { telefoneDaQuest } from './quests'

const CHAVE = 'nt-quest-contato'
const CHAVE_PEDIDOS = 'nt-quest-contato-pedidos'
const URL_API = `${PORTAL}/api/crm-vendas/quests/contato`

function ler(chave) { try { return JSON.parse(localStorage.getItem(chave) || '{}') || {} } catch { return {} } }
function gravar(chave, v) { try { localStorage.setItem(chave, JSON.stringify(v)) } catch { /* sem espaço */ } }
// quest guarda pelo id puro (compatível com a 1ª versão); negócio com prefixo
const chaveAlvo = (alvo) => (alvo.tipo === 'negocio' ? `n:${alvo.id}` : String(alvo.id))
const param = (alvo) => (alvo.tipo === 'negocio' ? { negocio: alvo.id } : { id: alvo.id })

async function token() {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  return t
}

// ─── telefones (mesmas regras do portal: lib/vendas-app/quest-contato.ts) ──────
function formatar(d) {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}
export function telefonesDoTexto(texto, origem, nome) {
  const out = []
  for (const p of String(texto || '').split(/[/;,|\n]|\s+e\s+|\s+ou\s+/i)) {
    let d = p.replace(/\D/g, '')
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
    if (d.startsWith('0') && (d.length === 11 || d.length === 12)) d = d.slice(1)
    if (d.length !== 10 && d.length !== 11) continue
    if (Number(d.slice(0, 2)) < 11) continue
    if (d.length === 10 && /[6-9]/.test(d[2])) d = `${d.slice(0, 2)}9${d.slice(2)}`
    out.push({ numero: d, exibir: formatar(d), celular: d.length === 11 && d[2] === '9', origem, ...(nome && String(nome).trim() ? { nome: String(nome).trim() } : {}) })
  }
  return out
}
export function juntarTelefones(...listas) {
  const vistos = new Set()
  const todos = []
  for (const l of listas) for (const t of l) { if (!vistos.has(t.numero)) { vistos.add(t.numero); todos.push(t) } }
  return [...todos.filter((t) => t.celular), ...todos.filter((t) => !t.celular)]
}
export function faltaContato({ telefones, temLocal, endereco }) {
  const f = []
  if (!telefones.length) f.push('telefone')
  else if (!telefones.some((t) => t.celular)) f.push('whatsapp')
  if (!temLocal && !String(endereco || '').trim()) f.push('endereco')
  return f
}

/** Contato montado só com o que está no celular (propriedade, cliente e pessoas do negócio). */
export function contatoLocal({ propriedade, cliente, pessoas = [] }) {
  const telefones = juntarTelefones(
    telefonesDoTexto(propriedade?.telefone, 'crm'),
    telefonesDoTexto(cliente?.telefone, 'crm', cliente?.nome),
    ...pessoas.map((p) => telefonesDoTexto(p.telefone, 'contato', [p.nome, p.cargo].filter(Boolean).join(' · '))),
  )
  const lat = Number(propriedade?.latitude), lng = Number(propriedade?.longitude)
  const locais = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && propriedade?.latitude != null
    ? [{ nome: 'Ponto da propriedade (check-in)', lat, lng, origem: 'crm' }] : []
  const endereco = [propriedade?.endereco, propriedade?.cidade].map((s) => String(s || '').trim()).filter(Boolean).join(', ') || null
  const nome = String(cliente?.nome || propriedade?.nome || '').trim()
  return { cliente: nome ? { nome } : null, telefones, endereco, locais, falta: faltaContato({ telefones, temLocal: locais.length > 0, endereco }), soLocal: true }
}

/** Cópia guardada no aparelho; senão o contato local (negócio) ou o telefone da descrição (quest). */
export function contatoGuardado(alvo) {
  const c = ler(CHAVE)[chaveAlvo(alvo)]
  if (c) return c
  if (alvo.local) return alvo.local
  const tel = alvo.quest ? telefoneDaQuest(alvo.quest.descricao) : null
  if (!tel) return null
  return { telefones: telefonesDoTexto(tel, 'quest'), endereco: null, locais: [], falta: [], soDescricao: true }
}

export async function buscarContato(alvo) {
  const q = new URLSearchParams(param(alvo)).toString()
  const res = await fetch(`${URL_API}?${q}`, { headers: { Authorization: `Bearer ${await token()}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error || `Falha (${res.status})`), { status: res.status })
  // o servidor não vê o que ainda não sincronizou: junta os telefones do celular
  if (alvo.local) {
    json.telefones = juntarTelefones(json.telefones || [], alvo.local.telefones)
    if (!json.locais?.length && alvo.local.locais.length) json.locais = alvo.local.locais
    json.endereco = json.endereco || alvo.local.endereco
    json.falta = faltaContato({ telefones: json.telefones, temLocal: json.locais.length > 0, endereco: json.endereco })
  }
  const todos = ler(CHAVE)
  todos[chaveAlvo(alvo)] = { ...json, em: new Date().toISOString() }
  gravar(CHAVE, todos)
  return todos[chaveAlvo(alvo)]
}

export async function pedirAoSuporte(alvo, falta, obs) {
  const res = await fetch(URL_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...param(alvo), falta, obs }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(res.status === 404 && alvo.tipo === 'negocio' ? 'Este negócio ainda não subiu para o servidor: sincronize e tente de novo.' : (json.error || `Falha (${res.status})`))
  const p = ler(CHAVE_PEDIDOS)
  p[chaveAlvo(alvo)] = new Date().toISOString()
  gravar(CHAVE_PEDIDOS, p)
  return json
}

export const pedidoFeitoEm = (alvo) => ler(CHAVE_PEDIDOS)[chaveAlvo(alvo)] || null

export const ROTULO_FALTA = { telefone: 'Telefone', whatsapp: 'Celular / WhatsApp', endereco: 'Endereço / localização' }

/** Link do mapa: o ponto mais confiável, senão o endereço escrito. */
export function linkMapa(contato) {
  const l = contato?.locais?.[0]
  if (l) return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`
  if (contato?.endereco) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contato.endereco)}`
  return null
}
