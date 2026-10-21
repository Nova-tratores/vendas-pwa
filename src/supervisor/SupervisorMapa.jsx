import { useState, useEffect, useMemo, useCallback } from 'react'
import { Flag, Car, TriangleAlert, Clock, X } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getVisitas, getVendedores } from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome, corVendedor } from '../components/VendedorAvatar'
import {
  carrosDosVendedores, rotaDoDia, STATUS, hojeBR, fmtHora, fmtDuracao, fmtDia, fmtKm, haQuanto, corParada, juntarVisitas,
} from '../lib/mapaVendedores'

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

// nomes vêm do cadastro — nunca interpolar cru no HTML do ícone
const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))

const ICONE_CARRO = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>'

function iconeCarro(c, escolhido) {
  const cor = (STATUS[c.status] || STATUS.sem_sinal).cor
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="width:30px;height:30px;border-radius:50%;background:${cor};border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:${escolhido ? `0 0 0 5px ${cor}55,` : ''}0 2px 6px rgba(0,0,0,.45)">${ICONE_CARRO}</div>
      <div style="margin-top:2px;background:rgba(15,23,42,.9);color:#fff;font:700 10.5px sans-serif;padding:1px 6px;border-radius:4px;white-space:nowrap">${esc(primeiroNome(c.vendedor_nome))} · ${esc(c.placa_exibicao)}</div>
    </div>`,
    iconSize: [140, 52],
    iconAnchor: [70, 15],
  })
}

function iconeParada(min) {
  const cor = corParada(min)
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center">
      <div style="background:${cor};color:#fff;font:800 10px sans-serif;padding:2px 6px;border-radius:4px;white-space:nowrap">${fmtDuracao(min)}</div>
      <div style="width:10px;height:10px;border-radius:50%;background:${cor};border:2px solid #fff;margin-top:2px"></div>
    </div>`,
    iconSize: [60, 24],
    iconAnchor: [30, 24],
  })
}

const TIPOS = [
  { key: '', label: 'Todos' },
  { key: 'presencial', label: 'Presencial' },
  { key: 'mensagem', label: 'Mensagem' },
  { key: 'telefonema', label: 'Telefonema' },
  { key: 'email', label: 'E-mail' },
]

const linkMapa = (lat, lng) => `https://www.google.com/maps?q=${lat},${lng}`

