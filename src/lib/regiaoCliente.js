// Cliente + município + estoque: quais culturas pesam na região do cliente e quais
// máquinas EM ESTOQUE fazem sentido para elas. Regras puras (sem banco), usadas no
// cartão da Minha rota.
//
// Culturas: primeiro as do próprio cliente; depois as maiores da cidade (área plantada,
// IBGE/PAM no Portal — hoje dados de exemplo). Máquinas: o estoque da loja
// (catálogo › Estoque Loja) filtrado pelo que cada tipo de lavoura usa.

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Grupo de lavoura → o que oferecer. `palavras` casam com descrição/modelo/família do estoque;
// `cv` é a faixa de potência de trator que faz sentido.
export const GRUPOS = {
  graos: {
    nome: 'Grãos',
    culturas: ['soja', 'milho', 'feijao', 'trigo', 'sorgo', 'aveia', 'amendoim', 'algodao'],
    cv: [75, 140],
    palavras: ['plantadeira', 'semeadora', 'pulverizador', 'grade', 'distribuidor', 'subsolador', 'escarificador', 'graneleira', 'grain', 'sdm', 'accura'],
    dica: 'trator de 75 a 140 cv, plantadeira, pulverizador e grade',
  },
  perenes: {
    nome: 'Café e frutas',
    culturas: ['cafe', 'laranja', 'citros', 'limao', 'banana', 'uva', 'abacate', 'manga', 'fruticultura'],
    cv: [25, 80],
    palavras: ['atomizador', 'roçadeira', 'trincha', 'pulverizador', 'carreta', 'cafeeiro', 'estreito'],
    dica: 'trator estreito até 80 cv, atomizador e roçadeira',
  },
  cana: {
    nome: 'Cana',
    culturas: ['cana'],
    cv: [100, 300],
    palavras: ['grade pesada', 'aradora', 'gtcr', 'subsolador', 'sulcador', 'cultivador', 'asdah'],
    dica: 'trator acima de 100 cv, grade pesada e subsolador',
  },
  pecuaria: {
    nome: 'Pasto e gado',
    culturas: ['pastagem', 'gado', 'bovino', 'leite', 'pecuaria', 'silagem', 'forragem', 'capim'],
    cv: [50, 100],
    palavras: ['roçadeira', 'distribuidor de calcário', 'calcário', 'dcf', 'ensiladeira', 'forrageira', 'misturador', 'profile', 'carreta', 'enfardadora'],
    dica: 'trator de 50 a 100 cv, roçadeira, distribuidor de calcário e vagão misturador',
  },
  raizes: {
    nome: 'Mandioca e hortaliças',
    culturas: ['mandioca', 'batata', 'hortalica', 'olericultura', 'tomate', 'cebola'],
    cv: [40, 90],
    palavras: ['plantadeira', 'arado', 'grade', 'encanteirador', 'enxada rotativa', 'sulcador'],
    dica: 'trator de 40 a 90 cv, enxada rotativa e plantadeira',
  },
}

export function grupoDaCultura(cultura) {
  const c = norm(cultura)
  for (const [k, g] of Object.entries(GRUPOS)) if (g.culturas.some((x) => c.includes(x))) return k
  return null
}

/** Potência (cv) de um trator pelo texto: "75 cv" ou o modelo Mahindra (6075E → 75, 7095 → 95, 9500 → 95). Anos (19xx/20xx) não contam. */
export function cvDoTrator(p) {
  const t = `${p.modelo || ''} ${p.descricao || ''}`
  const cv = t.match(/(\d{2,3})\s*cv\b/i)
  if (cv) return Number(cv[1])
  for (const m of t.matchAll(/\b(\d)(\d)(\d\d)[A-Z]{0,2}\b/gi)) {
    if (/^(19|20)/.test(m[1] + m[2])) continue // ano, não modelo
    if (m[3] === '00') return Number(m[1] + m[2]) // 9500 → 95
    return m[2] === '1' ? Number('1' + m[3]) : Number(m[3]) // 6110 → 110; 6075 → 75
  }
  return null
}

export const ehTrator = (p) => /trator/i.test(`${p.familia_nome || ''} ${p.descricao || ''}`)

/** Culturas do cliente + as maiores do município (com % da área plantada da cidade). */
export function culturasDaRegiao({ culturasCliente = [], municipio }) {
  const total = municipio?.areaPlantadaHa || (municipio?.culturas || []).reduce((s, c) => s + (c.ha || 0), 0)
  const out = []
  const vistos = new Set()
  for (const c of culturasCliente) {
    const k = norm(c); if (!k || vistos.has(k)) continue
    vistos.add(k); out.push({ nome: c, doCliente: true, pct: null })
  }
  for (const c of [...(municipio?.culturas || [])].sort((a, b) => (b.ha || 0) - (a.ha || 0))) {
    const k = norm(c.nome)
    const ja = out.find((o) => norm(o.nome) === k)
    const pct = total ? Math.round(((c.ha || 0) / total) * 100) : null
    if (ja) { ja.pct = pct; continue }
    if (out.length >= 4) break
    vistos.add(k); out.push({ nome: c.nome, doCliente: false, pct })
  }
  return out.slice(0, 4)
}

/** Máquinas do estoque que servem para os grupos de lavoura da região (no máximo `limite`). */
export function maquinasParaRegiao(culturas, estoque, limite = 3, maxTratores = 1) {
  const grupos = [...new Set(culturas.map((c) => grupoDaCultura(c.nome)).filter(Boolean))]
  if (!grupos.length || !estoque?.length) return { grupos, maquinas: [] }
  const pontos = new Map()
  grupos.forEach((gk, ordem) => {
    const g = GRUPOS[gk]
    const peso = grupos.length - ordem // grupo da 1ª cultura pesa mais
    for (const p of estoque) {
      if (!(p.estoque_efetivo > 0)) continue
      let motivo = null
      if (ehTrator(p)) {
        const cv = cvDoTrator(p)
        if (cv && cv >= g.cv[0] && cv <= g.cv[1]) motivo = `trator de ${cv} cv, bom para ${g.nome.toLowerCase()}`
      } else {
        const alvo = norm(`${p.descricao} ${p.modelo} ${p.familia_nome}`)
        const hit = g.palavras.find((w) => alvo.includes(norm(w)))
        if (hit) motivo = `${g.nome.toLowerCase()}: ${hit}`
      }
      if (!motivo) continue
      const atual = pontos.get(p.codigo_produto)
      if (!atual || atual.peso < peso) pontos.set(p.codigo_produto, { produto: p, motivo, peso })
    }
  })
  // mistura: no máximo 1 trator e o resto implementos, para não virar lista de tratores
  const lista = [...pontos.values()].sort((a, b) => b.peso - a.peso || (b.produto.estoque_efetivo || 0) - (a.produto.estoque_efetivo || 0))
  const tratores = lista.filter((x) => ehTrator(x.produto)).slice(0, maxTratores)
  const outros = lista.filter((x) => !ehTrator(x.produto))
  return { grupos, maquinas: [...tratores, ...outros].slice(0, limite) }
}

/** Tudo de uma vez para um contato da rota. */
export function regiaoDoContato({ cidade, culturasCliente, municipios, estoque }) {
  const municipio = (municipios || []).find((m) => norm(m.nome) === norm(cidade)) || null
  const culturas = culturasDaRegiao({ culturasCliente, municipio })
  const { grupos, maquinas } = maquinasParaRegiao(culturas, estoque)
  const dica = grupos.map((g) => GRUPOS[g].dica)[0] || null
  return { municipio, culturas, maquinas, dica }
}
