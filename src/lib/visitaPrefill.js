// Abrir a VISITA já preenchida com o que sabemos do cliente (rota, ficha 360).
// Com propriedade cadastrada → { propriedadeId } (a Visitas seleciona a propriedade).
// Sem cadastro → { novoCliente } (a Visitas abre o "cliente novo" preenchido; o vendedor
// confere e muda o que quiser antes de salvar).
import { CULTURAS } from './constants'

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Cultura da Inteligência de Vendas / IBGE → opção do formulário de visita (CULTURAS)
const PARA_APP = [
  [['soja', 'milho', 'trigo', 'feijao', 'sorgo', 'aveia', 'amendoim', 'algodao', 'graos'], 'Grãos'],
  [['cafe'], 'Café'],
  [['cana'], 'Cana'],
  [['laranja', 'citros', 'limao', 'tangerina', 'citricultura'], 'Citricultura'],
  [['pastagem', 'gado', 'bovino', 'leite', 'corte', 'pecuaria'], 'Corte/Leite'],
  [['banana', 'uva', 'manga', 'abacate', 'goiaba', 'fruta'], 'Fruticultura'],
  [['suino', 'porco'], 'Suínos'],
  [['frango', 'ave', 'granja'], 'Aves'],
  [['feno', 'capim'], 'Feno'],
  [['hortalica', 'mandioca', 'batata', 'tomate', 'cebola', 'olericultura'], 'Hortifruti'],
  [['estufa'], 'Estufa'],
]

export function culturaDoApp(nome) {
  const n = norm(nome)
  if (!n) return ''
  const exata = CULTURAS.find((c) => norm(c) === n)
  if (exata) return exata
  for (const [chaves, opcao] of PARA_APP) if (chaves.some((k) => n.includes(k))) return opcao
  return ''
}

/** Culturas (lista livre) → [principal, secundária] no formato do formulário, sem repetir. */
export function duasCulturas(lista = []) {
  const out = []
  for (const c of lista) {
    const v = culturaDoApp(c)
    if (v && !out.includes(v)) out.push(v)
    if (out.length === 2) break
  }
  return [out[0] || '', out[1] || '']
}

/**
 * State para navigate('/visitas', { state }) a partir do que se sabe do cliente.
 * @param c { propriedadeId?, contato?, nome?, propriedade?, cidade?, telefone?, culturas?[] }
 */
export function estadoVisita(c) {
  const temProp = c?.propriedadeId != null && c.propriedadeId !== ''
  const [principal, secundaria] = duasCulturas(c?.culturas || [])
  return {
    // a propriedade vai junto quando há; se ela não existir no celular, abre o cliente novo preenchido
    ...(temProp ? { propriedadeId: c.propriedadeId } : {}),
    novoCliente: {
      nome_cliente: c?.contato || c?.nome || '',
      nome_propriedade: c?.propriedade || c?.nome || '',
      cidade: c?.cidade || '',
      telefone: c?.telefone || '',
      cultura_principal: principal,
      cultura_secundaria: secundaria,
    },
  }
}
