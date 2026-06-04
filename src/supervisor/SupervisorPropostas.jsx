import { useState, useEffect } from 'react'
import { getPropostas, marcarPropostaResolvida } from '../lib/supabaseQueries'
import { statusLabel, statusColor } from '../lib/funil'
import VendedorAvatar from '../components/VendedorAvatar'

const fmtR$ = (v) => (v != null && v !== '' ? `R$ ${Number(v).toLocaleString('pt-BR')}` : null)

export default function SupervisorPropostas() {
  const [propostas, setPropostas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendentes') // pendentes | resolvidos | todos

  useEffect(() => { carregar() }, [])
  async function carregar() {
    setLoading(true)
    setPropostas(await getPropostas())
    setLoading(false)
  }

  async function toggle(n) {
    const novo = !n.proposta_resolvida
    await marcarPropostaResolvida(n.id, novo)
    setPropostas((prev) => prev.map((x) => x.id === n.id ? { ...x, proposta_resolvida: novo } : x))
  }

  const filtradas = propostas.filter((n) => {
    if (filtro === 'pendentes') return !n.proposta_resolvida
    if (filtro === 'resolvidos') return n.proposta_resolvida
    return true
  })

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Propostas</h2>
      <p className="text-xs text-slate-500 mb-3">Negócios na etapa "Solicitação da Proposta" aguardando cotação</p>

      <div className="flex gap-2 mb-4">
        {[
          { k: 'pendentes', label: 'Pendentes' },
          { k: 'resolvidos', label: 'Resolvidas' },
          { k: 'todos', label: 'Todas' },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFiltro(f.k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filtro === f.k ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {f.label}
            {f.k === 'pendentes' && ` (${propostas.filter((n) => !n.proposta_resolvida).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtradas.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Nenhuma proposta {filtro === 'pendentes' ? 'pendente' : ''}</p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((n) => {
            const p = n.proposta_dados || {}
            const maquina = [n.maquina_familia, n.maquina_marca, n.maquina_modelo].filter(Boolean).join(' · ')
            return (
              <div key={n.id} className={`bg-white rounded-xl shadow p-4 ${n.proposta_resolvida ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <VendedorAvatar id={n.vendedor_id} nome={n.vendedor_nome} size={30} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">{n.cliente_nome || '—'}</p>
                      {n.cidade && <p className="text-xs text-slate-500 leading-tight truncate">{n.cidade}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColor(n.status)}`}>{statusLabel(n.status)}</span>
                </div>

                {maquina && <p className="text-sm text-slate-700 mt-2">🚜 {maquina}</p>}

                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {fmtR$(p.valor_pretendido) && <p><span className="text-slate-400">Pretendido:</span> {fmtR$(p.valor_pretendido)}</p>}
                  {p.forma_pagamento && <p><span className="text-slate-400">Pagamento:</span> {p.forma_pagamento}</p>}
                  {fmtR$(p.entrada) && <p><span className="text-slate-400">Entrada:</span> {fmtR$(p.entrada)}</p>}
                  {p.prazo && <p><span className="text-slate-400">Prazo:</span> {p.prazo}</p>}
                  {p.troca_tem && <p className="col-span-2"><span className="text-slate-400">Troca:</span> {p.troca_descricao || 'sim'}{fmtR$(p.troca_valor) ? ` (${fmtR$(p.troca_valor)})` : ''}</p>}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Solicitada {n.proposta_solicitada_em ? new Date(n.proposta_solicitada_em).toLocaleDateString('pt-BR') : ''}
                    {n.proposta_resolvida && n.proposta_resolvida_por ? ` · gerada por ${n.proposta_resolvida_por}` : ''}
                  </span>
                  <button
                    onClick={() => toggle(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${n.proposta_resolvida ? 'bg-slate-100 text-slate-600' : 'bg-green-600 text-white'}`}
                  >
                    {n.proposta_resolvida ? 'Reabrir' : 'Marcar proposta gerada'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
