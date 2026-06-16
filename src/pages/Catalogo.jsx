import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getProdutosCatalogo, getMarcas, getEstoqueAtual, formatBRL, CATEGORIAS } from '../lib/catalogoSupabase'
import PullToRefresh from '../components/PullToRefresh'

export default function Catalogo() {
  const [filtroCat, setFiltroCat] = useState('todos')
  const [filtroMarca, setFiltroMarca] = useState('todas')
  const [busca, setBusca] = useState('')
  const [produtos, setProdutos] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loadingPortfolio, setLoadingPortfolio] = useState(true)
  const [estoque, setEstoque] = useState([])
  const [loadingEstoque, setLoadingEstoque] = useState(true)
  const [aba, setAba] = useState('portfolio') // portfolio | estoque

  useEffect(() => {
    let alive = true
    Promise.all([getProdutosCatalogo(), getMarcas()]).then(([p, m]) => {
      if (!alive) return
      setProdutos(p)
      setMarcas(m)
      setLoadingPortfolio(false)
    })
    getEstoqueAtual().then((d) => {
      if (alive) {
        setEstoque(d)
        setLoadingEstoque(false)
      }
    })
    return () => { alive = false }
  }, [])

  // Só mostra chips de marca quando há mais de uma marca no catálogo
  const marcasComProduto = useMemo(() => {
    const ativos = new Set(produtos.map((p) => p.marca?.slug).filter(Boolean))
    return marcas.filter((m) => ativos.has(m.slug))
  }, [produtos, marcas])

  // Categorias presentes no catálogo (respeitando filtro de marca)
  const produtosDaMarca = useMemo(() => {
    if (filtroMarca === 'todas') return produtos
    return produtos.filter((p) => p.marca?.slug === filtroMarca)
  }, [produtos, filtroMarca])

  const portfolioFiltrado = useMemo(() => {
    let arr = produtosDaMarca
    if (filtroCat !== 'todos') arr = arr.filter((p) => p.categoria === filtroCat)
    if (busca) {
      const q = busca.toLowerCase()
      arr = arr.filter((p) =>
        p.titulo.toLowerCase().includes(q) ||
        p.subtitulo?.toLowerCase().includes(q) ||
        p.descricao?.toLowerCase().includes(q) ||
        p.marca?.nome?.toLowerCase().includes(q)
      )
    }
    return arr
  }, [produtosDaMarca, filtroCat, busca])

  const estoqueFiltrado = useMemo(() => {
    if (!busca) return estoque
    const q = busca.toLowerCase()
    return estoque.filter((p) =>
      (p.descricao || '').toLowerCase().includes(q) ||
      (p.modelo || '').toLowerCase().includes(q) ||
      (p.marca || '').toLowerCase().includes(q)
    )
  }, [estoque, busca])

  return (
    <PullToRefresh onRefresh={async () => { await getEstoqueAtual({ force: true }).then(setEstoque) }}>
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Catálogo</h2>
            <p className="text-sm text-slate-500">{produtos.length} no portfólio · {estoque.length} no estoque atual</p>
          </div>
          <Link
            to="/showroom"
            className="shrink-0 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium active:scale-[0.98] transition-transform"
          >
            ▶ Modo Showroom / TV
          </Link>
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, marca, modelo ou descrição..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {/* Abas: Portfolio (curado) | Estoque atual */}
        <div className="flex gap-1 mb-3 border-b border-slate-200">
          <TabButton ativo={aba === 'portfolio'} onClick={() => setAba('portfolio')}>
            Portfólio ({produtos.length})
          </TabButton>
          <TabButton ativo={aba === 'estoque'} onClick={() => setAba('estoque')}>
            Estoque atual ({estoque.length})
          </TabButton>
        </div>

        {aba === 'portfolio' && (
          <>
            {/* Chips de marca (só quando há mais de uma) */}
            {marcasComProduto.length > 1 && (
              <div className="flex gap-1 overflow-x-auto pb-2 mb-2">
                <Chip ativo={filtroMarca === 'todas'} onClick={() => setFiltroMarca('todas')}>
                  Todas as marcas
                </Chip>
                {marcasComProduto.map((m) => (
                  <Chip key={m.slug} ativo={filtroMarca === m.slug} onClick={() => setFiltroMarca(m.slug)}>
                    {m.nome}
                  </Chip>
                ))}
              </div>
            )}

            {/* Chips de categoria */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
              <Chip ativo={filtroCat === 'todos'} onClick={() => setFiltroCat('todos')}>
                Todos ({produtosDaMarca.length})
              </Chip>
              {CATEGORIAS.map((c) => {
                const n = produtosDaMarca.filter((p) => p.categoria === c.key).length
                if (n === 0) return null
                return (
                  <Chip key={c.key} ativo={filtroCat === c.key} onClick={() => setFiltroCat(c.key)}>
                    {c.label} ({n})
                  </Chip>
                )
              })}
            </div>

            {loadingPortfolio ? (
              <p className="text-sm text-slate-500 text-center py-8">Carregando catálogo...</p>
            ) : portfolioFiltrado.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {portfolioFiltrado.map((p, i) => (
                  <CardPortfolio key={p.id} produto={p} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'estoque' && (
          <>
            {loadingEstoque ? (
              <p className="text-sm text-slate-500 text-center py-8">Carregando estoque...</p>
            ) : estoqueFiltrado.length === 0 ? (
              <EmptyState texto="Nenhum produto em estoque" />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {estoqueFiltrado.map((p, i) => (
                  <CardEstoque key={p.codigo_produto} produto={p} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PullToRefresh>
  )
}

function TabButton({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        ativo ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
        ativo
          ? 'bg-blue-700 text-white border-blue-700'
          : 'bg-white text-slate-600 border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({ texto = 'Nenhum produto encontrado' }) {
  return (
    <div className="text-center py-12">
      <p className="text-4xl mb-3">🔍</p>
      <p className="text-slate-400">{texto}</p>
    </div>
  )
}

function CardPortfolio({ produto, index }) {
  return (
    <Link
      to={produto.slug}
      className="bg-white rounded-xl shadow overflow-hidden animate-fade-in active:scale-[0.98] transition-transform"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {produto.foto_principal_url ? (
          <img
            src={produto.foto_principal_url}
            alt={produto.titulo}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.innerHTML = '<span class="text-4xl">📷</span>'
            }}
          />
        ) : (
          <span className="text-4xl">📷</span>
        )}
      </div>
      <div className="p-2">
        <p className="font-bold text-sm leading-tight">{produto.titulo}</p>
        {produto.subtitulo && (
          <p className="text-xs text-slate-500 mt-0.5">{produto.subtitulo}</p>
        )}
        {!produto.filtro_supabase && (
          <p className="text-[10px] text-amber-600 mt-1">Consultar estoque</p>
        )}
      </div>
    </Link>
  )
}

function CardEstoque({ produto, index }) {
  const titulo = (produto.descricao || '').slice(0, 60)
  return (
    <Link
      to={`sb-${produto.codigo_produto}`}
      className="bg-white rounded-xl shadow overflow-hidden animate-fade-in active:scale-[0.98] transition-transform"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {produto.imagem_url ? (
          <img
            src={produto.imagem_url}
            alt={titulo}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.innerHTML = '<span class="text-4xl">📷</span>'
            }}
          />
        ) : (
          <span className="text-4xl">📷</span>
        )}
      </div>
      <div className="p-2">
        <p className="font-bold text-sm leading-tight">{produto.modelo || titulo}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {produto.marca || '—'}
          {produto.n_variacoes > 1 && ` · ${produto.n_variacoes} variações`}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-green-700 font-semibold">{produto.estoque_efetivo} un</span>
          {produto.preco_min > 0 ? (
            <span className="text-[10px] text-slate-700 font-medium">
              {produto.preco_min === produto.preco_max
                ? formatBRL(produto.preco_min)
                : `${formatBRL(produto.preco_min)}+`}
            </span>
          ) : (
            <span className="text-[10px] text-amber-600">consulte</span>
          )}
        </div>
      </div>
    </Link>
  )
}
