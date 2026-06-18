import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
// Fontes auto-hospedadas (offline puro no kiosk) — Archivo (display) + Inter (texto).
import '@fontsource/archivo/600.css'
import '@fontsource/archivo/700.css'
import '@fontsource/archivo/800.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import {
  getProdutosCatalogo, getMarcas, getMidiasCatalogoProduto,
  getVideosShowroom, getCategoriasAplicacao,
} from '../lib/catalogoSupabase'

// ====================================================================
// Modo Showroom / TV — vitrine digital do portfólio curado.
//
// Duas camadas na mesma tela:
//   • ATRAÇÃO (idle): roda sozinha em loop (fotos por marca + reel de vídeos).
//     Atrai quem passa; qualquer toque entra na navegação.
//   • NAVEGAÇÃO (interativa): o cliente explora por OPERAÇÃO ou por MARCA,
//     abre a ficha, vê fotos/vídeos/folheto no próprio tablet e, se quiser,
//     leva tudo no WhatsApp via QR. Após inatividade, volta sozinha pra atração.
//
// Tela cheia (kiosk), sem o chrome do Layout. Tema escuro "carvão quente"
// com acento vermelho Mahindra (spec de design do catálogo).
// ====================================================================

const DURACAO_SLIDE = 12000       // ms entre slides de foto (auto-rotação)
const DURACAO_SEPARADOR = 3500    // ms do slide-título de marca (capítulo)
const OCIOSIDADE_RETOMA = 30000   // ms parado até a atração voltar a rotacionar
const VOLTA_ATRACAO = 60000       // ms sem interação na navegação → volta pra atração
const DURACAO_FOTO = 4500         // ms do mini-carrossel dentro do slide de atração
const OCULTAR_CURSOR = 4000       // ms até esconder cursor/controles
const VIDEO_SEGURANCA = 120000    // ms máx num vídeo do reel (evita travar)

// Emoji por categoria de aplicação (fallback do ícone até termos um set próprio).
const ICONE_CATEGORIA = {
  tratores: '🚜', preparo_solo: '🌍', plantio_semeadura: '🌱',
  adubacao_distribuicao: '🧪', pulverizacao: '💧', forragem_pecuaria: '🐄',
  colheita: '🌾', transporte_movimentacao: '🚛', diversos: '📦',
  agricultura_precisao: '🛰️', atv_utv: '🏍️',
}

// Pra onde mandar ao tocar num produto/vídeo no app do vendedor (não no kiosk).
function basePathCatalogo() {
  return localStorage.getItem('vendedor') ? '/catalogo' : '/supervisor/catalogo'
}

// Extrai o número-herói de potência (CV/HP) das especificações ou do subtítulo.
function extrairPotencia(produto) {
  const e = produto?.especificacoes
  if (e && typeof e === 'object') {
    for (const [k, v] of Object.entries(e)) {
      if (v != null && v !== '' && /pot|cv|hp/i.test(k)) {
        const m = String(v).match(/(\d+[.,]?\d*)/)
        if (m) return { num: m[1].replace(',', '.'), unid: /hp/i.test(`${k}${v}`) ? 'HP' : 'CV' }
      }
    }
  }
  const m = String(produto?.subtitulo || '').match(/(\d+[.,]?\d*)\s*(cv|hp)/i)
  if (m) return { num: m[1].replace(',', '.'), unid: m[2].toUpperCase() }
  return null
}

const LABEL_CONDICAO = { novo: 'Novo', seminovo: 'Seminovo' }

