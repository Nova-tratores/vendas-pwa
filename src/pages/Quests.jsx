// Quests do vendedor: /quests (lista) e /quests/:id (responder).
// Tarefas que o supervisor mandou (ou aprovou das sugestões automáticas):
// ir até um trator/cliente e trazer horímetro, fotos, relatos. Funciona sem
// internet — a resposta fica na fila do aparelho e sai sozinha depois.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, CheckCircle2, ChevronRight, Clock, MapPin, Trash2, Trophy, WifiOff } from 'lucide-react'
import { capturarFoto } from '../lib/camera'
import { capturarGPSComFallback } from '../lib/gps'
import { carregarMinhasQuests, idsNaFila, responderQuest, urlFoto } from '../lib/questsLocal'
import { faltando, numeroDigitado, questsAFazer, rotuloAlvo, situacaoPrazo, ROTULO_REGRA } from '../lib/quests'
import { confete, vibrar } from '../lib/recompensas'

export default function Quests() {
  const { id } = useParams()
  const [dados, setDados] = useState(null)
  const [fila, setFila] = useState([])
  const [tick, setTick] = useState(0)
  const recarregar = () => setTick((t) => t + 1)

  useEffect(() => {
    let vivo = true
    Promise.all([carregarMinhasQuests(), idsNaFila()]).then(([d, f]) => { if (vivo) { setDados(d); setFila(f) } })
    return () => { vivo = false }
  }, [tick])

  if (!dados) return <p className="py-16 text-center text-sm text-slate-400">Carregando…</p>
  if (id) {
    const q = dados.quests.find((x) => String(x.id) === String(id))
    if (!q) return <p className="py-16 text-center text-sm text-slate-500">Quest não encontrada (ou ainda não chegou neste aparelho).</p>
    return <ResponderQuest quest={q} resposta={dados.respostas?.[q.id]} naFila={fila.includes(Number(q.id))} onEnviado={recarregar} />
  }
  return <ListaQuests quests={dados.quests} fila={fila} offline={dados.offline} />
}

function ListaQuests({ quests, fila, offline }) {
  const navigate = useNavigate()
  const aFazer = questsAFazer(quests, fila)
  const feitas = quests.filter((q) => q.status === 'concluida' || fila.includes(Number(q.id)))
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold flex items-center gap-2"><Trophy size={20} className="text-amber-500" /> Quests</h1>
      {offline && <p className="text-xs bg-slate-100 text-slate-600 rounded-lg p-2 flex items-center gap-1"><WifiOff size={14} /> Sem internet: mostrando a última cópia.</p>}
      {!aFazer.length && <p className="text-sm text-slate-500 bg-white rounded-xl shadow p-4">Nenhuma quest para fazer agora. Quando o supervisor mandar uma, ela aparece aqui e no Início.</p>}
      {aFazer.map((q) => <CartaoQuest key={q.id} q={q} onClick={() => navigate(`/quests/${q.id}`)} />)}
      {feitas.length > 0 && (
        <>
          <h2 className="text-sm font-bold text-slate-500 mt-4">Feitas</h2>
          {feitas.slice(0, 20).map((q) => <CartaoQuest key={q.id} q={q} feita naFila={fila.includes(Number(q.id))} onClick={() => navigate(`/quests/${q.id}`)} />)}
        </>
      )}
    </div>
  )
}

