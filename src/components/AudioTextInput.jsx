import { useState, useRef, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

/**
 * Por que essa estrategia (continuous=true, sem restart automatico):
 *
 * O bug "gago" (texto duplicado) acontecia porque usavamos continuous=false
 * + restart em onend. Quando a sessao terminava (silencio + timeout natural),
 * abriamos nova sessao -- e alguns navegadores re-emitem o final da sessao
 * anterior como contexto inicial da nova, gerando duplicacao.
 *
 * Com continuous=true a sessao mantem o event.results completo ao longo de
 * toda a gravacao. event.results e SEMPRE o estado total - reconstruimos o
 * texto da sessao a partir dele em cada onresult, sem precisar acumular nada
 * nos. Zero risco de duplicacao.
 *
 * Tradeoff: em alguns mobiles a sessao pode encerrar sozinha apos longo
 * silencio. O usuario apenas aperta 🎤 de novo. Preferivel a duplicacao.
 */
export default function AudioTextInput({ value, onChange, placeholder, rows = 3 }) {
  const [gravando, setGravando] = useState(false)
  const [suportaAudio, setSupportaAudio] = useState(false)

  const recognitionRef = useRef(null)
  const baseValueRef = useRef('')   // texto que ja estava antes de iniciar

  useEffect(() => {
    setSupportaAudio(!!SpeechRecognition)
    return () => {
      // Limpa sessao orfa se o componente desmontar durante gravacao
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ignora */ }
        recognitionRef.current = null
      }
    }
  }, [])

  function iniciarGravacao() {
    if (!SpeechRecognition) return
    if (recognitionRef.current) return  // ja gravando

    baseValueRef.current = value || ''

    const rec = new SpeechRecognition()
    rec.lang = 'pt-BR'
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onresult = (event) => {
      // event.results e cumulativo: reconstroi o texto inteiro da sessao.
      // Cada slot aparece UMA vez aqui, sem duplicacao possivel.
      let texto = ''
      for (let i = 0; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        texto += (i > 0 ? ' ' : '') + t
      }
      const base = baseValueRef.current.trim()
      const sess = texto.trim()
      onChange(base && sess ? `${base} ${sess}` : (base || sess))
    }

    rec.onerror = (event) => {
      // no-speech e aborted sao normais; outros logamos
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Speech]', event.error)
      }
      // Em qualquer erro, encerra o estado de gravacao
      recognitionRef.current = null
      setGravando(false)
    }

    rec.onend = () => {
      // Sessao terminou (por stop manual, ou pelo browser apos silencio em mobile).
      // NAO reiniciamos automaticamente -- vendedor aperta de novo se quiser continuar.
      // Isso elimina a duplicacao causada por restart em loop.
      recognitionRef.current = null
      setGravando(false)
    }

    recognitionRef.current = rec
    try {
      rec.start()
      setGravando(true)
    } catch (e) {
      console.warn('[Speech] start error', e)
      recognitionRef.current = null
      setGravando(false)
    }
  }

  function pararGravacao() {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignora */ }
      // onend vai disparar e setar setGravando(false)
    }
  }

  function toggleGravacao() {
    if (recognitionRef.current) pararGravacao()
    else iniciarGravacao()
  }

  function limparCampo() {
    if (recognitionRef.current) pararGravacao()
    baseValueRef.current = ''
    onChange('')
  }

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-24 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={limparCampo}
          className="absolute right-12 top-2 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-500 active:bg-slate-200"
          title="Limpar campo"
        >
          ✕
        </button>
      )}
      {suportaAudio && (
        <button
          type="button"
          onClick={toggleGravacao}
          className={`absolute right-2 top-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            gravando
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 text-slate-500 active:bg-slate-200'
          }`}
          title={gravando ? 'Parar gravação' : 'Gravar áudio'}
        >
          {gravando ? '■' : '🎤'}
        </button>
      )}
    </div>
  )
}
