import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllRecords } from '../lib/db'
import PullToRefresh from '../components/PullToRefresh'

// Fix do icone padrao do leaflet (Vite bundling quebra as URLs default)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const ORIGEM_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="11" fill="#16a34a" stroke="#fff" stroke-width="3"/>
    <circle cx="14" cy="14" r="3" fill="#fff"/>
  </svg>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function iconeAgenda(urgencia) {
  const cores = { atrasado: '#dc2626', hoje: '#d97706', futuro: '#1e40af' }
  const cor = cores[urgencia] || '#64748b'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0 C7.2 0 0 7.2 0 16 c0 12 16 24 16 24 s16-12 16-24 c0-8.8-7.2-16-16-16 z" fill="${cor}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="14" r="6" fill="#fff"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -36] })
}

// Haversine: distancia em km entre 2 coords
function haversineKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function classificarUrgencia(diasAte) {
  if (diasAte < 0) return 'atrasado'
  if (diasAte === 0) return 'hoje'
  return 'futuro'
}

function FitBounds({ pontos, origem }) {
  const map = useMap()
  useEffect(() => {
    const coords = []
    if (origem) coords.push([origem.lat, origem.lng])
    pontos.forEach((p) => {
      if (p.lat != null && p.lng != null) coords.push([p.lat, p.lng])
    })
    if (coords.length === 0) return
    if (coords.length === 1) {
      map.setView(coords[0], 12)
      return
    }
    map.fitBounds(L.latLngBounds(coords), { padding: [40, 40] })
  }, [pontos, origem, map])
  return null
}

