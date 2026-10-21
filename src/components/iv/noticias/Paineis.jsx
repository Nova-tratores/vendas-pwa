// Painéis da coluna do boletim: clima das notícias (medidor), previsões do Focus, tempo na região, fontes.
import { useState } from 'react'
import { Binoculars, CircleCheck, CircleX, Cloud, CloudRain, CloudSunRain, ExternalLink, Gauge, Minus, Satellite, Snowflake, Sun, TrendingDown, TrendingUp } from 'lucide-react'
import { SEMANA } from './util'
import { Bloco } from './Pecas'

/** Medidor com ponteiro de "pede atenção" a "dia bom": saldo (boas - de atenção) / total. Os números filtram a lista. */
export function ClimaNoticias({ ns, fTend, setFTend, atraso = 0 }) {
  const b = ns.filter((n) => n.tendencia === 'boa').length, r = ns.filter((n) => n.tendencia === 'ruim').length, t = Math.max(1, ns.length)
  const saldo = (b - r) / t
  const ang = saldo * 80
  const veredito = saldo >= 0.25 ? { txt: 'Dia bom para vender', cor: '#15803d', sub: 'mais notícias boas que ruins' }
    : saldo <= -0.25 ? { txt: 'Dia pede atenção', cor: '#b91c1c', sub: 'mais notícias de atenção que boas' }
      : { txt: 'Dia equilibrado', cor: '#475569', sub: 'boas e ruins quase empatadas' }
  const W = 200, R = 80, cx = W / 2, cy = 92
  const ponto = (graus, raio) => { const a = ((graus - 90) * Math.PI) / 180; return [cx + raio * Math.cos(a), cy + raio * Math.sin(a)] }
  const arco = (de, ate) => { const [x1, y1] = ponto(de, R), [x2, y2] = ponto(ate, R); return `M${x1},${y1} A${R},${R} 0 0 1 ${x2},${y2}` }
  const chips = [
    { k: 'ruim', n: r, nome: 'de atenção', cor: '#dc2626' }, { k: '', n: t - b - r, nome: 'neutras', cor: '#64748b' }, { k: 'boa', n: b, nome: 'boas', cor: '#16a34a' },
  ]
  return (
    <Bloco titulo="Clima das notícias do dia" icone={Gauge} atraso={atraso}>
      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${W} 112`} className="w-[46%] max-w-[190px] shrink-0" aria-hidden="true">
          <defs>
            <linearGradient id="ntvClimaGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#dc2626" /><stop offset=".5" stopColor="#cbd5e1" /><stop offset="1" stopColor="#16a34a" /></linearGradient>
          </defs>
          <path d={arco(-90, 90)} fill="none" stroke="url(#ntvClimaGrad)" strokeWidth="15" strokeLinecap="round" />
          {[-60, -30, 0, 30, 60].map((g) => { const [x1, y1] = ponto(g, R - 13), [x2, y2] = ponto(g, R - 19); return <line key={g} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" /> })}
          <g className="ntv-ponteiro" style={{ transform: `rotate(${ang}deg)`, transformOrigin: `${cx}px ${cy}px` }}>
            <line x1={cx} y1={cy} x2={cx} y2={cy - R + 22} stroke="#111111" strokeWidth="4" strokeLinecap="round" />
          </g>
          <circle cx={cx} cy={cy} r="8" fill="#111111" /><circle cx={cx} cy={cy} r="3" fill="#fefefe" />
          <text x={ponto(-90, R)[0] - 6} y={cy + 19} fontSize="11" fill="#b91c1c" fontWeight="800">atenção</text>
          <text x={ponto(90, R)[0] + 6} y={cy + 19} fontSize="11" fill="#15803d" fontWeight="800" textAnchor="end">bom</text>
        </svg>
        <div className="min-w-0">
          <div className="text-[17px] font-black leading-tight" style={{ color: veredito.cor }}>{veredito.txt}</div>
          <div className="text-[12px] text-slate-500 mt-0.5">{veredito.sub}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">Toque num número para ver só aquelas notícias.</div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mt-3">
        {chips.map((c) => {
          const on = c.k && fTend === c.k
          return (
            <button key={c.nome} type="button" disabled={!c.k} onClick={() => c.k && setFTend(on ? '' : c.k)}
              className="grid justify-items-center py-2 rounded-xl border transition active:scale-95 disabled:active:scale-100"
              style={{ borderColor: on ? c.cor : '#e2e8f0', background: on ? c.cor : 'transparent' }} aria-pressed={c.k ? !!on : undefined}>
              <b className="text-[20px] leading-none" style={{ color: on ? '#fefefe' : c.cor }}>{c.n}</b>
              <span className="text-[11px] font-semibold mt-0.5" style={{ color: on ? '#fefefe' : '#64748b' }}>{c.nome}</span>
            </button>
          )
        })}
      </div>
    </Bloco>
  )
}

const valFocus = (f, n) => (f.indicador === 'Câmbio' ? `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`)

export function Previsoes({ focus, atraso = 0 }) {
  if (!focus?.length) return null
  return (
    <Bloco titulo="O que o mercado prevê" icone={Binoculars} atraso={atraso}>
      <div className="text-[12px] text-slate-500 -mt-1 mb-1.5">Boletim Focus do Banco Central · mediana das previsões, comparada com 4 semanas antes</div>
      <div>
        {focus.map((f) => {
          const sobe = f.anterior != null && f.mediana > f.anterior, cai = f.anterior != null && f.mediana < f.anterior
          const I = sobe ? TrendingUp : cai ? TrendingDown : Minus
          return (
            <div key={`${f.indicador}${f.ano}`} className="grid grid-cols-[1fr_auto_auto] gap-2.5 items-center py-2 border-b border-dashed border-slate-200 last:border-0 text-[14px] text-slate-900">
              <span className="min-w-0">{f.indicador === 'Câmbio' ? 'Dólar' : f.indicador} <small className="text-slate-500">{f.ano}</small>
                {f.anterior != null && f.anterior !== f.mediana && <small className="block text-[11px] text-slate-400">era {valFocus(f, f.anterior)}</small>}
              </span>
              <b className="tabular-nums">{valFocus(f, f.mediana)}</b>
              <I size={16} aria-label={sobe ? 'subiu' : cai ? 'caiu' : 'igual'} style={{ color: sobe ? '#ea580c' : cai ? '#2563eb' : '#94a3b8' }} />
            </div>
          )
        })}
      </div>
      <a href="https://www.bcb.gov.br/publicacoes/focus" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-bold text-sky-700">
        Ver o Boletim Focus <ExternalLink size={12} aria-hidden="true" />
      </a>
    </Bloco>
  )
}

function IconeTempo({ d }) {
  if (d.chuva_mm >= 10) return <CloudRain size={20} style={{ color: '#2563eb' }} aria-hidden="true" />
  if (d.chuva_mm >= 1) return <CloudSunRain size={20} style={{ color: '#3b82f6' }} aria-hidden="true" />
  if (d.tmin <= 3) return <Snowflake size={20} style={{ color: '#0891b2' }} aria-hidden="true" />
  if (d.prob >= 30) return <Cloud size={20} style={{ color: '#94a3b8' }} aria-hidden="true" />
  return <Sun size={20} style={{ color: '#f59e0b' }} aria-hidden="true" />
}

/** Previsão de 7 dias por cidade (Piraju primeiro), com barra de chuva e alertas. */
export function TempoRegiao({ clima, atraso = 0 }) {
  const [i, setI] = useState(0)
  const [dSel, setDSel] = useState(0)
  if (!clima?.length) return null
  const c = clima[Math.min(i, clima.length - 1)]
  const max = Math.max(10, ...c.dias.map((d) => d.chuva_mm))
  const sel = c.dias[Math.min(dSel, c.dias.length - 1)]
  const dtSel = new Date(`${sel.data}T12:00:00`)
  return (
    <Bloco titulo="Tempo na região · 7 dias" icone={CloudSunRain} atraso={atraso}>
      <div className="flex gap-1.5 overflow-x-auto ntv-sem-barra -mx-1 px-1 mb-3">
        {clima.map((x, k) => (
          <button key={x.cidade} type="button" onClick={() => setI(k)}
            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-bold whitespace-nowrap transition ${k === i ? 'bg-cyan-600 text-[#fefefe]' : 'bg-slate-100 text-slate-500'}`}>
            {x.cidade}
          </button>
        ))}
      </div>
      <div key={c.cidade} className="grid grid-cols-7 gap-0.5">
        {c.dias.map((d, k) => {
          const dt = new Date(`${d.data}T12:00:00`)
          return (
            <button key={d.data} type="button" onClick={() => setDSel(k)}
              className={`ntv-sobe grid justify-items-center gap-1 py-1.5 rounded-xl transition ${k === dSel ? 'bg-sky-50 ring-1 ring-sky-200' : ''}`}
              style={{ animationDelay: `${k * 45}ms` }} aria-label={`${SEMANA[dt.getDay()]}: ${Math.round(d.chuva_mm)} mm`}>
              <small className="text-[10.5px] uppercase text-slate-500 font-semibold">{k === 0 ? 'hoje' : SEMANA[dt.getDay()].slice(0, 3)}</small>
              <IconeTempo d={d} />
              <span className="w-2 h-9 rounded-full bg-slate-100 flex items-end overflow-hidden">
                <span className="ntv-chuva block w-full rounded-full" style={{ height: `${(d.chuva_mm / max) * 100}%`, background: '#3b82f6', animationDelay: `${k * 45}ms` }} />
              </span>
              <small className="text-[10.5px] text-slate-500"><b className="text-slate-800">{d.chuva_mm >= 0.5 ? Math.round(d.chuva_mm) : 0}</b> mm</small>
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-[12.5px] text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
        <b className="text-slate-800">{SEMANA[dtSel.getDay()].replace(/^./, (x) => x.toUpperCase())} {sel.data.slice(8, 10)}/{sel.data.slice(5, 7)}</b>
        {' · '}{Math.round(sel.chuva_mm)} mm{sel.prob != null ? ` (${sel.prob}% de chance)` : ''} · {Math.round(sel.tmin)}° a {Math.round(sel.tmax)}°
      </div>
      {c.alertas.map((a) => (
        <div key={a} className={`mt-2 text-[12.5px] font-semibold rounded-lg px-3 py-2 ${/bo[am] para|na medida/i.test(a) ? 'text-green-800 bg-green-50' : 'text-amber-800 bg-amber-50'}`}>{a}</div>
      ))}
      <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2.5 text-[12px] font-bold text-sky-700">
        Fonte: Open-Meteo <ExternalLink size={12} aria-hidden="true" />
      </a>
    </Bloco>
  )
}

const NOME_FONTE = { bcb: 'Banco Central (dólar e Selic)', conab: 'CONAB (preços)', focus: 'Boletim Focus', clima: 'Open-Meteo (tempo)', noticias: 'Sites de notícias do agro', ia: 'IA (resumo e impacto)' }
export function Fontes({ fontes, atraso = 0 }) {
  const lista = Object.entries(fontes || {})
  if (!lista.length) return null
  return (
    <Bloco titulo="Fontes lidas pelo robô" icone={Satellite} atraso={atraso}>
      <div className="grid gap-1.5">
        {lista.sort(([, a], [, z]) => a.localeCompare(z)).map(([k, v]) => (
          <div key={k} className={`flex items-center gap-2 text-[13px] ${v === 'ok' ? 'text-slate-800' : 'text-red-700'}`}>
            {v === 'ok' ? <CircleCheck size={15} className="text-green-600 shrink-0" aria-hidden="true" /> : <CircleX size={15} className="text-red-600 shrink-0" aria-hidden="true" />}
            {NOME_FONTE[k] || k}{v === 'erro' && ' (fora do ar)'}
          </div>
        ))}
      </div>
    </Bloco>
  )
}
