// Mapa de bolhas dos municípios (port de vivo/MapaBolhas.tsx do Portal), na posição real.
//   tamanho = área plantada (ou a medida da linha escolhida) · cor = FOCO
//   anel verde = nossa presença · onda = foco 70+ · linhas tracejadas da loja até os 5 de maior foco
// Toque numa bolha = abre o raio-x da cidade.
import { useMemo } from 'react'
import { corFoco } from './comum'

const PAD = 38
const PIRAJU = 3538808

export default function MapaBolhas({ municipios, medida, selecionado, onSelecionar, largura = 400, altura = 360 }) {
  const W = largura, H = altura
  const pts = useMemo(() => {
    const com = municipios.filter((m) => m.centro)
    if (!com.length) return []
    const lats = com.map((m) => m.centro[0]), lngs = com.map((m) => m.centro[1])
    const [la0, la1, lo0, lo1] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
    const med = medida || ((m) => m.areaPlantadaHa)
    const maxA = Math.max(1, ...com.map(med))
    return com.map((m) => ({
      m,
      x: PAD + ((m.centro[1] - lo0) / ((lo1 - lo0) || 1)) * (W - 2 * PAD),
      y: PAD + ((la1 - m.centro[0]) / ((la1 - la0) || 1)) * (H - 2 * PAD),
      r: 7 + Math.sqrt(med(m) / maxA) * 22,
    }))
  }, [municipios, medida, W, H])
  const loja = pts.find((p) => p.m.ibge === PIRAJU)
  const top = [...pts].sort((a, b) => b.m.foco - a.m.foco).slice(0, 5)

  if (!pts.length) return <div className="text-center text-slate-500 text-sm py-8">Mapa indisponível.</div>
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" role="img" aria-label="Mapa de bolhas dos municípios">
        <defs>
          <radialGradient id="ivtFundo" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity=".06" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
          </radialGradient>
          <filter id="ivtSombra" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodOpacity=".2" /></filter>
        </defs>
        <rect x="0" y="0" width={W} height={H} rx="16" fill="url(#ivtFundo)" />
        {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={((i + 1) * W) / 8} y1="0" x2={((i + 1) * W) / 8} y2={H} stroke="#94a3b8" strokeOpacity=".12" />)}
        {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1="0" y1={((i + 1) * H) / 7} x2={W} y2={((i + 1) * H) / 7} stroke="#94a3b8" strokeOpacity=".12" />)}
        {loja && top.filter((t) => t.m.ibge !== PIRAJU).map((t) => (
          <line key={`l${t.m.ibge}`} x1={loja.x} y1={loja.y} x2={t.x} y2={t.y} stroke="#ef4444" strokeOpacity=".45" strokeWidth="1.6" strokeDasharray="5 6" />
        ))}
        {[...pts].sort((a, b) => b.r - a.r).map(({ m, x, y, r }, i) => {
          const cor = corFoco(m.foco)
          const sel = selecionado === m.ibge
          const apaga = selecionado != null && !sel
          const pen = Math.min(1, (m.penetracao ?? 0) / 0.05)
          const circ = 2 * Math.PI * (r + 3.5)
          return (
            <g key={m.ibge} onClick={() => onSelecionar(m)} style={{ cursor: 'pointer', opacity: apaga ? 0.4 : 1, transition: 'opacity .3s' }}
              role="button" aria-label={`${m.nome}, foco ${m.foco}`}>
              <g className="ivt-cresce" style={{ animationDelay: `${i * 40}ms` }}>
                {/* área de toque maior que a bolha */}
                <circle cx={x} cy={y} r={Math.max(r + 6, 20)} fill="transparent" />
                {m.foco >= 70 && <circle cx={x} cy={y} r={r} fill="none" stroke={cor} strokeWidth="2" className="ivt-onda" />}
                <circle cx={x} cy={y} r={r} fill={cor} fillOpacity={sel ? 0.95 : 0.8} stroke={sel ? '#0f172a' : '#ffffff'} strokeWidth={sel ? 3 : 1.5} filter="url(#ivtSombra)" />
                <circle cx={x} cy={y} r={r + 3.5} fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${circ * pen} ${circ}`} transform={`rotate(-90 ${x} ${y})`} />
                {r > 13 && <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="800" fill="#ffffff" style={{ pointerEvents: 'none' }}>{m.foco}</text>}
                <text x={x} y={y + r + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155"
                  style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: 'rgba(255,255,255,.9)', strokeWidth: 3 }}>
                  {m.ibge === PIRAJU ? 'Loja · ' : ''}{m.nome.length > 14 ? `${m.nome.slice(0, 13)}.` : m.nome}
                </text>
              </g>
            </g>
          )
        })}
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-slate-500 mt-1">
        {[['#ef4444', 'foco 70+'], ['#f59e0b', '55 a 69'], ['#3b82f6', '40 a 54'], ['#94a3b8', 'menos']].map(([c, t]) => (
          <span key={t} className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{t}</span>
        ))}
        <span className="inline-flex items-center gap-1"><span className="w-3 border-t-[3px] border-green-600" />anel = nossa presença</span>
        <span>bolha maior = mais área</span>
      </div>
    </div>
  )
}
