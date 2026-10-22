// Número que sobe rolando até o valor (ver subir dá mais prazer que ver pronto).
import { useEffect, useRef, useState } from 'react'

export default function ContadorXP({ valor, prefixo = '+', sufixo = ' XP', className = '' }) {
  const [mostrado, setMostrado] = useState(valor)
  const atual = useRef(valor)
  useEffect(() => {
    const de = atual.current
    const ate = valor
    if (de === ate) return
    const ini = performance.now()
    const dur = 450
    let raf
    const passo = (t) => {
      const k = Math.min(1, (t - ini) / dur)
      const v = Math.round(de + (ate - de) * (1 - (1 - k) ** 3))
      atual.current = v
      setMostrado(v)
      if (k < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [valor])
  return <span className={className}>{prefixo}{mostrado}{sufixo}</span>
}
