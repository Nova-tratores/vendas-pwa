import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/sync'
import { capturarGPS } from '../lib/gps'
import { LOJA, PERFIS, TIPOS, aplicarMix, ordemPeloMapa, planejarSemana, resumoCidades, sugerirCidadesDoDia } from '../lib/rotaFeed'

// Minha rota — feed do vendedor (José, 20/10/2026). A reserva de contatos vem do portal
// (iv_feed_pool); a mistura vem do teste de perfil (iv_perfil_vendedor). Três formas:
//   Hoje ....... escolhe as cidades do dia e vê os contatos na ordem de prioridade
//   Pelo mapa .. os mesmos contatos na ordem do caminho mais curto, com o mapa
//   Semana ..... as cidades divididas em 5 dias vizinhos
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta']
const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const lerJSON = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? padrao } catch { return padrao } }

function numero(n, cor) {
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${cor};color:#fff;font:800 13px sans-serif;display:grid;place-items:center;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)">${n}</div>`,
    className: '', iconSize: [30, 30], iconAnchor: [15, 15],
  })
}
const LOJA_ICON = L.divIcon({ html: '<div style="width:34px;height:34px;border-radius:10px;background:#0f172a;color:#fff;font:800 15px sans-serif;display:grid;place-items:center;border:3px solid #fff">🏠</div>', className: '', iconSize: [34, 34], iconAnchor: [17, 17] })

function Enquadrar({ pontos }) {
  const map = useMap()
  useEffect(() => { if (pontos.length) map.fitBounds(pontos, { padding: [30, 30] }) }, [map, pontos])
  return null
}

