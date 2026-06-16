import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProdutosCatalogo, getMarcas, getMidiasCatalogoProduto } from '../lib/catalogoSupabase'

// ====================================================================
// Modo Showroom / TV — vitrine digital do portfólio curado.
// Roda sozinho em loop (TV) e vira interativo ao toque (tablet):
// qualquer interação pausa a rotação e retoma sozinha após ociosidade.
// Tela cheia, sem o chrome do Layout. Reaproveita as queries do catálogo.
// ====================================================================

const DURACAO_SLIDE = 12000     // ms entre produtos (auto-rotação)
const OCIOSIDADE_RETOMA = 30000 // ms parado até voltar a rotacionar sozinho
const DURACAO_FOTO = 4500       // ms do mini-carrossel de fotos dentro do slide
const OCULTAR_CURSOR = 4000     // ms até esconder cursor/controles

const CAT_LABEL = { tratores: 'Tratores', implementos: 'Implementos', pulverizadores: 'Pulverizadores' }

export default function Showroom() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [iniciado, setIniciado] = useState(false)   // gesto inicial (fullscreen + wake lock)
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)      // pausa manual (vira true ao interagir)
  const [controlesVisiveis, setControlesVisiveis] = useState(true)

  const wakeLockRef = useRef(null)
  const ociosoTimerRef = useRef(null)
  const cursorTimerRef = useRef(null)
  const touchStartX = useRef(null)

  // ---- Carregamento -------------------------------------------------
  useEffect(() => {
    let alive = true
    Promise.all([getProdutosCatalogo(), getMarcas()]).then(([prods, marcas]) => {
      if (!alive) return
      const marcaById = new Map(marcas.map((m) => [m.id, m]))
      // Só produtos com foto entram no slideshow.
      const lista = prods
        .filter((p) => p.foto_principal_url)
        .map((p) => ({ ...p, marca: p.marca || marcaById.get(p.marca_id) || null }))
      setProdutos(lista)
      setCarregando(false)
    })
    return () => { alive = false }
  }, [])

  const total = produtos.length
  const atual = produtos[indice] || null

  const avancar = useCallback((delta) => {
    setIndice((i) => (total ? (i + delta + total) % total : 0))
  }, [total])

  // ---- Auto-rotação -------------------------------------------------
  useEffect(() => {
    if (!iniciado || pausado || total <= 1) return
    const t = setInterval(() => setIndice((i) => (i + 1) % total), DURACAO_SLIDE)
    return () => clearInterval(t)
  }, [iniciado, pausado, total])

  // Pré-carrega a imagem do próximo slide pra transição sem flash.
  useEffect(() => {
    if (!total) return
    const prox = produtos[(indice + 1) % total]
    if (prox?.foto_principal_url) {
      const img = new Image()
      img.src = prox.foto_principal_url
    }
  }, [indice, total, produtos])

  // ---- Interação: pausa + timer de ociosidade -----------------------
  const registrarInteracao = useCallback(() => {
    setControlesVisiveis(true)
    setPausado(true)
    if (ociosoTimerRef.current) clearTimeout(ociosoTimerRef.current)
    ociosoTimerRef.current = setTimeout(() => setPausado(false), OCIOSIDADE_RETOMA)
    // esconder cursor/controles após um tempo parado
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => setControlesVisiveis(false), OCULTAR_CURSOR)
  }, [])

  const irPara = useCallback((delta) => {
    avancar(delta)
    registrarInteracao()
  }, [avancar, registrarInteracao])

  const togglePausa = useCallback(() => {
    if (ociosoTimerRef.current) clearTimeout(ociosoTimerRef.current)
    setPausado((p) => !p)
    setControlesVisiveis(true)
  }, [])

  // Teclado (controle remoto / setas)
  useEffect(() => {
    if (!iniciado) return
    const onKey = (e) => {
      if (e.key === 'ArrowRight') irPara(1)
      else if (e.key === 'ArrowLeft') irPara(-1)
      else if (e.key === ' ') { e.preventDefault(); togglePausa() }
      else if (e.key === 'Escape') sair()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iniciado, irPara, togglePausa])

  // Esconde cursor/controles depois de ociosidade enquanto roda sozinho.
  useEffect(() => {
    if (!iniciado) return
    cursorTimerRef.current = setTimeout(() => setControlesVisiveis(false), OCULTAR_CURSOR)
    return () => cursorTimerRef.current && clearTimeout(cursorTimerRef.current)
  }, [iniciado])

  // ---- Wake Lock (mantém a tela acesa) ------------------------------
  const pedirWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
      }
    } catch { /* alguns devices recusam; ignora */ }
  }, [])

  useEffect(() => {
    if (!iniciado) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') pedirWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      try { wakeLockRef.current?.release() } catch { /* ignora */ }
      wakeLockRef.current = null
    }
  }, [iniciado, pedirWakeLock])

  // ---- Iniciar / Sair -----------------------------------------------
  const iniciar = useCallback(async () => {
    try { await document.documentElement.requestFullscreen?.() } catch { /* ignora */ }
    await pedirWakeLock()
    setIniciado(true)
    registrarInteracao()
  }, [pedirWakeLock, registrarInteracao])

  const sair = useCallback(() => {
    try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* ignora */ }
    try { wakeLockRef.current?.release() } catch { /* ignora */ }
    navigate(-1)
  }, [navigate])

  // ---- Render -------------------------------------------------------
  if (carregando) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex items-center justify-center">
        <p className="text-2xl opacity-70">Carregando catálogo…</p>
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="fixed inset-0 bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-3xl">Nenhum produto com foto no portfólio</p>
        <button onClick={() => navigate(-1)} className="px-5 py-3 rounded-xl bg-white/10 text-lg">Voltar</button>
      </div>
    )
  }

  if (!iniciado) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 to-slate-800 text-white flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <p className="text-4xl md:text-5xl font-bold mb-3">Vitrine Nova Tratores</p>
          <p className="text-xl opacity-70">{total} máquinas no portfólio</p>
        </div>
        <button
          onClick={iniciar}
          className="px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-2xl font-semibold shadow-lg active:scale-95 transition"
        >
          ▶ Iniciar apresentação
        </button>
        <p className="text-sm opacity-50 max-w-md">
          Toque nas laterais ou deslize para folhear. Sozinho, a vitrine avança automaticamente.
        </p>
        <button onClick={() => navigate(-1)} className="text-sm opacity-50 underline">Voltar ao app</button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950 overflow-hidden select-none"
      style={{ cursor: controlesVisiveis ? 'auto' : 'none' }}
      onMouseMove={registrarInteracao}
      onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null }}
      onTouchEnd={(e) => {
        const x0 = touchStartX.current
        const x1 = e.changedTouches[0]?.clientX ?? null
        touchStartX.current = null
        if (x0 != null && x1 != null && Math.abs(x1 - x0) > 50) {
          irPara(x1 < x0 ? 1 : -1)
        }
      }}
    >
      <Slide key={atual.id} produto={atual} />

      {/* Zonas de toque (esq / dir) — só registram navegação, sem visual */}
      <button aria-label="Anterior" onClick={() => irPara(-1)} className="absolute left-0 top-0 h-full w-1/4 z-20" />
      <button aria-label="Próximo" onClick={() => irPara(1)} className="absolute right-0 top-0 h-full w-1/4 z-20" />

      {/* Barra de progresso (tempo do slide) */}
      {!pausado && total > 1 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
          <div
            key={`${indice}-${pausado}`}
            className="h-full bg-blue-500"
            style={{ animation: `showroom-progress ${DURACAO_SLIDE}ms linear forwards` }}
          />
        </div>
      )}

      {/* Controles (somem na ociosidade) */}
      <div
        className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-6 pb-5 transition-opacity duration-500 ${
          controlesVisiveis ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button onClick={sair} className="px-4 py-2 rounded-full bg-black/40 text-white/80 text-sm backdrop-blur">✕ Sair</button>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm tabular-nums">{indice + 1} / {total}</span>
          <button onClick={togglePausa} className="w-11 h-11 rounded-full bg-black/40 text-white text-lg backdrop-blur">
            {pausado ? '▶' : '❚❚'}
          </button>
        </div>
      </div>

      {/* Pontinhos de posição */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 transition-opacity duration-500 ${controlesVisiveis ? 'opacity-100' : 'opacity-0'}`}>
        {produtos.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-white' : 'w-1.5 bg-white/30'}`} />
        ))}
      </div>

      <style>{`@keyframes showroom-progress { from { width: 0 } to { width: 100% } }`}</style>
    </div>
  )
}

