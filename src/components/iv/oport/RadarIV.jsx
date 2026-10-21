// Radar de clientes (port de vivo/RadarClientes.tsx do Portal, no tamanho do celular).
//   lado (quadrante) = tipo de conversa (Renovar · Vender mais · Conquistar · Recuperar)
//   distância do centro = temperatura (centro = score alto = ligar primeiro)
//   tamanho = quanto ele movimenta (peças 12 m + propostas abertas + máquinas)
// A varredura gira e acende cada ponto quando passa por ele. Toque no lado filtra;
// toque no ponto mostra o cliente embaixo.
import { useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { QUADRANTES, hash, quadranteDe, tipoDe, Temperatura } from './comum'

const S = 400, M = S / 2, RMIN = 22, RMAX = 146, VOLTA = 7

export default function RadarIV({ clientes, filtro, onFiltro, onAbrir }) {
  const [sel, setSel] = useState(null)
  const pontos = useMemo(() => clientes.filter((c) => c.score > 0 && quadranteDe(c)).map((c) => {
    const q = quadranteDe(c)
    const qi = QUADRANTES.findIndex((x) => x.id === q)
    const ang = qi * 90 + 8 + hash(c.chave) * 74
    const r = RMIN + (1 - Math.min(100, c.score) / 100) * (RMAX - RMIN) + (hash(c.chave + 'r') - 0.5) * 26
    const rad = ((ang - 90) * Math.PI) / 180
    const peso = c.pecas12m + c.valorPropostasAbertas + c.valorMaquinas / 10
    return { c, q, ang, x: M + r * Math.cos(rad), y: M + r * Math.sin(rad), tam: 3.4 + Math.min(6.5, Math.log10(peso + 1) * 1.05) }
  }), [clientes])
  const conta = (q) => pontos.filter((p) => p.q === q).length
  const R = RMAX + 10
  const escolhido = sel && pontos.find((p) => p.c.chave === sel)

  return (
    <div>
      <div className="relative mx-auto" style={{ width: '100%', maxWidth: 380, aspectRatio: '1' }}>
        <svg viewBox={`0 0 ${S} ${S}`} width="100%" height="100%" role="img" aria-label="Radar de clientes">
          <defs>
            <radialGradient id="ivRadarFundo"><stop offset="0%" stopColor="#ef4444" stopOpacity=".12" /><stop offset="60%" stopColor="#8b5cf6" stopOpacity=".04" /><stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" /></radialGradient>
            <linearGradient id="ivRadarVarre" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ef4444" stopOpacity="0" /><stop offset="100%" stopColor="#ef4444" stopOpacity=".3" /></linearGradient>
          </defs>
          <circle cx={M} cy={M} r={R} fill="url(#ivRadarFundo)" />
          {QUADRANTES.map((q, i) => {
            const a0 = ((i * 90 - 90) * Math.PI) / 180, a1 = (((i + 1) * 90 - 90) * Math.PI) / 180
            const meio = ((i * 90 + 45 - 90) * Math.PI) / 180
            const apaga = filtro && filtro !== q.id
            const lx = M + (R + 22) * Math.cos(meio), ly = M + (R + 22) * Math.sin(meio)
            return (
              <g key={q.id} style={{ cursor: 'pointer' }} onClick={() => onFiltro(filtro === q.id ? '' : q.id)}>
                <path d={`M${M},${M} L${M + R * Math.cos(a0)},${M + R * Math.sin(a0)} A${R},${R} 0 0 1 ${M + R * Math.cos(a1)},${M + R * Math.sin(a1)} Z`}
                  fill={q.cor} fillOpacity={filtro === q.id ? 0.16 : apaga ? 0.01 : 0.05} style={{ transition: 'fill-opacity .3s' }} />
                <text x={lx} y={ly - 4} fill={q.cor} fontSize="15" fontWeight="900" textAnchor="middle" opacity={apaga ? 0.3 : 1}>{q.nome.toUpperCase()}</text>
                <text x={lx} y={ly + 12} fill="#64748b" fontSize="12.5" fontWeight="700" textAnchor="middle" opacity={apaga ? 0.3 : 1}>{conta(q.id)} clientes</text>
              </g>
            )
          })}
          {[0.25, 0.5, 0.75, 1].map((k) => <circle key={k} cx={M} cy={M} r={RMIN + (RMAX - RMIN) * k} fill="none" stroke="#94a3b8" strokeOpacity={k === 1 ? 0.5 : 0.25} strokeDasharray={k === 1 ? undefined : '3 6'} />)}
          <text x={M + 4} y={M - RMIN - (RMAX - RMIN) * 0.25 + 11} fill="#94a3b8" fontSize="10.5">quente</text>
          <text x={M + 4} y={M - RMAX + 11} fill="#94a3b8" fontSize="10.5">morno</text>
          <line x1={M} y1={M - R} x2={M} y2={M + R} stroke="#94a3b8" strokeOpacity=".25" />
          <line x1={M - R} y1={M} x2={M + R} y2={M} stroke="#94a3b8" strokeOpacity=".25" />
          <g className="iv-varre" style={{ transformOrigin: `${M}px ${M}px`, animationDuration: `${VOLTA}s` }}>
            <path d={`M${M},${M} L${M},${M - R} A${R},${R} 0 0 1 ${M + R * Math.sin(Math.PI / 4)},${M - R * Math.cos(Math.PI / 4)} Z`} fill="url(#ivRadarVarre)" transform={`rotate(-45 ${M} ${M})`} />
            <line x1={M} y1={M} x2={M} y2={M - R} stroke="#ef4444" strokeWidth="2" strokeOpacity=".75" />
          </g>
          {pontos.map(({ c, q, ang, x, y, tam }) => {
            const cor = QUADRANTES.find((z) => z.id === q).cor
            const apaga = filtro && filtro !== q
            const on = sel === c.chave
            return (
              <g key={c.chave} style={{ cursor: 'pointer', opacity: apaga ? 0.12 : 1, transition: 'opacity .3s' }} onClick={() => setSel(on ? null : c.chave)}>
                <circle cx={x} cy={y} r={tam + 9} fill="transparent" />
                {c.score >= 50 && !apaga && <circle cx={x} cy={y} r={tam} fill="none" stroke={cor} strokeWidth="1.5" className="iv-onda" style={{ animationDelay: `${(ang / 360) * VOLTA}s` }} />}
                <circle cx={x} cy={y} r={tam} fill={cor} stroke={on ? '#0f172a' : '#fefefe'} strokeWidth={on ? 2.4 : 1.2} className="iv-blip"
                  style={{ animationDuration: `${VOLTA}s`, animationDelay: `${(ang / 360) * VOLTA}s` }} />
              </g>
            )
          })}
          <circle cx={M} cy={M} r="6" fill="#ef4444" />
          <circle cx={M} cy={M} r="6" fill="none" stroke="#ef4444" className="iv-onda" />
        </svg>
      </div>
      {escolhido ? (
        <button type="button" onClick={() => onAbrir(escolhido.c)} className="iv-entra w-full text-left rounded-2xl border border-slate-200 bg-white p-3 flex items-center gap-3 iv-toque mt-1">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: tipoDe(escolhido.c).cor }} />
          <span className="min-w-0 flex-1">
            <b className="block text-[14.5px] text-slate-900 truncate">{escolhido.c.nome}</b>
            <span className="block text-[12.5px] text-slate-500 truncate">{escolhido.c.oportunidades[0]?.titulo}</span>
          </span>
          <Temperatura score={escolhido.c.score} />
          <ChevronRight size={18} className="text-slate-400" aria-hidden="true" />
        </button>
      ) : (
        <p className="text-center text-[12px] text-slate-400 mt-1">Toque num ponto para ver o cliente; toque num lado para filtrar.</p>
      )}
    </div>
  )
}
