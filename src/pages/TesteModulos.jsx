// PÁGINA DE TESTE — 3 jeitos de organizar o app em módulos (José, 20/10/2026):
// "a visita vem da rota; ele vê as informações, escolhe o atendimento do cliente e depois
// vem a visita". Inclui Notícias (da Inteligência de Vendas) e o teste de perfil.
// O caminho Rota → Ficha → Atendimento → Visita é o mesmo nas 3; muda só a organização.
// Dados de exemplo. ?op=a|b|c abre direto numa opção.
import { lazy, Suspense, useState } from 'react'
import {
  Calendar, Car, Compass, House, LayoutGrid, Menu, Newspaper, Package, Target, User, Users, Wallet, X,
} from 'lucide-react'
import { ModuloAtual, ModuloNoticias, ModuloPerfil, RotaDoDia, useFluxo } from '../components/modulos/Fluxo'
// Notícias = a MESMA tela da Inteligência de Vendas do app (design do portal), carregada sob demanda
const NoticiasIV = lazy(() => import('./iv/Noticias'))
const Noticias = () => <Suspense fallback={<p className="text-sm text-slate-400 text-center pt-10">Carregando notícias…</p>}><NoticiasIV /></Suspense>

const OPCOES = [
  { key: 'a', nome: 'A · Barra de módulos', texto: 'Cinco módulos fixos embaixo. A Rota é a tela inicial.' },
  { key: 'b', nome: 'B · Início em blocos', texto: 'O Início vira um painel de blocos grandes; cada bloco abre um módulo.' },
  { key: 'c', nome: 'C · Jornada do dia', texto: 'Uma tela só, de cima para baixo: notícias, perfil e a rota. O resto fica no menu.' },
]

const ESTILO = `
@keyframes tm-pop { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
@keyframes tm-entra { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.tm-entra { animation: tm-entra .25s ease }
`

