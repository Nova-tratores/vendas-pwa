// Página de teste dos módulos: o caminho do vendedor, igual nas 3 opções de organização.
//   Rota do dia → Ficha do cliente → Escolher o atendimento → Visita (3 passos) → próximo da rota
// Também: módulo Notícias e módulo Meu perfil. Tudo com dados de exemplo (dadosExemplo.js).
import { useState } from 'react'
import {
  ArrowLeft, ArrowRight, Calendar, Check, ChevronRight, CircleCheck, Compass, FileText, Handshake, Mail,
  MapPin, MessageCircle, Newspaper, Phone, Repeat, Sparkles, Sprout, Target, ThumbsDown, ThumbsUp, Tractor, User, Users,
} from 'lucide-react'
import { PERFIS, TIPOS } from '../../lib/rotaFeed'
import { CONTATOS_EXEMPLO, NOTICIAS_EXEMPLO, VENDEDOR_EXEMPLO } from './dadosExemplo'

export const ICONE_TIPO = { carteira: Handshake, recuperar: Repeat, novos: Sprout }

// objetivo sugerido de acordo com o tipo do contato
const OBJETIVOS = [
  { key: 'renovar', nome: 'Renovar o trator', tipos: ['carteira'] },
  { key: 'implemento', nome: 'Vender implemento', tipos: ['carteira'] },
  { key: 'fechar', nome: 'Fechar a proposta', tipos: ['recuperar'] },
  { key: 'reabordar', nome: 'Entender por que perdeu', tipos: ['recuperar'] },
  { key: 'conhecer', nome: 'Primeiro contato', tipos: ['novos'] },
  { key: 'pos', nome: 'Pós-venda / relacionamento', tipos: ['carteira', 'recuperar', 'novos'] },
]
const COMO = [
  { key: 'presencial', nome: 'Presencial', icone: MapPin },
  { key: 'telefonema', nome: 'Ligação', icone: Phone },
  { key: 'mensagem', nome: 'WhatsApp', icone: MessageCircle },
  { key: 'email', nome: 'E-mail', icone: Mail },
]
const RESULTADOS = [
  { key: 'vendeu', nome: 'Vendeu', icone: ThumbsUp, cor: '#16a34a' },
  { key: 'proposta', nome: 'Vai receber proposta', icone: FileText, cor: '#2563eb' },
  { key: 'retornar', nome: 'Voltar depois', icone: Calendar, cor: '#d97706' },
  { key: 'perdeu', nome: 'Não tem interesse', icone: ThumbsDown, cor: '#64748b' },
]

export function SeloTipo({ tipo, pequeno }) {
  const t = TIPOS[tipo]; const I = ICONE_TIPO[tipo]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-bold ${pequeno ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'}`} style={{ background: t.fundo, color: t.cor }}>
      <I size={pequeno ? 11 : 13} /> {t.nome}
    </span>
  )
}

function Topo({ titulo, voltar, direita }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {voltar && <button onClick={voltar} className="w-9 h-9 grid place-items-center rounded-full bg-white border border-slate-200 active:scale-95"><ArrowLeft size={18} /></button>}
      <h2 className="text-lg font-black text-slate-900 flex-1 leading-tight">{titulo}</h2>
      {direita}
    </div>
  )
}

