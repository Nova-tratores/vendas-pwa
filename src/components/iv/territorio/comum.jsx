// Peças comuns das telas Prospecção e Municípios (Inteligência de Vendas no app).
// Mesmo visual do Portal: cartões brancos com borda leve, números que sobem contando,
// barras que crescem, painel que sobe de baixo. Respeita prefers-reduced-motion.
import { useEffect, useRef, useState } from 'react'
import { CircleHelp, X } from 'lucide-react'

// ── formatos ────────────────────────────────────────────────────────────────
export const num = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Math.round(Number(v)).toLocaleString('pt-BR'))
export const compacto = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} bi`
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (Math.abs(n) >= 1e4) return `${Math.round(n / 1e3).toLocaleString('pt-BR')} mil`
  return Math.round(n).toLocaleString('pt-BR')
}
export const reais = (v) => (v ? `R$ ${compacto(v)}` : 'R$ 0')
export const pct = (v, casas = 1) => (v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`)

// ── cores (mesmas do mapa do CAR no Portal) ─────────────────────────────────
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const CORES_CULTURA = [
  [/soja/, '#facc15'], [/milho/, '#fb923c'], [/sorgo/, '#f97316'], [/trigo/, '#eab308'], [/feijao/, '#a16207'],
  [/algodao/, '#cbd5e1'], [/arroz/, '#7dd3fc'], [/cana/, '#84cc16'], [/cafe/, '#7c2d12'], [/laranja|citros|limao/, '#f59e0b'],
  [/pastagem|pecuaria/, '#22c55e'], [/eucalipto|silvicultura|pinus/, '#166534'], [/banana|fruta|uva|abacate|manga/, '#c084fc'],
  [/mandioca/, '#d97706'], [/horti/, '#f472b6'],
]
export function corCultura(nome) {
  const t = semAcento(nome)
  for (const [re, cor] of CORES_CULTURA) if (re.test(t)) return cor
  return '#94a3b8'
}
export const PRIORIDADES = {
  alta: { rotulo: 'Alta', cor: '#dc2626', fundo: 'bg-red-50 text-red-700', opacidade: 0.78 },
  media: { rotulo: 'Média', cor: '#d97706', fundo: 'bg-amber-50 text-amber-700', opacidade: 0.52 },
  baixa: { rotulo: 'Baixa', cor: '#64748b', fundo: 'bg-slate-100 text-slate-600', opacidade: 0.3 },
}
export const corFoco = (f) => (f >= 70 ? '#ef4444' : f >= 55 ? '#f59e0b' : f >= 40 ? '#3b82f6' : '#94a3b8')

