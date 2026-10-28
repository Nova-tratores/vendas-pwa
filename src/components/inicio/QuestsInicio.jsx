// Quests no Início: as que o vendedor tem para fazer (até 3, atrasadas primeiro).
// Some quando não há nenhuma. Lê a cópia do aparelho quando está sem internet.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { carregarMinhasQuests, idsNaFila } from '../../lib/questsLocal'
import { questsAFazer } from '../../lib/quests'
import { CartaoQuest } from '../../pages/Quests'

export default function QuestsInicio() {
  const navigate = useNavigate()
  const [lista, setLista] = useState([])
  useEffect(() => {
    let vivo = true
    Promise.all([carregarMinhasQuests(), idsNaFila()])
      .then(([d, fila]) => { if (vivo) setLista(questsAFazer(d.quests, fila)) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])
  if (!lista.length) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">Quests para fazer ({lista.length})</p>
        {lista.length > 3 && <button type="button" onClick={() => navigate('/quests')} className="text-xs text-blue-700">ver todas</button>}
      </div>
      {lista.slice(0, 3).map((q) => <CartaoQuest key={q.id} q={q} onClick={() => navigate(`/quests/${q.id}`)} />)}
    </div>
  )
}
