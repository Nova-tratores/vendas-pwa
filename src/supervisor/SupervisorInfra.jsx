import { useState, useEffect } from 'react'
import { supabase } from '../lib/sync'

// Painel de Consumo de Dados (admin). Mede o que dá pra medir com precisão via SQL:
// tamanho/linhas das tabelas, uso do Storage por bucket e consumo do worker do Railway.
// Banda/egress e a cobrança ao vivo ficam nos dashboards do Supabase/Railway.

function fmtBytes(n) {
  const b = Number(n) || 0
  if (b < 1024) return `${b} B`
  const u = ['KB', 'MB', 'GB', 'TB']
  let v = b / 1024, i = 0
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${u[i]}`
}

function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('pt-BR')
}

export default function SupervisorInfra() {
  const [tabelas, setTabelas] = useState([])
  const [storage, setStorage] = useState([])
  const [worker, setWorker] = useState(null)
  const [dias, setDias] = useState(30)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => { carregar() }, [dias])

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [rt, rs, rw] = await Promise.all([
        supabase.rpc('infra_tamanho_tabelas'),
        supabase.rpc('infra_uso_storage'),
        supabase.rpc('infra_uso_worker', { dias }),
      ])
      if (rt.error) throw rt.error
      if (rs.error) throw rs.error
      if (rw.error) throw rw.error
      setTabelas(rt.data || [])
      setStorage(rs.data || [])
      setWorker((rw.data && rw.data[0]) || null)
    } catch (err) {
      setErro(err.message || 'Falha ao carregar métricas. Rodou o supabase-infra-uso.sql?')
    } finally {
      setLoading(false)
    }
  }

  const maxTabela = Math.max(1, ...tabelas.map((t) => Number(t.total_bytes) || 0))
  const maxBucket = Math.max(1, ...storage.map((s) => Number(s.total_bytes) || 0))
  const totalBanco = tabelas.reduce((a, t) => a + (Number(t.total_bytes) || 0), 0)
  const totalStorage = storage.reduce((a, s) => a + (Number(s.total_bytes) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-bold">Consumo de dados</h2>
        <button onClick={carregar} className="text-xs bg-slate-200 px-2 py-1 rounded active:bg-slate-300">
          Atualizar
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Banco {fmtBytes(totalBanco)} · Storage {fmtBytes(totalStorage)}. O que está pesando mais aparece primeiro.
      </p>

      {erro && <p className="text-sm text-red-700 bg-red-50 rounded-lg p-3 mb-4">{erro}</p>}

      {/* Tabelas do banco */}
      <section className="bg-white rounded-xl shadow p-4 mb-4">
        <h3 className="font-semibold text-slate-800 mb-3">Tabelas do banco (por tamanho)</h3>
        <div className="space-y-2">
          {tabelas.map((t) => {
            const total = Number(t.total_bytes) || 0
            const pct = Math.round((total / maxTabela) * 100)
            return (
              <div key={t.tabela}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 truncate mr-2">{t.tabela}</span>
                  <span className="text-slate-500 whitespace-nowrap">
                    {fmtBytes(total)} · ~{fmtNum(t.linhas)} linhas
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded mt-1 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {tabelas.length === 0 && <p className="text-sm text-slate-400">Sem dados.</p>}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          Nº de linhas é estimativa do Postgres (atualiza no autovacuum/ANALYZE).
        </p>
      </section>

      {/* Storage por bucket */}
      <section className="bg-white rounded-xl shadow p-4 mb-4">
        <h3 className="font-semibold text-slate-800 mb-3">Storage por bucket</h3>
        <div className="space-y-2">
          {storage.map((s) => {
            const total = Number(s.total_bytes) || 0
            const pct = Math.round((total / maxBucket) * 100)
            return (
              <div key={s.bucket}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 truncate mr-2">{s.bucket}</span>
                  <span className="text-slate-500 whitespace-nowrap">
                    {fmtBytes(total)} · {fmtNum(s.arquivos)} arquivos
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded mt-1 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
          {storage.length === 0 && <p className="text-sm text-slate-400">Nenhum arquivo no Storage.</p>}
        </div>
      </section>

      {/* Worker do Railway */}
      <section className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800">Worker de vídeos (Railway)</h3>
          <select
            value={dias}
            onChange={(e) => setDias(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded px-2 py-1"
          >
            <option value={7}>7 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>
        {worker ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Metrica rotulo="Jobs" valor={fmtNum(worker.jobs)} />
            <Metrica rotulo="Concluídos" valor={fmtNum(worker.jobs_ok)} />
            <Metrica rotulo="Com erro" valor={fmtNum(worker.jobs_erro)} />
            <Metrica rotulo="Baixado (bruto)" valor={fmtBytes(worker.bytes_baixados)} />
            <Metrica rotulo="Enviado ao Storage" valor={fmtBytes(worker.bytes_final)} />
            <Metrica rotulo="Tempo de processamento" valor={`${Math.round((Number(worker.processamento_seg) || 0) / 60)} min`} />
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sem jobs registrados no período.</p>
        )}
      </section>

      <p className="text-[11px] text-slate-400">
        Banda/egress e a cobrança ao vivo do Supabase e do Railway ficam nos dashboards oficiais de cada serviço.
      </p>
    </div>
  )
}

function Metrica({ rotulo, valor }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="text-lg font-bold text-slate-800">{valor}</p>
    </div>
  )
}
