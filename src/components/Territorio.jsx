// Território gamificado: os imóveis rurais do CAR de um município, cada um na
// cor da conquista — cinza bloqueado (nunca visitado), verde claro visitado,
// verde médio em conversa, verde escuro quente, dourado comprou.
// O mesmo componente serve o vendedor (só as conquistas dele) e o supervisor
// (equipe inteira ou um vendedor). Dados do portal: /api/crm-vendas/territorio.
import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { municipiosTerritorio, territorioDoMunicipio } from '../lib/mapaVendedores'

const CHAVE_MUN = 'nt-territorio-municipio'
const CHAVE_LISTA = 'nt-territorio-municipios' // lista guardada no aparelho (abre na hora)
const PIRAJU = 3538808

const NIVEIS_PADRAO = [
  { key: 'bloqueado', label: 'Bloqueado', cor: '#cbd5e1' },
  { key: 'visitado', label: 'Visitado', cor: '#bbf7d0' },
  { key: 'conversa', label: 'Em conversa', cor: '#4ade80' },
  { key: 'quente', label: 'Quente', cor: '#15803d' },
  { key: 'cliente', label: 'Comprou', cor: '#ca8a04' },
]

const fmtHa = (n) => `${Math.round(Number(n) || 0).toLocaleString('pt-BR')} ha`

export default function Territorio({ supervisor = false, vendedores = [] }) {
  const [municipios, setMunicipios] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_LISTA) || '[]') } catch { return [] }
  })
  const [ibge, setIbge] = useState(() => {
    try { return Number(localStorage.getItem(CHAVE_MUN)) || PIRAJU } catch { return PIRAJU }
  })
  const [vendedorId, setVendedorId] = useState('')
  const [dados, setDados] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mapa, setMapa] = useState(null)

  useEffect(() => {
    municipiosTerritorio()
      .then((d) => {
        setMunicipios(d.municipios || [])
        try { localStorage.setItem(CHAVE_LISTA, JSON.stringify(d.municipios || [])) } catch { /* sem storage */ }
      })
      .catch((e) => { if (!municipios.length) setErro(e.message) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let vivo = true
    setCarregando(true); setErro('')
    try { localStorage.setItem(CHAVE_MUN, String(ibge)) } catch { /* sem storage */ }
    territorioDoMunicipio(ibge, supervisor ? vendedorId : null)
      .then((d) => { if (vivo) setDados(d) })
      .catch((e) => { if (vivo) setErro(e.message) })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [ibge, vendedorId, supervisor])

  const niveis = dados?.niveis || NIVEIS_PADRAO
  const corDe = useMemo(() => Object.fromEntries(niveis.map((n) => [n.key, n.cor])), [niveis])

  // enquadra o município quando os polígonos chegam
  useEffect(() => {
    if (!mapa || !dados?.features?.length) return
    try {
      const b = L.geoJSON({ type: 'FeatureCollection', features: dados.features }).getBounds()
      if (b.isValid()) mapa.fitBounds(b, { padding: [10, 10] })
    } catch { /* geometria inesperada */ }
  }, [mapa, dados])

  const r = dados?.resumo
  const munAtual = municipios.find((m) => Number(m.ibge) === Number(ibge))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select value={ibge} onChange={(e) => setIbge(Number(e.target.value))}
          className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white flex-1 min-w-[160px]">
          {!municipios.length && <option value={ibge}>Carregando municípios…</option>}
          {municipios.map((m) => <option key={m.ibge} value={m.ibge}>{m.nome} ({Number(m.imoveis).toLocaleString('pt-BR')} imóveis)</option>)}
        </select>
        {supervisor && (
          <select value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white flex-1 min-w-[160px]">
            <option value="">Equipe toda</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        )}
      </div>

      {erro && <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2">{erro}</p>}

      {r && (
        <div className="bg-white rounded-xl shadow p-3">
          <div className="flex items-end justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs text-slate-500">{supervisor && !vendedorId ? 'Equipe' : supervisor ? 'Vendedor' : 'Você'} em {dados.municipio || munAtual?.nome}</p>
              <p className="text-2xl font-extrabold">{r.desbloqueados.toLocaleString('pt-BR')} <span className="text-base font-semibold text-slate-500">de {r.total.toLocaleString('pt-BR')} imóveis</span></p>
            </div>
            <p className="text-3xl font-extrabold text-green-700">{r.pct.toLocaleString('pt-BR')}%</p>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mt-2 flex">
            {niveis.filter((n) => n.key !== 'bloqueado').map((n) => (
              <div key={n.key} style={{ width: `${r.total ? (r.contagem[n.key] / r.total) * 100 : 0}%`, background: n.cor }} />
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{fmtHa(r.areaDesbloqueadaHa)} conquistados de {fmtHa(r.areaTotalHa)}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {niveis.map((n) => (
              <span key={n.key} className="inline-flex items-center gap-1 text-xs text-slate-700">
                <span className="w-3 h-3 rounded-sm border border-slate-300" style={{ background: n.cor }} />
                {n.label} <b>{(r.contagem[n.key] || 0).toLocaleString('pt-BR')}</b>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative bg-white rounded-xl shadow overflow-hidden" style={{ height: '62vh', minHeight: 380 }}>
        {carregando && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-white/60 text-sm text-slate-600">Desenhando os imóveis…</div>
        )}
        <MapContainer ref={setMapa} center={[-23.2, -49.37]} zoom={11} preferCanvas style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {dados?.features?.length > 0 && (
            <GeoJSON
              key={`${dados.ibge}-${vendedorId}-${dados.features.length}`}
              data={{ type: 'FeatureCollection', features: dados.features }}
              style={(f) => ({
                color: f.properties.nivel === 'bloqueado' ? '#94a3b8' : '#166534',
                weight: f.properties.nivel === 'bloqueado' ? 0.5 : 1,
                fillColor: corDe[f.properties.nivel] || '#cbd5e1',
                fillOpacity: f.properties.nivel === 'bloqueado' ? 0.35 : 0.75,
              })}
              onEachFeature={(f, layer) => {
                const p = f.properties
                const nivel = niveis.find((n) => n.key === p.nivel)
                layer.bindPopup(
                  `<b>${nivel?.label || p.nivel}</b><br/>${fmtHa(p.area_ha)}${p.cultura ? ` · ${p.cultura}` : ''}`
                  + (p.visitas ? `<br/>${p.visitas} visita${p.visitas > 1 ? 's' : ''} · última ${new Date(p.ultima_visita + 'T12:00:00').toLocaleDateString('pt-BR')}` : '<br/>Ainda não visitado')
                  + `<br/><span style="color:#94a3b8;font-size:10px">${p.cod_car}</span>`,
                )
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  )
}
