// Checklist mensal COMPLETO do carro do vendedor — o mesmo do app do técnico
// (20 itens, cada um com foto + OK/Problema + observação, km no início, nota de
// confiança). Quem grava é o portal (/api/frota/checklist-vendedor), nas mesmas
// tabelas do técnico; assim o carro aparece em Frota → Checklists com as fotos.
import { supabase } from './sync'

export const PORTAL = (import.meta.env.VITE_PORTAL_ORIGIN || 'https://portal.novatratores.com').replace(/\/+$/, '')
const URL_API = `${PORTAL}/api/frota/checklist-vendedor`

async function token() {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo no app.')
  return t
}

async function chamar(init = {}, query = '') {
  if (!navigator.onLine) throw new Error('Sem internet. O checklist precisa de conexão para enviar as fotos.')
  const res = await fetch(URL_API + query, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${await token()}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const e = new Error(json.error || `Falha (${res.status})`)
    e.dados = json // ex.: { refazer: true } quando a IA não aceita a foto do pneu
    throw e
  }
  return json
}

export const listarMeusCarros = () => chamar()
export const estadoDoCarro = (placa) => chamar({}, `?placa=${encodeURIComponent(placa)}`)

export const iniciarChecklist = (placa, km, loc) => chamar({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'iniciar', placa, km, loc }),
})

export function salvarItem({ checklistId, item, resposta, observacao, foto, forcar = false }) {
  const fd = new FormData()
  fd.append('action', 'salvar_item')
  fd.append('checklist_id', checklistId)
  fd.append('item_key', item.key)
  fd.append('categoria', item.cat)
  fd.append('titulo', item.titulo)
  fd.append('resposta', resposta)
  fd.append('observacao', observacao || '')
  if (foto) fd.append('foto', foto, `${item.key}.jpg`)
  if (forcar) fd.append('forcar', '1')
  return chamar({ method: 'POST', body: fd })
}

export const concluirChecklist = (checklistId, loc) => chamar({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'concluir', checklist_id: checklistId, loc }),
})

export * from './checklistVeiculoRegras'
