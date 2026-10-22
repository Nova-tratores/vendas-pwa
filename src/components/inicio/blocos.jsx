// Blocos da tela inicial (Início): feed do dia, notícias, clima, Plano Safra e atalhos.
// Dados da Inteligência de Vendas via lib/iv/fonte.js (hoje: exemplo; depois: Portal).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, Calculator, ChevronRight, CloudRain, CloudSun, Compass, Handshake, Landmark, Map, MapPin,
  Newspaper, Phone, Repeat, Sprout, Sun, Target,
} from 'lucide-react'
// fonte.js (com os dados de exemplo) é pesado: só carrega quando o Início pede.
const fonte = () => import('../../lib/iv/fonte')
const carregarNoticias = () => fonte().then((m) => m.carregarNoticias())
const carregarNoticiasCidades = () => import('../../lib/mapaVendedores').then((m) => m.noticiasDasCidades())
// carteira de verdade (iv_feed_pool); sem pool o app usaria clientes fictícios — aí o bloco some
const carregarFeed = () => import('../../lib/contatosVendedor').then((m) => m.carregarContatos()).then((r) => (r.exemplo ? false : r))
const carregarPlanoSafra = () => fonte().then((m) => m.carregarPlanoSafra())
const MODO_EXEMPLO = false // os blocos do Início agora são dados reais (feed do portal, notícias das cidades)

function useFonte(fn) {
  const [dados, setDados] = useState(null)
  useEffect(() => {
    let vivo = true
    fn().then((d) => { if (vivo) setDados(d) }).catch(() => { if (vivo) setDados(false) })
    return () => { vivo = false }
  }, [fn])
  return dados
}

