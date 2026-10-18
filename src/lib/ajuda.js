import { matchPath } from 'react-router-dom'

// Textos da ajuda dentro do app (botão "?" do header + tour de boas-vindas).
// Chave = padrão de rota do React Router. Rótulos entre aspas são os textos
// literais da tela — se renomear um botão, atualize aqui também.

export function ajudaDaRota(pathname, mapa) {
  const chave = Object.keys(mapa).find((p) => p !== '*' && matchPath({ path: p, end: true }, pathname))
  return mapa[chave || '*']
}

// Tour visto fica por pessoa + aparelho (o Sair limpa o IndexedDB, não isto).
const chaveTour = (papel, id) => `tour_visto_v1_${papel}_${id ?? 'anon'}`

export function tourJaVisto(papel, id) {
  try { return localStorage.getItem(chaveTour(papel, id)) === '1' } catch { return true }
}

export function marcarTourVisto(papel, id) {
  try { localStorage.setItem(chaveTour(papel, id), '1') } catch { /* ignora */ }
}

// ───────────────────────────── Vendedor ─────────────────────────────

export const TOUR_VENDEDOR = [
  {
    icone: '👋',
    titulo: 'Bem-vindo ao Vendas App',
    texto: 'Aqui você registra suas visitas, acompanha seus negócios e consulta o catálogo — tudo pelo celular. Vamos dar uma volta rápida.',
  },
  {
    icone: '📶',
    titulo: 'Funciona sem internet',
    texto: 'No campo, sem sinal, pode usar normal: tudo fica guardado no celular e é enviado sozinho quando o sinal voltar. O número laranja no botão ↻ mostra quantos registros ainda faltam enviar.',
  },
  {
    icone: '🏠',
    titulo: 'Início',
    texto: 'Seu resumo do dia: visitas da semana, contatos atrasados e negócios que precisam de atualização.',
    destaque: '/dashboard',
  },
  {
    icone: '👤',
    titulo: 'Clientes',
    texto: 'Todas as suas propriedades. Os ícones cinza (🌱 👥 🚜) mostram o que falta cadastrar — use "Incompletas primeiro" para completar.',
    destaque: '/clientes',
  },
  {
    icone: '📍',
    titulo: 'Visitas',
    texto: 'Toque em "+ Check-in" a cada contato com cliente: escolha o tipo, o cliente, com quem falou e escreva (ou dite no 🎤) o resumo. Sem GPS também dá para registrar.',
    destaque: '/visitas',
  },
  {
    icone: '💰',
    titulo: 'Negócios',
    texto: 'Seu funil de vendas. Negócios novos nascem dentro de uma visita ("+ Vincular Negócio"). Aqui você muda a etapa e marca a temperatura: Frio, Morno ou Quente.',
    destaque: '/negocios',
  },
  {
    icone: '📦',
    titulo: 'Catálogo',
    texto: 'Fotos, ficha técnica, estoque e preço das máquinas. O botão "💬 Enviar no WhatsApp" manda foto e folheto direto para o cliente.',
    destaque: '/catalogo',
  },
  {
    icone: '❓',
    titulo: 'Ficou com dúvida?',
    texto: 'Toque no "?" lá em cima, em qualquer tela, para ver como ela funciona. Para rever este tour, abra o menu ☰ → "Tour do app".',
  },
]

