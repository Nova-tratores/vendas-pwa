import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getProdutosCatalogo, getMarcas, getEstoqueAtual, formatBRL, categoriasDe } from '../lib/catalogoSupabase'
import PullToRefresh from '../components/PullToRefresh'
import { renderToStaticMarkup } from 'react-dom/server'
import { Camera, Play, Scale, Search } from 'lucide-react'

// Ícone de câmera em HTML puro (usado quando a foto falha e o innerHTML é trocado).
const CAMERA_SVG = renderToStaticMarkup(<Camera size={36} />)

export default function Catalogo() {
  const noSupervisor = useLocation().pathname.startsWith('/supervisor')
  const [filtroCat, setFiltroCat] = useState('todos')
  const [filtroMarca, setFiltroMarca] = useState('todas')
  const [busca, setBusca] = useState('')
  const [produtos, setProdutos] = useState([])
  const [marcas, setMarcas] = useState([])
  const [loadingPortfolio, setLoadingPortfolio] = useState(true)
  const [estoque, setEstoque] = useState([])
  const [loadingEstoque, setLoadingEstoque] = useState(true)
  const [aba, setAba] = useState('portfolio') // portfolio | estoque
  const [modoEstoque, setModoEstoque] = useState('todos') // todos | marca | familia

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

  // Agrupa o estoque por marca/família (ou tudo num grupo só) conforme o modo.
  const estoqueAgrupado = useMemo(() => {
    if (modoEstoque === 'todos') return [{ titulo: null, itens: estoqueFiltrado }]
    const campo = modoEstoque === 'marca' ? 'marca' : 'familia_nome'
    const mapa = new Map()
    for (const p of estoqueFiltrado) {
      const chave = ((p[campo] || '').toString().trim()) || '—'
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(p)
    }
    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
      .map(([titulo, itens]) => ({ titulo, itens }))
  }, [estoqueFiltrado, modoEstoque])

  return (
    <PullToRefresh onRefresh={async () => { await getEstoqueAtual({ force: true }).then(setEstoque) }}>
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">Catálogo</h2>
            <p className="text-sm text-slate-500">{produtos.length} no portfólio · {estoque.length} na loja</p>
          </div>
          <div className="shrink-0 flex flex-col gap-1.5">
            {/* Showroom/TV só pelo painel do supervisor; no app do vendedor fica escondido. */}
            {noSupervisor && (
              <Link
                to="/showroom"
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium text-center active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5"
              >
                <Play size={14} /> Modo Showroom / TV
              </Link>
            )}
            <Link
              to="../comparativo"
              className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-medium text-center active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-1.5"
            >
              <Scale size={14} /> Comparar tratores
            </Link>
          </div>
        </div>

        <input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, marca, modelo ou descrição..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {/* Abas: Portfolio (curado) | Estoque Loja */}
        <div className="flex gap-1 mb-3 border-b border-slate-200">
          <TabButton ativo={aba === 'portfolio'} onClick={() => setAba('portfolio')}>
            Portfólio ({produtos.length})
          </TabButton>
          <TabButton ativo={aba === 'estoque'} onClick={() => setAba('estoque')}>
            Estoque Loja ({estoque.length})
          </TabButton>
        </div>

        {aba === 'portfolio' && (
          <>
            {/* Chips de marca (só quando há mais de uma) */}
            {marcasComProduto.length > 1 && (
              <div className="flex gap-1 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
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
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
              <Chip ativo={filtroCat === 'todos'} onClick={() => setFiltroCat('todos')}>
                Todos ({produtosDaMarca.length})
              </Chip>
              {categoriasDe(produtosDaMarca).map((c) => {
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {portfolioFiltrado.map((p, i) => (
                  <CardPortfolio key={p.id} produto={p} index={i} />
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'estoque' && (
          <>
            {/* Modo de visualização: Todos | Por marca | Por família */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
              <Chip ativo={modoEstoque === 'todos'} onClick={() => setModoEstoque('todos')}>Todos</Chip>
              <Chip ativo={modoEstoque === 'marca'} onClick={() => setModoEstoque('marca')}>Por marca</Chip>
              <Chip ativo={modoEstoque === 'familia'} onClick={() => setModoEstoque('familia')}>Por família</Chip>
            </div>

            {loadingEstoque ? (
              <p className="text-sm text-slate-500 text-center py-8">Carregando estoque...</p>
            ) : estoqueFiltrado.length === 0 ? (
              <EmptyState texto="Nenhum produto em estoque" />
            ) : (
              <div className="space-y-4">
                {estoqueAgrupado.map((grupo) => (
                  <div key={grupo.titulo ?? '__todos'}>
                    {grupo.titulo && (
                      <h3 className="text-sm font-bold text-slate-700 mb-2">
                        {grupo.titulo} <span className="text-slate-400 font-normal">({grupo.itens.length})</span>
                      </h3>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {grupo.itens.map((p, i) => (
                        <CardEstoque key={p.codigo_produto} produto={p} index={i} />
                      ))}
                    </div>
                  </div>
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
      <p className="mb-3 flex justify-center text-slate-300"><Search size={40} /></p>
      <p className="text-slate-400">{texto}</p>
    </div>
  )
}

// ---- Cards do catálogo: mesmo molde para Portfólio e Estoque Loja ----
// Altura igual em toda a grade: foto em caixa fixa, nome em até 2 linhas com
// espaço reservado, e o rodapé sempre colado no fim do card.

// Palavras que ficam em maiúsculas: códigos com número (14X28, 2227/29), siglas curtas
// (DCF, SDM, PG) e códigos com hífen em que alguma parte é sigla (GTCR-CR, ASDAH-MP).
const LIGACOES = ['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'para', 'até', 'em']
const ehSigla = (parte) => /\d/.test(parte) || /^[A-Z]{1,3}$/.test(parte) || /^[^AEIOUÁÉÍÓÚÃÕÂÊÔ\d]{2,6}$/.test(parte)

/** "GRADE NIVELADORA, NVCR" → "Grade Niveladora, NVCR"; texto já misto fica como está. */
export function nomeLegivel(texto) {
  const s = String(texto || '').trim().replace(/\s+/g, ' ')
  if (!s || s !== s.toUpperCase()) return s
  return s.split(' ').map((p, i) => {
    const baixa = p.toLowerCase()
    if (i > 0 && LIGACOES.includes(baixa)) return baixa
    const limpa = p.replace(/[^\p{L}\p{N}-]/gu, '')
    if (limpa.split('-').filter(Boolean).some(ehSigla)) return p
    return baixa.charAt(0).toUpperCase() + baixa.slice(1)
  }).join(' ')
}

/** Tira a marca do começo do nome, já que ela aparece na etiqueta do card. */
function semMarca(titulo, marca) {
  if (!marca) return titulo
  const re = new RegExp(`^${marca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i')
  const resto = titulo.replace(re, '')
  return resto || titulo
}

/** Subtítulo só quando acrescenta algo: curto e não repetido no nome. */
function subtituloUtil(sub, titulo) {
  const s = String(sub || '').trim()
  if (!s || s.length > 40) return ''
  const norm = (x) => x.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  return norm(titulo).includes(norm(s)) ? '' : nomeLegivel(s)
}

function FotoCard({ src, alt }) {
  return (
    <div className="aspect-[4/3] bg-white flex items-center justify-center overflow-hidden p-2 border-b border-slate-100">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement.innerHTML = `<span class="text-slate-300">${CAMERA_SVG}</span>`
          }}
        />
      ) : (
        <Camera size={36} className="text-slate-300" />
      )}
    </div>
  )
}

function CorpoCard({ marca, titulo, subtitulo, rodape }) {
  return (
    <div className="p-2.5 flex flex-col flex-1">
      {marca && (
        <span className="self-start text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mb-1 max-w-full truncate">
          {marca}
        </span>
      )}
      <p className="font-bold text-[13px] leading-[18px] text-slate-900 line-clamp-2 h-[36px]" title={titulo}>{titulo}</p>
      <p className="text-[11px] text-slate-500 truncate min-h-[1rem]">{subtitulo}</p>
      <div className="mt-auto pt-2">{rodape}</div>
    </div>
  )
}

const CLASSE_CARD = 'bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full animate-fade-in active:scale-[0.98] transition-transform'

function CardPortfolio({ produto, index }) {
  const marca = produto.marca?.nome || ''
  const titulo = nomeLegivel(semMarca(produto.titulo || '', marca))
  return (
    <Link to={produto.slug} className={CLASSE_CARD} style={{ animationDelay: `${Math.min(index, 20) * 0.03}s` }}>
      <FotoCard src={produto.foto_principal_url} alt={produto.titulo} />
      <CorpoCard
        marca={marca}
        titulo={titulo}
        subtitulo={subtituloUtil(produto.subtitulo, produto.titulo || '')}
        rodape={produto.filtro_supabase
          ? <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">Tem na loja</span>
          : <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">Consultar estoque</span>}
      />
    </Link>
  )
}

function CardEstoque({ produto, index }) {
  const marca = produto.marca || ''
  const bruto = produto.modelo || (produto.descricao || '').slice(0, 80)
  const titulo = nomeLegivel(semMarca(bruto, marca))
  const preco = produto.preco_min > 0
    ? (produto.preco_min === produto.preco_max ? formatBRL(produto.preco_min) : `${formatBRL(produto.preco_min)}+`)
    : null
  return (
    <Link to={`sb-${produto.codigo_produto}`} className={CLASSE_CARD} style={{ animationDelay: `${Math.min(index, 20) * 0.03}s` }}>
      <FotoCard src={produto.imagem_url} alt={titulo} />
      <CorpoCard
        marca={marca}
        titulo={titulo}
        subtitulo={produto.n_variacoes > 1 ? `${produto.n_variacoes} variações` : ''}
        rodape={
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 whitespace-nowrap">{produto.estoque_efetivo} un</span>
            {preco
              ? <span className="text-[11px] font-bold text-slate-800 truncate">{preco}</span>
              : <span className="text-[10px] font-semibold text-amber-700">consulte</span>}
          </div>
        }
      />
    </Link>
  )
}
