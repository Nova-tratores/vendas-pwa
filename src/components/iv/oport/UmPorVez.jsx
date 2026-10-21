// Um por vez (port de oport/UmPorVez.tsx): UM cartão grande com tudo para ligar.
// Deslize para a esquerda = pular; para a direita = voltar. "Liguei" conta para a
// meta do dia. O que já foi feito hoje fica lembrado neste aparelho.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, FileText, PartyPopper, RotateCcw, SkipForward } from 'lucide-react'
import Icone from '../../Icone'
import { hojeISO } from '../../../lib/iv/fonte'
import { AnelScore, Avatar, BotoesContato, foneBonito, Rotulo, Selo, Vazio } from './comum'

const META = 20

function lerFeitos(chave) {
  try { return JSON.parse(localStorage.getItem(chave) || '{}') || {} } catch { return {} }
}

export default function UmPorVez({ itens, onFicha, nome = 'oport' }) {
  const chave = `iv-feitos-${nome}-${hojeISO()}`
  const [feitos, setFeitos] = useState(() => lerFeitos(chave))
  const [idx, setIdx] = useState(0)
  const [dx, setDx] = useState(0)
  const [saida, setSaida] = useState(0) // -1 sai para a esquerda, 1 para a direita
  const toque = useRef(null)
  useEffect(() => { setFeitos(lerFeitos(chave)); setIdx(0) }, [chave])

  const pendentes = useMemo(() => itens.filter((i) => !feitos[i.chave]), [itens, feitos])
  const i = Math.min(idx, Math.max(0, pendentes.length - 1))
  const item = pendentes[i]
  const ligados = Object.values(feitos).filter((v) => v === 'liguei').length

  const gravar = (n) => { setFeitos(n); try { localStorage.setItem(chave, JSON.stringify(n)) } catch { /* sem storage */ } }
  const animar = (lado, depois) => { setSaida(lado); setTimeout(() => { setSaida(0); setDx(0); depois() }, 220) }
  const marcar = (v) => item && animar(-1, () => gravar({ ...feitos, [item.chave]: v }))
  const proximo = () => (i < pendentes.length - 1 ? animar(-1, () => setIdx(i + 1)) : marcar('pulei'))
  const anterior = () => i > 0 && animar(1, () => setIdx(i - 1))

  const onStart = (e) => { toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, h: null } }
  const onMove = (e) => {
    const t = toque.current
    if (!t) return
    const ddx = e.touches[0].clientX - t.x, ddy = e.touches[0].clientY - t.y
    if (t.h == null && (Math.abs(ddx) > 8 || Math.abs(ddy) > 8)) t.h = Math.abs(ddx) > Math.abs(ddy)
    if (t.h) setDx(ddx)
  }
  const onEnd = () => {
    const d = dx
    toque.current = null
    if (d < -80) proximo(); else if (d > 80 && i > 0) anterior(); else setDx(0)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-[13px] text-slate-700 whitespace-nowrap"><b className="text-[15px]">{ligados}</b> de {META} ligações hoje</span>
        <span className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (ligados / META) * 100)}%`, background: 'linear-gradient(90deg, #22c55e, #16a34a)', transition: 'width .6s cubic-bezier(.2,.8,.2,1)' }} />
        </span>
        <span className="text-[12px] text-slate-500 tabular-nums whitespace-nowrap">{pendentes.length ? `${i + 1}/${pendentes.length}` : '0'}</span>
      </div>

      {!item ? (
        <Vazio icone={PartyPopper}>
          Fila vazia. Bom trabalho!
          {Object.keys(feitos).length > 0 && (
            <button type="button" onClick={() => { gravar({}); setIdx(0) }} className="mt-3 mx-auto flex items-center gap-1 text-red-700 font-semibold underline">
              <RotateCcw size={14} aria-hidden="true" /> recomeçar a fila de hoje
            </button>
          )}
        </Vazio>
      ) : (
        <div>
          <div className="relative">
          {/* cartões de trás (efeito de pilha) */}
          {pendentes[i + 2] && <div className="absolute inset-x-6 -bottom-3 top-6 rounded-3xl bg-white border border-slate-200 opacity-60" />}
          {pendentes[i + 1] && <div className="absolute inset-x-3 -bottom-1.5 top-3 rounded-3xl bg-white border border-slate-200 opacity-80" />}
          <article key={item.chave} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
            className="relative rounded-3xl border border-slate-200 bg-[#fefefe] overflow-hidden iv-cresce"
            style={{
              boxShadow: '0 12px 30px rgba(15,23,42,.10)', touchAction: 'pan-y',
              transform: saida ? `translateX(${saida * 120}%) rotate(${saida * 8}deg)` : `translateX(${dx}px) rotate(${dx / 30}deg)`,
              opacity: saida ? 0 : 1, transition: toque.current ? 'none' : 'transform .22s ease, opacity .22s ease',
            }}>
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${item.cor}, ${item.cor}66)` }} />
            <div className="p-4">
              <div className="flex gap-3 items-center">
                <Avatar nome={item.titulo} cor={item.cor} tam={56} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-[19px] font-extrabold text-slate-900 leading-tight">{item.titulo}</h2>
                  <div className="text-[13px] text-slate-500 mt-0.5">{item.sub}</div>
                  {item.telefone && <div className="text-[16px] font-bold text-slate-800 mt-1 tracking-wide">{foneBonito(item.telefone)}</div>}
                </div>
                {item.score != null ? <AnelScore score={item.score} tam={58} /> : <span className="text-[14px] font-extrabold" style={{ color: item.cor }}>{item.selo}</span>}
              </div>
              <div className="mt-2"><Selo cor={item.cor}><Icone nome={item.icone} size={12} /> {item.tipo}</Selo></div>

              <div className="mt-4 rounded-2xl p-3.5" style={{ background: `${item.cor}0f`, border: `1px solid ${item.cor}33` }}>
                <div className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: item.cor }}>O que oferecer</div>
                <div className="text-[17px] font-extrabold text-slate-900 leading-snug mt-0.5">{item.oferecer}</div>
              </div>

              <Rotulo className="mt-4 mb-2">Por que ligar</Rotulo>
              <div className="space-y-2.5">
                {item.porque.map((o) => (
                  <div key={o.titulo} className="flex gap-2.5 items-start">
                    <span className="w-7 h-7 shrink-0 rounded-lg grid place-items-center" style={{ background: `${o.cor}16`, color: o.cor }}><Icone nome={o.icone} size={15} /></span>
                    <div className="min-w-0"><div className="text-[14.5px] font-bold text-slate-900 leading-snug">{o.titulo}</div>{o.texto && <div className="text-[13px] text-slate-500 leading-snug">{o.texto}</div>}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                {item.fatos.map((x) => (
                  <div key={x.t} className="rounded-xl bg-slate-50 px-3 py-2">
                    <div className="text-[11px] text-slate-500 font-bold">{x.t}</div>
                    <div className="text-[13.5px] text-slate-900 font-bold mt-0.5 leading-tight">{x.v}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <BotoesContato telefone={item.telefone} grande texto="Olá! Aqui é da Nova Tratores." />
                {item.clienteId && (
                  <button type="button" onClick={() => onFicha(item.clienteId)} className="h-11 px-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-slate-800">
                    <FileText size={17} aria-hidden="true" /> Ver ficha
                  </button>
                )}
              </div>
            </div>
          </article>
          </div>

          <div className="relative flex items-center gap-2 mt-5">
            <button type="button" onClick={anterior} disabled={i === 0} aria-label="Anterior" className="w-11 h-11 rounded-full border border-slate-200 bg-white grid place-items-center disabled:opacity-30"><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" onClick={() => marcar('pulei')} className="flex-1 h-12 rounded-2xl border border-slate-200 bg-white text-[15px] font-bold text-slate-700 inline-flex items-center justify-center gap-1.5"><SkipForward size={17} aria-hidden="true" /> Pular</button>
            <button type="button" onClick={() => marcar('liguei')} className="flex-[1.4] h-12 rounded-2xl text-white text-[15px] font-extrabold inline-flex items-center justify-center gap-1.5" style={{ background: '#16a34a', boxShadow: '0 8px 20px rgba(22,163,74,.3)' }}><Check size={18} aria-hidden="true" /> Liguei, próximo</button>
            <button type="button" onClick={proximo} disabled={i >= pendentes.length - 1} aria-label="Próximo" className="w-11 h-11 rounded-full border border-slate-200 bg-white grid place-items-center disabled:opacity-30"><ChevronRight size={20} aria-hidden="true" /></button>
          </div>
          <p className="text-center text-[11.5px] text-slate-400 mt-2">Deslize o cartão para o lado para passar.</p>
        </div>
      )}
    </div>
  )
}
