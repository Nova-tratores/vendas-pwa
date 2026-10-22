// Missões relâmpago (supervisor): por um período curto, um tipo de visita vale
// 2x ou 3x XP para a equipe ("hoje, toda visita com máquina vale triplo").
// Grava em vendas_missoes (só supervisor ativo pode gravar — RLS).
import { useEffect, useState } from 'react'
import { supabase } from '../lib/sync'

const CAMPOS = [
  ['qualquer', 'Toda visita'],
  ['maquina', 'Visita com máquina'],
  ['pessoa', 'Visita com pessoa e cargo'],
  ['cultura', 'Visita com cultura da propriedade'],
  ['retorno', 'Visita com retorno marcado'],
  ['negocio', 'Visita com negócio'],
  ['resumo', 'Visita com resumo completo'],
  ['passos', 'Visita com próximos passos'],
]

const local = (d) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return x.toISOString().slice(0, 16)
}

export default function SupervisorMissoes() {
  const [missoes, setMissoes] = useState([])
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(() => ({
    titulo: '', campo: 'maquina', multiplicador: 3,
    inicio: local(new Date()), fim: local(new Date(Date.now() + 24 * 3600000)),
  }))

  async function carregar() {
    const { data, error } = await supabase.from('vendas_missoes').select('*').order('inicio', { ascending: false }).limit(50)
    if (error) setErro(/vendas_missoes/.test(error.message) ? 'Missões ainda não estão ativas: falta rodar supabase-gamificacao-fase3.sql.' : error.message)
    else { setErro(''); setMissoes(data || []) }
  }
  useEffect(() => { carregar() }, [])

  async function criar(e) {
    e.preventDefault()
    if (!form.titulo.trim()) { alert('Dê um nome para a missão.'); return }
    let sup = {}
    try { sup = JSON.parse(localStorage.getItem('supervisor') || '{}') } catch { /* sem nome */ }
    setSalvando(true)
    const { error } = await supabase.from('vendas_missoes').insert({
      titulo: form.titulo.trim(), campo: form.campo, multiplicador: Number(form.multiplicador),
      inicio: new Date(form.inicio).toISOString(), fim: new Date(form.fim).toISOString(), criado_por: sup.nome || 'Supervisor',
    })
    setSalvando(false)
    if (error) { alert('Não foi possível criar: ' + error.message); return }
    setForm((f) => ({ ...f, titulo: '' }))
    carregar()
  }

  async function encerrar(m) {
    if (!confirm(`Encerrar a missão "${m.titulo}" agora?`)) return
    const { error } = await supabase.from('vendas_missoes').update({ ativo: false }).eq('id', m.id)
    if (error) alert(error.message)
    carregar()
  }

  const agora = Date.now()
  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-1">Missões relâmpago</h2>
      <p className="text-sm text-slate-500 mb-4">
        Por um período curto, um tipo de visita vale mais XP. Use de vez em quando e troque o tipo — a mesma missão perde o efeito em poucas semanas.
      </p>
      {erro && <p className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg p-2 mb-3">{erro}</p>}

      <form onSubmit={criar} className="bg-white rounded-xl shadow p-4 space-y-2 mb-4">
        <input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
          placeholder='Nome (ex.: "Dia da máquina")' className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.campo} onChange={(e) => setForm((f) => ({ ...f, campo: e.target.value }))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            {CAMPOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <select value={form.multiplicador} onChange={(e) => setForm((f) => ({ ...f, multiplicador: e.target.value }))} className="border border-slate-300 rounded-lg px-2 py-2 text-sm bg-white">
            <option value={2}>vale 2x XP</option>
            <option value={3}>vale 3x XP</option>
          </select>
          <label className="text-xs text-slate-500">Começa<input type="datetime-local" value={form.inicio} onChange={(e) => setForm((f) => ({ ...f, inicio: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></label>
          <label className="text-xs text-slate-500">Termina<input type="datetime-local" value={form.fim} onChange={(e) => setForm((f) => ({ ...f, fim: e.target.value }))} className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm" /></label>
        </div>
        <button type="submit" disabled={salvando} className="w-full bg-violet-700 text-white font-semibold py-2 rounded-lg disabled:opacity-50">
          {salvando ? 'Criando…' : '⚡ Lançar missão'}
        </button>
      </form>

      <div className="space-y-2">
        {missoes.map((m) => {
          const valendo = m.ativo !== false && new Date(m.inicio).getTime() <= agora && new Date(m.fim).getTime() >= agora
          const futura = m.ativo !== false && new Date(m.inicio).getTime() > agora
          return (
            <div key={m.id} className="bg-white rounded-xl shadow p-3 flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded-full ${valendo ? 'bg-violet-100 text-violet-800' : futura ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                {valendo ? 'valendo' : futura ? 'agendada' : 'encerrada'}
              </span>
              <span className="flex-1 min-w-0 text-sm">
                <b>{m.titulo}</b> · {CAMPOS.find(([k]) => k === m.campo)?.[1] || m.campo} vale {Number(m.multiplicador)}x
                <span className="block text-xs text-slate-500">
                  {new Date(m.inicio).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} até {new Date(m.fim).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {m.criado_por ? ` · ${m.criado_por}` : ''}
                </span>
              </span>
              {(valendo || futura) && <button type="button" onClick={() => encerrar(m)} className="text-xs text-red-600 underline">encerrar</button>}
            </div>
          )
        })}
        {!missoes.length && !erro && <p className="text-sm text-slate-400">Nenhuma missão ainda.</p>}
      </div>
    </div>
  )
}
