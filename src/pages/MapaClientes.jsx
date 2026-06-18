import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/sync'
import { capturarGPS } from '../lib/gps'
import ConfirmModal from '../components/ConfirmModal'

// Fix do icone padrao do leaflet (Vite bundling quebra as URLs default)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const VOCE_ICON = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="11" fill="#16a34a" stroke="#fff" stroke-width="3"/>
    <circle cx="14" cy="14" r="3" fill="#fff"/>
  </svg>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function pinIcon(cor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0 C7.2 0 0 7.2 0 16 c0 12 16 24 16 24 s16-12 16-24 c0-8.8-7.2-16-16-16 z" fill="${cor}" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="14" r="6" fill="#fff"/>
  </svg>`
  return L.divIcon({ html: svg, className: '', iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -36] })
}
const CLIENTE_ICON = pinIcon('#1e40af')   // azul
const ALVO_ICON = pinIcon('#dc2626')      // vermelho (cliente pesquisado / em rota)

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

function nomeCliente(c) {
  return c?.nome_fantasia || c?.razao_social || 'Cliente'
}

// Busca rota real pela estrada (OSRM publico, sem chave). Fallback: linha reta.
async function buscarRota(origem, dest) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${origem.lng},${origem.lat};${dest.lng},${dest.lat}?overview=full&geometries=geojson`
    const r = await fetch(url)
    const j = await r.json()
    const rota = j?.routes?.[0]
    if (rota?.geometry?.coordinates?.length) {
      return {
        coords: rota.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        distKm: rota.distance / 1000,
        durMin: rota.duration / 60,
        fallback: false,
      }
    }
  } catch {
    // ignora e usa fallback
  }
  return {
    coords: [[origem.lat, origem.lng], [dest.lat, dest.lng]],
    distKm: haversineKm(origem.lat, origem.lng, dest.lat, dest.lng),
    durMin: null,
    fallback: true,
  }
}

// Controla a view do mapa imperativamente quando muda `focus`
function MapController({ focus }) {
  const map = useMap()
  useEffect(() => {
    if (!focus) return
    if (focus.bounds) map.fitBounds(focus.bounds, { padding: [60, 60], maxZoom: 15 })
    else if (focus.center) map.flyTo(focus.center, focus.zoom || 14, { duration: 0.6 })
  }, [focus, map])
  return null
}

