// =============================================================================
// Semana da rota — regras puras (José, 21/10/2026: "depois de criar a rota, já cria na
// agenda o que ele vai fazer durante a semana; ele pode personalizar a rota, mas o que
// ficar definido vai também para a Agenda coletiva do Portal").
//
// Plano = 5 dias (seg–sex). Cada dia: as cidades vizinhas daquele dia (planejarSemana),
// os contatos dessas cidades com a mistura do perfil (aplicarMix), na ordem do mapa
// (ordemPeloMapa) e com horário. O vendedor mexe (move, tira, reordena, troca o horário)
// e confirma; a publicação na Agenda é por `ref` = id do contato do feed (não duplica).
// =============================================================================
import { LOJA, aplicarMix, ordemPeloMapa, planejarSemana } from './rotaFeed'

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
export const POR_DIA_PADRAO = 6
const DURACAO = 75 // min por contato (visita + deslocamento médio); 6 por dia = 08:00 às 16:45
const INICIO = '08:00'
const ALMOCO = ['12:00', '13:00']

const min = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b }
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Segunda-feira da semana a planejar: a desta semana (seg–sex) ou a próxima (sáb/dom). */
export function segundaDaSemana(hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const dow = d.getDay() // 0 dom … 6 sáb
  const desloc = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow
  d.setDate(d.getDate() + desloc)
  return iso(d)
}

export function diaDaSemana(segunda, k) {
  const [a, m, d] = segunda.split('-').map(Number)
  return iso(new Date(a, m - 1, d + k))
}

/** Horários em sequência a partir das 08:00, `DURACAO` cada, pulando o almoço. Respeita hora fixada pelo vendedor. */
export function reprogramar(itens) {
  let t = min(INICIO)
  return itens.map((it) => {
    if (it.horaFixa) { t = min(it.horaFixa); }
    if (!it.horaFixa && t >= min(ALMOCO[0]) && t < min(ALMOCO[1])) t = min(ALMOCO[1])
    if (!it.horaFixa && t < min(ALMOCO[0]) && t + DURACAO > min(ALMOCO[0])) t = min(ALMOCO[1])
    const ini = t; t += DURACAO
    return { ...it, horaIni: hhmm(ini), horaFim: hhmm(Math.min(t, 23 * 60 + 59)) }
  })
}

/** Monta o plano da semana a partir da reserva do vendedor. */
export function montarPlanoSemana({ itens, cidades, mix, segunda, porDia = POR_DIA_PADRAO, inicio = LOJA }) {
  const grupos = planejarSemana(cidades, 5, inicio)
  const usados = new Set()
  const dias = grupos.map((g, k) => {
    const nomes = g.map((c) => c.cidade)
    const candidatos = itens.filter((i) => nomes.includes(i.cidade) && !usados.has(i.id))
    const escolhidos = ordemPeloMapa(aplicarMix(candidatos, mix, porDia), inicio).itens
    escolhidos.forEach((i) => usados.add(i.id))
    return { dia: diaDaSemana(segunda, k), cidades: nomes, itens: reprogramar(escolhidos) }
  })
  return { semana: segunda, porDia, dias, criadoEm: new Date().toISOString(), confirmadoEm: null, mudouDepois: false }
}

// ── edições (todas devolvem um plano novo; marcam mudouDepois se já estava confirmado) ──
const tocar = (plano, dias) => ({ ...plano, dias, mudouDepois: !!plano.confirmadoEm })
const mapDia = (plano, k, fn) => tocar(plano, plano.dias.map((d, i) => (i === k ? { ...d, itens: reprogramar(fn(d.itens)) } : d)))

export const tirar = (plano, k, id) => mapDia(plano, k, (its) => its.filter((i) => i.id !== id))
export const subir = (plano, k, id, dir) => mapDia(plano, k, (its) => {
  const a = [...its]; const i = a.findIndex((x) => x.id === id); const j = i + dir
  if (i < 0 || j < 0 || j >= a.length) return a
  ;[a[i], a[j]] = [a[j], a[i]]; return a
})
export const fixarHora = (plano, k, id, hora) => mapDia(plano, k, (its) => its.map((i) => (i.id === id ? { ...i, horaFixa: hora || undefined } : i)))
export function mover(plano, de, para, id) {
  if (de === para) return plano
  const it = plano.dias[de].itens.find((i) => i.id === id)
  if (!it) return plano
  const dias = plano.dias.map((d, i) => {
    if (i === de) return { ...d, itens: reprogramar(d.itens.filter((x) => x.id !== id)) }
    if (i === para) return { ...d, itens: reprogramar([...d.itens, { ...it, horaFixa: undefined }]) }
    return d
  })
  return tocar(plano, dias)
}
export const incluir = (plano, k, item) => (plano.dias.some((d) => d.itens.some((i) => i.id === item.id)) ? plano : mapDia(plano, k, (its) => [...its, item]))

/** Contatos da reserva que ainda não estão em nenhum dia (para "incluir"). */
export function foraDoPlano(plano, itens) {
  const ja = new Set(plano.dias.flatMap((d) => d.itens.map((i) => i.id)))
  return itens.filter((i) => !ja.has(i.id))
}

/** Itens no formato da Agenda (src/lib/agendaRota.js → publicarRotaDaSemana). */
export function paraAgenda(plano) {
  return plano.dias.flatMap((d) => d.itens.map((i) => ({
    ref: i.id, dia: d.dia, horaIni: i.horaIni, horaFim: i.horaFim,
    titulo: i.titulo, local: i.sub || i.cidade, cidade: i.cidade, tipo: i.tipo,
    propriedadeId: i.propriedadeId, clienteId: i.propriedadeId, lat: i.lat ?? undefined, lng: i.lng ?? undefined,
    obs: [i.porque, i.acao].filter(Boolean).join(' '),
  })))
}
