// Onde a visita aconteceu × para quem foi o trabalho. O cliente da visita é
// propriedade_id; o local só é informado quando NÃO é a propriedade dele
// (banco, cartório, loja, demonstração). Regras puras, sem rede.

export const LOCAIS_FORA = [
  { key: 'banco', label: 'Banco', dica: 'Qual banco? Ex.: Sicredi Taguaí' },
  { key: 'cartorio', label: 'Cartório', dica: 'Qual cartório?' },
  { key: 'loja', label: 'Loja', dica: 'Qual loja? (opcional)' },
  { key: 'demonstracao', label: 'Demonstração', dica: 'Onde foi a demonstração?' },
  { key: 'outro', label: 'Outro', dica: 'Qual lugar?' },
]

const labelDe = (key) => LOCAIS_FORA.find((l) => l.key === key)?.label || ''

/** Parceiro = banco, cartório etc.: fica fora da carteira de clientes. */
export const ehParceiro = (p) => p?.tipo_cadastro === 'parceiro'
export const semParceiros = (props) => (props || []).filter((p) => !ehParceiro(p))
export const soParceiros = (props) => (props || []).filter(ehParceiro)

/** Atendimento fora da propriedade do cliente, ou contato com parceiro. */
export const foraDaPropriedade = (v) => !!v && ((!!v.local_tipo && v.local_tipo !== 'propriedade') || v.parceiro === true)

/** "Banco · Sicredi Taguaí" — vazio quando foi na propriedade. */
export function rotuloLocal(v) {
  if (!v?.local_tipo || v.local_tipo === 'propriedade') return ''
  return [labelDe(v.local_tipo), String(v.local_nome || '').trim()].filter(Boolean).join(' · ')
}

/** Só presencial tem local; loja não precisa de nome (quase sempre é a nossa). */
export function localValido(form) {
  if (form.tipo !== 'presencial' || form.onde !== 'outro') return true
  if (!form.local_tipo) return false
  return form.local_tipo === 'loja' || String(form.local_nome || '').trim().length > 0
}

/**
 * Campos que vão para a visita. Na propriedade não manda nada: assim o registro
 * comum continua igual e não depende das colunas novas.
 */
export function camposLocal(form) {
  if (form.tipo !== 'presencial' || form.onde !== 'outro' || !form.local_tipo) return {}
  return { local_tipo: form.local_tipo, local_nome: String(form.local_nome || '').trim() || null }
}

/** O 1º check-in só geolocaliza a propriedade quando a pessoa está nela. */
export const gravaCoordenadaNaPropriedade = (visita, prop) =>
  visita.tipo === 'presencial' && !foraDaPropriedade(visita) && !ehParceiro(prop)
