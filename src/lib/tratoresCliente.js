// Tratores vendidos (tabela `tratores`, controle de revisões) de um cliente.
// A tabela só tem o nome do dono e a cidade em texto livre, então o casamento
// com a propriedade da visita é pelo nome (2+ palavras em comum) e pela cidade
// (município oficial — lib/cidadesCanon). Regras puras.
import { cidadeCanonica } from './cidadesCanon'

const PEQUENAS = new Set(['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'FAZ', 'FAZENDA', 'SITIO', 'CHACARA', 'ESTANCIA', 'LTDA', 'ME', 'EPP', 'SA', 'OUTROS', 'OUTRO', 'OUTRA'])

export const palavrasNome = (s) => String(s || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  .replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/)
  .filter((p) => p.length >= 2 && !PEQUENAS.has(p))

/**
 * Mesmo dono: 2+ palavras do nome em comum E o último sobrenome de um dos dois
 * aparece no outro ("Adriano Silva Nascimento" ≠ "Adriano Silva Leme"). Nome de
 * uma palavra só basta bater a palavra. É só uma sugestão: o vendedor confirma.
 */
export function mesmoDono(a, b) {
  const pa = palavrasNome(a), pbLista = palavrasNome(b), pb = new Set(pbLista)
  if (!pa.length || !pb.size) return false
  const comuns = pa.filter((p) => pb.has(p)).length
  if (comuns === 1 && (pa.length === 1 || pb.size === 1)) return true
  const ultimoBate = pb.has(pa[pa.length - 1]) || pa.includes(pbLista[pbLista.length - 1])
  return comuns >= 2 && ultimoBate
}

/** Cidade do trator: corta bairro/fazenda ("AGUDOS FAZ SAO DOMINGOS" -> AGUDOS). */
export function cidadeDoTrator(texto) {
  const c = String(texto || '').split('/')[0].replace(/\s+(faz|fazenda|sitio|bairro)\b.*/i, '').trim()
  return c
}

/**
 * Tratores do cliente da visita.
 * @param tratores [{ Chassis, Modelo, Cliente, Cidade, Entrega }]
 * @param cliente  { nomes: string[], cidade }
 */
export function tratoresDoCliente(tratores, { nomes = [], cidade = '' }) {
  const cidadeCli = cidade ? cidadeCanonica(cidade).chave : ''
  return (tratores || []).filter((t) => {
    if (!t.Chassis || !nomes.some((n) => mesmoDono(t.Cliente, n))) return false
    if (!cidadeCli || !t.Cidade) return true
    return cidadeCanonica(cidadeDoTrator(t.Cidade)).chave === cidadeCli
  })
}

/** Última confirmação de cada chassi (mais recente primeiro). */
export function ultimaPorChassi(confirmacoes) {
  const m = new Map()
  for (const c of [...(confirmacoes || [])].sort((a, b) => String(b.confirmado_em).localeCompare(String(a.confirmado_em)))) {
    if (!m.has(c.chassis)) m.set(c.chassis, c)
  }
  return m
}

export const XP_POR_CONFIRMACAO = 20
