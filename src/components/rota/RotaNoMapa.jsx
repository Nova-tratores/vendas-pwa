// Rota do dia no mapa: caminho de carro pelas estradas, na ordem mais rápida,
// com a posição do vendedor ao vivo. O cálculo é do OSRM (roteador aberto sobre o
// OpenStreetMap, serviço público router.project-osrm.org): /trip devolve a melhor
// ordem saindo da origem e voltando a ela, mais o traçado, km e tempo reais.
// Sem internet ou se o OSRM falhar: ordem "o mais perto a seguir" em linha reta.
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Clock, ExternalLink, House, LocateFixed, Navigation, Radio, Route } from 'lucide-react'
import { MAX_PARADAS_GOOGLE, partesGoogle } from '../../lib/rotaGoogle'

const OSRM = 'https://router.project-osrm.org'
const cacheRotas = new Map() // mesma sequência de pontos = mesma resposta
// O OSRM público é um servidor de demonstração (1 pedido por segundo, sem garantia):
// a rota de cada conjunto de paradas fica guardada no celular por 7 dias.
const VALIDADE_MS = 7 * 24 * 3600 * 1000
const chaveLocal = (coords) => 'osrm:' + coords
function lerGuardada(coords) {
  try {
    const x = JSON.parse(localStorage.getItem(chaveLocal(coords)) || 'null')
    return x && Date.now() - x.em < VALIDADE_MS ? x.r : null
  } catch { return null }
}
function guardar(coords, r) {
  try { localStorage.setItem(chaveLocal(coords), JSON.stringify({ em: Date.now(), r })) } catch { /* sem espaço: só não guarda */ }
}

const haversineKm = (a, b) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Ordem pelo mais perto a seguir (reserva quando o OSRM não responde). */
function ordemLocal(origem, itens) {
  const resta = [...itens], out = []
  let atual = origem, km = 0
  while (resta.length) {
    let k = 0, d = Infinity
    resta.forEach((it, i) => { const x = haversineKm(atual, [it.lat, it.lng]); if (x < d) { d = x; k = i } })
    const [it] = resta.splice(k, 1)
    km += d; out.push(it); atual = [it.lat, it.lng]
  }
  km += haversineKm(atual, origem)
  return { ordem: out, linha: [origem, ...out.map((i) => [i.lat, i.lng]), origem], km: km * 1.3, min: (km * 1.3) / 60 * 60, real: false }
}

async function rotaOSRM(origem, itens) {
  const pontos = [origem, ...itens.map((i) => [i.lat, i.lng])]
  const coords = pontos.map(([lat, lng]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';')
  if (cacheRotas.has(coords)) return cacheRotas.get(coords)
  const guardada = lerGuardada(coords)
  if (guardada) {
    // a ordem guardada vem só com os ids; refaz com os itens atuais
    const porId = new Map(itens.map((i) => [String(i.id), i]))
    const r = { ...guardada, ordem: guardada.ordemIds.map((id) => porId.get(id)).filter(Boolean) }
    if (r.ordem.length === itens.length) { cacheRotas.set(coords, r); return r }
  }
  const url = `${OSRM}/trip/v1/driving/${coords}?source=first&roundtrip=true&geometries=geojson&overview=full`
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000)
  const res = await fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t))
  if (!res.ok) throw new Error('OSRM ' + res.status)
  const j = await res.json()
  if (j.code !== 'Ok' || !j.trips?.[0]) throw new Error('OSRM sem rota')
  // waypoints[i].waypoint_index = posição do ponto i na viagem (0 = origem)
  const pos = j.waypoints.map((w, i) => ({ i, ordem: w.waypoint_index }))
  const ordem = pos.filter((p) => p.i > 0).sort((a, b) => a.ordem - b.ordem).map((p) => itens[p.i - 1])
  const trip = j.trips[0]
  const r = {
    ordem,
    linha: trip.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: trip.distance / 1000,
    min: trip.duration / 60,
    pernas: trip.legs.map((l) => ({ km: l.distance / 1000, min: l.duration / 60 })),
    real: true,
  }
  cacheRotas.set(coords, r)
  const { ordem: _o, ...semItens } = r
  guardar(coords, { ...semItens, ordemIds: ordem.map((i) => String(i.id)) })
  return r
}

