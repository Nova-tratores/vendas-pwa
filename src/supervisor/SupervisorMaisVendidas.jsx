import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getMaquinasMaisVendidas } from '../lib/catalogoSupabase'

function formatBRL(v) {
  const n = Number(v) || 0
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')}M`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)}k`
  return `R$ ${n.toFixed(0)}`
}

export default function SupervisorMaisVendidas() {
  const [linhas, setLinhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroFamilia, setFiltroFamilia] = useState('todas')
  const [soFaltantes, setSoFaltantes] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      setLinhas(await getMaquinasMaisVendidas())
    } catch (err) {
      console.error('[SupervisorMaisVendidas]', err)
    }
    setLoading(false)
  }

  const familias = useMemo(() => {
    const m = new Map()
    for (const r of linhas) {
      const f = r.familia || 'Outros'
      m.set(f, (m.get(f) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [linhas])

  const resumo = useMemo(() => {
    const total = linhas.length
    const noCatalogo = linhas.filter((r) => r.em_catalogo).length
    const valor = linhas.reduce((s, r) => s + (Number(r.valor_total) || 0), 0)
    return { total, noCatalogo, faltantes: total - noCatalogo, valor }
  }, [linhas])

  const filtradas = useMemo(() => {
    return linhas.filter((r) => {
      if (filtroFamilia !== 'todas' && (r.familia || 'Outros') !== filtroFamilia) return false
      if (soFaltantes && r.em_catalogo) return false
      return true
    })
  }, [linhas, filtroFamilia, soFaltantes])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold">Máquinas mais vendidas</h2>
          <p className="text-sm text-slate-500">
            Ranking por vendas reais do Omie (histórico completo, sem peças). Use para
            priorizar o que falta no catálogo.
          </p>
        </div>
        <button
          onClick={carregar}
          className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded font-medium active:bg-slate-200 shrink-0"
        >
          Atualizar
        </button>
      </div>

      {linhas.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          Nenhuma venda encontrada.
        </p>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Modelos</p>
              <p className="text-2xl font-bold text-slate-900">{resumo.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">No catálogo</p>
              <p className="text-2xl font-bold text-green-700">{resumo.noCatalogo}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Faltam</p>
              <p className="text-2xl font-bold text-amber-600">{resumo.faltantes}</p>
            </div>
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs uppercase tracking-wider text-slate-500">Faturamento</p>
              <p className="text-2xl font-bold text-slate-900">{formatBRL(resumo.valor)}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            <button
              onClick={() => setFiltroFamilia('todas')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
                filtroFamilia === 'todas' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Todas as famílias
            </button>
            {familias.map(([f, n]) => (
              <button
                key={f}
                onClick={() => setFiltroFamilia(f)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
                  filtroFamilia === f ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {f} ({n})
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={soFaltantes}
              onChange={(e) => setSoFaltantes(e.target.checked)}
              className="w-4 h-4"
            />
            Mostrar só o que falta no catálogo
          </label>

          {/* Ranking */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Máquina</th>
                  <th className="px-3 py-2 text-right">Qtd</th>
                  <th className="px-3 py-2 text-right hidden sm:table-cell">Faturamento</th>
                  <th className="px-3 py-2 text-center">Catálogo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtradas.map((r, i) => (
                  <tr
                    key={`${r.marca}|${r.item}|${r.familia}`}
                    className={r.em_catalogo ? '' : 'bg-amber-50'}
                  >
                    <td className="px-3 py-2 text-slate-400 tabular-nums">{i + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-slate-900">
                        {[r.marca, r.item].filter(Boolean).join(' ') || '—'}
                      </p>
                      <p className="text-xs text-slate-400">{r.familia}</p>
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{Number(r.qtd) || 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600 hidden sm:table-cell">
                      {formatBRL(r.valor_total)}
                    </td>
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      {r.em_catalogo ? (
                        <span className="text-xs text-green-700 font-medium">✅ No catálogo</span>
                      ) : (
                        <Link
                          to="/supervisor/catalogo-admin"
                          state={{ novoProduto: { marca: r.marca, modelo: r.item, familia: r.familia } }}
                          className="text-xs text-amber-700 font-medium hover:underline"
                        >
                          ❌ Adicionar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtradas.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8">
                Nada com esse filtro.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
