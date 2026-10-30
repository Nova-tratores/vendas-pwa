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

import { ehParceiro, foraDaPropriedade } from './localVisita'

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
  // fora da propriedade o vendedor não vê a lavoura nem as máquinas: não cobra
  const fora = foraDaPropriedade(v)
  const ok = {
    resumo: resumoReal(v.resumo),
    pessoa: (v.pessoas || []).some((p) => String(p?.cargo || '').trim()),
    cultura: fora || (Array.isArray(v.culturas) && v.culturas.length > 0),
    maquina: fora || ((v.maquinas || v.maquina_ids || []).length) > 0,
    passos: String(v.proximos_passos || '').trim().length > 0,
    retorno: !!v.data_proximo_contato || semRetornoJustificado(v.proximos_passos),
    // sem sinal de interesse, negócio não se aplica (conta como cumprido)
    negocio: !interesse || !!v.negocio_id,
  }
  const itens = ITENS_NOTA.map((i) => ({ ...i, ok: ok[i.key], naoSeAplica: (i.key === 'negocio' && !interesse) || (fora && (i.key === 'cultura' || i.key === 'maquina')) }))
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

// ── Cobrança (fase 2) ────────────────────────────────────────────────────────

/** Visita do IndexedDB → formato da régua (pessoas com cargo, culturas da propriedade). */
export function visitaParaNota(v, { pessoasById = {}, propById = {} } = {}) {
  return {
    ...v,
    pessoas: (v.pessoa_ids || []).map((id) => pessoasById[id]).filter(Boolean),
    culturas: propById[v.propriedade_id]?.culturas || [],
    parceiro: ehParceiro(propById[v.propriedade_id]),
  }
}

const diaLocal = (iso) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Visitas de hoje abaixo de "completa" (≥ 80), mais antiga primeiro. */
export function incompletasDoDia(visitas, ctx, agora = new Date()) {
  const hoje = diaLocal(agora)
  return visitas
    .filter((v) => !v.deleted_at && !v.duplicada_de && v.data_visita && diaLocal(v.data_visita) === hoje)
    .map((v) => ({ v, n: notaVisita(visitaParaNota(v, ctx)) }))
    .filter(({ n }) => n.nota < 80)
    .sort((a, b) => String(a.v.data_visita).localeCompare(String(b.v.data_visita)))
}

/** O aviso do fim do dia só aparece a partir das 17h30. */
export const horaDoAvisoDoDia = (agora = new Date()) => agora.getHours() * 60 + agora.getMinutes() >= 17 * 60 + 30

// o que dá para coletar na próxima visita (resumo/passos/retorno são da visita em si)
const COLETAVEIS = ['pessoa', 'cultura', 'maquina', 'negocio']

/** "Da última vez faltou: …" — a última visita da propriedade e o que dá para coletar hoje. */
export function faltouNaUltima(visitasDaPropriedade, ctx) {
  const ultima = visitasDaPropriedade
    .filter((v) => !v.deleted_at && !v.duplicada_de)
    .sort((a, b) => String(b.data_visita).localeCompare(String(a.data_visita)))[0]
  if (!ultima) return null
  const n = notaVisita(visitaParaNota(ultima, ctx))
  const faltam = n.itens.filter((i) => !i.ok && COLETAVEIS.includes(i.key)).map((i) => i.label)
  return faltam.length ? { visita: ultima, faltam } : null
}

// edição que não mexeu em nada não conta como "completou"
const EDICAO_VAZIA = /sem altera/i

/** Visita completada mais de 48 h depois de registrada (transparência, não punição). */
export function completadaDepois(visita, logs) {
  const base = new Date(visita.created_at || visita.data_visita).getTime()
  if (!base) return null
  const tardia = (logs || [])
    .filter((l) => l.acao === 'alterar' && !EDICAO_VAZIA.test(l.detalhes || ''))
    .map((l) => new Date(l.data_hora).getTime())
    .filter((t) => t - base > 48 * 3600_000)
    .sort((a, b) => b - a)[0]
  return tardia ? new Date(tardia).toISOString() : null
}

