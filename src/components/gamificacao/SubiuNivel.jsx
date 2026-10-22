// Tela cheia de subida de nível: o trator novo entra em cena.
import { useEffect } from 'react'
import Trator from './Trator'
import { confete, vibrar, somPartida } from '../../lib/recompensas'

export default function SubiuNivel({ nivel, onFechar }) {
  useEffect(() => {
    confete({ dourado: true })
    vibrar([60, 50, 60, 50, 200])
    somPartida()
  }, [])
  return (
    <div className="fixed inset-0 z-[9998] bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center" onClick={onFechar}>
      <style>{'@keyframes entraTrator{from{transform:translateX(-120vw)}to{transform:translateX(0)}}'}</style>
      <div style={{ animation: 'entraTrator 0.9s cubic-bezier(.2,.9,.3,1.1)' }}>
        <Trator cv={nivel.cv} size={200} />
      </div>
      <p className="text-white/70 text-sm mt-4">Subiu de nível!</p>
      <p className="text-white text-3xl font-extrabold mt-1">Você agora é {nivel.cv} cv</p>
      <p className="text-white/70 text-sm mt-2">Um trator novo entrou na sua garagem.</p>
      <button type="button" onClick={onFechar} className="mt-6 bg-white text-slate-900 font-bold px-6 py-2.5 rounded-full">Continuar</button>
    </div>
  )
}
