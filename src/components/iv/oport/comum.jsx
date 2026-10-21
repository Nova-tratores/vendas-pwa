// Peças comuns das telas Oportunidades, Ficha 360 e Sem retorno no app
// (port de oport/comum.tsx e vivo/kit.tsx do Portal, adaptado ao celular).
import { useEffect, useRef, useState } from 'react'
import { CircleHelp, MessageCircle, Phone, X } from 'lucide-react'

export const TX = '#0f172a'
export const MU = '#64748b'
export const BD = '#e2e8f0'
export const CARD = '#fefefe'
export const SUAVE = '#f1f5f9'
export const VERMELHO = '#dc2626'

/** Os 4 lados do radar: cada regra cai num tipo de conversa com o cliente. */
export const QUADRANTES = [
  { id: 'renovar', nome: 'Renovar', cor: '#ef4444', frase: 'Trator nosso velho ou muito rodado: hora de trocar.', regras: ['renovacao'] },
  { id: 'vender', nome: 'Vender mais', cor: '#f59e0b', frase: 'Já é cliente: falta implemento ou o perfil pede outra máquina.', regras: ['cruzada', 'perfil', 'prestador'] },
  { id: 'conquistar', nome: 'Conquistar', cor: '#8b5cf6', frase: 'Usa trator de outra marca ou só compra peça com a gente.', regras: ['outra_marca'] },
  { id: 'recuperar', nome: 'Recuperar', cor: '#06b6d4', frase: 'Sumiu, perdeu proposta, proposta parada ou ninguém visita.', regras: ['sumiu', 'reabordar', 'proposta_parada', 'sem_visita'] },
]
export const quadranteDe = (c) => {
  const r = c?.oportunidades?.[0]?.regra
  return r ? QUADRANTES.find((q) => q.regras.includes(r))?.id || null : null
}
export const tipoDe = (c) => QUADRANTES.find((q) => q.id === quadranteDe(c)) || { id: '', nome: 'Sem motivo', cor: '#64748b' }

/** Frase curta por regra, em linguagem de vendedor (igual ao Portal). */
export const FRASE_REGRA = {
  renovacao: 'trator nosso com 5+ anos ou muito rodado',
  cruzada: 'tem trator nosso e nenhum implemento',
  outra_marca: 'usa outra marca ou só compra peça aqui',
  reabordar: 'perdeu proposta há 3 meses a 2 anos',
  proposta_parada: 'tem proposta aberta esperando',
  sumiu: 'comprava peças e parou este ano',
  sem_visita: 'tem trator nosso e ninguém visitou em 6 meses',
  perfil: 'área e cultura pedem outra máquina',
  prestador: 'presta serviço agrícola (CNAE)',
}

/** Texto sem acento, minúsculo, para busca. */
export const textoNormSeguro = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return ((h >>> 0) % 1000) / 1000 }
export const valorCliente = (c) => (c.pecas12m || 0) + (c.valorPropostasAbertas || 0) + (c.valorMaquinas || 0)

export const reais = (n) => {
  if (!n) return 'R$ 0'
  if (n >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 1e3) return `R$ ${Math.round(n / 1e3).toLocaleString('pt-BR')} mil`
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`
}
export const brl = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
export const mil = (n) => Math.round(n || 0).toLocaleString('pt-BR')
export const dataBR = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}/${String(iso).slice(0, 4)}` : '—')
export const dataCurta = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : '—')

const soDig = (s) => String(s || '').replace(/\D/g, '')
/** Telefone com DDD, sem o 55. */
export function foneLimpo(t) {
  let d = soDig(t)
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  return d.length >= 10 ? d : ''
}
export function foneBonito(t) {
  const d = foneLimpo(t)
  if (!d) return t || ''
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}
export const linkTel = (t) => (foneLimpo(t) ? `tel:+55${foneLimpo(t)}` : null)
export const linkWhats = (t, texto) => (foneLimpo(t) ? `https://wa.me/55${foneLimpo(t)}${texto ? `?text=${encodeURIComponent(texto)}` : ''}` : null)

