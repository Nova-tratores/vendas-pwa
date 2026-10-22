// Nota de completude da VISITA (0–100) — uma régua só para o vendedor (antes
// de salvar), para a cobrança depois e para o supervisor (card e filtros).
// Regras puras, sem rede.
//
//   Resumo com conteúdo de verdade ......... 15
//   Pessoa com cargo ........................ 10
//   Cultura principal na propriedade ........ 10
//   Pelo menos 1 máquina .................... 20
//   Próximos passos ......................... 15
//   Próximo contato com data (ou "sem retorno" justificado) ... 20
//   Negócio vinculado (só quando o resumo indica interesse) ... 10
//
//   🟢 completa ≥ 80 · 🟡 parcial 50–79 · 🔴 incompleta < 50

// "Sem retorno" é escolha válida, mas justificada: o motivo vai no começo dos
// próximos passos ("Sem retorno: cliente vendeu a fazenda").
export const PREFIXO_SEM_RETORNO = 'Sem retorno:'

const GENERICOS = [
  /conversa (foi )?produtiva/, /me apresentei/, /apresenta[çc][ãa]o/, /mostrei (os )?produtos/,
  /visita de rotina/, /tudo (certo|bem|ok)/, /sem novidades?/, /cliente (bem )?atendido/,
  /bate[- ]?papo/, /relacionamento/, /^ok\.?$/, /^visita\.?$/,
]

const palavras = (t) => String(t || '').trim().split(/\s+/).filter(Boolean)
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Resumo que diz alguma coisa: 12+ palavras e não só frase feita. */
export function resumoReal(texto) {
  const p = palavras(texto)
  if (p.length < 12) return false
  const t = norm(texto)
  // frase feita só conta contra se o texto for curto; com conteúdo além dela, passa
  return !(GENERICOS.some((re) => re.test(t)) && p.length < 20)
}

const INTERESSE = /\b(vai precisar|precisa de|quer (comprar|trocar|ver|um|uma)|querendo|interess|comprar|trocar o|trocar a|or[cç]amento|proposta|cota[cç][aã]o|financiamento|finame|pensando em)/

/** O resumo indica oportunidade de venda (então devia ter negócio). */
export const indicaInteresse = (texto) => INTERESSE.test(norm(texto))

export const semRetornoJustificado = (proximosPassos) => {
  const t = String(proximosPassos || '').trim()
  return t.toLowerCase().startsWith(PREFIXO_SEM_RETORNO.toLowerCase()) && t.length > PREFIXO_SEM_RETORNO.length + 3
}

export const ITENS_NOTA = [
  { key: 'resumo', label: 'resumo', pontos: 15 },
  { key: 'pessoa', label: 'pessoa com cargo', pontos: 10 },
  { key: 'cultura', label: 'cultura', pontos: 10 },
  { key: 'maquina', label: 'máquina', pontos: 20 },
  { key: 'passos', label: 'próximos passos', pontos: 15 },
  { key: 'retorno', label: 'retorno', pontos: 20 },
  { key: 'negocio', label: 'negócio', pontos: 10 },
]

/**
 * @param v visita: { resumo, proximos_passos, data_proximo_contato, negocio_id,
 *          pessoas: [{cargo}], maquina_ids|maquinas, culturas }
 */
export function notaVisita(v) {
  const interesse = indicaInteresse(v.resumo)
  const ok = {
    resumo: resumoReal(v.resumo),
    pessoa: (v.pessoas || []).some((p) => String(p?.cargo || '').trim()),
    cultura: Array.isArray(v.culturas) && v.culturas.length > 0,
    maquina: ((v.maquinas || v.maquina_ids || []).length) > 0,
    passos: String(v.proximos_passos || '').trim().length > 0,
    retorno: !!v.data_proximo_contato || semRetornoJustificado(v.proximos_passos),
    // sem sinal de interesse, negócio não se aplica (conta como cumprido)
    negocio: !interesse || !!v.negocio_id,
  }
  const itens = ITENS_NOTA.map((i) => ({ ...i, ok: ok[i.key], naoSeAplica: i.key === 'negocio' && !interesse }))
  const nota = itens.reduce((s, i) => s + (i.ok ? i.pontos : 0), 0)
  return {
    nota,
    faixa: faixaNota(nota),
    itens,
    faltam: itens.filter((i) => !i.ok).map((i) => i.label),
    interesse,
    oportunidadeSemNegocio: interesse && !v.negocio_id,
  }
}

export function faixaNota(nota) {
  if (nota >= 80) return { key: 'completa', label: 'Completa', cor: '#16a34a' }
  if (nota >= 50) return { key: 'parcial', label: 'Parcial', cor: '#d97706' }
  return { key: 'incompleta', label: 'Incompleta', cor: '#dc2626' }
}

/** Filtros do supervisor: todas · incompletas · sem retorno · oportunidade sem negócio. */
export function passaFiltroNota(v, filtro) {
  if (!filtro) return true
  const n = notaVisita(v)
  if (filtro === 'incompletas') return n.nota < 80
  if (filtro === 'sem_retorno') return !n.itens.find((i) => i.key === 'retorno').ok
  if (filtro === 'oportunidade') return n.oportunidadeSemNegocio
  return true
}

/** Data de retorno a partir de hoje (atalhos +7 / +15 / +30). */
export function dataMaisDias(dias, hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + dias)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
