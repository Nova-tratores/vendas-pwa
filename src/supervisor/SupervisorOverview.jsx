import { useState, useEffect } from 'react'
import { getKPIs } from '../lib/supabaseQueries'
import DetalheModal from './DetalheModal'
import RelatorioImpressao, { RelSecao, RelTabela } from './RelatorioImpressao'

function fmtData(iso, comHora = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR')
  if (!comHora) return data
  return data + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function SupervisorOverview() {
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detalhe, setDetalhe] = useState(null) // { titulo, tipo, itens }
  const [modoImpressao, setModoImpressao] = useState(null) // 'simples' | 'detalhada'
  const [menuImpressao, setMenuImpressao] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      setKpis(await getKPIs())
    } catch (err) {
      console.error('[Dashboard]', err)
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

  if (!kpis) return <p className="text-center text-slate-400 py-10">Erro ao carregar dados</p>

  const L = kpis.listas

  // Cada card aponta para a lista que o compõe e o tipo de item
  const cards = [
    { label: 'Visitas Hoje', value: kpis.visitasHoje, color: 'bg-blue-600', listKey: 'visitasHoje', tipo: 'visitas' },
    { label: 'Visitas Semana', value: kpis.visitasSemana, color: 'bg-blue-500', listKey: 'visitasSemana', tipo: 'visitas' },
    { label: 'Visitas Mês', value: kpis.visitasMes, color: 'bg-blue-400', listKey: 'visitasMes', tipo: 'visitas' },
    { label: 'Pipeline', value: `R$ ${kpis.pipeline.toLocaleString('pt-BR')}`, color: 'bg-green-600', listKey: 'pipeline', tipo: 'negocios' },
    { label: 'Fechados no Mês', value: kpis.negociosFechadosMes, color: 'bg-green-500', listKey: 'negociosFechadosMes', tipo: 'negocios' },
    { label: 'Retroativas', value: kpis.visitasRetroativas, color: kpis.visitasRetroativas > 0 ? 'bg-amber-500' : 'bg-slate-400', listKey: 'visitasRetroativas', tipo: 'visitas' },
    { label: 'Pós Vendas Pendentes', value: kpis.posVendasPendentes, color: kpis.posVendasPendentes > 0 ? 'bg-orange-500' : 'bg-slate-400', listKey: 'posVendasPendentes', tipo: 'visitas' },
    { label: 'Total Negócios', value: kpis.totalNegocios, color: 'bg-slate-600', listKey: 'totalNegocios', tipo: 'negocios' },
  ]

  function abrirDetalhe(card) {
    setDetalhe({ titulo: card.label, tipo: card.tipo, itens: L[card.listKey] || [] })
  }

  function imprimir(modo) {
    setMenuImpressao(false)
    setModoImpressao(modo)
  }

  // Linhas das tabelas do relatório
  const linhasIndicadores = cards.map((c) => ({ label: c.label, value: String(c.value) }))

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold">Visão Geral</h2>
        <div className="flex items-center gap-3">
          <button onClick={carregar} className="text-sm text-slate-500 active:text-slate-700">
            Atualizar
          </button>
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
      </div>

      <p className="text-xs text-slate-400 mb-3">Toque em um card para ver os detalhes.</p>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => abrirDetalhe(card)}
            className={`${card.color} text-white rounded-xl p-4 text-left card-touch`}
          >
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs opacity-80 mt-1">{card.label}</p>
          </button>
        ))}
      </div>

      <DetalheModal
        show={!!detalhe}
        titulo={detalhe?.titulo}
        tipo={detalhe?.tipo}
        itens={detalhe?.itens || []}
        onClose={() => setDetalhe(null)}
      />

      <RelatorioImpressao
        titulo="Relatório Geral"
        modo={modoImpressao}
        onDone={() => setModoImpressao(null)}
      >
        <RelSecao titulo="Indicadores">
          <RelTabela
            colunas={[
              { key: 'label', label: 'Indicador' },
              { key: 'value', label: 'Valor', align: 'right' },
            ]}
            linhas={linhasIndicadores}
          />
        </RelSecao>

        {modoImpressao === 'detalhada' && (
          <>
            <RelSecao titulo={`Visitas do mês (${L.visitasMes.length})`}>
              <RelTabela
                colunas={[
                  { key: 'data', label: 'Data' },
                  { key: 'vendedor', label: 'Vendedor' },
                  { key: 'tipo', label: 'Tipo' },
                  { key: 'cliente', label: 'Cliente' },
                ]}
                linhas={L.visitasMes.map((v) => ({
                  data: fmtData(v.data_visita),
                  vendedor: v.vendedor_nome || '—',
                  tipo: v.tipo,
                  cliente: v.cliente_nome || '—',
                }))}
              />
            </RelSecao>

            <RelSecao titulo={`Pipeline — negócios em aberto (${L.pipeline.length})`}>
              <RelTabela
                colunas={[
                  { key: 'cliente', label: 'Cliente' },
                  { key: 'vendedor', label: 'Vendedor' },
                  { key: 'status', label: 'Status' },
                  { key: 'valor', label: 'Valor', align: 'right' },
                ]}
                linhas={L.pipeline.map((n) => ({
                  cliente: n.cliente_nome || '—',
                  vendedor: n.vendedor_nome || '—',
                  status: n.status,
                  valor: n.valor != null ? `R$ ${Number(n.valor).toLocaleString('pt-BR')}` : '—',
                }))}
              />
            </RelSecao>

            {L.posVendasPendentes.length > 0 && (
              <RelSecao titulo={`Pós-vendas pendentes (${L.posVendasPendentes.length})`}>
                <RelTabela
                  colunas={[
                    { key: 'data', label: 'Data' },
                    { key: 'vendedor', label: 'Vendedor' },
                    { key: 'cliente', label: 'Cliente' },
                  ]}
                  linhas={L.posVendasPendentes.map((v) => ({
                    data: fmtData(v.data_visita),
                    vendedor: v.vendedor_nome || '—',
                    cliente: v.cliente_nome || '—',
                  }))}
                />
              </RelSecao>
            )}
          </>
        )}
      </RelatorioImpressao>
    </div>
  )
}
