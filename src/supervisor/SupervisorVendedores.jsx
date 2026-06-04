import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMetricasPorVendedor } from '../lib/supabaseQueries'
import { tempoRelativo, diasDesde } from '../lib/tempo'
import DetalheModal from './DetalheModal'
import RelatorioImpressao, { RelSecao, RelTabela } from './RelatorioImpressao'

function fmtData(iso) {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'
}

function fmtPipeline(valor) {
  return valor > 0 ? `R$ ${valor.toLocaleString('pt-BR')}` : 'R$ 0'
}

export default function SupervisorVendedores() {
  const navigate = useNavigate()
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null) // { titulo, tipo, itens }
  const [modoImpressao, setModoImpressao] = useState(null)
  const [menuImpressao, setMenuImpressao] = useState(false)

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

  // Abre o popup com a lista que compõe uma métrica do vendedor
  function abrirDetalhe(e, v, listKey, tipo, rotulo) {
    e.stopPropagation()
    setDetalhe({
      titulo: `${v.nome} · ${rotulo}`,
      tipo,
      itens: v.listas?.[listKey] || [],
    })
  }

  function imprimir(modo) {
    setMenuImpressao(false)
    setModoImpressao(modo)
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
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold">Vendedores</h2>
        <div className="relative">
          <button
            onClick={() => setMenuImpressao((m) => !m)}
            className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium active:bg-slate-200"
          >
            🖨️ Imprimir
          </button>
          {menuImpressao && (
            <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 z-20 overflow-hidden w-44">
              <button
                onClick={() => imprimir('simples')}
                className="block w-full text-left px-4 py-2.5 text-sm active:bg-slate-100"
              >
                Versão simples
              </button>
              <button
                onClick={() => imprimir('detalhada')}
                className="block w-full text-left px-4 py-2.5 text-sm border-t border-slate-100 active:bg-slate-100"
              >
                Versão detalhada
              </button>
            </div>
          )}
        </div>
      </div>

      {vendedores.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Nenhum vendedor encontrado</p>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3">Toque em uma métrica para ver os detalhes.</p>
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
                    <button
                      onClick={(e) => abrirDetalhe(e, v, 'visitasSemana', 'visitas', 'Visitas na semana')}
                      className="rounded-lg py-1 active:bg-slate-100"
                    >
                      <p className="text-lg font-bold text-blue-600">{v.visitasSemana}</p>
                      <p className="text-[10px] text-slate-500">Semana</p>
                    </button>
                    <button
                      onClick={(e) => abrirDetalhe(e, v, 'totalVisitas', 'visitas', 'Total de visitas')}
                      className="rounded-lg py-1 active:bg-slate-100"
                    >
                      <p className="text-lg font-bold text-slate-700">{v.totalVisitas}</p>
                      <p className="text-[10px] text-slate-500">Total</p>
                    </button>
                    <button
                      onClick={(e) => abrirDetalhe(e, v, 'pipeline', 'negocios', 'Pipeline')}
                      className="rounded-lg py-1 active:bg-slate-100"
                    >
                      <p className="text-lg font-bold text-green-600">
                        {v.pipeline > 0 ? `${(v.pipeline / 1000).toFixed(0)}k` : '0'}
                      </p>
                      <p className="text-[10px] text-slate-500">Pipeline</p>
                    </button>
                    <button
                      onClick={(e) => abrirDetalhe(e, v, 'negociosAndamento', 'negocios', 'Negócios em andamento')}
                      className="rounded-lg py-1 active:bg-slate-100"
                    >
                      <p className="text-lg font-bold text-slate-700">{v.negociosAndamento}</p>
                      <p className="text-[10px] text-slate-500">Negócios</p>
                    </button>
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
        </>
      )}

      <DetalheModal
        show={!!detalhe}
        titulo={detalhe?.titulo}
        tipo={detalhe?.tipo}
        itens={detalhe?.itens || []}
        onClose={() => setDetalhe(null)}
      />

      <RelatorioImpressao
        titulo="Relatório por Vendedor"
        modo={modoImpressao}
        onDone={() => setModoImpressao(null)}
      >
        <RelSecao titulo="Resumo por vendedor">
          <RelTabela
            colunas={[
              { key: 'nome', label: 'Vendedor' },
              { key: 'semana', label: 'Semana', align: 'right' },
              { key: 'total', label: 'Total', align: 'right' },
              { key: 'pipeline', label: 'Pipeline', align: 'right' },
              { key: 'negocios', label: 'Negócios', align: 'right' },
              { key: 'ultimaVisita', label: 'Última visita', align: 'right' },
            ]}
            linhas={vendedores.map((v) => ({
              nome: v.nome,
              semana: v.visitasSemana,
              total: v.totalVisitas,
              pipeline: fmtPipeline(v.pipeline),
              negocios: v.negociosAndamento,
              ultimaVisita: fmtData(v.ultimaVisita),
            }))}
          />
        </RelSecao>

        {modoImpressao === 'detalhada' && vendedores.map((v) => (
          <RelSecao key={v.id} titulo={v.nome}>
            <div style={{ fontSize: '0.9em', marginBottom: 4, color: '#475569' }}>
              Semana: {v.visitasSemana} · Total: {v.totalVisitas} · Pipeline: {fmtPipeline(v.pipeline)}
              {' '}· Negócios em andamento: {v.negociosAndamento}
              {v.negociosParados > 0 ? ` · Parados: ${v.negociosParados}` : ''}
            </div>

            {(v.listas?.pipeline?.length > 0) && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9em', margin: '4px 0' }}>
                  Negócios em aberto ({v.listas.pipeline.length})
                </div>
                <RelTabela
                  colunas={[
                    { key: 'cliente', label: 'Cliente' },
                    { key: 'status', label: 'Status' },
                    { key: 'valor', label: 'Valor', align: 'right' },
                  ]}
                  linhas={v.listas.pipeline.map((n) => ({
                    cliente: n.cliente_nome || '—',
                    status: n.status,
                    valor: n.valor != null ? `R$ ${Number(n.valor).toLocaleString('pt-BR')}` : '—',
                  }))}
                />
              </div>
            )}

            {(v.listas?.totalVisitas?.length > 0) && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9em', margin: '4px 0' }}>
                  Visitas ({v.listas.totalVisitas.length})
                </div>
                <RelTabela
                  colunas={[
                    { key: 'data', label: 'Data' },
                    { key: 'tipo', label: 'Tipo' },
                    { key: 'cliente', label: 'Cliente' },
                  ]}
                  linhas={v.listas.totalVisitas.slice(0, 30).map((vis) => ({
                    data: fmtData(vis.data_visita),
                    tipo: vis.tipo,
                    cliente: vis.cliente_nome || '—',
                  }))}
                />
                {v.listas.totalVisitas.length > 30 && (
                  <div style={{ fontSize: '0.8em', color: '#94a3b8', marginTop: 2 }}>
                    … e mais {v.listas.totalVisitas.length - 30} visitas
                  </div>
                )}
              </div>
            )}
          </RelSecao>
        ))}
      </RelatorioImpressao>
    </div>
  )
}
