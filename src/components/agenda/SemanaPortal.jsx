// "Minha semana" na Agenda do app: os compromissos do vendedor na Agenda coletiva
// do Portal (inclusive as visitas que vieram da rota da semana). Só leitura aqui —
// a rota é editada na Minha rota e republicada; o resto, na agenda do Portal.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Compass, MapPin, RefreshCw } from 'lucide-react'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
function segundaDe(d) {
  const x = new Date(d); x.setHours(12, 0, 0, 0)
  const dow = x.getDay()
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow))
  return x
}
const somar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const hora = (s) => new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const diaDe = (s) => new Date(s).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })

export default function SemanaPortal() {
  const navigate = useNavigate()
  const [segunda, setSegunda] = useState(() => segundaDe(new Date()))
  const [estado, setEstado] = useState({ carregando: true, eventos: [], erro: null })
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let vivo = true
    setEstado((e) => ({ ...e, carregando: true, erro: null }))
    import('../../lib/agendaRota')
      .then((m) => m.lerAgendaPortal(iso(segunda), iso(somar(segunda, 6))))
      .then((eventos) => { if (vivo) setEstado({ carregando: false, eventos, erro: null }) })
      .catch((e) => { if (vivo) setEstado({ carregando: false, eventos: [], erro: e.message }) })
    return () => { vivo = false }
  }, [segunda, versao])

  const hojeIso = iso(new Date())
  const dias = Array.from({ length: 6 }, (_, i) => somar(segunda, i)) // seg–sáb
  const porDia = new Map(dias.map((d) => [iso(d), []]))
  for (const e of estado.eventos) {
    const k = diaDe(e.inicio)
    if (!porDia.has(k)) porDia.set(k, [])
    porDia.get(k).push(e)
  }
  const total = estado.eventos.length
  const daRota = estado.eventos.filter((e) => e.origem === 'rota_vendas').length
  const rotulo = `${segunda.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${somar(segunda, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-3 mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
          <CalendarDays size={14} aria-hidden="true" /> Minha semana no Portal
        </p>
        <button onClick={() => setVersao((v) => v + 1)} className="p-1 text-slate-400 active:text-slate-700" aria-label="Atualizar">
          <RefreshCw size={15} className={estado.carregando ? 'animate-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setSegunda((s) => somar(s, -7))} className="p-1.5 rounded-lg border border-slate-200" aria-label="Semana anterior"><ChevronLeft size={16} /></button>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-900">{rotulo}</p>
          {!estado.carregando && !estado.erro && (
            <p className="text-[11px] text-slate-500">{total} compromisso{total === 1 ? '' : 's'}{daRota ? ` · ${daRota} da rota` : ''}</p>
          )}
        </div>
        <button onClick={() => setSegunda((s) => somar(s, 7))} className="p-1.5 rounded-lg border border-slate-200" aria-label="Próxima semana"><ChevronRight size={16} /></button>
      </div>

      {estado.erro && <p className="text-xs text-red-800 bg-red-50 rounded-xl px-3 py-2">{estado.erro}</p>}
      {estado.carregando && !estado.erro && <div className="h-24 rounded-xl bg-slate-100 animate-pulse" />}

      {!estado.carregando && !estado.erro && total === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500">Nada na agenda desta semana.</p>
          <button onClick={() => navigate('/rota')} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
            <Compass size={15} aria-hidden="true" /> Montar a rota da semana
          </button>
        </div>
      )}

      {!estado.carregando && !estado.erro && total > 0 && (
        <div className="space-y-3">
          {[...porDia.entries()].filter(([, evs]) => evs.length).map(([dia, evs]) => {
            const d = new Date(`${dia}T12:00:00`)
            return (
              <div key={dia}>
                <p className={`text-xs font-bold mb-1 ${dia === hojeIso ? 'text-blue-700' : 'text-slate-600'}`}>
                  {DIAS[d.getDay()]} {d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}{dia === hojeIso ? ' · hoje' : ''}
                </p>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                  {evs.map((e) => (
                    <div key={e.id} className="flex gap-3 p-2.5">
                      <span className="text-xs font-semibold text-slate-700 w-11 shrink-0 inline-flex items-start gap-0.5 pt-0.5">
                        {e.dia_inteiro ? 'dia' : hora(e.inicio)}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900 leading-snug">{e.titulo}</span>
                        <span className="flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                          {e.local && <span className="inline-flex items-center gap-0.5"><MapPin size={11} aria-hidden="true" /> {e.local}</span>}
                          {!e.dia_inteiro && <span className="inline-flex items-center gap-0.5"><Clock size={11} aria-hidden="true" /> até {hora(e.fim)}</span>}
                          {e.origem === 'rota_vendas' && <span className="font-semibold text-blue-700">rota</span>}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          <button onClick={() => navigate('/rota')} className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold border border-slate-200 rounded-xl py-2 active:bg-slate-50">
            <Compass size={14} aria-hidden="true" /> Ajustar a rota da semana
          </button>
        </div>
      )}
    </section>
  )
}
