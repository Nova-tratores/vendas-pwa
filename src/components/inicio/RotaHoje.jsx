// "Rota de hoje" no Início: o mapa do dia e as paradas, com as mudanças à mão —
// reordenar, passar para amanhã, tirar e usar a ordem mais curta. Lê e grava o MESMO
// plano da semana da Minha rota (localStorage 'rota-semana:<segunda>', ou a chave de
// exemplo), então o que muda aqui aparece lá. Cada mudança vai SOZINHA para a Agenda
// (lib/publicarSemana.js, o mesmo envio da Minha rota) 2,5 s depois da última mexida.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowDown, ArrowUp, CalendarCheck, CalendarClock, CalendarX, ChevronRight, Compass, FlaskConical, Loader2, Map as IconeMapa, RefreshCw, Sparkles, Undo2, X } from 'lucide-react'
import { precisaEnviar, publicarSemana } from '../../lib/publicarSemana'
import { DIAS_SEMANA, mover, segundaDaSemana, subir, tirar, reprogramar } from '../../lib/semanaRota'
import { LOJA as POS_LOJA, TIPOS } from '../../lib/rotaFeed'
import { TituloBloco } from './blocos'

const RotaNoMapa = lazy(() => import('../rota/RotaNoMapa'))
const CORES = { carteira: TIPOS.carteira.cor, recuperar: TIPOS.recuperar.cor, novos: TIPOS.novos.cor }
const LOJA = { nome: 'Loja (Piraju)', ehLoja: true }

const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } }
const idFicha = (it) => it.clienteId || String(it.id || '').replace(/^[a-z]:/i, '')

/** Acha o plano da semana guardado (o real tem prioridade sobre o de exemplo). */
function lerPlano() {
  const seg = segundaDaSemana()
  for (const chave of [`rota-semana:${seg}`, `rota-semana-exemplo:${seg}`]) {
    const p = ler(chave)
    if (p?.dias?.length) return { chave, plano: p, exemplo: chave.includes('exemplo') }
  }
  return null
}