// ── animação ────────────────────────────────────────────────────────────────
export const reduzido = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useContador(alvo, ms = 900) {
  const [v, setV] = useState(0)
  const de = useRef(0)
  useEffect(() => {
    const destino = Number(alvo) || 0
    if (reduzido()) { setV(destino); de.current = destino; return undefined }
    const ini = performance.now(), origem = de.current
    let raf = 0
    const passo = (t) => {
      const k = Math.min(1, (t - ini) / ms)
      setV(origem + (destino - origem) * (1 - Math.pow(1 - k, 3)))
      if (k < 1) raf = requestAnimationFrame(passo)
      else de.current = destino
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return v
}

/** Número que sobe contando; `formato` recebe o valor parcial. */
export function Conta({ valor, formato = num }) {
  return <>{formato(useContador(valor))}</>
}

/** CSS das animações (uma vez por tela). */
export function EstiloTerritorio() {
  return (
    <style>{`
      @keyframes ivt-barra { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      @keyframes ivt-entra { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
      @keyframes ivt-sobe { from { transform: translateY(100%) } to { transform: none } }
      @keyframes ivt-cresce { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: scale(1) } }
      @keyframes ivt-onda { 0% { opacity: .7; transform: scale(1) } 100% { opacity: 0; transform: scale(1.9) } }
      @keyframes ivt-cursor { 50% { opacity: 0 } }
      .ivt-barra { transform-origin: left center; animation: ivt-barra .8s cubic-bezier(.2,.8,.2,1) both }
      .ivt-entra { animation: ivt-entra .35s ease-out both }
      .ivt-sobe { animation: ivt-sobe .28s cubic-bezier(.2,.8,.2,1) both }
      .ivt-cresce { animation: ivt-cresce .5s cubic-bezier(.2,.9,.3,1.2) both; transform-box: fill-box; transform-origin: center }
      .ivt-onda { animation: ivt-onda 2.2s ease-out infinite; transform-box: fill-box; transform-origin: center }
      .ivt-cursor { animation: ivt-cursor 1s step-end infinite }
      .ivt-mapa .leaflet-container { font-family: inherit; background: #eef2f7 }
      @media (prefers-reduced-motion: reduce) {
        .ivt-barra, .ivt-entra, .ivt-sobe, .ivt-cresce { animation: none }
        .ivt-onda, .ivt-cursor { animation: none; opacity: 0 }
      }
    `}</style>
  )
}

// ── peças visuais ───────────────────────────────────────────────────────────
export function Cartao({ titulo, icone: IconeT, extra, children, className = '' }) {
  return (
    <section className={`bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm ${className}`}>
      {(titulo || extra) && (
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2 min-w-0">
            {IconeT && <IconeT size={17} className="text-red-600 shrink-0" aria-hidden="true" />}
            <span className="truncate">{titulo}</span>
          </h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ rotulo, valor, formato, sub, cor = '#0f172a', icone: IconeK, atraso = 0, onClick, ativo }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`ivt-entra text-left bg-white border rounded-2xl p-3 min-w-0 transition ${ativo ? 'border-slate-900 shadow-md' : 'border-slate-200 shadow-sm'} ${onClick ? 'active:scale-[.98]' : ''}`}
      style={{ animationDelay: `${atraso}ms` }}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {IconeK && <IconeK size={14} style={{ color: cor }} aria-hidden="true" />}
        <span className="truncate">{rotulo}</span>
      </div>
      <div className="text-[20px] font-bold leading-tight mt-1 truncate" style={{ color: cor }}>
        {typeof valor === 'number' ? <Conta valor={valor} formato={formato} /> : valor}
      </div>
      {sub && <div className="text-[11.5px] text-slate-500 mt-0.5 truncate">{sub}</div>}
    </Tag>
  )
}

export function Chip({ ativo, onClick, children, cor }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold border transition ${
        ativo ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'
      }`}
    >
      {cor && <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ background: cor }} aria-hidden="true" />}
      {children}
    </button>
  )
}

/** Barra horizontal que cresce. */
export function Barra({ valor, max, cor = '#16a34a', atraso = 0, altura = 8 }) {
  const w = max ? Math.max(2, Math.min(100, (valor / max) * 100)) : 0
  return (
    <span className="block flex-1 bg-slate-100 rounded-full overflow-hidden" style={{ height: altura }}>
      <span className="ivt-barra block h-full rounded-full" style={{ width: `${w}%`, background: cor, animationDelay: `${atraso}ms` }} />
    </span>
  )
}

/** Botão "Como ler esta tela" que abre a explicação curta. */
export function ComoLer({ itens }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-3 py-1.5"
      >
        <CircleHelp size={15} aria-hidden="true" /> Como ler esta tela
      </button>
      {aberto && (
        <ul className="ivt-entra mt-2 bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5 text-[13px] text-slate-700 leading-snug list-disc pl-7">
          {itens.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      )}
    </div>
  )
}

/** Painel que sobe de baixo (por cima da barra do app). */
export function PainelBaixo({ aberto, onFechar, titulo, sub, children, rodape }) {
  useEffect(() => {
    if (!aberto) return undefined
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', esc); document.body.style.overflow = antes }
  }, [aberto, onFechar])
  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-[2000] flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={typeof titulo === 'string' ? titulo : undefined}>
      <button type="button" aria-label="Fechar" className="absolute inset-0 bg-slate-900/45 animate-fade-in" onClick={onFechar} />
      <div className="ivt-sobe relative bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col">
        <div className="pt-2 flex justify-center"><span className="w-10 h-1.5 rounded-full bg-slate-300" /></div>
        <div className="flex items-start justify-between gap-3 px-4 pt-2 pb-3 border-b border-slate-100">
          <div className="min-w-0">
            <div className="text-[17px] font-bold text-slate-900 leading-tight">{titulo}</div>
            {sub && <div className="text-[12.5px] text-slate-500 mt-0.5">{sub}</div>}
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1.5 -mr-1 rounded-full bg-slate-100 text-slate-600 shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3 flex-1 overscroll-contain">{children}</div>
        {rodape && <div className="px-4 py-3 border-t border-slate-100 bg-white" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>{rodape}</div>}
      </div>
    </div>
  )
}

/** Linha rótulo : valor. */
export function Dado({ rotulo, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0 text-[13.5px]">
      <span className="text-slate-500">{rotulo}</span>
      <span className="text-slate-900 font-semibold text-right">{children}</span>
    </div>
  )
}
