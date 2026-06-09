// Sugestão de cliente/propriedade já cadastrado, para evitar duplicar no
// check-in. Compara o nome digitado e a localização (cidade + GPS) com o que
// já existe no IndexedDB do vendedor.

/** minúsculas, sem acento, espaços colapsados. */
export function normalizar(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

function tokens(s) {
  return normalizar(s).split(' ').filter((t) => t.length > 1)
}

/** 0..1 — quão parecidos são dois nomes (igual / contém / Jaccard de tokens). */
export function similaridadeNome(a, b) {
  const na = normalizar(a), nb = normalizar(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const ta = new Set(tokens(a)), tb = new Set(tokens(b))
  if (!ta.size || !tb.size) return 0
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  return inter / (ta.size + tb.size - inter) // Jaccard
}

/** Distância em km (haversine). Infinity se faltar alguma coordenada. */
export function distanciaKm(lat1, lng1, lat2, lng2) {
  const vals = [lat1, lng1, lat2, lng2]
  if (vals.some((v) => v == null || Number.isNaN(Number(v)))) return Infinity
  const R = 6371
  const toRad = (d) => (Number(d) * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Devolve as propriedades já cadastradas mais parecidas com o que o vendedor
 * está digitando. Cada item: { propriedade, dono, score, sNome, mesmaCidade, distKm }.
 * Só dispara a partir de 3 caracteres no nome.
 */
export function sugerirPropriedades({ nome, cidade, lat, lng, propriedades = [], clientes = [], max = 4 }) {
  if (normalizar(nome).length < 3) return []
  const cliMap = Object.fromEntries(clientes.map((c) => [c.id, c]))
  const cidadeNorm = normalizar(cidade)
  const out = []
  for (const p of propriedades) {
    const dono = p.cliente_dono_id != null ? cliMap[p.cliente_dono_id] : null
    const candidatos = [p.nome, p.nome_fantasia, p.razao_social, dono?.nome].filter(Boolean)
    let sNome = 0
    for (const c of candidatos) sNome = Math.max(sNome, similaridadeNome(nome, c))
    if (sNome < 0.34) continue

    let score = sNome
    const mesmaCidade = !!cidadeNorm && normalizar(p.cidade) === cidadeNorm
    if (mesmaCidade) score += 0.25

    const distKm = distanciaKm(lat, lng, p.latitude, p.longitude)
    if (distKm <= 2) score += 0.3
    else if (distKm <= 10) score += 0.15

    out.push({ propriedade: p, dono, score, sNome, mesmaCidade, distKm })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, max)
}
