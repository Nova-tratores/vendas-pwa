// Tratores vendidos + confirmações de localização (rede e cache no aparelho).
// Regras de casamento em ./tratoresCliente.
import { supabase } from './sync'
import { buscarTodas } from './paginar'
import { cidadeDoTrator, indexarClientesOmie } from './tratoresCidade'

// v2: tratores já com a cidade do cliente no Omie (CidadeOmie); a v1 não tinha
const CHAVE_TRATORES = 'nt-tratores-v2'
const CHAVE_CONFIRMACOES = 'nt-trator-confirmacoes'
const CHAVE_FILA = 'nt-trator-fila'
const DIA_MS = 24 * 3600000

const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? padrao } catch { return padrao } }
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* sem storage */ } }

/** Tratores vendidos (tabela `tratores`), guardados por 1 dia no aparelho. */
export async function carregarTratores() {
  const cache = ler(CHAVE_TRATORES, null)
  if (cache && Date.now() - cache.at < DIA_MS) return cache.dados
  if (!navigator.onLine) return cache?.dados || []
  const { data, error } = await supabase.from('tratores').select('Chassis, Modelo, Cliente, Cidade, Entrega').limit(5000)
  if (error) return cache?.dados || []
  // A cidade digitada no controle de revisões erra muito (Uguccione = PIRAJU, é de
  // Carlópolis): vale a do cliente no Omie quando ele é achado pelo nome. Só os
  // tratores vão para o cache, não os clientes. Falhou o Omie = a digitada.
  const omie = await buscarTodas(() => supabase.from('Clientes_Omie').select('nome, cidade').order('id')).catch(() => [])
  const clientes = indexarClientesOmie(omie)
  const dados = (data || []).map((t) => {
    const c = cidadeDoTrator(t, clientes)
    return c.origem === 'omie' ? { ...t, CidadeOmie: c.nome } : t
  })
  gravar(CHAVE_TRATORES, { at: Date.now(), dados })
  return dados
}

/** Confirmações já feitas (todas, de todos os vendedores) + as da fila deste aparelho. */
export async function carregarConfirmacoes() {
  const fila = ler(CHAVE_FILA, [])
  let base = ler(CHAVE_CONFIRMACOES, [])
  if (navigator.onLine) {
    const { data, error } = await supabase.from('trator_localizacao')
      .select('chassis, resposta, propriedade_id, cod_car, confirmado_em, vendedor_id').order('confirmado_em', { ascending: false }).limit(5000)
    if (!error) { base = data || []; gravar(CHAVE_CONFIRMACOES, base) }
  }
  return [...fila, ...base]
}

/** Sobe o que ficou na fila (sem internet na hora da confirmação). */
export async function enviarFilaTratores() {
  const fila = ler(CHAVE_FILA, [])
  if (!fila.length || !navigator.onLine) return 0
  const resto = []
  for (const linha of fila) {
    const { error } = await supabase.from('trator_localizacao').insert(linha)
    if (error) resto.push(linha)
  }
  gravar(CHAVE_FILA, resto)
  return fila.length - resto.length
}

/**
 * Registra a resposta do vendedor sobre um trator nesta propriedade.
 * resposta: 'aqui' | 'nao_esta' | 'nao_e_mais_dele'
 */
export async function confirmarTrator({ chassis, resposta, propriedadeId, gps }) {
  let vend = {}
  try { vend = JSON.parse(localStorage.getItem('vendedor') || '{}') } catch { /* sem vendedor */ }
  const linha = {
    chassis, resposta,
    propriedade_id: propriedadeId > 0 ? propriedadeId : null,
    lat: gps?.lat ?? null, lng: gps?.lng ?? null, gps_precisao_m: gps?.precisao ?? null,
    vendedor_id: vend.id ?? null, vendedor_nome: vend.nome || null,
    confirmado_em: new Date().toISOString(),
  }
  if (navigator.onLine) {
    const { error } = await supabase.from('trator_localizacao').insert(linha)
    if (!error) return { ok: true, linha }
    if (/trator_localizacao/.test(error.message)) throw new Error('Localização de tratores ainda não está ativa (falta a migration).')
  }
  gravar(CHAVE_FILA, [...ler(CHAVE_FILA, []), linha])
  return { ok: true, linha, naFila: true }
}

/** Quantas confirmações este vendedor já fez (cada uma vale XP). */
export function minhasConfirmacoes(confirmacoes) {
  let vend = {}
  try { vend = JSON.parse(localStorage.getItem('vendedor') || '{}') } catch { /* sem vendedor */ }
  return (confirmacoes || []).filter((c) => vend.id != null && Number(c.vendedor_id) === Number(vend.id)).length
}