/** Número que sobe até o valor (easeOutCubic). */
export function useContador(alvo, ms = 900) {
  const [v, setV] = useState(0)
  const de = useRef(0)
  useEffect(() => {
    const ini = performance.now(), origem = de.current
    let raf = 0
    const passo = (t) => {
      const p = Math.min(1, (t - ini) / ms)
      setV(origem + (alvo - origem) * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(passo); else de.current = alvo
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [alvo, ms])
  return v
}
export function Conta({ valor, formato = (v) => Math.round(v).toLocaleString('pt-BR') }) {
  return <>{formato(useContador(valor || 0))}</>
}

export function Avatar({ nome, cor, tam = 44 }) {
  const ini = String(nome || '').split(/\s+/).filter((p) => p.length > 2).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || String(nome || '?').slice(0, 2).toUpperCase()
  return (
    <span style={{ width: tam, height: tam, borderRadius: tam / 3, flexShrink: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: tam * 0.36, color: cor, background: `${cor}18`, border: `1px solid ${cor}40` }}>{ini}</span>
  )
}

/** Três barrinhas + Quente/Morno/Frio (score de 0 a 100). */
export function Temperatura({ score, comNumero }) {
  const cor = score >= 50 ? '#dc2626' : score >= 35 ? '#ea580c' : score >= 20 ? '#ca8a04' : '#64748b'
  const rot = score >= 50 ? 'Quente' : score >= 35 ? 'Morno' : 'Frio'
  return (
    <span title={`Score ${score} de 100`} className="inline-flex items-center gap-1.5 text-[12px] font-bold whitespace-nowrap" style={{ color: cor }}>
      <span className="inline-flex gap-[2px] items-end">
        {[20, 35, 50].map((lim, i) => <span key={lim} style={{ width: 4, height: 8 + i * 3, borderRadius: 2, background: score >= lim ? cor : '#e2e8f0' }} />)}
      </span>
      {rot}{comNumero ? ` · ${score}` : ''}
    </span>
  )
}

/** Anel com o score (0–100) que enche animado. */
export function AnelScore({ score, tam = 54, cor }) {
  const v = useContador(score)
  const c = cor || (score >= 50 ? '#dc2626' : score >= 35 ? '#ea580c' : score >= 20 ? '#ca8a04' : '#64748b')
  const r = tam / 2 - 5, circ = 2 * Math.PI * r
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: tam, height: tam }} title={`Score ${score} de 100`}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - v / 100)} />
      </svg>
      <span className="absolute text-center leading-none">
        <b style={{ color: c, fontSize: tam * 0.32 }} className="tabular-nums block">{Math.round(v)}</b>
        <span className="text-[9px] text-slate-400 font-semibold">score</span>
      </span>
    </span>
  )
}

export function Selo({ cor, children, cheio }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap"
      style={cheio ? { background: cor, color: '#fefefe' } : { color: cor, background: `${cor}16` }}>
      {children}
    </span>
  )
}

/** Botões Ligar / WhatsApp (somem quando não há telefone). */
export function BotoesContato({ telefone, texto, grande, className = '' }) {
  const tel = linkTel(telefone), wa = linkWhats(telefone, texto)
  if (!tel) return null
  const h = grande ? 'h-11 px-4 text-[15px]' : 'h-9 px-3 text-[13px]'
  return (
    <span className={`inline-flex gap-2 ${className}`}>
      <a href={tel} onClick={(e) => e.stopPropagation()} className={`${h} inline-flex items-center gap-1.5 rounded-xl font-bold text-white`} style={{ background: VERMELHO, boxShadow: '0 6px 16px rgba(220,38,38,.25)' }}>
        <Phone size={grande ? 18 : 15} aria-hidden="true" /> Ligar
      </a>
      <a href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`${h} inline-flex items-center gap-1.5 rounded-xl font-bold text-white`} style={{ background: '#16a34a', boxShadow: '0 6px 16px rgba(22,163,74,.25)' }}>
        <MessageCircle size={grande ? 18 : 15} aria-hidden="true" /> WhatsApp
      </a>
    </span>
  )
}

