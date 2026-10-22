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

// Território gamificado (imóveis do CAR com o nível de conquista)
async function chamarTerritorio(query = '') {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  const res = await fetch(`${PORTAL}/api/crm-vendas/territorio${query}`, { headers: { Authorization: `Bearer ${t}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  return json
}
export const municipiosTerritorio = () => chamarTerritorio()
export const territorioDoMunicipio = (ibge, vendedorId) =>
  chamarTerritorio(`?municipio=${ibge}${vendedorId ? `&vendedor=${vendedorId}` : ''}`)

// Paradas longas do carro do vendedor (para ele explicar)
async function chamarParadas(init = {}, query = '') {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  const res = await fetch(`${PORTAL}/api/crm-vendas/paradas${query}`, {
    ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${t}` },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  return json
}
export const paradasDoDia = (data) => chamarParadas({}, `?data=${data}`)
export const explicarParada = (parada) => chamarParadas({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parada),
})

/** Impacto real: serviços do Pós-Vendas de clientes visitados, depois da visita. */
export async function impactoDoVendedor() {
  const { data } = await supabase.auth.getSession()
  const t = data?.session?.access_token
  if (!t) throw new Error('Sessão expirada. Entre de novo.')
  const res = await fetch(`${PORTAL}/api/crm-vendas/impacto`, { headers: { Authorization: `Bearer ${t}` } })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Falha (${res.status})`)
  return json
}

export * from './mapaVendedoresRegras'
