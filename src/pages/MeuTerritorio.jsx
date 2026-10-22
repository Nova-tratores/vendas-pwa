// Meu território (vendedor): os imóveis rurais que já conquistei no município.
import Territorio from '../components/Territorio'

export default function MeuTerritorio() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Meu território</h2>
      <p className="text-xs text-slate-500 mb-3">Cada imóvel rural do CAR é uma casa do mapa. Visite para desbloquear; o verde escurece conforme o contato esquenta.</p>
      <Territorio />
    </div>
  )
}
