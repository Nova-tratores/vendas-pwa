import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ChevronRight, ClipboardList, Compass, Map as IconeMapa, MapPin, Navigation, Phone, Target, Check, Lightbulb } from 'lucide-react'
import Icone from '../components/Icone'
import { supabase } from '../lib/sync'
import { capturarGPS } from '../lib/gps'
import { LOJA, PERFIS, TIPOS, aplicarMix, ordemPeloMapa, resumoCidades, sugerirCidadesDoDia } from '../lib/rotaFeed'
import { DIAS_SEMANA, montarPlanoSemana, segundaDaSemana } from '../lib/semanaRota'
import { precisaEnviar, publicarSemana } from '../lib/publicarSemana'
import SemanaEditavel from '../components/rota/SemanaEditavel'
import RotaNoMapa from '../components/rota/RotaNoMapa'
import RegiaoBloco from '../components/rota/RegiaoBloco'
import useRegiao from '../components/rota/useRegiao'
import { estadoVisita } from '../lib/visitaPrefill'

// Minha rota — feed do vendedor (José, 20/10/2026). A reserva de contatos vem do portal
// (iv_feed_pool); a mistura vem do teste de perfil (iv_perfil_vendedor). Três formas:
//   Hoje ....... escolhe as cidades do dia e vê os contatos na ordem de prioridade
//   Pelo mapa .. os mesmos contatos na ordem do caminho mais curto, com o mapa
//   Semana ..... o plano dos 5 dias (contatos + horário), editável, confirmado na Agenda
//                (21/10: "o que ficar definido vai também para a Agenda coletiva do Portal")
// Com a semana montada, o Hoje segue o plano do dia (até o vendedor trocar as cidades).

// A semana vai SOZINHA para a Agenda (José, 21/10: "se já fez a rota semanal, já tem que marcar
// lá na agenda"): 2,5 s depois de montar ou mudar, via lib/publicarSemana.js.
const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const lerJSON = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? padrao } catch { return padrao } }

// Ficha 360 da Inteligência de Vendas para o contato da rota (id do cliente ou o documento do id do feed)
const idFicha = (it) => it.clienteId || String(it.id || '').replace(/^[a-z]:/i, '')

