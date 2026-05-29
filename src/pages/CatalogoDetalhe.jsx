import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getProdutoById } from '../data/catalogo'
import { getEstoqueProduto, getEstoqueAtualById, formatBRL, frescorEstoque } from '../lib/catalogoSupabase'

export default function CatalogoDetalhe() {
  const { id } = useParams()
  const isSupabase = id?.startsWith('sb-')
  const codigoProduto = isSupabase ? id.slice(3) : null
  const produtoCurado = !isSupabase ? getProdutoById(id) : null

  const [estoqueCurado, setEstoqueCurado] = useState(null) // pra portfolio Mahindra
  const [supItem, setSupItem] = useState(null)             // pra estoque atual
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    if (isSupabase) {
      getEstoqueAtualById(codigoProduto).then((d) => {
        if (alive) { setSupItem(d); setLoading(false) }
      })
    } else if (produtoCurado) {
      getEstoqueProduto(produtoCurado).then((d) => {
        if (alive) { setEstoqueCurado(d); setLoading(false) }
      })
    } else {
      setLoading(false)
    }
    return () => { alive = false }
  }, [id])

  if (!isSupabase && !produtoCurado) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">❓</p>
        <p className="text-slate-400">Produto não encontrado</p>
        <Link to=".." className="text-blue-700 text-sm mt-3 inline-block">← Voltar ao catálogo</Link>
      </div>
    )
  }

  if (isSupabase) return <DetalheEstoque item={supItem} loading={loading} />
  return <DetalhePortfolio produto={produtoCurado} estoque={estoqueCurado} loading={loading} />
}

