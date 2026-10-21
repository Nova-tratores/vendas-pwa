// Peças pequenas da tela de Notícias: foto com reserva, selo de tendência, folha em tela cheia.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Newspaper, TrendingDown, TrendingUp, X } from 'lucide-react'
import { TEND, cat } from './util'

/** Foto da matéria com carregamento preguiçoso; se faltar ou falhar, fundo neutro com o ícone. */
export function Foto({ n, className = '', iconeTam = 26 }) {
  const [falhou, setFalhou] = useState(false)
  const c = cat(n.categoria)
  const sem = !n.imagem_url || falhou
  return (
    <div className={`ntv-foto relative overflow-hidden bg-slate-100 ${className}`}>
      {sem ? (
        <div className="absolute inset-0 grid place-items-center" style={{ color: c.cor }}>
          <Newspaper size={iconeTam} strokeWidth={1.6} aria-hidden="true" className="opacity-40" />
        </div>
      ) : (
        <img src={n.imagem_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)}
          className="absolute inset-0 w-full h-full object-cover" />
      )}
    </div>
  )
}

const ICONE_TEND = { boa: TrendingUp, ruim: TrendingDown, neutra: Eye }
export function Selo({ t, className = '' }) {
  const x = TEND[t] || TEND.neutra
  const I = ICONE_TEND[t] || Eye
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap ${className}`} style={{ color: x.cor, background: x.fundo }}>
      <I size={12} aria-hidden="true" /> {x.nome}
    </span>
  )
}

/** Trava a rolagem da página enquanto uma folha está aberta. */
function useTravaRolagem() {
  useEffect(() => {
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = antes }
  }, [])
}

/**
 * Folha em tela cheia (celular): barra fixa no topo + conteúdo que rola.
 * `barra` substitui o título simples; `onFechar` também é chamado pelo Esc.
 */
export function Folha({ titulo, barra, onFechar, children, rotulo = 'Janela' }) {
  useTravaRolagem()
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onFechar])
  return createPortal(
    <div className="ntv-fundo fixed inset-0 z-[200] bg-slate-900/60 flex justify-center" onClick={onFechar} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={rotulo}
        className="ntv-folha w-full max-w-[640px] h-full bg-[#fefefe] flex flex-col sm:my-4 sm:h-[calc(100%-2rem)] sm:rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-200 bg-[#fefefe] safe-top shrink-0">
          {barra || <b className="text-[15px] text-slate-900 flex-1 min-w-0 truncate">{titulo}</b>}
          <button type="button" onClick={onFechar} aria-label="Fechar"
            className="ml-auto w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-700 active:bg-slate-100 shrink-0">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** Bloco branco padrão (borda leve, cantos arredondados, entrada suave). */
export function Bloco({ titulo, icone: I, direita, children, className = '', atraso = 0 }) {
  return (
    <section className={`ntv-sobe bg-white border border-slate-200 rounded-2xl p-4 ${className}`} style={{ animationDelay: `${atraso}ms` }}>
      {titulo && (
        <h3 className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-slate-500 mb-3">
          {I && <I size={15} aria-hidden="true" />} <span className="flex-1 min-w-0">{titulo}</span> {direita}
        </h3>
      )}
      {children}
    </section>
  )
}
