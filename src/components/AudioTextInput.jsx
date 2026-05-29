import { useState, useRef, useEffect } from 'react'

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

export default function AudioTextInput({ value, onChange, placeholder, rows = 3 }) {
  const [gravando, setGravando] = useState(false)
  const [suportaAudio, setSupportaAudio] = useState(false)

  // Refs (nao gatilham re-render e sao confiaveis contra double-start)
  const recognitionRef = useRef(null)
  const querendoGravarRef = useRef(false)   // intencao do usuario (true entre start e stop)
  const baseValueRef = useRef('')           // texto que ja estava no campo antes de gravar
  const committedRef = useRef('')           // finais ja confirmados nesta sessao
  const interimRef = useRef('')             // ultimo parcial mostrado

  useEffect(() => {
    setSupportaAudio(!!SpeechRecognition)
    return () => {
      // Limpa qualquer sessao orfa ao desmontar o componente
      querendoGravarRef.current = false
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch { /* ignora */ }
        recognitionRef.current = null
      }
    }
  }, [])

  function atualizarTexto() {
    const partes = [
      baseValueRef.current.trim(),
      committedRef.current.trim(),
      interimRef.current.trim(),
    ].filter(Boolean)
    onChange(partes.join(' '))
  }

  function novaSessao() {
    // continuous=false e mais confiavel em mobile. Para gravar continuo,
    // reiniciamos uma nova sessao em onend enquanto querendoGravarRef for true.
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let interim = ''
      let finalNovo = ''
      // Iteramos so o que mudou neste evento (event.resultIndex em diante).
      // Cada final aparece UMA unica vez, evitando duplicacao.
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalNovo += t
        } else {
          interim += t
        }
      }

      if (finalNovo.trim()) {
        committedRef.current = committedRef.current
          ? `${committedRef.current} ${finalNovo.trim()}`
          : finalNovo.trim()
        interimRef.current = ''
      } else {
        interimRef.current = interim
      }
      atualizarTexto()
    }

    recognition.onerror = (event) => {
      // 'no-speech' e 'aborted' sao normais (silencio ou parada) — apenas seguimos
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[Speech]', event.error)
        querendoGravarRef.current = false
        setGravando(false)
      }
    }

    recognition.onend = () => {
      // Se o usuario ainda quer gravar, abrimos nova sessao (simula continuous)
      if (querendoGravarRef.current) {
        // Pequeno delay evita InvalidStateError em alguns navegadores
        setTimeout(() => {
          if (querendoGravarRef.current) novaSessao()
        }, 50)
      } else {
        recognitionRef.current = null
        setGravando(false)
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch (e) {
      // Geralmente InvalidStateError quando ja esta iniciada — ignora
      console.warn('[Speech] start error', e)
    }
  }

  function iniciarGravacao() {
    if (!SpeechRecognition) return
    // Guarda contra double-tap: se ja esta gravando, nao reinicia
    if (querendoGravarRef.current) return

    querendoGravarRef.current = true
    baseValueRef.current = value || ''
    committedRef.current = ''
    interimRef.current = ''
    setGravando(true)
    novaSessao()
  }

  function pararGravacao() {
    querendoGravarRef.current = false
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* ignora */ }
    }
    setGravando(false)
  }

  function toggleGravacao() {
    if (querendoGravarRef.current) {
      pararGravacao()
    } else {
      iniciarGravacao()
    }
  }

  function limparCampo() {
    if (querendoGravarRef.current) pararGravacao()
    baseValueRef.current = ''
    committedRef.current = ''
    interimRef.current = ''
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
