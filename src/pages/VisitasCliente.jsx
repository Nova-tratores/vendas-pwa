import { useState, useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getRecord, getByIndex, getAllRecords } from '../lib/db'
import { PERIODOS, dentroDoPeriodo } from '../lib/tempo'
import PullToRefresh from '../components/PullToRefresh'
import VisitaCard from '../components/VisitaCard'

// Histórico de visitas de um cliente — agrega as visitas de TODAS as
// propriedades do mesmo dono. Acessado pelo ícone no card da aba Clientes
// (param é o id de UMA propriedade do cliente). Somente leitura.
export default function VisitasCliente() {
  const { propriedadeId } = useParams()
  const [titulo, setTitulo] = useState('')
  const [nFazendas, setNFazendas] = useState(0)
  const [visitas, setVisitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('tudo')

  useEffect(() => { carregar() }, [propriedadeId])

  async function carregar() {
    setLoading(true)
    try {
      const propId = Number(propriedadeId)
      const prop = await getRecord('propriedades', propId)

      // Conjunto de propriedades do histórico: todas do mesmo dono, ou só esta
      // quando a propriedade veio do ERP sem dono (cliente_dono_id nulo).
      let propsCliente = [prop].filter(Boolean)
      let nome = prop?.razao_social || prop?.nome || 'Cliente'
      if (prop?.cliente_dono_id) {
        propsCliente = await getByIndex('propriedades', 'cliente_dono_id', prop.cliente_dono_id)
        const dono = await getRecord('clientes', prop.cliente_dono_id)
        nome = dono?.nome || nome
      }
      setTitulo(nome)
      setNFazendas(propsCliente.length)

      const ids = new Set(propsCliente.map((p) => p.id))
      const todas = await getAllRecords('visitas')
      const doCliente = todas
        .filter((v) => ids.has(v.propriedade_id))
        .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))
      setVisitas(doCliente)
    } catch (err) {
      console.error('[VisitasCliente]', err)
    }
    setLoading(false)
  }

  const visitasFiltradas = useMemo(
    () => visitas.filter((v) => dentroDoPeriodo(v.data_visita, periodo)),
    [visitas, periodo]
  )

  return (
    <PullToRefresh onRefresh={carregar}>
    <div>
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold truncate">{titulo || 'Histórico'}</h2>
          <p className="text-xs text-slate-500">
            {visitasFiltradas.length} {visitasFiltradas.length === 1 ? 'visita' : 'visitas'}
            {periodo !== 'tudo' && ` de ${visitas.length}`}
            {nFazendas > 1 && ` · ${nFazendas} fazendas`}
          </p>
        </div>
        <Link to="/clientes" className="text-sm text-blue-700 active:text-blue-900 shrink-0">
          ← Clientes
        </Link>
      </div>

      {/* Filtro de período */}
      <div className="mb-3">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {PERIODOS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visitasFiltradas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">📍</p>
          <p className="text-slate-400">
            {visitas.length === 0 ? 'Nenhuma visita registrada para este cliente' : 'Nenhuma visita neste período'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visitasFiltradas.map((v, i) => (
            <VisitaCard key={v.id} visita={v} index={i} />
          ))}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