/** Botão "Como ler esta tela" + painel que abre de baixo. */
export function ComoLer({ titulo = 'Como ler esta tela', itens = [] }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} aria-label={titulo}
        className="shrink-0 inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 h-8 text-[12px] font-semibold text-slate-600 active:scale-95 transition">
        <CircleHelp size={15} aria-hidden="true" /> Como ler
      </button>
      {aberto && (
        <div className="fixed inset-0 z-[9000] flex items-end justify-center bg-slate-900/40 iv-fade" onClick={() => setAberto(false)} role="dialog" aria-modal="true" aria-label={titulo}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-8 iv-sobe max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <CircleHelp size={20} className="text-red-600" aria-hidden="true" />
              <h2 className="text-lg font-bold text-slate-900 flex-1">{titulo}</h2>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar" className="w-9 h-9 grid place-items-center rounded-full bg-slate-100"><X size={18} aria-hidden="true" /></button>
            </div>
            <ul className="space-y-3">
              {itens.map((t, i) => (
                <li key={i} className="flex gap-3 text-[14px] text-slate-700 leading-snug">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-red-50 text-red-700 text-[12px] font-bold grid place-items-center">{i + 1}</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}

/** Chip de filtro (rolagem lateral). */
export function Chip({ ativo, cor = TX, onClick, children, contagem }) {
  return (
    <button type="button" onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full h-9 px-3 text-[13px] font-semibold transition active:scale-95 whitespace-nowrap"
      style={ativo ? { background: cor, color: '#fefefe', border: `1px solid ${cor}`, boxShadow: `0 4px 12px ${cor}40` } : { background: CARD, color: TX, border: `1px solid ${BD}` }}>
      {children}
      {contagem != null && <b className="tabular-nums" style={{ color: ativo ? '#fefefe' : cor }}>{contagem}</b>}
    </button>
  )
}

/** Faixa que rola de lado, sem barra. */
export function Rolagem({ children, className = '' }) {
  return <div className={`flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 ${className}`} style={{ scrollbarWidth: 'none' }}>{children}</div>
}

/** Animações comuns (entrada suave, varredura do radar). */
export function EstilosIV() {
  return (
    <style>{`
      @keyframes ivEntra { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
      .iv-entra { animation: ivEntra .45s cubic-bezier(.2,.8,.2,1) both }
      @keyframes ivCresce { from { opacity: 0; transform: scale(.85) } to { opacity: 1; transform: none } }
      .iv-cresce { animation: ivCresce .55s cubic-bezier(.2,1.2,.3,1) both }
      @keyframes ivBarra { from { transform: scaleX(0) } }
      .iv-barra { transform-origin: left; animation: ivBarra .9s cubic-bezier(.2,.8,.2,1) both }
      @keyframes ivFade { from { opacity: 0 } } .iv-fade { animation: ivFade .2s ease both }
      @keyframes ivSobe { from { transform: translateY(40px); opacity: 0 } } .iv-sobe { animation: ivSobe .3s cubic-bezier(.2,.8,.2,1) both }
      @keyframes ivGira { to { transform: rotate(360deg) } } .iv-varre { animation: ivGira 7s linear infinite }
      @keyframes ivBlip { 0%, 6% { opacity: 1; transform: scale(1.7) } 30% { opacity: .9; transform: scale(1) } 100% { opacity: .55; transform: scale(1) } }
      .iv-blip { transform-box: fill-box; transform-origin: center; animation-name: ivBlip; animation-timing-function: ease-out; animation-iteration-count: infinite }
      @keyframes ivOnda { from { transform: scale(1); opacity: .7 } to { transform: scale(3.2); opacity: 0 } }
      .iv-onda { transform-box: fill-box; transform-origin: center; animation: ivOnda 2.4s ease-out infinite }
      @keyframes ivBrilho { 0%, 70% { background-position: 160% 0 } 100% { background-position: -60% 0 } }
      .iv-brilho::after { content: ''; position: absolute; inset: 0; background: linear-gradient(115deg, transparent 35%, rgba(255,255,255,.26) 50%, transparent 65%); background-size: 250% 100%; background-position: 160% 0; animation: ivBrilho 7s ease-in-out infinite; animation-delay: var(--d, 0s); pointer-events: none }
      @keyframes ivFlutua { 0%, 100% { transform: translateY(0) rotate(0) } 50% { transform: translateY(-6px) rotate(-6deg) } }
      .iv-flutua { animation: ivFlutua 5s ease-in-out infinite }
      .iv-toque { transition: transform .15s } .iv-toque:active { transform: scale(.98) }
      @media (prefers-reduced-motion: reduce) { .iv-entra, .iv-cresce, .iv-barra, .iv-varre, .iv-blip, .iv-onda, .iv-flutua, .iv-brilho::after, .iv-sobe { animation: none !important } }
    `}</style>
  )
}

/** Título de seção pequeno, em caixa alta. */
export function Rotulo({ children, className = '' }) {
  return <div className={`text-[11.5px] font-extrabold uppercase tracking-wider text-slate-500 ${className}`}>{children}</div>
}

/** Cartão branco padrão (borda leve, cantos arredondados). */
export function Cartao({ children, className = '', atraso = 0, onClick, style }) {
  return (
    <div onClick={onClick} role={onClick ? 'button' : undefined}
      className={`iv-entra rounded-2xl border border-slate-200 bg-[#fefefe] shadow-[0_1px_3px_rgba(15,23,42,.05)] ${onClick ? 'cursor-pointer iv-toque' : ''} ${className}`}
      style={{ animationDelay: `${atraso}ms`, ...style }}>
      {children}
    </div>
  )
}

/** Mensagem de lista vazia. */
export function Vazio({ icone: I, children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
      {I && <I size={28} className="mx-auto mb-2 text-slate-400" aria-hidden="true" />}
      {children}
    </div>
  )
}
