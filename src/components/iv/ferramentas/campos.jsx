// Campos numéricos da Calculadora: número em formato brasileiro, régua deslizante
// e seletor em segmentos. Mostram o valor formatado e editam como texto.
import { useState } from 'react'

const paraNumero = (s) => {
  const t = String(s ?? '').trim().replace(/[^\d,.-]/g, '')
  if (!t) return 0
  const n = /,/.test(t) ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t.replace(/\.(?=\d{3}(\D|$))/g, ''))
  return Number.isFinite(n) ? n : 0
}

/** Número (R$, ha, %…) com prefixo/sufixo. */
export function CampoNumero({ rotulo, valor, onMuda, prefixo, sufixo, casas = 0, dica, min = 0 }) {
  const [txt, setTxt] = useState(null)
  const mostrado = txt ?? (Number(valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  return (
    <label className="grid grid-cols-1 gap-1 min-w-0">
      <span className="text-[12.5px] font-semibold text-slate-600 leading-tight">{rotulo}</span>
      <span className="flex items-center rounded-xl border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-red-500/40 focus-within:border-red-500 overflow-hidden">
        {prefixo && <span className="pl-3 text-[13px] font-semibold text-slate-500">{prefixo}</span>}
        <input inputMode="decimal" value={mostrado}
          onFocus={(e) => { setTxt(String(Number(valor) || 0).replace('.', ',')); setTimeout(() => e.target.select(), 0) }}
          onChange={(e) => { setTxt(e.target.value); onMuda(Math.max(min, paraNumero(e.target.value))) }}
          onBlur={() => setTxt(null)}
          className="w-full min-w-0 bg-transparent px-2.5 py-2.5 text-right font-bold text-slate-900 tabular-nums focus:outline-none" />
        {sufixo && <span className="pr-3 text-[12px] font-semibold text-slate-500 whitespace-nowrap">{sufixo}</span>}
      </span>
      {dica && <span className="text-[11.5px] text-slate-500 leading-snug">{dica}</span>}
    </label>
  )
}

/** Régua deslizante com o valor em destaque. */
export function Regua({ rotulo, valor, onMuda, min, max, passo = 1, formato = (v) => String(v), extra }) {
  const p = max > min ? ((Math.min(max, Math.max(min, valor)) - min) / (max - min)) * 100 : 0
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12.5px] font-semibold text-slate-600">{rotulo}</span>
        <span className="text-[15px] font-extrabold text-slate-900 tabular-nums">{formato(valor)}{extra && <span className="ml-1.5 text-[12px] font-semibold text-slate-500">{extra}</span>}</span>
      </div>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onMuda(Number(e.target.value))}
        className="ivf-range" style={{ '--p': `${p}%` }} aria-label={rotulo} />
    </div>
  )
}

/** Escolha em segmentos (ex.: anual · semestral · mensal). */
export function Segmentos({ opcoes, valor, onMuda, rotulo }) {
  return (
    <div className="grid grid-cols-1 gap-1">
      {rotulo && <span className="text-[12.5px] font-semibold text-slate-600">{rotulo}</span>}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100">
        {opcoes.map(([v, nome]) => (
          <button key={v} type="button" onClick={() => onMuda(v)}
            className={`flex-1 rounded-lg py-1.5 text-[13px] font-bold transition-colors ${valor === v ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600'}`}>
            {nome}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Liga/desliga. */
export function Chave({ ligado, onMuda, rotulo }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onMuda(!ligado)} className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700">
      <span className={`relative w-10 h-6 rounded-full transition-colors ${ligado ? 'bg-red-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ligado ? 'left-[18px]' : 'left-0.5'}`} />
      </span>
      {rotulo}
    </button>
  )
}
