// Aba Semana da Minha rota: o plano dos 5 dias, editável, e o botão que manda para a Agenda.
// Regras em lib/semanaRota.js; quem guarda o plano e publica é a MinhaRota (props).
import { useState } from 'react'
import { ArrowDown, ArrowUp, CalendarCheck, ChevronDown, MapPin, Plus, RefreshCw, Search, X } from 'lucide-react'
import Icone from '../Icone'
import { TIPOS } from '../../lib/rotaFeed'
import { DIAS_SEMANA, fixarHora, foraDoPlano, incluir, mover, subir, tirar } from '../../lib/semanaRota'

const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

// A semana vai SOZINHA para a Agenda (a MinhaRota envia 2,5 s depois de montar ou mudar);
// aqui só aparece a situação do envio e, se falhar, o "Tentar de novo".
export default function SemanaEditavel({ plano, setPlano, itensPool, remontar, publicar, envio = {}, exemplo, hoje, abrirDia }) {
  const [aberto, setAberto] = useState(() => Math.max(0, plano.dias.findIndex((d) => d.dia >= hoje && d.itens.length)))
  const [incluindo, setIncluindo] = useState(null) // índice do dia
  const total = plano.dias.reduce((s, d) => s + d.itens.length, 0)
  const AMBAR = { cor: '#b45309', fundo: '#fffbeb' }
  const status = exemplo ? { txt: 'Rota de exemplo: não vai para a Agenda', ...AMBAR }
    : envio.estado === 'enviando' ? { txt: 'Marcando na Agenda…', cor: '#1d4ed8', fundo: '#eff6ff' }
      : envio.estado === 'erro' ? { txt: `Não foi para a Agenda (${envio.msg})`, cor: '#b91c1c', fundo: '#fef2f2' }
        : plano.confirmadoEm && !plano.mudouDepois ? { txt: `Marcada na Agenda · ${new Date(plano.confirmadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`, cor: '#15803d', fundo: '#f0fdf4' }
          : { txt: 'Vai para a Agenda em instantes…', ...AMBAR }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <b className="block">Semana de {dataCurta(plano.dias[0].dia)} a {dataCurta(plano.dias[4].dia)}</b>
            <span className="text-xs text-slate-500">{total} contatos · ajuste à vontade</span>
          </div>
          <button onClick={() => { if (!plano.confirmadoEm || confirm('Montar a semana de novo? As mudanças que você fez se perdem e a Agenda é atualizada.')) remontar(plano.porDia) }} className="w-9 h-9 grid place-items-center rounded-full bg-slate-100 text-slate-600" title="Montar de novo"><RefreshCw size={16} /></button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-sm">
          <span className="text-slate-500">Por dia:</span>
          {[4, 6, 8].map((n) => <button key={n} onClick={() => { if (n !== plano.porDia && (!plano.confirmadoEm || confirm('Mudar a quantidade monta a semana de novo. Continuar?'))) remontar(n) }} className={`px-3 py-1 rounded-full font-bold ${plano.porDia === n ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{n}</button>)}
        </div>
        <p className="text-xs font-semibold rounded-lg px-2 py-1 mt-2 inline-block" style={{ color: status.cor, background: status.fundo }}>{status.txt}</p>
      </div>

      {plano.dias.map((d, k) => {
        const abertoAqui = aberto === k
        const ehHoje = d.dia === hoje
        return (
          <div key={d.dia} className={`rounded-2xl border bg-white overflow-hidden ${ehHoje ? 'border-blue-600' : 'border-slate-200'}`} style={{ animation: `mr-entra .35s ${k * 0.05}s ease both` }}>
            <button onClick={() => setAberto(abertoAqui ? -1 : k)} className="w-full text-left p-4 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <b>{DIAS_SEMANA[k]}</b><span className="text-xs text-slate-500">{dataCurta(d.dia)}</span>
                  {ehHoje && <span className="text-[10px] font-black uppercase text-blue-700">hoje</span>}
                </div>
                <p className="text-xs text-slate-500 truncate">{d.itens.length ? `${d.itens.length} contatos · ${d.itens[0].horaIni}–${d.itens.at(-1).horaFim}` : 'livre'}{d.cidades.length ? ` · ${d.cidades.join(', ')}` : ''}</p>
              </div>
              <div className="flex gap-0.5">{d.itens.map((i) => <span key={i.id} className="w-1.5 h-4 rounded-full" style={{ background: TIPOS[i.tipo].cor }} />)}</div>
              <ChevronDown size={18} className={`text-slate-400 transition-transform ${abertoAqui ? 'rotate-180' : ''}`} />
            </button>
            {abertoAqui && (
              <div className="border-t border-slate-100 p-3 space-y-2">
                {d.itens.map((it, j) => (
                  <div key={it.id} className="rounded-xl border border-slate-200 p-2.5" style={{ borderLeft: `4px solid ${TIPOS[it.tipo].cor}` }}>
                    <div className="flex items-start gap-2">
                      <label className="shrink-0 text-center">
                        <input type="time" value={it.horaIni} onChange={(e) => setPlano(fixarHora(plano, k, it.id, e.target.value))} className={`w-[96px] text-sm font-bold rounded-lg border px-1 py-1 ${it.horaFixa ? 'border-blue-600 text-blue-800' : 'border-slate-200'}`} />
                        {it.horaFixa && <button onClick={() => setPlano(fixarHora(plano, k, it.id, ''))} className="block mx-auto text-[10px] text-slate-400 underline">automático</button>}
                      </label>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-black uppercase inline-flex items-center gap-1" style={{ color: TIPOS[it.tipo].cor }}><Icone nome={TIPOS[it.tipo].icone} size={11} /> {TIPOS[it.tipo].nome}</span>
                        <b className="block text-sm leading-tight truncate">{it.titulo}</b>
                        <span className="text-xs text-slate-500 inline-flex items-center gap-0.5"><MapPin size={11} /> {it.cidade}</span>
                      </div>
                      <button onClick={() => setPlano(tirar(plano, k, it.id))} className="w-7 h-7 grid place-items-center rounded-full text-slate-400 hover:bg-slate-100" title="Tirar da semana"><X size={15} /></button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <button disabled={j === 0} onClick={() => setPlano(subir(plano, k, it.id, -1))} className="w-8 h-8 grid place-items-center rounded-lg bg-slate-100 disabled:opacity-30" title="Antes"><ArrowUp size={15} /></button>
                      <button disabled={j === d.itens.length - 1} onClick={() => setPlano(subir(plano, k, it.id, 1))} className="w-8 h-8 grid place-items-center rounded-lg bg-slate-100 disabled:opacity-30" title="Depois"><ArrowDown size={15} /></button>
                      <select value={k} onChange={(e) => setPlano(mover(plano, k, Number(e.target.value), it.id))} className="ml-auto text-xs rounded-lg border border-slate-200 px-2 py-1.5 bg-white">
                        {DIAS_SEMANA.map((n, x) => <option key={n} value={x}>{x === k ? `Mover para…` : n}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <button onClick={() => setIncluindo(k)} className="flex-1 rounded-xl border-2 border-dashed border-slate-300 py-2 text-sm font-semibold text-slate-500 inline-flex items-center justify-center gap-1"><Plus size={15} /> Incluir contato</button>
                  {d.itens.length > 0 && <button onClick={() => abrirDia(k)} className="rounded-xl bg-slate-900 text-white px-3 py-2 text-sm font-bold">Ver no mapa</button>}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {envio.estado === 'erro' && !exemplo && (
        <button onClick={publicar} className="w-full py-3.5 rounded-2xl bg-blue-700 text-white font-bold inline-flex items-center justify-center gap-2 shadow">
          <CalendarCheck size={18} /> Tentar marcar na Agenda de novo
        </button>
      )}
      <p className="text-[11px] text-slate-400 text-center inline-flex items-center justify-center gap-1 w-full"><CalendarCheck size={12} /> Sua semana fica marcada sozinha na sua Agenda e na Agenda coletiva do Portal. Mudou algo? A Agenda acompanha, sem duplicar.</p>

      {incluindo != null && <Incluir dia={incluindo} plano={plano} itensPool={itensPool} fechar={() => setIncluindo(null)} escolher={(it) => { setPlano(incluir(plano, incluindo, it)); setIncluindo(null) }} />}
    </div>
  )
}

function Incluir({ dia, plano, itensPool, fechar, escolher }) {
  const [q, setQ] = useState('')
  const cidadesDoDia = plano.dias[dia].cidades
  const lista = foraDoPlano(plano, itensPool)
    .filter((i) => !q || `${i.titulo} ${i.cidade}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (cidadesDoDia.includes(b.cidade) - cidadesDoDia.includes(a.cidade)) || b.peso - a.peso)
    .slice(0, 40)
  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 flex items-end" onClick={fechar}>
      <div className="bg-white w-full max-h-[80vh] rounded-t-3xl p-4 flex flex-col" onClick={(e) => e.stopPropagation()} style={{ animation: 'mr-entra .25s ease' }}>
        <div className="flex items-center mb-3"><b className="flex-1">Incluir na {DIAS_SEMANA[dia]}</b><button onClick={fechar}><X size={20} /></button></div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 mb-3"><Search size={16} className="text-slate-400" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou cidade" className="flex-1 outline-none text-sm" /></label>
        <div className="overflow-y-auto space-y-1.5">
          {lista.map((i) => (
            <button key={i.id} onClick={() => escolher(i)} className="w-full text-left rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
              <span className="w-2 h-8 rounded-full shrink-0" style={{ background: TIPOS[i.tipo].cor }} />
              <span className="flex-1 min-w-0"><b className="block text-sm truncate">{i.titulo}</b><span className="text-xs text-slate-500">{i.cidade}{cidadesDoDia.includes(i.cidade) ? ' · cidade do dia' : ''} · {TIPOS[i.tipo].nome}</span></span>
              <Plus size={16} className="text-slate-400" />
            </button>
          ))}
          {!lista.length && <p className="text-sm text-slate-400 text-center py-6">Nenhum contato sobrando.</p>}
        </div>
      </div>
    </div>
  )
}