export default function MapaClientes() {
  const [origem, setOrigem] = useState(null)        // { lat, lng, accuracy }
  const [origemErro, setOrigemErro] = useState(null)
  const [clientes, setClientes] = useState([])      // clientes COM lat/lng
  const [loading, setLoading] = useState(true)
  const [focus, setFocus] = useState(null)          // { center, zoom } | { bounds }

  const [selecionado, setSelecionado] = useState(null)   // cliente em rota
  const [rota, setRota] = useState(null)                 // { coords, distKm, durMin, fallback }
  const [rotaLoading, setRotaLoading] = useState(false)

  const [picker, setPicker] = useState(null)        // 'locate' | 'add' | null
  const [confirmar, setConfirmar] = useState(null)  // cliente p/ sobrescrever coords
  const [salvando, setSalvando] = useState(false)
  const [toast, setToast] = useState(null)

  const watchRef = useRef(null)

  const mostrarToast = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => {
    iniciarRastreamento()
    carregarClientes()
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    }
  }, [])

  // Rastreia a posição continuamente (pede permissão e mantém atualizada).
  // Chamável de novo a qualquer momento para re-solicitar quando necessário.
  function iniciarRastreamento() {
    if (!navigator.geolocation) {
      setOrigemErro('Geolocalização não suportada')
      return
    }
    setOrigemErro(null)
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current)
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setOrigem({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setOrigemErro(null)
      },
      (err) => setOrigemErro(err.message || 'GPS bloqueado'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  }

  async function carregarClientes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('portal_nt_clientes_PRINCIPAL')
        .select('id,nome_fantasia,razao_social,cidade,estado,lat,lng')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(3000)
      if (error) throw error
      setClientes((data || []).map((c) => ({ ...c, lat: Number(c.lat), lng: Number(c.lng) })))
    } catch (err) {
      console.error('[MapaClientes] carregar', err)
      mostrarToast('Erro ao carregar clientes (offline?)', 'erro')
    }
    setLoading(false)
  }

  function irParaMim() {
    if (origem) setFocus({ center: [origem.lat, origem.lng], zoom: 15 })
    else { iniciarRastreamento(); mostrarToast('Obtendo sua localização…') }
  }

  // ---- LUPA: localizar cliente + traçar rota ----
  async function localizarCliente(c) {
    setPicker(null)
    if (c.lat == null || c.lng == null) {
      mostrarToast('Cliente sem localização. Use o + para cadastrar.', 'erro')
      return
    }
    // garante que o cliente aparece na lista de marcadores
    setClientes((prev) => prev.some((x) => x.id === c.id) ? prev : [...prev, c])
    setSelecionado(c)
    setFocus({ center: [c.lat, c.lng], zoom: 14 })

    if (origem) {
      setRotaLoading(true)
      const r = await buscarRota(origem, c)
      setRota(r)
      setRotaLoading(false)
      setFocus({ bounds: L.latLngBounds([[origem.lat, origem.lng], [c.lat, c.lng]]) })
    } else {
      setRota(null)
      iniciarRastreamento()
      mostrarToast('Ativando GPS para traçar a rota…', 'erro')
    }
  }

  // ---- "+": escolher cliente e gravar coordenadas atuais ----
  function escolherParaCadastrar(c) {
    setPicker(null)
    if (c.lat != null && c.lng != null) {
      setConfirmar(c)   // já tem coords → confirmar sobrescrita
    } else {
      gravarCoords(c)
    }
  }

  async function gravarCoords(c) {
    setConfirmar(null)
    setSalvando(true)
    try {
      const pos = await capturarGPS()  // coords frescas (maximumAge: 0)
      const lat = pos.latitude
      const lng = pos.longitude
      const { error } = await supabase
        .from('portal_nt_clientes_PRINCIPAL')
        .update({ lat, lng })
        .eq('id', c.id)
      if (error) throw error
      const atualizado = { ...c, lat, lng }
      setClientes((prev) => {
        const idx = prev.findIndex((x) => x.id === c.id)
        if (idx >= 0) { const novo = [...prev]; novo[idx] = atualizado; return novo }
        return [...prev, atualizado]
      })
      setFocus({ center: [lat, lng], zoom: 16 })
      mostrarToast(`📍 ${nomeCliente(c)} salvo na sua posição atual!`)
    } catch (err) {
      console.error('[MapaClientes] gravar', err)
      mostrarToast(err.message || 'Erro ao salvar coordenadas', 'erro')
    }
    setSalvando(false)
  }

  function fecharRota() {
    setSelecionado(null)
    setRota(null)
  }

  const centroInicial = origem
    ? [origem.lat, origem.lng]
    : clientes[0] ? [clientes[0].lat, clientes[0].lng] : [-22.32, -49.07]

  const mapsUrl = selecionado
    ? `https://www.google.com/maps/dir/?api=1&destination=${selecionado.lat},${selecionado.lng}${origem ? `&origin=${origem.lat},${origem.lng}` : ''}`
    : null

  return (
    <div className="-mx-4 -mt-4 -mb-20 relative" style={{ height: 'calc(100vh - 7.25rem)' }}>
      {/* Cabeçalho flutuante */}
      <div className="absolute top-2 left-2 right-2 z-[1000] pointer-events-none">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow px-3 py-2 inline-block pointer-events-auto">
          <p className="text-sm font-bold leading-tight">Mapa de Clientes</p>
          <p className="text-[11px] text-slate-500 leading-tight">
            {loading ? 'carregando…' : `${clientes.length} no mapa`}
            {origem
              ? ` · GPS ${origem.accuracy < 100 ? 'OK' : `±${Math.round(origem.accuracy)}m`}`
              : origemErro ? ` · GPS: ${origemErro}` : ' · obtendo GPS…'}
          </p>
          {origemErro && (
            <button
              onClick={iniciarRastreamento}
              className="mt-1 text-[11px] font-semibold text-blue-700 active:text-blue-900"
            >
              🔄 Permitir / tentar localização de novo
            </button>
          )}
        </div>
      </div>

      <MapContainer center={centroInicial} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController focus={focus} />

        {origem && (
          <Marker position={[origem.lat, origem.lng]} icon={VOCE_ICON}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">Você está aqui</p>
                <p className="text-slate-500">precisão ±{Math.round(origem.accuracy)}m</p>
              </div>
            </Popup>
          </Marker>
        )}

        {clientes.map((c) => (
          <Marker
            key={c.id}
            position={[c.lat, c.lng]}
            icon={selecionado?.id === c.id ? ALVO_ICON : CLIENTE_ICON}
          >
            <Tooltip permanent direction="top" offset={[0, -38]} className="cliente-label">
              {nomeCliente(c)}
            </Tooltip>
            <Popup>
              <div className="text-xs">
                <p className="font-bold">{nomeCliente(c)}</p>
                {c.razao_social && c.razao_social !== nomeCliente(c) && (
                  <p className="text-slate-400">{c.razao_social}</p>
                )}
                <p className="text-slate-500">{c.cidade || ''}{c.estado ? ` - ${c.estado}` : ''}</p>
                {origem && (
                  <p className="text-slate-600 mt-1">
                    📍 {haversineKm(origem.lat, origem.lng, c.lat, c.lng)?.toFixed(1)} km
                  </p>
                )}
                <button
                  onClick={() => localizarCliente(c)}
                  className="mt-2 w-full bg-blue-700 text-white rounded py-1 font-medium"
                >
                  🧭 Traçar rota
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {rota?.coords && (
          <Polyline
            positions={rota.coords}
            pathOptions={{ color: rota.fallback ? '#94a3b8' : '#1d4ed8', weight: 5, opacity: 0.8, dashArray: rota.fallback ? '8 8' : null }}
          />
        )}
      </MapContainer>

      {/* Botões flutuantes (coluna direita): localizar / lupa / + */}
      <div className="absolute right-3 z-[1000] flex flex-col gap-3" style={{ bottom: selecionado ? '8.5rem' : '1.5rem' }}>
        <button
          onClick={irParaMim}
          title="Centralizar na minha posição"
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-xl active:scale-95 transition"
        >📍</button>
        <button
          onClick={() => setPicker('locate')}
          title="Pesquisar cliente"
          className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-xl active:scale-95 transition"
        >🔍</button>
        <button
          onClick={() => setPicker('add')}
          title="Cadastrar cliente na minha posição"
          className="w-14 h-14 rounded-full bg-blue-700 text-white shadow-lg flex items-center justify-center text-3xl font-light active:scale-95 transition"
        >+</button>
      </div>

      {/* Card de rota (cliente selecionado) */}
      {selecionado && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] bg-white rounded-xl shadow-lg p-3 animate-fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{nomeCliente(selecionado)}</p>
              <p className="text-xs text-slate-500 truncate">
                {selecionado.cidade || ''}{selecionado.estado ? ` - ${selecionado.estado}` : ''}
              </p>
              <p className="text-xs text-slate-700 mt-1">
                {rotaLoading ? 'calculando rota…'
                  : rota ? <>
                      🚗 <b>{rota.distKm?.toFixed(1)} km</b>
                      {rota.durMin != null && <> · ~{Math.round(rota.durMin)} min</>}
                      {rota.fallback && <span className="text-slate-400"> (linha reta)</span>}
                    </>
                  : 'sem GPS para calcular rota'}
              </p>
            </div>
            <button onClick={fecharRota} className="text-slate-400 text-lg leading-none px-1">✕</button>
          </div>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block text-center bg-green-600 text-white rounded-lg py-2 text-sm font-medium active:bg-green-700"
            >
              🧭 Abrir navegação no Google Maps
            </a>
          )}
        </div>
      )}

      {/* Modal de busca de cliente (lupa / +) */}
      {picker && (
        <ClientePicker
          modo={picker}
          onSelect={picker === 'locate' ? localizarCliente : escolherParaCadastrar}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Confirmar sobrescrita de coords existentes */}
      <ConfirmModal
        show={!!confirmar}
        title="Cliente já tem localização"
        message={confirmar ? `${nomeCliente(confirmar)} já possui coordenadas. Substituir pela sua posição atual?` : ''}
        onConfirm={() => gravarCoords(confirmar)}
        onCancel={() => setConfirmar(null)}
      />

      {/* Overlay enquanto salva (captura GPS + update) */}
      {salvando && (
        <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl px-5 py-4 shadow-xl flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Salvando localização…</span>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 rounded-full shadow-lg text-sm text-white text-center max-w-[90%] ${
          toast.tipo === 'erro' ? 'bg-red-600' : 'bg-slate-800'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ============================================
// Modal: busca de cliente no banco (server-side ilike)
// ============================================
function ClientePicker({ modo, onSelect, onClose }) {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const t = termo.trim()
    if (t.length < 2) { setResultados([]); setBuscando(false); return }
    setBuscando(true)
    timerRef.current = setTimeout(async () => {
      // sanitiza: virgulas/parenteses quebram o filtro .or() do PostgREST
      const limpo = t.replace(/[(),%]/g, ' ').trim()
      try {
        const { data, error } = await supabase
          .from('portal_nt_clientes_PRINCIPAL')
          .select('id,nome_fantasia,razao_social,cidade,estado,lat,lng')
          .or(`nome_fantasia.ilike.%${limpo}%,razao_social.ilike.%${limpo}%,cidade.ilike.%${limpo}%`)
          .limit(30)
        if (error) throw error
        setResultados(data || [])
      } catch (err) {
        console.error('[ClientePicker] busca', err)
        setResultados([])
      }
      setBuscando(false)
    }, 350)
    return () => clearTimeout(timerRef.current)
  }, [termo])

  const titulo = modo === 'add' ? 'Cadastrar cliente na sua posição' : 'Pesquisar cliente'
  const dica = modo === 'add'
    ? 'Escolha o cliente — será salvo com as coordenadas onde você está agora.'
    : 'Escolha o cliente para ver no mapa e traçar a rota.'

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex flex-col" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl mt-auto max-h-[80vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">{titulo}</h3>
            <button onClick={onClose} className="text-slate-400 text-xl leading-none">✕</button>
          </div>
          <p className="text-xs text-slate-500 mb-2">{dica}</p>
          <input
            ref={inputRef}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Nome, razão social ou cidade…"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {buscando ? (
            <p className="text-center text-sm text-slate-400 py-6">Buscando…</p>
          ) : termo.trim().length < 2 ? (
            <p className="text-center text-sm text-slate-400 py-6">Digite ao menos 2 letras</p>
          ) : resultados.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">Nenhum cliente encontrado</p>
          ) : (
            resultados.map((c) => {
              const temCoord = c.lat != null && c.lng != null
              return (
                <button
                  key={c.id}
                  onClick={() => onSelect({ ...c, lat: c.lat != null ? Number(c.lat) : null, lng: c.lng != null ? Number(c.lng) : null })}
                  className="w-full text-left px-3 py-2.5 rounded-lg active:bg-slate-100 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{nomeCliente(c)}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {c.cidade || 'sem cidade'}{c.estado ? ` - ${c.estado}` : ''}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    temCoord ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {temCoord ? '📍 no mapa' : 'sem local'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
