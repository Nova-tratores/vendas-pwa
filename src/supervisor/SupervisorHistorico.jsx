import { useState, useEffect, useMemo } from 'react'
import { getVendedores, getVisitas, getNegocios } from '../lib/supabaseQueries'
import { distanciaKm } from '../lib/sugestao'

// ============================================
// Histórico diário por vendedor
// Visitas, km rodado (estimado pelo GPS das visitas)
// e negócios criados, dia a dia.
// ============================================

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 15, label: '15 dias' },
  { dias: 30, label: '30 dias' },
]

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** Chave local YYYY-MM-DD de um ISO (ordena cronologicamente). */
function chaveDia(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function labelDia(key) {
  const d = new Date(`${key}T12:00:00`)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} · ${DIAS_SEMANA[d.getDay()]}`
}

/**
 * Km estimado do dia: soma das distâncias em linha reta entre visitas
 * consecutivas que têm GPS (ordenadas pela hora). É uma estimativa por
 * baixo — não considera o trajeto real nem o deslocamento casa↔primeira
 * visita.
 */
function kmDoDia(visitas) {
  const comGps = visitas
    .filter((v) => v.latitude && v.longitude)
    .sort((a, b) => new Date(a.data_visita) - new Date(b.data_visita))
  let km = 0
  for (let i = 1; i < comGps.length; i++) {
    const d = distanciaKm(
      comGps[i - 1].latitude, comGps[i - 1].longitude,
      comGps[i].latitude, comGps[i].longitude
    )
    if (Number.isFinite(d)) km += d
  }
  return km
}

function fmtKm(km) {
  if (!km) return '—'
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

export default function SupervisorHistorico() {
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState([])
  const [visitas, setVisitas] = useState([])
  const [negocios, setNegocios] = useState([])
  const [dias, setDias] = useState(7)
  const [vendedorSel, setVendedorSel] = useState('todos')

  useEffect(() => { carregar(dias) }, [dias])

  async function carregar(nDias) {
    setLoading(true)
    try {
      const inicio = new Date()
      inicio.setDate(inicio.getDate() - (nDias - 1))
      inicio.setHours(0, 0, 0, 0)
      const dateFrom = inicio.toISOString()
      const [vends, vis, neg] = await Promise.all([
        getVendedores(),
        getVisitas({ dateFrom }),
        getNegocios({}),
      ])
      setVendedores(vends.sort((a, b) => a.nome.localeCompare(b.nome)))
      setVisitas(vis)
      setNegocios(neg.filter((n) => n.created_at >= dateFrom))
    } catch (e) {
      console.error('[Historico]', e)
    }
    setLoading(false)
  }

  // dia -> vendedor_id -> { visitas: [], negocios: n }
  const porDia = useMemo(() => {
    const mapa = new Map()
    const garantir = (dia, vendId) => {
      if (!mapa.has(dia)) mapa.set(dia, new Map())
      const doDia = mapa.get(dia)
      if (!doDia.has(vendId)) doDia.set(vendId, { visitas: [], negocios: 0 })
      return doDia.get(vendId)
    }
    for (const v of visitas) {
      if (!v.data_visita || !v.vendedor_id) continue
      garantir(chaveDia(v.data_visita), v.vendedor_id).visitas.push(v)
    }
    for (const n of negocios) {
      if (!n.created_at || !n.vendedor_id) continue
      garantir(chaveDia(n.created_at), n.vendedor_id).negocios += 1
    }
    return mapa
  }, [visitas, negocios])

  const nomePorId = useMemo(
    () => new Map(vendedores.map((v) => [v.id, v.nome])),
    [vendedores]
  )

  // Linhas prontas pra renderizar: dias desc, dentro de cada dia uma linha
  // por vendedor (respeitando o filtro) + km calculado.
  const diasRender = useMemo(() => {
    const out = []
    const chaves = [...porDia.keys()].sort().reverse()
    for (const dia of chaves) {
      const linhas = []
      for (const [vendId, dados] of porDia.get(dia)) {
        if (vendedorSel !== 'todos' && vendId !== vendedorSel) continue
        linhas.push({
          vendId,
          nome: nomePorId.get(vendId) || dados.visitas[0]?.vendedor_nome || 'Sem nome',
          qtdVisitas: dados.visitas.length,
          km: kmDoDia(dados.visitas),
          qtdNegocios: dados.negocios,
        })
      }
      if (!linhas.length) continue
      linhas.sort((a, b) => b.qtdVisitas - a.qtdVisitas || a.nome.localeCompare(b.nome))
      out.push({
        dia,
        linhas,
        total: {
          qtdVisitas: linhas.reduce((s, l) => s + l.qtdVisitas, 0),
          km: linhas.reduce((s, l) => s + l.km, 0),
          qtdNegocios: linhas.reduce((s, l) => s + l.qtdNegocios, 0),
        },
      })
    }
    return out
  }, [porDia, vendedorSel, nomePorId])

  const totalPeriodo = useMemo(() => ({
    qtdVisitas: diasRender.reduce((s, d) => s + d.total.qtdVisitas, 0),
    km: diasRender.reduce((s, d) => s + d.total.km, 0),
    qtdNegocios: diasRender.reduce((s, d) => s + d.total.qtdNegocios, 0),
  }), [diasRender])

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Histórico diário</h2>
        <p className="text-sm text-slate-500">
          Visitas, km rodado e negócios criados por vendedor, dia a dia.
        </p>
      </div>

      {/* Período */}
      <div className="flex items-center gap-1 mb-3">
        {PERIODOS.map((p) => (
          <button
            key={p.dias}
            onClick={() => setDias(p.dias)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              dias === p.dias ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Filtro por vendedor */}
      <div className="flex gap-1 mb-4 flex-wrap">
        <button
          onClick={() => setVendedorSel('todos')}
          className={`px-3 py-1 rounded-full text-xs border ${
            vendedorSel === 'todos'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-600 border-slate-300'
          }`}
        >
          Todos
        </button>
        {vendedores.map((v) => (
          <button
            key={v.id}
            onClick={() => setVendedorSel(v.id)}
            className={`px-3 py-1 rounded-full text-xs border ${
              vendedorSel === v.id
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-600 border-slate-300'
            }`}
          >
            {v.nome}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-10">Carregando...</p>
      ) : diasRender.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-10">
          Nenhuma atividade no período.
        </p>
      ) : (
        <>
          {/* Resumo do período */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-xl shadow px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-slate-800">{totalPeriodo.qtdVisitas}</p>
              <p className="text-[11px] text-slate-500">visitas</p>
            </div>
            <div className="bg-white rounded-xl shadow px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-slate-800">{fmtKm(totalPeriodo.km)}</p>
              <p className="text-[11px] text-slate-500">km estimado</p>
            </div>
            <div className="bg-white rounded-xl shadow px-3 py-2.5 text-center">
              <p className="text-lg font-bold text-slate-800">{totalPeriodo.qtdNegocios}</p>
              <p className="text-[11px] text-slate-500">negócios</p>
            </div>
          </div>

          <div className="space-y-3">
            {diasRender.map((d) => (
              <div key={d.dia} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="font-semibold text-slate-800 capitalize">{labelDia(d.dia)}</span>
                  <span className="text-xs text-slate-400">
                    {d.total.qtdVisitas} visita{d.total.qtdVisitas !== 1 ? 's' : ''}
                    {' · '}{fmtKm(d.total.km)}
                    {' · '}{d.total.qtdNegocios} negócio{d.total.qtdNegocios !== 1 ? 's' : ''}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-slate-400 uppercase">
                      <th className="text-left px-4 py-1.5 font-medium">Vendedor</th>
                      <th className="text-right px-3 py-1.5 font-medium">Visitas</th>
                      <th className="text-right px-3 py-1.5 font-medium">Km</th>
                      <th className="text-right px-4 py-1.5 font-medium">Negócios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {d.linhas.map((l) => (
                      <tr key={l.vendId}>
                        <td className="px-4 py-2 font-medium text-slate-700">{l.nome}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{l.qtdVisitas || '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmtKm(l.km)}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{l.qtdNegocios || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center">
            Km é estimado pela distância em linha reta entre as visitas com GPS do dia
            — o trajeto real tende a ser maior. Negócios contam pela data de criação.
          </p>
        </>
      )}
    </div>
  )
}
