// FONTE ÚNICA das abas da Inteligência de Vendas dentro do app (espelho de
// inteligencia-vendas/paginas.ts do Portal). Adicionar aba = editar só aqui + a rota no App.jsx.
export const TELAS_IV = [
  { slug: 'noticias', label: 'Notícias', icone: 'Newspaper', oculta: true },
  { slug: 'oportunidades', label: 'Oportunidades', icone: 'Target', oculta: true },
  { slug: 'prospeccao', label: 'Prospecção', icone: 'Map', oculta: true },
  { slug: 'retorno', label: 'Sem retorno', icone: 'Hourglass' },
  { slug: 'calculadora', label: 'Calculadora', icone: 'Calculator' },
  { slug: 'indicacoes', label: 'Indicações', icone: 'Handshake', oculta: true },
  { slug: 'concorrencia', label: 'Concorrência', icone: 'Swords' },
  { slug: 'municipios', label: 'Municípios', icone: 'Building2' },
  { slug: 'empresas', label: 'Empresas', icone: 'Briefcase', oculta: true },
  { slug: 'equipe', label: 'Equipe', icone: 'Users', oculta: true },
]

// abas escondidas por enquanto (José, 22/10/2026): a rota continua, só some da faixa e do menu
export const TELAS_IV_VISIVEIS = TELAS_IV.filter((t) => !t.oculta)