export const AJUDA_GERAL_VENDEDOR = [
  {
    pergunta: 'Estou sem internet. Perco o que registrei?',
    resposta: 'Não. Tudo fica salvo no celular (aparece a barra laranja "Modo offline"). Quando o sinal voltar, o app envia sozinho. A bolinha amarela num cartão = ainda não enviado; verde = enviado.',
  },
  {
    pergunta: 'O número laranja no ↻ não some',
    resposta: 'São registros esperando envio. Com internet, toque no ↻ para enviar na hora. Se aparecer a barra vermelha "Sessão expirada", toque em "Entrar" e faça login de novo — os dados continuam guardados.',
  },
  {
    pergunta: 'Posso tocar em "Sair"?',
    resposta: 'Cuidado: "Sair" apaga os dados guardados neste celular. Antes de sair, confira se o ↻ não tem número laranja (tudo enviado).',
  },
  {
    pergunta: 'O GPS não pega na fazenda',
    resposta: 'Pode registrar mesmo assim: o botão vira "Registrar sem GPS". A visita só não aparece no mapa. Se quiser, toque em "Tentar de novo" antes de salvar.',
  },
  {
    pergunta: 'A letra está pequena',
    resposta: 'Menu ☰ → "⚙️ Config" → toque no "A" grande para aumentar.',
  },
  {
    pergunta: 'Não acho um cliente',
    resposta: 'Você só vê os clientes das cidades atribuídas a você. Se faltar uma cidade, fale com o supervisor. A busca também acha pelo nome do contato da fazenda.',
  },
]

