// Rota do dia → links do Google Maps. O Google aceita no máximo 9 paradas por rota
// (fora a saída e a chegada); com mais visitas, a rota vira partes encadeadas:
// cada parte começa na última parada da anterior e a última volta à saída.

export const MAX_PARADAS_GOOGLE = 9

const ponto = (p) => `${Number(p[0]).toFixed(6)},${Number(p[1]).toFixed(6)}`

function link(origem, destino, paradas) {
  const u = new URL('https://www.google.com/maps/dir/')
  u.searchParams.set('api', '1')
  u.searchParams.set('origin', ponto(origem))
  u.searchParams.set('destination', ponto(destino))
  if (paradas.length) u.searchParams.set('waypoints', paradas.map(ponto).join('|'))
  u.searchParams.set('travelmode', 'driving')
  return u.toString()
}

/**
 * @param origem [lat, lng] da saída (e da volta)
 * @param ordem paradas na ordem da rota, cada uma com lat/lng (e horaIni/horaFim opcionais)
 * @returns [{ link, de, ate, paradas, horaIni, horaFim }] — de/ate são números das paradas (1 = primeira)
 */
export function partesGoogle(origem, ordem) {
  const comPos = (ordem || []).filter((i) => i.lat != null && i.lng != null)
  if (!comPos.length) return []
  const partes = []
  let inicio = origem
  for (let a = 0; a < comPos.length; a += MAX_PARADAS_GOOGLE) {
    const bloco = comPos.slice(a, a + MAX_PARADAS_GOOGLE)
    const ultimaParte = a + MAX_PARADAS_GOOGLE >= comPos.length
    const pts = bloco.map((i) => [i.lat, i.lng])
    // última parte volta à saída; as outras terminam na última parada do bloco
    const destino = ultimaParte ? origem : pts[pts.length - 1]
    const intermediarias = ultimaParte ? pts : pts.slice(0, -1)
    partes.push({
      link: link(inicio, destino, intermediarias),
      de: a + 1,
      ate: a + bloco.length,
      paradas: bloco.length,
      horaIni: bloco[0].horaIni || null,
      horaFim: bloco[bloco.length - 1].horaFim || null,
    })
    inicio = pts[pts.length - 1]
  }
  return partes
}
