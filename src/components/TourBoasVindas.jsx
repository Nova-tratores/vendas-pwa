import { useState, useEffect } from 'react'

// Tour de boas-vindas em cartões. Cada passo pode destacar um item do menu
// de baixo (destaque = rota do NavLink) — quem renderiza o menu recebe o
// destaque via onDestaque e acende o item por cima do fundo escuro.
export default function TourBoasVindas({ show, passos, onFim, onDestaque }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (show) setI(0)
  }, [show])

  useEffect(() => {
    onDestaque?.(show ? passos[i]?.destaque || null : null)
  }, [show, i, passos, onDestaque])

  if (!show || !passos.length) return null

  const passo = passos[i]
  const ultimo = i === passos.length - 1

  function fechar() {
    onDestaque?.(null)
    onFim()
  }

  return (
    <div className="fixed inset-0 z-[55] bg-black/60 flex items-center justify-center px-4 pb-24">
      <div
        key={i}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-label="Tour de boas-vindas"
      >
        <div className="text-5xl text-center mb-3" aria-hidden="true">{passo.icone}</div>
        <h3 className="font-bold text-lg text-slate-800 text-center mb-2">{passo.titulo}</h3>
        <p className="text-sm text-slate-600 text-center">{passo.texto}</p>
        {passo.destaque && (
          <p className="text-xs text-blue-700 text-center mt-3 font-medium">↓ Fica no menu aqui embaixo</p>
        )}

        <div className="flex justify-center gap-1.5 my-5" aria-hidden="true">
          {passos.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all ${k === i ? 'w-5 bg-blue-700' : 'w-1.5 bg-slate-300'}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {i > 0 ? (
            <button
              onClick={() => setI(i - 1)}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium text-sm active:bg-slate-200"
            >
              Voltar
            </button>
          ) : (
            <button
              onClick={fechar}
              className="flex-1 bg-slate-100 text-slate-500 py-2.5 rounded-lg font-medium text-sm active:bg-slate-200"
            >
              Pular
            </button>
          )}
          <button
            onClick={() => (ultimo ? fechar() : setI(i + 1))}
            className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800"
          >
            {ultimo ? 'Começar' : 'Próximo'}
          </button>
        </div>
        <p className="text-[11px] text-slate-400 text-center mt-3">{i + 1} de {passos.length}</p>
      </div>
    </div>
  )
}
