import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getEstoqueProduto, getEstoqueAtualById, formatBRL, frescorEstoque,
  getMidiasProduto, getMidiasCatalogoProduto, getProdutoCatalogoBySlug,
} from '../lib/catalogoSupabase'

export default function CatalogoDetalhe() {
  const { id } = useParams()
  const isSupabase = id?.startsWith('sb-')
  const codigoProduto = isSupabase ? id.slice(3) : null

  const [produtoCurado, setProdutoCurado] = useState(null) // catálogo curado (banco)
  const [estoqueCurado, setEstoqueCurado] = useState(null) // cross-ref Omie do curado
  const [supItem, setSupItem] = useState(null)             // estoque atual (Omie)
  const [loading, setLoading] = useState(true)             // carregando o produto
  const [loadingEstoque, setLoadingEstoque] = useState(false)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setNaoEncontrado(false)
    if (isSupabase) {
      getEstoqueAtualById(codigoProduto).then((d) => {
        if (alive) { setSupItem(d); setLoading(false) }
      })
    } else {
      getProdutoCatalogoBySlug(id).then((prod) => {
        if (!alive) return
        if (!prod) { setNaoEncontrado(true); setLoading(false); return }
        setProdutoCurado(prod)
        setLoading(false)
        if (prod.filtro_supabase) {
          setLoadingEstoque(true)
          getEstoqueProduto(prod).then((e) => {
            if (alive) { setEstoqueCurado(e); setLoadingEstoque(false) }
          })
        }
      })
    }
    return () => { alive = false }
  }, [id])

  if (isSupabase) return <DetalheEstoque item={supItem} loading={loading} />

  if (loading) {
    return <p className="text-sm text-slate-500 text-center py-8">Carregando...</p>
  }
  if (naoEncontrado || !produtoCurado) {
    return (
      <div className="text-center py-12">
        <p className="text-4xl mb-3">❓</p>
        <p className="text-slate-400">Produto não encontrado</p>
        <Link to=".." className="text-blue-700 text-sm mt-3 inline-block">← Voltar ao catálogo</Link>
      </div>
    )
  }

  return <DetalhePortfolio produto={produtoCurado} estoque={estoqueCurado} loadingEstoque={loadingEstoque} />
}

