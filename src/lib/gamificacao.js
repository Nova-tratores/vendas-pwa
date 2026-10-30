// Gamificação do NT Vendas — regras puras (sem rede, funcionam offline).
// Tudo é DERIVADO das visitas já registradas: não há tabela de XP para burlar.
// O XP sempre vem colado ao comportamento certo (registrar bem a visita):
//   XP da visita = nota de completude (0–100, lib/completudeVisita).
// Sequência = dias úteis seguidos com pelo menos 1 visita completa (nota ≥ 80),
// com 1 proteção automática por mês (chuva, doença, estrada fechada).
import { notaVisita, visitaParaNota } from './completudeVisita'
import { foraDaPropriedade } from './localVisita'

export const NIVEIS = [
  { cv: 25, xp: 0 }, // começa no Jivo (José, 22/10/2026)
  { cv: 50, xp: 300 },
  { cv: 75, xp: 1000 },
  { cv: 100, xp: 2000 },
  { cv: 125, xp: 3500 },
  { cv: 150, xp: 5500 },
  { cv: 200, xp: 8500 },
  { cv: 250, xp: 12500 },
]

export function nivelDe(xp) {
  let i = 0
  while (i + 1 < NIVEIS.length && xp >= NIVEIS[i + 1].xp) i++
  const atual = NIVEIS[i]
  const proximo = NIVEIS[i + 1] || null
  const pct = proximo ? Math.round(((xp - atual.xp) / (proximo.xp - atual.xp)) * 100) : 100
  return { indice: i, ...atual, proximo, faltaXp: proximo ? proximo.xp - xp : 0, pct }
}

/** Subiu de nível entre dois totais de XP? Devolve o nível novo ou null. */
export function subiuDeNivel(xpAntes, xpDepois) {
  const a = nivelDe(xpAntes), b = nivelDe(xpDepois)
  return b.indice > a.indice ? b : null
}

const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const util = (d) => d.getDay() !== 0 && d.getDay() !== 6

/**
 * Sequência de dias úteis com visita completa, contando para trás a partir de
 * hoje. Hoje ainda está aberto: sem visita completa hoje, a conta começa ontem
 * (a chama não apaga de manhã). Um dia útil sem visita é coberto pela proteção
 * do mês, uma vez por mês; o segundo buraco no mesmo mês encerra a sequência.
 */
