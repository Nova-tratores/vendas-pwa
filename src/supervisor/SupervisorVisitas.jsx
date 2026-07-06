import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  getVisitas, getVendedores, getComentariosCount,
  setSinalizada, juntarVisitas, desfazerJuntar,
} from '../lib/supabaseQueries'
import VendedorAvatar from '../components/VendedorAvatar'
import ComentariosModal from './ComentariosModal'
import MiniMapaModal from './MiniMapaModal'

const TIPOS = [
  { key: '', label: 'Todos' },
  { key: 'presencial', label: 'Presencial' },
  { key: 'mensagem', label: 'Mensagem' },
  { key: 'telefonema', label: 'Telefonema' },
  { key: 'email', label: 'E-mail' },
]

const TIPO_COLORS = {
  presencial: 'bg-blue-100 text-blue-800',
  mensagem: 'bg-green-100 text-green-800',
  telefonema: 'bg-amber-100 text-amber-800',
  email: 'bg-purple-100 text-purple-800',
}

export default function SupervisorVisitas() {
  const [searchParams] = useSearchParams()
  const [visitas, setVisitas] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [loading, setLoading] = useState(true)
  const [comentCount, setComentCount] = useState({})

  const [comentarioAlvo, setComentarioAlvo] = useState(null) // visita p/ comentar
  const [mapaAlvo, setMapaAlvo] = useState(null)             // visita p/ ver no mapa
  const [mostrarOcultas, setMostrarOcultas] = useState(false)
  const [modoJuntar, setModoJuntar] = useState(false)
  const [selecao, setSelecao] = useState([])                 // ids selecionados (juntar)
  const [confirmJuntar, setConfirmJuntar] = useState(null)   // { a, b, principal }

  const [filtros, setFiltros] = useState({
    vendedor_id: searchParams.get('vendedor_id') || '',
    tipo: '',
    dateFrom: '',
    dateTo: '',
    retroativa: false,
    primeira: false,
  })

  useEffect(() => {
    getVendedores().then(setVendedores)
  }, [])

  useEffect(() => { carregar() }, [filtros, mostrarOcultas])

  async function carregar() {
    setLoading(true)
    try {
      const params = { incluirDuplicadas: mostrarOcultas }
      if (filtros.vendedor_id) params.vendedorId = parseInt(filtros.vendedor_id)
      if (filtros.tipo) params.tipo = filtros.tipo
      if (filtros.dateFrom) params.dateFrom = new Date(filtros.dateFrom).toISOString()
      if (filtros.dateTo) params.dateTo = new Date(filtros.dateTo + 'T23:59:59').toISOString()
      if (filtros.retroativa) params.retroativa = true
      let vis = await getVisitas(params)
      // Client-side: não quebra se a coluna primeira_visita ainda não existir.
      if (filtros.primeira) vis = vis.filter((v) => v.primeira_visita)
      setVisitas(vis)
      setComentCount(await getComentariosCount('visita', vis.map((v) => v.id)))
    } catch (err) {
      console.error('[Visitas]', err)
    }
    setLoading(false)
  }

  function updateFiltro(key, value) {
    setFiltros((f) => ({ ...f, [key]: value }))
  }

  async function toggleSinalizar(v) {
    try {
      if (v.sinalizada) {
        await setSinalizada(v.id, false)
      } else {
        const motivo = window.prompt('Motivo da sinalização (opcional):', '')
        if (motivo === null) return // cancelou
        await setSinalizada(v.id, true, motivo.trim() || null)
      }
      await carregar()
    } catch (e) {
      alert('Erro ao sinalizar: ' + (e.message || e))
    }
  }

  function toggleSelecao(id) {
    setSelecao((sel) => sel.includes(id) ? sel.filter((x) => x !== id) : (sel.length >= 2 ? sel : [...sel, id]))
  }

  function abrirConfirmJuntar() {
    const [aId, bId] = selecao
    const a = visitas.find((v) => v.id === aId)
    const b = visitas.find((v) => v.id === bId)
    if (a && b) setConfirmJuntar({ a, b, principal: a.id })
  }

  async function confirmarJuntar() {
    const { a, b, principal } = confirmJuntar
    const duplicada = principal === a.id ? b.id : a.id
    try {
      await juntarVisitas(duplicada, principal)
      setConfirmJuntar(null)
      setSelecao([])
      setModoJuntar(false)
      await carregar()
    } catch (e) {
      alert('Erro ao juntar: ' + (e.message || e))
    }
  }

  async function desfazer(v) {
    try { await desfazerJuntar(v.id); await carregar() }
    catch (e) { alert('Erro ao desfazer: ' + (e.message || e)) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold">Visitas</h2>
        <div className="flex gap-2">
          <button
            onClick={() => { setModoJuntar((m) => !m); setSelecao([]) }}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${modoJuntar ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 active:bg-slate-200'}`}
          >
            {modoJuntar ? 'Cancelar' : '⧉ Juntar repetidas'}
          </button>
          <Link
            to="/supervisor/mapa"
            className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium active:bg-slate-200"
          >
            🗺️ Mapa
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-3 mb-4 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filtros.vendedor_id}
            onChange={(e) => updateFiltro('vendedor_id', e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white"
          >
            <option value="">Todos vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
          <select
            value={filtros.tipo}
            onChange={(e) => updateFiltro('tipo', e.target.value)}
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
            onChange={(e) => updateFiltro('dateFrom', e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
          />
          <input
            type="date"
            value={filtros.dateTo}
            onChange={(e) => updateFiltro('dateTo', e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-2 text-sm"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={filtros.retroativa} onChange={(e) => updateFiltro('retroativa', e.target.checked)} className="rounded" />
            Apenas retroativas
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={filtros.primeira} onChange={(e) => updateFiltro('primeira', e.target.checked)} className="rounded" />
            Apenas 1ª visita
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={mostrarOcultas} onChange={(e) => setMostrarOcultas(e.target.checked)} className="rounded" />
            Mostrar juntadas
          </label>
        </div>
      </div>

      {modoJuntar && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 text-xs text-blue-800">
          Selecione <b>duas</b> visitas repetidas para juntar ({selecao.length}/2).
        </div>
      )}

      <p className="text-xs text-slate-500 mb-2">{visitas.length} visitas encontradas</p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : visitas.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Nenhuma visita encontrada</p>
      ) : (
        <div className="space-y-2">
          {visitas.map((v) => {
            const data = new Date(v.data_visita)
            const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            const selecionada = selecao.includes(v.id)
            const nComent = comentCount[v.id] || 0

            return (
              <div
                key={v.id}
                onClick={modoJuntar ? () => toggleSelecao(v.id) : undefined}
                className={`bg-white rounded-xl shadow p-4 ${v.retroativa ? 'border-l-4 border-amber-400' : ''} ${v.sinalizada ? 'ring-1 ring-red-300' : ''} ${v.duplicada_de ? 'opacity-60' : ''} ${modoJuntar ? 'cursor-pointer' : ''} ${selecionada ? 'outline outline-2 outline-blue-500' : ''}`}
              >
                <div className="flex items-start justify-between mb-1 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {modoJuntar && (
                      <input type="checkbox" readOnly checked={selecionada} className="rounded shrink-0" />
                    )}
                    <VendedorAvatar id={v.vendedor_id} nome={v.vendedor_nome} size={30} />
                    <div className="min-w-0">
                      <p className="font-bold text-sm leading-tight truncate">
                        {v.sinalizada && <span title="Sinalizada">🚩 </span>}{v.cliente_nome || v.propriedade_nome || '—'}
                      </p>
                      {v.propriedade_nome && v.cliente_nome && <p className="text-xs text-slate-500 leading-tight truncate">{v.propriedade_nome}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[v.tipo] || 'bg-slate-100 text-slate-700'}`}>{v.tipo}</span>
                    {v.primeira_visita && <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700" title="Primeira visita nesta propriedade">1ª</span>}
                    {v.retroativa && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Retro</span>}
                    {v.acionar_pos_vendas && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">PV</span>}
                  </div>
                </div>
                <p className="text-xs text-slate-500">{dataStr}</p>
                {v.sinalizada && v.sinalizada_motivo && (
                  <p className="text-xs text-red-600 mt-1">🚩 {v.sinalizada_motivo}</p>
                )}
                {v.resumo && <p className="text-sm text-slate-700 mt-2">{v.resumo}</p>}

                {/* Campos preenchidos na visita */}
                {v.pessoas?.length > 0 && (
                  <p className="text-xs text-slate-600 mt-2">
                    <span className="text-slate-400">👤 Pessoas: </span>
                    {v.pessoas.map((p) => p.cargo ? `${p.nome} (${p.cargo})` : p.nome).join(', ')}
                  </p>
                )}
                {v.maquinas?.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="text-slate-400">🚜 Máquinas: </span>
                    {v.maquinas.map((m) => [m.marca, m.modelo].filter(Boolean).join(' ')).join(', ')}
                  </p>
                )}
                {v.veiculo && (
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="text-slate-400">🚗 Veículo: </span>{v.veiculo}
                  </p>
                )}
                {v.proximos_passos && (
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="text-slate-400">➡️ Próximos passos: </span>{v.proximos_passos}
                  </p>
                )}
                {v.data_proximo_contato && (
                  <p className="text-xs text-blue-600 mt-1 font-medium">
                    📅 Próximo contato: {new Date(v.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}

                {v.latitude ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setMapaAlvo(v) }}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 underline mt-2"
                  >
                    📍 {v.latitude.toFixed(4)}, {v.longitude.toFixed(4)} · ver no mapa
                  </button>
                ) : v.tipo === 'presencial' ? (
                  <p className="text-xs text-red-500 mt-1 font-medium">Sem GPS</p>
                ) : null}

                {/* Ações do supervisor */}
                {!modoJuntar && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100">
                    {v.duplicada_de ? (
                      <span className="text-xs text-slate-500 flex items-center gap-2">
                        ⧉ Juntada (oculta)
                        <button onClick={() => desfazer(v)} className="text-blue-600 underline">Desfazer</button>
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleSinalizar(v)}
                          className={`text-xs px-2 py-1 rounded-lg font-medium ${v.sinalizada ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 active:bg-slate-200'}`}
                        >
                          {v.sinalizada ? '🚩 Sinalizada' : '🚩 Sinalizar'}
                        </button>
                        <button
                          onClick={() => setComentarioAlvo(v)}
                          className="text-xs px-2 py-1 rounded-lg font-medium bg-slate-100 text-slate-600 active:bg-slate-200"
                        >
                          💬 Comentar{nComent > 0 ? ` (${nComent})` : ''}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Barra flutuante do modo juntar */}
      {modoJuntar && selecao.length === 2 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={abrirConfirmJuntar}
            className="bg-slate-800 text-white px-5 py-3 rounded-full shadow-lg text-sm font-medium active:bg-slate-900"
          >
            ⧉ Juntar 2 visitas
          </button>
        </div>
      )}

      {/* Confirmação: escolher qual manter */}
      {confirmJuntar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setConfirmJuntar(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md p-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-base mb-1">Juntar visitas repetidas</h3>
            <p className="text-xs text-slate-500 mb-3">Escolha qual visita <b>manter</b>. A outra fica oculta apontando para ela (pode desfazer depois).</p>
            <div className="space-y-2">
              {[confirmJuntar.a, confirmJuntar.b].map((v) => (
                <label key={v.id} className={`block border rounded-xl p-3 cursor-pointer ${confirmJuntar.principal === v.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="principal"
                      checked={confirmJuntar.principal === v.id}
                      onChange={() => setConfirmJuntar((c) => ({ ...c, principal: v.id }))}
                    />
                    <span className="text-sm font-medium">{v.cliente_nome || '—'} · {v.propriedade_nome || '—'}</span>
                  </div>
                  <p className="text-xs text-slate-500 ml-6">{new Date(v.data_visita).toLocaleString('pt-BR')} · {v.tipo}</p>
                  {v.resumo && <p className="text-xs text-slate-600 ml-6 mt-0.5">{v.resumo}</p>}
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirmJuntar(null)} className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg text-sm font-medium">Cancelar</button>
              <button onClick={confirmarJuntar} className="flex-1 bg-slate-800 text-white py-2.5 rounded-lg text-sm font-medium">Juntar</button>
            </div>
          </div>
        </div>
      )}

      <ComentariosModal
        show={!!comentarioAlvo}
        entidade="visita"
        entidadeId={comentarioAlvo?.id}
        titulo={comentarioAlvo ? `${comentarioAlvo.cliente_nome || '—'} · ${new Date(comentarioAlvo.data_visita).toLocaleDateString('pt-BR')}` : ''}
        onClose={() => setComentarioAlvo(null)}
        onChanged={carregar}
      />

      <MiniMapaModal
        show={!!mapaAlvo}
        lat={mapaAlvo?.latitude}
        lng={mapaAlvo?.longitude}
        titulo={mapaAlvo ? (mapaAlvo.cliente_nome || mapaAlvo.propriedade_nome || 'Visita') : ''}
        onClose={() => setMapaAlvo(null)}
      />
    </div>
  )
}
