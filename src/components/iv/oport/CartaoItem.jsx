// Cartão do feed: "por que ligar / o que oferecer" + score e atalhos.
import { ChevronRight, Navigation } from 'lucide-react'
import Icone from '../../Icone'
import { AnelScore, Avatar, BotoesContato, Selo } from './comum'

export default function CartaoItem({ item, onFicha, atraso = 0, posicao }) {
  const p = item.porque[0]
  const podeFicha = !!item.clienteId
  const rota = !item.telefone && item.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}` : null
  return (
    <article className="iv-entra rounded-2xl border border-slate-200 bg-[#fefefe] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]" style={{ animationDelay: `${atraso}ms` }}>
      <button type="button" onClick={() => podeFicha && onFicha(item.clienteId)} className="w-full text-left flex gap-3 items-center iv-toque" disabled={!podeFicha}>
        {posicao != null
          ? <span className="w-11 h-11 shrink-0 rounded-[14px] grid place-items-center font-extrabold text-[17px]" style={{ background: `${item.cor}16`, color: item.cor, border: `1px solid ${item.cor}40` }}>{posicao}</span>
          : <Avatar nome={item.titulo} cor={item.cor} tam={44} />}
        <span className="min-w-0 flex-1">
          <b className="block text-[15.5px] text-slate-900 leading-tight truncate">{item.titulo}</b>
          <span className="block text-[12.5px] text-slate-500 truncate mt-0.5">{item.sub}</span>
          <span className="mt-1 inline-flex"><Selo cor={item.cor}><Icone nome={item.icone} size={12} /> {item.tipo}</Selo></span>
        </span>
        {item.score != null ? <AnelScore score={item.score} tam={50} /> : item.selo ? <span className="text-[13px] font-extrabold whitespace-nowrap" style={{ color: item.cor }}>{item.selo}</span> : null}
        {podeFicha && <ChevronRight size={18} className="text-slate-300 -mr-1" aria-hidden="true" />}
      </button>

      <div className="mt-3 rounded-xl px-3 py-2.5" style={{ background: '#f8fafc' }}>
        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">Por que ligar</div>
        <div className="flex gap-2 items-start mt-1">
          <span className="mt-[3px] shrink-0" style={{ color: p?.cor }}><Icone nome={p?.icone} size={15} /></span>
          <div className="min-w-0">
            <div className="text-[14px] font-bold text-slate-900 leading-snug">{p?.titulo}</div>
            {p?.texto && <div className="text-[12.5px] text-slate-500 leading-snug">{p.texto}</div>}
          </div>
        </div>
        {item.porque.length > 1 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.porque.slice(1).map((x) => <Selo key={x.titulo} cor={x.cor}><Icone nome={x.icone} size={11} /> {x.rotulo}</Selo>)}
          </div>
        )}
      </div>
      <div className="mt-2 rounded-xl px-3 py-2.5" style={{ background: `${item.cor}0d`, border: `1px solid ${item.cor}2e` }}>
        <div className="text-[10.5px] font-extrabold uppercase tracking-wider" style={{ color: item.cor }}>O que oferecer</div>
        <div className="text-[14px] font-bold text-slate-900 leading-snug mt-0.5">{item.oferecer}</div>
      </div>

      {(item.telefone || rota) && (
        <div className="flex gap-2 mt-3 items-center">
          <BotoesContato telefone={item.telefone} texto={`Olá! Aqui é da Nova Tratores.`} />
          {rota && (
            <a href={rota} target="_blank" rel="noreferrer" className="h-9 px-3 inline-flex items-center gap-1.5 rounded-xl text-[13px] font-bold text-white" style={{ background: item.cor }}>
              <Navigation size={15} aria-hidden="true" /> Como chegar{item.aprox ? ' (aprox.)' : ''}
            </a>
          )}
        </div>
      )}
    </article>
  )
}
