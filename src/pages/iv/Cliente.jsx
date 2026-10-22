// =============================================================================
// /inteligencia/cliente/:id — FICHA 360 do cliente (a mesma ficha para todas as telas).
// Port de Ficha360.tsx + FichaAbas.tsx + FichaExecutiva.tsx do Portal, no celular:
// topo colorido pelo tipo de conversa, ações rápidas e 5 abas.
// =============================================================================
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calculator, CalendarPlus, Clock, History, LayoutDashboard, MapPin, MessageCircle, Phone, Ruler, Sprout, Tractor, UserRound, Building2, FileText } from 'lucide-react'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import { carregarFicha, MODO_EXEMPLO } from '../../lib/iv/fonte'
import { ComoLer, Conta, EstilosIV, foneBonito, linkTel, linkWhats, mil, tipoDe, Vazio } from '../../components/iv/oport/comum'
import { AbaHistorico, AbaMaquinas, AbaMercado, AbaPropostas, AbaResumo } from '../../components/iv/oport/FichaAbas'
import MaquinasParaCultura from '../../components/iv/MaquinasParaCultura'
import { estadoVisita } from '../../lib/visitaPrefill'

const ABAS = [
  { id: 'resumo', rotulo: 'Resumo', icone: LayoutDashboard },
  { id: 'maquinas', rotulo: 'Máquinas', icone: Tractor },
  { id: 'historico', rotulo: 'Compras e visitas', icone: History },
  { id: 'propostas', rotulo: 'Propostas', icone: FileText },
  { id: 'mercado', rotulo: 'Mercado da cidade', icone: Building2 },
]

const AJUDA = [
  'O topo tem a cor do tipo de conversa (Renovar, Vender mais, Conquistar ou Recuperar) e o score de 0 a 100: quanto maior, mais motivos para ligar agora.',
  'Resumo: a ação sugerida, os motivos com o que oferecer, o que está esperando retorno nosso e as peças deste ano contra o ano anterior.',
  'Máquinas: a frota que ele tem no campo (nossa e de outra marca), com o horímetro. Vermelho = acima de 5.000 h.',
  'Compras e visitas: linha do tempo de máquinas, peças, oficina e visitas do CRM, da mais nova para a mais antiga.',
  'Propostas: abertas, ganhas e perdidas, com o motivo de estar parada.',
  'Mercado da cidade: dados do IBGE, Censo Agro, crédito rural e concorrência no município dele.',
]

function Acao({ href, to, state, icone: I, rotulo, cor, claro, externo }) {
  const cls = 'iv-toque flex flex-col items-center justify-center gap-1 rounded-2xl h-[62px] text-[12px] font-bold'
  const st = claro ? { background: '#fefefe', color: claro } : cor ? { background: cor, color: '#fefefe' } : { background: 'rgba(255,255,255,.18)', color: '#fefefe' }
  const corpo = <><I size={19} aria-hidden="true" /> {rotulo}</>
  if (to) return <Link to={to} state={state} className={cls} style={st}>{corpo}</Link>
  if (!href) return <span className={`${cls} opacity-40`} style={st}>{corpo}</span>
  return <a href={href} className={cls} style={st} {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}>{corpo}</a>
}