function Cartao({ it, n, feito, onFeito, regiao }) {
  const navigate = useNavigate()
  const t = TIPOS[it.tipo] || TIPOS.carteira
  const abrirFicha = () => navigate(`/inteligencia/cliente/${encodeURIComponent(idFicha(it))}`)
  const acaoBase = 'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-bold transition active:scale-[0.97]'
  return (
    <article
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all ${feito ? 'opacity-60' : ''}`}
      style={{ animation: `mr-entra .4s ${Math.min(n, 12) * 0.05}s ease both` }}
    >
      {/* cabeçalho: número da parada, tipo e nota */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-black text-white shrink-0 shadow-sm" style={{ background: feito ? '#16a34a' : t.cor }}>
          {feito ? <Check size={15} /> : n}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: t.fundo, color: t.cor }}>
          <Icone nome={t.icone} size={12} /> {t.nome}
        </span>
        {it.selo && <span className="ml-auto text-[11px] font-bold text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 whitespace-nowrap">{it.selo}</span>}
      </div>

      {/* cliente: toque abre a ficha da Inteligência de Vendas */}
      <button onClick={abrirFicha} className="w-full text-left flex items-start gap-2 px-4 pt-2 active:bg-slate-50">
        <span className="min-w-0 flex-1">
          <span className={`block font-bold text-[17px] leading-snug text-slate-900 ${feito ? 'line-through' : ''}`}>{it.titulo}</span>
          <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{it.sub}{it.kmAteAqui != null ? ` · ${it.kmAteAqui} km da saída` : ''}{it.aprox ? ' · posição da cidade' : ''}</span>
          </span>
        </span>
        <span className="shrink-0 mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-blue-700">Ficha <ChevronRight size={14} /></span>
      </button>

      <div className="px-4 pt-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Por que visitar</p>
        <p className="text-sm text-slate-700 leading-snug">{it.porque}</p>
      </div>
      <div className="mx-4 mt-2.5 flex gap-2 rounded-xl px-3 py-2.5" style={{ background: t.fundo }}>
        <Lightbulb size={16} className="shrink-0 mt-0.5" style={{ color: t.cor }} />
        <p className="text-sm font-semibold text-slate-800 leading-snug">{it.acao}</p>
      </div>

      <RegiaoBloco regiao={regiao} cor={t.cor} />

      {/* ações: sempre na mesma posição */}
      <div className="grid grid-cols-4 gap-1.5 p-3 mt-1">
        <button
          data-atalho="rota:nova-visita" onClick={() => navigate('/visitas', { state: estadoVisita({
            propriedadeId: it.propriedadeId, contato: regiao?.cliente?.contato, propriedade: it.titulo,
            cidade: it.cidade, telefone: it.telefone, culturas: regiao?.cliente?.culturas || regiao?.culturas?.filter((c) => c.doCliente).map((c) => c.nome),
          }) })}
          className={`${acaoBase} bg-blue-700 text-white`}
        >
          <ClipboardList size={18} /> Visita
        </button>
        {it.telefone
          ? <a href={`tel:${it.telefone}`} className={`${acaoBase} border border-slate-200 text-slate-700`}><Phone size={18} /> Ligar</a>
          : <span className={`${acaoBase} border border-slate-100 text-slate-300`} aria-disabled="true"><Phone size={18} /> Ligar</span>}
        {it.lat != null
          ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`} target="_blank" rel="noreferrer" className={`${acaoBase} border border-slate-200 text-slate-700`}><Navigation size={18} /> Rota</a>
          : <span className={`${acaoBase} border border-slate-100 text-slate-300`} aria-disabled="true"><Navigation size={18} /> Rota</span>}
        <button onClick={onFeito} className={`${acaoBase} ${feito ? 'bg-green-600 text-white' : 'border border-green-600 text-green-700'}`}>
          <Check size={18} /> {feito ? 'Feito' : 'Feito?'}
        </button>
      </div>
    </article>
  )
}

