import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Bell, Calendar, CircleHelp, Car, Compass, DoorOpen, House, Lightbulb, MapPin, Menu, Package, RefreshCw, Settings, User, UserCircle, Wallet } from 'lucide-react'
import { setSyncCallback, setAuthRequiredCallback, syncAll, countPending, supabase } from '../lib/sync'
import { clearAll } from '../lib/db'
import ConfigModal from './ConfigModal'
import { contarNotificacoes } from '../lib/notificacoes'
import AjudaModal from './AjudaModal'
import TourBoasVindas from './TourBoasVindas'
import { AJUDA_VENDEDOR, AJUDA_GERAL_VENDEDOR, TOUR_VENDEDOR, ajudaDaRota, tourJaVisto, marcarTourVisto } from '../lib/ajuda'

const navItems = [
  { to: '/dashboard', label: 'Início', icon: House },
  { to: '/rota', label: 'Rota', icon: Compass },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/inteligencia', label: 'Inteligência', icon: Lightbulb },
  { to: '/clientes', label: 'Clientes', icon: User },
  { to: '/catalogo', label: 'Catálogo', icon: Package },
  { to: '/visitas', label: 'Visitas', icon: MapPin },
  { to: '/negocios', label: 'Negócios', icon: Wallet },
]

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
  const [menuAberto, setMenuAberto] = useState(false)
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
      <header className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2 shrink-0">
          {/* Logo da Nova Tratores (em branco sobre o vermelho); toque volta ao Início */}
          <button onClick={() => navigate('/dashboard')} className="flex items-center active:opacity-70" aria-label="NT Vendas — voltar ao início">
            <img src="/logo-nova.png" alt="Nova Tratores" className="h-7 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
          </button>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {/* Botão de sync manual */}
          <button
            onClick={handleSync}
            disabled={!online || isSyncing}
            className="relative text-xs bg-blue-900 px-2 py-1 rounded active:bg-blue-950 disabled:opacity-50"
          >
            <span className={`flex ${isSyncing ? 'animate-spin' : ''}`}>
              <RefreshCw size={16} aria-hidden="true" />
            </span>
            {pending > 0 && !isSyncing && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pending > 9 ? '9+' : pending}
              </span>
            )}
          </button>
          <button onClick={() => navigate('/perfil')} className="flex items-center gap-1.5 min-w-0 active:opacity-70" aria-label="Meu perfil">
            {vendedor.foto
              ? <img src={vendedor.foto} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-white/40 shrink-0" />
              : <UserCircle size={22} className="shrink-0 opacity-90" aria-hidden="true" />}
            <span className="text-sm opacity-80 truncate">{vendedor.nome}</span>
          </button>

          <button
            onClick={() => setAjudaAberta(true)}
            className="shrink-0 w-7 h-7 rounded-full text-sm font-bold leading-none flex items-center justify-center active:bg-blue-950"
            aria-label="Ajuda desta tela"
            title="Ajuda"
          >
            <CircleHelp size={20} aria-hidden="true" />
          </button>

          {/* Menu hamburguer */}
          <div className="relative">
            <button
              onClick={() => { setMenuAberto((v) => !v); updateNotif() }}
              className="relative text-lg leading-none bg-blue-900 px-2.5 py-1.5 rounded active:bg-blue-950"
              aria-label="Menu"
              aria-expanded={menuAberto}
            >
              <Menu size={20} aria-hidden="true" />
              {notifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>

            {menuAberto && (
              <>
                {/* Backdrop pra fechar ao tocar fora */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuAberto(false)}
                />
                <div className="absolute right-0 mt-2 w-52 bg-white text-slate-700 rounded-xl shadow-xl py-1 z-50 animate-scale-in origin-top-right">
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      navigate('/notificacoes')
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <span className="flex items-center gap-2"><Bell size={16} aria-hidden="true" /> Notificações</span>
                    {notifCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">
                        {notifCount > 9 ? '9+' : notifCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      navigate('/inteligencia')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left font-semibold text-blue-700 active:bg-slate-100"
                  >
                    <Lightbulb size={16} aria-hidden="true" /> Inteligência de Vendas
                  </button>
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      navigate('/chamado-veicular')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <Car size={16} aria-hidden="true" /> Chamado Veicular
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      setAjudaAberta(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <CircleHelp size={16} aria-hidden="true" /> Ajuda
                  </button>
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      setTourAberto(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <Compass size={16} aria-hidden="true" /> Tour do app
                  </button>
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      navigate('/perfil')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <UserCircle size={16} aria-hidden="true" /> Meu perfil
                  </button>
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      setConfigAberto(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <Settings size={16} aria-hidden="true" /> Config
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-red-600 active:bg-red-50"
                  >
                    <DoorOpen size={16} aria-hidden="true" /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

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
      <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex safe-bottom ${navDestaque ? 'z-[60]' : 'z-30'}`}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 min-w-0 flex flex-col items-center py-2.5 text-[10px] transition-colors ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-400'
              } ${navDestaque === item.to ? 'bg-blue-50 text-blue-700 font-bold animate-pulse-glow rounded-lg' : ''}`
            }
          >
            <item.icon size={20} className="mb-0.5" aria-hidden="true" />
            <span className="max-w-full whitespace-nowrap tracking-tight">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
