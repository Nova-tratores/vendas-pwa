// Dados de EXEMPLO da página de teste dos módulos (/teste-modulos). Nada aqui vai ao banco.
// No app de verdade: contatos = iv_feed_pool (portal), notícias = iv_noticias (portal),
// perfil = iv_perfil_vendedor.

export const VENDEDOR_EXEMPLO = { nome: 'Vendedor Exemplo', perfil: 'relacionamento', mix: { carteira: 0.6, recuperar: 0.25, novos: 0.15 } }

export const CONTATOS_EXEMPLO = [
  {
    id: 'c1', tipo: 'carteira', titulo: 'Sítio Boa Vista', cidade: 'Piraju', sub: 'Mahindra 6075 · 2017',
    porque: 'Trator com 8 anos e 6.200 horas: hora de renovar.', acao: 'Ofereça a troca por um 6075 4x4 com o Moderfrota.',
    selo: 'nota 82', telefone: '14999990001', km: 12,
    historico: ['Última visita: 14/06 (presencial) · "pediu preço de grade"', 'Revisão de 6.000 h feita em 03/2026'],
    maquinas: ['Mahindra 6075 (2017) · 6.200 h', 'Grade aradora 14 discos'],
  },
  {
    id: 'c2', tipo: 'recuperar', titulo: 'Fazenda Santa Rita', cidade: 'Piraju', sub: 'Proposta Yuvo 585 · R$ 290 mil',
    porque: 'Proposta parada há 54 dias em "aguardando resposta do cliente".', acao: 'Feche o negócio ou registre o motivo da perda.',
    selo: 'R$ 290 mil', telefone: '14999990002', km: 18,
    historico: ['Proposta enviada em 27/08', 'Ligação em 10/09: "vai ver com o banco"'],
    maquinas: ['Massey Ferguson 275 (2005)'],
  },
  {
    id: 'c3', tipo: 'novos', titulo: '420 ha de soja', cidade: 'Fartura', sub: 'Propriedade sem cliente nosso',
    porque: 'Propriedade grande no CAR sem nenhum cliente nosso ligado, que pegou R$ 1,2 mi de crédito para investir.', acao: 'Passe na propriedade ou pergunte aos vizinhos quem é o dono.',
    selo: '420 ha', km: 31, historico: [], maquinas: [],
  },
  {
    id: 'c4', tipo: 'carteira', titulo: 'Chácara São José', cidade: 'Tejupá', sub: 'Mahindra 4025 · 2021',
    porque: 'Comprou trator e nenhum implemento com a gente.', acao: 'Ofereça roçadeira ou carreta.',
    selo: 'nota 64', telefone: '14999990004', km: 44,
    historico: ['Última visita: 02/05 (telefonema)'], maquinas: ['Mahindra 4025 (2021) · 1.100 h'],
  },
]

export const NOTICIAS_EXEMPLO = [
  { id: 1, editoria: 'Crédito', titulo: 'Taxa do Moderfrota fica em 11,5% ao ano no Plano Safra', resumo: 'Linha de financiamento de tratores mantém prazo de 7 anos; bom argumento para quem está pensando em trocar.', fonte: 'BNDES', bom: true },
  { id: 2, editoria: 'Mercado', titulo: 'Preço da soja sobe 3% na semana com dólar mais alto', resumo: 'Produtor de soja da região está mais capitalizado: momento de visitar quem planta.', fonte: 'Canal Rural', bom: true },
  { id: 3, editoria: 'Clima', titulo: 'Previsão de chuva irregular no sudoeste paulista em novembro', resumo: 'Pode atrasar o plantio; quem tem implemento velho pode querer agilizar a operação.', fonte: 'Open-Meteo', bom: false },
]
