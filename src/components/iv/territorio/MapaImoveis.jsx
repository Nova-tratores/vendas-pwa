// Mapa dos imóveis do CAR: polígono colorido pela cultura, opacidade pela prioridade,
// contorno escuro quando já tem cliente nosso ligado. Toque abre a ficha.
// Em zoom afastado o polígono fica pequeno, então cada imóvel ganha também um ponto.
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair } from 'lucide-react'
import { corCultura, PRIORIDADES, num } from './comum'

function Enquadrar({ imoveis, chave }) {
  const map = useMap()
  useEffect(() => {
    const pts = imoveis.flatMap((p) => p.poligono || [[p.lat, p.lng]])
    if (!pts.length) return
    map.fitBounds(pts, { padding: [24, 24], maxZoom: 13, animate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave])
  return null
}

function IrPara({ imovel }) {
  const map = useMap()
  useEffect(() => {
    if (!imovel) return
    map.flyToBounds(imovel.poligono || [[imovel.lat, imovel.lng]], { padding: [60, 60], maxZoom: 14, duration: 0.6 })
  }, [imovel, map])
  return null
}

function Zoom({ onZoom }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
  useEffect(() => { onZoom(map.getZoom()) }, [map, onZoom])
  return null
}

function BotaoEnquadrar({ imoveis }) {
  const map = useMap()
  return (
    <button
      type="button"
      aria-label="Ver todos os imóveis"
      onClick={() => {
        const pts = imoveis.flatMap((p) => p.poligono || [[p.lat, p.lng]])
        if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 13 })
      }}
      className="absolute top-2 right-2 z-[500] bg-white rounded-xl shadow border border-slate-200 p-2 text-slate-700"
    >
      <Crosshair size={18} aria-hidden="true" />
    </button>
  )
}

export default function MapaImoveis({ imoveis, selecionado, onSelecionar, chaveFiltro }) {
  const [zoom, setZoom] = useState(10)
  const centro = useMemo(() => {
    if (!imoveis.length) return [-23.19, -49.38]
    return [imoveis.reduce((s, p) => s + p.lat, 0) / imoveis.length, imoveis.reduce((s, p) => s + p.lng, 0) / imoveis.length]
  }, [imoveis])
  const pontos = zoom < 12

  return (
    // isolate + z-0: o mapa cria o próprio empilhamento e nunca fica por cima dos menus do app
    <div className="ivt-mapa relative z-0 isolate rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ height: '55vh', minHeight: 300 }}>
      <MapContainer center={centro} zoom={10} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }} zoomControl attributionControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Enquadrar imoveis={imoveis} chave={chaveFiltro} />
        <IrPara imovel={selecionado} />
        <Zoom onZoom={setZoom} />
        <BotaoEnquadrar imoveis={imoveis} />
        {imoveis.map((p) => {
          const sel = selecionado?.cod === p.cod
          const pr = PRIORIDADES[p.prioridade] || PRIORIDADES.baixa
          const cor = corCultura(p.cultura)
          return (
            <Polygon
              key={`g-${p.cod}`}
              positions={p.poligono}
              pathOptions={{
                color: sel ? '#0f172a' : p.vinculos ? '#1e3a8a' : '#334155',
                weight: sel ? 3.5 : p.vinculos ? 2.2 : 1,
                fillColor: cor,
                fillOpacity: sel ? Math.min(0.92, pr.opacidade + 0.15) : pr.opacidade,
                dashArray: p.vinculos ? undefined : '4 3',
              }}
              eventHandlers={{ click: () => onSelecionar(p) }}
            >
              <Tooltip direction="top" sticky>
                <b>{num(p.areaHa)} ha</b> · {p.cultura} · prioridade {pr.rotulo.toLowerCase()}
              </Tooltip>
            </Polygon>
          )
        })}
        {pontos && imoveis.map((p) => {
          const sel = selecionado?.cod === p.cod
          const pr = PRIORIDADES[p.prioridade] || PRIORIDADES.baixa
          return (
            <CircleMarker
              key={`c-${p.cod}`}
              center={[p.lat, p.lng]}
              radius={sel ? 9 : p.prioridade === 'alta' ? 7 : 5.5}
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: corCultura(p.cultura), fillOpacity: Math.max(0.55, pr.opacidade + 0.2) }}
              eventHandlers={{ click: () => onSelecionar(p) }}
            />
          )
        })}
      </MapContainer>
    </div>
  )
}
