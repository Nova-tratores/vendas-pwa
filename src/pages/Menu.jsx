// Menu do app em MÓDULOS por assunto (José, 21/10/2026: "despoluir a barra de baixo —
// só o Início, que é o feed, e o menu"). O primeiro módulo é "O que você gostaria de
// fazer?": nova visita e os três grupos de clientes sugeridos, cada um explicando
// de onde vêm os dados e por que o cliente foi escolhido (/menu/<tipo>).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Calculator, Calendar, Car, ChevronRight, CircleHelp, ClipboardCheck, Compass, DoorOpen, Handshake,
  Lightbulb, MapPin, Map as IconeMapa, Package, Plus, Repeat, Settings, Sprout, Tractor, User, UserCircle, Users, Wallet,
} from 'lucide-react'
import { carregarContatos } from '../lib/contatosVendedor'

const GRUPOS_CLIENTES = [
  { tipo: 'carteira', titulo: 'Carteira', frase: 'Já compram com a gente: renovar, vender implemento, voltar a visitar.', icone: Handshake, cor: '#dc2626', fundo: '#fef2f2' },
  { tipo: 'recuperar', titulo: 'Recuperar', frase: 'Proposta parada ou perdida que ainda pode voltar.', icone: Repeat, cor: '#d97706', fundo: '#fffbeb' },
  { tipo: 'novos', titulo: 'Clientes novos', frase: 'Ainda não compram, mas têm área e crédito para comprar.', icone: Sprout, cor: '#16a34a', fundo: '#f0fdf4' },
]

const MODULOS = [
  {
    titulo: 'Meu dia',
    itens: [
      { to: '/rota', rotulo: 'Minha rota', icone: Compass },
      { to: '/agenda', rotulo: 'Agenda', icone: Calendar },
      { to: '/visitas', rotulo: 'Visitas', icone: MapPin },
      { to: '/notificacoes', rotulo: 'Notificações', icone: Bell },
    ],
  },
  {
    titulo: 'Clientes e vendas',
    itens: [
      { to: '/clientes', rotulo: 'Clientes', icone: User },
      { to: '/negocios', rotulo: 'Negócios', icone: Wallet },
      { to: '/catalogo', rotulo: 'Catálogo', icone: Package },
      { to: '/inteligencia/calculadora', rotulo: 'Calculadora', icone: Calculator },
    ],
  },
  {
    titulo: 'Inteligência de Vendas',
    itens: [
      { to: '/inteligencia', rotulo: 'Ver tudo', icone: Lightbulb },
    ],
  },
  {
    titulo: 'Eu e o carro',
    itens: [
      { to: '/perfil', rotulo: 'Meu perfil', icone: UserCircle },
      { to: '/garagem', rotulo: 'Minha garagem', icone: Tractor },
      { to: '/territorio', rotulo: 'Meu território', icone: IconeMapa },
      { to: '/checklist-veiculo', rotulo: 'Checklist do carro', icone: ClipboardCheck },
      { to: '/paradas', rotulo: 'Paradas do carro', icone: Car },
      { to: '/chamado-veicular', rotulo: 'Chamado veicular', icone: Car },
      { to: '/perfil-teste', rotulo: 'Teste de perfil', icone: Users },
    ],
  },
]

export default function Menu() {
  const navigate = useNavigate()
  const [contagem, setContagem] = useState(null)
  const [exemplo, setExemplo] = useState(false)

  useEffect(() => {
    let vivo = true
    carregarContatos()
      .then((r) => {
        if (!vivo) return
        const c = { carteira: 0, recuperar: 0, novos: 0 }
        r.itens.forEach((i) => { if (c[i.tipo] != null) c[i.tipo]++ })
        setContagem(c); setExemplo(r.exemplo)
      })
      .catch(() => { if (vivo) setContagem(false) })
    return () => { vivo = false }
  }, [])

  return (
    <div className="pb-4">
      {/* Módulo 1: o que fazer agora */}
      <section className="ini-entra -mx-4 -mt-4 px-4 pt-4 pb-5 mb-5 rounded-b-3xl text-white" style={{ background: 'linear-gradient(135deg, #DC2626, #7F1D1D)' }}>
        <h1 className="text-xl font-bold">O que você gostaria de fazer?</h1>
        <p className="text-sm opacity-85 mb-4">Escolha um caminho. Nos grupos de clientes, mostramos por que cada um foi escolhido.</p>

        <button
          onClick={() => navigate('/visitas', { state: { novaVisita: true } })}
          className="w-full flex items-center gap-3 bg-white text-slate-900 rounded-2xl p-3.5 mb-2.5 shadow-sm active:scale-[0.99] transition"
        >
          <span className="w-11 h-11 rounded-xl bg-blue-700 text-white grid place-items-center shrink-0"><Plus size={22} /></span>
          <span className="flex-1 text-left">
            <span className="block font-bold">Nova visita</span>
            <span className="block text-xs text-slate-500">Registrar uma visita, ligação ou mensagem agora</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <div className="grid gap-2">
          {GRUPOS_CLIENTES.map((g) => {
            const I = g.icone
            const n = contagem ? contagem[g.tipo] : null
            return (
              <button
                key={g.tipo}
                onClick={() => navigate(`/menu/${g.tipo}`)}
                className="flex items-center gap-3 bg-white/95 text-slate-900 rounded-2xl p-3 active:scale-[0.99] transition"
              >
                <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: g.fundo, color: g.cor }}><I size={20} /></span>
                <span className="flex-1 min-w-0 text-left">
                  <span className="block font-bold text-sm">{g.titulo}</span>
                  <span className="block text-[11px] text-slate-500 leading-snug">{g.frase}</span>
                </span>
                <span className="shrink-0 min-w-[2rem] text-center text-sm font-black rounded-full px-2 py-0.5" style={{ background: g.fundo, color: g.cor }}>
                  {n == null ? '…' : n}
                </span>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            )
          })}
        </div>
        {exemplo && <p className="text-[11px] opacity-80 mt-2">Você ainda não tem contatos no Portal: os números acima são do exemplo.</p>}
      </section>

      {/* Demais módulos por assunto */}
      <div className="space-y-5">
        {MODULOS.map((m) => (
          <section key={m.titulo}>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">{m.titulo}</p>
            <div className="grid grid-cols-4 gap-2">
              {m.itens.map(({ to, rotulo, icone: I }) => (
                <button key={to} onClick={() => navigate(to)} className="flex flex-col items-center gap-1.5 bg-white border border-slate-200 rounded-2xl py-3 px-1 active:bg-slate-50">
                  <span className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 grid place-items-center"><I size={20} /></span>
                  <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{rotulo}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <section className="grid grid-cols-2 gap-2">
          <button onClick={() => window.dispatchEvent(new Event('abrir-config'))} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold border border-slate-200 bg-white rounded-xl py-2.5 active:bg-slate-50">
            <Settings size={16} /> Config
          </button>
          <button onClick={() => window.dispatchEvent(new Event('abrir-tour'))} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold border border-slate-200 bg-white rounded-xl py-2.5 active:bg-slate-50">
            <Compass size={16} /> Tour
          </button>
          <button onClick={() => window.dispatchEvent(new Event('abrir-ajuda'))} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold border border-slate-200 bg-white rounded-xl py-2.5 active:bg-slate-50">
            <CircleHelp size={16} /> Ajuda
          </button>
          <button onClick={() => window.dispatchEvent(new Event('sair-app'))} className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold border border-red-200 text-red-700 bg-white rounded-xl py-2.5 active:bg-red-50">
            <DoorOpen size={16} /> Sair
          </button>
        </section>
      </div>
    </div>
  )
}