// ---- Slide (1 produto em tela cheia) --------------------------------
function Slide({ produto }) {
  const fotos = useFotosProduto(produto)
  const [fotoIdx, setFotoIdx] = useState(0)

  // Mini-carrossel de fotos dentro do slide.
  useEffect(() => {
    setFotoIdx(0)
    if (fotos.length <= 1) return
    const t = setInterval(() => setFotoIdx((i) => (i + 1) % fotos.length), DURACAO_FOTO)
    return () => clearInterval(t)
  }, [fotos])

  const especs = useMemo(() => {
    const e = produto.especificacoes
    if (!e || typeof e !== 'object') return []
    return Object.entries(e).filter(([, v]) => v != null && v !== '').slice(0, 4)
  }, [produto])

  const args = Array.isArray(produto.argumentos_de_venda)
    ? produto.argumentos_de_venda.slice(0, 4)
    : []

  const fotoAtual = fotos[fotoIdx] || produto.foto_principal_url

  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row animate-fade-in">
      {/* Herói: foto */}
      <div className="relative flex-1 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center p-6 lg:p-12">
        {produto.marca?.nome && (
          <span className="absolute top-6 left-6 text-white/50 text-lg font-semibold tracking-wide uppercase">
            {produto.marca.nome}
          </span>
        )}
        <img
          key={fotoAtual}
          src={fotoAtual}
          alt={produto.titulo}
          className="max-h-full max-w-full object-contain drop-shadow-2xl animate-fade-in"
        />
        {fotos.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {fotos.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === fotoIdx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      {/* Painel de info */}
      <div className="lg:w-[38%] xl:w-[34%] bg-slate-900/95 text-white flex flex-col justify-center gap-5 p-8 lg:p-12">
        <div>
          {produto.categoria && CAT_LABEL[produto.categoria] && (
            <span className="inline-block px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 text-sm font-medium mb-3">
              {CAT_LABEL[produto.categoria]}
            </span>
          )}
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">{produto.titulo}</h1>
          {produto.subtitulo && (
            <p className="text-xl xl:text-2xl text-blue-300 mt-2">{produto.subtitulo}</p>
          )}
        </div>

        {produto.descricao && (
          <p className="text-base xl:text-lg text-white/70 leading-relaxed line-clamp-4">
            {produto.descricao}
          </p>
        )}

        {args.length > 0 && (
          <ul className="space-y-2">
            {args.map((a, i) => (
              <li key={i} className="flex gap-2 text-base xl:text-lg text-white/85">
                <span className="text-green-400 shrink-0">✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        )}

        {especs.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/10">
            {especs.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-white/40">{k}</dt>
                <dd className="text-lg font-semibold">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  )
}

// Junta a foto principal com as fotos extras (catalogo_midia, tipo foto).
const midiasCache = new Map()
function useFotosProduto(produto) {
  const [extras, setExtras] = useState([])

  useEffect(() => {
    let alive = true
    setExtras([])
    if (!produto?.id) return
    const cached = midiasCache.get(produto.id)
    if (cached) { setExtras(cached); return }
    getMidiasCatalogoProduto(produto.id).then((midias) => {
      if (!alive) return
      const fotos = (midias || []).filter((m) => m.tipo === 'foto').map((m) => m.url_publica)
      midiasCache.set(produto.id, fotos)
      setExtras(fotos)
    })
    return () => { alive = false }
  }, [produto?.id])

  return useMemo(() => {
    const principal = produto?.foto_principal_url ? [produto.foto_principal_url] : []
    return [...principal, ...extras.filter((u) => u !== produto?.foto_principal_url)]
  }, [produto?.foto_principal_url, extras])
}