function Cartao({ it, n, feito, onFeito }) {
  const navigate = useNavigate()
  const t = TIPOS[it.tipo]
  return (
    <div className={`rounded-2xl border bg-white p-4 transition-all ${feito ? 'opacity-50' : ''}`} style={{ borderColor: '#e2e8f0', borderLeft: `5px solid ${t.cor}`, animation: `mr-entra .4s ${Math.min(n, 12) * 0.05}s ease both` }}>
      <div className="flex items-center gap-2 mb-1">
        <span className="w-7 h-7 rounded-full grid place-items-center text-xs font-black text-white shrink-0" style={{ background: t.cor }}>{n}</span>
        <span className="text-[11px] font-black uppercase tracking-wide" style={{ color: t.cor }}>{t.icone} {t.nome}</span>
        <span className="ml-auto text-xs font-bold rounded-full px-2 py-0.5" style={{ background: t.fundo, color: t.cor }}>{it.selo}</span>
      </div>
      <p className={`font-bold text-base leading-tight ${feito ? 'line-through' : ''}`}>{it.titulo}</p>
      <p className="text-xs text-slate-500 mb-2">📍 {it.sub}{it.kmAteAqui != null ? ` · ${it.kmAteAqui} km da saída` : ''}{it.aprox ? ' · posição da cidade' : ''}</p>
      <p className="text-sm text-slate-700 leading-snug">{it.porque}</p>
      <p className="text-sm font-semibold mt-2 rounded-xl px-3 py-2" style={{ background: t.fundo }}>👉 {it.acao}</p>
      <div className="flex flex-wrap gap-2 mt-3">
        {it.propriedadeId && <button onClick={() => navigate('/visitas', { state: { propriedadeId: it.propriedadeId } })} className="px-3 py-2 rounded-xl bg-blue-700 text-white text-sm font-bold">📍 Registrar visita</button>}
        {it.telefone && <a href={`tel:${it.telefone}`} className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold">📞 Ligar</a>}
        {it.lat != null && <a href={`https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}`} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl border border-slate-300 text-sm font-semibold">🧭 Como chegar</a>}
        <button onClick={onFeito} className={`ml-auto px-3 py-2 rounded-xl text-sm font-bold ${feito ? 'bg-green-600 text-white' : 'border border-green-600 text-green-700'}`}>{feito ? '✓ Feito' : 'Feito?'}</button>
      </div>
    </div>
  )
}

export default function MinhaRota({ abaInicial = 'hoje' }) {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [pool, setPool] = useState(() => lerJSON('feed-pool', null))
  const [perfil, setPerfil] = useState(() => lerJSON('perfil-vendedor', null))
  const [carregando, setCarregando] = useState(!pool)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState(abaInicial)
  const [qtd, setQtd] = useState(() => Number(localStorage.getItem('rota-qtd')) || 10)
  const [cidadesDia, setCidadesDia] = useState(null)
  const [origem, setOrigem] = useState({ nome: 'Loja (Piraju)', pos: LOJA })
  const [feitos, setFeitos] = useState(() => lerJSON(`rota-feitos-${hojeISO()}`, []))

  useEffect(() => {
    if (!vendedor.id) return
    let vivo = true
    ;(async () => {
      try {
        const [p, f] = await Promise.all([
          supabase.from('iv_feed_pool').select('*').eq('vendedor_id', vendedor.id).maybeSingle(),
          supabase.from('iv_perfil_vendedor').select('*').eq('vendedor_id', vendedor.id).maybeSingle(),
        ])
        if (!vivo) return
        if (p.error) throw p.error
        if (p.data) { setPool(p.data); localStorage.setItem('feed-pool', JSON.stringify(p.data)) }
        if (f.data) { setPerfil(f.data); localStorage.setItem('perfil-vendedor', JSON.stringify(f.data)) }
      } catch {
        if (vivo) setErro('Sem conexão: mostrando a última rota guardada no celular.')
      } finally { if (vivo) setCarregando(false) }
    })()
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const itens = useMemo(() => pool?.itens || [], [pool])
  const cidades = useMemo(() => resumoCidades(itens), [itens])
  const escolhidas = cidadesDia ?? sugerirCidadesDoDia(cidades)
  const mix = perfil?.mix || PERFIS.equilibrado.mix
  const P = perfil ? PERFIS[perfil.perfil] : null
  const doDia = useMemo(() => aplicarMix(itens.filter((i) => escolhidas.includes(i.cidade)), mix, qtd), [itens, escolhidas, mix, qtd])
  const rota = useMemo(() => ordemPeloMapa(doDia, origem.pos), [doDia, origem])
  const semana = useMemo(() => planejarSemana(cidades), [cidades])

  const marcar = (id) => {
    const n = feitos.includes(id) ? feitos.filter((x) => x !== id) : [...feitos, id]
    setFeitos(n); localStorage.setItem(`rota-feitos-${hojeISO()}`, JSON.stringify(n))
  }
  const alternarCidade = (c) => setCidadesDia((atual) => {
    const base = atual ?? escolhidas
    return base.includes(c) ? base.filter((x) => x !== c) : [...base, c]
  })
  const daMinhaPosicao = async () => {
    try { const g = await capturarGPS(); setOrigem({ nome: 'Onde estou', pos: [g.latitude, g.longitude] }) } catch { alert('Não consegui pegar o GPS agora.') }
  }

  if (carregando) return <div className="py-16 text-center text-slate-500"><div className="w-8 h-8 mx-auto mb-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Montando a sua rota…</div>
  if (!pool || !itens.length) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-5xl mb-3">🧭</p>
        <p className="font-bold text-lg">Sua rota ainda não foi montada</p>
        <p className="text-slate-500 text-sm mt-1">Ela é preparada pelo portal a partir das cidades que o supervisor atribuiu a você. Peça para o supervisor conferir as suas cidades.</p>
      </div>
    )
  }

  const feitosHoje = doDia.filter((i) => feitos.includes(i.id)).length
  return (
    <div>
      <style>{ESTILO}</style>
      {/* topo: perfil */}
      <div className="rounded-3xl p-4 text-white mb-4 shadow-md animate-fade-in" style={{ background: `linear-gradient(150deg, ${P?.cor || '#991b1b'}, #0f172a)` }}>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{P?.icone || '🧭'}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">Minha rota {P ? `· perfil ${P.nome}` : ''}</p>
            <p className="font-black text-lg leading-tight">{doDia.length} contatos para hoje</p>
            <p className="text-xs opacity-80">{feitosHoje} feito(s) · {pool.cidades?.length || cidades.length} cidades na sua área</p>
          </div>
          <button onClick={() => navigate('/perfil-teste')} className="text-xs font-bold bg-white/20 rounded-xl px-3 py-2">{P ? 'Refazer teste' : 'Fazer o teste'}</button>
        </div>
        <div className="flex h-2 rounded-full overflow-hidden mt-3 bg-white/20">
          {['carteira', 'recuperar', 'novos'].map((t) => <div key={t} style={{ width: `${(mix[t] || 0) * 100}%`, background: TIPOS[t].cor }} />)}
        </div>
        <div className="flex gap-3 mt-1 text-[11px] opacity-90">{['carteira', 'recuperar', 'novos'].map((t) => <span key={t}>{TIPOS[t].icone} {TIPOS[t].nome} {Math.round((mix[t] || 0) * 100)}%</span>)}</div>
      </div>
      {!P && (
        <button onClick={() => navigate('/perfil-teste')} className="w-full mb-4 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 p-3 text-left animate-pulse-glow">
          <b className="text-blue-800">🎯 Faça o teste de perfil (1 minuto)</b>
          <p className="text-xs text-blue-700">A rota passa a trazer mais do tipo de contato em que você é melhor. Por enquanto ela vai equilibrada.</p>
        </button>
      )}
      {erro && <p className="text-xs text-amber-700 bg-amber-50 rounded-xl p-2 mb-3">{erro}</p>}

      {/* abas */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl mb-4">
        {[['hoje', '📋 Hoje'], ['mapa', '🗺️ Pelo mapa'], ['semana', '📅 Semana']].map(([k, r]) => (
          <button key={k} onClick={() => setAba(k)} className={`py-2 rounded-xl text-sm font-bold transition-all ${aba === k ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{r}</button>
        ))}
      </div>

      {(aba === 'hoje' || aba === 'mapa') && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Cidades de hoje {cidadesDia == null && <span className="normal-case font-semibold text-blue-700">· sugestão: a de mais oportunidade e as vizinhas</span>}</p>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
            {cidades.map((c) => {
              const on = escolhidas.includes(c.cidade)
              return (
                <button key={c.cidade} onClick={() => alternarCidade(c.cidade)} className={`shrink-0 rounded-2xl border-2 px-3 py-2 text-left transition-all ${on ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white'}`}>
                  <b className="text-sm block whitespace-nowrap">{c.cidade}</b>
                  <span className={`text-[11px] ${on ? 'text-blue-100' : 'text-slate-500'}`}>{c.qtd} contatos</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-slate-500">Quantos hoje:</span>
            {[6, 10, 15].map((n) => <button key={n} onClick={() => { setQtd(n); localStorage.setItem('rota-qtd', String(n)) }} className={`px-3 py-1 rounded-full font-bold ${qtd === n ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{n}</button>)}
          </div>
        </>
      )}

      {aba === 'hoje' && (
        <div className="space-y-3">
          {doDia.map((it, k) => <Cartao key={it.id} it={it} n={k + 1} feito={feitos.includes(it.id)} onFeito={() => marcar(it.id)} />)}
          {!doDia.length && <p className="text-center text-slate-400 py-8">Escolha ao menos uma cidade.</p>}
        </div>
      )}

      {aba === 'mapa' && (
        <>
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-slate-500">Saída:</span>
            <button onClick={() => setOrigem({ nome: 'Loja (Piraju)', pos: LOJA })} className={`px-3 py-1 rounded-full font-bold ${origem.nome.startsWith('Loja') ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>🏠 Loja</button>
            <button onClick={daMinhaPosicao} className={`px-3 py-1 rounded-full font-bold ${origem.nome === 'Onde estou' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>📡 Onde estou</button>
            <span className="ml-auto font-bold">≈ {rota.kmTotal} km</span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200 mb-3" style={{ height: 300 }}>
            <MapContainer center={origem.pos} zoom={9} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
              <Marker position={origem.pos} icon={LOJA_ICON}><Tooltip>{origem.nome}</Tooltip></Marker>
              {rota.itens.filter((i) => i.lat != null).map((it, k) => (
                <Marker key={it.id} position={[it.lat, it.lng]} icon={numero(k + 1, TIPOS[it.tipo].cor)}><Tooltip>{k + 1}. {it.titulo}</Tooltip></Marker>
              ))}
              <Polyline positions={[origem.pos, ...rota.itens.filter((i) => i.lat != null).map((i) => [i.lat, i.lng]), origem.pos]} pathOptions={{ color: '#991b1b', weight: 3, dashArray: '6 6' }} />
              <Enquadrar pontos={[origem.pos, ...rota.itens.filter((i) => i.lat != null).map((i) => [i.lat, i.lng])]} />
            </MapContainer>
          </div>
          <p className="text-xs text-slate-400 mb-3">Ordem: sempre o mais perto a seguir. A distância é estimada (linha reta + 30%). Contato sem GPS fica no centro da cidade.</p>
          <div className="space-y-3">
            {rota.itens.map((it, k) => <Cartao key={it.id} it={it} n={k + 1} feito={feitos.includes(it.id)} onFeito={() => marcar(it.id)} />)}
          </div>
        </>
      )}

      {aba === 'semana' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Suas cidades divididas em 5 dias, juntando as vizinhas. Toque num dia para abrir a rota dele.</p>
          {semana.map((g, d) => {
            const tot = g.reduce((s, c) => s + c.qtd, 0)
            const porT = ['carteira', 'recuperar', 'novos'].map((t) => g.reduce((s, c) => s + c.porTipo[t], 0))
            return (
              <button key={d} onClick={() => { setCidadesDia(g.map((c) => c.cidade)); setAba('hoje') }} disabled={!g.length}
                className="w-full text-left rounded-2xl border border-slate-200 bg-white p-4 active:scale-[.99] transition-all disabled:opacity-50" style={{ animation: `mr-entra .4s ${d * 0.07}s ease both` }}>
                <div className="flex items-center gap-2 mb-1">
                  <b className="text-base">{DIAS[d]}</b>
                  <span className="text-xs text-slate-500">{g.length ? `${g.length} cidade(s) · ${tot} contatos` : 'livre'}</span>
                  <span className="ml-auto text-blue-700 text-sm font-bold">abrir →</span>
                </div>
                <p className="text-sm text-slate-700">{g.map((c) => c.cidade).join(' · ') || 'Sem cidades — dia para retornos e escritório.'}</p>
                {tot > 0 && (
                  <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-slate-100">
                    {porT.map((q, k) => <div key={k} style={{ width: `${(q / tot) * 100}%`, background: TIPOS[['carteira', 'recuperar', 'novos'][k]].cor }} />)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const ESTILO = `@keyframes mr-entra { from { opacity: 0; transform: translateY(10px) } }`
