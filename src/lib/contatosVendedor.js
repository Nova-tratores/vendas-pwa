// Contatos sugeridos ao vendedor (carteira / recuperar / novos) — a MESMA fonte da Minha rota:
// 1) iv_feed_pool do Portal (refeito a cada 6 h a partir das cidades do vendedor);
// 2) sem internet: a última cópia guardada no celular ('feed-pool');
// 3) vendedor sem contatos (ex.: usuário de teste): os contatos de EXEMPLO da Inteligência.
// Para explicar a nota, junta os motivos (regras com peso) da base de clientes quando há.
import { supabase } from './sync'

const lerJSON = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }

export async function carregarContatos() {
  const vendedor = lerJSON('vendedor') || {}
  let pool = null
  let exemplo = false
  try {
    if (vendedor.id && navigator.onLine) {
      const { data, error } = await supabase.from('iv_feed_pool').select('*').eq('vendedor_id', vendedor.id).maybeSingle()
      if (!error && data?.itens?.length) { pool = data; try { localStorage.setItem('feed-pool', JSON.stringify(data)) } catch { /* sem espaço */ } }
    }
  } catch { /* offline: cai na cópia */ }
  if (!pool) {
    const guardado = lerJSON('feed-pool')
    if (guardado?.itens?.length) pool = guardado
  }
  const fonte = await import('./iv/fonte')
  if (!pool) { pool = await fonte.carregarFeed(); exemplo = true }

  // motivos com peso por cliente (base da Inteligência de Vendas; hoje dados de exemplo)
  let motivos = new Map()
  let regras = fonte.REGRAS || {}
  try {
    const base = await fonte.carregarOportunidades()
    motivos = new Map((base.clientes || []).map((c) => [c.id, { score: c.score, oportunidades: c.oportunidades || [], cliente: c }]))
  } catch { /* sem a base: mostra só o porquê do feed */ }

  return { itens: pool.itens || [], geradoEm: pool.gerado_em || pool.geradoEm || null, exemplo, motivos, regras }
}

/** Como cada grupo é montado — o texto da explicação "Como escolhemos". */
export const COMO_ESCOLHEMOS = {
  carteira: {
    titulo: 'Carteira',
    frase: 'Clientes que já compram com a gente.',
    dados: [
      ['Cadastro e compras', 'Omie da Nova e da Castro, juntando o mesmo CPF/CNPJ: máquinas e peças compradas, valor e data.'],
      ['Oficina', 'Ordens de serviço: marcas que entram na oficina e o horímetro dos tratores.'],
      ['Tratores entregues', 'Controle de revisões: modelo, ano de entrega e revisões feitas.'],
      ['Visitas', 'CRM do app de vendas: última visita, área e culturas anotadas.'],
    ],
    regras: ['renovacao', 'cruzada', 'outra_marca', 'sumiu', 'sem_visita', 'perfil'],
  },
  recuperar: {
    titulo: 'Recuperar',
    frase: 'Negócios que pararam ou foram perdidos e ainda podem voltar.',
    dados: [
      ['Propostas', 'Propostas do Portal em aberto: há quantos dias estão na mesma fase e o valor.'],
      ['Negócios do CRM', 'Negócios do app sem atualização há muito tempo.'],
      ['Retornos combinados', 'Data de retorno marcada na visita que já venceu.'],
      ['Perdidas', 'Propostas perdidas entre 3 meses e 2 anos atrás, com o motivo e o concorrente.'],
    ],
    regras: ['proposta_parada', 'reabordar'],
    ordem: 'Primeiro o maior valor parado; depois o que está parado há mais tempo.',
  },
  novos: {
    titulo: 'Clientes novos',
    frase: 'Quem ainda não compra com a gente, mas tem tamanho e dinheiro para comprar.',
    dados: [
      ['Imóveis rurais (CAR)', 'Cadastro Ambiental Rural: área e localização de cada propriedade sem cliente nosso ligado.'],
      ['Uso do solo', 'MapBiomas: o que se planta lá (soja, cana, café, pasto…).'],
      ['Crédito rural', 'Banco Central (SICOR): quanto a propriedade pegou de crédito para investir nos últimos 3 anos.'],
      ['Empresas novas', 'Receita Federal: CNPJs rurais abertos na região (CNAE agro e prestadores de serviço).'],
    ],
    regras: ['prestador', 'perfil'],
    ordem: 'Primeiro as maiores áreas com mais crédito para investir e cultura que usa máquina.',
  },
}