export function CartaoQuest({ q, feita = false, naFila = false, onClick }) {
  const prazo = situacaoPrazo(q.prazo)
  return (
    <button type="button" onClick={onClick} className={`w-full text-left bg-white rounded-xl shadow p-3 flex items-center gap-3 ${feita ? 'opacity-70' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${feita ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-600'}`}>
        {feita ? <CheckCircle2 size={20} /> : <Trophy size={20} />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-sm leading-tight">{q.titulo}</p>
        <p className="text-xs text-slate-500 truncate">{rotuloAlvo(q)}</p>
        <p className="text-xs mt-0.5 flex flex-wrap gap-x-2">
          <span className="font-bold text-amber-600">+{q.xp} XP</span>
          {naFila && <span className="text-slate-500">aguardando internet</span>}
          {!feita && prazo && <span className={prazo.atrasada ? 'text-red-600 font-semibold' : 'text-slate-500'}><Clock size={11} className="inline -mt-0.5" /> {prazo.texto}</span>}
        </p>
      </div>
      <ChevronRight size={18} className="text-slate-400" />
    </button>
  )
}

function ResponderQuest({ quest, resposta, naFila, onEnviado }) {
  const navigate = useNavigate()
  const anterior = resposta?.respostas || {}
  const itemFotos = (quest.itens || []).find((i) => i.tipo === 'fotos')
  const [valores, setValores] = useState(() => {
    const v = {}
    for (const it of quest.itens || []) if (it.tipo !== 'fotos' && anterior[it.chave] != null) v[it.chave] = anterior[it.chave]
    return v
  })
  const [fotos, setFotos] = useState([]) // Blobs novos
  const [existentes, setExistentes] = useState(() => (itemFotos && Array.isArray(anterior[itemFotos.chave]) ? anterior[itemFotos.chave] : []))
  const [urls, setUrls] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [feito, setFeito] = useState(false)
  const somenteLeitura = quest.status === 'concluida' || naFila
  const prazo = situacaoPrazo(quest.prazo)

  useEffect(() => {
    let vivo = true
    Promise.all(existentes.map(async (c) => [c, await urlFoto(c).catch(() => null)]))
      .then((pares) => { if (vivo) setUrls(Object.fromEntries(pares)) })
    return () => { vivo = false }
  }, [existentes])
  const previas = useMemo(() => fotos.map((b) => URL.createObjectURL(b)), [fotos])
  useEffect(() => () => previas.forEach((u) => URL.revokeObjectURL(u)), [previas])

  const respostasAtuais = { ...valores, ...(itemFotos ? { [itemFotos.chave]: [...existentes, ...fotos] } : {}) }
  const falta = faltando(quest.itens, respostasAtuais)

  async function tirar() {
    try { const b = await capturarFoto(); if (b) setFotos((f) => [...f, b]) } catch { /* cancelou */ }
  }

  async function enviar() {
    if (falta.length) return
    setEnviando(true)
    let gps = null
    try { const p = await capturarGPSComFallback(); gps = { lat: p.latitude, lng: p.longitude, precisao: p.gps_accuracy } } catch { /* sem GPS: vai sem */ }
    try {
      // horímetro vai como número ("1.234,5" → 1234.5)
      const respostas = { ...valores }
      for (const it of quest.itens || []) if (it.tipo === 'numero' && respostas[it.chave] != null) respostas[it.chave] = numeroDigitado(respostas[it.chave])
      const saiu = await responderQuest(quest, { respostas, fotos, fotosExistentes: existentes, gps })
      confete({ dourado: true }); vibrar([30, 30, 120])
      setFeito(saiu > 0 ? 'enviada' : 'fila')
      onEnviado?.()
    } catch (e) {
      alert('Não foi possível guardar a resposta: ' + (e?.message || e))
    } finally {
      setEnviando(false)
    }
  }

  if (feito) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center space-y-2">
        <Trophy size={40} className="mx-auto text-amber-500" />
        <p className="text-lg font-extrabold">+{quest.xp} XP</p>
        <p className="text-sm text-slate-600">{feito === 'enviada' ? 'Quest enviada ao supervisor.' : 'Guardada no aparelho: sai sozinha quando tiver internet.'}</p>
        <button type="button" onClick={() => navigate('/quests')} className="mt-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-bold">Ver minhas quests</button>
      </div>
    )
  }

  return (
    <div className="space-y-3 pb-24">
      <button type="button" onClick={() => navigate('/quests')} className="text-sm text-blue-700">← Quests</button>
      <div className="bg-white rounded-xl shadow p-4">
        <p className="text-xs font-bold text-amber-600">{quest.regra ? ROTULO_REGRA[quest.regra] : 'Quest do supervisor'} · +{quest.xp} XP</p>
        <h1 className="text-lg font-extrabold leading-tight mt-0.5">{quest.titulo}</h1>
        <p className="text-sm text-slate-600 mt-1 flex items-start gap-1"><MapPin size={14} className="mt-0.5 shrink-0" />{rotuloAlvo(quest) || '—'}</p>
        {quest.descricao && <p className="text-sm mt-2 whitespace-pre-line">{quest.descricao}</p>}
        {quest.motivo && <p className="text-xs text-slate-500 mt-2">{quest.motivo}</p>}
        {prazo && <p className={`text-xs mt-2 font-semibold ${prazo.atrasada ? 'text-red-600' : 'text-slate-500'}`}><Clock size={12} className="inline -mt-0.5" /> Prazo {quest.prazo.split('-').reverse().join('/')} · {prazo.texto}</p>}
        {quest.nota_supervisor && quest.status === 'aberta' && (
          <p className="text-xs mt-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-2">Devolvida pelo supervisor: {quest.nota_supervisor}</p>
        )}
        {somenteLeitura && <p className="text-xs mt-2 text-green-700 font-semibold">{naFila ? 'Resposta guardada, aguardando internet.' : 'Quest concluída.'}</p>}
      </div>

      {(quest.itens || []).map((it) => (
        <div key={it.chave} className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-bold">{it.rotulo}{it.obrigatorio && <span className="text-red-500"> *</span>}</p>
          {it.tipo === 'numero' && (
            <input inputMode="decimal" value={valores[it.chave] ?? ''} disabled={somenteLeitura}
              onChange={(e) => setValores((v) => ({ ...v, [it.chave]: e.target.value }))}
              placeholder="ex.: 1234" className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-lg" />
          )}
          {it.tipo === 'texto' && (
            <textarea rows={3} value={valores[it.chave] ?? ''} disabled={somenteLeitura}
              onChange={(e) => setValores((v) => ({ ...v, [it.chave]: e.target.value }))}
              className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
          )}
          {it.tipo === 'simnao' && (
            <div className="mt-2 flex gap-2">
              {[[true, 'Sim'], [false, 'Não']].map(([val, rot]) => (
                <button key={rot} type="button" disabled={somenteLeitura} onClick={() => setValores((v) => ({ ...v, [it.chave]: val }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border ${valores[it.chave] === val ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-300'}`}>{rot}</button>
              ))}
            </div>
          )}
          {it.tipo === 'fotos' && (
            <div className="mt-2">
              <div className="grid grid-cols-3 gap-2">
                {existentes.map((c) => (
                  <div key={c} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    {urls[c] && <img src={urls[c]} alt="" className="w-full h-full object-cover" />}
                    {!somenteLeitura && <button type="button" onClick={() => setExistentes((x) => x.filter((y) => y !== c))} className="absolute top-1 right-1 bg-white/90 rounded-full p-1"><Trash2 size={14} /></button>}
                  </div>
                ))}
                {previas.map((u, i) => (
                  <div key={u} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden">
                    <img src={u} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setFotos((f) => f.filter((_, j) => j !== i))} className="absolute top-1 right-1 bg-white/90 rounded-full p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
                {!somenteLeitura && (
                  <button type="button" onClick={tirar} className="aspect-square rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 text-xs">
                    <Camera size={22} />Tirar foto
                  </button>
                )}
              </div>
              {it.min > 1 && <p className="text-xs text-slate-500 mt-1">Mínimo {it.min} fotos.</p>}
            </div>
          )}
        </div>
      ))}

      {!somenteLeitura && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-40">
          {falta.length > 0 && <p className="text-xs bg-white/95 rounded-lg shadow px-3 py-1.5 mb-2 text-slate-600">Falta: {falta.join(' · ')}</p>}
          <button type="button" disabled={!!falta.length || enviando} onClick={enviar}
            className="w-full py-3 rounded-xl font-extrabold text-white bg-green-700 disabled:bg-slate-400 shadow-lg">
            {enviando ? 'Enviando…' : `Enviar e ganhar +${quest.xp} XP`}
          </button>
        </div>
      )}
    </div>
  )
}
