// Escala da fonte base do app.
// O index.css define html { font-size: 18px } e todas as classes Tailwind
// (text-xs ... text-xl) escalam em rem — então mudar o font-size do <html>
// aumenta/diminui a letra do app inteiro proporcionalmente.

export const FONT_BASE = 18 // px (padrão, igual ao index.css)
export const FONT_MIN = 16
export const FONT_MAX = 26
export const FONT_STEP = 2

const KEY = 'fontSize'

export function getFontSize() {
  const v = parseInt(localStorage.getItem(KEY), 10)
  if (Number.isNaN(v)) return FONT_BASE
  return Math.min(FONT_MAX, Math.max(FONT_MIN, v))
}

export function applyFontSize(px = getFontSize()) {
  document.documentElement.style.fontSize = `${px}px`
}

export function setFontSize(px) {
  const v = Math.min(FONT_MAX, Math.max(FONT_MIN, px))
  localStorage.setItem(KEY, String(v))
  applyFontSize(v)
  return v
}
