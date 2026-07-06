import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllRecords } from '../lib/db'
import { PERIODOS, dentroDoPeriodo } from '../lib/tempo'

// Fix icone padrao do leaflet (Vite quebra URLs default)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function iconeTipo(tipo) {
  const cores = {
    presencial: '#1e40af',
    mensagem:   '#16a34a',
    telefonema: '#d97706',
    email:      '#7c3aed',
  }
  const cor = cores[tipo] || '#64748b'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0 C7.2 0 0 7.2 0 16 c0 12 16 24 16 24 s16-12 16-24 c0-8.8-7.2-16-16-16 z" fill="${cor}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="14" r="6" fill="#fff"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -36] })
}

function FitBounds({ pontos }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length === 0) return
    if (pontos.length === 1) {
      map.setView([pontos[0].lat, pontos[0].lng], 13)
      return
    }
    map.fitBounds(L.latLngBounds(pontos.map((p) => [p.lat, p.lng])), { padding: [40, 40] })
  }, [pontos, map])
  return null
}

export default function VisitasMapa() {
  const [visitas, setVisitas] = useState([])
  const [propriedades, setPropriedades] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('tudo')

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [v, p, c] = await Promise.all([
        getAllRecords('visitas').then((vs) => vs.filter((v) => !v.deleted_at)),
        getAllRecords('propriedades'),
        getAllRecords('clientes'),
      ])
      setVisitas(v)
      setPropriedades(p)
      setClientes(c)
    } catch (err) {
      console.error('[VisitasMapa]', err)
    }
    setLoading(false)
  }

  // Mapas de lookup
  const propMap = useMemo(() => Object.fromEntries(propriedades.map((x) => [x.id, x])), [propriedades])
  const cliMap = useMemo(() => Object.fromEntries(clientes.map((x) => [x.id, x])), [clientes])

  // Só visitas COM GPS (já filtradas por vendedor via pull em sync.js)
  const pontos = useMemo(() =>
    visitas
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => {
        const prop = propMap[v.propriedade_id]
        const cli = prop ? cliMap[prop.cliente_dono_id] : null
        return {
          ...v,
          lat: Number(v.latitude),
          lng: Number(v.longitude),
          propriedade_nome: prop?.nome || prop?.nome_fantasia || '—',
          // Propriedades do ERP não têm dono: cai na razão social/nome da propriedade
          cliente_nome: cli?.nome || prop?.razao_social || prop?.nome || '—',
        }
      })
      .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))
  , [visitas, propMap, cliMap])

  // Filtro por período (dropdown). 'tudo' deixa passar todos.
  const pontosFiltrados = useMemo(
    () => pontos.filter((p) => dentroDoPeriodo(p.data_visita, periodo)),
    [pontos, periodo]
  )

  const semGps = visitas.length - pontos.length
  const centroDefault = [-22.32, -49.07]  // Bauru/SP

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold">Mapa das visitas</h2>
          <p className="text-xs text-slate-500">
            {pontosFiltrados.length} no mapa{periodo !== 'tudo' && ` de ${pontos.length} com GPS`}
            {semGps > 0 && ` · ${semGps} sem GPS (não aparecem)`}
          </p>
        </div>
        <Link
          to="/visitas"
          className="text-sm text-blue-700 active:text-blue-900"
        >
          ← Visitas
        </Link>
      </div>

      {/* Filtro de período */}
      <div className="mb-2">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          {PERIODOS.map((p) => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: '70vh', minHeight: 420 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pontosFiltrados.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400 text-center px-4">
              {pontos.length === 0 ? (
                <>Nenhuma visita com GPS ainda.<br />
                <span className="text-xs">Visitas presenciais capturam GPS automaticamente.</span></>
              ) : (
                <>Nenhuma visita com GPS neste período.<br />
                <span className="text-xs">Troque o filtro acima.</span></>
              )}
            </p>
          </div>
        ) : (
          <MapContainer center={centroDefault} zoom={6} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds pontos={pontosFiltrados} />
            {pontosFiltrados.map((p) => {
              const data = new Date(p.data_visita)
              const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
              return (
                <Marker key={p.id} position={[p.lat, p.lng]} icon={iconeTipo(p.tipo)}>
                  <Popup>
                    <div className="text-xs">
                      <p className="font-bold">{p.propriedade_nome}</p>
                      <p className="text-slate-500">{p.cliente_nome}</p>
                      <p className="mt-1 capitalize"><b>{p.tipo}</b> · {dataStr}</p>
                      {p.resumo && <p className="mt-1 italic">{p.resumo.slice(0, 120)}{p.resumo.length > 120 ? '...' : ''}</p>}
                      {p.acionar_pos_vendas && <p className="mt-1 text-orange-600 font-medium">⚠ Pós-vendas acionado</p>}
                    </div>
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        )}
      </div>

      <div className="flex gap-3 mt-2 text-[11px] text-slate-500 justify-center flex-wrap">
        <span><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#1e40af' }}/> Presencial</span>
        <span><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#16a34a' }}/> Mensagem</span>
        <span><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#d97706' }}/> Telefonema</span>
        <span><span className="inline-block w-3 h-3 rounded-full" style={{ background: '#7c3aed' }}/> E-mail</span>
      </div>
    </div>
  )
}