export default function SupervisorMapa() {
  const hoje = hojeBR()
  const [visitas, setVisitas] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  // Abre no dia de hoje, com todos os vendedores
  const [filtros, setFiltros] = useState({ vendedor_id: '', tipo: '', dateFrom: hoje, dateTo: hoje })
  const [carros, setCarros] = useState([])
  const [carrosErro, setCarrosErro] = useState('')
  const [rota, setRota] = useState(null)
  const [rotaCarregando, setRotaCarregando] = useState(false)
  const [rotaErro, setRotaErro] = useState('')
  const [timelineAberta, setTimelineAberta] = useState(true)
  const [mapa, setMapa] = useState(null)
  const [agora, setAgora] = useState(() => Date.now())

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
      // dia inteiro no horário local (new Date('AAAA-MM-DD') seria meia-noite UTC = 21h da véspera)
      if (filtros.dateFrom) params.dateFrom = new Date(filtros.dateFrom + 'T00:00:00').toISOString()
      if (filtros.dateTo) params.dateTo = new Date(filtros.dateTo + 'T23:59:59').toISOString()
      const data = await getVisitas(params)
      setVisitas(data)
    } catch (err) {
      console.error('[Mapa]', err)
    }
    setLoading(false)
  }

  // Carros dos vendedores: só faz sentido quando o período inclui hoje (é a posição de agora)
  const incluiHoje = (!filtros.dateFrom || filtros.dateFrom <= hoje) && (!filtros.dateTo || filtros.dateTo >= hoje)
  const carregarCarros = useCallback(async () => {
    if (document.hidden) return
    try {
      const d = await carrosDosVendedores()
      setCarros(d.carros || [])
      setCarrosErro('')
    } catch (e) {
      setCarrosErro(e.message)
    }
    setAgora(Date.now())
  }, [])

  useEffect(() => {
    carregarCarros()
    const i = setInterval(carregarCarros, 60000)
    const aoVoltar = () => { if (!document.hidden) carregarCarros() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', aoVoltar) }
  }, [carregarCarros])

  const vendSel = filtros.vendedor_id
  const vendedorSel = vendedores.find((v) => String(v.id) === vendSel)
  const carroSel = carros.find((c) => String(c.vendedor_id) === vendSel) || null
  const diaUnico = filtros.dateFrom && filtros.dateFrom === filtros.dateTo ? filtros.dateFrom : null

  // Trajeto do dia do carro do vendedor escolhido
  useEffect(() => {
    setRota(null); setRotaErro('')
    if (!carroSel?.placa || !diaUnico) return
    let vivo = true
    setRotaCarregando(true)
    rotaDoDia(carroSel.placa, diaUnico)
      .then((r) => { if (vivo) { setRota(r); setTimelineAberta(true) } })
      .catch((e) => { if (vivo) setRotaErro(e.message) })
      .finally(() => { if (vivo) setRotaCarregando(false) })
    return () => { vivo = false }
  }, [carroSel?.placa, diaUnico])

  // Só visitas com GPS válido
  const pontos = useMemo(() =>
    visitas
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => ({ ...v, lat: Number(v.latitude), lng: Number(v.longitude) }))
  , [visitas])

  const carrosNoMapa = useMemo(() => {
    if (!incluiHoje) return []
    const base = carros.filter((c) => c.lat != null && c.lng != null)
    return vendSel ? base.filter((c) => String(c.vendedor_id) === vendSel) : base
  }, [carros, incluiHoje, vendSel])

  // Enquadra o que está na tela: trajeto do dia, senão visitas + carros
  useEffect(() => {
    if (!mapa || loading) return
    const coords = rota?.segmentos?.length
      ? rota.segmentos.flat()
      : [...pontos.map((p) => [p.lat, p.lng]), ...carrosNoMapa.map((c) => [c.lat, c.lng])]
    if (coords.length === 0) return
    if (coords.length === 1) mapa.setView(coords[0], 13)
    else mapa.fitBounds(coords, { padding: [40, 40] })
  }, [mapa, loading, rota, pontos, carrosNoMapa.length, vendSel])

  const semGps = visitas.length - pontos.length
  // Centro padrão: Piraju/SP (loja), caso não tenha pontos
  const centroDefault = [-23.2, -49.37]

  // Vendedores presentes no mapa atual (para a legenda de cores)
  const vendedoresNoMapa = useMemo(() => {
    const ids = new Set(pontos.map((p) => p.vendedor_id))
    return vendedores.filter((v) => ids.has(v.id))
  }, [pontos, vendedores])

  const eventos = useMemo(
    () => (rota ? juntarVisitas(rota.timeline, visitas.filter((v) => String(v.vendedor_id) === vendSel)) : []),
    [rota, visitas, vendSel],
  )

  const escolherVendedor = (id) => setFiltros((f) => ({ ...f, vendedor_id: f.vendedor_id === String(id) ? '' : String(id) }))
  const irPara = (lat, lng) => mapa?.flyTo([lat, lng], 15, { duration: 0.8 })

  let avisoVendedor = ''
  if (vendSel && vendedorSel) {
    if (!carroSel) avisoVendedor = `${primeiroNome(vendedorSel.nome)} não tem carro com rastreador em seu nome na Frota — só as visitas aparecem.`
    else if (!diaUnico) avisoVendedor = 'Para ver o trajeto do carro, escolha um dia só (mesma data em "de" e "até").'
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-2">Mapa de visitas</h2>
      <p className="text-xs text-slate-500 mb-3">
        {pontos.length} visita{pontos.length !== 1 ? 's' : ''} com GPS
        {semGps > 0 && ` · ${semGps} sem GPS (não aparecem no mapa)`}
        {incluiHoje && carros.length > 0 && ` · ${carros.length} carro${carros.length !== 1 ? 's' : ''} de vendedor`}
        {' · '}clique num vendedor para ver o trajeto e as paradas do dia
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
        {(filtros.dateFrom !== hoje || filtros.dateTo !== hoje) && (
          <button
            type="button"
            onClick={() => setFiltros((f) => ({ ...f, dateFrom: hoje, dateTo: hoje }))}
            className="text-xs text-blue-700 underline"
          >
            Voltar para hoje
          </button>
        )}
      </div>

      {(avisoVendedor || rotaErro || carrosErro) && (
        <div className="mb-3 text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200">
          {avisoVendedor || rotaErro || `Posição dos carros indisponível: ${carrosErro}`}
        </div>
      )}

      <div className="relative bg-white rounded-xl shadow overflow-hidden" style={{ height: '70vh', minHeight: 420 }}>
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/60">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <MapContainer ref={setMapa} center={centroDefault} zoom={10} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Trajeto do dia: buraco de sinal vira pontilhado, não linha reta */}
          {rota?.buracos?.map((b, i) => (
            <Polyline key={`b${i}`} positions={[b.de, b.ate]} pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.55, dashArray: '6 8' }}>
              <Tooltip>{b.tooltip}</Tooltip>
            </Polyline>
          ))}
          {rota?.segmentos?.map((s, i) => (
            <Polyline key={`s${i}`} positions={s} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }} />
          ))}
          {rota?.paradas?.map((p, i) => (
            <Marker key={`p${i}`} position={[p.lat, p.lng]} icon={iconeParada(p.duracao_min)}>
              <Popup>
                <b>Parada {fmtDuracao(p.duracao_min)}</b><br />
                {fmtHora(p.inicio)} – {p.fim ? fmtHora(p.fim) : 'agora'}
                {p.local && <><br />{p.local}</>}
              </Popup>
            </Marker>
          ))}
          {rota?.inicio && (
            <CircleMarker center={rota.inicio} radius={7} pathOptions={{ fillColor: '#22c55e', color: '#fff', weight: 2, fillOpacity: 1 }}>
              <Popup>Saída {fmtHora(rota.resumo?.inicio)}</Popup>
            </CircleMarker>
          )}
          {rota?.fim && (
            <CircleMarker center={rota.fim} radius={7} pathOptions={{ fillColor: '#dc2626', color: '#fff', weight: 2, fillOpacity: 1 }}>
              <Popup>Último ponto {fmtHora(rota.resumo?.fim)}</Popup>
            </CircleMarker>
          )}

          {/* Carro de cada vendedor, na última posição (só quando o período inclui hoje) */}
          {carrosNoMapa.map((c) => (
            <Marker
              key={c.placa}
              position={[c.lat, c.lng]}
              icon={iconeCarro(c, String(c.vendedor_id) === vendSel)}
              zIndexOffset={5000}
              eventHandlers={{ click: () => escolherVendedor(c.vendedor_id) }}
            >
              <Tooltip direction="top" offset={[0, -18]}>
                <b>{c.vendedor_nome}</b> · {c.placa_exibicao}<br />
                <span style={{ color: (STATUS[c.status] || STATUS.sem_sinal).cor, fontWeight: 700 }}>{(STATUS[c.status] || STATUS.sem_sinal).label}</span>
                {' · '}{haQuanto(c.dt, agora)}
                {c.local && <><br />{c.local}</>}
              </Tooltip>
            </Marker>
          ))}

          {pontos.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconePin(corVendedor(p.vendedor_id))}>
              <Popup>
                <div className="text-xs" style={{ minWidth: 170 }}>
                  {/* Cliente em destaque; rosto (avatar colorido) do vendedor no lugar do nome */}
                  <div className="flex items-center gap-2">
                    <VendedorAvatar id={p.vendedor_id} nome={p.vendedor_nome} size={32} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight">
                        {p.sinalizada && <span title="Sinalizada" className="text-red-600"><Flag size={14} className="inline-block align-[-2px] mr-1" /></span>}{p.cliente_nome || '—'}
                      </p>
                      <p className="text-slate-500 leading-tight">{p.propriedade_nome || '—'}</p>
                    </div>
                  </div>
                  <p className="text-slate-500 mt-1">{new Date(p.data_visita).toLocaleString('pt-BR')}</p>
                  <p className="capitalize text-slate-600 mt-0.5">{p.tipo}</p>
                  {p.veiculo && <p className="mt-1 text-slate-700 font-medium"><Car size={14} className="inline-block align-[-2px] mr-1" />{p.veiculo}</p>}
                  {p.resumo && <p className="mt-1 italic">{p.resumo.slice(0, 120)}{p.resumo.length > 120 ? '...' : ''}</p>}
                  {p.acionar_pos_vendas && <p className="mt-1 text-orange-600 font-medium"><TriangleAlert size={14} className="inline-block align-[-2px] mr-1" />Pós-vendas acionado</p>}
                  {/* Filtro por vendedor direto do popup */}
                  <button
                    type="button"
                    onClick={() => escolherVendedor(p.vendedor_id)}
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

        {/* Resumo do dia do vendedor escolhido */}
        {(rota || rotaCarregando) && (
          <div className="absolute left-2 right-2 sm:left-3 sm:right-auto bottom-3 z-[1000] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-900/95 text-white text-xs sm:text-sm font-bold px-4 py-2 shadow-lg">
            {rotaCarregando ? (
              <span>Buscando o trajeto de {primeiroNome(carroSel?.vendedor_nome)}…</span>
            ) : (
              <>
                <span>{fmtDia(rota.data)}</span>
                <span className="text-blue-400">{fmtKm(rota.resumo.km)}</span>
                <span className="text-amber-400">{rota.resumo.paradas} parada{rota.resumo.paradas !== 1 ? 's' : ''}</span>
                <span className="text-violet-300">{eventos.filter((e) => e.tipo === 'visita').length} visita{eventos.filter((e) => e.tipo === 'visita').length !== 1 ? 's' : ''}</span>
                <span className="text-emerald-400">{fmtDuracao(rota.resumo.dirigindo_min)} dirigindo</span>
                {rota.resumo.inicio && <span className="text-slate-400 font-medium">{fmtHora(rota.resumo.inicio)} – {fmtHora(rota.resumo.fim)}</span>}
                {!timelineAberta && eventos.length > 0 && (
                  <button type="button" onClick={() => setTimelineAberta(true)} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600 inline-flex items-center gap-1"><Clock size={12} /> timeline</button>
                )}
              </>
            )}
          </div>
        )}

        {/* Timeline do dia: saída → trechos → paradas → visitas → fim */}
        {rota && timelineAberta && (
          <div className="absolute top-3 right-3 bottom-16 z-[1000] w-[min(320px,calc(100%-24px))] flex flex-col rounded-xl bg-white shadow-xl border border-slate-200">
            <div className="px-3 py-2 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <p className="text-sm font-extrabold text-slate-800 inline-flex items-center gap-1.5"><Clock size={14} /> TIMELINE — {fmtDia(rota.data)}</p>
                <button type="button" onClick={() => setTimelineAberta(false)} className="text-slate-400 hover:text-slate-700 px-1" title="Fechar"><X size={16} /></button>
              </div>
              <p className="text-xs text-slate-500">
                {carroSel?.vendedor_nome} · {carroSel?.placa_exibicao}
                {rota.motorista_dia && <> · com o carro: <b className="text-slate-700">{rota.motorista_dia}</b></>}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {eventos.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">
                  {rota.resumo.km ? 'O trajeto detalhado deste dia já não está guardado — só o resumo.' : `Sem trajeto registrado em ${fmtDia(rota.data)}.`}
                </p>
              )}
              <ol className="relative border-l-2 border-slate-200 ml-1.5">
                {eventos.map((e, i) => {
                  const cor = e.tipo === 'inicio' ? '#22c55e' : e.tipo === 'fim' ? '#dc2626' : e.tipo === 'parada' ? '#f59e0b' : e.tipo === 'visita' ? '#7c3aed' : '#3b82f6'
                  return (
                    <li key={i} className="ml-3 pb-3 text-[13px] leading-snug text-slate-700">
                      <span className="absolute -left-[7px] mt-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: cor }} />
                      {e.tipo === 'inicio' && <><b>{fmtHora(e.hora)}</b> · saiu{e.local && <> de {e.local}</>}</>}
                      {e.tipo === 'fim' && <><b>{fmtHora(e.hora)}</b> · último ponto{e.local && <> em {e.local}</>}</>}
                      {e.tipo === 'trecho' && (
                        <span className="text-slate-500">
                          {fmtHora(e.de)}–{fmtHora(e.ate)} · rodou <b className="text-slate-700">{fmtKm(e.km)}</b> em {fmtDuracao(e.min)} · máx{' '}
                          <span className={e.velMax > 110 ? 'text-red-600 font-bold' : ''}>{e.velMax} km/h</span>
                        </span>
                      )}
                      {e.tipo === 'parada' && (
                        <>
                          <button type="button" onClick={() => irPara(e.lat, e.lng)} className="text-left hover:underline">
                            <b>{fmtHora(e.hora)}</b> · parou {fmtDuracao(e.dur)}{e.local && <> · {e.local}</>}
                          </button>{' '}
                          <a href={linkMapa(e.lat, e.lng)} target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold whitespace-nowrap">ver local ↗</a>
                        </>
                      )}
                      {e.tipo === 'visita' && (
                        <span><b>{fmtHora(e.hora)}</b> · visita <span className="capitalize">{e.tipoVisita}</span>{e.cliente && <> · <b>{e.cliente}</b></>}</span>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Carros dos vendedores agora: clique para ver o trajeto */}
      {incluiHoje && carros.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {carros.map((c) => {
            const st = STATUS[c.status] || STATUS.sem_sinal
            const ativo = String(c.vendedor_id) === vendSel
            return (
              <button
                key={c.placa}
                type="button"
                onClick={() => escolherVendedor(c.vendedor_id)}
                className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-xs bg-white hover:bg-slate-50 ${ativo ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'}`}
              >
                <span className="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: st.cor }} />
                <span className="min-w-0">
                  <span className="block font-bold text-slate-800 truncate">{c.vendedor_nome}</span>
                  <span className="block text-slate-500 truncate">{c.placa_exibicao}{c.modelo ? ` · ${c.modelo}` : ''}</span>
                  <span className="block text-slate-600 truncate">{st.label} · {haQuanto(c.dt, agora)}{c.local ? ` · ${c.local}` : ''}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}

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
