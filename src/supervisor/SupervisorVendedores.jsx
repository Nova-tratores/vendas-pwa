import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMetricasPorVendedor } from '../lib/supabaseQueries'
import { tempoRelativo, diasDesde } from '../lib/tempo'

export default function SupervisorVendedores() {
  const navigate = useNavigate()
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      setVendedores(await getMetricasPorVendedor())
    } catch (err) {
      console.error('[Vendedores]', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Vendedores</h2>

      {vendedores.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Nenhum vendedor encontrado</p>
      ) : (
        <div className="space-y-3">
          {vendedores.map((v) => {
            const diasSemVisita = v.ultimaVisita ? diasDesde(v.ultimaVisita) : null
            const acesso = tempoRelativo(v.ultimoAcesso)

            return (
              <div
                key={v.id}
                onClick={() => navigate(`/supervisor/visitas?vendedor_id=${v.id}`)}
                className="bg-white rounded-xl shadow p-4 active:bg-slate-50 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-sm">{v.nome}</p>
                  {diasSemVisita !== null && diasSemVisita > 3 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                      {diasSemVisita}d sem visita
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{v.visitasSemana}</p>
                    <p className="text-[10px] text-slate-500">Semana</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{v.totalVisitas}</p>
                    <p className="text-[10px] text-slate-500">Total</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">
                      {v.pipeline > 0 ? `${(v.pipeline / 1000).toFixed(0)}k` : '0'}
                    </p>
                    <p className="text-[10px] text-slate-500">Pipeline</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700">{v.negociosAndamento}</p>
                    <p className="text-[10px] text-slate-500">Negócios</p>
                  </div>
                </div>

                {/* Linha de monitoramento */}
                <div className="mt-3 pt-2 border-t border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Último acesso</span>
                    <span className={`font-medium ${acesso.color}`}>{acesso.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Última visita</span>
                    <span className="text-slate-700">
                      {v.ultimaVisita ? new Date(v.ultimaVisita).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Último GPS</span>
                    {v.ultimoGps ? (
                      <a
                        href={`https://www.google.com/maps?q=${v.ultimoGps.lat},${v.ultimoGps.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-700 font-medium"
                      >
                        ver no mapa ↗
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </div>
                  {v.negociosParados > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Negócios parados</span>
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                        {v.negociosParados}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
