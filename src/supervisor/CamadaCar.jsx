// Camada "Propriedades (CAR)" do mapa do supervisor: os imóveis rurais do CAR
// dos municípios que estão na tela, na cor da conquista (a mesma do
// Território — cinza bloqueado, verdes visitado/conversa/quente, dourado
// comprou). Com um vendedor escolhido no filtro, as conquistas são as dele;
// sem, as da equipe. Fica dentro do <MapContainer> (usa o mapa do react-leaflet).
// Dados do portal: /api/crm-vendas/territorio (mesma rota da tela Território).
import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { municipiosTerritorio, territorioDoMunicipio } from '../lib/mapaVendedores'

const ZOOM_MIN = 11
const MAX_MUNICIPIOS = 3
const CHAVE_LISTA = 'nt-territorio-municipios' // a mesma lista que o Território guarda no aparelho

// município já carregado volta na hora (10 min), por vendedor
const CACHE = new Map()
async function territorioComCache(ibge, vendedorId) {
  const chave = `${ibge}|${vendedorId || ''}`
  const c = CACHE.get(chave)
  if (c && Date.now() - c.at < 10 * 60000) return c.dados
  const dados = await territorioDoMunicipio(ibge, vendedorId || null)
  CACHE.set(chave, { at: Date.now(), dados })
  return dados
}

const distKm2 = (a, b) => (a[0] - b[0]) ** 2 + ((a[1] - b[1]) * Math.cos((a[0] * Math.PI) / 180)) ** 2
const fmtHa = (n) => `${Math.round(Number(n) || 0).toLocaleString('pt-BR')} ha`
const esc = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]))

export default function CamadaCar({ ativo, vendedorId, onAviso, onCarregando }) {
  const mapa = useMap()
  const [vista, setVista] = useState(0)
  const [municipios, setMunicipios] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CHAVE_LISTA) || '[]') } catch { return [] }
  })
  const camadaRef = useRef(null)
  // painel próprio ABAIXO do trajeto e das visitas (overlayPane = 400): o
  // preenchimento das propriedades não cobre a linha do carro
  const renderer = useMemo(() => {
    if (!mapa.getPane('car')) mapa.createPane('car').style.zIndex = 350
    return L.canvas({ padding: 0.5, pane: 'car' })
  }, [mapa])

  useMapEvents({ moveend: () => setVista((v) => v + 1) })

  // lista dos municípios com CAR carregado (uma vez; a do aparelho abre na hora)
  useEffect(() => {
    if (!ativo) return
    municipiosTerritorio()
      .then((d) => {
        setMunicipios(d.municipios || [])
        try { localStorage.setItem(CHAVE_LISTA, JSON.stringify(d.municipios || [])) } catch { /* sem storage */ }
      })
      .catch((e) => { if (!municipios.length) onAviso?.(e.message) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo])

  useEffect(() => {
    if (!camadaRef.current) camadaRef.current = L.layerGroup({ pane: 'car' }).addTo(mapa)
    const camada = camadaRef.current
    if (!ativo) { camada.clearLayers(); onAviso?.(null); return }
    if (mapa.getZoom() < ZOOM_MIN) { camada.clearLayers(); onAviso?.('Aproxime o mapa para ver as propriedades (CAR)'); return }
    if (!municipios.length) { onAviso?.('Carregando a lista de municípios…'); return }

    const area = mapa.getBounds().pad(0.6)
    const c = mapa.getCenter()
    const alvo = municipios
      .filter((m) => Array.isArray(m.centro) && area.contains(m.centro))
      .sort((a, b) => distKm2(a.centro, [c.lat, c.lng]) - distKm2(b.centro, [c.lat, c.lng]))
      .slice(0, MAX_MUNICIPIOS)
    if (!alvo.length) { camada.clearLayers(); onAviso?.('Sem propriedades (CAR) carregadas nesta região'); return }

    let vivo = true
    onCarregando?.(true)
    onAviso?.(`Carregando propriedades (CAR) de ${alvo.map((m) => m.nome).join(', ')}…`)
    Promise.allSettled(alvo.map((m) => territorioComCache(m.ibge, vendedorId)))
      .then((res) => {
        if (!vivo) return
        camada.clearLayers()
        let falhou = 0
        res.forEach((r, i) => {
          if (r.status !== 'fulfilled') { falhou++; return }
          const d = r.value
          if (!d?.features?.length) return
          const cor = Object.fromEntries((d.niveis || []).map((n) => [n.key, n.cor]))
          const rotulo = Object.fromEntries((d.niveis || []).map((n) => [n.key, n.label]))
          L.geoJSON({ type: 'FeatureCollection', features: d.features }, {
            renderer,
            style: (f) => {
              const n = f.properties?.nivel
              return n === 'bloqueado'
                ? { color: '#94a3b8', weight: 0.8, fillColor: cor[n] || '#cbd5e1', fillOpacity: 0.12 }
                : { color: cor[n] || '#15803d', weight: 1.2, fillColor: cor[n] || '#15803d', fillOpacity: 0.4 }
            },
            onEachFeature: (f, layer) => {
              const p = f.properties || {}
              layer.bindPopup(
                `<b>${esc(rotulo[p.nivel] || p.nivel)}</b> · ${esc(alvo[i].nome)}<br/>${fmtHa(p.area_ha)}${p.cultura ? ` · ${esc(p.cultura)}` : ''}`
                + (p.visitas ? `<br/>${p.visitas} visita${p.visitas > 1 ? 's' : ''} · última ${new Date(p.ultima_visita + 'T12:00:00').toLocaleDateString('pt-BR')}` : '<br/>Ainda não visitado')
                + (p.trator ? '<br/><b style="color:#15803d">🚜 trator nosso localizado aqui</b>' : '')
                + `<br/><span style="color:#94a3b8;font-size:10px">${esc(p.cod_car)}</span>`,
              )
            },
          }).addTo(camada)
        })
        onAviso?.(falhou === res.length ? 'Não foi possível carregar as propriedades agora' : null)
      })
      .finally(() => { if (vivo) onCarregando?.(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, vista, municipios, vendedorId, mapa, renderer])

  // desmontar tira a camada do mapa
  useEffect(() => () => { camadaRef.current?.remove(); camadaRef.current = null }, [])

  return null
}
