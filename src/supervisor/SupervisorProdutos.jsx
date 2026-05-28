import { useState, useEffect } from 'react'
import { getProdutosAdmin, salvarOverride, formatBRL, clearEstoqueCache } from '../lib/catalogoSupabase'

export default function SupervisorProdutos() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState(null) // codigo_produto sendo editado
  const [form, setForm] = useState({ preco_override: '', estoque_override: '', visivel: true, notas: '' })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const data = await getProdutosAdmin()
      setProdutos(data)
    } catch (err) {
      console.error('[SupervisorProdutos]', err)
      alert('Erro ao carregar produtos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function abrirEdicao(p) {
    setEditando(p.codigo_produto)
    setForm({
      preco_override: p.override?.preco_override ?? '',
      estoque_override: p.override?.estoque_override ?? '',
      visivel: p.override?.visivel !== false,
      notas: p.override?.notas ?? '',
    })
  }

  async function salvar(codigoProduto) {
    setSalvando(true)
    try {
      const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
      const payload = {
        preco_override: form.preco_override === '' ? null : Number(form.preco_override),
        estoque_override: form.estoque_override === '' ? null : Number(form.estoque_override),
        visivel: !!form.visivel,
        notas: form.notas || null,
      }
      await salvarOverride(codigoProduto, payload, supervisor.id)
      clearEstoqueCache()
      setEditando(null)
      await carregar()
    } catch (err) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  const filtrados = produtos.filter((p) => {
    if (!busca) return true
    const q = busca.toLowerCase()
    return (
      (p.descricao || '').toLowerCase().includes(q) ||
      (p.modelo || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q) ||
      (p.codigo || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-xl font-bold">Produtos (admin)</h2>
        <p className="text-sm text-slate-500">
          Ajuste preço/estoque manual e visibilidade. {produtos.length} itens em estoque (pátio).
        </p>
      </div>

      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por modelo, marca, descrição ou código..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 bg-white"
      />

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-8">Carregando produtos...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Nenhum produto encontrado.</p>
      ) : (
        <div className="space-y-2">
          {filtrados.map((p) => (
            <ProdutoRow
              key={p.codigo_produto}
              produto={p}
              editando={editando === p.codigo_produto}
              form={form}
              setForm={setForm}
              salvando={salvando}
              onEditar={() => abrirEdicao(p)}
              onCancelar={() => setEditando(null)}
              onSalvar={() => salvar(p.codigo_produto)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProdutoRow({ produto, editando, form, setForm, salvando, onEditar, onCancelar, onSalvar }) {
  const p = produto
  const omie_preco = Number(p.valor_unitario) || 0
  const omie_estoque = Number(p.estoque) || 0
  const has_override = !!p.override

  return (
    <div className={`bg-white rounded-xl shadow p-3 ${editando ? 'ring-2 ring-blue-300' : ''}`}>
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-slate-100 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
          {p.imagem_url ? (
            <img src={p.imagem_url} alt="" className="w-full h-full object-contain" loading="lazy" />
          ) : (
            <span className="text-2xl">📷</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{p.modelo || (p.descricao || '').slice(0, 50)}</p>
          <p className="text-xs text-slate-500 truncate">{p.marca || '—'} · {p.familia_nome}</p>
          <p className="text-[10px] text-slate-400 truncate">{p.codigo}</p>
          <div className="flex gap-3 mt-1 text-[11px]">
            <span className="text-slate-600">Omie: <b>{omie_estoque}</b> un</span>
            <span className="text-slate-600">{omie_preco > 0 ? formatBRL(omie_preco) : 'sem preço'}</span>
            {has_override && <span className="text-purple-600 font-medium">· override</span>}
            {p.override?.visivel === false && <span className="text-red-600">· oculto</span>}
          </div>
        </div>
        {!editando && (
          <button onClick={onEditar} className="text-xs px-3 py-1 bg-blue-50 text-blue-700 rounded font-medium self-start">
            Editar
          </button>
        )}
      </div>

      {editando && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Preço override (R$)</label>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.preco_override}
              onChange={(e) => setForm({ ...form, preco_override: e.target.value })}
              placeholder={omie_preco > 0 ? String(omie_preco) : 'sem'}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Estoque override (un)</label>
            <input
              type="number"
              value={form.estoque_override}
              onChange={(e) => setForm({ ...form, estoque_override: e.target.value })}
              placeholder={String(omie_estoque)}
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Ex: Negociado por Henri em 28/05"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div className="col-span-2 flex items-center justify-between gap-2 mt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.visivel}
                onChange={(e) => setForm({ ...form, visivel: e.target.checked })}
              />
              Visível no catálogo
            </label>
            <div className="flex gap-2">
              <button
                onClick={onCancelar}
                disabled={salvando}
                className="text-sm px-3 py-1.5 bg-slate-100 text-slate-600 rounded font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={onSalvar}
                disabled={salvando}
                className="text-sm px-3 py-1.5 bg-blue-700 text-white rounded font-medium disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