export const AJUDA_VENDEDOR = {
  '/dashboard': {
    titulo: 'Início',
    resumo: 'Resumo do seu dia: quantas visitas fez, quanto tem em negociação e o que precisa de atenção.',
    secoes: [
      {
        titulo: 'O que aparece aqui',
        tipo: 'dicas',
        itens: [
          'Hoje / Semana / Mês: quantas visitas você registrou.',
          'Cartão verde "Pipeline": soma dos seus negócios abertos. Toque para abrir Negócios.',
          '"Contatos atrasados" (vermelho): clientes que você planejou contatar e passou da data.',
          '"Negócios para atualizar" (amarelo): negócios sem mudança há alguns dias.',
          '"Propriedades para completar" (roxo): falta cultura, pessoa ou máquina. Toque para ir direto ao que falta.',
        ],
      },
      {
        titulo: 'Dica',
        tipo: 'dicas',
        itens: ['O botão "+ Nova Visita" leva direto para o check-in.'],
      },
    ],
  },
  '/': null, // preenchido abaixo (mesmo conteúdo do dashboard)

  '/agenda': {
    titulo: 'Agenda',
    resumo: 'Os contatos que você planejou (campo "Próximo contato planejado" da visita), com a distância até você.',
    secoes: [
      {
        titulo: 'Montar a rota do dia',
        tipo: 'passos',
        itens: [
          'Toque em "Próx. 7 dias" (ou "Atrasados").',
          'Veja a distância "📍 X km de você" em cada cartão.',
          'Toque em "🧭 Abrir rota no Maps" para ir até o cliente.',
        ],
      },
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          'Borda vermelha = atrasado; laranja = hoje.',
          'A aba "Mapa" mostra só propriedades que já têm GPS (gravado no primeiro check-in presencial).',
          'Para aparecer aqui, preencha "Próximo contato planejado" ao registrar a visita.',
        ],
      },
    ],
  },

  '/clientes': {
    titulo: 'Clientes',
    resumo: 'Todas as suas propriedades e donos. Daqui você completa o cadastro e registra visita.',
    secoes: [
      {
        titulo: 'Cadastrar um cliente',
        tipo: 'passos',
        itens: [
          'Toque em "+ Novo".',
          'Preencha o "Nome do cliente/dono" (o resto é opcional).',
          'Toque em "Salvar Cliente".',
        ],
      },
      {
        titulo: 'Os ícones do cartão',
        tipo: 'dicas',
        itens: [
          '🌱 Culturas · 👤 Pessoas · 🚜 Máquinas · 🕘 Histórico de visitas.',
          'Ícone preto = já cadastrado; cinza = falta. Toque para preencher.',
          '"+ Visita" abre o check-in com a propriedade já escolhida.',
          '"N para completar" coloca no topo quem tem mais coisa faltando.',
        ],
      },
      {
        titulo: 'Atenção',
        tipo: 'dicas',
        itens: [
          'O "×" exclui a propriedade junto com as pessoas e máquinas dela.',
          'Puxe a tela para baixo para recarregar a lista.',
        ],
      },
    ],
  },

  '/propriedades/:clienteId': {
    titulo: 'Propriedades do cliente',
    resumo: 'As fazendas de um cliente.',
    secoes: [
      {
        titulo: 'Nova propriedade',
        tipo: 'passos',
        itens: [
          'Toque em "+ Nova".',
          'Preencha o nome e a "Cultura principal" (obrigatórios).',
          'Toque em "Salvar Propriedade".',
        ],
      },
      {
        titulo: 'Dica',
        tipo: 'dicas',
        itens: ['A localização da fazenda é gravada sozinha no primeiro check-in presencial com GPS.'],
      },
    ],
  },

  '/pessoas/:propriedadeId': {
    titulo: 'Pessoas',
    resumo: 'Os contatos da fazenda: dono, familiares, gerente, funcionários.',
    secoes: [
      {
        titulo: 'Adicionar uma pessoa',
        tipo: 'passos',
        itens: [
          'Toque em "+ Nova".',
          'Preencha o nome, escolha o vínculo e, se tiver, o telefone.',
          'Toque em "Salvar Pessoa".',
        ],
      },
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          '"📍 Registrar visita nesta propriedade" abre o check-in já preenchido.',
          'Ainda não dá para editar uma pessoa: se errar, exclua (×) e cadastre de novo.',
        ],
      },
    ],
  },

  '/maquinas/:propriedadeId': {
    titulo: 'Máquinas do cliente',
    resumo: 'O parque de máquinas da fazenda — base para oferecer troca, peças e revisão.',
    secoes: [
      {
        titulo: 'Cadastrar uma máquina',
        tipo: 'passos',
        itens: [
          'Toque em "+ Nova".',
          'Escolha tipo e marca; o campo "Modelo" sugere modelos da marca.',
          'Preencha ano, horímetro e estado se souber (nada é obrigatório).',
          'Toque em "Salvar Máquina".',
        ],
      },
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          '"✎" edita a máquina; "×" exclui.',
          'Cor do estado: verde Ótimo, azul Bom, amarelo Regular, vermelho Crítico.',
          'Trocar a marca apaga o modelo digitado.',
        ],
      },
    ],
  },

  '/historico-visitas/:propriedadeId': {
    titulo: 'Histórico de visitas',
    resumo: 'Todas as visitas deste cliente, somando todas as fazendas do mesmo dono. Só leitura.',
    secoes: [
      {
        titulo: 'Dica',
        tipo: 'dicas',
        itens: ['Use o filtro de período ("Esta semana", "Mês passado"…) para achar uma visita específica.'],
      },
    ],
  },

  '/visitas': {
    titulo: 'Visitas',
    resumo: 'Registre aqui cada contato com cliente — presencial, mensagem, telefonema ou e-mail.',
    secoes: [
      {
        titulo: 'Registrar uma visita',
        tipo: 'passos',
        itens: [
          'Toque em "+ Check-in" e escolha o tipo.',
          'Busque o cliente (ou toque num "📍 Perto de você").',
          'Marque com quem conversou (ou "👤 Nova pessoa").',
          'Se aparecer "⚠ Este cliente tem negócio em andamento", toque em "Atualizar →" e marque a temperatura.',
          'Escreva o "Resumo da visita" — ou toque no 🎤 e fale.',
          'Se quiser, preencha "Próximo contato planejado" (vai para a Agenda).',
          'Toque em "Registrar Visita".',
        ],
      },
      {
        titulo: 'Cliente novo (primeiro contato)',
        tipo: 'passos',
        itens: [
          'No check-in, toque em "+ Novo".',
          'Confira as sugestões "Já cadastrado?" para não duplicar.',
          'Preencha nome, propriedade, cidade e cultura e toque em "Salvar e continuar check-in".',
        ],
      },
      {
        titulo: 'Bom saber',
        tipo: 'dicas',
        itens: [
          'Sem GPS? O botão vira "Registrar sem GPS" — pode salvar normal.',
          'Para abrir um negócio novo, use "+ Vincular Negócio" → "+ Criar Novo Negócio".',
          'Máquina com problema? Marque a máquina e toque em "🛠️ Acionar Pós Vendas".',
          'Data mais de 2h no passado vira visita "Retroativa" (o supervisor vê).',
          '"✎ editar" fica disponível por 48h; o "×" exclui e dá 6 segundos para "Desfazer".',
          '"🗺️ Mapa" mostra onde você fez as visitas com GPS.',
        ],
      },
    ],
  },

  '/visitas/mapa': {
    titulo: 'Mapa das visitas',
    resumo: 'Onde você fez as visitas que têm GPS. Toque num alfinete para ver o resumo.',
    secoes: [
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          'Cores: azul Presencial, verde Mensagem, laranja Telefonema, roxo E-mail.',
          'Visitas sem GPS não aparecem (o topo mostra quantas).',
          'O fundo do mapa precisa de internet.',
        ],
      },
    ],
  },

  '/negocios': {
    titulo: 'Negócios',
    resumo: 'Seu funil de vendas: em que etapa cada negócio está, quanto vale e quão quente está.',
    secoes: [
      {
        titulo: 'Mudar a etapa de um negócio',
        tipo: 'passos',
        itens: [
          'No cartão, escolha a nova etapa em "Mudar etapa…".',
          'Marque a temperatura (Frio / Morno / Quente) — é obrigatória.',
          'Preencha o que a etapa pedir e toque em "Salvar Alterações".',
        ],
      },
      {
        titulo: 'Etapas do funil',
        tipo: 'dicas',
        itens: [
          'Em aberto: Prospecção → Andamento → Solicitação da Proposta → Apresentação da Proposta → Contorno de Objeções.',
          'Fechamento: Positivo, Negativo ou Adiado.',
          'Depois da venda: Pré Entrega → Entrega → Pós Vendas.',
        ],
      },
      {
        titulo: 'Bom saber',
        tipo: 'dicas',
        itens: [
          'Negócio novo nasce numa visita ("+ Vincular Negócio").',
          'Em "Solicitação da Proposta", informe valor pretendido, pagamento, entrada, prazo e se tem máquina na troca — o supervisor recebe para cotar.',
          'Perdeu? Escolha "Fechamento Negativo" e o motivo. Isso ajuda a empresa a entender as perdas.',
          'Selo vermelho "Atrasado" = passou da previsão de fechamento.',
          'O termômetro 🌡️ do cartão salva com um toque.',
          'O "×" exclui de vez, sem desfazer.',
        ],
      },
    ],
  },

  '/catalogo': {
    titulo: 'Catálogo',
    resumo: 'As máquinas que vendemos (Portfólio) e o que tem na loja agora (Estoque Loja).',
    secoes: [
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          'Use a busca ou os filtros de marca e categoria; toque na máquina para ver a ficha.',
          '"⚖️ Comparar tratores" mostra a ficha técnica de 2 a 4 máquinas lado a lado.',
          '"▶ Modo Showroom / TV" põe a vitrine em tela cheia para mostrar ao cliente. Para sair, toque em "🔒 Sair" e digite o PIN (peça ao supervisor).',
          'Puxe a tela para baixo para atualizar o estoque.',
        ],
      },
    ],
  },

  '/catalogo/:id': {
    titulo: 'Ficha da máquina',
    resumo: 'Fotos, vídeos, ficha técnica, estoque, preço e argumentos de venda.',
    secoes: [
      {
        titulo: 'Enviar para o cliente no WhatsApp',
        tipo: 'passos',
        itens: [
          'Toque em "💬 Enviar no WhatsApp".',
          'Marque o que enviar: título, descrição, foto, valor, folheto.',
          'Digite o telefone com DDD (o app lembra o último).',
          'Toque em "Compartilhar" e escolha o contato.',
        ],
      },
      {
        titulo: 'Bom saber',
        tipo: 'dicas',
        itens: [
          'Leia "Por que vender" antes da visita — são os argumentos prontos.',
          'Se o celular não deixar anexar, a foto e o folheto vão como link.',
          '"Consulte disponibilidade" = confirme estoque e preço com o supervisor.',
        ],
      },
    ],
  },

  '/comparativo': {
    titulo: 'Comparar máquinas',
    resumo: 'Ficha técnica de 2 a 4 máquinas lado a lado.',
    secoes: [
      {
        titulo: 'Como usar',
        tipo: 'passos',
        itens: [
          'Escolha a categoria.',
          'Toque em 2 a 4 máquinas.',
          'Arraste a tabela para o lado para ver todas.',
        ],
      },
      {
        titulo: 'Dica',
        tipo: 'dicas',
        itens: ['Só aparecem máquinas que já têm ficha técnica detalhada. "—" = dado não informado.'],
      },
    ],
  },

  '/mapa': {
    titulo: 'Mapa de Clientes',
    resumo: 'Clientes com localização no mapa, rota até eles e gravação da localização do cliente onde você está. Precisa de internet.',
    secoes: [
      {
        titulo: 'Gravar a localização de um cliente',
        tipo: 'passos',
        itens: [
          'Estando na fazenda, toque no "+" azul.',
          'Busque o cliente e toque nele.',
          'Confirme — a posição atual vira a localização dele.',
        ],
      },
      {
        titulo: 'Ir até um cliente',
        tipo: 'passos',
        itens: [
          'Toque na 🔍 e busque o cliente.',
          'Toque em "🧭 Abrir navegação no Google Maps".',
        ],
      },
    ],
  },

  '/notificacoes': {
    titulo: 'Notificações',
    resumo: 'Recados do supervisor e avisos automáticos do que precisa de atenção.',
    secoes: [
      {
        titulo: 'Dicas',
        tipo: 'dicas',
        itens: [
          'Toque num aviso para ir direto ao que precisa ser feito (Agenda, Negócios ou Visitas).',
          'Os avisos somem quando você resolve a pendência.',
          'As mensagens do supervisor precisam de internet para aparecer.',
        ],
      },
    ],
  },

  '/chamado-veicular': {
    titulo: 'Chamado Veicular',
    resumo: 'Pedir manutenção do carro da empresa ou fazer o checklist de vistoria. Precisa de internet.',
    secoes: [
      {
        titulo: 'Fazer o checklist',
        tipo: 'passos',
        itens: [
          'Escolha a placa do veículo.',
          'Toque em "📋 Efetuar Checklist" e escolha Diário, Semanal ou Mensal.',
          'Marque cada item: OK, Não OK ou N/A (todos são obrigatórios).',
          'Toque em "Abrir chamado".',
        ],
      },
      {
        titulo: 'Manutenção',
        tipo: 'dicas',
        itens: [
          '"Corretiva" = algo quebrou. "Preventiva" = revisão ou troca programada. Descreva o que precisa.',
          'Sem internet o chamado não é enviado — espere ter sinal.',
          'Em "Meus chamados recentes" você acompanha: aberto, pendência ou resolvido.',
        ],
      },
    ],
  },

  '*': {
    titulo: 'Ajuda',
    resumo: 'Use o menu de baixo para navegar. Em cada tela, o "?" explica como ela funciona.',
    secoes: [],
  },
}
AJUDA_VENDEDOR['/'] = AJUDA_VENDEDOR['/dashboard']

