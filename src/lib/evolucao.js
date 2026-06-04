// ============================================
// Agregação temporal para a aba Evolução
// Bucketiza eventos (visitas / negócios) por período
// (semana, mês, trimestre) e por dimensão (vendedor / cidade).
// Funções puras — fáceis de testar.
// ============================================

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Segunda-feira da semana de `d` (Date) ao início do dia. */
function inicioSemana(d) {
  const x = new Date(d)
  const dia = x.getDay()
  x.setDate(x.getDate() - (dia === 0 ? 6 : dia - 1))
  x.setHours(0, 0, 0, 0)
  return x
}

/**
 * Para uma data, retorna { key, label } do período.
 * `key` é ordenável lexicograficamente (cronológico).
 */
export function periodoDe(iso, granularidade) {
  const d = new Date(iso)
  if (granularidade === 'semana') {
    const ini = inicioSemana(d)
    const key = `${ini.getFullYear()}-${String(ini.getMonth() + 1).padStart(2, '0')}-${String(ini.getDate()).padStart(2, '0')}`
    const label = `${String(ini.getDate()).padStart(2, '0')}/${String(ini.getMonth() + 1).padStart(2, '0')}`
    return { key, label }
  }
  if (granularidade === 'trimestre') {
    const tri = Math.floor(d.getMonth() / 3) + 1
    const ano2 = String(d.getFullYear()).slice(2)
    return { key: `${d.getFullYear()}-T${tri}`, label: `T${tri}/${ano2}` }
  }
  // mês (padrão)
  const ano2 = String(d.getFullYear()).slice(2)
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MESES[d.getMonth()]}/${ano2}` }
}

/**
 * Monta os dados do gráfico.
 *
 * @param {Array}  eventos     Itens já normalizados: { data, dimensao, valor }
 *                             - data: ISO string do evento
 *                             - dimensao: rótulo da série (vendedor ou cidade)
 *                             - valor: número a somar (1 para contagem, R$ para valor)
 * @param {string} granularidade 'semana' | 'mes' | 'trimestre'
 * @param {number} topN        Máximo de séries; o resto vira "Outros"
 * @returns {{ data: Array, series: string[] }}
 *   data: [{ periodo, __key, [serie]: número, ... }] ordenado cronologicamente
 *   series: nomes das séries (na ordem de maior total)
 */
export function montarSerie(eventos, granularidade, topN = 8) {
  if (!eventos.length) return { data: [], series: [] }

  // Total por dimensão para escolher o top N
  const totalPorDim = {}
  for (const e of eventos) {
    totalPorDim[e.dimensao] = (totalPorDim[e.dimensao] || 0) + e.valor
  }
  const ordenadas = Object.keys(totalPorDim).sort((a, b) => totalPorDim[b] - totalPorDim[a])
  const principais = ordenadas.slice(0, topN)
  const setPrincipais = new Set(principais)
  const temOutros = ordenadas.length > topN

  // Agrega por período
  const porPeriodo = {} // key -> { periodo, __key, [serie]: num }
  for (const e of eventos) {
    const { key, label } = periodoDe(e.data, granularidade)
    if (!porPeriodo[key]) porPeriodo[key] = { periodo: label, __key: key }
    const serie = setPrincipais.has(e.dimensao) ? e.dimensao : 'Outros'
    porPeriodo[key][serie] = (porPeriodo[key][serie] || 0) + e.valor
  }

  const data = Object.values(porPeriodo).sort((a, b) => (a.__key < b.__key ? -1 : 1))

  // Garante que toda série apareça em todo período (0 onde faltar) — linhas contínuas
  const series = [...principais, ...(temOutros ? ['Outros'] : [])]
  for (const ponto of data) {
    for (const s of series) {
      if (ponto[s] == null) ponto[s] = 0
    }
  }

  return { data, series }
}

// Paleta estável para as séries (índice → cor)
export const CORES_SERIE = [
  '#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed',
  '#0891b2', '#db2777', '#65a30d', '#94a3b8',
]