/** Caminho na ORDEM DADA (o vendedor escolheu): /route do OSRM, saindo e voltando à origem. */
async function rotaNaOrdem(origem, itens) {
  const pontos = [origem, ...itens.map((i) => [i.lat, i.lng]), origem]
  const coords = pontos.map(([lat, lng]) => `${lng.toFixed(5)},${lat.toFixed(5)}`).join(';')
  const chave = 'r:' + coords
  if (cacheRotas.has(chave)) return { ...cacheRotas.get(chave), ordem: itens }
  const guardada = lerGuardada(chave)
  if (guardada) { cacheRotas.set(chave, guardada); return { ...guardada, ordem: itens } }
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000)
  const res = await fetch(`${OSRM}/route/v1/driving/${coords}?geometries=geojson&overview=full`, { signal: ctrl.signal }).finally(() => clearTimeout(t))
  if (!res.ok) throw new Error('OSRM ' + res.status)
  const j = await res.json()
  if (j.code !== 'Ok' || !j.routes?.[0]) throw new Error('OSRM sem rota')
  const rt = j.routes[0]
  const r = {
    linha: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    km: rt.distance / 1000, min: rt.duration / 60,
    pernas: rt.legs.map((l) => ({ km: l.distance / 1000, min: l.duration / 60 })), real: true,
  }
  cacheRotas.set(chave, r); guardar(chave, r)
  return { ...r, ordem: itens }
}

/** Reserva sem OSRM, mantendo a ordem dada. */
function ordemFixaLocal(origem, itens) {
  const linha = [origem, ...itens.map((i) => [i.lat, i.lng]), origem]
  let km = 0
  for (let i = 1; i < linha.length; i++) km += haversineKm(linha[i - 1], linha[i])
  return { ordem: itens, linha, km: km * 1.3, min: km * 1.3, real: false }
}

const fmtTempo = (min) => {
  const m = Math.round(min)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

function numero(n, cor) {
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${cor};color:#fff;font:800 13px sans-serif;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)">${n}</div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14],
  })
}
const ICONE_SAIDA = L.divIcon({
  html: '<div style="width:34px;height:34px;border-radius:10px;background:#0f172a;color:#fff;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>',
  className: '', iconSize: [34, 34], iconAnchor: [17, 17],
})

