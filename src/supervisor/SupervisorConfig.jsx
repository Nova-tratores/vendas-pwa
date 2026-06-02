import { useState, useEffect } from 'react'
import { getConfig, salvarConfig } from '../lib/supabaseQueries'

export default function SupervisorConfig() {
  const [form, setForm] = useState({ dias_lembrete_negocio: 7, dias_inativo_visita: 3 })
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    getConfig({ force: true }).then((c) => {
      setForm({
        dias_lembrete_negocio: c.dias_lembrete_negocio ?? 7,
        dias_inativo_visita: c.dias_inativo_visita ?? 3,
      })
      setLoading(false)
    })
  }, [])

  async function salvar() {
    setSalvando(true)
    setMsg('')
    try {
      const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
      await salvarConfig({
        dias_lembrete_negocio: Math.max(1, Number(form.dias_lembrete_negocio) || 7),
        dias_inativo_visita: Math.max(1, Number(form.dias_inativo_visita) || 3),
      }, supervisor.id)
      setMsg('Configurações salvas.')
    } catch (err) {
      setMsg('Erro ao salvar: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold mb-1">Configurações</h2>
      <p className="text-sm text-slate-500 mb-4">Valores globais, valem para todos os vendedores.</p>

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Lembrar de atualizar negócio em andamento a cada (dias)
          </label>
          <input
            type="number"
            min="1"
            value={form.dias_lembrete_negocio}
            onChange={(e) => setForm({ ...form, dias_lembrete_negocio: e.target.value })}
            className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            O vendedor é avisado no app quando um negócio em andamento fica este tempo sem atualização.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Alertar vendedor inativo após (dias sem visita)
          </label>
          <input
            type="number"
            min="1"
            value={form.dias_inativo_visita}
            onChange={(e) => setForm({ ...form, dias_inativo_visita: e.target.value })}
            className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-slate-500 mt-1">
            Gera alerta na aba Alertas quando o vendedor passa este tempo sem registrar visita.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
          {msg && (
            <span className={`text-sm ${msg.startsWith('Erro') ? 'text-red-600' : 'text-green-700'}`}>{msg}</span>
          )}
        </div>
      </div>
    </div>
  )
}