// ── Painel do supervisor (fase 3) ────────────────────────────────────────────

const distM = (a, b) => {
  const R = 6371000, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Por vendedor: feitas, completas (≥ 80), % e quantas vezes faltou cada campo. */
export function resumoPorVendedor(visitas) {
  const por = new Map()
  for (const v of visitas) {
    const k = v.vendedor_id
    if (!por.has(k)) por.set(k, { vendedor_id: k, nome: v.vendedor_nome || '—', feitas: 0, campo: 0, atendimentos: 0, completas: 0, falta: {}, aplica: {} })
    const r = por.get(k)
    const n = notaVisita(v)
    r.feitas++
    if (foraDaPropriedade(v)) r.atendimentos++
    else r.campo++
    if (n.nota >= 80) r.completas++
    for (const i of n.itens) {
      if (i.naoSeAplica) continue
      r.aplica[i.key] = (r.aplica[i.key] || 0) + 1
      if (!i.ok) r.falta[i.key] = (r.falta[i.key] || 0) + 1
    }
  }
  return [...por.values()]
    .map((r) => ({
      ...r,
      pct: r.feitas ? Math.round((r.completas / r.feitas) * 100) : 0,
      // % das visitas (em que o campo se aplica) sem aquele campo
      pctFalta: Object.fromEntries(ITENS_NOTA.map((i) => [i.key, r.aplica[i.key] ? Math.round(((r.falta[i.key] || 0) / r.aplica[i.key]) * 100) : null])),
    }))
    .sort((a, b) => b.feitas - a.feitas)
}

/**
 * Alertas automáticos do painel.
 * @param visitas do período (com nota)
 * @param todas   visitas recentes de todos (para retornos vencidos)
 */
export function alertasCompletude(visitas, todas = visitas, hoje = dataMaisDias(0)) {
  // 📍 GPS repetido: mesmo vendedor, propriedades diferentes, < 100 m e < 60 min
  const gps = []
  const comGps = visitas.filter((v) => v.latitude != null && v.longitude != null && !foraDaPropriedade(v))
    .sort((a, b) => String(a.data_visita).localeCompare(String(b.data_visita)))
  for (let i = 0; i < comGps.length; i++) {
    for (let j = i + 1; j < comGps.length; j++) {
      const a = comGps[i], b = comGps[j]
      const min = (new Date(b.data_visita) - new Date(a.data_visita)) / 60000
      if (min > 60) break
      if (a.vendedor_id !== b.vendedor_id || a.propriedade_id === b.propriedade_id) continue
      const m = distM({ lat: +a.latitude, lng: +a.longitude }, { lat: +b.latitude, lng: +b.longitude })
      if (m < 100) gps.push({ a, b, metros: Math.round(m), minutos: Math.round(min) })
    }
  }

  // 🕒 retroativas em excesso: 30%+ das visitas do vendedor (com 5 ou mais)
  const retro = resumoPorVendedor(visitas)
    .map((r) => ({ ...r, retro: visitas.filter((v) => v.vendedor_id === r.vendedor_id && v.retroativa).length }))
    .filter((r) => r.feitas >= 5 && r.retro / r.feitas >= 0.3)
    .map((r) => ({ vendedor_id: r.vendedor_id, nome: r.nome, retro: r.retro, feitas: r.feitas }))

  // 💼 resumo indica interesse, mas não há negócio
  const semNegocio = visitas.filter((v) => notaVisita(v).oportunidadeSemNegocio)

  // 📅 retornos vencidos: a última visita da propriedade marcou retorno antes de hoje
  const ultimaPorProp = new Map()
  for (const v of todas) {
    if (!v.propriedade_id) continue
    const u = ultimaPorProp.get(v.propriedade_id)
    if (!u || String(v.data_visita) > String(u.data_visita)) ultimaPorProp.set(v.propriedade_id, v)
  }
  const vencidos = [...ultimaPorProp.values()]
    .filter((v) => v.data_proximo_contato && v.data_proximo_contato < hoje)
    .sort((a, b) => a.data_proximo_contato.localeCompare(b.data_proximo_contato))

  return { gps, retro, semNegocio, vencidos }
}