export function TituloBloco({ icone: I, titulo, acao, onAcao }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide">
        {I && <I size={14} aria-hidden="true" />} {titulo}
        {MODO_EXEMPLO && <span className="normal-case font-semibold text-[10px] text-amber-700 bg-amber-100 px-1.5 rounded-full">exemplo</span>}
      </p>
      {acao && (
        <button onClick={onAcao} className="inline-flex items-center gap-0.5 text-xs text-blue-600 font-semibold">
          {acao} <ChevronRight size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

const TIPO_FEED = {
  carteira: { rotulo: 'Carteira', icone: Handshake, cor: 'text-emerald-700 bg-emerald-50' },
  recuperar: { rotulo: 'Recuperar', icone: Repeat, cor: 'text-amber-700 bg-amber-50' },
  novos: { rotulo: 'Novo', icone: Sprout, cor: 'text-sky-700 bg-sky-50' },
}

/** "Para você hoje": os contatos do feed, em carrossel. Tocar leva à Minha rota. */
export function FeedHoje() {
  const navigate = useNavigate()
  const feed = useFonte(carregarFeed)
  if (feed === false) return null
  const itens = feed?.itens?.slice(0, 6) || []
  return (
    <section className="mb-5">
      <TituloBloco icone={Target} titulo="Para você hoje" acao="Carteira" onAcao={() => navigate('/menu/carteira')} />
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {!feed && [0, 1].map((i) => <div key={i} className="snap-start shrink-0 w-[78%] h-44 rounded-2xl bg-slate-100 animate-pulse" />)}
        {itens.map((it, i) => {
          const t = TIPO_FEED[it.tipo] || TIPO_FEED.carteira
          const I = t.icone
          return (
            <article
              key={it.id}
              onClick={() => navigate('/rota')}
              className="ini-entra snap-start shrink-0 w-[78%] bg-white border border-slate-200 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition cursor-pointer flex flex-col"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${t.cor}`}>
                  <I size={12} aria-hidden="true" /> {t.rotulo}
                </span>
                {it.selo && <span className="text-[11px] font-semibold text-slate-500">{it.selo}</span>}
              </div>
              <p className="font-bold text-slate-900 leading-tight">{it.titulo}</p>
              <p className="inline-flex items-center gap-1 text-xs text-slate-500 mt-0.5"><MapPin size={12} aria-hidden="true" /> {it.cidade}</p>
              <p className="text-xs text-slate-600 mt-2 line-clamp-2">{it.porque}</p>
              <p className="text-xs font-semibold text-blue-700 mt-1.5 line-clamp-2">{it.acao}</p>
              <div className="mt-auto pt-3 flex gap-2">
                {it.telefone && (
                  <a
                    href={`tel:${it.telefone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700"
                  >
                    <Phone size={13} aria-hidden="true" /> Ligar
                  </a>
                )}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                  Ver na rota <ArrowRight size={13} aria-hidden="true" />
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/** Notícias de verdade das cidades do vendedor (Google Notícias, pelo portal). */
export function NoticiasHoje() {
  const n = useFonte(carregarNoticiasCidades)
  const [todas, setTodas] = useState(false)
  if (n === false || (n && !n.noticias?.length)) return null
  if (!n) return <div className="mb-5 h-40 rounded-2xl bg-slate-100 animate-pulse" />
  const lista = todas ? n.noticias : n.noticias.slice(0, 5)
  const quando = (d) => {
    if (!d) return ''
    const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
    return dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
  }
  return (
    <section className="mb-5">
      <TituloBloco icone={Newspaper} titulo="Notícias das suas cidades" />
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {lista.map((m) => (
          <a key={m.link} href={m.link} target="_blank" rel="noreferrer" className="flex items-start gap-3 p-3 active:bg-slate-50">
            <span className="shrink-0 mt-0.5 text-[10px] font-bold uppercase text-red-700 bg-red-50 rounded-md px-1.5 py-0.5">{m.cidade}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900 leading-snug line-clamp-3">{m.titulo}</span>
              <span className="block text-[11px] text-slate-400 mt-0.5">{[m.fonte, quando(m.publicadoEm)].filter(Boolean).join(' · ')}</span>
            </span>
          </a>
        ))}
      </div>
      {n.noticias.length > 5 && (
        <button onClick={() => setTodas((v) => !v)} className="mt-2 w-full text-center text-xs font-semibold text-blue-700 py-1.5">
          {todas ? 'Mostrar menos' : `Ver as ${n.noticias.length} notícias`}
        </button>
      )}
    </section>
  )
}

/** Clima de hoje e da semana (cidade da loja), compacto para o topo. */
export function ClimaMini() {
  const n = useFonte(carregarNoticias)
  const c = n?.previsoes?.clima?.[0]
  if (!c?.dias?.length) return null
  const hoje = c.dias[0]
  const I = hoje.chuva_mm >= 5 || hoje.prob >= 60 ? CloudRain : hoje.prob >= 30 ? CloudSun : Sun
  const chuvaSemana = c.dias.slice(0, 7).reduce((s, d) => s + (d.chuva_mm || 0), 0)
  return (
    <div className="flex items-center gap-2 text-white/95">
      <I size={30} aria-hidden="true" />
      <div className="leading-tight">
        <p className="text-sm font-bold">{hoje.tmin}° / {hoje.tmax}° · {c.cidade}</p>
        <p className="text-[11px] opacity-85">Chuva {hoje.prob}% hoje · {Math.round(chuvaSemana)} mm na semana</p>
      </div>
    </div>
  )
}

/** Faixa do Plano Safra: a linha mais usada para trator, com atalho para simular. */
export function PlanoSafraFaixa() {
  const navigate = useNavigate()
  const p = useFonte(carregarPlanoSafra)
  const l = p?.linhas?.find((x) => x.programa === 'moderfrota' && x.status !== 'proposta') || p?.linhas?.[0]
  if (!l) return null
  const simular = () => navigate(`/inteligencia/calculadora?taxa=${l.taxa_aa}&prazo=${l.prazo_anos * 12}&linha=${encodeURIComponent(l.nome)}`)
  return (
    <button onClick={simular} className="w-full mb-5 flex items-center gap-3 text-left bg-white border border-slate-200 rounded-2xl p-3 shadow-sm active:bg-slate-50">
      <span className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><Landmark size={22} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold text-slate-500 uppercase">Plano Safra {l.safra}</span>
        <span className="block text-sm font-bold text-slate-900 truncate">{l.nome.split('—')[0].trim()} · {String(l.taxa_aa).replace('.', ',')}% a.a.</span>
        <span className="block text-xs text-slate-500">até {l.prazo_anos} anos · carência de {l.carencia_meses} meses</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 shrink-0"><Calculator size={14} aria-hidden="true" /> Simular</span>
    </button>
  )
}

const ATALHOS = [
  { to: '/rota', rotulo: 'Minha rota', icone: Compass },
  { to: '/menu/carteira', rotulo: 'Carteira', icone: Handshake },
  { to: '/territorio', rotulo: 'Território', icone: Map },
  { to: '/inteligencia/calculadora', rotulo: 'Calculadora', icone: Calculator },
]

export function Atalhos() {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-4 gap-2 mb-5">
      {ATALHOS.map(({ to, rotulo, icone: I }) => (
        <button key={to} onClick={() => navigate(to)} className="flex flex-col items-center gap-1.5 bg-white border border-slate-200 rounded-2xl py-3 px-1 active:bg-slate-50">
          <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center"><I size={20} aria-hidden="true" /></span>
          <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{rotulo}</span>
        </button>
      ))}
    </div>
  )
}

/** Nível, XP e sequência do vendedor — atalho para a Garagem. */
export function GaragemMini() {
  const [perfil, setPerfil] = useState(null)
  const navigate = useNavigate()
  useEffect(() => {
    import('../../lib/gamificacaoLocal').then((m) => m.carregarPerfil()).then(setPerfil).catch(() => {})
  }, [])
  if (!perfil) return null
  const { nivel, xp, sequencia } = perfil
  return (
    <button type="button" onClick={() => navigate('/garagem')}
      className="w-full bg-white rounded-xl shadow p-3 flex items-center gap-3 text-left">
      <span className="text-2xl" aria-hidden="true">{sequencia.dias > 0 ? '🔥' : '🚜'}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold">{nivel.cv} cv · {sequencia.dias} {sequencia.dias === 1 ? 'dia' : 'dias'} seguidos</span>
        <span className="block h-1.5 rounded-full bg-slate-100 overflow-hidden mt-1">
          <span className="block h-full bg-green-600 rounded-full" style={{ width: `${nivel.pct}%` }} />
        </span>
        <span className="block text-[11px] text-slate-500 mt-0.5">
          {xp.toLocaleString('pt-BR')} XP{nivel.proximo ? ` · faltam ${nivel.faltaXp.toLocaleString('pt-BR')} para ${nivel.proximo.cv} cv` : ''}
        </span>
      </span>
    </button>
  )
}

/** Sexta 15h até domingo: chamada para o resumo da semana. */
export function ResumoSemanaChamada() {
  const navigate = useNavigate()
  const [ok, setOk] = useState(false)
  useEffect(() => { import('../../lib/gamificacao').then((m) => setOk(m.resumoDisponivel())) }, [])
  if (!ok) return null
  return (
    <button type="button" onClick={() => navigate('/resumo-semana')}
      className="w-full rounded-xl shadow p-3 text-left text-white" style={{ background: 'linear-gradient(135deg,#1e3a8a,#7c2d12)' }}>
      <span className="block text-sm font-bold">🎬 Seu resumo da semana está pronto</span>
      <span className="block text-xs text-white/80">Visitas, melhor visita, selos e as missões da semana que vem.</span>
    </button>
  )
}

/** Paradas longas do carro ainda sem explicação (hoje), com atalho. */
export function ParadasAExplicar() {
  const navigate = useNavigate()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!navigator.onLine) return
    import('../../lib/mapaVendedores')
      .then((m) => m.paradasDoDia(m.hojeBR()))
      .then((d) => setN((d.paradas || []).filter((p) => p.situacao === 'a_explicar').length))
      .catch(() => {})
  }, [])
  if (!n) return null
  return (
    <button type="button" onClick={() => navigate('/paradas')}
      className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
      <span className="block text-sm font-bold text-amber-900">⏸️ {n} parada{n > 1 ? 's' : ''} longa{n > 1 ? 's' : ''} do carro para explicar</span>
      <span className="block text-xs text-amber-800">Toque para dizer o que foi (visita, almoço, oficina…).</span>
    </button>
  )
}
