// Conserta a visita antes de subir para o banco. O banco recusa tipo vazio
// (visitas_tipo_check) e data vazia ("invalid input syntax for type date"), e a
// visita ficava presa no celular tentando de novo para sempre — várias se
// perderam assim. Regras puras, sem rede.

/** Sem tipo: com GPS foi presencial (check-in), sem GPS foi por mensagem. */
export function tipoPadrao(v) {
  return v.latitude != null && v.longitude != null ? 'presencial' : 'mensagem'
}

export function normalizarVisitaPush(v) {
  const out = { ...v }
  if (!out.tipo) out.tipo = tipoPadrao(out)
  if (out.data_proximo_contato === '') out.data_proximo_contato = null
  return out
}
