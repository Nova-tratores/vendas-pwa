import { useState, useEffect } from 'react'
import { getVisitas, marcarPosVendasResolvido, getVendedores } from '../lib/supabaseQueries'
import VendedorAvatar from '../components/VendedorAvatar'

export default function SupervisorPosVendas() {
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendentes') // pendentes | resolvidos | todos

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const data = await getVisitas({ posVendas: true })
      setVisitas(data)
    } catch (err) {
      console.error('[PosVendas]', err)
    }
    setLoading(false)
  }

  async function toggleResolvido(visita) {
    const novoStatus = !visita.pos_vendas_resolvido
    const ok = await marcarPosVendasResolvido(visita.id, novoStatus)
    if (ok) {
      setVisitas((prev) =>
        prev.map((v) => v.id === visita.id ? { ...v, pos_vendas_resolvido: novoStatus } : v)
      )
    }
  }

  const filtradas = visitas.filter((v) => {
    if (filtro === 'pendentes') return !v.pos_vendas_resolvido
    if (filtro === 'resolvidos') return v.pos_vendas_resolvido
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Pós Vendas</h2>

      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        {['pendentes', 'resolvidos', 'todos'].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filtro === f ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pendentes' && ` (${visitas.filter((v) => !v.pos_vendas_resolvido).length})`}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <p className="text-slate-400 text-center py-10">
          {filtro === 'pendentes' ? 'Nenhum pós-vendas pendente' : 'Nenhum registro encontrado'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((v) => {
            const data = new Date(v.data_visita)
            const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={v.id}
                className={`bg-white rounded-xl shadow p-4 ${v.pos_vendas_resolvido ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between mb-1 gap-2">
                  {/* Cliente em destaque; vendedor vira o círculo com a inicial */}
                  <div className="flex items-center gap-2 min-w-0">
                    <VendedorAvatar id={v.vendedor_id} nome={v.vendedor_nome} size={30} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">{v.cliente_nome || '—'}</p>
                      {v.propriedade_nome && <p className="text-xs text-slate-500 leading-tight truncate">{v.propriedade_nome}</p>}
                      <p className="text-xs text-slate-500">{dataStr}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleResolvido(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 ${
                      v.pos_vendas_resolvido
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-green-600 text-white'
                    }`}
                  >
                    {v.pos_vendas_resolvido ? 'Reabrir' : 'Resolver'}
                  </button>
                </div>
                {v.resumo && <p className="text-sm text-slate-700 mt-2">{v.resumo}</p>}
                {v.maquina_ids?.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Máquinas: {v.maquina_ids.join(', ')}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
