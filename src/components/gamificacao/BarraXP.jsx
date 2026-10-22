// Barra de XP fixa logo abaixo do topo (logo + 4 botões): nível em cv, XP e quanto
// falta para o próximo trator. Toque abre a Garagem. Relê ao trocar de tela e
// quando algo é gravado no aparelho (visita salva, trator confirmado…).
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import Trator from './Trator'
import { nivelDe } from '../../lib/gamificacao'

// sem visitas no aparelho (ou se a leitura falhar) a barra aparece igual, no 1º nível
const VAZIO = { xp: 0, nivel: nivelDe(0), sequencia: { dias: 0 } }

export default function BarraXP() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [perfil, setPerfil] = useState(null)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    const mudou = () => setVersao((v) => v + 1)
    window.addEventListener('vendas:pending-write', mudou)
    return () => window.removeEventListener('vendas:pending-write', mudou)
  }, [])

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      import('../../lib/gamificacaoLocal').then((m) => m.carregarPerfil()).then((p) => { if (vivo) setPerfil(p || VAZIO) }).catch(() => { if (vivo) setPerfil((x) => x || VAZIO) })
    }, 400)
    return () => { vivo = false; clearTimeout(t) }
  }, [pathname, versao])

  const p = perfil || VAZIO
  const n = p.nivel
  const seq = p.sequencia?.dias || 0
  return (
    <button
      onClick={() => navigate('/garagem')}
      className="w-full bg-blue-900 text-white px-4 py-1.5 flex items-center gap-2.5 text-left active:bg-blue-950"
      aria-label={`Nível ${n.cv} cv, ${p.xp} XP${n.proximo ? `, faltam ${n.faltaXp} para ${n.proximo.cv} cv` : ''}. Abrir a garagem`}
    >
      <span className="shrink-0 -my-1"><Trator cv={n.cv} size={30} /></span>
      <span className="text-xs font-extrabold shrink-0">{n.cv} cv</span>
      <span className="flex-1 min-w-0">
        <span className="block h-2 rounded-full bg-white/20 overflow-hidden">
          <span className="block h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${n.pct}%` }} />
        </span>
        <span className="block text-[10px] opacity-80 mt-0.5 truncate">
          {p.xp.toLocaleString('pt-BR')} XP{n.proximo ? ` · faltam ${n.faltaXp.toLocaleString('pt-BR')} para ${n.proximo.cv} cv` : ' · nível máximo'}
        </span>
      </span>
      {seq > 0 && (
        <span className="shrink-0 inline-flex items-center gap-0.5 text-xs font-bold text-amber-300">
          <Flame size={14} aria-hidden="true" /> {seq}
        </span>
      )}
    </button>
  )
}
