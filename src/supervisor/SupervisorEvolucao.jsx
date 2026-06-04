import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { getVisitas, getNegocios, getPropriedades } from '../lib/supabaseQueries'
import { isGanho } from '../lib/funil'
import { montarSerie } from '../lib/evolucao'

const EvolucaoChart = lazy(() => import('./EvolucaoChart'))

const DIMENSOES = [
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'cidade', label: 'Cidade' },
]

const PERIODOS = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'trimestre', label: 'Trimestre' },
]

const METRICAS = [
  { key: 'visitas', label: 'Visitas' },
  { key: 'negocios', label: 'Negócios fechados' },
  { key: 'valor', label: 'Valor vendido' },
]

function ToggleGroup({ opcoes, valor, onChange, classe = '' }) {
  return (
    <div className={`inline-flex bg-slate-100 rounded-lg p-0.5 ${classe}`}>
      {opcoes.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            valor === o.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function SupervisorEvolucao() {
  const [loading, setLoading] = useState(true)
  const [visitas, setVisitas] = useState([])
  const [negocios, setNegocios] = useState([])
  const [cidadePorPropriedade, setCidadePorPropriedade] = useState({})

  const [dimensao, setDimensao] = useState('vendedor')
  const [granularidade, setGranularidade] = useState('mes')
  const [metrica, setMetrica] = useState('visitas')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [vis, neg, props] = await Promise.all([
        getVisitas({}),
        getNegocios({}),
        getPropriedades(),
      ])
      setVisitas(vis)
      setNegocios(neg)
      const mapa = {}
      for (const p of props) mapa[p.id] = p.cidade || null
      setCidadePorPropriedade(mapa)
    } catch (err) {
      console.error('[Evolucao]', err)
    }
    setLoading(false)
  }

  // Constrói os eventos normalizados conforme métrica + dimensão escolhidas
  const { data, series } = useMemo(() => {
    function dimDe(item) {
      if (dimensao === 'cidade') {
        return cidadePorPropriedade[item.propriedade_id] || 'Sem cidade'
      }
      return item.vendedor_nome || 'Sem vendedor'
    }

    let eventos = []
    if (metrica === 'visitas') {
      eventos = visitas
        .filter((v) => v.data_visita)
        .map((v) => ({ data: v.data_visita, dimensao: dimDe(v), valor: 1 }))
    } else {
      const fechados = negocios.filter((n) => isGanho(n.status))
      eventos = fechados.map((n) => ({
        data: n.updated_at || n.created_at,
        dimensao: dimDe(n),
        valor: metrica === 'valor' ? (Number(n.valor) || 0) : 1,
      })).filter((e) => e.data)
    }

    return montarSerie(eventos, granularidade, 8)
  }, [visitas, negocios, cidadePorPropriedade, dimensao, granularidade, metrica])

  const fmtValor = metrica === 'valor'
    ? (v) => `R$ ${Number(v).toLocaleString('pt-BR')}`
    : (v) => String(v)

  const totalGeral = data.reduce(
    (acc, ponto) => acc + series.reduce((s, serie) => s + (ponto[serie] || 0), 0),
    0
  )

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Evolução</h2>

      {/* Controles */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 w-16">Agrupar</span>
          <ToggleGroup opcoes={DIMENSOES} valor={dimensao} onChange={setDimensao} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500 w-16">Período</span>
          <ToggleGroup opcoes={PERIODOS} valor={granularidade} onChange={setGranularidade} />
        </div>
        <div className="overflow-x-auto">
          <ToggleGroup opcoes={METRICAS} valor={metrica} onChange={setMetrica} classe="min-w-max" />
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl shadow p-3">
        {loading ? (
          <div className="flex items-center justify-center h-[340px]">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-center text-slate-400 py-24 text-sm">
            Sem dados para essa combinação
          </p>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-[340px]">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
            <EvolucaoChart data={data} series={series} fmtValor={fmtValor} />
          </Suspense>
        )}
      </div>

      {!loading && data.length > 0 && (
        <p className="text-xs text-slate-400 mt-3 text-center">
          {METRICAS.find((m) => m.key === metrica)?.label} por {dimensao === 'cidade' ? 'cidade' : 'vendedor'},{' '}
          {granularidade === 'semana' ? 'semana a semana' : granularidade === 'trimestre' ? 'trimestre a trimestre' : 'mês a mês'}
          {' · '}
          {metrica === 'valor' ? fmtValor(totalGeral) : `${totalGeral} no total`}
          {series.includes('Outros') ? ' · top 8 + Outros' : ''}
        </p>
      )}
    </div>
  )
}
