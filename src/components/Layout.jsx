import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Bell, CircleHelp, House, LayoutGrid, RefreshCw, UserCircle } from 'lucide-react'
import ChecklistObrigatorio from './ChecklistObrigatorio'
import BarraXP from './gamificacao/BarraXP'
import { setSyncCallback, setAuthRequiredCallback, syncAll, countPending, supabase } from '../lib/sync'
import { clearAll } from '../lib/db'
import ConfigModal from './ConfigModal'
import { contarNotificacoes } from '../lib/notificacoes'
import AjudaModal from './AjudaModal'
import TourBoasVindas from './TourBoasVindas'
import { AJUDA_VENDEDOR, AJUDA_GERAL_VENDEDOR, TOUR_VENDEDOR, ajudaDaRota, tourJaVisto, marcarTourVisto } from '../lib/ajuda'

// Barra de baixo enxuta (José, 21/10/2026): o Início (feed) e o Menu de módulos.
// Todo o resto mora no Menu (/menu), agrupado por assunto.
const navItems = [
  { to: '/dashboard', label: 'Início', icon: House },
  { to: '/menu', label: 'Menu', icon: LayoutGrid },
]
// O Menu fica aceso em qualquer tela que não seja o Início
const ehInicio = (p) => p === '/' || p.startsWith('/dashboard')

