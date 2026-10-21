// Itens da lista de notícias (opção "Jornal": miniatura à esquerda) e o destaque com foto grande.
import { ArrowRight, BookOpen, Tractor } from 'lucide-react'
import Icone from '../../Icone'
import { cat, haQuanto } from './util'
import { Foto, Selo } from './Pecas'

/** Linha da lista: foto pequena, editoria, título, resumo curto, fonte e selo. */
export function ItemLista({ n, onAbrir, i }) {
  const c = cat(n.categoria)
  return (
    <button type="button" onClick={onAbrir}
      className="ntv-sobe ntv-toque w-full grid grid-cols-[96px_minmax(0,1fr)] gap-3 py-3.5 border-b border-slate-200 text-left active:bg-slate-50"
      style={{ animationDelay: `${Math.min(i, 14) * 40}ms` }}>
      <Foto n={n} className="h-[84px] rounded-xl" iconeTam={22} />
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide truncate" style={{ color: c.cor }}>
          <Icone nome={c.icone} size={12} /> {c.nome}
          {n.cidades?.length ? <span className="text-slate-400 font-semibold normal-case tracking-normal truncate"> · {n.cidades[0]}</span> : null}
        </div>
        <h3 className="ntv-3l mt-0.5 text-[15px] leading-[1.28] font-extrabold text-slate-900">{n.titulo}</h3>
        <div className="flex items-center gap-2 mt-1.5 text-[11.5px] text-slate-500 min-w-0">
          <span className="truncate flex-1 min-w-0">{n.fonte_nome}{n.publicado_em ? ` · ${haQuanto(n.publicado_em)}` : ''}</span>
          <Selo t={n.tendencia} />
        </div>
      </div>
    </button>
  )
}

/** Destaque: foto larga em cima, título forte, resumo e o "para quem vende". */
export function CartaoDestaque({ n, onAbrir, i }) {
  const c = cat(n.categoria)
  return (
    <button type="button" onClick={onAbrir}
      className="ntv-sobe ntv-toque w-full text-left bg-white border border-slate-200 rounded-2xl overflow-hidden"
      style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}>
      <Foto n={n} className="h-44" iconeTam={36} />
      <div className="p-3.5">
        <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ color: c.cor }}>
          <Icone nome={c.icone} size={13} /> <span className="truncate">{c.nome}</span>
          <span className="ml-auto"><Selo t={n.tendencia} /></span>
        </div>
        <h3 className="mt-1.5 text-[18px] leading-[1.25] font-black text-slate-900 tracking-tight">{n.titulo}</h3>
        {n.resumo && <p className="ntv-3l mt-1.5 text-[14px] leading-normal text-slate-600 m-0">{n.resumo}</p>}
        {n.impacto && (
          <div className="flex gap-2 mt-2.5 rounded-xl px-3 py-2 text-[13px] leading-snug text-slate-800" style={{ background: `color-mix(in srgb, ${c.cor} 8%, #fefefe)` }}>
            <Tractor size={16} className="shrink-0 mt-px" style={{ color: c.cor }} aria-hidden="true" />
            <span className="ntv-3l"><b>Para quem vende:</b> {n.impacto}</span>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2.5 text-[11.5px] text-slate-500">
          <span className="truncate flex-1 min-w-0">{n.fonte_nome}{n.publicado_em ? ` · ${haQuanto(n.publicado_em)}` : ''}</span>
          <span className="inline-flex items-center gap-1 font-extrabold whitespace-nowrap" style={{ color: c.cor }}>
            {n.corpo?.length ? <><BookOpen size={13} aria-hidden="true" /> Ler matéria</> : <>Abrir <ArrowRight size={13} aria-hidden="true" /></>}
          </span>
        </div>
      </div>
    </button>
  )
}