export default function RotaHoje() {
  const navigate = useNavigate()
  const [estado, setEstado] = useState(lerPlano)
  const [melhor, setMelhor] = useState(null) // { ids, economiaKm }
  const [desfazer, setDesfazer] = useState(null) // plano anterior à última mudança

  // volta da Minha rota com o plano mexido: relê
  useEffect(() => {
    const reler = () => setEstado(lerPlano())
    window.addEventListener('focus', reler)
    return () => window.removeEventListener('focus', reler)
  }, [])

  const [envio, setEnvio] = useState(null) // null | 'enviando' | 'erro'
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  /** Manda a semana para a Agenda; só marca como enviada se ninguém mexeu durante o envio. */
  const enviar = (chave, plano, exemplo) => {
    clearTimeout(timer.current)
    if (!precisaEnviar(plano, exemplo)) return
    timer.current = setTimeout(async () => {
      setEnvio('enviando')
      try {
        const p = await publicarSemana(plano)
        const atual = ler(chave)
        if (JSON.stringify(atual?.dias) === JSON.stringify(plano.dias)) {
          const marcado = { ...atual, confirmadoEm: p.confirmadoEm, mudouDepois: false }
          try { localStorage.setItem(chave, JSON.stringify(marcado)) } catch { /* sem espaço */ }
          setEstado((e) => (e?.chave === chave ? { ...e, plano: marcado } : e))
        }
        setEnvio(null)
      } catch {
        setEnvio('erro')
      }
    }, 2500)
  }

  const gravar = (novo, { guardaDesfazer = true } = {}) => {
    if (guardaDesfazer) setDesfazer(estado.plano)
    try { localStorage.setItem(estado.chave, JSON.stringify(novo)) } catch { /* sem espaço */ }
    setEstado({ ...estado, plano: novo })
    setMelhor(null)
    enviar(estado.chave, novo, estado.exemplo)
  }
  const salvar = (novo) => gravar(novo)

  if (!estado) {
    return (
      <section className="mb-5">
        <TituloBloco icone={IconeMapa} titulo="Rota de hoje" />
        <button onClick={() => navigate('/rota')} className="w-full flex items-center gap-3 text-left bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50">
          <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0"><Compass size={22} /></span>
          <span className="flex-1">
            <span className="block text-sm font-bold text-slate-900">Monte a sua rota da semana</span>
            <span className="block text-xs text-slate-500">O app sugere os clientes de cada dia; você ajusta.</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>
      </section>
    )
  }

  const { plano, exemplo } = estado
  const k = plano.dias.findIndex((d) => d.dia === hojeISO())
  if (k < 0) return null // fim de semana ou plano de outra semana
  const dia = plano.dias[k]
  const itens = dia.itens
  const amanha = k + 1 < plano.dias.length ? k + 1 : null

  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const status = exemplo
    ? { cor: 'text-amber-800 bg-amber-100', icone: FlaskConical, texto: 'Rota de exemplo: não vai para a Agenda' }
    : envio === 'enviando'
      ? { cor: 'text-sky-800 bg-sky-100', icone: Loader2, texto: 'Marcando na Agenda…', gira: true }
      : envio === 'erro'
        ? { cor: 'text-red-800 bg-red-100', icone: CalendarX, texto: 'Não marcou na Agenda', tentar: true }
        : plano.confirmadoEm && !plano.mudouDepois
          ? { cor: 'text-emerald-800 bg-emerald-100', icone: CalendarCheck, texto: `Marcada na Agenda às ${hora(plano.confirmadoEm)}` }
          : { cor: 'text-slate-700 bg-slate-100', icone: CalendarClock, texto: 'Vai para a Agenda em instantes' }
  const Ist = status.icone

  const usarMelhor = () => {
    const porId = new Map(itens.map((i) => [i.id, i]))
    const ordem = [...melhor.ids.map((id) => porId.get(id)).filter(Boolean), ...itens.filter((i) => !melhor.ids.includes(i.id))]
    salvar({
      ...plano,
      mudouDepois: !!plano.confirmadoEm,
      dias: plano.dias.map((d, i) => (i === k ? { ...d, itens: reprogramar(ordem.map((x) => ({ ...x, horaFixa: undefined }))) } : d)),
    })
  }

  return (
    <section className="mb-5">
      <TituloBloco
        icone={IconeMapa}
        titulo={`Rota de hoje · ${DIAS_SEMANA[k].toLowerCase()}`}
        acao="Semana"
        onAcao={() => navigate('/rota?aba=semana')}
      />
      <div className="bg-white border border-slate-200 rounded-2xl p-3">
        {/* situação na Agenda */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2.5 py-1 ${status.cor}`}>
            <Ist size={13} className={status.gira ? 'animate-spin' : ''} /> {status.texto}
          </span>
          {status.tentar && (
            <button onClick={() => enviar(estado.chave, plano, exemplo)} className="ml-auto text-[11px] font-bold text-blue-700 inline-flex items-center gap-1">
              <RefreshCw size={12} /> Tentar de novo
            </button>
          )}
        </div>

        {itens.length > 0 ? (
          <Suspense fallback={<div className="h-[230px] rounded-2xl bg-slate-100 animate-pulse mb-3" />}>
            <RotaNoMapa
              compacto
              manterOrdem
              origem={{ ...LOJA, pos: POS_LOJA }}
              itens={itens}
              cores={CORES}
              onAbrir={(it) => navigate(`/inteligencia/cliente/${encodeURIComponent(idFicha(it))}`)}
              onMelhorOrdem={setMelhor}
            />
          </Suspense>
        ) : (
          <p className="text-sm text-slate-500 py-3 text-center">Nenhuma visita para hoje.</p>
        )}

        {melhor && (
          <button onClick={usarMelhor} className="w-full mb-2 inline-flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-emerald-600 rounded-xl py-2.5 active:bg-emerald-700">
            <Sparkles size={15} /> Usar a melhor ordem — economiza {melhor.economiaKm} km
          </button>
        )}

        {/* paradas: mexer direto aqui */}
        <ol className="divide-y divide-slate-100">
          {itens.map((it, n) => {
            const t = TIPOS[it.tipo] || TIPOS.carteira
            return (
              <li key={it.id} className="flex items-center gap-2 py-2">
                <span className="w-6 h-6 rounded-full grid place-items-center text-[11px] font-black text-white shrink-0" style={{ background: t.cor }}>{n + 1}</span>
                <button onClick={() => navigate(`/inteligencia/cliente/${encodeURIComponent(idFicha(it))}`)} className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-slate-900 truncate">{it.titulo}</span>
                  <span className="block text-[11px] text-slate-500 truncate">{it.horaIni || ''}{it.horaIni ? ' · ' : ''}{it.cidade}</span>
                </button>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button onClick={() => salvar(subir(plano, k, it.id, -1))} disabled={n === 0} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 disabled:opacity-25 active:bg-slate-100" aria-label="Subir"><ArrowUp size={16} /></button>
                  <button onClick={() => salvar(subir(plano, k, it.id, 1))} disabled={n === itens.length - 1} className="w-8 h-8 grid place-items-center rounded-lg text-slate-500 disabled:opacity-25 active:bg-slate-100" aria-label="Descer"><ArrowDown size={16} /></button>
                  {amanha != null && (
                    <button onClick={() => salvar(mover(plano, k, amanha, it.id))} className="h-8 px-2 rounded-lg text-[11px] font-bold text-slate-600 border border-slate-200 active:bg-slate-100" title={`Passar para ${DIAS_SEMANA[amanha].toLowerCase()}`}>Amanhã</button>
                  )}
                  <button onClick={() => salvar(tirar(plano, k, it.id))} className="w-8 h-8 grid place-items-center rounded-lg text-red-600 active:bg-red-50" aria-label="Tirar de hoje"><X size={16} /></button>
                </div>
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-2 mt-2">
          {desfazer && (
            <button
              onClick={() => { gravar({ ...desfazer, mudouDepois: !!desfazer.confirmadoEm }, { guardaDesfazer: false }); setDesfazer(null) }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl px-3 py-2 active:bg-slate-50"
            >
              <Undo2 size={14} /> Desfazer
            </button>
          )}
          <button onClick={() => navigate('/rota')} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-blue-700 px-1 py-2">
            Abrir a Minha rota <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}
