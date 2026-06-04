// Fonte única do funil de negócios (11 etapas). Status guardado em snake_case.

export const STATUS_NEGOCIO = [
  { key: 'prospeccao',            label: 'Prospecção',             color: 'bg-slate-100 text-slate-700' },
  { key: 'andamento',             label: 'Andamento',              color: 'bg-blue-100 text-blue-800' },
  { key: 'solicitacao_proposta',  label: 'Solicitação da Proposta', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'apresentacao_proposta', label: 'Apresentação da Proposta', color: 'bg-cyan-100 text-cyan-800' },
  { key: 'contorno_objecoes',     label: 'Contorno de Objeções',   color: 'bg-amber-100 text-amber-800' },
  { key: 'fechamento_positivo',   label: 'Fechamento Positivo',    color: 'bg-green-100 text-green-800' },
  { key: 'fechamento_negativo',   label: 'Fechamento Negativo',    color: 'bg-red-100 text-red-800' },
  { key: 'fechamento_adiado',     label: 'Fechamento Adiado',      color: 'bg-orange-100 text-orange-800' },
  { key: 'pre_entrega',           label: 'Pré Entrega',            color: 'bg-teal-100 text-teal-800' },
  { key: 'entrega',               label: 'Entrega',                color: 'bg-emerald-100 text-emerald-800' },
  { key: 'pos_vendas',            label: 'Pós Vendas',             color: 'bg-violet-100 text-violet-800' },
]

const _byKey = Object.fromEntries(STATUS_NEGOCIO.map((s) => [s.key, s]))

export function statusLabel(key) { return _byKey[key]?.label || key }
export function statusColor(key) { return _byKey[key]?.color || 'bg-slate-100 text-slate-700' }

// Etapas "em aberto" (pipeline ativo, antes da decisão de fechamento).
export const STATUS_ABERTOS = [
  'prospeccao', 'andamento', 'solicitacao_proposta', 'apresentacao_proposta', 'contorno_objecoes',
]
// Compat: usado onde antes existia STATUS_EM_ANDAMENTO.
export const STATUS_EM_ANDAMENTO = STATUS_ABERTOS

export const isAberto  = (s) => STATUS_ABERTOS.includes(s)
export const isPerdido = (s) => s === 'fechamento_negativo'
export const isGanho   = (s) => s === 'fechamento_positivo'
export const isAdiado  = (s) => s === 'fechamento_adiado'

// Status que dispara o formulário de Solicitação da Proposta.
export const STATUS_PROPOSTA = 'solicitacao_proposta'

// ============================================
// Motivo de perda estruturado (disparado em Fechamento Negativo)
// ============================================
export const MOTIVOS_PERDA = [
  { key: 'preco', label: 'Preço', campos: [
    { key: 'valor_desejado', label: 'Valor que o cliente queria', tipo: 'number' },
    { key: 'diferenca_preco', label: 'Diferença de preço', tipo: 'text' },
  ] },
  { key: 'concorrencia', label: 'Concorrência', campos: [
    { key: 'nome_concorrente', label: 'Nome do concorrente', tipo: 'text' },
    { key: 'condicoes_oferecidas', label: 'Condições oferecidas', tipo: 'text' },
    { key: 'valor_concorrente', label: 'Valor oferecido (R$)', tipo: 'number' },
  ] },
  { key: 'sem_orcamento', label: 'Sem orçamento', campos: [
    { key: 'previsao_verba', label: 'Previsão de quando terá verba', tipo: 'text' },
  ] },
  { key: 'sem_interesse', label: 'Sem interesse', campos: [
    { key: 'motivo_desinteresse', label: 'Motivo do desinteresse', tipo: 'text' },
  ] },
  { key: 'prazo', label: 'Prazo', campos: [
    { key: 'prazo_necessario', label: 'Prazo que precisava', tipo: 'text' },
    { key: 'prazo_oferecido', label: 'Prazo que oferecemos', tipo: 'text' },
  ] },
  { key: 'produto_inadequado', label: 'Produto inadequado', campos: [
    { key: 'produto_necessario', label: 'O que ele precisava', tipo: 'text' },
  ] },
  { key: 'sem_retorno', label: 'Sem retorno', campos: [
    { key: 'tentativas_contato', label: 'Quantas tentativas de contato', tipo: 'number' },
    { key: 'ultima_tentativa', label: 'Data da última tentativa', tipo: 'date' },
  ] },
  { key: 'outro', label: 'Outro', campos: [
    { key: 'descricao', label: 'Detalhe o motivo', tipo: 'text' },
  ] },
]

// Formas de pagamento (Solicitação da Proposta)
export const FORMAS_PAGAMENTO = [
  'À vista', 'Financiamento', 'Consórcio', 'BNDES / Pronaf', 'Cartão BNDES', 'Outro',
]
