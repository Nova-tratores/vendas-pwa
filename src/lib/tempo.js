// Helpers de tempo relativo, compartilhados pelas telas.

/** Dias inteiros decorridos desde uma data ISO (ou null). null => Infinity. */
export function diasDesde(iso) {
  if (!iso) return Infinity
  const ms = Date.now() - new Date(iso).getTime()
  return Math.floor(ms / 86400000)
}

/**
 * Rótulo de "tempo atrás" + cor (Tailwind) conforme a idade.
 * Ex.: "hoje", "há 3d", "há 12d". Sem data => "nunca" (vermelho).
 */
export function tempoRelativo(iso, { verde = 1, amarelo = 7 } = {}) {
  if (!iso) return { label: 'nunca', dias: Infinity, color: 'text-red-600' }
  const dias = diasDesde(iso)
  const label = dias < 1 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias}d`
  let color = 'text-green-600'
  if (dias >= amarelo) color = 'text-red-600'
  else if (dias >= verde) color = 'text-amber-600'
  return { label, dias, color }
}
