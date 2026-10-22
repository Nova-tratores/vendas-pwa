// Território da equipe (supervisor): o que cada vendedor já desbloqueou.
import { useEffect, useState } from 'react'
import { getVendedores } from '../lib/supabaseQueries'
import Territorio from '../components/Territorio'

export default function SupervisorTerritorio() {
  const [vendedores, setVendedores] = useState([])
  useEffect(() => { getVendedores().then(setVendedores) }, [])
  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Território</h2>
      <p className="text-xs text-slate-500 mb-3">Imóveis rurais do CAR: cinza bloqueado, verde claro visitado, verde médio em conversa, verde escuro quente, dourado comprou.</p>
      <Territorio supervisor vendedores={vendedores} />
    </div>
  )
}
