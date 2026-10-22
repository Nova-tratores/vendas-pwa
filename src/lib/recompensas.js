// Efeitos das recompensas (tudo local, funciona offline no campo).
// - vibração: navigator.vibrate (Android; no iPhone pelo navegador não existe)
// - som: DESLIGADO por padrão (o vendedor usa o app na frente do cliente);
//   gerado na hora com Web Audio, sem arquivo para baixar
// - confete: elementos com animação CSS, some sozinho em ~1 s

const CHAVE_SOM = 'nt-som-recompensas'

export function somLigado() {
  try { return localStorage.getItem(CHAVE_SOM) === '1' } catch { return false }
}
export function ligarSom(ligado) {
  try { localStorage.setItem(CHAVE_SOM, ligado ? '1' : '0') } catch { /* sem storage */ }
}

export function vibrar(padrao) {
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(padrao) } catch { /* sem suporte */ }
}

/** "Tic" de campo preenchido: vibração curtinha. */
export const tic = () => vibrar(12)

/** Motor de trator dando partida (~0,9 s), só com o som ligado. */
export function somPartida() {
  if (!somLigado()) return
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const t0 = ctx.currentTime
    const osc = ctx.createOscillator()
    const ganho = ctx.createGain()
    osc.type = 'sawtooth'
    // arranque: rotação sobe e assenta na marcha lenta
    osc.frequency.setValueAtTime(38, t0)
    osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.35)
    osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.9)
    ganho.gain.setValueAtTime(0.0001, t0)
    ganho.gain.exponentialRampToValueAtTime(0.25, t0 + 0.08)
    ganho.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9)
    osc.connect(ganho).connect(ctx.destination)
    osc.start(t0)
    osc.stop(t0 + 0.92)
    osc.onended = () => ctx.close()
  } catch { /* sem áudio */ }
}

const CORES = ['#16a34a', '#f59e0b', '#dc2626', '#2563eb', '#eab308']

/** Explosão de confete no centro da tela (1 s, não bloqueia toques). */
export function confete({ dourado = false } = {}) {
  if (typeof document === 'undefined') return
  const camada = document.createElement('div')
  camada.setAttribute('aria-hidden', 'true')
  camada.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden'
  const cores = dourado ? ['#eab308', '#f59e0b', '#fde047', '#ca8a04'] : CORES
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('span')
    const ang = (Math.PI * 2 * i) / 40 + Math.random() * 0.3
    const dist = 120 + Math.random() * 160
    p.style.cssText = `position:absolute;left:50%;top:45%;width:8px;height:12px;border-radius:2px;background:${cores[i % cores.length]};`
      + 'transition:transform 0.95s cubic-bezier(.15,.8,.3,1),opacity 0.95s ease-in;'
    camada.appendChild(p)
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 80}px) rotate(${Math.random() * 540}deg)`
      p.style.opacity = '0'
    })
  }
  document.body.appendChild(camada)
  setTimeout(() => camada.remove(), 1100)
}

/** Visita completa (verde): confete + vibração longa + som (se ligado). */
export function celebrarVisitaCompleta() {
  confete()
  vibrar([40, 40, 120])
  somPartida()
}
