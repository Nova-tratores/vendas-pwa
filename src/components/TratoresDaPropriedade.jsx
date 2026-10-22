// "Tem trator nosso aqui?" — na visita, os tratores vendidos que parecem ser do
// cliente (nome do dono + cidade). Um toque prende o trator ao GPS da hora e ao
// imóvel do CAR (o banco descobre qual). Cada resposta vale XP.
import { useEffect, useMemo, useState } from 'react'
import { carregarTratores, carregarConfirmacoes, confirmarTrator, enviarFilaTratores } from '../lib/tratoresLocal'
import { tratoresDoCliente, ultimaPorChassi, XP_POR_CONFIRMACAO } from '../lib/tratoresCliente'
import { tic, vibrar } from '../lib/recompensas'

const RESPOSTAS = [
  { key: 'aqui', label: '📍 Está aqui', cls: 'bg-green-600 text-white border-green-600' },
  { key: 'nao_esta', label: 'Não está aqui', cls: 'bg-white text-slate-700 border-slate-300' },
  { key: 'nao_e_mais_dele', label: 'Não é mais dele', cls: 'bg-white text-slate-700 border-slate-300' },
]

async function gpsAgora(gpsVisita) {
  if (gpsVisita?.latitude != null) return { lat: gpsVisita.latitude, lng: gpsVisita.longitude, precisao: gpsVisita.gps_accuracy ?? null }
  return new Promise((ok) => {
    if (!navigator.geolocation) { ok(null); return }
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisao: p.coords.accuracy }),
      () => ok(null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  })
}

export default function TratoresDaPropriedade({ propriedade, nomeDono, gpsVisita }) {
  const [tratores, setTratores] = useState([])
  const [confirmacoes, setConfirmacoes] = useState([])
  const [salvando, setSalvando] = useState('')
  const [ganho, setGanho] = useState('')

  useEffect(() => {
    enviarFilaTratores().catch(() => {})
    carregarTratores().then(setTratores).catch(() => {})
    carregarConfirmacoes().then(setConfirmacoes).catch(() => {})
  }, [])

  const doCliente = useMemo(() => tratoresDoCliente(tratores, {
    nomes: [propriedade?.nome, propriedade?.razao_social, propriedade?.nome_fantasia, nomeDono].filter(Boolean),
    cidade: propriedade?.cidade,
  }), [tratores, propriedade, nomeDono])
  const ultima = useMemo(() => ultimaPorChassi(confirmacoes), [confirmacoes])

  if (!doCliente.length) return null

  async function responder(t, resposta) {
    setSalvando(t.Chassis)
    try {
      const gps = resposta === 'aqui' ? await gpsAgora(gpsVisita) : null
      if (resposta === 'aqui' && !gps) { alert('Não consegui pegar o GPS. Ative a localização e tente de novo.'); return }
      const r = await confirmarTrator({ chassis: t.Chassis, resposta, propriedadeId: propriedade?.id, gps })
      setConfirmacoes((cs) => [r.linha, ...cs])
      tic(); vibrar(40)
      setGanho(`+${XP_POR_CONFIRMACAO} XP${r.naFila ? ' (envia quando tiver internet)' : ''}`)
      setTimeout(() => setGanho(''), 2500)
    } catch (e) {
      alert(e.message)
    } finally {
      setSalvando('')
    }
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-emerald-900">🚜 Este cliente tem trator nosso</p>
        {ganho && <span className="text-xs font-bold text-green-700">{ganho}</span>}
      </div>
      <p className="text-[11px] text-emerald-800">Confirme onde está — cada resposta vale {XP_POR_CONFIRMACAO} XP e ajuda o Pós-Vendas a achar o trator.</p>
      {doCliente.map((t) => {
        const u = ultima.get(t.Chassis)
        return (
          <div key={t.Chassis} className="bg-white rounded-lg p-2 border border-emerald-100">
            <p className="text-sm font-medium">Mahindra {t.Modelo} <span className="text-xs text-slate-500">· chassi …{String(t.Chassis).slice(-6)}{t.Entrega ? ` · entregue ${t.Entrega}` : ''}</span></p>
            <p className="text-[11px] text-slate-500">{t.Cliente}{t.Cidade ? ` · ${t.Cidade}` : ''}</p>
            {u && (
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Última resposta: {u.resposta === 'aqui' ? 'está aqui' : u.resposta === 'nao_esta' ? 'não estava' : 'não é mais dele'} em {new Date(u.confirmado_em).toLocaleDateString('pt-BR')}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {RESPOSTAS.map((r) => (
                <button key={r.key} type="button" disabled={salvando === t.Chassis} onClick={() => responder(t, r.key)}
                  className={`text-xs px-3 py-1.5 rounded-full border ${r.cls} disabled:opacity-50`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