export default function Showroom() {
  const navigate = useNavigate()
  const [produtos, setProdutos] = useState([])
  const [videos, setVideos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [iniciado, setIniciado] = useState(false)   // gesto inicial (fullscreen + wake lock)

  // ---- Atração (idle) ----
  const [indice, setIndice] = useState(0)
  const [pausado, setPausado] = useState(false)
  const [controlesVisiveis, setControlesVisiveis] = useState(true)
  const [listaAberta, setListaAberta] = useState(false)

  // ---- Navegação (interativa) ----
  const [view, setView] = useState('atracao')   // atracao | browse | lista | ficha
  const [eixo, setEixo] = useState('operacao')  // operacao | marca
  const [contexto, setContexto] = useState(null) // { tipo, id, label } da listagem
  const [fichaProduto, setFichaProduto] = useState(null)
  const [busca, setBusca] = useState('')

  const wakeLockRef = useRef(null)
  const ociosoTimerRef = useRef(null)
  const cursorTimerRef = useRef(null)
  const voltaTimerRef = useRef(null)
  const touchStartX = useRef(null)

  // ---- Carregamento -------------------------------------------------
  useEffect(() => {
    let alive = true
    Promise.all([getProdutosCatalogo(), getMarcas(), getVideosShowroom(), getCategoriasAplicacao()])
      .then(([prods, marcas, vids, cats]) => {
        if (!alive) return
        const marcaById = new Map(marcas.map((m) => [m.id, m]))
        const lista = prods.map((p) => ({ ...p, marca: p.marca || marcaById.get(p.marca_id) || null }))
        setProdutos(lista)
        setVideos(vids || [])
        setCategorias(cats || [])
        setCarregando(false)
      })
    return () => { alive = false }
  }, [])

  // Só produtos com foto entram no slideshow de atração.
  const produtosComFoto = useMemo(() => produtos.filter((p) => p.foto_principal_url), [produtos])

  // Categorias de operação que de fato têm ficha (não mostra porta vazia).
  const categoriasPresentes = useMemo(() => {
    const cont = new Map()
    for (const p of produtos) {
      if (!p.categoria_aplicacao) continue
      cont.set(p.categoria_aplicacao, (cont.get(p.categoria_aplicacao) || 0) + 1)
    }
    return categorias
      .filter((c) => cont.has(c.id))
      .map((c) => ({ ...c, qtd: cont.get(c.id) }))
  }, [produtos, categorias])

  // Marcas que têm ficha.
  const marcasPresentes = useMemo(() => {
    const mapa = new Map()
    for (const p of produtos) {
      const m = p.marca
      if (!m?.id) continue
      if (!mapa.has(m.id)) mapa.set(m.id, { ...m, qtd: 0 })
      mapa.get(m.id).qtd++
    }
    return [...mapa.values()].sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99) || a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [produtos])

  // Produtos filtrados pelo contexto da listagem (categoria, marca ou busca).
  const produtosListados = useMemo(() => {
    if (!contexto) return []
    if (contexto.tipo === 'categoria') return produtos.filter((p) => p.categoria_aplicacao === contexto.id)
    if (contexto.tipo === 'marca') return produtos.filter((p) => p.marca?.id === contexto.id)
    if (contexto.tipo === 'busca') {
      const q = (busca || '').trim().toLowerCase()
      if (!q) return produtos
      return produtos.filter((p) =>
        p.titulo?.toLowerCase().includes(q) ||
        p.subtitulo?.toLowerCase().includes(q) ||
        p.marca?.nome?.toLowerCase().includes(q) ||
        p.descricao?.toLowerCase().includes(q)
      )
    }
    return []
  }, [contexto, produtos, busca])

  // ---- Slides da atração (produtos por marca + vídeos intercalados) ----
  const slides = useMemo(() => {
    const base = []
    let marcaAtual = null
    produtosComFoto.forEach((p) => {
      const nomeMarca = p.marca?.nome || null
      if (nomeMarca && nomeMarca !== marcaAtual) {
        base.push({ kind: 'separador', key: `sep-${p.id}`, titulo: nomeMarca })
        marcaAtual = nomeMarca
      }
      base.push({ kind: 'foto', key: `p${p.id}`, produto: p })
    })
    const videoSlides = videos.map((v) => ({ kind: 'video', key: `v${v.id}`, video: v }))
    if (!videoSlides.length) return base
    if (!base.length) return videoSlides
    const out = []
    const gap = Math.max(1, Math.floor(base.length / videoSlides.length))
    let vi = 0
    base.forEach((s, i) => {
      out.push(s)
      if (vi < videoSlides.length && (i + 1) % gap === 0) out.push(videoSlides[vi++])
    })
    while (vi < videoSlides.length) out.push(videoSlides[vi++])
    return out
  }, [produtosComFoto, videos])

  const total = slides.length
  const atual = slides[Math.min(indice, total - 1)] || null
  const naAtracao = view === 'atracao'

  const avancar = useCallback((delta) => {
    setIndice((i) => (total ? (i + delta + total) % total : 0))
  }, [total])

  // ---- Auto-rotação da atração (pausa quando navegando) -------------
  useEffect(() => {
    if (!iniciado || !naAtracao || pausado || total <= 1) return
    const kind = slides[indice]?.kind
    if (kind === 'video') return
    const dur = kind === 'separador' ? DURACAO_SEPARADOR : DURACAO_SLIDE
    const t = setTimeout(() => setIndice((i) => (i + 1) % total), dur)
    return () => clearTimeout(t)
  }, [iniciado, naAtracao, pausado, total, indice, slides])

  // Pré-carrega a próxima foto.
  useEffect(() => {
    if (!total || !naAtracao) return
    const prox = slides[(indice + 1) % total]
    if (prox?.kind === 'foto' && prox.produto?.foto_principal_url) {
      const img = new Image()
      img.src = prox.produto.foto_principal_url
    }
  }, [indice, total, slides, naAtracao])

  // ---- Inatividade -------------------------------------------------
  // Na atração: pausa manual ao interagir e retoma após ociosidade.
  const registrarInteracaoAtracao = useCallback(() => {
    setControlesVisiveis(true)
    setPausado(true)
    if (ociosoTimerRef.current) clearTimeout(ociosoTimerRef.current)
    ociosoTimerRef.current = setTimeout(() => setPausado(false), OCIOSIDADE_RETOMA)
    if (cursorTimerRef.current) clearTimeout(cursorTimerRef.current)
    cursorTimerRef.current = setTimeout(() => setControlesVisiveis(false), OCULTAR_CURSOR)
  }, [])

  const resetNavegacao = useCallback(() => {
    setView('atracao')
    setContexto(null)
    setFichaProduto(null)
    setBusca('')
    setPausado(false)
  }, [])

  // Na navegação: timer que volta sozinho pra atração.
  const adiarVoltaAtracao = useCallback(() => {
    if (voltaTimerRef.current) clearTimeout(voltaTimerRef.current)
    voltaTimerRef.current = setTimeout(resetNavegacao, VOLTA_ATRACAO)
  }, [resetNavegacao])

  useEffect(() => {
    if (naAtracao) { if (voltaTimerRef.current) clearTimeout(voltaTimerRef.current); return }
    adiarVoltaAtracao()
    return () => { if (voltaTimerRef.current) clearTimeout(voltaTimerRef.current) }
  }, [naAtracao, view, contexto, fichaProduto, adiarVoltaAtracao])

  const irPara = useCallback((delta) => {
    avancar(delta)
    registrarInteracaoAtracao()
  }, [avancar, registrarInteracaoAtracao])

  const togglePausa = useCallback(() => {
    if (ociosoTimerRef.current) clearTimeout(ociosoTimerRef.current)
    setPausado((p) => !p)
    setControlesVisiveis(true)
  }, [])

  // ---- Navegação ----------------------------------------------------
  const abrirBrowse = useCallback((eixoInicial) => {
    if (eixoInicial) setEixo(eixoInicial)
    setView('browse')
  }, [])

  const abrirLista = useCallback((ctx) => {
    setContexto(ctx)
    setView('lista')
  }, [])

  const abrirFicha = useCallback((produto) => {
    setFichaProduto(produto)
    setView('ficha')
  }, [])

  const voltar = useCallback(() => {
    if (view === 'ficha') { setView('lista'); setFichaProduto(null); return }
    if (view === 'lista') { setView('browse'); setContexto(null); return }
    resetNavegacao()
  }, [view, resetNavegacao])

  // ---- Iniciar / Sair / wake lock -----------------------------------
  const pedirWakeLock = useCallback(async () => {
    try { if ('wakeLock' in navigator) wakeLockRef.current = await navigator.wakeLock.request('screen') }
    catch { /* alguns devices recusam; ignora */ }
  }, [])

  const liberarTela = useCallback(() => {
    try { if (document.fullscreenElement) document.exitFullscreen?.() } catch { /* ignora */ }
    try { wakeLockRef.current?.release() } catch { /* ignora */ }
  }, [])

  const sair = useCallback(() => { liberarTela(); navigate(-1) }, [liberarTela, navigate])

  const iniciar = useCallback(async () => {
    try { await document.documentElement.requestFullscreen?.() } catch { /* ignora */ }
    await pedirWakeLock()
    setIniciado(true)
    registrarInteracaoAtracao()
  }, [pedirWakeLock, registrarInteracaoAtracao])

  // Teclado (controle remoto / setas) — só na atração.
  useEffect(() => {
    if (!iniciado) return
    const onKey = (e) => {
      if (e.key === 'Escape') { naAtracao ? sair() : voltar(); return }
      if (!naAtracao) return
      if (e.key === 'ArrowRight') irPara(1)
      else if (e.key === 'ArrowLeft') irPara(-1)
      else if (e.key === ' ') { e.preventDefault(); togglePausa() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [iniciado, naAtracao, irPara, togglePausa, sair, voltar])

  // Esconde cursor/controles depois da ociosidade na atração.
  useEffect(() => {
    if (!iniciado || !naAtracao) { setControlesVisiveis(true); return }
    cursorTimerRef.current = setTimeout(() => setControlesVisiveis(false), OCULTAR_CURSOR)
    return () => cursorTimerRef.current && clearTimeout(cursorTimerRef.current)
  }, [iniciado, naAtracao])

  // Wake Lock: reabre ao voltar pro app; libera ao desmontar.
  useEffect(() => {
    if (!iniciado) return
    const onVisible = () => { if (document.visibilityState === 'visible') pedirWakeLock() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      try { wakeLockRef.current?.release() } catch { /* ignora */ }
      wakeLockRef.current = null
    }
  }, [iniciado, pedirWakeLock])

  // ---- Render -------------------------------------------------------
  if (carregando) {
    return (
      <div className="fixed inset-0 bg-[#15110E] text-[#F5F1EC] flex items-center justify-center sw-body">
        <p className="text-2xl text-[#B5ADA3]">Carregando catálogo…</p>
        <FontesShowroom />
      </div>
    )
  }

  if (total === 0) {
    return (
      <div className="fixed inset-0 bg-[#15110E] text-[#F5F1EC] flex flex-col items-center justify-center gap-4 sw-body">
        <p className="text-3xl">Nada pra exibir no Showroom ainda</p>
        <button onClick={() => navigate(-1)} className="px-5 py-3 rounded-xl bg-[#211C17] text-lg">Voltar</button>
        <FontesShowroom />
      </div>
    )
  }

  if (!iniciado) {
    return (
      <div className="fixed inset-0 bg-[#15110E] text-[#F5F1EC] flex flex-col items-center justify-center gap-8 px-6 text-center sw-body">
        <div>
          <p className="text-4xl md:text-5xl font-bold mb-3 sw-display">Vitrine Nova Tratores</p>
          <p className="text-xl text-[#B5ADA3]">
            {produtos.length} máquinas{videos.length ? ` · ${videos.length} vídeos` : ''}
          </p>
        </div>
        <button onClick={iniciar} className="px-10 py-5 rounded-2xl bg-[#E11B22] hover:bg-[#A3141A] text-2xl font-semibold shadow-lg active:scale-95 transition">
          ▶ Iniciar apresentação
        </button>
        <p className="text-sm text-[#8C8478] max-w-md">
          Toque na tela para explorar por operação ou marca. Sozinha, a vitrine avança automaticamente.
        </p>
        <button onClick={() => navigate(-1)} className="text-sm text-[#8C8478] underline">Voltar ao app</button>
        <FontesShowroom />
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-[#15110E] overflow-hidden select-none sw-body"
      style={{ cursor: naAtracao && !controlesVisiveis ? 'none' : 'auto' }}
      onPointerDown={() => { if (!naAtracao) adiarVoltaAtracao() }}
    >
      {naAtracao ? (
        <div
          className="absolute inset-0"
          onMouseMove={registrarInteracaoAtracao}
          onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null }}
          onTouchEnd={(e) => {
            const x0 = touchStartX.current
            const x1 = e.changedTouches[0]?.clientX ?? null
            touchStartX.current = null
            if (x0 != null && x1 != null && Math.abs(x1 - x0) > 50) irPara(x1 < x0 ? 1 : -1)
          }}
        >
          {atual?.kind === 'video' ? (
            <VideoSlide
              key={atual.key}
              video={atual.video}
              pausado={pausado}
              onEnded={() => { if (!pausado) avancar(1) }}
              onAbrir={() => { const p = produtos.find((x) => x.slug === atual.video.ref); if (p) abrirFicha(p) }}
            />
          ) : atual?.kind === 'separador' ? (
            <Separador key={atual.key} titulo={atual.titulo} />
          ) : (
            <Slide key={atual.key} produto={atual.produto} onAbrir={() => abrirFicha(atual.produto)} />
          )}

          {/* Zonas de toque laterais (folhear) */}
          <button aria-label="Anterior" onClick={() => irPara(-1)} className="absolute left-0 top-0 h-full w-1/6 z-20" />
          <button aria-label="Próximo" onClick={() => irPara(1)} className="absolute right-0 top-0 h-full w-1/6 z-20" />

          {/* Convite central pra entrar na navegação */}
          <button
            onClick={() => abrirBrowse('operacao')}
            className={`absolute left-1/2 bottom-24 -translate-x-1/2 z-30 px-6 py-3 rounded-full bg-[#E11B22] text-white text-base font-semibold shadow-lg active:scale-95 transition-opacity duration-500 ${controlesVisiveis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            Explorar máquinas →
          </button>

          {/* Barra de progresso (só em slide de foto) */}
          {!pausado && total > 1 && atual?.kind === 'foto' && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 z-30">
              <div key={indice} className="h-full bg-[#E11B22]" style={{ animation: `showroom-progress ${DURACAO_SLIDE}ms linear forwards` }} />
            </div>
          )}

          {/* Controles inferiores */}
          <div className={`absolute inset-x-0 bottom-0 z-30 flex items-center justify-between px-6 pb-5 transition-opacity duration-500 ${controlesVisiveis ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <button onClick={sair} className="px-4 py-2 rounded-full bg-black/40 text-[#B5ADA3] text-sm backdrop-blur">✕ Sair</button>
            <div className="flex items-center gap-3">
              {videos.length > 0 && (
                <button onClick={() => { setListaAberta(true); registrarInteracaoAtracao() }} className="px-4 py-2 rounded-full bg-black/40 text-[#B5ADA3] text-sm backdrop-blur">
                  🎬 Vídeos ({videos.length})
                </button>
              )}
              <span className="text-[#8C8478] text-sm tabular-nums">{Math.min(indice + 1, total)} / {total}</span>
              <button onClick={togglePausa} className="w-11 h-11 rounded-full bg-black/40 text-white text-lg backdrop-blur">
                {pausado ? '▶' : '❚❚'}
              </button>
            </div>
          </div>

          {/* Pontinhos de posição */}
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 transition-opacity duration-500 ${controlesVisiveis ? 'opacity-100' : 'opacity-0'}`}>
            {slides.map((s, i) => (
              <span key={s.key} className={`h-1.5 rounded-full transition-all ${i === indice ? 'w-5 bg-white' : `w-1.5 ${s.kind === 'video' ? 'bg-amber-400/50' : 'bg-white/30'}`}`} />
            ))}
          </div>

          {listaAberta && (
            <ListaVideos
              videos={videos}
              onFechar={() => setListaAberta(false)}
              onEscolher={(v) => { const p = produtos.find((x) => x.slug === v.ref); setListaAberta(false); if (p) abrirFicha(p) }}
            />
          )}
        </div>
      ) : view === 'browse' ? (
        <BrowseView
          eixo={eixo}
          setEixo={setEixo}
          categorias={categoriasPresentes}
          marcas={marcasPresentes}
          busca={busca}
          setBusca={setBusca}
          onAbrirCategoria={(c) => abrirLista({ tipo: 'categoria', id: c.id, label: c.nome })}
          onAbrirMarca={(m) => abrirLista({ tipo: 'marca', id: m.id, label: m.nome })}
          onBuscar={() => abrirLista({ tipo: 'busca', id: null, label: 'Busca' })}
          onSair={resetNavegacao}
        />
      ) : view === 'lista' ? (
        <ListaView
          contexto={contexto}
          produtos={produtosListados}
          busca={busca}
          setBusca={setBusca}
          onAbrir={abrirFicha}
          onVoltar={voltar}
        />
      ) : view === 'ficha' ? (
        <FichaView produto={fichaProduto} onVoltar={voltar} onInteracao={adiarVoltaAtracao} />
      ) : null}

      <FontesShowroom />
    </div>
  )
}

// Carrega Archivo (display) + Inter (texto) e define keyframes/utilitários.
function FontesShowroom() {
  return (
    <style>{`
      .sw-display { font-family: 'Archivo', system-ui, sans-serif; }
      .sw-body { font-family: 'Inter', system-ui, sans-serif; }
      @keyframes showroom-progress { from { width: 0 } to { width: 100% } }
    `}</style>
  )
}

// ====================================================================
// NAVEGAÇÃO — Browse (operação ↔ marca)
// ====================================================================
function BrowseView({ eixo, setEixo, categorias, marcas, busca, setBusca, onAbrirCategoria, onAbrirMarca, onBuscar, onSair }) {
  return (
    <div className="absolute inset-0 bg-[#15110E] text-[#F5F1EC] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-8 lg:px-12 pt-8 pb-4">
        <div>
          <p className="text-[#8C8478] text-sm uppercase tracking-[0.2em] sw-body">Vitrine Nova Tratores</p>
          <h1 className="text-3xl lg:text-4xl font-bold sw-display">Explorar máquinas</h1>
        </div>
        <button onClick={onSair} className="px-5 py-3 rounded-full bg-[#211C17] text-[#B5ADA3] text-sm">✕ Sair</button>
      </div>

      {/* Toggle de eixo + busca */}
      <div className="px-8 lg:px-12 pb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full bg-[#211C17] p-1">
          <SegBtn ativo={eixo === 'operacao'} onClick={() => setEixo('operacao')}>Por operação</SegBtn>
          <SegBtn ativo={eixo === 'marca'} onClick={() => setEixo('marca')}>Por marca</SegBtn>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onBuscar() }}
          className="flex-1 min-w-[220px] max-w-md flex items-center gap-2 bg-[#211C17] rounded-full px-4 py-2.5"
        >
          <span className="text-[#8C8478]">🔍</span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, marca…"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-[#8C8478]"
          />
          {busca && <button type="submit" className="text-[#E11B22] text-sm font-semibold">Buscar</button>}
        </form>
      </div>

      {/* Grade */}
      <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-12">
        {eixo === 'operacao' ? (
          categorias.length === 0 ? (
            <Vazio texto="Nenhuma operação com máquina ainda" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onAbrirCategoria(c)}
                  className="group bg-[#211C17] hover:bg-[#2C261F] rounded-2xl p-6 text-left transition active:scale-[0.98] border border-transparent hover:border-[#E11B22]/40"
                >
                  <div className="text-5xl mb-4">{ICONE_CATEGORIA[c.id] || '🔧'}</div>
                  <p className="text-xl font-semibold sw-display leading-tight">{c.nome}</p>
                  <p className="text-[#8C8478] text-sm mt-1">{c.qtd} {c.qtd === 1 ? 'máquina' : 'máquinas'}</p>
                </button>
              ))}
            </div>
          )
        ) : (
          marcas.length === 0 ? (
            <Vazio texto="Nenhuma marca com máquina ainda" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {marcas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => onAbrirMarca(m)}
                  className="group bg-[#211C17] hover:bg-[#2C261F] rounded-2xl p-6 flex flex-col items-center justify-center gap-3 h-40 transition active:scale-[0.98] border border-transparent hover:border-[#E11B22]/40"
                >
                  {m.logo_url ? (
                    <img src={m.logo_url} alt={m.nome} className="max-h-16 max-w-[70%] object-contain" loading="lazy" />
                  ) : (
                    <span className="text-2xl font-bold sw-display uppercase tracking-wide text-center">{m.nome}</span>
                  )}
                  <span className="text-[#8C8478] text-sm">{m.qtd} {m.qtd === 1 ? 'máquina' : 'máquinas'}</span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

function SegBtn({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-full text-sm font-semibold transition ${ativo ? 'bg-[#E11B22] text-white' : 'text-[#B5ADA3]'}`}
    >
      {children}
    </button>
  )
}

function Vazio({ texto }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-20">
      <p className="text-5xl">🚜</p>
      <p className="text-[#B5ADA3] text-lg">{texto}</p>
    </div>
  )
}

// ====================================================================
// NAVEGAÇÃO — Listagem
// ====================================================================
function ListaView({ contexto, produtos, busca, setBusca, onAbrir, onVoltar }) {
  return (
    <div className="absolute inset-0 bg-[#15110E] text-[#F5F1EC] flex flex-col animate-fade-in">
      <div className="flex items-center gap-4 px-8 lg:px-12 pt-8 pb-4">
        <button onClick={onVoltar} className="px-4 py-2.5 rounded-full bg-[#211C17] text-[#B5ADA3] text-sm">← Voltar</button>
        <div className="flex-1">
          <p className="text-[#8C8478] text-sm uppercase tracking-[0.2em]">{contexto?.tipo === 'marca' ? 'Marca' : contexto?.tipo === 'busca' ? 'Busca' : 'Operação'}</p>
          <h1 className="text-2xl lg:text-3xl font-bold sw-display leading-tight">{contexto?.label}</h1>
        </div>
        <span className="text-[#8C8478] text-sm">{produtos.length} {produtos.length === 1 ? 'máquina' : 'máquinas'}</span>
      </div>

      {contexto?.tipo === 'busca' && (
        <div className="px-8 lg:px-12 pb-3">
          <div className="flex items-center gap-2 bg-[#211C17] rounded-full px-4 py-2.5 max-w-md">
            <span className="text-[#8C8478]">🔍</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              autoFocus
              placeholder="Buscar por nome, marca…"
              className="flex-1 bg-transparent outline-none text-base placeholder:text-[#8C8478]"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-12">
        {produtos.length === 0 ? (
          <Vazio texto="Nenhuma máquina aqui — fale com um vendedor" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {produtos.map((p) => <CardMaquina key={p.id} produto={p} onAbrir={() => onAbrir(p)} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function CardMaquina({ produto, onAbrir }) {
  const pot = extrairPotencia(produto)
  return (
    <button
      onClick={onAbrir}
      className="group bg-[#211C17] hover:bg-[#2C261F] rounded-2xl overflow-hidden text-left transition active:scale-[0.98] border border-transparent hover:border-[#E11B22]/40"
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-[#2C261F] to-[#15110E] flex items-center justify-center overflow-hidden relative">
        {produto.foto_principal_url ? (
          <img src={produto.foto_principal_url} alt={produto.titulo} className="w-full h-full object-contain p-2" loading="lazy" />
        ) : (
          <span className="text-4xl">📷</span>
        )}
        {LABEL_CONDICAO[produto.condicao] && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur text-[#F5F1EC] text-[11px] font-medium">
            {LABEL_CONDICAO[produto.condicao]}
          </span>
        )}
      </div>
      <div className="p-3">
        {produto.marca?.nome && <p className="text-[#8C8478] text-[11px] uppercase tracking-wide">{produto.marca.nome}</p>}
        <p className="font-semibold leading-tight sw-display">{produto.titulo}</p>
        {pot && (
          <p className="mt-1 text-[#E11B22] font-bold sw-display">
            {pot.num}<span className="text-xs font-semibold text-[#B5ADA3] ml-1">{pot.unid}</span>
          </p>
        )}
      </div>
    </button>
  )
}

// ====================================================================
// NAVEGAÇÃO — Ficha da máquina (fotos, vídeos, folheto, QR)
// ====================================================================
function FichaView({ produto, onVoltar, onInteracao }) {
  const [midias, setMidias] = useState([])
  const [overlay, setOverlay] = useState(null)  // { tipo:'galeria'|'video'|'folheto'|'qr', ... }
  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  useEffect(() => {
    if (!produto?.id) return
    let alive = true
    setMidias([])
    getMidiasCatalogoProduto(produto.id, { contexto: 'vendedor' }).then((m) => { if (alive) setMidias(m || []) })
    return () => { alive = false }
  }, [produto?.id])

  const fotos = useMemo(() => {
    const extras = midias.filter((m) => m.tipo === 'foto' && m.url_publica).map((m) => m.url_publica)
    const principal = produto?.foto_principal_url ? [produto.foto_principal_url] : []
    return [...principal, ...extras.filter((u) => u !== produto?.foto_principal_url)]
  }, [midias, produto])

  const videos = useMemo(() => midias.filter((m) => m.tipo === 'video' && m.url_publica), [midias])
  const folhetoUrl = produto?.folheto_url || midias.find((m) => m.tipo === 'pdf')?.url_publica || null

  const pot = extrairPotencia(produto)
  const args = Array.isArray(produto?.argumentos_de_venda) ? produto.argumentos_de_venda.slice(0, 4) : []
  const especs = useMemo(() => {
    const e = produto?.especificacoes
    if (!e || typeof e !== 'object') return []
    return Object.entries(e).filter(([, v]) => v != null && v !== '').slice(0, 4)
  }, [produto])

  if (!produto) return null

  return (
    <div className="absolute inset-0 bg-[#15110E] text-[#F5F1EC] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-8 lg:px-12 pt-6 pb-3 shrink-0">
        <button onClick={onVoltar} className="px-4 py-2.5 rounded-full bg-[#211C17] text-[#B5ADA3] text-sm">← Voltar</button>
        {produto.marca?.nome && (
          <span className="text-[#B5ADA3] text-sm uppercase tracking-wide font-semibold">{produto.marca.nome}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto lg:overflow-hidden lg:flex">
        {/* Hero — foto principal */}
        <div className="relative lg:w-[54%] bg-gradient-to-br from-[#2C261F] to-[#15110E] flex items-center justify-center p-6 lg:p-12 min-h-[36vh]">
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#E11B22]" />
          {fotos[0] ? (
            <img src={fotos[0]} alt={produto.titulo} className="max-h-full max-w-full object-contain drop-shadow-2xl" />
          ) : (
            <span className="text-6xl">📷</span>
          )}
          {LABEL_CONDICAO[produto.condicao] && (
            <span className="absolute top-5 right-5 px-3 py-1 rounded-full bg-black/50 backdrop-blur text-sm font-medium">
              {LABEL_CONDICAO[produto.condicao]}
            </span>
          )}
        </div>

        {/* Conteúdo */}
        <div className="lg:w-[46%] flex flex-col gap-5 p-6 lg:p-10 lg:overflow-y-auto">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold sw-display leading-tight">{produto.titulo}</h1>
            {produto.subtitulo && <p className="text-lg text-[#B5ADA3] mt-1">{produto.subtitulo}</p>}
          </div>

          {pot && (
            <div className="flex items-end gap-2">
              <span className="text-[#E11B22] font-extrabold sw-display leading-none" style={{ fontSize: '5rem' }}>{pot.num}</span>
              <div className="mb-2">
                <span className="text-2xl font-bold sw-display">{pot.unid}</span>
                <p className="text-[#8C8478] text-xs uppercase tracking-wide">Potência</p>
              </div>
            </div>
          )}

          {args.length > 0 && (
            <ul className="space-y-2">
              {args.map((a, i) => (
                <li key={i} className="flex gap-2 text-base lg:text-lg text-[#F5F1EC]">
                  <span className="text-[#E11B22] shrink-0 font-bold">✓</span><span>{a}</span>
                </li>
              ))}
            </ul>
          )}

          {especs.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/10">
              {especs.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] uppercase tracking-wide text-[#8C8478]">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-lg font-semibold sw-display">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Ações de mídia — só aparecem se a mídia existe (gate da spec) */}
          <div className="flex flex-wrap gap-3 pt-2">
            {fotos.length > 0 && (
              <BotaoMidia onClick={() => { setOverlay({ tipo: 'galeria' }); onInteracao?.() }}>
                📷 Fotos ({fotos.length})
              </BotaoMidia>
            )}
            {videos.length > 0 && online && (
              <BotaoMidia onClick={() => { setOverlay({ tipo: 'video', idx: 0 }); onInteracao?.() }}>
                ▶ Vídeo{videos.length > 1 ? `s (${videos.length})` : ''}
              </BotaoMidia>
            )}
            {folhetoUrl && (
              <BotaoMidia onClick={() => { setOverlay({ tipo: 'folheto' }); onInteracao?.() }}>
                📄 Folheto técnico
              </BotaoMidia>
            )}
          </div>

          {/* Bloco QR — levar a ficha no WhatsApp */}
          <button
            onClick={() => { setOverlay({ tipo: 'qr' }); onInteracao?.() }}
            className="mt-auto flex items-center gap-4 bg-[#211C17] hover:bg-[#2C261F] rounded-2xl p-4 text-left transition active:scale-[0.99]"
          >
            <span className="w-14 h-14 rounded-xl bg-white flex items-center justify-center text-3xl shrink-0">▣</span>
            <div>
              <p className="font-semibold sw-display">Levar no WhatsApp</p>
              <p className="text-[#8C8478] text-sm">Aponte a câmera e leve fotos e folheto com você</p>
            </div>
          </button>
        </div>
      </div>

      {overlay?.tipo === 'galeria' && <GaleriaOverlay fotos={fotos} titulo={produto.titulo} onFechar={() => setOverlay(null)} onInteracao={onInteracao} />}
      {overlay?.tipo === 'video' && <VideoOverlay videos={videos} onFechar={() => setOverlay(null)} onInteracao={onInteracao} />}
      {overlay?.tipo === 'folheto' && <FolhetoOverlay url={folhetoUrl} onFechar={() => setOverlay(null)} />}
      {overlay?.tipo === 'qr' && <QROverlay produto={produto} folhetoUrl={folhetoUrl} onFechar={() => setOverlay(null)} />}
    </div>
  )
}

function BotaoMidia({ onClick, children }) {
  return (
    <button onClick={onClick} className="px-5 py-3 rounded-xl bg-[#211C17] hover:bg-[#2C261F] text-[#F5F1EC] font-medium text-sm transition active:scale-[0.98] border border-white/10">
      {children}
    </button>
  )
}

// ---- Overlay: galeria de fotos --------------------------------------
function GaleriaOverlay({ fotos, titulo, onFechar, onInteracao }) {
  const [idx, setIdx] = useState(0)
  const touchX = useRef(null)
  const ir = (d) => { setIdx((i) => (i + d + fotos.length) % fotos.length); onInteracao?.() }
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-5 text-white shrink-0">
        <span className="text-sm text-white/70">{titulo} · {idx + 1}/{fotos.length}</span>
        <button onClick={onFechar} className="px-4 py-2 rounded-full bg-white/10 text-sm">Fechar ✕</button>
      </div>
      <div
        className="flex-1 flex items-center justify-center relative px-4 pb-6"
        onTouchStart={(e) => { touchX.current = e.touches[0]?.clientX ?? null }}
        onTouchEnd={(e) => {
          const x0 = touchX.current, x1 = e.changedTouches[0]?.clientX ?? null
          touchX.current = null
          if (x0 != null && x1 != null && Math.abs(x1 - x0) > 50) ir(x1 < x0 ? 1 : -1)
        }}
      >
        {fotos.length > 1 && <button onClick={() => ir(-1)} className="absolute left-4 text-white/70 text-5xl px-3">‹</button>}
        <img src={fotos[idx]} alt="" className="max-h-full max-w-full object-contain" />
        {fotos.length > 1 && <button onClick={() => ir(1)} className="absolute right-4 text-white/70 text-5xl px-3">›</button>}
      </div>
      {fotos.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-6">
          {fotos.map((_, i) => <span key={i} className={`w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/30'}`} />)}
        </div>
      )}
    </div>
  )
}

// ---- Overlay: player de vídeo ---------------------------------------
function VideoOverlay({ videos, onFechar, onInteracao }) {
  const [idx, setIdx] = useState(0)
  const v = videos[idx]
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-5 text-white shrink-0">
        <span className="text-sm text-white/70">{v?.titulo || 'Vídeo'}{videos.length > 1 ? ` · ${idx + 1}/${videos.length}` : ''}</span>
        <button onClick={onFechar} className="px-4 py-2 rounded-full bg-white/10 text-sm">Fechar ✕</button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-4">
        <video key={v?.url_publica} src={v?.url_publica} controls autoPlay playsInline className="max-h-full max-w-full" onPlay={onInteracao} />
      </div>
      {videos.length > 1 && (
        <div className="flex justify-center gap-2 pb-6">
          {videos.map((_, i) => (
            <button key={i} onClick={() => setIdx(i)} className={`w-3 h-3 rounded-full ${i === idx ? 'bg-[#E11B22]' : 'bg-white/30'}`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Overlay: folheto (PDF embutido no tablet) ----------------------
function FolhetoOverlay({ url, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 bg-[#15110E] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between p-5 text-white shrink-0">
        <span className="text-sm text-white/70">📄 Folheto técnico</span>
        <button onClick={onFechar} className="px-4 py-2 rounded-full bg-white/10 text-sm">Fechar ✕</button>
      </div>
      <iframe src={url} title="Folheto técnico" className="flex-1 w-full bg-white" />
    </div>
  )
}

// ---- Overlay: QR pra levar no WhatsApp -------------------------------
// PLACEHOLDER: o QR ainda NÃO é gerado/funcional. Mantido aqui só pra
// reservar o espaço no design e lembrarmos de ligar depois. Quando a vitrine
// pública (WordPress / vw_catalogo_publico) estiver no ar, gerar um QR real
// apontando pra página do produto (fotos + vídeo + folheto). Ver libs: 'qrcode'.
function QROverlay({ produto, folhetoUrl, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in" onClick={onFechar}>
      <div className="bg-[#211C17] rounded-3xl p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-2xl font-bold sw-display text-[#F5F1EC]">Leve no WhatsApp</h3>
        <p className="text-[#B5ADA3] text-sm mt-1 mb-6">Aponte a câmera do seu celular para o código</p>
        <div className="bg-white rounded-2xl p-5 inline-block relative">
          {/* Placeholder visual — QR de verdade vem depois */}
          <div className="w-60 h-60 rounded-xl border-2 border-dashed border-[#8C8478]/40 grid grid-cols-3 grid-rows-3 gap-2 p-4 opacity-40">
            <div className="bg-[#15110E] rounded" /><div /><div className="bg-[#15110E] rounded" />
            <div /><div className="bg-[#15110E] rounded" /><div />
            <div className="bg-[#15110E] rounded" /><div /><div className="bg-[#15110E] rounded" />
          </div>
          <span className="absolute inset-0 flex items-center justify-center text-[#15110E] text-sm font-semibold">em breve</span>
        </div>
        <p className="text-[#F5F1EC] font-semibold sw-display mt-5">{produto.titulo}</p>
        {folhetoUrl && <p className="text-[#8C8478] text-sm mt-1">Vai incluir o folheto técnico</p>}
        <button onClick={onFechar} className="mt-6 px-6 py-3 rounded-full bg-[#2C261F] text-[#B5ADA3] text-sm">Fechar</button>
      </div>
    </div>
  )
}

// ====================================================================
// ATRAÇÃO — slides (reusados do modo idle)
// ====================================================================
function Separador({ titulo }) {
  return (
    <div className="absolute inset-0 bg-[#15110E] flex flex-col items-center justify-center animate-fade-in">
      <p className="text-[#8C8478] text-xl uppercase tracking-[0.3em] mb-4 sw-body">Marca</p>
      <h2 className="text-[#F5F1EC] text-6xl lg:text-8xl font-bold tracking-tight uppercase text-center px-6 sw-display">{titulo}</h2>
    </div>
  )
}

function VideoSlide({ video, pausado, onEnded, onAbrir }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.muted = true
    if (pausado) { el.pause(); return }
    const p = el.play()
    if (p?.catch) p.catch(() => { /* autoplay pode falhar; ignora */ })
  }, [video, pausado])

  useEffect(() => {
    if (pausado) return
    const t = setTimeout(() => onEnded?.(), VIDEO_SEGURANCA)
    return () => clearTimeout(t)
  }, [video, pausado, onEnded])

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center animate-fade-in" onClick={onAbrir}>
      <video ref={ref} src={video.url_publica} className="max-h-full max-w-full" muted autoPlay playsInline onEnded={onEnded} />
      <div className="absolute bottom-0 inset-x-0 p-8 lg:p-12 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
        {video.marca && <p className="text-[#B5ADA3] text-lg font-semibold uppercase tracking-wide sw-body">{video.marca}</p>}
        <p className="text-white text-3xl lg:text-5xl font-bold leading-tight sw-display">{video.titulo || video.subtitulo || ''}</p>
        <p className="text-white/60 text-sm mt-2">▶ Toque para ver a ficha</p>
      </div>
    </div>
  )
}

function ListaVideos({ videos, onFechar, onEscolher }) {
  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur flex flex-col p-6 lg:p-12 animate-fade-in" onClick={onFechar}>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white text-2xl font-bold sw-display">Vídeos</h2>
        <button onClick={onFechar} className="px-4 py-2 rounded-full bg-white/10 text-white text-sm">Fechar</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {videos.map((v) => (
          <button key={v.id} onClick={() => onEscolher(v)} className="text-left bg-white/5 rounded-xl overflow-hidden active:scale-[0.98] transition">
            <div className="aspect-video bg-[#2C261F] flex items-center justify-center overflow-hidden">
              {v.foto ? <img src={v.foto} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">🎬</span>}
            </div>
            <div className="p-3">
              {v.marca && <p className="text-[#8C8478] text-xs uppercase tracking-wide">{v.marca}</p>}
              <p className="text-white font-semibold leading-tight sw-display">{v.titulo}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Slide({ produto, onAbrir }) {
  const fotos = useFotosProduto(produto)
  const [fotoIdx, setFotoIdx] = useState(0)
  const pot = extrairPotencia(produto)

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

  const args = Array.isArray(produto.argumentos_de_venda) ? produto.argumentos_de_venda.slice(0, 4) : []
  const fotoAtual = fotos[fotoIdx] || produto.foto_principal_url

  return (
    <div className="absolute inset-0 flex flex-col lg:flex-row animate-fade-in" onClick={onAbrir}>
      <div className="relative flex-1 bg-gradient-to-br from-[#2C261F] to-[#15110E] flex items-center justify-center p-6 lg:p-12">
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#E11B22]" />
        {produto.marca?.nome && (
          <span className="absolute top-6 left-6 text-[#B5ADA3] text-lg font-semibold tracking-wide uppercase sw-body">{produto.marca.nome}</span>
        )}
        <img key={fotoAtual} src={fotoAtual} alt={produto.titulo} className="max-h-full max-w-full object-contain drop-shadow-2xl animate-fade-in" />
        {fotos.length > 1 && (
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {fotos.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full ${i === fotoIdx ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        )}
      </div>

      <div className="lg:w-[38%] xl:w-[34%] bg-[#1B1611]/95 text-[#F5F1EC] flex flex-col justify-center gap-5 p-8 lg:p-12">
        <div>
          {LABEL_CONDICAO[produto.condicao] && (
            <span className="inline-block px-3 py-1 rounded-full bg-[#E11B22]/20 text-[#E11B22] text-sm font-medium mb-3">{LABEL_CONDICAO[produto.condicao]}</span>
          )}
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight sw-display">{produto.titulo}</h1>
          {produto.subtitulo && <p className="text-xl xl:text-2xl text-[#B5ADA3] mt-2">{produto.subtitulo}</p>}
        </div>

        {pot && (
          <div className="flex items-end gap-2">
            <span className="text-[#E11B22] font-extrabold sw-display leading-none" style={{ fontSize: '6rem' }}>{pot.num}</span>
            <div className="mb-3">
              <span className="text-3xl font-bold sw-display">{pot.unid}</span>
              <p className="text-[#8C8478] text-xs uppercase tracking-wide">Potência</p>
            </div>
          </div>
        )}

        {args.length > 0 && (
          <ul className="space-y-2">
            {args.map((a, i) => (
              <li key={i} className="flex gap-2 text-base xl:text-lg text-[#F5F1EC]">
                <span className="text-[#E11B22] shrink-0 font-bold">✓</span><span>{a}</span>
              </li>
            ))}
          </ul>
        )}

        {especs.length > 0 && (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 border-t border-white/10">
            {especs.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs uppercase tracking-wide text-[#8C8478]">{k.replace(/_/g, ' ')}</dt>
                <dd className="text-lg font-semibold sw-display">{String(v)}</dd>
              </div>
            ))}
          </dl>
        )}

        <p className="text-[#8C8478] text-sm">Toque para ver fotos, vídeo e folheto →</p>
      </div>
    </div>
  )
}

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
