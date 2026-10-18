import { useState, useEffect } from 'react'

// Ajuda contextual da tela atual (botão "?" do header).
// conteudo: { titulo, resumo, secoes: [{ titulo, tipo: 'passos'|'dicas', itens: [] }] }
// geral: lista de { pergunta, resposta } — problemas comuns, iguais em toda tela.
export default function AjudaModal({ show, onClose, conteudo, geral = [], onRevisarTour }) {
  const [aberta, setAberta] = useState(null)

  useEffect(() => {
    if (show) setAberta(null)
  }, [show])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md max-h-[88vh] rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Ajuda"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Ajuda desta tela</p>
            <h3 className="font-bold text-lg text-slate-800 leading-tight">{conteudo?.titulo || 'Ajuda'}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none px-1 active:text-slate-600"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          {conteudo?.resumo && (
            <p className="text-sm text-slate-600">{conteudo.resumo}</p>
          )}

          {(conteudo?.secoes || []).map((s) => (
            <section key={s.titulo}>
              <h4 className="text-sm font-bold text-slate-800 mb-2">{s.titulo}</h4>
              {s.tipo === 'passos' ? (
                <ol className="space-y-2">
                  {s.itens.map((it, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-blue-700 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <ul className="space-y-1.5">
                  {s.itens.map((it, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="shrink-0 text-blue-700">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {geral.length > 0 && (
            <section>
              <h4 className="text-sm font-bold text-slate-800 mb-2">Problemas comuns</h4>
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl">
                {geral.map((g, i) => (
                  <div key={g.pergunta}>
                    <button
                      onClick={() => setAberta(aberta === i ? null : i)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left text-slate-700 active:bg-slate-50"
                      aria-expanded={aberta === i}
                    >
                      <span>{g.pergunta}</span>
                      <span className="text-slate-400 shrink-0">{aberta === i ? '−' : '+'}</span>
                    </button>
                    {aberta === i && (
                      <p className="px-3 pb-3 text-sm text-slate-600 animate-fade-in">{g.resposta}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="flex gap-2 px-5 py-4 border-t border-slate-100 safe-bottom">
          {onRevisarTour && (
            <button
              onClick={onRevisarTour}
              className="flex-1 bg-slate-100 text-slate-700 py-2.5 rounded-lg font-medium text-sm active:bg-slate-200"
            >
              Rever o tour
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  )
}
