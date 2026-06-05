import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getVisitas, getVendedores } from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome, corVendedor } from '../components/VendedorAvatar'

// Fix do icone padrao do leaflet (URLs viram broken por Vite bundling)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Icone-pino colorido por vendedor (cache p/ nao recriar SVG a cada render).
// A cor vem de corVendedor(id) - a MESMA do VendedorAvatar, pra bater pino x avatar.
const _iconCache = {}
function iconePin(cor) {
  if (_iconCache[cor]) return _iconCache[cor]
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <path d="M16 0 C7.2 0 0 7.2 0 16 c0 12 16 24 16 24 s16-12 16-24 c0-8.8-7.2-16-16-16 z" fill="${cor}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="16" cy="14" r="6" fill="#fff"/>
    </svg>`
  const icon = L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -36],
  })
  _iconCache[cor] = icon
  return icon
}

const TIPOS = [
  { key: '', label: 'Todos' },
  { key: 'presencial', label: 'Presencial' },
  { key: 'mensagem', label: 'Mensagem' },
  { key: 'telefonema', label: 'Telefonema' },
  { key: 'email', label: 'E-mail' },
]

// Componente que ajusta zoom para caber todos os markers
function FitBounds({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView([pontos[0].lat, pontos[0].lng], 13)
      return
    }
    const bounds = L.latLngBounds(pontos.map((p) => [p.lat, p.lng]))
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [pontos, map])
  return null
}

export default function SupervisorMapa() {
  const [visitas, setVisitas] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({
    vendedor_id: '',
    tipo: '',
    dateFrom: '',
    dateTo: '',
  })

  useEffect(() => {
    getVendedores().then(setVendedores)
  }, [])

  useEffect(() => { carregar() }, [filtros])

  async function carregar() {
    setLoading(true)
    try {
      const params = {}
      if (filtros.vendedor_id) params.vendedorId = parseInt(filtros.vendedor_id)
      if (filtros.tipo) params.tipo = filtros.tipo
      if (filtros.dateFrom) params.dateFrom = new Date(filtros.dateFrom).toISOString()
      if (filtros.dateTo) params.dateTo = new Date(filtros.dateTo + 'T23:59:59').toISOString()
      const data = await getVisitas(params)
      setVisitas(data)
    } catch (err) {
      console.error('[Mapa]', err)
    }
    setLoading(false)
  }

  // Só visitas com GPS válido
  const pontos = useMemo(() =>
    visitas
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => ({ ...v, lat: Number(v.latitude), lng: Number(v.longitude) }))
  , [visitas])

  const semGps = visitas.length - pontos.length
  // Centro padrão: Bauru/SP (sede), caso não tenha pontos
  const centroDefault = [-22.32, -49.07]

  // Vendedores presentes no mapa atual (para a legenda de cores)
  const vendedoresNoMapa = useMemo(() => {
    const ids = new Set(pontos.map((p) => p.vendedor_id))
    return vendedores.filter((v) => ids.has(v.id))
  }, [pontos, vendedores])

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Mapa de visitas</h2>
      <p className="text-xs text-slate-500 mb-3">
        {pontos.length} visita{pontos.length !== 1 ? 's' : ''} com GPS
        {semGps > 0 && ` · ${semGps} sem GPS (não aparecem no mapa)`}
      </p>

      <div className="bg-white rounded-xl shadow p-3 mb-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filtros.vendedor_id}
            onChange={(e) => setFiltros((f) => ({ ...f, vendedor_id: e.target.value }))}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
          >
            <option value="">Todos vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
          >
            {TIPOS.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={filtros.dateFrom}
            onChange={(e) => setFiltros((f) => ({ ...f, dateFrom: e.target.value }))}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
          />
          <input
            type="date"
            value={filtros.dateTo}
            onChange={(e) => setFiltros((f) => ({ ...f, dateTo: e.target.value }))}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: '60vh', minHeight: 400 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <MapContainer center={centroDefault} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds pontos={pontos} />
            {pontos.map((p) => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={iconePin(corVendedor(p.vendedor_id))}>
                <Popup>
                  <div className="text-xs" style={{ minWidth: 170 }}>
                    {/* Cliente em destaque; rosto (avatar colorido) do vendedor no lugar do nome */}
                    <div className="flex items-center gap-2">
                      <VendedorAvatar id={p.vendedor_id} nome={p.vendedor_nome} size={32} />
                      <div className="min-w-0">
                        <p className="font-bold text-sm leading-tight">
                          {p.sinalizada && <span title="Sinalizada">🚩 </span>}{p.cliente_nome || '—'}
                        </p>
                        <p className="text-slate-500 leading-tight">{p.propriedade_nome || '—'}</p>
                      </div>
                    </div>
                    <p className="text-slate-500 mt-1">{new Date(p.data_visita).toLocaleString('pt-BR')}</p>
                    <p className="capitalize text-slate-600 mt-0.5">{p.tipo}</p>
                    {p.veiculo && <p className="mt-1 text-slate-700 font-medium">🚗 {p.veiculo}</p>}
                    {p.resumo && <p className="mt-1 italic">{p.resumo.slice(0, 120)}{p.resumo.length > 120 ? '...' : ''}</p>}
                    {p.acionar_pos_vendas && <p className="mt-1 text-orange-600 font-medium">⚠ Pós-vendas acionado</p>}
                    {/* Filtro por vendedor direto do popup */}
                    <button
                      type="button"
                      onClick={() => setFiltros((f) => ({
                        ...f,
                        vendedor_id: f.vendedor_id === String(p.vendedor_id) ? '' : String(p.vendedor_id),
                      }))}
                      className="mt-2 text-blue-700 underline"
                    >
                      {filtros.vendedor_id === String(p.vendedor_id)
                        ? 'Ver todos os vendedores'
                        : `Ver só ${primeiroNome(p.vendedor_nome) || 'este vendedor'}`}
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {vendedoresNoMapa.length > 0 && (
        <div className="flex gap-x-3 gap-y-1 mt-2 text-[11px] text-slate-500 justify-center flex-wrap">
          {vendedoresNoMapa.map((v) => (
            <span key={v.id} className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: corVendedor(v.id) }} />
              {primeiroNome(v.nome)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