function Enquadrar({ pontos, chave }) {
  const map = useMap()
  useEffect(() => {
    if (pontos.length > 1) map.fitBounds(pontos, { padding: [30, 30] })
    else if (pontos.length === 1) map.setView(pontos[0], 10)
  }, [map, chave]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function IrPara({ alvo }) {
  const map = useMap()
  useEffect(() => { if (alvo) map.flyTo(alvo, Math.max(map.getZoom(), 12), { duration: 0.8 }) }, [map, alvo])
  return null
}

/**
 * @param origem {nome, pos:[lat,lng], ehLoja}
 * @param itens contatos do dia (com lat/lng)
 * @param cores tipo → cor
 * @param onOrdem(ordemDeItens) devolve a ordem final para a lista abaixo do mapa
 * @param onAbrir(item) toque no cliente
 * @param onOrigem(novaOrigem) troca a saída
 */
export default function RotaNoMapa({ origem, itens, cores, onOrdem, onAbrir, onOrigem, compacto = false, manterOrdem = false, onMelhorOrdem }) {
  const comPos = useMemo(() => itens.filter((i) => i.lat != null && i.lng != null), [itens])
  const chave = useMemo(() => `${origem.pos.join(',')}|${comPos.map((i) => i.id).join(',')}`, [origem, comPos])
  const [r, setR] = useState(null)
  const [calculando, setCalculando] = useState(false)
  const [aqui, setAqui] = useState(null) // posição ao vivo do vendedor
  const [irPara, setIrPara] = useState(null)

  // posição ao vivo (ponto azul); sem permissão, simplesmente não aparece
  useEffect(() => {
    if (!navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (p) => setAqui({ pos: [p.coords.latitude, p.coords.longitude], prec: p.coords.accuracy }),
      () => {}, { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  useEffect(() => {
    let vivo = true
    if (!comPos.length) { setR(null); return }
    setCalculando(true)
    const local = manterOrdem ? ordemFixaLocal(origem.pos, comPos) : ordemLocal(origem.pos, comPos)
    setR((atual) => atual || local)
    const calcular = manterOrdem ? rotaNaOrdem : rotaOSRM
    ;(navigator.onLine ? calcular(origem.pos, comPos) : Promise.reject(new Error('offline')))
      .then((x) => {
        if (!vivo) return
        setR(x)
        // Na ordem do vendedor: confere se existe uma ordem mais curta (1 s depois: limite do OSRM público)
        if (manterOrdem && onMelhorOrdem && comPos.length > 2) {
          setTimeout(() => {
            rotaOSRM(origem.pos, comPos).then((otima) => {
              if (!vivo) return
              const mesma = otima.ordem.every((it, k) => it.id === comPos[k].id)
              const economia = x.km - otima.km
              onMelhorOrdem(!mesma && economia >= Math.max(3, x.km * 0.05) ? { ids: otima.ordem.map((i) => i.id), economiaKm: Math.round(economia) } : null)
            }).catch(() => {})
          }, 1100)
        }
      })
      .catch(() => { if (vivo) setR(local) })
      .finally(() => { if (vivo) setCalculando(false) })
    return () => { vivo = false }
  }, [chave]) // eslint-disable-line react-hooks/exhaustive-deps

  const semPos = useMemo(() => itens.filter((i) => i.lat == null || i.lng == null), [itens])
  useEffect(() => { if (r) onOrdem?.([...r.ordem, ...semPos]) }, [r, semPos]) // eslint-disable-line react-hooks/exhaustive-deps

  const ordem = r?.ordem || []
  const partes = useMemo(() => partesGoogle(origem.pos, ordem), [ordem, origem])

  return (
    <div className="mb-3">
      {/* saída */}
      {!compacto && (<>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        <span className="text-slate-500">Saída:</span>
        <button onClick={() => onOrigem?.('loja')} className={`px-3 py-1 rounded-full font-bold ${origem.ehLoja ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
          <span className="inline-flex items-center gap-1"><House size={14} /> Loja</span>
        </button>
        <button onClick={() => onOrigem?.('gps', aqui?.pos)} className={`px-3 py-1 rounded-full font-bold ${!origem.ehLoja ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
          <span className="inline-flex items-center gap-1"><Radio size={14} /> Onde estou</span>
        </button>
      </div>

      {/* resumo da rota */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-2xl bg-slate-900 text-white p-3">
          <p className="text-[10px] font-bold uppercase opacity-70 inline-flex items-center gap-1"><Route size={12} /> Distância</p>
          <p className="text-lg font-black leading-tight">{r ? `${Math.round(r.km)} km` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-3">
          <p className="text-[10px] font-bold uppercase opacity-70 inline-flex items-center gap-1"><Clock size={12} /> Ao volante</p>
          <p className="text-lg font-black leading-tight">{r ? fmtTempo(r.min) : '—'}</p>
        </div>
        <div className="rounded-2xl bg-slate-900 text-white p-3">
          <p className="text-[10px] font-bold uppercase opacity-70 inline-flex items-center gap-1"><Navigation size={12} /> Paradas</p>
          <p className="text-lg font-black leading-tight">{ordem.length}</p>
        </div>
      </div>
      </>)}
      {compacto && (
        <div className="flex items-center gap-3 mb-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1"><Route size={13} /> {r ? `${Math.round(r.km)} km` : '—'}</span>
          <span className="inline-flex items-center gap-1"><Clock size={13} /> {r ? fmtTempo(r.min) : '—'} ao volante</span>
          <span className="inline-flex items-center gap-1"><Navigation size={13} /> {ordem.length} paradas</span>
        </div>
      )}

      <div className="relative rounded-2xl overflow-hidden border border-slate-200 isolate z-0" style={compacto ? { height: 230 } : { height: '52vh', minHeight: 320 }}>
        <MapContainer center={origem.pos} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
          {r && (
            <>
              {/* contorno branco + linha vermelha = traçado legível sobre qualquer fundo */}
              <Polyline positions={r.linha} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
              <Polyline positions={r.linha} pathOptions={{ color: '#b91c1c', weight: 4.5, opacity: 0.95, dashArray: r.real ? null : '8 8' }} />
            </>
          )}
          <Marker position={origem.pos} icon={ICONE_SAIDA}><Tooltip>{origem.nome}</Tooltip></Marker>
          {ordem.map((it, k) => (
            <Marker key={it.id} position={[it.lat, it.lng]} icon={numero(k + 1, cores[it.tipo] || '#b91c1c')}>
              <Popup>
                <div style={{ minWidth: 190 }}>
                  <p style={{ margin: 0, fontWeight: 800 }}>{k + 1}. {it.titulo}</p>
                  <p style={{ margin: '2px 0 6px', color: '#64748b', fontSize: 12 }}>
                    {it.cidade}{r?.pernas?.[k] ? ` · ${Math.round(r.pernas[k].km)} km, ${fmtTempo(r.pernas[k].min)} desde a parada anterior` : ''}
                  </p>
                  <button
                    onClick={() => onAbrir?.(it)}
                    style={{ width: '100%', background: '#b91c1c', color: '#fff', border: 0, borderRadius: 10, padding: '8px 10px', fontWeight: 700, fontSize: 13 }}
                  >
                    Ver ficha do cliente
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
          {aqui && (
            <>
              <CircleMarker center={aqui.pos} radius={14} pathOptions={{ color: '#2563eb', weight: 0, fillColor: '#3b82f6', fillOpacity: 0.18 }} />
              <CircleMarker center={aqui.pos} radius={7} pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }}>
                <Tooltip>Você está aqui</Tooltip>
              </CircleMarker>
            </>
          )}
          <Enquadrar chave={`${chave}|${ordem.length}`} pontos={[origem.pos, ...ordem.map((i) => [i.lat, i.lng])]} />
          <IrPara alvo={irPara} />
        </MapContainer>

        {aqui && (
          <button
            onClick={() => setIrPara([...aqui.pos])}
            className="absolute right-3 bottom-3 z-[500] w-11 h-11 rounded-full bg-white shadow-lg grid place-items-center text-blue-600 active:bg-slate-100"
            aria-label="Mostrar onde estou"
          >
            <LocateFixed size={20} />
          </button>
        )}
        {calculando && (
          <span className="absolute left-3 top-3 z-[500] text-[11px] font-semibold bg-white/95 rounded-full px-2.5 py-1 shadow">Calculando o melhor caminho…</span>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-snug mt-2">
        {r?.real
          ? 'Caminho de carro pelas estradas, na ordem mais rápida (OpenStreetMap). Toque num número para ver o cliente.'
          : 'Sem o cálculo pelas estradas agora: ordem pelo mais perto e distância estimada (linha reta + 30%).'}
      </p>

      {/* Colocar a rota no Google Maps: até 9 paradas por rota; acima disso, partes encadeadas */}
      {partes.length > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600 inline-flex items-center gap-1.5">
            <Navigation size={13} /> Colocar a rota no Google Maps
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
            {partes.length === 1
              ? `Abre o Google Maps com todas as paradas, na mesma ordem, saindo e voltando à ${origem.ehLoja ? 'loja' : 'sua posição'}.`
              : `O Google aceita até ${MAX_PARADAS_GOOGLE} paradas por rota. A sua foi dividida em ${partes.length} partes: termine uma e abra a seguinte.`}
          </p>
          <div className="space-y-2">
            {partes.map((p, i) => (
              <a
                key={p.de}
                href={p.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-blue-700 text-white px-3 py-2.5 active:bg-blue-800"
              >
                <span className="w-8 h-8 rounded-lg bg-white/20 grid place-items-center shrink-0"><Navigation size={17} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-tight">
                    {partes.length === 1 ? 'Abrir a rota no Google Maps' : `Parte ${i + 1} · paradas ${p.de} a ${p.ate}`}
                  </span>
                  <span className="block text-[11px] opacity-85">
                    {p.paradas} parada{p.paradas > 1 ? 's' : ''}
                    {manterOrdem && p.horaIni ? ` · ${p.horaIni}${p.horaFim ? ` às ${p.horaFim}` : ''}` : ''}
                    {i === partes.length - 1 ? ' · volta no fim' : ''}
                  </span>
                </span>
                <ExternalLink size={15} className="shrink-0 opacity-80" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
