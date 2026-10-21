// Matéria inteira em tela cheia: foto, linha fina, "para quem vende", corpo, fonte e compartilhar no WhatsApp.
// Setas (ou arrastar para o lado) trocam de matéria, como no modal do Portal.
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, ExternalLink, MessageCircle, Tractor } from 'lucide-react'
import Icone from '../../Icone'
import { carregarMateria } from '../../../lib/iv/fonte'
import { cat, dominio } from './util'
import { Folha, Foto, Selo } from './Pecas'

function textoWhats(n, link) {
  const partes = [`*${n.titulo}*`]
  if (n.resumo) partes.push(n.resumo)
  if (n.impacto) partes.push(`Para quem vende: ${n.impacto}`)
  if (link) partes.push(link)
  return `https://wa.me/?text=${encodeURIComponent(partes.join('\n\n'))}`
}

export default function ModalMateria({ lista, i, onTrocar, onFechar }) {
  const base = lista[i]
  const [extra, setExtra] = useState({})
  const corpoRef = useRef(null)
  const toque = useRef(null)

  // a matéria completa vem de carregarMateria (no Portal: iv_noticias.corpo)
  useEffect(() => {
    let vivo = true
    if (!extra[base.id]) {
      carregarMateria(base.id).then((m) => { if (vivo && m) setExtra((e) => ({ ...e, [base.id]: m })) }).catch(() => {})
    }
    corpoRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0 })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.id])

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'ArrowRight' && i < lista.length - 1) onTrocar(i + 1)
      if (e.key === 'ArrowLeft' && i > 0) onTrocar(i - 1)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [i, lista.length, onTrocar])

  const n = { ...base, ...(extra[base.id] || {}) }
  const c = cat(n.categoria)
  const corpo = n.corpo?.length ? n.corpo : null
  const palavras = (corpo || [n.resumo || '']).join(' ').split(/\s+/).length
  const link = n.url_artigo || n.fonte_url
  const dom = dominio(link)
  const quando = n.publicado_em ? new Date(n.publicado_em) : null

  const inicio = (e) => { const t = e.touches[0]; toque.current = { x: t.clientX, y: t.clientY } }
  const fim = (e) => {
    if (!toque.current) return
    const t = e.changedTouches[0], dx = t.clientX - toque.current.x, dy = t.clientY - toque.current.y
    toque.current = null
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) {
      if (dx < 0 && i < lista.length - 1) onTrocar(i + 1)
      if (dx > 0 && i > 0) onTrocar(i - 1)
    }
  }

  const barra = (
    <>
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide min-w-0 truncate" style={{ color: c.cor }}>
        <Icone nome={c.icone} size={14} /> {c.nome}
      </span>
      <span className="text-[12px] text-slate-500 whitespace-nowrap">{i + 1} de {lista.length}</span>
      <span className="ml-auto flex gap-1.5">
        <button type="button" disabled={i === 0} onClick={() => onTrocar(i - 1)} aria-label="Matéria anterior"
          className="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 active:bg-slate-100"><ChevronLeft size={18} aria-hidden="true" /></button>
        <button type="button" disabled={i === lista.length - 1} onClick={() => onTrocar(i + 1)} aria-label="Próxima matéria"
          className="w-9 h-9 grid place-items-center rounded-lg border border-slate-200 text-slate-700 disabled:opacity-30 active:bg-slate-100"><ChevronRight size={18} aria-hidden="true" /></button>
      </span>
    </>
  )

  return (
    <Folha barra={barra} onFechar={onFechar} rotulo={n.titulo}>
      <article key={n.id} ref={corpoRef} className="ntv-sobe px-4 pt-5 pb-10" onTouchStart={inicio} onTouchEnd={fim}>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wide" style={{ color: c.cor }}>
          <Icone nome={c.icone} size={14} /> {c.nome}{n.cidades?.length ? <span className="text-slate-500 font-semibold normal-case tracking-normal"> · {n.cidades.join(', ')}</span> : null}
        </span>
        <h1 className="mt-2 mb-3 text-[24px] leading-[1.18] font-black tracking-tight text-[#111111]">{n.titulo}</h1>
        {n.resumo && <p className="m-0 mb-4 text-[16px] leading-relaxed text-slate-600 font-medium">{n.resumo}</p>}
        <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap text-[12.5px] text-slate-500 py-2.5 border-y border-slate-200">
          <b className="text-slate-700">{n.fonte_nome || dom}</b>
          {quando && <span>{quando.toLocaleDateString('pt-BR')} às {quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          <span>{Math.max(1, Math.round(palavras / 200))} min de leitura</span>
          <Selo t={n.tendencia} />
        </div>

        {n.imagem_url && (
          <figure className="mt-4 mb-1 -mx-4">
            <Foto n={n} className="h-56" iconeTam={40} />
            <figcaption className="px-4 text-[12px] text-slate-500 mt-1.5">Foto: {n.fonte_nome || dom}</figcaption>
          </figure>
        )}

        {n.impacto && (
          <div className="flex gap-3 my-5 p-3.5 rounded-xl text-[14.5px] leading-normal text-[#111111]" style={{ background: `color-mix(in srgb, ${c.cor} 9%, #fefefe)` }}>
            <Tractor size={20} className="shrink-0 mt-0.5" style={{ color: c.cor }} aria-hidden="true" />
            <div><b>Para quem vende trator</b><br />{n.impacto}</div>
          </div>
        )}

        <div className="mt-4">
          {corpo ? corpo.map((p, k) => <p key={k} className="text-[16.5px] leading-[1.72] text-slate-800 m-0 mb-4">{p}</p>) : (
            <>
              <p className="text-[16.5px] leading-[1.72] text-slate-800 m-0 mb-4">{n.resumo}</p>
              <div className="flex gap-2 items-center text-[13.5px] text-slate-600 bg-slate-100 rounded-xl px-3 py-2.5">
                <CircleAlert size={16} aria-hidden="true" /> O texto completo desta matéria está no site de origem, no link abaixo.
              </div>
            </>
          )}
        </div>

        <a href={textoWhats(n, link)} target="_blank" rel="noreferrer"
          className="ntv-toque mt-6 flex items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-bold text-[#fefefe]" style={{ background: '#16a34a' }}>
          <MessageCircle size={19} aria-hidden="true" /> Compartilhar no WhatsApp
        </a>

        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="ntv-toque mt-3 flex items-center gap-3 p-3.5 rounded-xl bg-[#111111] text-[#fefefe] no-underline">
            <span className="w-10 h-10 rounded-xl bg-white/15 grid place-items-center shrink-0"><ExternalLink size={17} aria-hidden="true" /></span>
            <span className="min-w-0">
              <b className="block text-[14.5px]">Ler a matéria original em {n.fonte_nome || dom}</b>
              <small className="block text-[12px] opacity-75 truncate">{link}</small>
            </span>
          </a>
        )}
        <div className="mt-3 text-[11.5px] text-slate-400">Texto reproduzido de {n.fonte_nome || dom} para leitura interna da equipe. Os direitos são do veículo de origem.</div>
        {lista.length > 1 && <div className="mt-4 text-center text-[11.5px] text-slate-400">Arraste para o lado para trocar de matéria</div>}
      </article>
    </Folha>
  )
}