export default function Agenda() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [origem, setOrigem] = useState(null)   // { lat, lng, accuracy }
  const [origemErro, setOrigemErro] = useState(null)
  const [aba, setAba] = useState('lista')      // lista | mapa
  const [filtro, setFiltro] = useState('proximos_30') // atrasados | proximos_7 | proximos_30 | todos

  useEffect(() => {
    carregar()
    capturarOrigem()
  }, [])

  function capturarOrigem() {
    if (!navigator.geolocation) {
      setOrigemErro('Geolocalização não suportada')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setOrigem({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      }),
      (err) => setOrigemErro(err.message || 'GPS bloqueado'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  }

  async function carregar() {
    setLoading(true)
    try {
      const [visitas, propriedades, clientes] = await Promise.all([
        getAllRecords('visitas').then((vs) => vs.filter((v) => !v.deleted_at)),
        getAllRecords('propriedades'),
        getAllRecords('clientes'),
      ])

      const propMap = Object.fromEntries(propriedades.map((p) => [p.id, p]))
      const cliMap = Object.fromEntries(clientes.map((c) => [c.id, c]))

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      // Pra cada propriedade, pega o ÚLTIMO data_proximo_contato definido
      // (porque várias visitas podem ter agendado contatos diferentes na
      // mesma propriedade — vale o mais recente).
      const ultimoPorProp = new Map()
      for (const v of visitas) {
        if (!v.data_proximo_contato) continue
        const propId = v.propriedade_id
        const atual = ultimoPorProp.get(propId)
        if (!atual || new Date(v.data_visita) > new Date(atual.data_visita)) {
          ultimoPorProp.set(propId, v)
        }
      }

      const lista = []
      for (const [propId, v] of ultimoPorProp.entries()) {
        const prop = propMap[propId]
        if (!prop) continue
        const data = new Date(v.data_proximo_contato + 'T00:00:00')
        const diasAte = Math.round((data - hoje) / 86400000)
        const cliente = cliMap[prop.cliente_dono_id]
        lista.push({
          visita_id: v.id,
          propriedade_id: propId,
          propriedade_nome: prop.nome || prop.nome_fantasia || '—',
          cidade: prop.cidade || '',
          estado: prop.estado || '',
          cliente_nome: cliente?.nome || '',
          data: v.data_proximo_contato,
          dataObj: data,
          diasAte,
          urgencia: classificarUrgencia(diasAte),
          lat: prop.latitude != null ? Number(prop.latitude) : null,
          lng: prop.longitude != null ? Number(prop.longitude) : null,
          resumo_ultimo: v.resumo || '',
          proximos_passos: v.proximos_passos || '',
        })
      }

      // Ordena por data crescente
      lista.sort((a, b) => a.data.localeCompare(b.data))
      setItems(lista)
    } catch (err) {
      console.error('[Agenda]', err)
    }
    setLoading(false)
  }

  // Adiciona distância se origem disponível
  const itemsComDistancia = useMemo(() => {
    if (!origem) return items
    return items.map((it) => ({
      ...it,
      distanciaKm: haversineKm(origem.lat, origem.lng, it.lat, it.lng),
    }))
  }, [items, origem])

  const filtrados = useMemo(() => {
    const arr = itemsComDistancia
    if (filtro === 'atrasados') return arr.filter((i) => i.urgencia === 'atrasado')
    if (filtro === 'proximos_7') return arr.filter((i) => i.diasAte >= 0 && i.diasAte <= 7)
    if (filtro === 'proximos_30') return arr.filter((i) => i.diasAte >= 0 && i.diasAte <= 30)
    return arr  // todos
  }, [itemsComDistancia, filtro])

  const stats = useMemo(() => ({
    atrasados: itemsComDistancia.filter((i) => i.urgencia === 'atrasado').length,
    hoje: itemsComDistancia.filter((i) => i.urgencia === 'hoje').length,
    semana: itemsComDistancia.filter((i) => i.diasAte > 0 && i.diasAte <= 7).length,
    mes: itemsComDistancia.filter((i) => i.diasAte > 0 && i.diasAte <= 30).length,
    todos: itemsComDistancia.length,
  }), [itemsComDistancia])

  const pontosMapa = filtrados.filter((i) => i.lat != null && i.lng != null)

  return (
    <PullToRefresh onRefresh={async () => { capturarOrigem(); await carregar() }}>
      <div>
        <div className="mb-3">
          <h2 className="text-xl font-bold">Agenda</h2>
          <p className="text-sm text-slate-500">
            {stats.todos} contato{stats.todos !== 1 ? 's' : ''} planejado{stats.todos !== 1 ? 's' : ''}
            {origem && ` · GPS ${origem.accuracy < 100 ? 'OK' : `±${Math.round(origem.accuracy)}m`}`}
            {origemErro && ` · GPS: ${origemErro}`}
          </p>
        </div>

        {/* Toggle Lista/Mapa */}
        <div className="flex gap-1 mb-3 border-b border-slate-200">
          <TabButton ativo={aba === 'lista'} onClick={() => setAba('lista')}>Lista</TabButton>
          <TabButton ativo={aba === 'mapa'} onClick={() => setAba('mapa')}>Mapa ({pontosMapa.length})</TabButton>
        </div>

        {/* Chips de filtro */}
        <div className="flex gap-1 overflow-x-auto pb-2 mb-3">
          <Chip ativo={filtro === 'atrasados'} cor="red" onClick={() => setFiltro('atrasados')}>
            Atrasados ({stats.atrasados})
          </Chip>
          <Chip ativo={filtro === 'proximos_7'} onClick={() => setFiltro('proximos_7')}>
            Próx. 7 dias ({stats.semana + stats.hoje})
          </Chip>
          <Chip ativo={filtro === 'proximos_30'} onClick={() => setFiltro('proximos_30')}>
            Próx. 30 dias ({stats.mes + stats.hoje})
          </Chip>
          <Chip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos ({stats.todos})
          </Chip>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500 text-center py-8">Carregando...</p>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-slate-400">Nada agendado nesse filtro</p>
          </div>
        ) : aba === 'lista' ? (
          <ListaAgenda items={filtrados} origem={origem} />
        ) : (
          <MapaAgenda pontos={pontosMapa} origem={origem} />
        )}
      </div>
    </PullToRefresh>
  )
}

