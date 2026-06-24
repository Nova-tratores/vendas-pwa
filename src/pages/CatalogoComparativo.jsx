import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { getProdutosCatalogo, CATEGORIAS } from '../lib/catalogoSupabase'

const MAX_SEL = 4

// Chave única de uma spec dentro do comparativo.
const chave = (grupo, label) => `${grupo || ''}||${label || ''}`

function temFichaDetalhada(p) {
  return Array.isArray(p.especificacoes_detalhadas) && p.especificacoes_detalhadas.length > 0
}

// Mapa "grupo||label" -> valor de um produto.
function valoresDe(p) {
  const m = {}
  for (const g of p.especificacoes_detalhadas || []) {
    for (const it of g.itens || []) {
      if (it && it.label) m[chave(g.grupo, it.label)] = it.valor || ''
    }
  }
  return m
}

// Monta a ordem de grupos e os rótulos de cada grupo (união dos selecionados,
// preservando a ordem do 1º produto e anexando o que faltar dos demais).
function montarEstrutura(selecionados) {
  const ordemGrupos = []
  const labelsPorGrupo = {}
  const grupoVisto = new Set()
  const labelVisto = new Set()
  for (const p of selecionados) {
    for (const g of p.especificacoes_detalhadas || []) {
      const grupo = g.grupo || ''
      if (!grupoVisto.has(grupo)) { grupoVisto.add(grupo); ordemGrupos.push(grupo); labelsPorGrupo[grupo] = [] }
      for (const it of g.itens || []) {
        if (!it || !it.label) continue
        const k = chave(grupo, it.label)
        if (!labelVisto.has(k)) { labelVisto.add(k); labelsPorGrupo[grupo].push(it.label) }
      }
    }
  }
  return { ordemGrupos, labelsPorGrupo }
}

export default function CatalogoComparativo() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoria, setCategoria] = useState('tratores')
  const [selIds, setSelIds] = useState([])

  useEffect(() => {
    let alive = true
    getProdutosCatalogo().then((p) => {
      if (!alive) return
      setProdutos((p || []).filter(temFichaDetalhada))
      setLoading(false)
    })
    return () => { alive = false }
  }, [])

  // Categorias que têm pelo menos um produto comparável.
  const categoriasPresentes = useMemo(() => {
    const set = new Set(produtos.map((p) => p.categoria).filter(Boolean))
    return CATEGORIAS.filter((c) => set.has(c.key))
  }, [produtos])

  // Garante uma categoria válida selecionada.
  useEffect(() => {
    if (categoriasPresentes.length && !categoriasPresentes.some((c) => c.key === categoria)) {
      setCategoria(categoriasPresentes[0].key)
    }
  }, [categoriasPresentes, categoria])

  const comparaveis = useMemo(
    () => produtos.filter((p) => p.categoria === categoria),
    [produtos, categoria]
  )

  const selecionados = useMemo(
    () => selIds.map((id) => comparaveis.find((p) => p.id === id)).filter(Boolean),
    [selIds, comparaveis]
  )

  const { ordemGrupos, labelsPorGrupo } = useMemo(
    () => montarEstrutura(selecionados),
    [selecionados]
  )

  const valoresPorProduto = useMemo(
    () => selecionados.map(valoresDe),
    [selecionados]
  )

  function toggle(id) {
    setSelIds((sel) => {
      if (sel.includes(id)) return sel.filter((x) => x !== id)
      if (sel.length >= MAX_SEL) return sel // trava no máximo
      return [...sel, id]
    })
  }

  // Troca de categoria limpa a seleção (evita comparar peras com maçãs).
  function trocarCategoria(c) {
    setCategoria(c)
    setSelIds([])
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Comparar</h2>
          <p className="text-sm text-slate-500">Escolha de 2 a {MAX_SEL} máquinas</p>
        </div>
        <Link to="../catalogo" className="shrink-0 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium">
          ← Catálogo
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Carregando…</p>
      ) : produtos.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma máquina com ficha técnica detalhada ainda.</p>
      ) : (
        <>
          {/* Filtro de categoria (só aparece se houver mais de uma) */}
          {categoriasPresentes.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {categoriasPresentes.map((c) => (
                <button
                  key={c.key}
                  onClick={() => trocarCategoria(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${categoria === c.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Seleção de máquinas */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {comparaveis.map((p) => {
              const sel = selIds.includes(p.id)
              const bloqueado = !sel && selIds.length >= MAX_SEL
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  disabled={bloqueado}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${sel ? 'bg-emerald-700 text-white border-emerald-700' : bloqueado ? 'bg-slate-50 text-slate-300 border-slate-200' : 'bg-white text-slate-700 border-slate-300'}`}
                >
                  {p.marca?.nome ? `${p.marca.nome} ` : ''}{p.titulo}
                </button>
              )
            })}
          </div>

          {selecionados.length < 2 ? (
            <p className="text-sm text-slate-400">Selecione pelo menos 2 máquinas para comparar.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 px-4 pb-4">
              <table className="border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-white text-left align-bottom p-2 min-w-[130px]" />
                    {selecionados.map((p) => (
                      <th key={p.id} className="p-2 align-bottom text-left min-w-[140px] border-b-2 border-slate-200">
                        <span className="block text-[10px] uppercase tracking-wider text-slate-400">{p.marca?.nome || ''}</span>
                        <span className="block font-bold text-slate-800 leading-tight">{p.titulo}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordemGrupos.map((grupo) => (
                    <Fragment key={`g-${grupo}`}>
                      <tr>
                        <td
                          colSpan={selecionados.length + 1}
                          className="sticky left-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 py-1.5 border-y border-slate-200"
                        >
                          {grupo}
                        </td>
                      </tr>
                      {labelsPorGrupo[grupo].map((label) => (
                        <tr key={`r-${grupo}-${label}`} className="align-top">
                          <td className="sticky left-0 z-10 bg-white text-slate-500 px-2 py-1.5 border-b border-slate-100 min-w-[130px]">
                            {label}
                          </td>
                          {valoresPorProduto.map((mapa, i) => {
                            const v = mapa[chave(grupo, label)]
                            return (
                              <td key={i} className="px-2 py-1.5 border-b border-slate-100 text-slate-700">
                                {v && v !== '' ? v : <span className="text-slate-300">—</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