export function sequencia(diasCompletos, hoje = new Date()) {
  const feitos = new Set(diasCompletos)
  const cursor = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  if (!feitos.has(dia(cursor))) cursor.setDate(cursor.getDate() - 1)
  let dias = 0
  const protecoesUsadas = []
  for (let guarda = 0; guarda < 400; guarda++) {
    if (!util(cursor)) { cursor.setDate(cursor.getDate() - 1); continue }
    const d = dia(cursor)
    if (feitos.has(d)) dias++
    else {
      const mes = d.slice(0, 7)
      if (dias === 0 || protecoesUsadas.some((p) => p.startsWith(mes))) break
      protecoesUsadas.push(d)
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  const mesAtual = dia(hoje).slice(0, 7)
  return { dias, protecoesUsadas, protecaoDisponivel: !protecoesUsadas.some((p) => p.startsWith(mesAtual)) }
}

/** Tamanho da chama: cresce aos 5, 10 e 20 dias. */
export const chama = (dias) => (dias >= 20 ? 4 : dias >= 10 ? 3 : dias >= 5 ? 2 : dias >= 1 ? 1 : 0)

// ── Fase 3: Bônus de Safra e missões relâmpago ──────────────────────────────

/** Missão que vale para esta visita (no período e com o campo pedido). */
export function missaoDaVisita(v, nota, missoes = []) {
  const t = new Date(v.data_visita).getTime()
  return missoes
    .filter((m) => m.ativo !== false && t >= new Date(m.inicio).getTime() && t <= new Date(m.fim).getTime())
    .filter((m) => m.campo === 'qualquer' || nota.itens.find((i) => i.key === m.campo)?.ok)
    .sort((a, b) => Number(b.multiplicador) - Number(a.multiplicador))[0] || null
}

/**
 * Multiplicador de XP da visita: o maior entre o Bônus de Safra (2x, sorteado
 * no servidor e só para visita completa) e a missão relâmpago da hora (2x/3x).
 * Não somam: o acaso fica preso ao comportamento certo e o XP não dispara.
 */
export function multiplicadorVisita(v, nota, missoes = []) {
  const bonus = !!v.bonus_safra && nota.nota >= 80
  const missao = missaoDaVisita(v, nota, missoes)
  return { mult: Math.max(bonus ? 2 : 1, missao ? Number(missao.multiplicador) : 1), bonus, missao }
}

/** Visitas com Bônus de Safra ainda não celebradas (para a animação de surpresa). */
export function bonusNaoVistos(visitas, ctx, vistos = new Set()) {
  return visitas.filter((v) => !v.deleted_at && v.bonus_safra && !vistos.has(String(v.id))
    && notaVisita(visitaParaNota(v, ctx)).nota >= 80)
}

/** Perfil do vendedor a partir das visitas dele (IndexedDB). */
export function perfilVendedor(visitas, ctx, hoje = new Date(), missoes = []) {
  let xp = 0
  const diasCompletos = new Set()
  for (const v of visitas) {
    if (v.deleted_at || v.duplicada_de) continue
    const nota = notaVisita(visitaParaNota(v, ctx))
    const n = nota.nota
    xp += n * multiplicadorVisita(v, nota, missoes).mult
    if (n >= 80 && v.data_visita) diasCompletos.add(dia(new Date(v.data_visita)))
  }
  const seq = sequencia([...diasCompletos], hoje)
  return { xp, nivel: nivelDe(xp), sequencia: seq, chama: chama(seq.dias) }
}

/**
 * "Quase lá": quantos campos faltam, no mínimo, para a visita ficar verde.
 * Pega os faltantes de maior peso primeiro.
 */
export function camposParaVerde(nota) {
  if (nota.nota >= 80) return 0
  const faltam = nota.itens.filter((i) => !i.ok).map((i) => i.pontos).sort((a, b) => b - a)
  let soma = nota.nota
  for (let i = 0; i < faltam.length; i++) {
    soma += faltam[i]
    if (soma >= 80) return i + 1
  }
  return faltam.length
}

// ── Resumo de sexta (fase 2) ────────────────────────────────────────────────

const segundaDa = (d) => {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7))
  return s
}

/** O resumo aparece de sexta 15h até domingo (a semana já rendeu). */
export function resumoDisponivel(agora = new Date()) {
  const d = agora.getDay()
  return (d === 5 && agora.getHours() >= 15) || d === 6 || d === 0
}

const SELOS = [
  { key: 'semana_verde', nome: 'Semana verde', icone: '🟢', desc: 'todas as visitas da semana completas', teste: (s) => s.feitas >= 3 && s.completas === s.feitas },
  { key: 'maratona', nome: 'Maratona', icone: '🏃', desc: '10 ou mais visitas na semana', teste: (s) => s.campo >= 10 },
  { key: 'desbravador', nome: 'Desbravador', icone: '🧭', desc: '3 ou mais primeiras visitas', teste: (s) => s.primeiras >= 3 },
  { key: 'olho_na_maquina', nome: 'Olho na máquina', icone: '🚜', desc: 'máquina registrada em todas as visitas', teste: (s) => s.campo >= 3 && s.comMaquina === s.campo },
  { key: 'agenda_cheia', nome: 'Agenda cheia', icone: '📅', desc: 'retorno marcado em todas as visitas', teste: (s) => s.feitas >= 3 && s.comRetorno === s.feitas },
  { key: 'chama_5', nome: 'Chama acesa', icone: '🔥', desc: '5 dias úteis seguidos com visita completa', teste: (s) => s.sequencia >= 5 },
]