export default function MinhaRota({ abaInicial = 'hoje' }) {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [pool, setPool] = useState(() => lerJSON('feed-pool', null))
  const [perfil, setPerfil] = useState(() => lerJSON('perfil-vendedor', null))
  const [carregando, setCarregando] = useState(!pool)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState(() => new URLSearchParams(window.location.search).get('aba') || abaInicial)
  const [qtd, setQtd] = useState(() => Number(localStorage.getItem('rota-qtd')) || 10)
  const [cidadesDia, setCidadesDia] = useState(null)
  const [origem, setOrigem] = useState({ nome: 'Loja (Piraju)', pos: LOJA })
  const [feitos, setFeitos] = useState(() => lerJSON(`rota-feitos-${hojeISO()}`, []))

  useEffect(() => {
    if (!vendedor.id) return
    let vivo = true
    ;(async () => {
      try {
        const [p, f] = await Promise.all([
          supabase.from('iv_feed_pool').select('*').eq('vendedor_id', vendedor.id).maybeSingle(),
          supabase.from('iv_perfil_vendedor').select('*').eq('vendedor_id', vendedor.id).maybeSingle(),
        ])
        if (!vivo) return
        if (p.error) throw p.error
        if (p.data) { setPool(p.data); localStorage.setItem('feed-pool', JSON.stringify(p.data)) }
        if (f.data) { setPerfil(f.data); localStorage.setItem('perfil-vendedor', JSON.stringify(f.data)) }
        if (!p.data && !pool) await usarExemplo(!f.data)
      } catch {
        if (!vivo) return
        if (pool) setErro('Sem conexão: mostrando a última rota guardada no celular.')
        else await usarExemplo(!perfil)
      } finally { if (vivo) setCarregando(false) }

      // Vendedor sem contatos no Portal (ex.: usuário de teste): rota de EXEMPLO, com os
      // mesmos dados fictícios da Inteligência de Vendas. Não vai para o localStorage.
      async function usarExemplo(comPerfil) {
        const { carregarFeed } = await import('../lib/iv/fonte')
        const ex = await carregarFeed()
        if (!vivo) return
        setPool({ ...ex, exemplo: true })
        if (comPerfil) setPerfil({ perfil: ex.vendedor.perfil, mix: ex.vendedor.mix, exemplo: true })
      }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itens = useMemo(() => pool?.itens || [], [pool])
  const cidades = useMemo(() => resumoCidades(itens), [itens])
  const mix = perfil?.mix || PERFIS.equilibrado.mix
  const P = perfil ? PERFIS[perfil.perfil] : null
  // plano da semana: guardado no celular por semana; montado na 1ª vez que abre
  const segunda = segundaDaSemana()
  // Rota de exemplo guarda o plano em outra chave: não mistura com o plano real nem vai para a Agenda
  const exemplo = !!pool?.exemplo
  const chavePlano = exemplo ? `rota-semana-exemplo:${segunda}` : `rota-semana:${segunda}`
  const [plano, setPlanoBruto] = useState(() => lerJSON(chavePlano, null))
  useEffect(() => { setPlanoBruto(lerJSON(chavePlano, null)) }, [chavePlano])
  const [envio, setEnvio] = useState({ estado: '' }) // '' | enviando | ok | erro
  const setPlano = (p) => { setPlanoBruto(p); try { localStorage.setItem(chavePlano, JSON.stringify(p)) } catch { /* sem espaço */ } }
  const remontar = (porDia) => setPlano(montarPlanoSemana({ itens, cidades, mix, segunda, porDia, inicio: LOJA }))
  useEffect(() => { if (!plano && itens.length) remontar(undefined) }, [itens.length, chavePlano, plano]) // eslint-disable-line react-hooks/exhaustive-deps
  const [diaVer, setDiaVer] = useState(null) // dia do plano aberto pelo 'Ver no mapa' da Semana
  const planoHoje = diaVer != null ? plano?.dias[diaVer] : plano?.dias.find((d) => d.dia === hojeISO() && d.itens.length)
  const peloPlano = !!planoHoje && cidadesDia == null
  const escolhidas = cidadesDia ?? (planoHoje ? planoHoje.cidades : sugerirCidadesDoDia(cidades))

  const doDia = useMemo(() => (peloPlano ? planoHoje.itens : aplicarMix(itens.filter((i) => escolhidas.includes(i.cidade)), mix, qtd)), [peloPlano, planoHoje, itens, escolhidas, mix, qtd])
  const rota = useMemo(() => ordemPeloMapa(doDia, origem.pos), [doDia, origem])
  const regiaoDe = useRegiao() // culturas da cidade × máquinas em estoque
  const [ordemMapa, setOrdemMapa] = useState(null) // ordem do caminho pelas estradas
  const CORES_TIPO = { carteira: TIPOS.carteira.cor, recuperar: TIPOS.recuperar.cor, novos: TIPOS.novos.cor }

  const enviar = async (p) => {
    setEnvio({ estado: 'enviando' })
    try {
      const pronto = await publicarSemana(p)
      // só marca como enviado se ninguém mexeu na semana durante o envio (senão envia de novo)
      const atual = lerJSON(chavePlano, null)
      if (atual && JSON.stringify(atual.dias) === JSON.stringify(p.dias)) setPlano({ ...atual, confirmadoEm: pronto.confirmadoEm, mudouDepois: false })
      setEnvio({ estado: 'ok' })
    } catch (e) {
      setEnvio({ estado: 'erro', msg: e?.message || 'sem conexão' })
    }
  }
  useEffect(() => {
    if (!precisaEnviar(plano, exemplo)) return
    const t = setTimeout(() => { enviar(plano) }, 2500)
    return () => clearTimeout(t)
  }, [plano, exemplo]) // eslint-disable-line react-hooks/exhaustive-deps
  const publicar = () => (exemplo ? alert('Esta é uma rota de exemplo: ela não vai para a Agenda do Portal.') : enviar(plano))

  const marcar = (id) => {
    const n = feitos.includes(id) ? feitos.filter((x) => x !== id) : [...feitos, id]
    setFeitos(n); localStorage.setItem(`rota-feitos-${hojeISO()}`, JSON.stringify(n))
  }
  const alternarCidade = (c) => setCidadesDia((atual) => {
    setDiaVer(null)
    const base = atual ?? escolhidas
    return base.includes(c) ? base.filter((x) => x !== c) : [...base, c]
  })
  const daMinhaPosicao = async () => {
    try { const g = await capturarGPS(); setOrigem({ nome: 'Onde estou', pos: [g.latitude, g.longitude] }) } catch { alert('Não consegui pegar o GPS agora.') }
  }

  if (carregando) return <div className="py-16 text-center text-slate-500"><div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Montando a sua rota…</div>
  if (!pool || !itens.length) {
    return (
      <div className="text-center py-12 px-4">
        <p className="mb-3 flex justify-center text-slate-400"><Compass size={48} /></p>
        <p className="font-bold text-lg">Sua rota ainda não foi montada</p>
        <p className="text-slate-500 text-sm mt-1">Ela é preparada pelo portal a partir das cidades que o supervisor atribuiu a você. Peça para o supervisor conferir as suas cidades.</p>
      </div>
    )
  }

  const feitosHoje = doDia.filter((i) => feitos.includes(i.id)).length
  return (
    <div>
      <style>{ESTILO}</style>
      {/* topo: perfil */}
      <div className="rounded-3xl p-4 text-white mb-4 shadow-md animate-fade-in" style={{ background: `linear-gradient(150deg, ${P?.cor || '#991b1b'}, #0f172a)` }}>
        <div className="flex items-center gap-3">
          <span className="shrink-0">{P ? <Icone nome={P.icone} size={38} /> : <Compass size={38} />}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Minha rota {P ? `· perfil ${P.nome}` : ''}</p>
            <p className="font-black text-lg leading-tight">{doDia.length} contatos {diaVer != null ? `na ${DIAS_SEMANA[diaVer].toLowerCase()}` : 'para hoje'}</p>
            <p className="text-xs opacity-80">{feitosHoje} feito(s) · {pool.cidades?.length || cidades.length} cidades na sua área</p>
          </div>
          <button onClick={() => navigate('/perfil-teste')} className="text-xs font-bold bg-white/20 rounded-xl px-3 py-2">{P ? 'Refazer teste' : 'Fazer o teste'}</button>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-white/20">
          {['carteira', 'recuperar', 'novos'].map((t) => <div key={t} style={{ width: `${(mix[t] || 0) * 100}%`, background: TIPOS[t].cor }} />)}
        </div>
        <div className="flex gap-3 mt-1 text-[11px] opacity-90">{['carteira', 'recuperar', 'novos'].map((t) => <span key={t}><Icone nome={TIPOS[t].icone} size={11} className="-mt-0.5" /> {TIPOS[t].nome} {Math.round((mix[t] || 0) * 100)}%</span>)}</div>
      </div>
      {!P && (
        <button onClick={() => navigate('/perfil-teste')} className="w-full mb-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-3 text-left animate-pulse-glow">
          <b className="text-blue-800 inline-flex items-center gap-1.5"><Target size={16} /> Faça o teste de perfil (1 minuto)</b>
          <p className="text-xs text-blue-700">A rota passa a trazer mais do tipo de contato em que você é melhor. Por enquanto ela vai equilibrada.</p>
        </button>
      )}
      {erro && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2 mb-3">{erro}</p>}
      {pool.exemplo && (
        <p className="text-xs text-amber-800 bg-amber-100 rounded-xl p-2 mb-3">
          <b>Rota de exemplo.</b> Você ainda não tem contatos no Portal, então esta rota usa clientes fictícios de Piraju e região para mostrar como funciona.
        </p>
      )}

      {/* abas */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
        {[['hoje', <><ClipboardList size={15} /> Hoje</>], ['mapa', <><IconeMapa size={15} /> Pelo mapa</>], ['semana', <><Calendar size={15} /> Semana</>]].map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)} className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-bold transition-all ${aba === k ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{r}</button>
        ))}
      </div>

      {(aba === 'hoje' || aba === 'mapa') && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Cidades de hoje {peloPlano ? <span className="normal-case font-semibold text-blue-700">· do seu plano da semana</span> : cidadesDia == null && <span className="normal-case font-semibold text-blue-700">· sugestão: a de mais oportunidade e as vizinhas</span>}</p>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
            {cidades.map((c) => {
              const on = escolhidas.includes(c.cidade)
              return (
                <button key={c.cidade} onClick={() => alternarCidade(c.cidade)} className={`shrink-0 rounded-2xl border-2 px-3 py-2 text-left transition-all ${on ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white'}`}>
                  <b className="text-sm block whitespace-nowrap">{c.cidade}</b>
                  <span className={`text-[11px] ${on ? 'text-blue-100' : 'text-slate-500'}`}>{c.qtd} contatos</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mb-4 text-sm">
            {peloPlano ? <span className="text-slate-500">{doDia.length} contatos do plano da semana · <button onClick={() => setAba('semana')} className="text-blue-700 font-semibold underline">editar na Semana</button></span> : <><span className="text-slate-500">Quantos hoje:</span>
            {[6, 10, 15].map((n) => <button key={n} onClick={() => { setQtd(n); localStorage.setItem('rota-qtd', String(n)) }} className={`px-3 py-1 rounded-full font-bold ${qtd === n ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{n}</button>)}</>}
          </div>
        </>
      )}

      {aba === 'hoje' && (
        <div className="space-y-3">
          {doDia.map((it, k) => <Cartao key={it.id} it={it} n={k + 1} feito={feitos.includes(it.id)} onFeito={() => marcar(it.id)} regiao={regiaoDe(it)} />)}
          {!doDia.length && <p className="text-center text-slate-400 py-8">Escolha ao menos uma cidade.</p>}
        </div>
      )}

      {aba === 'mapa' && (
        <>
          <RotaNoMapa
            origem={{ ...origem, ehLoja: origem.nome.startsWith('Loja') }}
            itens={doDia}
            cores={CORES_TIPO}
            onOrdem={setOrdemMapa}
            onAbrir={(it) => navigate(`/inteligencia/cliente/${encodeURIComponent(idFicha(it))}`)}
            onOrigem={(tipo, pos) => {
              if (tipo === 'loja') setOrigem({ nome: 'Loja (Piraju)', pos: LOJA })
              else if (pos) setOrigem({ nome: 'Onde estou', pos })
              else daMinhaPosicao()
            }}
          />
          <div className="space-y-3">
            {(ordemMapa || rota.itens).map((it, k) => <Cartao key={it.id} it={it} n={k + 1} feito={feitos.includes(it.id)} onFeito={() => marcar(it.id)} regiao={regiaoDe(it)} />)}
          </div>
        </>
      )}

      {aba === 'semana' && plano && (
        <SemanaEditavel plano={plano} setPlano={setPlano} itensPool={itens} remontar={remontar} publicar={publicar} envio={envio} exemplo={exemplo} hoje={hojeISO()}
          abrirDia={(k) => { setCidadesDia(null); setDiaVer(k); setAba('mapa') }} />
      )}
    </div>
  )
}

const ESTILO = `@keyframes mr-entra { from { opacity: 0; transform: translateY(10px) } }`