/** Lista da rota de hoje (resumida). `compacta` = versão da Jornada. */
export function RotaDoDia({ feitos, abrir, compacta }) {
  const total = CONTATOS_EXEMPLO.length
  return (
    <div>
      {!compacta && (
        <div className="rounded-2xl p-4 mb-3 text-white" style={{ background: 'linear-gradient(135deg,#b91c1c,#7f1d1d)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wide opacity-80">Rota de hoje · Piraju, Fartura e Tejupá</div>
          <div className="text-2xl font-black mt-0.5">{feitos.length} de {total} feitos</div>
          <div className="h-2 rounded-full bg-white/20 mt-2 overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${(feitos.length / total) * 100}%` }} /></div>
          <div className="text-xs opacity-80 mt-2 flex items-center gap-1"><Compass size={13} /> ≈ 105 km saindo da Loja</div>
        </div>
      )}
      <div className="space-y-2">
        {CONTATOS_EXEMPLO.map((c, i) => {
          const feito = feitos.includes(c.id); const t = TIPOS[c.tipo]
          return (
            <button key={c.id} onClick={() => abrir(c)} className={`w-full text-left bg-white rounded-2xl border p-3 flex items-center gap-3 active:scale-[.99] transition ${feito ? 'opacity-55 border-slate-200' : 'border-slate-200 shadow-sm'}`}>
              <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center font-black text-white text-sm" style={{ background: feito ? '#16a34a' : t.cor }}>{feito ? <Check size={17} /> : i + 1}</span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2"><b className="text-slate-900 truncate">{c.titulo}</b></span>
                <span className="block text-xs text-slate-500 truncate">{c.cidade} · {c.km} km · {c.porque}</span>
              </span>
              <SeloTipo tipo={c.tipo} pequeno />
              <ChevronRight size={18} className="text-slate-300 shrink-0" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Ficha do cliente: tudo que ele precisa saber ANTES de escolher o atendimento. */
export function FichaCliente({ c, voltar, escolher }) {
  const t = TIPOS[c.tipo]
  return (
    <div>
      <Topo titulo={c.titulo} voltar={voltar} />
      <div className="rounded-2xl p-4 mb-3 border" style={{ background: t.fundo, borderColor: t.cor + '33' }}>
        <div className="flex items-center justify-between mb-2"><SeloTipo tipo={c.tipo} /><b className="text-sm" style={{ color: t.cor }}>{c.selo}</b></div>
        <div className="text-xs text-slate-500 flex items-center gap-1 mb-2"><MapPin size={12} /> {c.cidade} · {c.sub}</div>
        <div className="text-[11px] font-bold uppercase text-slate-500">Por que visitar</div>
        <p className="text-sm text-slate-800 mb-2">{c.porque}</p>
        <div className="text-[11px] font-bold uppercase text-slate-500">O que oferecer</div>
        <p className="text-sm font-semibold text-slate-900">{c.acao}</p>
      </div>
      <Bloco titulo="Máquinas" icone={Tractor} vazio="Nenhuma máquina cadastrada" itens={c.maquinas} />
      <Bloco titulo="Histórico" icone={Calendar} vazio="Nunca foi atendido: é o primeiro contato" itens={c.historico} />
      <div className="flex gap-2 mt-4">
        {c.telefone && <a href={`tel:${c.telefone}`} className="px-4 py-3 rounded-xl border border-slate-300 bg-white font-semibold inline-flex items-center gap-1.5"><Phone size={16} /> Ligar</a>}
        <button onClick={escolher} className="flex-1 py-3 rounded-xl text-white font-bold inline-flex items-center justify-center gap-2 active:scale-[.98]" style={{ background: '#b91c1c' }}>Escolher o atendimento <ArrowRight size={17} /></button>
      </div>
    </div>
  )
}

function Bloco({ titulo, icone: I, itens, vazio }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 mb-2">
      <div className="text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5"><I size={13} /> {titulo}</div>
      {itens.length ? itens.map((x) => <p key={x} className="text-sm text-slate-700 py-0.5">{x}</p>) : <p className="text-sm text-slate-400 italic">{vazio}</p>}
    </div>
  )
}

/** Escolher o atendimento: COMO (presencial, ligação…) + OBJETIVO (sugerido pelo tipo do contato). */
export function EscolherAtendimento({ c, voltar, comecar }) {
  const sugeridos = OBJETIVOS.filter((o) => o.tipos.includes(c.tipo))
  const [como, setComo] = useState(c.tipo === 'novos' ? 'presencial' : '')
  const [obj, setObj] = useState(sugeridos[0].key)
  return (
    <div>
      <Topo titulo="Como vai ser o atendimento?" voltar={voltar} />
      <p className="text-sm text-slate-500 mb-3">{c.titulo} · {c.cidade}</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {COMO.map((m) => (
          <button key={m.key} onClick={() => setComo(m.key)} className={`rounded-2xl border-2 p-3 flex flex-col items-center gap-1 font-bold text-sm transition ${como === m.key ? 'border-red-700 bg-red-50 text-red-800' : 'border-slate-200 bg-white text-slate-600'}`}>
            <m.icone size={22} /> {m.nome}
          </button>
        ))}
      </div>
      <div className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><Target size={13} /> Objetivo</div>
      <div className="space-y-2 mb-4">
        {sugeridos.map((o, i) => (
          <button key={o.key} onClick={() => setObj(o.key)} className={`w-full text-left rounded-xl border-2 px-3 py-2.5 text-sm font-semibold flex items-center gap-2 ${obj === o.key ? 'border-red-700 bg-red-50 text-red-900' : 'border-slate-200 bg-white text-slate-700'}`}>
            <span className={`w-4 h-4 rounded-full border-2 ${obj === o.key ? 'border-red-700 bg-red-700' : 'border-slate-300'}`} /> {o.nome}
            {i === 0 && <span className="ml-auto text-[10px] font-bold text-red-700 inline-flex items-center gap-0.5"><Sparkles size={11} /> sugerido</span>}
          </button>
        ))}
      </div>
      <button disabled={!como} onClick={() => comecar({ como, obj })} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2" style={{ background: '#b91c1c' }}>
        {como === 'presencial' ? 'Fazer check-in e começar' : 'Começar o atendimento'} <ArrowRight size={17} />
      </button>
      {como === 'presencial' && <p className="text-[11px] text-slate-400 text-center mt-2">O GPS e a foto ficam registrados no check-in, como hoje.</p>}
    </div>
  )
}

/** A visita em 3 passos (o formulário de hoje, dividido e já preenchido com o que veio da rota). */
export function VisitaPassos({ c, atendimento, voltar, concluir }) {
  const [passo, setPasso] = useState(0)
  const [quem, setQuem] = useState([])
  const [res, setRes] = useState('')
  const [texto, setTexto] = useState('')
  const PASSOS = ['Quem atendeu', 'O que aconteceu', 'Próximo passo']
  const pessoas = c.tipo === 'novos' ? [] : ['Dono (cadastrado)', 'Filho / gerente']
  const pode = passo === 0 ? (quem.length || c.tipo === 'novos') : passo === 1 ? res : true
  return (
    <div>
      <Topo titulo={c.titulo} voltar={passo ? () => setPasso(passo - 1) : voltar} />
      <div className="flex gap-1.5 mb-1">{PASSOS.map((p, i) => <div key={p} className="h-1.5 flex-1 rounded-full transition-all" style={{ background: i <= passo ? '#b91c1c' : '#e2e8f0' }} />)}</div>
      <div className="text-xs text-slate-500 mb-4">Passo {passo + 1} de 3 · <b className="text-slate-700">{PASSOS[passo]}</b> · {COMO.find((m) => m.key === atendimento.como)?.nome}</div>

      {passo === 0 && (
        <div className="space-y-2">
          {pessoas.map((p) => (
            <button key={p} onClick={() => setQuem((q) => (q.includes(p) ? q.filter((x) => x !== p) : [...q, p]))} className={`w-full text-left rounded-xl border-2 px-3 py-3 flex items-center gap-2 font-semibold ${quem.includes(p) ? 'border-red-700 bg-red-50' : 'border-slate-200 bg-white'}`}>
              <User size={17} /> {p} {quem.includes(p) && <Check size={17} className="ml-auto text-red-700" />}
            </button>
          ))}
          <button className="w-full rounded-xl border-2 border-dashed border-slate-300 px-3 py-3 text-slate-500 font-semibold inline-flex items-center gap-2"><Users size={17} /> {c.tipo === 'novos' ? 'Cadastrar o dono e a propriedade' : 'Outra pessoa'}</button>
        </div>
      )}
      {passo === 1 && (
        <div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {RESULTADOS.map((r) => (
              <button key={r.key} onClick={() => setRes(r.key)} className="rounded-2xl border-2 p-3 flex flex-col items-center gap-1 text-sm font-bold transition" style={res === r.key ? { borderColor: r.cor, background: r.cor + '14', color: r.cor } : { borderColor: '#e2e8f0', background: '#fff', color: '#475569' }}>
                <r.icone size={22} /> {r.nome}
              </button>
            ))}
          </div>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder="Resumo da conversa (pode gravar áudio, como hoje)" className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
          {c.maquinas.length > 0 && <label className="flex items-center gap-2 text-sm mt-2 text-slate-600"><input type="checkbox" /> Acionar o pós-vendas para a máquina</label>}
        </div>
      )}
      {passo === 2 && (
        <div className="space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase">Quando falar de novo</div>
          <div className="flex gap-2">{['1 semana', '15 dias', '1 mês', 'Outra data'].map((d, i) => <button key={d} className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold ${i === 1 ? 'border-red-700 bg-red-50 text-red-800' : 'border-slate-200 bg-white'}`}>{d}</button>)}</div>
          <textarea rows={2} placeholder="O que ficou combinado" className="w-full rounded-xl border border-slate-300 p-3 text-sm" />
          <p className="text-[11px] text-slate-400">Vai para a Agenda e o portal acompanha (supervisor e Inteligência de Vendas).</p>
        </div>
      )}
      <button disabled={!pode} onClick={() => (passo < 2 ? setPasso(passo + 1) : concluir())} className="w-full mt-5 py-3 rounded-xl text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2" style={{ background: '#b91c1c' }}>
        {passo < 2 ? <>Continuar <ArrowRight size={17} /></> : <>Salvar a visita <Check size={17} /></>}
      </button>
    </div>
  )
}

export function Concluido({ proximo, irProximo, voltarRota }) {
  return (
    <div className="text-center pt-10">
      <div className="w-20 h-20 rounded-full mx-auto grid place-items-center text-white mb-4" style={{ background: '#16a34a', animation: 'tm-pop .45s ease' }}><CircleCheck size={42} /></div>
      <h2 className="text-xl font-black">Visita salva!</h2>
      <p className="text-sm text-slate-500 mb-6">Já entrou na sua agenda e no portal.</p>
      {proximo ? (
        <button onClick={irProximo} className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-left flex items-center gap-3 shadow-sm">
          <span className="flex-1"><span className="text-[11px] font-bold uppercase text-slate-400">Próximo da rota</span><b className="block">{proximo.titulo}</b><span className="text-xs text-slate-500">{proximo.cidade} · {proximo.km} km</span></span>
          <ArrowRight size={20} className="text-red-700" />
        </button>
      ) : <p className="font-bold text-green-700">Rota do dia completa!</p>}
      <button onClick={voltarRota} className="mt-3 text-sm text-slate-500 underline">Voltar para a rota</button>
    </div>
  )
}

/** Controla o caminho Rota → Ficha → Atendimento → Visita → Concluído. */
export function useFluxo() {
  // ?tela=ficha|atendimento|visita|ok abre direto naquela etapa (para conferir a página de teste)
  const [tela, setTela] = useState(() => {
    const q = new URLSearchParams(window.location.search); const nome = q.get('tela')
    const c = CONTATOS_EXEMPLO[Number(q.get('c') || 0)]
    return ['ficha', 'atendimento', 'visita', 'ok'].includes(nome) ? { nome, c, a: { como: 'presencial', obj: 'renovar' } } : { nome: 'rota' }
  })
  const [feitos, setFeitos] = useState([])
  const proximoDe = (id) => CONTATOS_EXEMPLO.find((c) => c.id !== id && !feitos.includes(c.id))
  const render = (rotaEl) => {
    const c = tela.c
    if (tela.nome === 'ficha') return <FichaCliente c={c} voltar={() => setTela({ nome: 'rota' })} escolher={() => setTela({ nome: 'atendimento', c })} />
    if (tela.nome === 'atendimento') return <EscolherAtendimento c={c} voltar={() => setTela({ nome: 'ficha', c })} comecar={(a) => setTela({ nome: 'visita', c, a })} />
    if (tela.nome === 'visita') return <VisitaPassos c={c} atendimento={tela.a} voltar={() => setTela({ nome: 'atendimento', c })} concluir={() => { setFeitos((f) => [...f, c.id]); setTela({ nome: 'ok', c }) }} />
    if (tela.nome === 'ok') { const p = proximoDe(c.id); return <Concluido proximo={p} irProximo={() => setTela({ nome: 'ficha', c: p })} voltarRota={() => setTela({ nome: 'rota' })} /> }
    return rotaEl
  }
  return { tela, setTela, feitos, abrir: (c) => setTela({ nome: 'ficha', c }), render, emFluxo: tela.nome !== 'rota' }
}

export function ModuloNoticias({ compacto }) {
  const lista = compacto ? NOTICIAS_EXEMPLO.slice(0, 3) : NOTICIAS_EXEMPLO
  return (
    <div>
      {!compacto && <Topo titulo="Notícias do agro" direita={<span className="text-xs text-slate-400">hoje, 06:30</span>} />}
      {!compacto && <p className="text-xs text-slate-500 mb-3 flex items-center gap-1"><Newspaper size={13} /> O mesmo boletim da Inteligência de Vendas do portal, com o que serve de argumento na visita.</p>}
      <div className="space-y-2">
        {lista.map((n) => (
          <div key={n.id} className="bg-white rounded-2xl border border-slate-200 p-3">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase mb-1">
              <span className="text-red-700">{n.editoria}</span>
              <span className={`px-1.5 py-0.5 rounded ${n.bom ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{n.bom ? 'bom para vender' : 'atenção'}</span>
            </div>
            <b className="block text-slate-900 leading-snug">{n.titulo}</b>
            {!compacto && <p className="text-sm text-slate-600 mt-1">{n.resumo}</p>}
            <div className="text-[11px] text-slate-400 mt-1">Fonte: {n.fonte}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ModuloPerfil({ compacto }) {
  const P = PERFIS[VENDEDOR_EXEMPLO.perfil]; const mix = VENDEDOR_EXEMPLO.mix
  return (
    <div>
      {!compacto && <Topo titulo="Meu perfil de vendedor" />}
      <div className="rounded-2xl p-4 text-white mb-3" style={{ background: `linear-gradient(135deg, ${P.cor}, #1e293b)` }}>
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-xl bg-white/15 grid place-items-center"><Handshake size={28} /></span>
          <div><div className="text-[11px] uppercase font-bold opacity-80">Seu ponto forte</div><b className="text-xl">{P.nome}</b></div>
        </div>
        {!compacto && <p className="text-sm opacity-90 mt-3">{P.texto}</p>}
        <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-white/20">{['carteira', 'recuperar', 'novos'].map((t) => <div key={t} style={{ width: `${mix[t] * 100}%`, background: TIPOS[t].cor }} />)}</div>
        <div className="flex gap-3 mt-1.5 text-[11px] opacity-90">{['carteira', 'recuperar', 'novos'].map((t) => <span key={t}>{TIPOS[t].nome} {Math.round(mix[t] * 100)}%</span>)}</div>
      </div>
      {!compacto && <button className="w-full py-3 rounded-xl border-2 border-red-700 text-red-800 font-bold inline-flex items-center justify-center gap-2"><Target size={17} /> Refazer o teste (8 perguntas)</button>}
    </div>
  )
}

/** Módulo ainda sem protótipo (Clientes, Agenda, Negócios, Catálogo…): só indica que é a tela de hoje. */
export function ModuloAtual({ nome, icone: I }) {
  return (
    <div className="text-center pt-16 text-slate-400">
      <I size={44} className="mx-auto mb-3" />
      <b className="block text-slate-700">{nome}</b>
      <p className="text-sm">A tela de hoje, sem mudança.</p>
    </div>
  )
}
