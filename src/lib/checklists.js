// Modelos de checklist veicular (FIXOS no código — pra mudar itens/frequência,
// edite aqui e faça deploy). Usados na tela Chamado Veicular (tipo=checklist).
// A "frequência" é só um rótulo orientativo de quando realizar cada um.

export const CHECKLISTS = [
  {
    chave: 'diario',
    nome: 'Checklist Diário',
    frequencia: 'Diário',
    itens: [
      'Nível de óleo do motor',
      'Nível de água / radiador',
      'Calibragem e estado dos pneus',
      'Freios',
      'Luzes, setas e lanternas',
      'Limpador de para-brisa',
      'Nível de combustível',
      'Documentos do veículo (CRLV)',
      'Limpeza interna e externa',
    ],
  },
  {
    chave: 'semanal',
    nome: 'Checklist Semanal',
    frequencia: 'Semanal',
    itens: [
      'Estepe e ferramentas (macaco, chave de roda)',
      'Nível do fluido de freio',
      'Bateria (terminais e carga)',
      'Palhetas do limpador',
      'Nível da água do limpador',
      'Vazamentos visíveis (óleo / água)',
    ],
  },
  {
    chave: 'mensal',
    nome: 'Checklist Mensal',
    frequencia: 'Mensal',
    itens: [
      'Filtros (ar / combustível)',
      'Correias',
      'Suspensão e amortecedores',
      'Itens de segurança (triângulo, extintor)',
      'Ar-condicionado',
      'Próxima troca de óleo (km / data)',
    ],
  },
]

export function getChecklist(chave) {
  return CHECKLISTS.find((c) => c.chave === chave) || null
}
