import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix do ícone padrão do leaflet (URLs quebram com bundling do Vite)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/**
 * Popup com um mapa Leaflet centrado em um único ponto (a localização da visita).
 * @param {boolean} show
 * @param {number}  lat
 * @param {number}  lng
 * @param {string}  titulo  texto exibido no balão do marcador
 * @param {function} onClose
 */
export default function MiniMapaModal({ show, lat, lng, titulo, onClose }) {
  if (!show || lat == null || lng == null) return null
  const pos = [Number(lat), Number(lng)]

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="font-bold text-base truncate">{titulo || 'Localização da visita'}</h3>
            <p className="text-xs text-slate-500">{pos[0].toFixed(5)}, {pos[1].toFixed(5)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 active:text-slate-700 text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div style={{ height: '60vh', minHeight: 320 }}>
          <MapContainer center={pos} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={pos}>
              {titulo && <Popup>{titulo}</Popup>}
            </Marker>
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