function TabButton({ ativo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        ativo ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({ ativo, cor = 'blue', onClick, children }) {
  const corAtiva = cor === 'red' ? 'bg-red-600 border-red-600' : 'bg-blue-700 border-blue-700'
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${
        ativo
          ? `${corAtiva} text-white`
          : 'bg-white text-slate-600 border-slate-300'
      }`}
    >
      {children}
    </button>
  )
}

function ListaAgenda({ items, origem }) {
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <CardAgenda key={it.propriedade_id} item={it} index={i} origem={origem} />
      ))}
    </div>
  )
}

function CardAgenda({ item, index, origem }) {
  const corBorda = {
    atrasado: 'border-l-4 border-red-500',
    hoje: 'border-l-4 border-amber-500',
    futuro: '',
  }[item.urgencia]

  const labelDias =
    item.diasAte < 0 ? `${Math.abs(item.diasAte)}d atrás`
    : item.diasAte === 0 ? 'hoje'
    : item.diasAte === 1 ? 'amanhã'
    : `em ${item.diasAte}d`

  const dataStr = item.dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  // URL pra abrir no app de maps externo (Google Maps universal)
  const mapsUrl = item.lat != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}${origem ? `&origin=${origem.lat},${origem.lng}` : ''}`
    : null

  return (
    <div
      className={`bg-white rounded-xl shadow p-3 animate-fade-in ${corBorda}`}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-bold text-sm">{item.propriedade_nome}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          item.urgencia === 'atrasado' ? 'bg-red-100 text-red-700'
          : item.urgencia === 'hoje' ? 'bg-amber-100 text-amber-700'
          : 'bg-blue-100 text-blue-700'
        }`}>
          {labelDias}
        </span>
      </div>
      <p className="text-xs text-slate-500 mb-1">
        {dataStr} · {item.cliente_nome || '—'}
        {item.cidade && ` · ${item.cidade}${item.estado ? `/${item.estado}` : ''}`}
      </p>
      {item.distanciaKm != null && (
        <p className="text-xs text-slate-600">
          📍 <b>{item.distanciaKm.toFixed(1)} km</b> de você
        </p>
      )}
      {item.resumo_ultimo && (
        <p className="text-xs text-slate-700 mt-1 italic line-clamp-2">
          última visita: {item.resumo_ultimo}
        </p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-blue-700 font-medium active:text-blue-900"
        >
          🧭 Abrir rota no Maps
        </a>
      )}
    </div>
  )
}

function MapaAgenda({ pontos, origem }) {
  const centro = origem ? [origem.lat, origem.lng] : pontos[0] ? [pontos[0].lat, pontos[0].lng] : [-22.32, -49.07]
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden" style={{ height: '65vh', minHeight: 420 }}>
      {pontos.length === 0 && !origem ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-slate-400 text-center px-4">
            Sem propriedades com GPS pra mostrar.<br />
            <span className="text-xs">Cadastre lat/lng nas propriedades pra ver no mapa.</span>
          </p>
        </div>
      ) : (
        <MapContainer center={centro} zoom={11} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds pontos={pontos} origem={origem} />
          {origem && (
            <Marker position={[origem.lat, origem.lng]} icon={ORIGEM_ICON}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">Você está aqui</p>
                  <p className="text-slate-500">precisão ±{Math.round(origem.accuracy)}m</p>
                </div>
              </Popup>
            </Marker>
          )}
          {pontos.map((p) => (
            <Marker key={p.propriedade_id} position={[p.lat, p.lng]} icon={iconeAgenda(p.urgencia)}>
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{p.propriedade_nome}</p>
                  <p className="text-slate-500">{p.cliente_nome || '—'}</p>
                  <p className="mt-1">
                    {p.dataObj.toLocaleDateString('pt-BR')} ·{' '}
                    <b>{p.diasAte < 0 ? `${Math.abs(p.diasAte)}d atrás`
                      : p.diasAte === 0 ? 'hoje'
                      : `em ${p.diasAte}d`}</b>
                  </p>
                  {p.distanciaKm != null && (
                    <p className="text-slate-600 mt-1">📍 {p.distanciaKm.toFixed(1)} km</p>
                  )}
                  {p.cidade && <p className="text-slate-500">{p.cidade}{p.estado ? `/${p.estado}` : ''}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  )
}
