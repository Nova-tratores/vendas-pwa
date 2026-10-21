// =============================================================================
// Peças visuais das telas Calculadora · Indicações · Concorrência · Empresas ·
// Equipe da Inteligência de Vendas no app (mesma linguagem do vivo/kit.tsx do
// Portal): número que conta até o valor, cartão que entra suave, barra que
// cresce, "Como ler esta tela", folha que sobe de baixo e formatação em R$.
// =============================================================================
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleHelp, ChevronDown, MessageCircle, Phone, X } from 'lucide-react'

// ── formatação ──────────────────────────────────────────────────────────────
export const brl = (v, casas = 0) =>
  v == null || !Number.isFinite(Number(v))
    ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas })
export const num = (v, casas = 0) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
export const compacto = (n) => {
  const a = Math.abs(n || 0)
  if (a >= 1e6) return `${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (a >= 1e3) return `${Math.round(n / 1e3).toLocaleString('pt-BR')} mil`
  return Math.round(n || 0).toLocaleString('pt-BR')
}
export const reais = (n) => `R$ ${compacto(n)}`
export const pct = (v, casas = 0) => (v == null ? '—' : `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: casas })}%`)
export const dataBR = (iso) => {
  if (!iso) return '—'
  const s = String(iso).slice(0, 10).split('-')
  return s.length === 3 ? `${s[2]}/${s[1]}/${s[0]}` : String(iso)
}
export const iniciais = (n) => String(n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()
export const textoNorm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
export const soDigitos = (s) => String(s || '').replace(/\D/g, '')
export const fmtCnpj = (c) => {
  const d = soDigitos(c)
  return d.length === 14 ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : c
}
export const fmtFone = (t) => {
  let d = soDigitos(t)
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return t || ''
}
const foneWa = (t) => { const d = soDigitos(t); return d.length >= 10 && !d.startsWith('55') ? `55${d}` : d }

// ── animação ────────────────────────────────────────────────────────────────
const CSS = `
@keyframes ivfEntra { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
.ivf-entra { animation: ivfEntra .5s cubic-bezier(.2,.8,.2,1) both }
@keyframes ivfBarra { from { transform: scaleX(0) } } .ivf-barra { transform-origin: left; animation: ivfBarra .9s cubic-bezier(.2,.8,.2,1) both }
@keyframes ivfBarraV { from { transform: scaleY(0) } } .ivf-barrav { transform-origin: bottom; animation: ivfBarraV .8s cubic-bezier(.2,.8,.2,1) both }
@keyframes ivfTroca { from { opacity: 0; transform: translateY(8px); filter: blur(3px) } to { opacity: 1; transform: none; filter: none } }
.ivf-troca { animation: ivfTroca .45s cubic-bezier(.2,.8,.2,1) both }
@keyframes ivfPulso { 0% { box-shadow: 0 0 0 0 var(--c) } 70% { box-shadow: 0 0 0 9px transparent } 100% { box-shadow: 0 0 0 0 transparent } }
.ivf-pulso { animation: ivfPulso 1.8s infinite }
@keyframes ivfSobe { from { transform: translateY(100%) } to { transform: none } } .ivf-sobe { animation: ivfSobe .3s cubic-bezier(.2,.8,.2,1) both }
@keyframes ivfFundo { from { opacity: 0 } to { opacity: 1 } } .ivf-fundo { animation: ivfFundo .2s ease-out both }
.ivf-toque { transition: transform .12s ease } .ivf-toque:active { transform: scale(.985) }
.ivf-range { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 6px; background: linear-gradient(90deg, #dc2626 var(--p), #e2e8f0 var(--p)); outline: none }
.ivf-range::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #fefefe; border: 3px solid #dc2626; box-shadow: 0 2px 6px rgba(0,0,0,.2) }
.ivf-range::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: #fefefe; border: 3px solid #dc2626 }
@media (prefers-reduced-motion: reduce) { .ivf-entra, .ivf-barra, .ivf-barrav, .ivf-troca, .ivf-pulso, .ivf-sobe, .ivf-fundo { animation: none !important } }
`
export function EstilosIVF() {
  return <style>{CSS}</style>
}

/** Número que sobe até o valor (easeOutCubic). */
export function useContador(alvo, ms = 900) {
  const [v, setV] = useState(0)
  const de = useRef(0)
  useEffect(() => {
    const alvoN = Number(alvo) || 0
    if (typeof requestAnimationFrame !== 'function') { setV(alvoN); return undefined }
    const ini = performance.now(), origem = de.current
    let raf = 0
    const passo = (t) => {
      const p = Math.min(1, (t - ini) / ms)
      const x = origem + (alvoN - origem) * (1 - Math.pow(1 - p, 3))
      setV(x)
      de.current = x
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return v
}
export function Conta({ valor, formato = (v) => Math.round(v).toLocaleString('pt-BR') }) {
  const v = useContador(valor)
  if (valor == null || !Number.isFinite(Number(valor))) return <>—</>
  return <>{formato(v)}</>
}

// ── blocos ──────────────────────────────────────────────────────────────────
/** Card branco, borda leve, cantos arredondados, entra suave. */
export function Cartao({ titulo, icone: Ic, extra, children, atraso = 0, className = '', corpo = 'p-4' }) {
  return (
    <section className={`ivf-entra bg-white border border-slate-200 rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,.05)] min-w-0 ${className}`} style={{ animationDelay: `${atraso}ms` }}>
      {(titulo || extra) && (
        <div className="flex items-center gap-2 px-4 pt-3.5">
          {Ic && <Ic size={17} className="text-red-600 shrink-0" aria-hidden="true" />}
          <h2 className="text-[15px] font-bold text-slate-900 flex-1 min-w-0 leading-tight">{titulo}</h2>
          {extra}
        </div>
      )}
      <div className={corpo}>{children}</div>
    </section>
  )
}

/** Número grande com rótulo; `destaque` = cartão em gradiente. */
export function Kpi({ rotulo, valor, formato, cor = '#0f172a', sub, delta, atraso = 0, destaque, onClick, ativo, icone: Ic }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={`ivf-entra ivf-toque relative overflow-hidden text-left rounded-2xl px-3.5 py-3 min-w-0 ${destaque ? 'text-white' : 'bg-white text-slate-900'} ${
        destaque ? '' : ativo ? 'border-2' : 'border border-slate-200'}`}
      style={{
        animationDelay: `${atraso}ms`,
        ...(destaque ? { background: `linear-gradient(135deg, ${cor}, ${cor}bb)`, boxShadow: `0 8px 20px ${cor}40` } : {}),
        ...(ativo && !destaque ? { borderColor: cor, background: `${cor}0d` } : {}),
      }}>
      {Ic && <Ic size={20} className="absolute right-3 top-3" style={{ color: destaque ? '#fefefe' : cor, opacity: destaque ? 0.4 : 0.25 }} aria-hidden="true" />}
      <div className={`text-[11px] font-bold uppercase tracking-wide pr-6 leading-tight ${destaque ? 'opacity-90' : 'text-slate-500'}`}>{rotulo}</div>
      <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
        <span className="text-[22px] font-extrabold tabular-nums leading-tight" style={{ color: destaque ? '#fefefe' : cor }}>
          {typeof valor === 'number' ? <Conta valor={valor} formato={formato} /> : valor}
        </span>
        {delta}
      </div>
      {sub && <div className={`text-[12px] leading-snug mt-0.5 ${destaque ? 'opacity-90' : 'text-slate-500'}`}>{sub}</div>}
    </Tag>
  )
}

export function Selo({ cor = '#475569', children, cheio }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={cheio ? { background: cor, color: '#fefefe' } : { background: `${cor}1a`, color: cor }}>
      {children}
    </span>
  )
}

/** Pílula de filtro. */
export function Chip({ ativo, cor = '#dc2626', onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold border transition-colors whitespace-nowrap"
      style={ativo ? { background: cor, borderColor: cor, color: '#fefefe' } : { background: '#fefefe', borderColor: '#e2e8f0', color: '#334155' }}>
      {children}
    </button>
  )
}
/** Linha de chips que rola de lado. */
export function Chips({ children }) {
  return <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>{children}</div>
}

/** Barra horizontal que cresce. */
export function Barra({ valor, max, cor = '#dc2626', atraso = 0, altura = 8 }) {
  const w = max > 0 && valor > 0 ? Math.max(2, (valor / max) * 100) : 0
  return (
    <div className="w-full bg-slate-100 rounded-full overflow-hidden" style={{ height: altura }}>
      <div className="ivf-barra h-full rounded-full" style={{ width: `${w}%`, background: cor, animationDelay: `${atraso}ms` }} />
    </div>
  )
}

/** Setinha de variação contra o período anterior. */
export function Delta({ agora, antes, claro }) {
  const d = antes ? (agora - antes) / antes : null
  if (d == null) return agora ? <span className="text-[11px] font-extrabold" style={{ color: claro ? '#fefefe' : '#16a34a', opacity: 0.9 }}>novo</span> : null
  const sobe = d >= 0
  return (
    <span className="text-[12px] font-extrabold whitespace-nowrap" style={{ color: claro ? '#fefefe' : sobe ? '#16a34a' : '#dc2626' }}>
      {sobe ? '▲' : '▼'} {Math.abs(Math.round(d * 100))}%
    </span>
  )
}

/** Botão "Como ler esta tela" + explicação curta que abre embaixo. */
export function ComoLer({ titulo = 'Como ler esta tela', itens }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="mb-3">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-full pl-2 pr-3 py-1.5 active:bg-slate-50">
        <CircleHelp size={16} className="text-red-600" aria-hidden="true" /> {titulo}
        <ChevronDown size={14} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="mt-2 grid gap-1.5">
          {itens.map((t, i) => (
            <div key={i} className="ivf-entra text-[13.5px] leading-snug text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2" style={{ animationDelay: `${i * 60}ms` }}>{t}</div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Aviso amarelo (modo de exemplo, nada é gravado). */
export function AvisoLocal({ children = 'No modo de exemplo nada é gravado: o que você registrar aqui some ao sair da tela.' }) {
  return <div className="text-[12.5px] leading-snug text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{children}</div>
}

/** Folha que sobe de baixo (formulários e fichas). Fica por cima da barra do app. */
export function Folha({ titulo, sub, onFechar, children, rodape, cheia, topo }) {
  useEffect(() => {
    const ant = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const esc = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => { document.body.style.overflow = ant; window.removeEventListener('keydown', esc) }
  }, [onFechar])
  return createPortal(
    <div className="ivf-fundo fixed inset-0 z-[70] bg-slate-900/50 flex items-end" onClick={onFechar} role="dialog" aria-modal="true" aria-label={titulo}>
      <EstilosIVF />
      <div onClick={(e) => e.stopPropagation()}
        className={`ivf-sobe w-full bg-slate-50 rounded-t-3xl flex flex-col overflow-hidden ${cheia ? 'h-[94vh]' : 'max-h-[92vh]'}`}>
        {topo || (
          <div className="flex items-start gap-3 px-4 pt-4 pb-3 bg-white border-b border-slate-200">
            <div className="flex-1 min-w-0">
              <div className="text-[17px] font-extrabold text-slate-900 leading-tight">{titulo}</div>
              {sub && <div className="text-[12.5px] text-slate-500 mt-0.5">{sub}</div>}
            </div>
            <button type="button" onClick={onFechar} aria-label="Fechar" className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 text-slate-700 shrink-0">
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {rodape && <div className="px-4 py-3 bg-white border-t border-slate-200" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>{rodape}</div>}
      </div>
    </div>,
    document.body,
  )
}

// ── formulário ──────────────────────────────────────────────────────────────
export const estiloCampo = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500'
export function Campo({ rotulo, children, dica }) {
  return (
    <label className="grid grid-cols-1 gap-1 text-[12.5px] font-semibold text-slate-600 min-w-0">
      {rotulo}
      {children}
      {dica && <span className="text-[11.5px] font-normal text-slate-500">{dica}</span>}
    </label>
  )
}
export function Texto({ valor, onMuda, tipo = 'text', ...resto }) {
  return <input type={tipo} value={valor ?? ''} onChange={(e) => onMuda(e.target.value)} className={estiloCampo} {...resto} />
}

// ── contato ─────────────────────────────────────────────────────────────────
/** Botões Ligar / WhatsApp (só aparecem com telefone). */
export function BotoesContato({ telefone, texto, pequeno }) {
  const d = soDigitos(telefone)
  if (d.length < 10) return null
  const cls = pequeno ? 'px-2.5 py-1.5 text-[12.5px]' : 'px-3 py-2 text-[13px]'
  return (
    <div className="flex gap-2">
      <a href={`tel:${d}`} onClick={(e) => e.stopPropagation()} className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 ${cls}`}>
        <Phone size={15} aria-hidden="true" /> Ligar
      </a>
      <a href={`https://wa.me/${foneWa(telefone)}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 rounded-xl font-bold text-white ${cls}`} style={{ background: '#16a34a' }}>
        <MessageCircle size={15} aria-hidden="true" /> WhatsApp
      </a>
    </div>
  )
}

/** Avatar redondo com iniciais e bolinha de situação. */
export function Avatar({ nome, tamanho = 46, situacao }) {
  return (
    <div className="relative shrink-0 rounded-full grid place-items-center font-extrabold text-white"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.36, background: 'linear-gradient(135deg, #F87171, #991B1B)' }}>
      {iniciais(nome)}
      {situacao && (
        <span className="ivf-pulso absolute rounded-full border-2 border-white" title={situacao.rotulo}
          style={{ right: -1, bottom: -1, width: 14, height: 14, background: situacao.cor, '--c': `${situacao.cor}99` }} />
      )}
    </div>
  )
}

/** Mensagem de lista vazia. */
export function Vazio({ children }) {
  return <div className="text-center text-[13.5px] text-slate-500 py-8 px-4 bg-white border border-dashed border-slate-300 rounded-2xl">{children}</div>
}
