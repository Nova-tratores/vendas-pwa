import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { setSyncCallback, setAuthRequiredCallback, syncAll, countPending, supabase } from '../lib/sync'
import { clearAll } from '../lib/db'
import ConfigModal from './ConfigModal'

const navItems = [
  { to: '/dashboard', label: 'Início', icon: '🏠' },
  { to: '/agenda', label: 'Agenda', icon: '📅' },
  { to: '/clientes', label: 'Clientes', icon: '👤' },
  { to: '/catalogo', label: 'Catálogo', icon: '📦' },
  { to: '/visitas', label: 'Visitas', icon: '📍' },
  { to: '/negocios', label: 'Negócios', icon: '💰' },
]

export default function Layout() {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [online, setOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', detail: '' })
  const [pending, setPending] = useState(0)
  const [precisaReentrar, setPrecisaReentrar] = useState(false)
  const [menuAberto, setMenuAberto] = useState(false)
  const [configAberto, setConfigAberto] = useState(false)

  const updatePending = useCallback(async () => {
    setPending(await countPending())
  }, [])

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
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">Vendas App</h1>
          <span className="text-base leading-none" aria-label="Brasil" title="Brasil">🇧🇷</span>
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>
        <div className="flex items-center gap-3">
          {/* Botão de sync manual */}
          <button
            onClick={handleSync}
            disabled={!online || isSyncing}
            className="relative text-xs bg-blue-900 px-2 py-1 rounded active:bg-blue-950 disabled:opacity-50"
          >
            <span className={isSyncing ? 'animate-spin inline-block' : ''}>
              {isSyncing ? '⟳' : '↻'}
            </span>
            {pending > 0 && !isSyncing && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pending > 9 ? '9+' : pending}
              </span>
            )}
          </button>
          <span className="text-sm opacity-80">{vendedor.nome}</span>

          {/* Menu hamburguer */}
          <div className="relative">
            <button
              onClick={() => setMenuAberto((v) => !v)}
              className="text-lg leading-none bg-blue-900 px-2.5 py-1.5 rounded active:bg-blue-950"
              aria-label="Menu"
              aria-expanded={menuAberto}
            >
              ☰
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
                      navigate('/chamado-veicular')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <span>🚗</span> Chamado Veicular
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      setConfigAberto(true)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left active:bg-slate-100"
                  >
                    <span>⚙️</span> Config
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setMenuAberto(false)
                      handleLogout()
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-red-600 active:bg-red-50"
                  >
                    <span>🚪</span> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <ConfigModal show={configAberto} onClose={() => setConfigAberto(false)} />

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

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex safe-bottom">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2.5 text-xs transition-colors ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-400'
              }`
            }
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