const MISSOES_POR_CAMPO = {
  resumo: 'Escreva no resumo o que o cliente quer e por quê (12+ palavras).',
  pessoa: 'Anote o cargo de quem você conversou em toda visita.',
  cultura: 'Registre a cultura principal de toda propriedade visitada.',
  maquina: 'Vincule pelo menos 1 máquina em cada visita.',
  passos: 'Feche toda visita com os próximos passos combinados.',
  retorno: 'Marque o retorno (+7, +15, +30) antes de sair do cliente.',
  negocio: 'Cliente com interesse? Abra o negócio na hora.',
}

/**
 * Resumo da semana do vendedor (segunda até hoje) comparado à anterior.
 * @param visitas do vendedor (IndexedDB) · ctx = { pessoasById, propById }
 */
export function resumoSemana(visitas, ctx, hoje = new Date(), missoes = []) {
  const ini = segundaDa(hoje)
  const iniAnt = new Date(ini); iniAnt.setDate(iniAnt.getDate() - 7)
  const fimProx = new Date(ini); fimProx.setDate(fimProx.getDate() + 14)
  const validas = visitas.filter((v) => !v.deleted_at && !v.duplicada_de && v.data_visita)
  const comNota = (lista) => lista.map((v) => ({ v, n: notaVisita(visitaParaNota(v, ctx)) }))
  const daSemana = comNota(validas.filter((v) => new Date(v.data_visita) >= ini && new Date(v.data_visita) <= hoje))
  const anterior = comNota(validas.filter((v) => new Date(v.data_visita) >= iniAnt && new Date(v.data_visita) < ini))
  const media = (l) => (l.length ? Math.round(l.reduce((s, x) => s + x.n.nota, 0) / l.length) : 0)

  const perfil = perfilVendedor(visitas, ctx, hoje, missoes)
  const xpSemana = daSemana.reduce((s, x) => s + x.n.nota * multiplicadorVisita(x.v, x.n, missoes).mult, 0)
  // banco, cartório etc. dão XP, mas os selos de campo contam só a propriedade
  const emCampo = daSemana.filter((x) => !foraDaPropriedade(visitaParaNota(x.v, ctx)))
  const stats = {
    feitas: daSemana.length,
    campo: emCampo.length,
    completas: daSemana.filter((x) => x.n.nota >= 80).length,
    primeiras: emCampo.filter((x) => x.v.primeira_visita).length,
    comMaquina: emCampo.filter((x) => (x.v.maquina_ids || []).length > 0).length,
    comRetorno: daSemana.filter((x) => x.n.itens.find((i) => i.key === 'retorno').ok).length,
    sequencia: perfil.sequencia.dias,
  }
  const melhor = [...daSemana].sort((a, b) => b.n.nota - a.n.nota || String(b.v.data_visita).localeCompare(String(a.v.data_visita)))[0] || null

  // missões: os 2 campos que mais faltaram na semana + os retornos já marcados
  const faltas = {}
  for (const x of daSemana) for (const i of x.n.itens) if (!i.ok) faltas[i.key] = (faltas[i.key] || 0) + 1
  const proximas = Object.entries(faltas).sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([k, n]) => ({ key: k, texto: MISSOES_POR_CAMPO[k], faltou: n }))
  const proxSeg = new Date(ini); proxSeg.setDate(proxSeg.getDate() + 7)
  const dia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const retornosProxima = validas.filter((v) => v.data_proximo_contato >= dia(proxSeg) && v.data_proximo_contato < dia(fimProx)).length
  if (retornosProxima) proximas.push({ key: 'retornos', texto: `Cumprir os ${retornosProxima} retorno${retornosProxima > 1 ? 's' : ''} marcado${retornosProxima > 1 ? 's' : ''} para a semana que vem.` })
  if (!proximas.length) proximas.push({ key: 'manter', texto: 'Manter todas as visitas verdes e a chama acesa.' })

  return {
    semana: { ini: dia(ini), ...stats, media: media(daSemana), xp: xpSemana },
    anterior: { feitas: anterior.length, media: media(anterior) },
    melhor,
    selos: SELOS.filter((s) => s.teste(stats)).map(({ teste: _t, ...s }) => s),
    nivel: perfil.nivel,
    missoes: proximas,
  }
}