// ──────────────────────────── Supervisor ────────────────────────────

const TOUR_SUP_COMUM = [
  {
    icone: '👋',
    titulo: 'Bem-vindo ao painel',
    texto: 'Aqui você acompanha a equipe de vendas em tempo real: visitas, negócios, alertas e o catálogo.',
  },
  {
    icone: '📊',
    titulo: 'Início',
    texto: 'Os números gerais da equipe. Clique em qualquer card para ver a lista que forma aquele número; "🖨️ Imprimir" gera o relatório.',
  },
  {
    icone: '🗂️',
    titulo: 'Menus no topo',
    texto: 'Equipe (vendedores, clientes, cidades), Catálogo, Vendas (visitas, calendário, propostas, pós-vendas) e Análise (histórico, evolução, alertas, log).',
  },
  {
    icone: '🚩',
    titulo: 'Acompanhar as visitas',
    texto: 'Em Vendas → Visitas você filtra por vendedor e data, comenta, sinaliza e junta visitas repetidas.',
  },
]

export const tourSupervisor = {
  gestor: [
    ...TOUR_SUP_COMUM,
    {
      icone: '❓',
      titulo: 'Ficou com dúvida?',
      texto: 'O botão "Ajuda" no topo explica a tela em que você está.',
    },
  ],
  admin: [
    ...TOUR_SUP_COMUM,
    {
      icone: '⚙️',
      titulo: 'Só para admin',
      texto: 'Gerir catálogo (máquinas, fotos, vídeos e folhetos), Produtos (preço/estoque manual), Configurações e Consumo de dados.',
    },
    {
      icone: '❓',
      titulo: 'Ficou com dúvida?',
      texto: 'O botão "Ajuda" no topo explica a tela em que você está.',
    },
  ],
}

