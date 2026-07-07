import { useState, useEffect, useRef } from 'react'
// Build "legacy" do PDF.js: funciona em Chrome mais antigo de tablet/celular
// (o build moderno exige Promise.withResolvers, Chrome 119+).
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// ====================================================================
// Visualizador de PDF embutido — abre o folheto DENTRO do app.
// <iframe> não renderiza PDF no Chrome/Android (fica em branco ou baixa)
// e abrir em nova aba tira o usuário do PWA/kiosk; aqui o PDF.js desenha
// as páginas em canvas, com zoom por botões.
// ====================================================================

const ESCALA_MIN = 0.75
const ESCALA_MAX = 3
const ESCALA_PASSO = 0.25

export default function PdfViewerModal({ url, titulo, onFechar }) {
  const [pdf, setPdf] = useState(null)
  const [erro, setErro] = useState(false)
  const [escala, setEscala] = useState(1)
  const [largura, setLargura] = useState(0)
  const areaRef = useRef(null)

  // Carrega o documento (e destrói ao fechar/trocar de URL).
  useEffect(() => {
    let alive = true
    let doc = null
    setPdf(null)
    setErro(false)
    setEscala(1)
    if (!url) return
    const task = pdfjsLib.getDocument({ url })
    task.promise
      .then((d) => { doc = d; if (alive) setPdf(d); else d.destroy() })
      .catch(() => { if (alive) setErro(true) })
    return () => {
      alive = false
      try { doc ? doc.destroy() : task.destroy() } catch { /* ignora */ }
    }
  }, [url])

  // Largura útil pra encaixar a página (fit-width no zoom 1x).
  useEffect(() => {
    const medir = () => setLargura(Math.min((areaRef.current?.clientWidth || window.innerWidth) - 24, 1000))
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  const zoom = (delta) => setEscala((e) => Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, +(e + delta).toFixed(2))))

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex flex-col animate-fade-in">
      <div className="flex items-center justify-between gap-3 p-4 text-white shrink-0">
        <span className="text-sm text-white/70 truncate">📄 {titulo || 'Folheto técnico'}{pdf ? ` · ${pdf.numPages} pág.` : ''}</span>
        <div className="flex items-center gap-2 shrink-0">
          {pdf && (
            <>
              <button onClick={() => zoom(-ESCALA_PASSO)} disabled={escala <= ESCALA_MIN} className="w-9 h-9 rounded-full bg-white/10 text-lg disabled:opacity-30">−</button>
              <span className="text-xs text-white/60 w-10 text-center tabular-nums">{Math.round(escala * 100)}%</span>
              <button onClick={() => zoom(ESCALA_PASSO)} disabled={escala >= ESCALA_MAX} className="w-9 h-9 rounded-full bg-white/10 text-lg disabled:opacity-30">+</button>
            </>
          )}
          <button onClick={onFechar} className="px-4 py-2 rounded-full bg-white/10 text-sm">Fechar ✕</button>
        </div>
      </div>

      <div ref={areaRef} className="flex-1 overflow-auto px-3 pb-6">
        {erro ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 text-center text-white/80 px-6">
            <span className="text-5xl">📄</span>
            <p>Não consegui abrir o folheto aqui.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="px-5 py-3 rounded-xl bg-white/10 text-sm">
              Abrir em nova aba ↗
            </a>
          </div>
        ) : !pdf || !largura ? (
          <div className="h-full flex items-center justify-center text-white/60">Carregando folheto…</div>
        ) : (
          <div className="flex flex-col items-center gap-3 min-w-min mx-auto w-fit">
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <PaginaPdf key={i + 1} pdf={pdf} numero={i + 1} largura={largura} escala={escala} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PaginaPdf({ pdf, numero, largura, escala }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let cancelado = false
    let renderTask = null
    pdf.getPage(numero).then((page) => {
      const canvas = canvasRef.current
      if (cancelado || !canvas) return
      const base = page.getViewport({ scale: 1 })
      const cssWidth = largura * escala
      // Desenha em resolução maior (dpr) pro texto ficar nítido no tablet.
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr })
      canvas.width = viewport.width
      canvas.height = viewport.height
      canvas.style.width = `${cssWidth}px`
      canvas.style.height = `${viewport.height / dpr}px`
      renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport })
      renderTask.promise.catch(() => { /* cancelamento no unmount/zoom */ })
    }).catch(() => { /* doc destruído no fechamento */ })
    return () => {
      cancelado = true
      try { renderTask?.cancel() } catch { /* ignora */ }
    }
  }, [pdf, numero, largura, escala])

  return <canvas ref={canvasRef} className="bg-white rounded shadow-lg" />
}