export default function TesteModulos() {
  const inicial = new URLSearchParams(window.location.search).get('op')
  const [op, setOp] = useState(OPCOES.some((o) => o.key === inicial) ? inicial : 'a')
  const atual = OPCOES.find((o) => o.key === op)
  return (
    <div className="min-h-screen bg-slate-200 py-4 px-2">
      <style>{ESTILO}</style>
      <div className="max-w-[440px] mx-auto">
        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Página de teste · organização do app</div>
        <div className="flex gap-1.5 mb-2">
          {OPCOES.map((o) => (
            <button key={o.key} onClick={() => setOp(o.key)} className={`flex-1 py-2 rounded-xl text-xs font-bold ${op === o.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>{o.nome}</button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mb-3">{atual.texto} Toque num cliente da rota para ver o caminho até a visita.</p>
        <div className="rounded-[32px] border-[10px] border-slate-900 bg-slate-50 overflow-hidden shadow-2xl" style={{ height: 780 }}>
          {op === 'a' && <OpcaoA key="a" />}
          {op === 'b' && <OpcaoB key="b" />}
          {op === 'c' && <OpcaoC key="c" />}
        </div>
      </div>
    </div>
  )
}

function Cabecalho({ esquerda, direita }) {
  return (
    <div className="h-12 shrink-0 px-4 flex items-center gap-2 text-white" style={{ background: '#991b1b' }}>
      {esquerda}<b className="flex-1">NT Vendas</b>{direita}
    </div>
  )
}

// ── A: barra de módulos embaixo ───────────────────────────────────────────────
const MODS_A = [
  { key: 'rota', nome: 'Rota', icone: Compass },
  { key: 'clientes', nome: 'Clientes', icone: Users },
  { key: 'agenda', nome: 'Agenda', icone: Calendar },
  { key: 'noticias', nome: 'Notícias', icone: Newspaper },
  { key: 'eu', nome: 'Eu', icone: User },
]
function OpcaoA() {
  const [mod, setMod] = useState(() => new URLSearchParams(window.location.search).get('mod') || 'rota')
  const f = useFluxo()
  return (
    <div className="h-full flex flex-col">
      <Cabecalho />
      <div className="flex-1 overflow-y-auto p-4 tm-entra" key={mod + f.tela.nome}>
        {mod === 'rota' && f.render(<RotaDoDia feitos={f.feitos} abrir={f.abrir} />)}
        {mod === 'clientes' && <ModuloAtual nome="Clientes" icone={Users} />}
        {mod === 'agenda' && <ModuloAtual nome="Agenda" icone={Calendar} />}
        {mod === 'noticias' && <Noticias />}
        {mod === 'eu' && (
          <div>
            <ModuloPerfil />
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 divide-y">
              {[['Negócios', Wallet], ['Catálogo', Package], ['Meu veículo', Car]].map(([n, I]) => (
                <div key={n} className="px-4 py-3 flex items-center gap-3 font-semibold text-slate-700"><I size={18} /> {n}</div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="h-16 shrink-0 bg-white border-t border-slate-200 grid grid-cols-5">
        {MODS_A.map((m) => (
          <button key={m.key} onClick={() => { setMod(m.key); if (m.key === 'rota') f.setTela({ nome: 'rota' }) }} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${mod === m.key ? 'text-red-700' : 'text-slate-400'}`}>
            <m.icone size={21} strokeWidth={mod === m.key ? 2.6 : 2} /> {m.nome}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── B: início em blocos ───────────────────────────────────────────────────────
const MODS_B = [
  { key: 'rota', nome: 'Minha rota', sub: '4 contatos hoje', icone: Compass, cor: '#b91c1c', grande: true },
  { key: 'noticias', nome: 'Notícias', sub: '3 novas hoje', icone: Newspaper, cor: '#0f766e' },
  { key: 'perfil', nome: 'Meu perfil', sub: 'Relacionamento', icone: Target, cor: '#7c3aed' },
  { key: 'clientes', nome: 'Clientes', sub: '128 na carteira', icone: Users, cor: '#334155' },
  { key: 'agenda', nome: 'Agenda', sub: '2 atrasados', icone: Calendar, cor: '#d97706' },
  { key: 'negocios', nome: 'Negócios', sub: '5 abertos', icone: Wallet, cor: '#2563eb' },
  { key: 'catalogo', nome: 'Catálogo', sub: 'tratores e implementos', icone: Package, cor: '#475569' },
]
function OpcaoB() {
  const [mod, setMod] = useState(null)
  const f = useFluxo()
  const m = MODS_B.find((x) => x.key === mod)
  return (
    <div className="h-full flex flex-col">
      <Cabecalho esquerda={mod && <button onClick={() => { setMod(null); f.setTela({ nome: 'rota' }) }}><House size={20} /></button>} />
      <div className="flex-1 overflow-y-auto p-4 tm-entra" key={(mod || 'inicio') + f.tela.nome}>
        {!mod && (
          <div>
            <div className="text-sm text-slate-500">Bom dia,</div>
            <h2 className="text-xl font-black mb-3">Vendedor Exemplo</h2>
            <div className="grid grid-cols-2 gap-2.5">
              {MODS_B.map((b) => (
                <button key={b.key} onClick={() => setMod(b.key)} className={`rounded-2xl p-4 text-left text-white active:scale-[.98] transition shadow ${b.grande ? 'col-span-2' : ''}`} style={{ background: `linear-gradient(135deg, ${b.cor}, ${b.cor}cc)` }}>
                  <b.icone size={b.grande ? 30 : 24} />
                  <b className={`block mt-2 ${b.grande ? 'text-xl' : ''}`}>{b.nome}</b>
                  <span className="text-xs opacity-85">{b.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {mod === 'rota' && f.render(<RotaDoDia feitos={f.feitos} abrir={f.abrir} />)}
        {mod === 'noticias' && <Noticias />}
        {mod === 'perfil' && <ModuloPerfil />}
        {m && !['rota', 'noticias', 'perfil'].includes(mod) && <ModuloAtual nome={m.nome} icone={m.icone} />}
      </div>
    </div>
  )
}

// ── C: jornada do dia ─────────────────────────────────────────────────────────
function OpcaoC() {
  const [menu, setMenu] = useState(false)
  const f = useFluxo()
  return (
    <div className="h-full flex flex-col relative">
      <Cabecalho esquerda={<button onClick={() => setMenu(true)}><Menu size={20} /></button>} />
      <div className="flex-1 overflow-y-auto p-4 tm-entra" key={f.tela.nome}>
        {f.emFluxo ? f.render(null) : (
          <div className="relative pl-7">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-300" />
            <Etapa n={1} titulo="Antes de sair: o que mudou no agro"><ModuloNoticias compacto /></Etapa>
            <Etapa n={2} titulo="Seu ponto forte"><ModuloPerfil compacto /></Etapa>
            <Etapa n={3} titulo={`Rota de hoje · ${f.feitos.length} de 4 feitos`}><RotaDoDia feitos={f.feitos} abrir={f.abrir} compacta /></Etapa>
            <Etapa n={4} titulo="Fim do dia">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 text-sm text-slate-600">Resumo do que foi feito e o que ficou para amanhã.</div>
            </Etapa>
          </div>
        )}
      </div>
      {menu && (
        <div className="absolute inset-0 bg-black/40 z-10" onClick={() => setMenu(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4 tm-entra" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center mb-4"><b className="flex-1">Módulos</b><button onClick={() => setMenu(false)}><X size={20} /></button></div>
            {[['Jornada do dia', LayoutGrid], ['Clientes', Users], ['Agenda', Calendar], ['Negócios', Wallet], ['Catálogo', Package], ['Notícias', Newspaper], ['Meu perfil', Target], ['Meu veículo', Car]].map(([n, I]) => (
              <div key={n} className="py-2.5 flex items-center gap-3 font-semibold text-slate-700"><I size={18} /> {n}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Etapa({ n, titulo, children }) {
  return (
    <div className="relative mb-5">
      <span className="absolute -left-7 top-0 w-6 h-6 rounded-full text-white text-xs font-black grid place-items-center" style={{ background: '#b91c1c' }}>{n}</span>
      <div className="text-sm font-black text-slate-800 mb-2">{titulo}</div>
      {children}
    </div>
  )
}
