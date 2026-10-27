// Monitor de uso do app (PURO: sem DOM, sem storage, sem rede).
//
// Vai para o mesmo monitor do portal (Atividades → Padrões), que aponta telas
// e atalhos a otimizar. Mesmas regras do portal (lib/uso/jornada.ts lá):
// - só CONTAGENS por dia, nunca evento bruto;
// - rota = pathname com ids trocados por [id], prefixo /vendas; nunca query;
// - transição de → para: ida-e-volta (A→B→A em até 5 min), rápida (< 60 s na
//   origem), "mesmo caso" (as duas telas têm o mesmo id na URL — só o booleano
//   sai do aparelho), gap > 30 min não conta.
// Além do portal: atalhos (por qual botão a pessoa chegou) e fluxos (começou,
// concluiu, cancelou, abandonou + tempo).
//
// O buffer é guardado no aparelho e enviado em lote: o vendedor passa o dia sem
// sinal, então cada contagem carrega o DIA em que aconteceu.

export const GAP_MAX_S = 30 * 60
export const VOLTA_MAX_S = 5 * 60
export const RAPIDA_S = 60
export const FLUXO_MAX_S = 60 * 60
export const PREFIXO = '/vendas'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NUMERO = /^-?\d+$/ // ids locais (offline) são negativos
const PLACA = /^[A-Z]{3}\d[A-Z0-9]\d{2}$/i
const SEM_CONTAR = ['/login', '/reset-password', '/supervisor/login']

const ehId = (s) => UUID.test(s) || NUMERO.test(s)

/** Pathname → chave de contagem ('/vendas/...'); '' = não conta. */
export function normalizarRota(pathname) {
  let p = String(pathname || '').split('?')[0].split('#')[0].trim()
  if (!p.startsWith('/')) p = '/' + p
  if (p.length > 1) p = p.replace(/\/+$/, '')
  if (SEM_CONTAR.includes(p)) return ''
  if (p === '/') p = '/dashboard' // index do vendedor é o Início
  const segs = p.split('/').map((s, i) => (i === 0 || !s ? s : ehId(s) || PLACA.test(s) ? '[id]' : s))
  return (PREFIXO + segs.join('/')).slice(0, 200)
}

/** Ids que aparecem na URL (para decidir "mesmo caso"). Nunca saem do aparelho. */
export function idsDaRota(pathname) {
  return String(pathname || '').split('?')[0].split('/').filter((s) => s && ehId(s))
}

/** Dia (YYYY-MM-DD) no fuso de São Paulo, igual ao portal. */
export function diaLocal(agora) {
  return new Date(agora - 3 * 3600 * 1000).toISOString().slice(0, 10)
}

export const novoBuffer = () => ({})

function doDia(buf, dia) {
  if (!buf[dia]) buf[dia] = { p: {}, t: {}, e: {} }
  return buf[dia]
}

const SEP = '\u0001'

/**
 * Entrou numa tela. Conta a página e, se houver tela anterior, a transição.
 * estado = { rota, ids, desde, antes: { rota, saiu } } | null. Devolve o novo estado.
 * Muta buf (é um acumulador).
 */
export function entrarNaTela(buf, estado, pathname, agora) {
  const rota = normalizarRota(pathname)
  if (!rota) return estado
  if (estado && estado.rota === rota) return estado // mesma tela (só mudou query/state)
  const dia = diaLocal(agora)
  const d = doDia(buf, dia)
  d.p[rota] = (d.p[rota] || 0) + 1
  const ids = idsDaRota(pathname)

  if (estado?.rota) {
    const gap = Math.round((agora - estado.desde) / 1000)
    if (gap >= 0 && gap <= GAP_MAX_S) {
      const k = estado.rota + SEP + rota
      const t = d.t[k] || (d.t[k] = { n: 0, m: 0, v: 0, r: 0, g: 0 })
      t.n += 1
      t.g += gap
      if (gap < RAPIDA_S) t.r += 1
      if (ids.some((x) => estado.ids.includes(x))) t.m += 1
      const antes = estado.antes
      if (antes && antes.rota === rota && (agora - antes.saiu) / 1000 <= VOLTA_MAX_S) t.v += 1
    }
  }
  return {
    rota, ids, desde: agora,
    antes: estado?.rota ? { rota: estado.rota, saiu: agora } : null,
  }
}

function evento(buf, agora, tipo, chave, detalhe, durS) {
  const d = doDia(buf, diaLocal(agora))
  const k = [tipo, String(chave).slice(0, 80), String(detalhe || '').slice(0, 200)].join(SEP)
  const e = d.e[k] || (d.e[k] = { n: 0, s: 0 })
  e.n += 1
  if (durS > 0) e.s += Math.min(Math.round(durS), FLUXO_MAX_S)
}

/** Toque num atalho (data-atalho): de qual tela, para qual tela chegou. */
export function registrarAtalho(buf, agora, atalho, deRota, paraRota) {
  evento(buf, agora, 'atalho', atalho, `${deRota || '?'}→${paraRota || '(mesma tela)'}`, 0)
}

/** Fluxo: evento = iniciado | concluido | cancelado | abandonado. */
export function registrarFluxo(buf, agora, fluxo, ev, durS = 0) {
  evento(buf, agora, 'fluxo', fluxo, ev, durS)
}

export const bufferVazio = (buf) => !buf || Object.keys(buf).length === 0

/** Buffer → lotes por dia no formato da API do portal (/api/uso/vendas). */
export function montarLotes(buf) {
  return Object.keys(buf || {}).sort().map((dia) => {
    const d = buf[dia]
    return {
      dia,
      paginas: Object.entries(d.p).map(([rota, n]) => ({ rota, n })),
      transicoes: Object.entries(d.t).map(([k, t]) => {
        const [de, para] = k.split(SEP)
        return { de, para, n: t.n, n_mesmo_alvo: t.m, n_volta: t.v, n_rapida: t.r, soma_gap_s: t.g }
      }),
      eventos: Object.entries(d.e).map(([k, e]) => {
        const [tipo, chave, detalhe] = k.split(SEP)
        return { tipo, chave, detalhe, n: e.n, soma_s: e.s }
      }),
    }
  })
}

/** Soma b em a (devolve um novo buffer). Usado quando o envio falha. */
export function mesclar(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}))
  for (const [dia, d] of Object.entries(b || {})) {
    const o = doDia(out, dia)
    for (const [k, n] of Object.entries(d.p)) o.p[k] = (o.p[k] || 0) + n
    for (const [k, t] of Object.entries(d.t)) {
      const x = o.t[k] || (o.t[k] = { n: 0, m: 0, v: 0, r: 0, g: 0 })
      for (const c of ['n', 'm', 'v', 'r', 'g']) x[c] += t[c]
    }
    for (const [k, e] of Object.entries(d.e)) {
      const x = o.e[k] || (o.e[k] = { n: 0, s: 0 })
      x.n += e.n; x.s += e.s
    }
  }
  return out
}

/** Descarta dias velhos demais (o portal recusa > 30 dias). */
export function podarDias(buf, agora, maxDias = 30) {
  const limite = diaLocal(agora - maxDias * 86400000)
  const out = {}
  for (const [dia, d] of Object.entries(buf || {})) if (dia >= limite) out[dia] = d
  return out
}
