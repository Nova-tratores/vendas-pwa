// Paradas longas do carro para o vendedor explicar. Parada de 30 min ou mais
// sem visita registrada perto aparece aqui; um toque diz o que foi. Nada vira
// visita sozinho: "Visita" leva para registrar a visita de verdade.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { paradasDoDia, explicarParada, hojeBR, fmtHora, fmtDuracao, MOTIVOS_PARADA } from '../lib/mapaVendedores'

const ontem = () => hojeBR(new Date(Date.now() - 86400000))

export default function ParadasCarro() {
  const navigate = useNavigate()
  const [dia, setDia] = useState(hojeBR())
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState('')
  const [obs, setObs] = useState({})

  async function carregar(d = dia) {
    setCarregando(true); setErro('')
    try { setDados(await paradasDoDia(d)) } catch (e) { setErro(e.message) }
    setCarregando(false)
  }
  useEffect(() => { carregar(dia) }, [dia]) // eslint-disable-line react-hooks/exhaustive-deps

  async function explicar(p, motivo) {
    setSalvando(p.inicio)
    try {
      await explicarParada({ placa: dados.placa, inicio: p.inicio, fim: p.fim, duracao_min: p.duracao_min, lat: p.lat, lng: p.lng, motivo, observacao: obs[p.inicio] || '' })
      if (motivo === 'visita') { navigate('/visitas'); return }
      await carregar()
    } catch (e) {
      alert(e.message)
    } finally {
      setSalvando('')
    }
  }

  const paradas = dados?.paradas || []
  const aExplicar = paradas.filter((p) => p.situacao === 'a_explicar')
  const resolvidas = paradas.filter((p) => p.situacao !== 'a_explicar')

  return (
    <div className="p-4 max-w-lg mx-auto space-y-3">
      <div>
        <h2 className="text-xl font-bold">Paradas do carro</h2>
        <p className="text-xs text-slate-500">Paradas de 30 min ou mais sem visita registrada perto. Diga o que foi — leva 1 toque.</p>
      </div>
      <div className="flex gap-1.5">
        {[[hojeBR(), 'Hoje'], [ontem(), 'Ontem']].map(([d, l]) => (
          <button key={d} type="button" onClick={() => setDia(d)}
            className={`text-xs px-3 py-1.5 rounded-full border ${dia === d ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}>{l}</button>
        ))}
      </div>

      {carregando && <p className="text-sm text-slate-500">Buscando as paradas do carro…</p>}
      {erro && <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2">{erro}</p>}
      {dados?.aviso && <p className="text-sm text-slate-600">{dados.aviso}</p>}

      {!carregando && dados && !dados.aviso && aExplicar.length === 0 && (
        <p className="text-sm bg-green-50 text-green-800 border border-green-200 rounded-lg p-3">Nenhuma parada para explicar neste dia. 👍</p>
      )}

      {aExplicar.map((p) => (
        <div key={p.inicio} className="bg-white rounded-xl shadow p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{fmtHora(p.inicio)}–{p.fim ? fmtHora(p.fim) : 'agora'} · parado {fmtDuracao(p.duracao_min)}</p>
            <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 font-semibold">ver local ↗</a>
          </div>
          {p.local && <p className="text-xs text-slate-500">{p.local}</p>}
          <p className="text-xs text-slate-600">O que foi?</p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_PARADA.map((m) => (
              <button key={m.key} type="button" disabled={!!salvando} onClick={() => explicar(p, m.key)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-300 bg-white active:bg-slate-100 disabled:opacity-50">
                {m.icone} {m.label}
              </button>
            ))}
          </div>
          <input value={obs[p.inicio] || ''} onChange={(e) => setObs((o) => ({ ...o, [p.inicio]: e.target.value }))}
            placeholder="Observação (opcional)" className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs" />
        </div>
      ))}

      {resolvidas.length > 0 && (
        <div className="bg-white rounded-xl shadow p-3">
          <p className="text-xs font-semibold text-slate-500 mb-1">Já resolvidas</p>
          <ul className="space-y-1">
            {resolvidas.map((p) => {
              const m = MOTIVOS_PARADA.find((x) => x.key === p.motivo)
              return (
                <li key={p.inicio} className="text-xs text-slate-700">
                  {fmtHora(p.inicio)} · {fmtDuracao(p.duracao_min)} — {p.situacao === 'visita' ? '🤝 visita registrada' : `${m?.icone || ''} ${m?.label || p.motivo}`}{p.observacao ? ` (${p.observacao})` : ''}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