export default function Cliente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { dados: f, carregando, erro, recarregar } = useDados(() => carregarFicha(id), [id])
  const [aba, setAba] = useState('resumo')
  const voltar = () => (window.history.length > 1 ? navigate(-1) : navigate('/inteligencia/oportunidades'))

  const botaoVoltar = (
    <button type="button" onClick={voltar} className="mb-3 inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-full border border-slate-200 bg-white text-[13px] font-semibold text-slate-700 iv-toque">
      <ArrowLeft size={16} aria-hidden="true" /> Voltar
    </button>
  )
  if (erro) return <div>{botaoVoltar}<ErroIV erro={erro} onTentar={recarregar} /></div>
  if (carregando) return <div>{botaoVoltar}<CarregandoIV linhas={5} /></div>
  if (!f) return <div>{botaoVoltar}<CabecalhoIV titulo="Cliente não encontrado" /><Vazio icone={UserRound}>Não achamos esse cliente na base da Inteligência de Vendas.</Vazio></div>

  const c = f.cliente
  const t = tipoDe(c)
  const cor = t.id ? t.cor : '#dc2626'
  const r = 30, circ = 2 * Math.PI * r
  const texto = `Olá${c.contato ? `, ${c.contato.split(' ')[0]}` : ''}! Aqui é da Nova Tratores.`

  return (
    <div>
      <EstilosIV />
      <div className="flex items-center justify-between">
        {botaoVoltar}
        <div className="mb-3 flex items-center gap-2">
          {MODO_EXEMPLO && <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Dados de exemplo</span>}
          <ComoLer titulo="Como ler a ficha" itens={AJUDA} />
        </div>
      </div>

      <header className="iv-entra relative overflow-hidden rounded-3xl p-4 text-white iv-brilho" style={{ background: `linear-gradient(140deg, ${cor}, color-mix(in srgb, ${cor} 62%, #0f172a))`, boxShadow: `0 14px 30px ${cor}45` }}>
        <div className="relative flex gap-3 items-start">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-90">{t.id ? t.nome : 'Cliente'} · {c.tipoPessoa || (c.doc?.length > 11 ? 'PJ' : 'PF')}</div>
            <h1 className="text-[22px] font-extrabold leading-tight mt-0.5">{c.nome}</h1>
            {c.contato && <div className="text-[13px] opacity-90 mt-0.5 flex items-center gap-1"><UserRound size={13} aria-hidden="true" /> {c.contato}</div>}
            <div className="text-[13px] opacity-90 mt-0.5 flex items-center gap-1"><MapPin size={13} aria-hidden="true" /> {c.cidade}{c.uf ? `/${c.uf}` : ''}{c.vendedor ? ` · ${c.vendedor}` : ''}</div>
            {c.telefone && <div className="text-[17px] font-bold mt-1 tracking-wide">{foneBonito(c.telefone)}</div>}
          </div>
          <div className="relative shrink-0" style={{ width: 76, height: 76 }} title="Score: soma dos motivos para ligar (0 a 100)">
            <svg width="76" height="76" className="-rotate-90">
              <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="7" />
              <circle cx="38" cy="38" r={r} fill="none" stroke="#fefefe" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - c.score / 100)} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)' }} />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-center leading-none"><span><b className="text-[22px]"><Conta valor={c.score} /></b><br /><span className="text-[10px] opacity-85">score</span></span></div>
          </div>
        </div>

        <div className="relative flex flex-wrap gap-1.5 mt-3">
          {c.areaHa ? <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold"><Ruler size={12} aria-hidden="true" /> {mil(c.areaHa)} ha</span> : null}
          {(c.culturas || []).map((x) => <span key={x} className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold"><Sprout size={12} aria-hidden="true" /> {x}</span>)}
          {c.ultimaVisita && <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-semibold"><Clock size={12} aria-hidden="true" /> visita {c.ultimaVisita.slice(8, 10)}/{c.ultimaVisita.slice(5, 7)}/{c.ultimaVisita.slice(2, 4)}</span>}
        </div>

        <div className="relative grid grid-cols-4 gap-2 mt-4">
          <Acao href={linkTel(c.telefone)} icone={Phone} rotulo="Ligar" claro={cor} />
          <Acao href={linkWhats(c.telefone, texto)} icone={MessageCircle} rotulo="WhatsApp" cor="#16a34a" externo />
          <Acao to={`/inteligencia/calculadora?cliente=${encodeURIComponent(c.id || c.chave)}`} icone={Calculator} rotulo="Calculadora" />
          <Acao
            to="/visitas"
            state={estadoVisita({ propriedadeId: c.propriedadeId, contato: c.contato, nome: c.nome, propriedade: c.nome, cidade: c.cidade, telefone: c.telefone, culturas: c.culturas })}
            icone={CalendarPlus}
            rotulo="Nova visita"
          />
        </div>
      </header>

      {/* culturas do cliente × estoque da loja */}
      <MaquinasParaCultura cliente={c} municipio={f.municipio} />

      {/* abas estilo Chrome, presas no topo ao rolar */}
      <nav className="sticky top-0 z-20 -mx-4 px-4 pt-3 pb-2 bg-[#fefefe]/95 backdrop-blur" aria-label="Partes da ficha">
        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {ABAS.map((a) => {
            const on = aba === a.id
            return (
              <button key={a.id} type="button" onClick={() => setAba(a.id)} aria-pressed={on}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold transition whitespace-nowrap"
                style={on ? { background: '#0f172a', color: '#fefefe' } : { background: '#f1f5f9', color: '#475569' }}>
                <a.icone size={15} aria-hidden="true" /> {a.rotulo}
              </button>
            )
          })}
        </div>
      </nav>

      <div key={aba} className="mt-2">
        {aba === 'resumo' && <AbaResumo f={f} trocar={setAba} />}
        {aba === 'maquinas' && <AbaMaquinas f={f} />}
        {aba === 'historico' && <AbaHistorico f={f} />}
        {aba === 'propostas' && <AbaPropostas f={f} />}
        {aba === 'mercado' && <AbaMercado f={f} />}
      </div>
    </div>
  )
}
