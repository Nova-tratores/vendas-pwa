import { useState } from 'react'
import {
  getFontSize,
  setFontSize,
  FONT_MIN,
  FONT_MAX,
  FONT_STEP,
  FONT_BASE,
} from '../lib/fontScale'

export default function ConfigModal({ show, onClose }) {
  const [size, setSize] = useState(getFontSize())

  if (!show) return null

  function alterar(delta) {
    setSize(setFontSize(size + delta))
  }

  function resetar() {
    setSize(setFontSize(FONT_BASE))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Configurações</h3>
          <button
            onClick={onClose}
            className="text-slate-400 text-2xl leading-none px-1 active:text-slate-600"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Tamanho da letra */}
        <div className="mb-2">
          <p className="text-sm font-medium text-slate-700 mb-1">Tamanho da letra</p>
          <p className="text-xs text-slate-500 mb-3">
            Deixe a letra do app maior ou menor.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={() => alterar(-FONT_STEP)}
              disabled={size <= FONT_MIN}
              className="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:bg-slate-200 disabled:opacity-40"
              aria-label="Diminuir letra"
            >
              <span className="text-sm">A</span>
            </button>

            <div className="flex-1 text-center">
              <span className="font-bold" style={{ fontSize: `${size}px` }}>
                Aa
              </span>
            </div>

            <button
              onClick={() => alterar(FONT_STEP)}
              disabled={size >= FONT_MAX}
              className="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center active:bg-slate-200 disabled:opacity-40"
              aria-label="Aumentar letra"
            >
              <span className="text-2xl">A</span>
            </button>
          </div>

          {size !== FONT_BASE && (
            <button
              onClick={resetar}
              className="mt-3 text-xs text-blue-700 underline"
            >
              Voltar ao padrão
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800"
        >
          Pronto
        </button>
      </div>
    </div>
  )
}