// =============== Compartilhar no WhatsApp ===============
function formatTelefoneBR(digits) {
  const d = digits.slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Detecta se o browser/PWA suporta Web Share API com arquivos.
// Android Chrome/Edge: sim. iOS Safari: parcial. Desktop: limitado.
function podeCompartilharArquivos() {
  return typeof navigator !== 'undefined'
    && typeof navigator.canShare === 'function'
    && typeof navigator.share === 'function'
}

// Pega o nome de arquivo decente a partir da URL (último segmento, sem query)
function nomeDaUrl(url, fallback) {
  try {
    const u = new URL(url, window.location.origin)
    const base = u.pathname.split('/').pop()
    if (base && base.includes('.')) return base
  } catch { /* ignora */ }
  return fallback
}

function CompartilharWhatsApp({ partes }) {
  // partes: { titulo, cv, descricao, fotoUrl, fotoFetchUrl, folhetoUrl, valor }
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

  // O folheto (e foto) de produtos do estoque vêm das mídias, que carregam de
  // forma assíncrona DEPOIS do mount. Sem isto, a opção aparecia desmarcada e
  // não ia no envio. Aqui qualquer opção que surge depois entra já marcada.
  const chavesDisponiveis = opcoesDisponiveis.map((o) => o.key).join(',')
  useEffect(() => {
    setSelecoes((prev) => {
      let mudou = false
      const next = { ...prev }
      for (const o of opcoesDisponiveis) {
        if (!(o.key in next)) { next[o.key] = true; mudou = true }
      }
      return mudou ? next : prev
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chavesDisponiveis])

  function toggleSelecao(k) {
    setSelecoes((s) => ({ ...s, [k]: !s[k] }))
  }

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const shareNativo = podeCompartilharArquivos()

  // Constrói a mensagem de texto. Quando enviarComoArquivo=true, omite
  // as URLs de foto/folheto (vão como anexo).
  function montarMensagem({ enviarComoArquivo = false } = {}) {
    const linhas = []
    if (selecoes.titulo) {
      linhas.push(partes.cv ? `*${partes.titulo}* — ${partes.cv}` : `*${partes.titulo}*`)
    }
    if (selecoes.foto && partes.fotoUrl && !enviarComoArquivo) {
      linhas.push('', partes.fotoUrl)
    }
    if (selecoes.descricao && partes.descricao) {
      linhas.push('', partes.descricao.trim())
    }
    if (selecoes.valor && partes.valor > 0) {
      linhas.push('', `💰 ${formatBRL(partes.valor)}`)
    }
    if (selecoes.folheto && partes.folhetoUrl && !enviarComoArquivo) {
      linhas.push('', `📄 Folheto técnico: ${partes.folhetoUrl}`)
    }
    linhas.push('', '— Nova Tratores')
    return linhas.join('\n').replace(/^\n+/, '')
  }

  async function baixarComoArquivo(url, nomePadrao, mimePadrao) {
    // Cache-buster: a foto do produto é exibida via <img> (modo no-cors), e o
    // service worker (CacheFirst em /storage/v1/object/public/) guarda essa
    // resposta OPACA. Um fetch normal aqui pegaria a opaca do cache e estouraria
    // ("Failed to fetch"), deixando foto/folheto sem anexar no WhatsApp. A query
    // única força o SW a buscar da rede em modo cors (legível).
    const sep = url.includes('?') ? '&' : '?'
    const r = await fetch(`${url}${sep}_share=${Date.now()}`, { cache: 'no-store' })
    if (!r.ok) throw new Error(`Falha baixando ${url}: HTTP ${r.status}`)
    const blob = await r.blob()
    const nome = nomeDaUrl(url, nomePadrao)
    return new File([blob], nome, { type: blob.type || mimePadrao })
  }

  async function abrir(e) {
    e?.preventDefault()
    setErro('')
    if (enviando) return

    const semTelefone = telefone.length < 10
    const queriaFotoOuFolheto =
      (selecoes.foto && partes.fotoUrl) || (selecoes.folheto && partes.folhetoUrl)

    // Sem telefone só vale se vamos usar Web Share (que pega contato pelo share sheet do SO)
    if (semTelefone && !shareNativo) {
      setErro('Digite o telefone com DDD')
      return
    }

    setEnviando(true)
    try {
      // Caminho 1: Web Share API com arquivos anexados (Android/iOS modernos)
      if (shareNativo && queriaFotoOuFolheto) {
        const files = []
        // Cada download é isolado: se a foto falhar (ex.: CORS), o folheto
        // ainda é baixado, e vice-versa.
        if (selecoes.foto && (partes.fotoFetchUrl || partes.fotoUrl)) {
          try {
            // fotoFetchUrl: URL same-origin (sem CORS) quando a foto está no
            // próprio app. Cai pra fotoUrl (absoluta) se não vier.
            files.push(await baixarComoArquivo(partes.fotoFetchUrl || partes.fotoUrl, 'foto.webp', 'image/webp'))
          } catch (err) {
            console.warn('[share] download da foto falhou:', err)
          }
        }
        if (selecoes.folheto && partes.folhetoUrl) {
          try {
            files.push(await baixarComoArquivo(partes.folhetoUrl, 'folheto.pdf', 'application/pdf'))
          } catch (err) {
            console.warn('[share] download do folheto falhou:', err)
          }
        }

        if (files.length > 0 && navigator.canShare({ files })) {
          try {
            await navigator.share({
              text: montarMensagem({ enviarComoArquivo: true }),
              files,
            })
            if (telefone) localStorage.setItem('wa_share_last', telefone)
            setOpen(false)
            return
          } catch (err) {
            if (err.name === 'AbortError') {
              // Usuário cancelou no share sheet, não cai pro fallback
              return
            }
            console.warn('[share] navigator.share falhou:', err)
            // continua pra fallback abaixo
          }
        }
      }

      // Caminho 2: fallback wa.me (texto puro com URLs)
      if (semTelefone) {
        setErro('Digite o telefone pra enviar via wa.me (anexo não disponível neste navegador).')
        return
      }
      const numero = telefone.startsWith('55') ? telefone : `55${telefone}`
      const texto = encodeURIComponent(montarMensagem({ enviarComoArquivo: false }))
      localStorage.setItem('wa_share_last', telefone)
      window.open(`https://wa.me/${numero}?text=${texto}`, '_blank', 'noopener')
      setOpen(false)
    } finally {
      setEnviando(false)
    }
  }

  const algumSelecionado = Object.values(selecoes).some(Boolean)
  const valido = algumSelecionado && (telefone.length >= 10 || shareNativo)

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

            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Telefone (com DDD)
              {shareNativo && <span className="ml-1 normal-case text-slate-400">— opcional se compartilhar com anexo</span>}
            </p>
            <input
              type="tel"
              inputMode="numeric"
              value={formatTelefoneBR(telefone)}
              onChange={(e) => setTelefone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="(14) 99999-9999"
              className="w-full border border-slate-300 rounded-lg px-3 py-3 text-base mb-2"
            />

            {shareNativo ? (
              <p className="text-[11px] text-slate-500 mb-3">
                Se você marcou foto ou folheto, o sistema vai abrir o seletor de apps do celular pra você escolher o contato — a foto e o PDF vão como anexo do WhatsApp.
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 mb-3">
                Esse navegador não suporta anexar arquivo. O link da foto e do folheto vai como texto na mensagem.
              </p>
            )}

            {erro && (
              <p className="text-xs text-red-600 mb-3 bg-red-50 rounded p-2">{erro}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={enviando}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-medium text-sm active:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!valido || enviando}
                className="flex-1 bg-green-600 text-white py-3 rounded-xl font-medium text-sm active:bg-green-700 disabled:opacity-40"
              >
                {enviando ? 'Preparando...' : 'Compartilhar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}

// Galeria de mídias extras (fotos/vídeos/PDFs) — compartilhada entre as duas telas
function GaleriaMidias({ midias }) {
  const fotosExtras = midias.filter((m) => m.tipo === 'foto')
  const videos = midias.filter((m) => m.tipo === 'video')
  const pdfs = midias.filter((m) => m.tipo === 'pdf')

  return (
    <>
      {fotosExtras.length > 0 && (
        <div className="bg-white rounded-xl shadow p-3 mb-3 animate-fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mais fotos ({fotosExtras.length})</h3>
          <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            {fotosExtras.map((f) => (
              <a
                key={f.id}
                href={f.url_publica}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-32 aspect-square bg-slate-100 rounded overflow-hidden"
              >
                <img src={f.url_publica} alt={f.titulo || ''} className="w-full h-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </div>
      )}

      {videos.map((v) => (
        <div key={v.id} className="bg-white rounded-xl shadow p-3 mb-3 animate-fade-in">
          {v.titulo && <p className="text-xs text-slate-500 mb-2">{v.titulo}</p>}
          <video src={v.url_publica} controls preload="metadata" className="w-full rounded bg-black" />
        </div>
      ))}

      {pdfs.map((p) => (
        <a
          key={p.id}
          href={p.url_publica}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-xl shadow p-3 mb-3 active:bg-slate-50 animate-fade-in"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{p.titulo || 'Documento PDF'}</p>
              <p className="text-xs text-slate-500">Abrir em nova aba</p>
            </div>
            <span className="text-blue-700 text-lg">↗</span>
          </div>
        </a>
      ))}
    </>
  )
}

// =============== Portfólio curado (banco) ===============
function DetalhePortfolio({ produto, estoque, loadingEstoque }) {
  const [midias, setMidias] = useState([])

  useEffect(() => {
    if (!produto?.id) return
    let alive = true
    getMidiasCatalogoProduto(produto.id).then((m) => { if (alive) setMidias(m) })
    return () => { alive = false }
  }, [produto?.id])

  const fotoPrincipal = produto.foto_principal_url || null
  // URL absoluta pro link de texto (fallback); fetch usa a relativa (same-origin, sem CORS)
  const fotoAbsoluta = fotoPrincipal
    ? (fotoPrincipal.startsWith('http') ? fotoPrincipal : `${window.location.origin}${fotoPrincipal}`)
    : null
  // Folheto p/ compartilhar: usa o folheto_url do produto, ou o 1º PDF anexado pelo admin
  const folhetoUrl = produto.folheto_url || midias.find((m) => m.tipo === 'pdf')?.url_publica || null

  return (
    <div className="pb-4">
      <Link to=".." className="text-blue-700 text-sm inline-block mb-2">← Catálogo</Link>

      <div className="bg-white rounded-xl shadow overflow-hidden mb-3 animate-fade-in">
        <div className="aspect-video bg-slate-100 flex items-center justify-center">
          {fotoPrincipal ? (
            <img
              src={fotoPrincipal}
              alt={produto.titulo}
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
          <h2 className="text-xl font-bold leading-tight">{produto.titulo}</h2>
          {produto.subtitulo && (
            <p className="text-sm text-slate-500 mt-0.5">{produto.subtitulo}</p>
          )}
          <div className="flex gap-2 mt-2">
            {produto.marca?.nome && (
              <span className="inline-block text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {produto.marca.nome}
              </span>
            )}
            {produto.categoria && (
              <span className="inline-block text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {produto.categoria}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Estoque e preço do Supabase (só quando o produto tem cross-ref) */}
      {produto.filtro_supabase && (
        <div className="bg-white rounded-xl shadow p-4 mb-3 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          {loadingEstoque ? (
            <p className="text-sm text-slate-400">Consultando estoque...</p>
          ) : !estoque?.matched ? (
            <div>
              <p className="text-sm text-amber-700 font-medium">Consulte disponibilidade e preço</p>
              <p className="text-xs text-slate-500 mt-1">Confirme com o supervisor.</p>
            </div>
          ) : estoque.sku_count === 0 ? (
            <div>
              <p className="text-sm text-slate-700 font-medium">Sem estoque registrado</p>
              <p className="text-xs text-slate-500 mt-1">Nenhum SKU encontrado para {(produto.modelos_supabase || []).join(', ')}.</p>
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
      )}

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

      {/* Mídias extras adicionadas pelo admin */}
      <GaleriaMidias midias={midias} />

      <CompartilharWhatsApp
        partes={{
          titulo: produto.titulo,
          cv: produto.subtitulo || null,
          descricao: produto.descricao,
          valor: estoque?.matched && estoque?.valor_medio > 0 ? estoque.valor_medio : null,
          fotoUrl: fotoAbsoluta,
          fotoFetchUrl: fotoPrincipal,
          folhetoUrl,
        }}
      />

      {produto.folheto_url && (
        <a
          href={produto.folheto_url}
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
          Ver no site do fabricante ↗
        </a>
      )}
    </div>
  )
}

// =============== Estoque atual (Supabase produtos) ===============
function DetalheEstoque({ item, loading }) {
  const [midias, setMidias] = useState([])

  useEffect(() => {
    if (!item?.codigo_produto) return
    let alive = true
    getMidiasProduto(item.codigo_produto).then((m) => {
      if (alive) setMidias(m)
    })
    return () => { alive = false }
  }, [item?.codigo_produto])

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

      <GaleriaMidias midias={midias} />

      <CompartilharWhatsApp
        partes={{
          titulo: item.modelo || item.descricao?.slice(0, 60) || `Código ${item.codigo}`,
          cv: null,
          descricao: item.descricao,
          valor: item.preco_efetivo > 0 ? item.preco_efetivo : null,
          fotoUrl: item.imagem_url || null,
          // Folheto p/ compartilhar: 1º PDF anexado pelo admin a este produto
          folhetoUrl: midias.find((m) => m.tipo === 'pdf')?.url_publica || null,
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
