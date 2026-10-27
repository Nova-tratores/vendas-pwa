// Monitor de uso — casca do navegador (storage, cliques, envio). As regras
// ficam em uso.js (puro, testado). Destino: portal /api/uso/vendas → aba
// Padrões de Atividades.
//
// - Buffer no localStorage POR PESSOA (dois vendedores no mesmo celular não
//   se misturam; o Sair limpa o IndexedDB, não isto — o que não subiu ainda sobe
//   no próximo login da mesma pessoa).
// - Atalhos: qualquer elemento com data-atalho="area:nome". O toque fica
//   pendente até a próxima tela (até 4 s); sem troca de tela = "(mesma tela)".
// - Fluxos: fluxoInicio/fluxoFim; sair da tela do fluxo sem terminar = abandonado.
// - Desligado no modo embutido no portal (lá o portal já conta /crm-vendas, e
//   pegar a sessão aqui poderia renovar o token do portal) e fora de produção
//   (VITE_USO=on liga no dev).
import { supabase } from './sync'
import { estaEmbutido } from './embed'
import {
  entrarNaTela, registrarAtalho, registrarFluxo, montarLotes, mesclar,
  podarDias, bufferVazio, normalizarRota,
} from './uso'

const PORTAL = (import.meta.env.VITE_PORTAL_ORIGIN || 'https://portal.novatratores.com').replace(/\/+$/, '')
const URL_API = `${PORTAL}/api/uso/vendas`
const ATALHO_MAX_MS = 4000

let ligado = false
let estado = null
let pendAtalho = null
let enviando = false
const fluxos = new Map()

function lerJSON(k) {
  try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null }
}

function chaveBuffer() {
  const v = lerJSON('vendedor')
  if (v?.id) return `uso_v1_vendedor_${v.id}`
  const s = lerJSON('supervisor')
  if (s?.id) return `uso_v1_supervisor_${s.id}`
  return null
}

function mudar(fn) {
  const k = chaveBuffer()
  if (!k) return
  const buf = lerJSON(k) || {}
  fn(buf)
  try { localStorage.setItem(k, JSON.stringify(buf)) } catch { /* cheio/bloqueado: perde a contagem */ }
}

function resolverAtalho(paraRota) {
  if (!pendAtalho) return
  const { id, de, timer } = pendAtalho
  clearTimeout(timer)
  pendAtalho = null
  mudar((b) => registrarAtalho(b, Date.now(), id, de, paraRota))
}

function onClique(e) {
  const el = e.target?.closest?.('[data-atalho]')
  if (!el) return
  resolverAtalho(null) // toque anterior que não levou a lugar nenhum
  const id = el.getAttribute('data-atalho')
  pendAtalho = { id, de: estado?.rota || null, timer: setTimeout(() => resolverAtalho(null), ATALHO_MAX_MS) }
}

/** Chamado a cada troca de rota (App.jsx). */
export function telaMudou(pathname) {
  if (!ligado) return
  const rota = normalizarRota(pathname)
  if (!rota || rota === estado?.rota) return
  const agora = Date.now()
  if (pendAtalho) resolverAtalho(rota)
  for (const [nome, f] of fluxos) {
    if (f.rota && f.rota !== rota) {
      fluxos.delete(nome)
      mudar((b) => registrarFluxo(b, agora, nome, 'abandonado', (agora - f.t) / 1000))
    }
  }
  mudar((b) => { estado = entrarNaTela(b, estado, pathname, agora) })
}

/** Começou um fluxo (ex.: abriu o formulário de visita). */
export function fluxoInicio(nome) {
  if (!ligado) return
  const agora = Date.now()
  const antigo = fluxos.get(nome)
  mudar((b) => {
    if (antigo) registrarFluxo(b, agora, nome, 'abandonado', (agora - antigo.t) / 1000)
    registrarFluxo(b, agora, nome, 'iniciado')
  })
  fluxos.set(nome, { t: agora, rota: estado?.rota || null })
}

/** Terminou um fluxo: resultado = 'concluido' | 'cancelado'. */
export function fluxoFim(nome, resultado = 'concluido') {
  if (!ligado) return
  const f = fluxos.get(nome)
  if (!f) return
  fluxos.delete(nome)
  const agora = Date.now()
  mudar((b) => registrarFluxo(b, agora, nome, resultado, (agora - f.t) / 1000))
}

/** Manda o que juntou para o portal. Falhou = volta para o buffer. */
export async function enviarUso({ keepalive = false } = {}) {
  if (!ligado || enviando || !navigator.onLine) return
  const k = chaveBuffer()
  if (!k) return
  enviando = true
  try {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return
    const buf = podarDias(lerJSON(k) || {}, Date.now())
    if (bufferVazio(buf)) return
    localStorage.setItem(k, '{}')
    let ok = false
    try {
      const r = await fetch(URL_API, {
        method: 'POST',
        keepalive,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lotes: montarLotes(buf) }),
      })
      // 400 = lote recusado (formato): não adianta reenviar o mesmo
      ok = r.ok || r.status === 400
    } catch { /* sem rede */ }
    if (!ok) {
      const atual = lerJSON(k) || {}
      localStorage.setItem(k, JSON.stringify(mesclar(atual, buf)))
    }
  } catch { /* storage bloqueado */ } finally {
    enviando = false
  }
}

export function iniciarUso() {
  if (ligado) return
  if (estaEmbutido()) return
  if (!import.meta.env.PROD && import.meta.env.VITE_USO !== 'on') return
  ligado = true
  document.addEventListener('click', onClique, true)
  setInterval(() => enviarUso(), 60000)
  window.addEventListener('online', () => enviarUso())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') enviarUso({ keepalive: true })
  })
}
