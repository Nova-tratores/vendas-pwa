// Garagem do vendedor: nível em cv, XP, sequência (chama) e a coleção de
// tratores — um por nível conquistado. Tudo derivado das visitas registradas.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Trator from '../components/gamificacao/Trator'
import { NIVEIS } from '../lib/gamificacao'
import { carregarPerfil } from '../lib/gamificacaoLocal'
import { somLigado, ligarSom, somPartida } from '../lib/recompensas'

const CHAMAS = ['', '🔥', '🔥', '🔥🔥', '🔥🔥🔥']
const TAM_CHAMA = ['text-3xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl']

export default function Garagem() {
  const [perfil, setPerfil] = useState(null)
  const [som, setSom] = useState(somLigado())

  useEffect(() => { carregarPerfil().then(setPerfil).catch(() => setPerfil(null)) }, [])

  if (!perfil) return <p className="p-4 text-sm text-slate-500">Carregando sua garagem…</p>
  const { xp, nivel, sequencia, chama } = perfil

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h2 className="text-xl font-bold">Minha garagem</h2>

      <section className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
        <Trator cv={nivel.cv} size={110} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500">Seu nível</p>
          <p className="text-3xl font-extrabold">{nivel.cv} cv</p>
          <p className="text-xs text-slate-600">{xp.toLocaleString('pt-BR')} XP</p>
          {nivel.proximo ? (
            <>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden mt-2">
                <div className="h-full bg-green-600 rounded-full" style={{ width: `${nivel.pct}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Faltam {nivel.faltaXp.toLocaleString('pt-BR')} XP para {nivel.proximo.cv} cv</p>
            </>
          ) : <p className="text-[11px] text-green-700 mt-1 font-semibold">Nível máximo!</p>}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
        <span className={TAM_CHAMA[chama]} aria-hidden="true">{CHAMAS[chama] || '🪵'}</span>
        <div>
          <p className="text-2xl font-extrabold">{sequencia.dias} {sequencia.dias === 1 ? 'dia' : 'dias'} seguidos</p>
          <p className="text-xs text-slate-500">Dias úteis com pelo menos 1 visita completa. Fim de semana não conta.</p>
          <p className="text-xs mt-1 text-slate-600">
            🛡️ Proteção do mês: {sequencia.protecaoDisponivel ? 'disponível (cobre 1 dia sem visita)' : 'já usada este mês'}
          </p>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4">
        <h3 className="text-sm font-bold mb-2">Coleção</h3>
        <div className="grid grid-cols-3 gap-3">
          {NIVEIS.map((n) => {
            const tem = xp >= n.xp
            return (
              <div key={n.cv} className={`text-center rounded-lg p-2 ${tem ? 'bg-slate-50' : ''}`}>
                <Trator cv={n.cv} bloqueado={!tem} size={80} />
                <p className={`text-xs font-bold ${tem ? 'text-slate-800' : 'text-slate-400'}`}>{n.cv} cv</p>
                {!tem && <p className="text-[10px] text-slate-400">{n.xp.toLocaleString('pt-BR')} XP</p>}
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-4 text-sm space-y-2">
        <p className="text-slate-600">Cada visita vale a nota dela em XP (até 100). Visita completa (verde) mantém a sequência.</p>
        <label className="flex items-center justify-between">
          <span>Som das recompensas</span>
          <input type="checkbox" checked={som} onChange={(e) => { ligarSom(e.target.checked); setSom(e.target.checked); if (e.target.checked) somPartida() }} />
        </label>
        <p className="text-[11px] text-slate-500">Desligado por padrão, para não tocar na frente do cliente.</p>
      </section>

      <Link to="/visitas" className="block text-center bg-green-600 text-white font-semibold py-2.5 rounded-lg">Registrar visita</Link>
    </div>
  )
}
