// Placa só com letras/números, maiúscula: "VOYAGE-SEB9J47" e "SEB-9J47" → comparáveis.
const limpa = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

/** Acha em SupaPlacas ([{ IdPlaca, NumPlaca }]) a linha da placa pedida (texto ou IdPlaca). */
export function acharPlaca(placas, pedida) {
  const alvo = limpa(pedida)
  if (!alvo) return null
  return placas.find((p) => String(p.IdPlaca) === String(pedida))
    || placas.find((p) => limpa(p.NumPlaca).endsWith(alvo))
    || null
}