export default function Layout() {
  const navigate = useNavigate()
  const lerVendedor = () => { try { return JSON.parse(localStorage.getItem('vendedor') || '{}') } catch { return {} } }
  const [vendedor, setVendedor] = useState(lerVendedor)
  useEffect(() => {
    const atualizar = () => setVendedor(lerVendedor())
    window.addEventListener('vendedor-atualizado', atualizar)
    return () => window.removeEventListener('vendedor-atualizado', atualizar)
  }, [])
  const [online, setOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', detail: '' })
  const [pending, setPending] = useState(0)
  const [precisaReentrar, setPrecisaReentrar] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const { pathname } = useLocation()
  const [ajudaAberta, setAjudaAberta] = useState(false)
  // Tour abre sozinho no 1º acesso de cada vendedor neste aparelho.
  const [tourAberto, setTourAberto] = useState(() => !tourJaVisto('vendedor', vendedor.id))
  const [navDestaque, setNavDestaque] = useState(null)

  function fimDoTour() {
    marcarTourVisto('vendedor', vendedor.id)
    setTourAberto(false)
  }

  const updatePending = useCallback(async () => {
    setPending(await countPending())
  }, [])

  const updateNotif = useCallback(async () => {
    try {
      const { total } = await contarNotificacoes(vendedor.id)
      setNotifCount(total)
    } catch { /* ignora */ }
  }, [vendedor.id])

  // Recalcula notificações ao montar, periodicamente e ao voltar pro app.
  useEffect(() => {
    updateNotif()
    const t = setInterval(updateNotif, 60000)
    const onVis = () => { if (document.visibilityState === 'visible') updateNotif() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  }, [updateNotif])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)

    // Registrar callback de sync
    setSyncCallback((s) => {
      setSyncStatus(s)
      if (s.status === 'done') updatePending()
    })

    // Aviso de sessão expirada (há pendentes mas não dá pra enviar)
    setAuthRequiredCallback(setPrecisaReentrar)

    // Contar pendentes ao montar
    updatePending()

    // Atualizar pendentes periodicamente
    const interval = setInterval(updatePending, 10000)

    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(interval)
    }
  }, [updatePending])

  // O Menu (/menu) pede config, ajuda e sair por evento — as janelas moram aqui no Layout
  useEffect(() => {
    const config = () => setConfigAberto(true)
    const ajuda = () => setAjudaAberta(true)
    const sair = () => handleLogout()
    const tour = () => setTourAberto(true)
    window.addEventListener('abrir-config', config)
    window.addEventListener('abrir-ajuda', ajuda)
    window.addEventListener('sair-app', sair)
    window.addEventListener('abrir-tour', tour)
    return () => {
      window.removeEventListener('abrir-config', config)
      window.removeEventListener('abrir-ajuda', ajuda)
      window.removeEventListener('sair-app', sair)
      window.removeEventListener('abrir-tour', tour)
    }
  })

  async function handleLogout() {
    // O clearAll abaixo apaga também o que ainda não subiu — avisa antes.
    const naoEnviados = await countPending()
    if (naoEnviados > 0 && !window.confirm(
      `Você tem ${naoEnviados} registro(s) ainda não enviado(s). Se sair agora, eles serão PERDIDOS.\n\n` +
      'Conecte à internet e toque no botão de sincronizar antes de sair. Sair mesmo assim?'
    )) return
    // Limpa IDB ANTES de fazer signOut/clear pra evitar deixar dados do
    // vendedor logado expostos caso outro vendedor logue no mesmo celular.
    try { await clearAll() } catch (e) { console.error('[Logout] clearAll:', e) }
    await supabase.auth.signOut()
    localStorage.removeItem('vendedor')
    localStorage.removeItem('token')
    navigate('/login')
  }

  function handleSync() {
    if (navigator.onLine) syncAll()
  }

  const isSyncing = syncStatus.status === 'syncing' || syncStatus.status === 'pushing' || syncStatus.status === 'pulling'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-800 text-white px-4 py-2.5 flex items-center justify-between gap-3 safe-top">
        {/* Logo da Nova Tratores (em branco sobre o vermelho) + conexão; toque volta ao Início */}
        <button onClick={() => navigate('/dashboard')} className="relative flex items-center shrink-0 active:opacity-70" aria-label="NT Vendas — voltar ao início">
          <img src="/logo-nova.png" alt="Nova Tratores" className="h-6 min-[400px]:h-7 w-auto max-w-[38vw] object-contain object-left" style={{ filter: 'brightness(0) invert(1)' }} />
          <span
            className={`absolute -right-2.5 top-0 w-2.5 h-2.5 rounded-full ring-2 ring-blue-800 ${online ? 'bg-green-400' : 'bg-red-400'}`}
            title={online ? 'Conectado' : 'Sem internet'}
          />
        </button>

        {/* Ações: todas no mesmo formato (botão redondo); o resto do app fica no Menu da barra de baixo */}
        <div className="flex items-center gap-1 min-[400px]:gap-1.5 shrink-0">
          <button
            onClick={handleSync}
            disabled={!online || isSyncing}
            className="relative w-8 h-8 min-[400px]:w-9 min-[400px]:h-9 rounded-full bg-white/15 grid place-items-center active:bg-white/25 disabled:opacity-50"
            aria-label={pending > 0 ? `Sincronizar (${pending} para enviar)` : 'Sincronizar'}
            title="Sincronizar"
          >
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} aria-hidden="true" />
            {pending > 0 && !isSyncing && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 grid place-items-center ring-2 ring-blue-800">
                {pending > 9 ? '9+' : pending}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/notificacoes')}
            className="relative w-8 h-8 min-[400px]:w-9 min-[400px]:h-9 rounded-full bg-white/15 grid place-items-center active:bg-white/25"
            aria-label={notifCount > 0 ? `Notificações (${notifCount})` : 'Notificações'}
            title="Notificações"
          >
            <Bell size={18} aria-hidden="true" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 grid place-items-center ring-2 ring-blue-800">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setAjudaAberta(true)}
            className="w-8 h-8 min-[400px]:w-9 min-[400px]:h-9 rounded-full bg-white/15 grid place-items-center active:bg-white/25"
            aria-label="Ajuda desta tela"
            title="Ajuda"
          >
            <CircleHelp size={18} aria-hidden="true" />
          </button>

          <button
            onClick={() => navigate('/perfil')}
            className="shrink-0 w-8 h-8 min-[400px]:w-9 min-[400px]:h-9 rounded-full overflow-hidden ring-2 ring-white/50 bg-white/15 grid place-items-center text-xs font-bold active:opacity-80"
            aria-label={`Meu perfil${vendedor.nome ? ` (${vendedor.nome})` : ''}`}
            title={vendedor.nome || 'Meu perfil'}
          >
            {vendedor.foto
              ? <img src={vendedor.foto} alt="" className="w-full h-full object-cover" />
              : (String(vendedor.nome || '?').trim().split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || <UserCircle size={18} />)}
          </button>
        </div>
      </header>
      <BarraXP />

      <ConfigModal show={configAberto} onClose={() => setConfigAberto(false)} />
      <AjudaModal
        show={ajudaAberta}
        onClose={() => setAjudaAberta(false)}
        conteudo={ajudaDaRota(pathname, AJUDA_VENDEDOR)}
        geral={AJUDA_GERAL_VENDEDOR}
        onRevisarTour={() => { setAjudaAberta(false); setTourAberto(true) }}
      />
      <TourBoasVindas
        show={tourAberto}
        passos={TOUR_VENDEDOR}
        onFim={fimDoTour}
        onDestaque={setNavDestaque}
      />

      {/* Sessão expirada: há dados pra enviar mas precisa reentrar */}
      {precisaReentrar && online && (
        <div className="bg-red-600 text-white text-xs text-center py-1.5 font-medium flex items-center justify-center gap-2">
          <span>Sessão expirada — reentre para enviar suas visitas</span>
          <button onClick={() => navigate('/login')} className="underline font-bold">
            Entrar
          </button>
        </div>
      )}

      {/* Barra de status */}
      {!online && (
        <div className="bg-amber-500 text-white text-xs text-center py-1 font-medium">
          Modo offline - dados salvos localmente
          {pending > 0 && ` (${pending} pendente${pending > 1 ? 's' : ''})`}
        </div>
      )}

      {isSyncing && (
        <div className="bg-blue-600 text-white text-xs text-center py-1 font-medium flex items-center justify-center gap-2">
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          {syncStatus.detail}
        </div>
      )}

      {syncStatus.status === 'done' && (
        <div className="bg-green-600 text-white text-xs text-center py-1 font-medium animate-fade-in">
          {syncStatus.detail}
        </div>
      )}

      {syncStatus.status === 'error' && (
        <div className="bg-red-600 text-white text-xs text-center py-1 font-medium animate-fade-in">
          Erro: {syncStatus.detail}
        </div>
      )}

      <main className="flex-1 p-4 pb-20 overflow-y-auto">
        <Outlet />
      </main>

      {/* z-30: acima de qualquer conteúdo da página (células sticky z-10, mapas
          Leaflet isolados no index.css) e abaixo de menus/modais (z-40+). */}
      {/* checklist do carro do mês: bloqueia o app até ser feito (só quem tem carro) */}
      <ChecklistObrigatorio />

      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex safe-bottom ${navDestaque ? 'z-[60]' : 'z-30'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={() => {
              const ativo = item.to === '/dashboard' ? ehInicio(pathname) : !ehInicio(pathname)
              return `flex-1 min-w-0 flex flex-col items-center py-2 text-[11px] transition-colors ${
                ativo ? 'text-blue-700 font-bold' : 'text-slate-400 font-semibold'
              } ${navDestaque === item.to ? 'bg-blue-50 text-blue-700 font-bold animate-pulse-glow rounded-lg' : ''}`
            }}
          >
            <item.icon size={22} className="mb-0.5" aria-hidden="true" />
            <span className="max-w-full whitespace-nowrap">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
