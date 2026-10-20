// Mapa do supervisor: onde está o carro de cada vendedor e o trajeto do dia.
// O rastreador fica no portal (/api/crm-vendas/mapa); aqui só lemos.
import { supabase } from './sync'
import { PORTAL } from './checklistVeiculo'

const URL_API = `${PORTAL}/api/crm-vendas/mapa`

async function chamar(query = '') {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  const res = await fetch(URL_API + query, { headers: { Authorization: `Bearer ${t}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  return json
}

export const carrosDosVendedores = () => chamar()
export const rotaDoDia = (placa, data) => chamar(`?placa=${encodeURIComponent(placa)}&data=${data}`)

export * from './mapaVendedoresRegras'
