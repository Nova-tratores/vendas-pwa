// Contato repetido no mesmo cliente. No registro da visita o vendedor cadastrava
// de novo quem já estava na propriedade (Valter ×3, "Allan" ×2 em 5 minutos).
// Antes de criar: nome igual → usa o que já existe; mesmo primeiro nome → pergunta.
// Regras puras.
import { semAcento } from './propriedadesUnicas'

const limpo = (s) => semAcento(s).replace(/\s+/g, ' ').trim()

/**
 * @param nome     nome digitado
 * @param pessoas  contatos já cadastrados no cliente ([{ id, nome }])
 * @returns { tipo: 'igual' | 'parecido', pessoa } ou null
 */
export function contatoRepetido(nome, pessoas) {
  const n = limpo(nome)
  if (!n) return null
  const lista = (pessoas || []).filter((p) => p && limpo(p.nome))
  const igual = lista.find((p) => limpo(p.nome) === n)
  if (igual) return { tipo: 'igual', pessoa: igual }
  const primeiro = n.split(' ')[0]
  if (primeiro.length < 3) return null
  const parecido = lista.find((p) => limpo(p.nome).split(' ')[0] === primeiro)
  return parecido ? { tipo: 'parecido', pessoa: parecido } : null
}
