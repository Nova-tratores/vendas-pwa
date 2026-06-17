import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/sync'

const INICIO = { to: '/supervisor', label: 'Início', end: true }

// Itens/grupos marcados com `admin: true` só aparecem para supervisor tipo 'admin'.
// O 'gestor' vê apenas gestão de vendedores (Equipe, Vendas, Análise) e VER catálogo.
const MENUS = [
  { label: 'Equipe', items: [
    { to: '/supervisor/vendedores', label: 'Vendedores' },
    { to: '/supervisor/clientes', label: 'Clientes' },
    { to: '/supervisor/cidades', label: 'Cidades' },
  ] },
  { label: 'Catálogo', items: [
    { to: '/supervisor/catalogo', label: 'Catálogo' },
    { to: '/supervisor/catalogo-admin', label: 'Gerir catálogo', admin: true },
    { to: '/supervisor/mais-vendidas', label: 'Mais vendidas' },
    { to: '/supervisor/produtos', label: 'Produtos', admin: true },
  ] },
  { label: 'Vendas', items: [
    { to: '/supervisor/visitas', label: 'Visitas' },
    { to: '/supervisor/semana', label: 'Calendário' },
    { to: '/supervisor/propostas', label: 'Propostas' },
    { to: '/supervisor/pos-vendas', label: 'Pós Vendas' },
    { to: '/supervisor/compartilhamentos', label: 'Compartilhamentos' },
  ] },
  { label: 'Análise', items: [
    { to: '/supervisor/evolucao', label: 'Evolução' },
    { to: '/supervisor/alertas', label: 'Alertas' },
    { to: '/supervisor/notificacoes', label: 'Notificações' },
    { to: '/supervisor/log', label: 'Log de atividades' },
  ] },
  { label: 'Sistema', admin: true, items: [
    { to: '/supervisor/config', label: 'Configurações', admin: true },
    { to: '/supervisor/infra', label: 'Consumo de dados', admin: true },
  ] },
]

// Filtra menus/itens conforme o papel; remove grupos que ficarem vazios.
function menusParaTipo(tipo) {
  const isAdmin = tipo === 'admin'
  if (isAdmin) return MENUS
  return MENUS
    .filter((m) => !m.admin)
    .map((m) => ({ ...m, items: m.items.filter((i) => !i.admin) }))
    .filter((m) => m.items.length > 0)
}

export default function SupervisorLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
  const isAdmin = (supervisor.tipo || 'admin') === 'admin'
  const menus = menusParaTipo(supervisor.tipo || 'admin')
  const [aberto, setAberto] = useState(null) // label do menu aberto

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('supervisor')
    navigate('/supervisor/login')
  }

  const path = location.pathname
  const inicioAtivo = path === INICIO.to
  const menuAtivo = (m) => m.items.some((i) => path === i.to)

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">{isAdmin ? 'Supervisor' : 'Gestor'}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{supervisor.nome}</span>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-700 px-2 py-1 rounded active:bg-slate-600"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Barra de menus (estilo Windows): clica pra abrir, passa o mouse pra trocar */}
      <nav className="bg-slate-700 relative z-40 flex items-stretch">
        <NavLink
          to={INICIO.to}
          end
          onClick={() => setAberto(null)}
          className={`px-3.5 py-2.5 text-sm whitespace-nowrap ${
            inicioAtivo ? 'bg-slate-900 text-white font-semibold' : 'text-slate-200 hover:bg-slate-600'
          }`}
        >
          Início
        </NavLink>

        {menus.map((m) => {
          const open = aberto === m.label
          return (
            <div key={m.label} className="relative">
              <button
                type="button"
                onClick={() => setAberto(open ? null : m.label)}
                onMouseEnter={() => { if (aberto) setAberto(m.label) }}
                className={`h-full px-3.5 py-2.5 text-sm whitespace-nowrap flex items-center gap-1 ${
                  open
                    ? 'bg-slate-900 text-white'
                    : menuAtivo(m)
                      ? 'bg-slate-600 text-white font-semibold'
                      : 'text-slate-200 hover:bg-slate-600'
                }`}
              >
                {m.label}
                <span className="text-[10px] opacity-70">▾</span>
              </button>

              {open && (
                <div className="absolute left-0 top-full min-w-[200px] bg-white text-slate-700 rounded-b-lg shadow-xl border border-slate-200 py-1 z-50 animate-fade-in">
                  {m.items.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      onClick={() => setAberto(null)}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-sm hover:bg-blue-50 ${
                          isActive ? 'text-blue-700 font-semibold bg-blue-50' : 'text-slate-700'
                        }`
                      }
                    >
                      {it.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Clicar fora fecha o menu aberto */}
      {aberto && <div className="fixed inset-0 z-30" onClick={() => setAberto(null)} />}

      <main className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
