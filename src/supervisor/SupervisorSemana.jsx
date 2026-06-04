import { useState, useEffect, useMemo } from 'react'
import { getVisitas, getVendedores } from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome, corVendedor } from '../components/VendedorAvatar'
import DetalheModal from './DetalheModal'

// Segunda-feira (00:00) da semana de uma data.
function segunda(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const dia = d.getDay() // 0 dom .. 6 sáb
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia))
  return d
}
function addDias(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function fimDoDia(date) { const d = new Date(date); d.setHours(23, 59, 59, 999); return d }
const fmtDM = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
const NOME_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const NOME_MES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function SupervisorSemana() {
  const [loading, setLoading] = useState(true)
  const [visitas, setVisitas] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [modo, setModo] = useState('semana') // 'semana' | 'mes'
  const [offset, setOffset] = useState(0)     // semanas ou meses a partir de hoje
  const [hoje] = useState(() => new Date())
  const [detalhe, setDetalhe] = useState(null) // { titulo, itens }

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [vis, vend] = await Promise.all([getVisitas({}), getVendedores()])
        setVisitas(vis)
        setVendedores(vend)
      } catch (e) { console.error('[SupervisorSemana]', e) }
      setLoading(false)
    })()
  }, [])

  // Colunas (períodos) conforme o modo + rótulo do cabeçalho.
  const { colunas, rotulo } = useMemo(() => {
    if (modo === 'semana') {
      const base = addDias(segunda(hoje), offset * 7)
      const cols = NOME_DIA.map((nome, i) => {
        const ini = addDias(base, i)
        return { nome, sub: fmtDM(ini), ini, fim: fimDoDia(ini) }
      })
      return { colunas: cols, rotulo: `Semana de ${fmtDM(base)} a ${fmtDM(addDias(base, 5))}` }
    }
    // mês: semanas (seg–dom) que tocam o mês de referência
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1)
    const ultimoDia = new Date(ref.getFullYear(), ref.getMonth() + 1, 0)
    const cols = []
    let wk = segunda(ref)
    let n = 1
    while (wk <= ultimoDia) {
      cols.push({ nome: `S${n}`, sub: `${fmtDM(wk)}–${fmtDM(addDias(wk, 6))}`, ini: new Date(wk), fim: fimDoDia(addDias(wk, 6)) })
      wk = addDias(wk, 7); n++
    }
    return { colunas: cols, rotulo: `${NOME_MES[ref.getMonth()]} de ${ref.getFullYear()}` }
  }, [modo, offset, hoje])

  // Matriz vendedor x coluna -> lista de visitas que compõem a célula.
  const matriz = useMemo(() => {
    const porVend = {}
    for (const v of vendedores) {
      porVend[v.id] = colunas.map((c) => {
        const ini = c.ini.getTime(); const fim = c.fim.getTime()
        return visitas.filter((vis) => {
          if (vis.vendedor_id !== v.id) return false
          const t = new Date(vis.data_visita).getTime()
          return t >= ini && t <= fim
        })
      })
    }
    return porVend
  }, [vendedores, colunas, visitas])

  function abrir(vend, col, lista) {
    if (!lista.length) return
    setDetalhe({
      titulo: `${primeiroNome(vend.nome)} · ${col.nome} ${col.sub}`,
      itens: [...lista].sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita)),
    })
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
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h2 className="text-xl font-bold">Calendário de visitas</h2>
        <div className="flex rounded-lg overflow-hidden border border-slate-300">
          {['semana', 'mes'].map((m) => (
            <button
              key={m}
              onClick={() => { setModo(m); setOffset(0) }}
              className={`px-3 py-1.5 text-sm font-medium ${modo === m ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
            >
              {m === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setOffset((o) => o - 1)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm active:bg-slate-100">←</button>
        <p className="text-sm font-medium text-slate-700">{rotulo}</p>
        <button onClick={() => setOffset((o) => o + 1)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-sm active:bg-slate-100">→</button>
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left px-3 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10">Vendedor</th>
              {colunas.map((c) => (
                <th key={c.nome} className="px-2 py-2 text-center font-semibold text-slate-600 whitespace-nowrap">
                  <div>{c.nome}</div>
                  <div className="text-[10px] font-normal text-slate-400">{c.sub}</div>
                </th>
              ))}
              <th className="px-2 py-2 text-center font-semibold text-slate-500">Total</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((vend) => {
              const cells = matriz[vend.id] || []
              const total = cells.reduce((acc, l) => acc + l.length, 0)
              return (
                <tr key={vend.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-2">
                      <VendedorAvatar id={vend.id} nome={vend.nome} size={26} />
                      <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{primeiroNome(vend.nome)}</span>
                    </div>
                  </td>
                  {cells.map((lista, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      {lista.length > 0 ? (
                        <button
                          onClick={() => abrir(vend, colunas[i], lista)}
                          className="min-w-[28px] h-7 px-2 rounded-full text-white text-xs font-bold active:opacity-80"
                          style={{ background: corVendedor(vend.id) }}
                          title={`${lista.length} visita(s) — ver detalhes`}
                        >
                          {lista.length}
                        </button>
                      ) : (
                        <span className="text-slate-300">·</span>
                      )}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold text-slate-700">{total || ''}</td>
                </tr>
              )
            })}
            {vendedores.length === 0 && (
              <tr><td colSpan={colunas.length + 2} className="text-center text-slate-400 py-8">Nenhum vendedor</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-3 py-2 font-semibold text-slate-500 sticky left-0 bg-slate-50 z-10">Total/dia</td>
              {colunas.map((c, i) => {
                const totalCol = vendedores.reduce((acc, vend) => acc + (matriz[vend.id]?.[i]?.length || 0), 0)
                return <td key={c.nome} className="px-2 py-2 text-center font-bold text-slate-600">{totalCol || ''}</td>
              })}
              <td className="px-2 py-2 text-center font-bold text-slate-800">
                {vendedores.reduce((acc, vend) => acc + (matriz[vend.id]?.reduce((a, l) => a + l.length, 0) || 0), 0) || ''}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 mt-2">Toque em um número para ver as visitas que compõem aquele dia/semana.</p>

      <DetalheModal
        show={!!detalhe}
        titulo={detalhe?.titulo || ''}
        tipo="visitas"
        itens={detalhe?.itens || []}
        onClose={() => setDetalhe(null)}
      />
    </div>
  )
}
