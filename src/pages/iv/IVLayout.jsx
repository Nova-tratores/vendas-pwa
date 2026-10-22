import { NavLink, Outlet } from 'react-router-dom'
import { TELAS_IV_VISIVEIS } from '../../lib/iv/telas'

// Faixa vermelha com guias estilo Chrome — mesmo molde do IVNav do Portal, adaptado ao celular
// (rola de lado). Cada aba é uma rota filha de /inteligencia.
export default function IVLayout() {
  return (
    <div className="-mx-4 -mt-4">
      <nav
        className="flex items-end gap-1 px-3 pt-2.5 overflow-x-auto whitespace-nowrap"
        style={{ background: 'linear-gradient(135deg, #F87171, #991B1B)', scrollbarWidth: 'none' }}
        aria-label="Inteligência de Vendas"
      >
        {TELAS_IV_VISIVEIS.map((t) => (
          <NavLink
            key={t.slug}
            to={`/inteligencia/${t.slug}`}
            className={({ isActive }) =>
              `px-3.5 py-2 text-[13px] rounded-t-[10px] text-[#111111] transition ${
                isActive ? 'bg-[#fefefe] font-bold shadow-[0_-2px_6px_rgba(0,0,0,0.15)]' : 'bg-white/30 font-medium'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 pt-4 pb-6 bg-[#fefefe] min-h-[60vh]">
        <Outlet />
      </div>
    </div>
  )
}
