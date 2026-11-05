// Busca por texto na lista de visitas do supervisor: cliente, propriedade,
// contato (pessoas), vendedor, local e o que foi escrito na visita.
// Sem diferença de acento e de maiúscula; com várias palavras, todas precisam
// aparecer (em qualquer campo): "marco paiva" acha "Marco Antônio Paiva".
import { semAcento } from './propriedadesUnicas'

export function textoDaVisita(v) {
  return [
    v.cliente_nome,
    v.propriedade_nome,
    ...(v.pessoas || []).map((p) => p?.nome),
    v.vendedor_nome,
    v.local_nome,
    v.cidade,
    v.resumo,
    v.proximos_passos,
  ].filter(Boolean).map(semAcento).join(' \u0001 ')
}

export function passaBusca(v, termo) {
  const palavras = semAcento(termo || '').split(/\s+/).filter(Boolean)
  if (!palavras.length) return true
  const texto = textoDaVisita(v)
  return palavras.every((p) => texto.includes(p))
}
