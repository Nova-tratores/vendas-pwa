import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/sync'
import AjudaModal from '../components/AjudaModal'
import TourBoasVindas from '../components/TourBoasVindas'
import { AJUDA_SUPERVISOR, AJUDA_GERAL_SUPERVISOR, tourSupervisor, ajudaDaRota, tourJaVisto, marcarTourVisto } from '../lib/ajuda'
import { estaEmbutido, pedirSessaoAoPortal, ouvirSessaoDoPortal } from '../lib/embed'
import { buscarSupervisor, salvarSupervisor } from '../lib/supervisorAuth'

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
    { to: '/supervisor/completude', label: 'Completude das visitas' },
    { to: '/supervisor/territorio', label: 'Território' },
    { to: '/supervisor/quests', label: 'Quests' },
    { to: '/supervisor/missoes', label: 'Missões relâmpago' },
    { to: '/supervisor/semana', label: 'Calendário' },
    { to: '/supervisor/propostas', label: 'Propostas' },
    { to: '/supervisor/pos-vendas', label: 'Pós Vendas' },
    { to: '/supervisor/compartilhamentos', label: 'Compartilhamentos' },
  ] },
  { label: 'Análise', items: [
    { to: '/supervisor/historico', label: 'Histórico diário' },
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
  const [ajudaAberta, setAjudaAberta] = useState(false)
  const embutido = estaEmbutido()
  // Embutido no portal: 'aguardando' a sessão → 'ok' | 'sem-portal' | 'nao-supervisor'.
  const [entrada, setEntrada] = useState(embutido ? 'aguardando' : 'ok')
  const [tourAberto, setTourAberto] = useState(() => !embutido && !tourJaVisto('supervisor', supervisor.id))

  useEffect(() => {
    if (!embutido) return
    let vivo = true
    const pararDeOuvir = ouvirSessaoDoPortal(supabase.auth)
    ;(async () => {
      try {
        const tokens = await pedirSessaoAoPortal()
        const { data, error } = await supabase.auth.setSession(tokens)
        if (error || !data?.user) throw error || new Error('sessão sem usuário')
        const sup = await buscarSupervisor(data.user.id)
        if (!vivo) return
        if (!sup) {
          localStorage.removeItem('supervisor')
          setEntrada('nao-supervisor')
          return
        }
        salvarSupervisor(sup)
        setTourAberto(!tourJaVisto('supervisor', sup.id))
        setEntrada('ok')
      } catch (e) {
        console.error('[Embed] sessão do portal:', e)
        if (vivo) setEntrada('sem-portal')
      }
    })()
    return () => { vivo = false; pararDeOuvir() }
  }, [embutido])

  function fimDoTour() {
    marcarTourVisto('supervisor', supervisor.id)
    setTourAberto(false)
  }

  // Mantém a sessão do supervisor sempre fresca: renova ao abrir o painel e toda vez
  // que o app volta ao foco. Num PWA o auto-refresh do supabase pausa em segundo plano,
  // então sem isso o token vencia "sozinho". Com isso, o login só cai mesmo no logout
  // (enquanto o refresh token estiver válido).
  useEffect(() => {
    // Embutido: quem renova é o portal (renovar aqui o deslogaria).
    if (embutido) return
    const renovar = () => {
      if (document.visibilityState === 'visible') supabase.auth.refreshSession()
    }
    renovar()
    document.addEventListener('visibilitychange', renovar)
    window.addEventListener('focus', renovar)
    return () => {
      document.removeEventListener('visibilitychange', renovar)
      window.removeEventListener('focus', renovar)
    }
  }, [embutido])

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('supervisor')
    navigate('/supervisor/login')
  }

  const path = location.pathname
  const inicioAtivo = path === INICIO.to
  const menuAtivo = (m) => m.items.some((i) => path === i.to)

  if (entrada !== 'ok') {
    const textos = {
      aguardando: 'Conectando ao portal…',
      'sem-portal': 'Não foi possível entrar com o login do portal. Recarregue a página.',
      'nao-supervisor': 'Seu usuário não está cadastrado como supervisor no app de vendas. Peça o acesso ao administrador.',
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <p className="text-sm text-slate-600 text-center max-w-sm">{textos[entrada]}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">{isAdmin ? 'Supervisor' : 'Gestor'}</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{supervisor.nome}</span>
          <button
            onClick={() => setAjudaAberta(true)}
            className="text-xs bg-slate-700 px-2 py-1 rounded active:bg-slate-600 flex items-center gap-1"
            aria-label="Ajuda desta tela"
          >
            <span className="w-4 h-4 rounded-full border border-white/70 text-[10px] font-bold leading-none flex items-center justify-center">?</span>
            Ajuda
          </button>
          {/* Embutido: sem Sair — signOut() global revogaria a sessão do portal. */}
          {!embutido && (
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-700 px-2 py-1 rounded active:bg-slate-600"
            >
              Sair
            </button>
          )}
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

      <AjudaModal
        show={ajudaAberta}
        onClose={() => setAjudaAberta(false)}
        conteudo={ajudaDaRota(path, AJUDA_SUPERVISOR)}
        geral={AJUDA_GERAL_SUPERVISOR}
        onRevisarTour={() => { setAjudaAberta(false); setTourAberto(true) }}
      />
      <TourBoasVindas
        show={tourAberto}
        passos={isAdmin ? tourSupervisor.admin : tourSupervisor.gestor}
        onFim={fimDoTour}
      />
    </div>
  )
}
