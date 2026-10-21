// Mosaico do topo de Oportunidades (port da variante C de TopoOportunidades.tsx):
// um bloco por motivo, área proporcional à quantidade (raiz quadrada + piso, para o
// bloco pequeno não sumir). Toque filtra a lista; o escolhido pulsa.
import { useEffect, useMemo, useRef, useState } from 'react'
import Icone from '../../Icone'
import { ICONE_REGRA, REGRAS } from '../../../lib/iv/fonte'
import { Conta, FRASE_REGRA } from './comum'

function squarify(regras, porRegra, W, H) {
  const maxR = Math.sqrt(Math.max(1, ...regras.map((r) => porRegra[r] || 0)))
  const peso = (r) => Math.max(Math.sqrt(porRegra[r] || 0), maxR * 0.42)
  const tot = regras.reduce((a, r) => a + peso(r), 0) || 1
  const resto = regras.map((r) => ({ r, a: (peso(r) / tot) * W * H }))
  const out = []
  let x = 0, y = 0, w = W, h = H
  const pior = (fila, lado) => {
    const soma = fila.reduce((a, i) => a + i.a, 0)
    return Math.max(...fila.map((i) => Math.max((lado * lado * i.a) / (soma * soma), (soma * soma) / (lado * lado * i.a))))
  }
  while (resto.length) {
    const lado = Math.min(w, h)
    const fila = [resto.shift()]
    while (resto.length && pior([...fila, resto[0]], lado) <= pior(fila, lado)) fila.push(resto.shift())
    const soma = fila.reduce((a, i) => a + i.a, 0)
    if (w >= h) {
      const lw = soma / h; let yy = y
      for (const i of fila) { const ih = i.a / lw; out.push({ r: i.r, x: (x / W) * 100, y: (yy / H) * 100, w: (lw / W) * 100, h: (ih / H) * 100 }); yy += ih }
      x += lw; w -= lw
    } else {
      const lh = soma / w; let xx = x
      for (const i of fila) { const iw = i.a / lh; out.push({ r: i.r, x: (xx / W) * 100, y: (y / H) * 100, w: (iw / W) * 100, h: (lh / H) * 100 }); xx += iw }
      y += lh; h -= lh
    }
  }
  return out
}

export default function MosaicoRegras({ porRegra, ativo, onEscolher, altura = 300 }) {
  const caixa = useRef(null)
  const [tam, setTam] = useState({ w: 380, h: altura })
  useEffect(() => {
    const el = caixa.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => setTam({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const regras = useMemo(() => Object.keys(REGRAS).filter((r) => (porRegra[r] || 0) > 0).sort((a, b) => porRegra[b] - porRegra[a]), [porRegra])
  const rets = useMemo(() => squarify(regras, porRegra, tam.w || 380, tam.h || altura), [regras, porRegra, tam.w, tam.h, altura])

  return (
    <div ref={caixa} className="relative" style={{ height: altura }}>
      <style>{`
        .mz-b { position: absolute; border: 0; text-align: left; overflow: hidden; color: #fefefe; border-radius: 16px;
          transition: transform .3s cubic-bezier(.2,1.3,.3,1), opacity .3s, filter .3s }
        .mz-b:active { transform: scale(.97) }
        .mz-on { animation: mzPulso 1.8s ease-in-out infinite }
        @keyframes mzPulso { 0%, 100% { box-shadow: inset 0 0 0 3px rgba(255,255,255,.9), 0 0 0 0 rgba(15,23,42,.25) } 50% { box-shadow: inset 0 0 0 3px rgba(255,255,255,.9), 0 0 0 6px rgba(15,23,42,0) } }
        @media (prefers-reduced-motion: reduce) { .mz-on { animation: none !important } }
      `}</style>
      {rets.map((t, i) => {
        const cor = REGRAS[t.r].cor
        const on = ativo === t.r, apaga = !!ativo && !on
        const wpx = (t.w / 100) * tam.w - 5, hpx = (t.h / 100) * tam.h - 5
        const base = Math.min(wpx * 0.9, hpx)
        const num = Math.max(20, Math.min(46, base * 0.34))
        const nome = Math.max(11, Math.min(16, num * 0.42, wpx / 7))
        const pad = Math.max(8, Math.min(14, base * 0.09))
        const cabeFrase = hpx > num + nome * 2 + 56 && wpx > 120
        return (
          <button key={t.r} type="button" onClick={() => onEscolher(t.r)} title={`${REGRAS[t.r].rotulo}: ${REGRAS[t.r].explicacao}`}
            className={`mz-b iv-cresce iv-brilho ${on ? 'mz-on' : ''}`}
            style={{ '--d': `${i * 0.9}s`, animationDelay: `${i * 70}ms`, left: `calc(${t.x}% + 2.5px)`, top: `calc(${t.y}% + 2.5px)`, width: `calc(${t.w}% - 5px)`, height: `calc(${t.h}% - 5px)`,
              padding: pad, background: `linear-gradient(135deg, ${cor}, ${cor}d9 60%, ${cor}b3)`, filter: apaga ? 'grayscale(.75) opacity(.4)' : undefined }}>
            <span className="iv-flutua absolute pointer-events-none" style={{ right: pad * 0.7, bottom: pad * 0.5, opacity: 0.22, animationDelay: `${i * 0.6}s` }}>
              <Icone nome={ICONE_REGRA[t.r]} size={Math.max(22, Math.min(hpx * 0.42, 64))} />
            </span>
            <span className="relative block font-extrabold tabular-nums leading-none" style={{ fontSize: num, letterSpacing: '-.02em' }}><Conta valor={porRegra[t.r] || 0} /></span>
            <span className="relative block font-extrabold leading-tight mt-1" style={{ fontSize: nome }}>{REGRAS[t.r].rotulo}</span>
            {cabeFrase && <span className="relative block leading-snug mt-0.5 opacity-90" style={{ fontSize: 12 }}>{FRASE_REGRA[t.r]}</span>}
          </button>
        )
      })}
    </div>
  )
}
