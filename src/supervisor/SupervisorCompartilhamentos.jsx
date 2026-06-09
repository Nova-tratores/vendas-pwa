import { useState, useEffect, useMemo } from 'react'
import { getCompartilhamentos } from '../lib/catalogoSupabase'

function formatTelefone(digits) {
  const d = (digits || '').replace(/\D/g, '')
  if (!d) return '—'
  const n = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return d
}

const CANAL_LABEL = {
  whatsapp_wame: 'WhatsApp (link)',
  whatsapp_share: 'WhatsApp (anexo)',
}

export default function SupervisorCompartilhamentos() {
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroVendedor, setFiltroVendedor] = useState('todos')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      setRegistros(await getCompartilhamentos({ limit: 1000 }))
    } catch (err) {
      console.error('[SupervisorCompartilhamentos]', err)
    }
    setLoading(false)
  }

  const vendedores = useMemo(() => {
    const m = new Map()
    for (const r of registros) {
      const nome = r.vendedor_nome || 'Sem nome'
      m.set(nome, (m.get(nome) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [registros])

  const produtos = useMemo(() => {
    const m = new Map()
    for (const r of registros) {
      const titulo = r.produto_titulo || `#${r.codigo_produto || r.catalogo_produto_id || '?'}`
      m.set(titulo, (m.get(titulo) || 0) + 1)
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)
  }, [registros])

  const filtrados = useMemo(() => {
    if (filtroVendedor === 'todos') return registros
    return registros.filter((r) => (r.vendedor_nome || 'Sem nome') === filtroVendedor)
  }, [registros, filtroVendedor])

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
          <h2 className="text-xl font-bold">Compartilhamentos</h2>
          <p className="text-sm text-slate-500">
            {registros.length} envio(s) de produtos pelo WhatsApp
          </p>
        </div>
        <button
          onClick={carregar}
          className="text-xs px-3 py-1.5 bg-slate-100 text-slate-700 rounded font-medium active:bg-slate-200"
        >
          Atualizar
        </button>
      </div>

      {registros.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          Nenhum compartilhamento registrado ainda.
        </p>
      ) : (
        <>
          {/* Resumo por vendedor e por produto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Por vendedor</h3>
              <div className="space-y-1">
                {vendedores.map(([nome, n]) => (
                  <div key={nome} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{nome}</span>
                    <span className="font-bold text-slate-900 ml-2">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Produtos mais enviados</h3>
              <div className="space-y-1">
                {produtos.map(([titulo, n]) => (
                  <div key={titulo} className="flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{titulo}</span>
                    <span className="font-bold text-slate-900 ml-2">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filtro por vendedor */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            <button
              onClick={() => setFiltroVendedor('todos')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
                filtroVendedor === 'todos' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'
              }`}
            >
              Todos
            </button>
            {vendedores.map(([nome]) => (
              <button
                key={nome}
                onClick={() => setFiltroVendedor(nome)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
                  filtroVendedor === nome ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {nome}
              </button>
            ))}
          </div>

          {/* Lista detalhada */}
          <div className="space-y-2">
            {filtrados.map((r) => {
              const d = new Date(r.created_at)
              return (
                <div key={r.id} className="bg-white rounded-xl shadow p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {r.produto_titulo || `#${r.codigo_produto || r.catalogo_produto_id || '?'}`}
                    </p>
                    <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                      {d.toLocaleDateString('pt-BR')} {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="text-xs text-slate-500 truncate">{r.vendedor_nome || 'Sem nome'}</span>
                    <span className="text-xs text-green-700 font-medium whitespace-nowrap shrink-0">
                      📱 {formatTelefone(r.telefone)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {CANAL_LABEL[r.canal] || r.canal}
                    </span>
                    {(r.itens || []).map((it) => (
                      <span key={it} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
