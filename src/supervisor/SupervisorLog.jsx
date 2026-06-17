import { useState, useEffect, useMemo, useCallback } from 'react'
import { getAuditLogs } from '../lib/auditoria'

function hojeLocal() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACAO_ICON = { criar: '➕', alterar: '✏️', excluir: '🗑️', login: '🔑' }
const ENTIDADE_LABEL = {
  clientes: 'Cliente', propriedades: 'Propriedade', pessoas: 'Pessoa', maquinas: 'Máquina',
  visitas: 'Visita', negocios: 'Negócio', sessao: 'Login', midia: 'Mídia', ficha: 'Ficha catálogo',
  marca: 'Marca', estoque_override: 'Estoque/preço',
}

export default function SupervisorLog() {
  const [dia, setDia] = useState(hojeLocal())
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroAtor, setFiltroAtor] = useState('todos')

  const carregar = useCallback(async () => {
    setLoading(true)
    try { setLogs(await getAuditLogs({ dia })) } catch (e) { console.error(e) }
    setLoading(false)
  }, [dia])

  useEffect(() => { carregar() }, [carregar])

  // Agrupa por ator (pessoa), ordenado por quem mais fez.
  const porAtor = useMemo(() => {
    const visiveis = filtroAtor === 'todos'
      ? logs
      : logs.filter((l) => (filtroAtor === 'supervisor' ? l.tipo_ator === 'supervisor' : l.tipo_ator !== 'supervisor'))
    const mapa = new Map()
    for (const l of visiveis) {
      const chave = l.ator
      if (!mapa.has(chave)) mapa.set(chave, { ator: l.ator, tipo: l.tipo_ator, itens: [] })
      mapa.get(chave).itens.push(l)
    }
    return [...mapa.values()].sort((a, b) => b.itens.length - a.itens.length)
  }, [logs, filtroAtor])

  function mudarDia(delta) {
    const d = new Date(`${dia}T12:00:00`)
    d.setDate(d.getDate() + delta)
    setDia(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Log de atividades</h2>
        <p className="text-sm text-slate-500">O que cada pessoa fez no dia (vendedores e admin).</p>
      </div>

      {/* Seletor de dia */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => mudarDia(-1)} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm">←</button>
        <input type="date" value={dia} max={hojeLocal()} onChange={(e) => setDia(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={() => mudarDia(1)} disabled={dia >= hojeLocal()} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm disabled:opacity-40">→</button>
        <button onClick={() => setDia(hojeLocal())} className="px-3 py-1.5 bg-slate-100 rounded-lg text-sm">Hoje</button>
        <button onClick={carregar} className="ml-auto px-3 py-1.5 bg-slate-100 rounded-lg text-sm">Atualizar</button>
      </div>

      {/* Filtro por tipo de ator */}
      <div className="flex gap-1 mb-4">
        {[['todos', 'Todos'], ['vendedor', 'Vendedores'], ['supervisor', 'Admin']].map(([k, label]) => (
          <button key={k} onClick={() => setFiltroAtor(k)}
            className={`px-3 py-1 rounded-full text-xs border ${filtroAtor === k ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{logs.length} ações</span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-10">Carregando...</p>
      ) : porAtor.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">Nenhuma atividade nesse dia.</p>
      ) : (
        <div className="space-y-3">
          {porAtor.map((grupo) => (
            <div key={grupo.ator} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{grupo.ator}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${grupo.tipo === 'supervisor' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {grupo.tipo === 'supervisor' ? 'Admin' : 'Vendedor'}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{grupo.itens.length} ações</span>
              </div>
              <ul className="divide-y divide-slate-50">
                {grupo.itens.map((l) => (
                  <li key={l.id} className="px-4 py-2 flex items-start gap-3 text-sm">
                    <span className="text-slate-400 tabular-nums shrink-0 w-12">
                      {new Date(l.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="shrink-0">{ACAO_ICON[l.acao] || '•'}</span>
                    <span className="min-w-0">
                      <span className="font-medium text-slate-700">{ENTIDADE_LABEL[l.entidade] || l.entidade}</span>
                      {l.detalhes && <span className="text-slate-500"> · {l.detalhes}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
