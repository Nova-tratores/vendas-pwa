// Regras puras do checklist mensal completo (sem rede, testáveis).

export const STATUS_MES = {
  nao_iniciado: { label: 'Não feito', cls: 'bg-red-100 text-red-700' },
  pendente: { label: 'Começado', cls: 'bg-amber-100 text-amber-700' },
  em_andamento: { label: 'Em andamento', cls: 'bg-amber-100 text-amber-700' },
  completo: { label: 'Feito', cls: 'bg-green-100 text-green-700' },
  suspeito: { label: 'Feito (em análise)', cls: 'bg-orange-100 text-orange-700' },
}

export const concluido = (status) => status === 'completo' || status === 'suspeito'

/** Itens salvos (lista do banco) → mapa por item_key. */
export function mapaSalvos(itens) {
  const m = {}
  for (const it of itens || []) m[it.item_key] = it
  return m
}

/** Índice do primeiro item ainda sem resposta (retoma de onde parou). */
export function primeiroPendente(items, salvos) {
  const i = items.findIndex((it) => !salvos[it.key])
  return i < 0 ? items.length : i
}

/** O item pode ser salvo? Foto (nova ou já salva) e resposta; Problema pede o que houve. */
export function erroDoItem({ temFoto, resposta, observacao }) {
  if (!temFoto) return 'Tire a foto do item.'
  if (resposta !== 'ok' && resposta !== 'problema') return 'Marque OK ou Problema.'
  if (resposta === 'problema' && !String(observacao || '').trim()) return 'Escreva qual é o problema.'
  return ''
}

/** Km informado no início: número inteiro positivo. */
export function kmValido(km) {
  const n = Number(String(km || '').replace(/\D/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Contagem para o resumo antes de concluir. */
export function resumoItens(items, salvos) {
  const respondidos = items.filter((it) => salvos[it.key])
  return {
    total: items.length,
    respondidos: respondidos.length,
    problemas: respondidos.filter((it) => salvos[it.key].resposta === 'problema').length,
  }
}