// =============== Compartilhar no WhatsApp ===============
function formatTelefoneBR(digits) {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function CompartilharWhatsApp({ partes }) {
  // partes: { titulo, cv, descricao, fotoUrl, folhetoUrl, valor }
  // Cada campo so vira opcao de checkbox se vier preenchido em partes
  const [open, setOpen] = useState(false)
  const [telefone, setTelefone] = useState(() =>
    (localStorage.getItem('wa_share_last') || '').replace(/\D/g, '')
  )

  const opcoesDisponiveis = [
    { key: 'titulo', label: 'Título', tem: !!partes.titulo },
    { key: 'descricao', label: 'Descrição', tem: !!partes.descricao },
    { key: 'foto', label: 'Foto', tem: !!partes.fotoUrl },
    { key: 'valor', label: 'Valor', tem: !!(partes.valor && partes.valor > 0) },
    { key: 'folheto', label: 'Folheto técnico (PDF)', tem: !!partes.folhetoUrl },
  ].filter((o) => o.tem)

  const [selecoes, setSelecoes] = useState(() =>
    Object.fromEntries(opcoesDisponiveis.map((o) => [o.key, true]))
  )

  function toggleSelecao(k) {
    setSelecoes((s) => ({ ...s, [k]: !s[k] }))
  }

  function montarMensagem() {
    const linhas = []
    if (selecoes.titulo) {
      linhas.push(partes.cv ? `*${partes.titulo}* — ${partes.cv}` : `*${partes.titulo}*`)
    }
    if (selecoes.foto && partes.fotoUrl) {
      linhas.push('', partes.fotoUrl)
    }
    if (selecoes.descricao && partes.descricao) {
      linhas.push('', partes.descricao.trim())
    }
    if (selecoes.valor && partes.valor > 0) {
      linhas.push('', `💰 ${formatBRL(partes.valor)}`)
    }
    if (selecoes.folheto && partes.folhetoUrl) {
      linhas.push('', `📄 Folheto técnico: ${partes.folhetoUrl}`)
    }
    linhas.push('', '— Nova Tratores')
    return linhas.join('\n').replace(/^\n+/, '')
  }

  function abrir(e) {
    e?.preventDefault()
    if (telefone.length < 10) return
    const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
    const texto = encodeURIComponent(montarMensagem())
    localStorage.setItem('wa_share_last', telefone)
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank', 'noopener')
    setOpen(false)
  }

  const algumSelecionado = Object.values(selecoes).some(Boolean)
  const valido = telefone.length >= 10 && algumSelecionado

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full bg-green-600 text-white text-center py-3 rounded-xl font-medium text-sm active:bg-green-700 animate-fade-in mb-2"
      >
        💬 Enviar no WhatsApp
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={abrir}
            className="bg-white rounded-2xl w-full max-w-sm p-5 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-bold mb-3">Enviar pelo WhatsApp</h3>

            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">O que enviar</p>
            <div className="space-y-1.5 mb-4">
              {opcoesDisponiveis.map((o) => (
                <label key={o.key} className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={!!selecoes[o.key]}
                    onChange={() => toggleSelecao(o.key)}
                    className="w-5 h-5 accent-green-600"
                  />
                  <span className="text-sm">{o.label}</span>
                </label>
              ))}
            </div>

            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Telefone (com DDD)</p>
            <input
              type="tel"
              inputMode="numeric"
              value={formatTelefoneBR(telefone)}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="(14) 99999-9999"
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base mb-4"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium text-sm active:bg-slate-200"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!valido}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium text-sm active:bg-green-700 disabled:opacity-40"
              >
                Abrir WhatsApp
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

// =============== Portfólio curado (Mahindra) ===============
function DetalhePortfolio({ produto, estoque, loading }) {
  const fotoPrincipal = `/catalogo/fotos/${produto.id}/foto-principal.webp`

  return (
    <div className="pb-4">
      <Link to=".." className="text-blue-700 text-sm inline-block mb-2">← Catálogo</Link>

      <div className="bg-white rounded-xl shadow overflow-hidden mb-3 animate-fade-in">
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          <img
            src={fotoPrincipal}
            alt={produto.titulo}
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.innerHTML = '<span class="text-6xl">📷</span>'
            }}
          />
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold leading-tight">{produto.titulo}</h2>
          {produto.subtitulo && (
            <p className="text-sm text-slate-500 mt-0.5">{produto.subtitulo}</p>
          )}
          <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {produto.categoria}
          </span>
        </div>
      </div>

      {/* Estoque e preço do Supabase */}
      <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        {loading ? (
          <p className="text-sm text-slate-400">Consultando estoque...</p>
        ) : !estoque?.matched ? (
          <div>
            <p className="text-sm text-amber-700 font-medium">Consulte disponibilidade e preço</p>
            <p className="text-xs text-slate-500 mt-1">Este produto não tem SKU mapeado no sistema. Confirme com o supervisor.</p>
          </div>
        ) : estoque.sku_count === 0 ? (
          <div>
            <p className="text-sm text-slate-700 font-medium">Sem estoque registrado</p>
            <p className="text-xs text-slate-500 mt-1">Nenhum SKU encontrado para {produto.modelos_supabase.join(', ')}.</p>
          </div>
        ) : (
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-2xl font-bold text-green-700">{estoque.estoque_total}</span>
              <span className="text-xs text-slate-500">em estoque</span>
            </div>
            {estoque.valor_medio > 0 && (
              <p className="text-sm text-slate-700">
                {estoque.valor_min === estoque.valor_max
                  ? formatBRL(estoque.valor_medio)
                  : `${formatBRL(estoque.valor_min)} – ${formatBRL(estoque.valor_max)}`}
              </p>
            )}
            {estoque.ambientes.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                Onde está: {estoque.ambientes.join(', ')}
              </p>
            )}
            <p className={`text-xs mt-1 ${frescorEstoque(estoque.atualizado_em).color}`}>
              {frescorEstoque(estoque.atualizado_em).label}
            </p>
          </div>
        )}
      </div>

      {/* Descricao */}
      {produto.descricao && (
        <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm text-slate-700 leading-relaxed">{produto.descricao}</p>
        </div>
      )}

      {/* Argumentos de venda */}
      {produto.argumentos_de_venda?.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Por que vender</h3>
          <ul className="space-y-1.5">
            {produto.argumentos_de_venda.map((arg, i) => (
              <li key={i} className="text-sm text-slate-700 flex gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>{arg}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Especificacoes */}
      {produto.especificacoes && Object.keys(produto.especificacoes).length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Especificações</h3>
          <dl className="grid grid-cols-1 gap-x-3 gap-y-1.5">
            {Object.entries(produto.especificacoes)
              .filter(([, v]) => v && v !== '')
              .map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 pb-1.5">
                  <dt className="text-xs text-slate-500 capitalize">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-xs text-slate-700 font-medium text-right ml-2">{v}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      <CompartilharWhatsApp
        partes={{
          titulo: produto.titulo,
          cv: produto.subtitulo || null,
          descricao: produto.descricao,
          valor: estoque?.matched && estoque?.valor_medio > 0 ? estoque.valor_medio : null,
          fotoUrl: `https://novatratores.com/catalogo/fotos/${produto.id}/foto-principal.webp`,
          folhetoUrl: produto.ficha_tecnica?.url_storage || null,
        }}
      />

      {produto.ficha_tecnica?.url_storage && (
        <a
          href={produto.ficha_tecnica.url_storage}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-blue-700 text-white text-center py-3 rounded-xl font-medium text-sm active:bg-blue-800 animate-fade-in"
          style={{ animationDelay: '0.25s' }}
        >
          📄 Abrir folheto técnico
        </a>
      )}

      {produto.url_site && (
        <a
          href={produto.url_site}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-slate-100 text-slate-700 text-center py-2.5 rounded-xl text-xs mt-2 active:bg-slate-200 animate-fade-in"
          style={{ animationDelay: '0.3s' }}
        >
          Ver no site Mahindra ↗
        </a>
      )}
    </div>
  )
}

// =============== Estoque atual (Supabase produtos) ===============
function DetalheEstoque({ item, loading }) {
  if (loading) {
    return <p className="text-sm text-slate-500 text-center py-8">Carregando...</p>
  }
  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">❓</p>
        <p className="text-slate-400">Produto não encontrado no estoque</p>
        <Link to=".." className="text-blue-700 text-sm mt-3 inline-block">← Voltar ao catálogo</Link>
      </div>
    )
  }

  return (
    <div className="pb-4">
      <Link to=".." className="text-blue-700 text-sm inline-block mb-2">← Catálogo</Link>

      <div className="bg-white rounded-xl shadow overflow-hidden mb-3 animate-fade-in">
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          {item.imagem_url ? (
            <img
              src={item.imagem_url}
              alt={item.descricao}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.innerHTML = '<span class="text-6xl">📷</span>'
              }}
            />
          ) : (
            <span className="text-6xl">📷</span>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold leading-tight">{item.modelo || item.descricao?.slice(0, 60)}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{item.marca || '—'} · {item.familia_nome}</p>
          <span className="inline-block mt-2 text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
            {item.codigo}
          </span>
          {item.tem_override && (
            <span className="inline-block mt-2 ml-2 text-[10px] uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
              ajustado pelo admin
            </span>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold text-green-700">{item.estoque_efetivo}</span>
          <span className="text-xs text-slate-500">em estoque</span>
        </div>
        {item.preco_efetivo > 0 ? (
          <p className="text-lg text-slate-800 font-semibold">{formatBRL(item.preco_efetivo)}</p>
        ) : (
          <p className="text-sm text-amber-700 font-medium">Consulte o preço</p>
        )}
        <p className={`text-xs mt-1 ${frescorEstoque(item.atualizado_em).color}`}>
          {frescorEstoque(item.atualizado_em).label}
        </p>
      </div>

      {item.descricao && (
        <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Descrição completa</h3>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{item.descricao}</p>
        </div>
      )}

      <CompartilharWhatsApp
        partes={{
          titulo: item.modelo || item.descricao?.slice(0, 60) || `Código ${item.codigo}`,
          cv: null,
          descricao: item.descricao,
          valor: item.preco_efetivo > 0 ? item.preco_efetivo : null,
          fotoUrl: item.imagem_url || null,
          folhetoUrl: null,
        }}
      />


      {item.override?.notas && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Nota do admin</p>
          <p className="text-sm text-purple-900">{item.override.notas}</p>
        </div>
      )}
    </div>
  )
}
