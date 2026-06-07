import { useState, useEffect, useMemo } from 'react'
import {
  getVendedores, getCidadesContagem, getVendedorCidades,
  addVendedorCidade, removeVendedorCidade,
} from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome, corVendedor } from '../components/VendedorAvatar'

// Atribuição de cidades a vendedores: define quais clientes (por cidade) cada
// vendedor enxerga/baixa no app. Uma cidade pode ter vários vendedores.
export default function SupervisorCidades() {
  const [loading, setLoading] = useState(true)
  const [vendedores, setVendedores] = useState([])
  const [cidades, setCidades] = useState([]) // [{ cidade, total }]
  const [vinculos, setVinculos] = useState([]) // [{ vendedor_id, cidade }]
  const [vendedorSel, setVendedorSel] = useState(null)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [vends, cids, vincs] = await Promise.all([
        getVendedores(), getCidadesContagem(), getVendedorCidades(),
      ])
      setVendedores(vends)
      setCidades(cids)
      setVinculos(vincs)
      setVendedorSel((cur) => cur ?? (vends[0]?.id ?? null))
    } catch (err) {
      console.error('[SupervisorCidades]', err)
    }
    setLoading(false)
  }

  // cidade -> Set(vendedor_id)
  const vendedoresPorCidade = useMemo(() => {
    const m = new Map()
    for (const v of vinculos) {
      if (!m.has(v.cidade)) m.set(v.cidade, new Set())
      m.get(v.cidade).add(v.vendedor_id)
    }
    return m
  }, [vinculos])

  const atribuidasDoSel = useMemo(() => {
    const s = new Set()
    for (const v of vinculos) if (v.vendedor_id === vendedorSel) s.add(v.cidade)
    return s
  }, [vinculos, vendedorSel])

  const cidadesFiltradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return cidades
    return cidades.filter((c) => c.cidade.toLowerCase().includes(t))
  }, [cidades, busca])

  const resumoSel = useMemo(() => {
    let clientes = 0
    for (const c of cidades) if (atribuidasDoSel.has(c.cidade)) clientes += c.total
    return { cidades: atribuidasDoSel.size, clientes }
  }, [cidades, atribuidasDoSel])

  const vendById = useMemo(
    () => Object.fromEntries(vendedores.map((v) => [v.id, v])),
    [vendedores]
  )

  async function toggle(cidade) {
    if (!vendedorSel || salvando) return
    const jaTem = atribuidasDoSel.has(cidade)
    // Otimista
    setVinculos((prev) => jaTem
      ? prev.filter((v) => !(v.vendedor_id === vendedorSel && v.cidade === cidade))
      : [...prev, { vendedor_id: vendedorSel, cidade }])
    try {
      if (jaTem) await removeVendedorCidade(vendedorSel, cidade)
      else await addVendedorCidade(vendedorSel, cidade)
    } catch (err) {
      alert('Não foi possível salvar: ' + err.message)
      carregar() // reverte pro estado real
    }
  }

  async function aplicarLote(marcar) {
    if (!vendedorSel || salvando) return
    const alvo = cidadesFiltradas.filter((c) => atribuidasDoSel.has(c.cidade) !== marcar)
    if (alvo.length === 0) return
    if (!confirm(`${marcar ? 'Atribuir' : 'Remover'} ${alvo.length} cidade(s) ${marcar ? 'a' : 'de'} ${primeiroNome(vendById[vendedorSel]?.nome)}?`)) return
    setSalvando(true)
    try {
      for (const c of alvo) {
        if (marcar) await addVendedorCidade(vendedorSel, c.cidade)
        else await removeVendedorCidade(vendedorSel, c.cidade)
      }
      await carregar()
    } catch (err) {
      alert('Erro ao aplicar em lote: ' + err.message)
      await carregar()
    }
    setSalvando(false)
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-bold mb-1">Cidades por vendedor</h2>
      <p className="text-sm text-slate-500 mb-4">
        Escolha um vendedor e marque as cidades cujos clientes ele pode visualizar no app.
        Uma cidade pode ser atendida por mais de um vendedor.
      </p>

      {/* Seletor de vendedor */}
      <div className="flex flex-wrap gap-2 mb-4">
        {vendedores.map((v) => {
          const ativo = v.id === vendedorSel
          return (
            <button
              key={v.id}
              onClick={() => setVendedorSel(v.id)}
              className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border text-sm transition-colors ${
                ativo ? 'bg-white border-slate-400 font-bold shadow-sm' : 'bg-slate-100 border-transparent text-slate-600'
              }`}
            >
              <VendedorAvatar id={v.id} nome={v.nome} size={26} />
              {primeiroNome(v.nome)}
            </button>
          )
        })}
      </div>

      {/* Resumo do vendedor selecionado */}
      {vendedorSel && (
        <div
          className="rounded-xl p-3 mb-3 text-white"
          style={{ background: corVendedor(vendedorSel) }}
        >
          <p className="text-sm font-medium">{vendById[vendedorSel]?.nome}</p>
          <p className="text-xs opacity-90">
            {resumoSel.cidades} cidade(s) · {resumoSel.clientes} cliente(s) atribuído(s)
          </p>
        </div>
      )}

      {/* Busca + ações em lote */}
      <div className="flex gap-2 mb-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cidade..."
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <div className="flex gap-2 mb-3 text-xs">
        <button
          onClick={() => aplicarLote(true)}
          disabled={salvando}
          className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium disabled:opacity-50"
        >
          Marcar todas {busca && '(filtradas)'}
        </button>
        <button
          onClick={() => aplicarLote(false)}
          disabled={salvando}
          className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 font-medium disabled:opacity-50"
        >
          Desmarcar todas {busca && '(filtradas)'}
        </button>
        {salvando && <span className="text-slate-400 self-center">salvando...</span>}
      </div>

      {/* Lista de cidades */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {cidadesFiltradas.length === 0 && (
          <p className="p-4 text-sm text-slate-400">Nenhuma cidade encontrada.</p>
        )}
        {cidadesFiltradas.map((c) => {
          const marcada = atribuidasDoSel.has(c.cidade)
          const outros = [...(vendedoresPorCidade.get(c.cidade) || [])].filter((id) => id !== vendedorSel)
          return (
            <label
              key={c.cidade}
              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer active:bg-slate-50 ${marcada ? 'bg-blue-50/40' : ''}`}
            >
              <input
                type="checkbox"
                checked={marcada}
                onChange={() => toggle(c.cidade)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="flex-1 text-sm">{c.cidade}</span>
              {outros.length > 0 && (
                <span className="flex -space-x-1.5" title="Também atribuída a outros vendedores">
                  {outros.slice(0, 4).map((id) => (
                    <VendedorAvatar key={id} id={id} nome={vendById[id]?.nome} size={20} />
                  ))}
                </span>
              )}
              <span className="text-xs text-slate-400 w-16 text-right">{c.total} cli.</span>
            </label>
          )
        })}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        Após alterar, os vendedores recebem as novas propriedades na próxima sincronização.
        Para forçar agora, use “Forçar re-sync” na aba Configurações.
      </p>
    </div>
  )
}
