// /menu/:tipo — os clientes sugeridos de um grupo (carteira / recuperar / novos), com
// "Como escolhemos" (de onde vem cada dado) e, em cada cliente, POR QUE ele está aqui:
// os motivos com o peso de cada um somando a nota. Toque em Visita abre a visita já
// preenchida; Ficha abre a ficha 360 da Inteligência de Vendas.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ClipboardList, Database, FlaskConical, Handshake, Lightbulb, MapPin, Navigation, Phone, Repeat, Sprout, UserRound,
} from 'lucide-react'
import { carregarContatos, COMO_ESCOLHEMOS } from '../lib/contatosVendedor'
import { estadoVisita } from '../lib/visitaPrefill'

const ESTILO = {
  carteira: { icone: Handshake, cor: '#dc2626', fundo: '#fef2f2' },
  recuperar: { icone: Repeat, cor: '#d97706', fundo: '#fffbeb' },
  novos: { icone: Sprout, cor: '#16a34a', fundo: '#f0fdf4' },
}
const idFicha = (it) => it.clienteId || String(it.id || '').replace(/^[a-z]:/i, '')

function ComoEscolhemos({ tipo, regras, cor }) {
  const [aberto, setAberto] = useState(false)
  const c = COMO_ESCOLHEMOS[tipo]
  return (
    <section className="bg-white border border-slate-200 rounded-2xl mb-4 overflow-hidden">
      <button onClick={() => setAberto((v) => !v)} className="w-full flex items-center gap-2 p-3 text-left active:bg-slate-50" aria-expanded={aberto}>
        <Database size={16} style={{ color: cor }} />
        <span className="flex-1">
          <span className="block text-sm font-bold text-slate-900">Como escolhemos estes clientes</span>
          <span className="block text-[11px] text-slate-500">De onde vem cada dado e o que faz a nota subir</span>
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>
      {aberto && (
        <div className="px-3 pb-3 border-t border-slate-100 space-y-3 pt-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">De onde vêm os dados</p>
            <ul className="space-y-1.5">
              {c.dados.map(([nome, texto]) => (
                <li key={nome} className="text-xs text-slate-700 leading-snug"><b>{nome}:</b> {texto}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">O que conta para a nota</p>
            <ul className="space-y-1.5">
              {c.regras.filter((r) => regras[r]).map((r) => (
                <li key={r} className="flex gap-2 text-xs leading-snug">
                  <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ background: regras[r].cor }} />
                  <span><b>{regras[r].rotulo}:</b> {regras[r].explicacao}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-slate-500 mt-2">
              {c.ordem || 'A nota é a soma dos pesos dos motivos que o cliente tem (até 100). A lista vem da maior nota para a menor.'}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}

function CartaoContato({ it, n, motivo, regras, cor, fundo }) {
  const navigate = useNavigate()
  const [porque, setPorque] = useState(n === 1)
  const ops = motivo?.oportunidades || []
  const total = motivo?.score ?? null
  const cliente = motivo?.cliente
  return (
    <article className="ini-entra bg-white border border-slate-200 rounded-2xl overflow-hidden" style={{ animationDelay: `${Math.min(n, 10) * 40}ms` }}>
      <div className="p-3.5 pb-2">
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-black text-white shrink-0" style={{ background: cor }}>{n}</span>
          <button onClick={() => navigate(`/inteligencia/cliente/${encodeURIComponent(idFicha(it))}`)} className="min-w-0 flex-1 text-left">
            <span className="block font-bold text-[16px] leading-snug text-slate-900">{it.titulo}</span>
            <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5"><MapPin size={12} className="shrink-0" /><span className="truncate">{it.sub || it.cidade}</span></span>
            {cliente?.contato && <span className="flex items-center gap-1 text-xs text-slate-500"><UserRound size={12} className="shrink-0" /> {cliente.contato}</span>}
          </button>
          {it.selo && <span className="shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: fundo, color: cor }}>{it.selo}</span>}
        </div>

        <button onClick={() => setPorque((v) => !v)} className="mt-2.5 w-full flex items-center justify-between text-left" aria-expanded={porque}>
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Por que este cliente</span>
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${porque ? 'rotate-180' : ''}`} />
        </button>
        <p className="text-sm text-slate-700 leading-snug mt-1">{it.porque}</p>

        {porque && ops.length > 0 && (
          <div className="mt-2.5 rounded-xl bg-slate-50 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">A conta da nota {total != null ? `(${total} de 100)` : ''}</p>
            <ul className="space-y-1.5">
              {ops.map((o, k) => {
                const r = regras[o.regra] || { rotulo: o.regra, cor: '#64748b' }
                return (
                  <li key={k} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 flex-1 min-w-0 truncate">{r.rotulo}: {o.titulo}</span>
                      <span className="font-black shrink-0" style={{ color: r.cor }}>+{o.peso}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 mt-1 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, o.peso * (100 / Math.max(25, ...ops.map((x) => x.peso))))}%`, background: r.cor }} />
                    </div>
                    {o.porque && <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{o.porque}</p>}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
        {porque && !ops.length && it.tipo === 'novos' && (
          <p className="mt-2 text-[11px] text-slate-500 rounded-xl bg-slate-50 p-2.5">Vem do cadastro de imóveis rurais (CAR) cruzado com o uso do solo e o crédito rural: área grande, sem cliente nosso ligado e com dinheiro tomado para investir.</p>
        )}
        {porque && !ops.length && it.tipo === 'recuperar' && (
          <p className="mt-2 text-[11px] text-slate-500 rounded-xl bg-slate-50 p-2.5">Vem das propostas e negócios parados: quanto mais valor e mais dias sem resposta, mais para cima na lista.</p>
        )}

        <div className="mt-2.5 flex gap-2 rounded-xl px-3 py-2" style={{ background: fundo }}>
          <Lightbulb size={15} className="shrink-0 mt-0.5" style={{ color: cor }} />
          <p className="text-sm font-semibold text-slate-800 leading-snug">{it.acao}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-3 pt-1.5">
        <button
          data-atalho="contatos:nova-visita" onClick={() => navigate('/visitas', { state: estadoVisita({ propriedadeId: it.propriedadeId, contato: cliente?.contato, propriedade: it.titulo, cidade: it.cidade, telefone: it.telefone, culturas: cliente?.culturas }) })}
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold bg-blue-700 text-white active:bg-blue-800"
        >
          <ClipboardList size={18} /> Visita
        </button>
        {it.telefone
          ? <a href={`tel:${it.telefone}`} className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold border border-slate-200 text-slate-700"><Phone size={18} /> Ligar</a>
          : <span className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold border border-slate-100 text-slate-300"><Phone size={18} /> Ligar</span>}
        {it.lat != null
          ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold border border-slate-200 text-slate-700"><Navigation size={18} /> Como chegar</a>
          : <span className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-bold border border-slate-100 text-slate-300"><Navigation size={18} /> Como chegar</span>}
      </div>
    </article>
  )
}

export default function ContatosTipo() {
  const { tipo } = useParams()
  const navigate = useNavigate()
  const [r, setR] = useState(null)
  const [erro, setErro] = useState('')
  const [cidade, setCidade] = useState('todas')
  useEffect(() => {
    let vivo = true
    carregarContatos().then((x) => { if (vivo) setR(x) }).catch((e) => { if (vivo) setErro(e.message) })
    return () => { vivo = false }
  }, [])

  const info = COMO_ESCOLHEMOS[tipo]
  const est = ESTILO[tipo] || ESTILO.carteira
  const lista = useMemo(() => (r?.itens || []).filter((i) => i.tipo === tipo).sort((a, b) => (b.peso || 0) - (a.peso || 0)), [r, tipo])
  const cidades = useMemo(() => [...new Set(lista.map((i) => i.cidade).filter(Boolean))], [lista])
  const visiveis = cidade === 'todas' ? lista : lista.filter((i) => i.cidade === cidade)
  if (!info) return <p className="text-sm text-slate-500">Grupo não encontrado.</p>
  const I = est.icone

  return (
    <div className="pb-4">
      <button onClick={() => navigate('/menu')} className="inline-flex items-center gap-1 text-sm text-blue-700 mb-3"><ArrowLeft size={16} /> Menu</button>
      <header className="flex items-center gap-3 mb-3">
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0" style={{ background: est.fundo, color: est.cor }}><I size={24} /></span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{info.titulo} {r && <span className="text-slate-400 font-semibold">· {lista.length}</span>}</h1>
          <p className="text-sm text-slate-500 leading-snug">{info.frase}</p>
        </div>
      </header>
      {r?.exemplo && (
        <p className="text-xs text-amber-800 bg-amber-100 rounded-xl p-2 mb-3 inline-flex items-start gap-1.5">
          <FlaskConical size={14} className="shrink-0 mt-0.5" /> Você ainda não tem contatos no Portal: esta lista usa clientes fictícios de Piraju e região.
        </p>
      )}

      <ComoEscolhemos tipo={tipo} regras={r?.regras || {}} cor={est.cor} />

      {cidades.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
          {['todas', ...cidades].map((c) => (
            <button key={c} onClick={() => setCidade(c)} className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${cidade === c ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-300'}`}>
              {c === 'todas' ? 'Todas as cidades' : c}
            </button>
          ))}
        </div>
      )}

      {erro && <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3">Não foi possível carregar: {erro}</p>}
      {!r && !erro && <div className="space-y-3">{[0, 1, 2].map((k) => <div key={k} className="h-48 rounded-2xl bg-slate-100 animate-pulse" />)}</div>}
      {r && !visiveis.length && <p className="text-center text-slate-400 py-10">Nenhum cliente neste grupo agora.</p>}
      <div className="space-y-3">
        {visiveis.map((it, k) => (
          <CartaoContato key={it.id} it={it} n={k + 1} motivo={r.motivos.get(it.clienteId)} regras={r.regras} cor={est.cor} fundo={est.fundo} />
        ))}
      </div>
    </div>
  )
}
