import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { capturarFoto } from '../lib/camera'
import { capturarGPS } from '../lib/gps'
import { fluxoInicio, fluxoFim } from '../lib/usoColetor'
import {
  listarMeusCarros, estadoDoCarro, iniciarChecklist, salvarItem, concluirChecklist,
  STATUS_MES, concluido, mapaSalvos, primeiroPendente, erroDoItem, kmValido, resumoItens,
} from '../lib/checklistVeiculo'
import { Camera } from 'lucide-react'

// Posição para o anti-fraude (início e fim). Sem GPS o checklist segue.
async function posicao() {
  try {
    const p = await capturarGPS({ highAccuracy: true, timeout: 8000, maxAge: 30000 })
    return { lat: p.latitude, lng: p.longitude }
  } catch {
    return null
  }
}

// Checklist mensal completo do carro do vendedor (mesmo do app do técnico).
// /checklist-veiculo            → lista os carros em nome do vendedor
// /checklist-veiculo?placa=XXX  → abre direto o carro (link do "Pedir checklist")
export default function ChecklistVeiculo() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const placa = params.get('placa') || ''

  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [carros, setCarros] = useState([])

  const [estado, setEstado] = useState(null) // { checklist, itens, items, veiculo }
  const [items, setItems] = useState([])
  const [salvos, setSalvos] = useState({})
  const [checklistId, setChecklistId] = useState(null)
  const [fase, setFase] = useState('intro') // intro | item | resumo | resultado
  const [km, setKm] = useState('')
  const [idx, setIdx] = useState(0)
  const [foto, setFoto] = useState(null)
  const [fotoPrev, setFotoPrev] = useState('')
  const [resposta, setResposta] = useState('')
  const [obs, setObs] = useState('')
  // foto de pneu que a conferência automática (IA) não aceitou
  const [iaRecusa, setIaRecusa] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    let vivo = true
    async function carregar() {
      setCarregando(true); setErro('')
      try {
        if (!placa) {
          const r = await listarMeusCarros()
          if (!vivo) return
          setCarros(r.carros || [])
        } else {
          const r = await estadoDoCarro(placa)
          if (!vivo) return
          setEstado(r)
          setItems(r.items || [])
          setSalvos(mapaSalvos(r.itens))
          setChecklistId(r.checklist?.id || null)
          if (r.checklist?.km) setKm(String(r.checklist.km))
          setFase('intro')
        }
      } catch (e) {
        if (vivo) setErro(e.message)
      } finally {
        if (vivo) setCarregando(false)
      }
    }
    carregar()
    return () => { vivo = false }
  }, [placa])

  function mostrarItem(i, mapa = salvos) {
    const it = items[i]
    const s = it ? mapa[it.key] : null
    setIdx(i)
    setResposta(s?.resposta || '')
    setObs(s?.observacao || '')
    setFoto(null)
    setIaRecusa('')
    setFotoPrev(s?.foto_url || '')
    setErro('')
    window.scrollTo(0, 0)
  }

  async function comecar() {
    const n = kmValido(km)
    if (!n) { setErro('Informe o km atual do hodômetro.'); return }
    setOcupado(true); setErro('')
    try {
      const r = await iniciarChecklist(placa, n, await posicao())
      fluxoInicio('checklist_veiculo')
      const mapa = mapaSalvos(r.itens)
      setChecklistId(r.id)
      setItems(r.items || items)
      setSalvos(mapa)
      const i = primeiroPendente(r.items || items, mapa)
      if (i >= (r.items || items).length) setFase('resumo')
      else { setFase('item'); mostrarItem(i, mapa) }
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function tirarFoto() {
    try {
      const blob = await capturarFoto()
      setFoto(blob)
      setIaRecusa('')
      setFotoPrev(URL.createObjectURL(blob))
      setErro('')
    } catch { /* cancelou */ }
  }

  async function salvar(forcar = false) {
    const it = items[idx]
    const msg = erroDoItem({ temFoto: !!(foto || salvos[it.key]?.foto_url), resposta, observacao: obs })
    if (msg) { setErro(msg); return }
    setOcupado(true); setErro('')
    try {
      const r = await salvarItem({ checklistId, item: it, resposta, observacao: obs, foto, forcar })
      setIaRecusa('')
      const mapa = {
        ...salvos,
        [it.key]: { ...salvos[it.key], item_key: it.key, resposta, observacao: obs, foto_url: r.foto_url || salvos[it.key]?.foto_url },
      }
      setSalvos(mapa)
      if (idx < items.length - 1) mostrarItem(idx + 1, mapa)
      else setFase('resumo')
    } catch (e) {
      if (e.dados?.refazer) setIaRecusa(e.message)
      else setErro(e.message)
    } finally {
      setOcupado(false)
    }
  }

  async function concluir() {
    setOcupado(true); setErro('')
    try {
      setResultado(await concluirChecklist(checklistId, await posicao()))
      fluxoFim('checklist_veiculo', 'concluido')
      setFase('resultado')
    } catch (e) {
      setErro(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const avisoErro = erro && <p className="text-xs text-red-600 bg-red-50 rounded p-2 mb-3">{erro}</p>
  const voltarLista = () => { setEstado(null); setParams({}, { replace: false }) }

  if (carregando) {
    return <div className="py-16 text-center text-sm text-slate-500">Carregando…</div>
  }

  // ── lista de carros ──
  if (!placa) {
    return (
      <div className="pb-4">
        <button onClick={() => navigate(-1)} className="text-blue-700 text-sm inline-block mb-2">← Voltar</button>
        <h2 className="text-xl font-bold mb-1">Checklist do veículo</h2>
        <p className="text-sm text-slate-500 mb-4">Checklist mensal completo: 20 itens, cada um com foto.</p>
        {avisoErro}
        {!erro && carros.length === 0 && (
          <div className="bg-white rounded-xl shadow p-4 text-sm text-slate-600">
            Nenhum carro está em seu nome na Frota. Se você usa um carro da empresa, peça ao responsável da frota para colocar o seu nome nele.
          </div>
        )}
        <div className="space-y-2">
          {carros.map((c) => {
            const st = STATUS_MES[c.status] || STATUS_MES.nao_iniciado
            return (
              <button key={c.placa} onClick={() => setParams({ placa: c.placa })}
                className="w-full bg-white rounded-xl shadow p-3 flex items-center justify-between gap-2 text-left">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{c.placa_fmt}</p>
                  <p className="text-xs text-slate-500 truncate">{c.modelo || '—'}</p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const veic = estado?.veiculo
  const titulo = (
    <div className="mb-3">
      <h2 className="text-xl font-bold">Checklist do veículo</h2>
      <p className="text-sm text-slate-500">{placa}{veic?.modelo ? ` · ${[veic.marca, veic.modelo].filter(Boolean).join(' ')}` : ''}</p>
    </div>
  )

  // ── resultado ──
  if (fase === 'resultado' && resultado) {
    const suspeito = resultado.status === 'suspeito'
    return (
      <div className="pb-4">
        {titulo}
        <div className={`rounded-xl p-4 mb-4 ${suspeito ? 'bg-orange-50 text-orange-800' : 'bg-green-50 text-green-800'}`}>
          <p className="font-bold text-base mb-1">{suspeito ? 'Checklist enviado — vai ser conferido' : 'Checklist enviado!'}</p>
          <p className="text-sm">{resultado.titulo}</p>
          {suspeito && (resultado.alertas || []).length > 0 && (
            <ul className="text-xs mt-2 list-disc pl-4 space-y-0.5">
              {resultado.alertas.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}
        </div>
        <button onClick={() => navigate('/')} className="w-full bg-blue-700 text-white py-3 rounded-xl font-bold text-sm">Voltar ao início</button>
      </div>
    )
  }

  // ── já feito no mês ──
  if (estado?.checklist && concluido(estado.checklist.status)) {
    const st = STATUS_MES[estado.checklist.status]
    return (
      <div className="pb-4">
        <button onClick={voltarLista} className="text-blue-700 text-sm inline-block mb-2">← Meus carros</button>
        {titulo}
        <div className="bg-white rounded-xl shadow p-4 text-sm space-y-1">
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
          <p className="text-slate-700 pt-1">{estado.checklist.titulo || 'Checklist deste mês já foi feito.'}</p>
          {estado.checklist.fim_em && <p className="text-xs text-slate-500">Concluído em {new Date(estado.checklist.fim_em).toLocaleString('pt-BR')}</p>}
        </div>
      </div>
    )
  }

  // ── início: km ──
  if (fase === 'intro') {
    const feitos = Object.keys(salvos).length
    return (
      <div className="pb-4">
        <button onClick={voltarLista} className="text-blue-700 text-sm inline-block mb-2">← Meus carros</button>
        {titulo}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <p className="text-sm text-slate-600">
            São {items.length} itens. Em cada um: tire a foto, marque <b>OK</b> ou <b>Problema</b> e, se tiver problema, escreva o que é.
            Faça com calma, no carro — o tempo e as fotos são conferidos.
          </p>
          {feitos > 0 && <p className="text-xs bg-amber-50 text-amber-800 rounded p-2">Você já respondeu {feitos} de {items.length}. Continua de onde parou.</p>}
          <div>
            <label className="block text-xs text-slate-500 mb-1">Km atual do hodômetro <span className="text-red-500">*</span></label>
            <input value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="Ex.: 45230"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base" />
          </div>
          {avisoErro}
          <button onClick={comecar} disabled={ocupado}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            {ocupado ? 'Abrindo…' : feitos > 0 ? 'Continuar checklist' : 'Começar checklist'}
          </button>
        </div>
      </div>
    )
  }

  // ── resumo ──
  if (fase === 'resumo') {
    const r = resumoItens(items, salvos)
    const faltando = r.respondidos < r.total
    return (
      <div className="pb-4">
        {titulo}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <p className="text-sm font-bold">Resumo</p>
          <p className="text-sm text-slate-600">{r.respondidos} de {r.total} itens · {r.problemas} com problema</p>
          <div className="grid grid-cols-4 gap-1.5">
            {items.map((it, i) => {
              const s = salvos[it.key]
              return (
                <button key={it.key} onClick={() => { setFase('item'); mostrarItem(i) }}
                  className={`relative aspect-square rounded-lg overflow-hidden border ${s ? (s.resposta === 'problema' ? 'border-red-500' : 'border-green-500') : 'border-slate-300 bg-slate-100'}`}>
                  {s?.foto_url && <img src={s.foto_url} alt={it.titulo} className="w-full h-full object-cover" />}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] leading-tight px-0.5 py-0.5 truncate">{it.titulo}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-500">Toque num item para rever ou trocar a foto.</p>
          {avisoErro}
          <button onClick={concluir} disabled={ocupado || faltando}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            {ocupado ? 'Enviando…' : faltando ? `Faltam ${r.total - r.respondidos} itens` : 'Concluir checklist'}
          </button>
        </div>
      </div>
    )
  }

  // ── item ──
  const it = items[idx]
  if (!it) return null
  return (
    <div className="pb-4">
      {titulo}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>{it.cat}</span>
        <span>Item {idx + 1} de {items.length}</span>
      </div>
      <div className="h-1.5 bg-slate-200 rounded-full mb-3 overflow-hidden">
        <div className="h-full bg-blue-700" style={{ width: `${((idx + 1) / items.length) * 100}%` }} />
      </div>

      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <div>
          <p className="text-base font-bold">{it.titulo}</p>
          <p className="text-sm text-slate-500">{it.desc}</p>
        </div>

        <button type="button" onClick={tirarFoto}
          className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden flex items-center justify-center min-h-[180px]">
          {fotoPrev
            ? <img src={fotoPrev} alt={it.titulo} className="w-full max-h-72 object-contain" />
            : <span className="text-sm text-slate-500 py-10 inline-flex items-center gap-1.5"><Camera size={16} /> Tirar foto</span>}
        </button>
        {fotoPrev && <button type="button" onClick={tirarFoto} className="text-xs text-blue-700">Tirar outra foto</button>}

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setResposta('ok')}
            className={`py-3 rounded-xl text-sm font-bold border ${resposta === 'ok' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300'}`}>
            OK
          </button>
          <button type="button" onClick={() => setResposta('problema')}
            className={`py-3 rounded-xl text-sm font-bold border ${resposta === 'problema' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-300'}`}>
            Problema
          </button>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Observação {resposta === 'problema' ? <span className="text-red-500">* (qual é o problema)</span> : '(opcional)'}
          </label>
          <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>

        {avisoErro}
        {iaRecusa && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-300 rounded-lg p-3 mb-3">
            <p><b>A conferência automática não aceitou esta foto:</b> {iaRecusa}</p>
            <p className="mt-1">
              Tire outra foto. Se a foto está certa,{' '}
              <button type="button" onClick={() => salvar(true)} disabled={ocupado} className="font-bold underline">envie assim mesmo</button>
              {' '}(fica marcado para o gestor conferir).
            </p>
          </div>
        )}
        <div className="flex gap-2">
          {idx > 0 && (
            <button type="button" onClick={() => mostrarItem(idx - 1)} disabled={ocupado}
              className="px-4 py-3 rounded-xl text-sm font-medium border border-slate-300 text-slate-600">
              ← Anterior
            </button>
          )}
          <button type="button" onClick={() => salvar()} disabled={ocupado}
            className="flex-1 bg-blue-700 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50">
            {ocupado ? 'Salvando…' : idx < items.length - 1 ? 'Salvar e seguir' : 'Salvar e ver resumo'}
          </button>
        </div>
      </div>
    </div>
  )
}
