// Garagem do vendedor: nível em cv, XP, sequência (chama) e a coleção de
// tratores — um por nível conquistado. Tudo derivado das visitas registradas.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Trator from '../components/gamificacao/Trator'
import { NIVEIS } from '../lib/gamificacao'
import { carregarPerfil } from '../lib/gamificacaoLocal'
import { somLigado, ligarSom, somPartida } from '../lib/recompensas'
import { getMensagens } from '../lib/notificacoes'
import { impactoDoVendedor } from '../lib/mapaVendedores'

const CHAMAS = ['', '🔥', '🔥', '🔥🔥', '🔥🔥🔥']
const TAM_CHAMA = ['text-3xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl']

export default function Garagem() {
  const [perfil, setPerfil] = useState(null)
  const [som, setSom] = useState(somLigado())
  const [curtidas, setCurtidas] = useState(0)
  const [impacto, setImpacto] = useState(null)

  useEffect(() => { carregarPerfil().then(setPerfil).catch(() => setPerfil(null)) }, [])
  // impacto real: serviço do Pós-Vendas de cliente visitado, depois da visita
  useEffect(() => { if (navigator.onLine) impactoDoVendedor().then(setImpacto).catch(() => {}) }, [])
  // visitas curtidas pelo supervisor (mensagens com o link de curtida)
  useEffect(() => {
    let vend = {}
    try { vend = JSON.parse(localStorage.getItem('vendedor') || '{}') } catch { /* sem vendedor */ }
    if (!vend.id) return
    getMensagens(vend.id)
      .then((ms) => setCurtidas(ms.filter((m) => String(m.link || '').startsWith('/visitas?curtida=')).length))
      .catch(() => {})
  }, [])

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

      {impacto?.itens?.length > 0 && (
        <section className="bg-white rounded-xl shadow p-4">
          <h3 className="text-sm font-bold">💰 Impacto do seu trabalho</h3>
          <p className="text-xs text-slate-500 mb-2">Serviços do Pós-Vendas feitos para clientes que você visitou, depois da sua visita (últimos 6 meses).</p>
          <p className="text-2xl font-extrabold text-green-700">{impacto.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p className="text-xs text-slate-500 mb-2">{impacto.clientes} cliente{impacto.clientes > 1 ? 's' : ''} · {impacto.itens.length} serviço{impacto.itens.length > 1 ? 's' : ''}</p>
          <ul className="space-y-1">
            {impacto.itens.slice(0, 5).map((x) => (
              <li key={x.os} className="text-xs text-slate-700">
                <b>{x.cliente}</b> · {x.servico} · {x.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                <span className="text-slate-400"> · {new Date(x.data + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {curtidas > 0 && (
        <section className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">👏</span>
          <p className="text-sm"><b>{curtidas}</b> {curtidas === 1 ? 'visita sua foi curtida' : 'visitas suas foram curtidas'} pelo supervisor.</p>
        </section>
      )}

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