export const AJUDA_GERAL_SUPERVISOR = [
  {
    pergunta: 'Um vendedor não vê um cliente',
    resposta: 'O vendedor só vê clientes das cidades atribuídas a ele (Equipe → Cidades). A mudança chega no celular dele na próxima sincronização.',
  },
  {
    pergunta: 'Os números parecem desatualizados',
    resposta: 'O painel mostra o que já foi sincronizado. Se o vendedor está sem sinal, as visitas dele aparecem quando o celular enviar.',
  },
  {
    pergunta: 'Gestor x admin',
    resposta: 'O gestor acompanha a equipe e vê o catálogo. Gerir catálogo, Produtos, Configurações e Consumo de dados são só do admin.',
  },
]

export const AJUDA_SUPERVISOR = {
  '/supervisor': {
    titulo: 'Início',
    resumo: 'Indicadores gerais da equipe.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Clique num card para ver a lista que forma aquele número.',
        '"🖨️ Imprimir": versão simples (só números) ou detalhada (com visitas, pipeline e pós-vendas).',
        '"Retroativas" = visitas lançadas mais de 2h depois do horário informado.',
      ],
    }],
  },
  '/supervisor/vendedores': {
    titulo: 'Vendedores',
    resumo: 'Um card por vendedor com métricas e atividade recente.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Clique nos números (Semana, Total, Pipeline, Negócios) para ver o detalhe.',
        'Clique no resto do card para abrir as Visitas já filtradas por ele.',
        'Selo vermelho "Nd sem visita" = inativo além do limite das Configurações.',
        '"Último GPS → ver no mapa" mostra onde o celular dele registrou por último.',
      ],
    }],
  },
  '/supervisor/clientes': {
    titulo: 'Clientes',
    resumo: 'Ficha de cada cliente: propriedades, culturas, pessoas, máquinas e visitas.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Busque por cliente, vendedor, propriedade ou cidade.',
        'Clique no cliente para expandir.',
        'Selos verdes = preenchido; cinza = falta cadastrar.',
      ],
    }],
  },
  '/supervisor/cidades': {
    titulo: 'Cidades',
    resumo: 'Define quais cidades (e portanto quais clientes) cada vendedor vê no app.',
    secoes: [{
      titulo: 'Como usar', tipo: 'passos', itens: [
        'Escolha o vendedor nos botões do topo.',
        'Marque ou desmarque as cidades — salva na hora.',
        'O vendedor recebe a mudança na próxima sincronização do celular.',
      ],
    }, {
      titulo: 'Dica', tipo: 'dicas', itens: [
        'Busque a cidade e use "Marcar todas (filtradas)" para várias de uma vez.',
        'Os avatares na linha mostram que outro vendedor também atende aquela cidade.',
      ],
    }],
  },
  '/supervisor/notificacoes': {
    titulo: 'Notificações',
    resumo: 'Mande um recado que aparece em Notificações no app do vendedor.',
    secoes: [{
      titulo: 'Como enviar', tipo: 'passos', itens: [
        'Em "Para", escolha todos ou um vendedor.',
        'Escreva a mensagem (título é opcional) e clique em "Enviar".',
        'O "×" na lista "Enviadas" apaga o recado também para o vendedor.',
      ],
    }],
  },
  '/supervisor/evolucao': {
    titulo: 'Evolução',
    resumo: 'Gráfico da evolução ao longo do tempo.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Agrupe por Vendedor ou Cidade; período por Semana, Mês ou Trimestre.',
        'Troque a métrica: Visitas, Negócios fechados ou Valor vendido.',
        'Mostra os 8 maiores; o resto entra em "Outros".',
      ],
    }],
  },
  '/supervisor/historico': {
    titulo: 'Histórico diário',
    resumo: 'Visitas, km e negócios criados por vendedor, dia a dia.',
    secoes: [{
      titulo: 'Bom saber', tipo: 'dicas', itens: [
        'Escolha 7, 15 ou 30 dias e filtre por vendedor.',
        'O km é ESTIMADO: linha reta entre as visitas com GPS do dia. Fica abaixo do real (não conta estrada nem a ida até a 1ª visita).',
        'Negócios contam pela data em que foram criados.',
      ],
    }],
  },
  '/supervisor/visitas': {
    titulo: 'Visitas',
    resumo: 'Todas as visitas da equipe, com filtros e ações de auditoria.',
    secoes: [{
      titulo: 'Juntar visitas repetidas', tipo: 'passos', itens: [
        'Clique em "⧉ Juntar repetidas".',
        'Selecione as 2 visitas e clique em "⧉ Juntar 2 visitas".',
        'Escolha qual manter — a outra fica oculta (dá para "Desfazer").',
      ],
    }, {
      titulo: 'Dicas', tipo: 'dicas', itens: [
        '"🚩 Sinalizar" marca uma visita suspeita (com motivo); clique de novo para desfazer.',
        '"💬 Comentar" deixa uma observação na visita.',
        '"📍 ver no mapa" abre a localização; "Sem GPS" = presencial sem coordenada.',
        'Selos: "1ª" primeira visita, "Retro" retroativa, "PV" pós-vendas.',
      ],
    }],
  },
  '/supervisor/semana': {
    titulo: 'Calendário',
    resumo: 'Tabela de visitas por vendedor e por dia (ou por semana).',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Alterne "Semana" / "Mês" e navegue com ← →.',
        'Clique num número para ver as visitas daquele dia.',
      ],
    }],
  },
  '/supervisor/propostas': {
    titulo: 'Propostas',
    resumo: 'Negócios em "Solicitação da Proposta" esperando cotação.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'O card traz máquina, valor pretendido, pagamento, entrada, prazo e troca.',
        'Depois de cotar, clique em "Marcar proposta gerada". "Reabrir" volta para pendente.',
      ],
    }],
  },
  '/supervisor/pos-vendas': {
    titulo: 'Pós Vendas',
    resumo: 'Visitas em que o vendedor acionou o pós-vendas para uma máquina do cliente.',
    secoes: [{
      titulo: 'Dica', tipo: 'dicas', itens: ['Clique em "Resolver" quando atender; "Reabrir" volta para pendente.'],
    }],
  },
  '/supervisor/compartilhamentos': {
    titulo: 'Compartilhamentos',
    resumo: 'Máquinas que os vendedores enviaram para clientes pelo WhatsApp.',
    secoes: [{
      titulo: 'Dica', tipo: 'dicas', itens: [
        'Veja os resumos "Por vendedor" e "Produtos mais enviados".',
        'Filtre por vendedor nos botões do topo.',
      ],
    }],
  },
  '/supervisor/alertas': {
    titulo: 'Alertas',
    resumo: 'Gerados automaticamente: visita sem GPS, retroativa, vendedor inativo e negócios parados.',
    secoes: [{
      titulo: 'Dica', tipo: 'dicas', itens: ['Os limites (dias sem visita, dias de negócio parado) ficam em Sistema → Configurações.'],
    }],
  },
  '/supervisor/log': {
    titulo: 'Log de atividades',
    resumo: 'O que cada pessoa fez no dia: criou, alterou, excluiu, entrou.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Navegue pelos dias com ← → ou escolha a data.',
        'Filtre por "Vendedores" ou "Admin".',
        'Ícones: ➕ criar · ✏️ alterar · 🗑️ excluir · 🔑 login.',
      ],
    }],
  },
  '/supervisor/catalogo': {
    titulo: 'Catálogo',
    resumo: 'O catálogo como o vendedor vê: portfólio, estoque da loja, comparativo e Showroom.',
    secoes: [{
      titulo: 'Dica', tipo: 'dicas', itens: ['Para sair do Showroom, clique em "🔒 Sair" e digite o PIN.'],
    }],
  },
  '/supervisor/catalogo/:id': {
    titulo: 'Ficha da máquina',
    resumo: 'A ficha como o vendedor vê. Para mudar fotos e textos, use Catálogo → Gerir catálogo.',
    secoes: [],
  },
  '/supervisor/comparativo': {
    titulo: 'Comparar máquinas',
    resumo: 'Ficha técnica de 2 a 4 máquinas lado a lado.',
    secoes: [],
  },
  '/supervisor/catalogo-admin': {
    titulo: 'Gerir catálogo',
    resumo: 'Cadastro de marcas e máquinas e controle do que os vendedores veem.',
    secoes: [{
      titulo: 'Cadastrar uma máquina', tipo: 'passos', itens: [
        'Na aba "Máquinas", clique em "+ Nova".',
        'Preencha os dados e salve.',
        'Depois do 1º salvar, anexe fotos, vídeos (+ YouTube) e folheto.',
      ],
    }, {
      titulo: 'Os ícones da linha', tipo: 'dicas', itens: [
        'Foto · Vídeo · Folheto · Descrição · Argumentos: preto = tem, cinza = falta. Clique para editar aquela parte.',
        'Vídeo DOURADO = o vídeo está no reel do Showroom/TV.',
        'Olho verde oculta/mostra a máquina para os vendedores.',
        'Limites: 25MB foto/PDF, 100MB vídeo.',
      ],
    }],
  },
  '/supervisor/mais-vendidas': {
    titulo: 'Mais vendidas',
    resumo: 'Ranking das vendas reais do Omie (sem peças), para ver o que falta no catálogo.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Linhas em âmbar = modelo vendido que não está no catálogo.',
        '"Mostrar só o que falta no catálogo" filtra só essas.',
        '"❌ Adicionar" abre o Gerir catálogo já preenchido (só admin).',
      ],
    }],
  },
  '/supervisor/produtos': {
    titulo: 'Produtos',
    resumo: 'Ajuste manual de preço, estoque e visibilidade dos produtos que vêm do Omie.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Busque pelo modelo, marca ou código e clique em "Editar".',
        'O valor manual (override) substitui o do Omie no app.',
        '"🔄 Forçar resync (todos)" faz todos os celulares baixarem os dados de novo — use quando algo não aparece para os vendedores.',
      ],
    }],
  },
  '/supervisor/config': {
    titulo: 'Configurações',
    resumo: 'Parâmetros que valem para toda a equipe.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        '"Lembrar de atualizar negócio…": após quantos dias o vendedor é avisado (padrão 7).',
        '"Alertar vendedor inativo…": após quantos dias sem visita gera alerta (padrão 3).',
        'Clique em "Salvar".',
      ],
    }],
  },
  '/supervisor/infra': {
    titulo: 'Consumo de dados',
    resumo: 'Tamanho do banco, dos arquivos e do worker de vídeos.',
    secoes: [{
      titulo: 'Dica', tipo: 'dicas', itens: ['Banda e cobrança ficam nos painéis do Supabase e do Railway.'],
    }],
  },
  '/supervisor/mapa': {
    titulo: 'Mapa',
    resumo: 'Visitas com GPS no mapa, com a cor de cada vendedor.',
    secoes: [{
      titulo: 'Dicas', tipo: 'dicas', itens: [
        'Filtre por vendedor, tipo e datas.',
        'No pino, "Ver só [nome]" isola um vendedor.',
        'Visitas sem GPS não aparecem (o topo mostra quantas).',
      ],
    }],
  },
  '*': {
    titulo: 'Ajuda',
    resumo: 'Use os menus do topo para navegar. O botão "Ajuda" explica a tela em que você está.',
    secoes: [],
  },
}
