import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/sync'
import { CHECKLISTS, getChecklist } from '../lib/checklists'

const TIPOS = [
  { key: 'corretiva', label: 'Manutenção Corretiva', icon: '🔧', desc: 'Algo quebrou / precisa de conserto' },
  { key: 'preventiva', label: 'Manutenção Preventiva', icon: '🛡️', desc: 'Revisão / troca programada' },
  { key: 'checklist', label: 'Efetuar Checklist', icon: '📋', desc: 'Vistoria do veículo' },
]

const STATUS_ITEM = [
  { key: 'ok', label: 'OK', cls: 'bg-green-600 text-white border-green-600' },
  { key: 'nok', label: 'Não OK', cls: 'bg-red-600 text-white border-red-600' },
  { key: 'na', label: 'N/A', cls: 'bg-slate-400 text-white border-slate-400' },
]

export default function ChamadoVeicular() {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')

  const [placas, setPlacas] = useState([])
  const [placaId, setPlacaId] = useState('')
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [checklistChave, setChecklistChave] = useState('')
  const [respostas, setRespostas] = useState({}) // item -> { status, obs }
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [historico, setHistorico] = useState([])

  useEffect(() => {
    carregarPlacas()
    carregarHistorico()
  }, [])

  async function carregarPlacas() {
    try {
      const { data } = await supabase.from('SupaPlacas').select('IdPlaca, NumPlaca').order('NumPlaca')
      if (data) setPlacas(data)
    } catch { /* offline */ }
  }

  async function carregarHistorico() {
    try {
      const { data } = await supabase
        .from('chamados_veiculares')
        .select('id, placa, tipo, checklist_nome, tem_pendencia, status, created_at')
        .eq('vendedor_id', vendedor.id)
        .order('created_at', { ascending: false })
        .limit(10)
      if (data) setHistorico(data)
    } catch { /* offline */ }
  }

  const checklist = checklistChave ? getChecklist(checklistChave) : null

  function setItem(item, campo, valor) {
    setRespostas((r) => ({ ...r, [item]: { ...r[item], [campo]: valor } }))
  }

  function resetForm() {
    setPlacaId(''); setTipo(''); setDescricao(''); setChecklistChave(''); setRespostas({})
  }

  async function enviar() {
    setErro('')
    if (!navigator.onLine) { setErro('Sem internet. Conecte para abrir o chamado.'); return }
    if (!placaId) { setErro('Selecione o veículo.'); return }
    if (!tipo) { setErro('Selecione o tipo.'); return }
    if ((tipo === 'corretiva' || tipo === 'preventiva') && !descricao.trim()) {
      setErro('Descreva o que precisa.'); return
    }
    if (tipo === 'checklist') {
      if (!checklist) { setErro('Escolha qual checklist.'); return }
      const faltam = checklist.itens.filter((i) => !respostas[i]?.status)
      if (faltam.length > 0) { setErro(`Marque todos os itens (${faltam.length} faltando).`); return }
    }

    const placaSel = placas.find((p) => String(p.IdPlaca) === String(placaId))
    const respostasArr = tipo === 'checklist'
      ? checklist.itens.map((i) => ({ item: i, status: respostas[i]?.status || 'na', obs: respostas[i]?.obs || '' }))
      : null
    const temPendencia = !!respostasArr?.some((r) => r.status === 'nok')

    setEnviando(true)
    try {
      const { error } = await supabase.from('chamados_veiculares').insert({
        vendedor_id: vendedor.id || null,
        vendedor_nome: vendedor.nome || '',
        placa_id: placaSel?.IdPlaca ?? null,
        placa: placaSel?.NumPlaca ?? null,
        tipo,
        descricao: (tipo === 'checklist') ? (descricao.trim() || null) : descricao.trim(),
        checklist_chave: tipo === 'checklist' ? checklist.chave : null,
        checklist_nome: tipo === 'checklist' ? checklist.nome : null,
        respostas: respostasArr,
        tem_pendencia: temPendencia,
      })
      if (error) throw error
      setSucesso(true)
      resetForm()
      carregarHistorico()
      setTimeout(() => setSucesso(false), 4000)
    } catch (err) {
      setErro('Não foi possível enviar: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="pb-4">
      <button onClick={() => navigate(-1)} className="text-blue-700 text-sm inline-block mb-2">← Voltar</button>
      <h2 className="text-xl font-bold mb-1">Chamado Veicular</h2>
      <p className="text-sm text-slate-500 mb-4">Abra uma manutenção ou registre um checklist do veículo.</p>

      {sucesso && (
        <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-medium">
          Chamado registrado com sucesso!
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 space-y-4">
        {/* Veículo */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Veículo <span className="text-red-500">*</span></label>
          <select
            value={placaId}
            onChange={(e) => setPlacaId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
          >
            <option value="">Selecione a placa</option>
            {placas.map((p) => (
              <option key={p.IdPlaca} value={p.IdPlaca}>{p.NumPlaca}</option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-xs text-slate-500 mb-1">O que deseja <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-1 gap-2">
            {TIPOS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTipo(t.key)}
                className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  tipo === t.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                <span className="text-2xl">{t.icon}</span>
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className={`text-xs ${tipo === t.key ? 'text-blue-100' : 'text-slate-400'}`}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Corretiva / Preventiva: descrição */}
        {(tipo === 'corretiva' || tipo === 'preventiva') && (
          <div className="animate-slide-up">
            <label className="block text-xs text-slate-500 mb-1">
              Descrição <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              placeholder={tipo === 'corretiva' ? 'Descreva o problema / defeito...' : 'Descreva a revisão / serviço necessário...'}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        {/* Checklist */}
        {tipo === 'checklist' && (
          <div className="animate-slide-up space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Qual checklist <span className="text-red-500">*</span></label>
              <div className="flex flex-wrap gap-2">
                {CHECKLISTS.map((c) => (
                  <button
                    key={c.chave}
                    type="button"
                    onClick={() => { setChecklistChave(c.chave); setRespostas({}) }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      checklistChave === c.chave ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {c.nome} · {c.frequencia}
                  </button>
                ))}
              </div>
            </div>

            {checklist && (
              <div className="space-y-2">
                {checklist.itens.map((item) => {
                  const r = respostas[item] || {}
                  return (
                    <div key={item} className="border border-slate-200 rounded-lg p-2.5">
                      <p className="text-sm font-medium text-slate-700 mb-1.5">{item}</p>
                      <div className="flex gap-1.5">
                        {STATUS_ITEM.map((s) => (
                          <button
                            key={s.key}
                            type="button"
                            onClick={() => setItem(item, 'status', s.key)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border ${
                              r.status === s.key ? s.cls : 'bg-white text-slate-500 border-slate-300'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                      {r.status === 'nok' && (
                        <input
                          value={r.obs || ''}
                          onChange={(e) => setItem(item, 'obs', e.target.value)}
                          placeholder="O que está errado? (opcional)"
                          className="w-full mt-2 border border-red-200 rounded-lg px-2 py-1.5 text-xs"
                        />
                      )}
                    </div>
                  )
                })}
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Observações gerais (opcional)</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={2}
                    placeholder="Algo a acrescentar..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {erro && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{erro}</p>}

        <button
          onClick={enviar}
          disabled={enviando}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm active:bg-green-700 disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'Abrir chamado'}
        </button>
      </div>

      {/* Histórico recente */}
      {historico.length > 0 && (
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Meus chamados recentes</h3>
          <div className="space-y-2">
            {historico.map((c) => (
              <div key={c.id} className="bg-white rounded-xl shadow p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {c.placa || '—'}
                    <span className="text-slate-400 font-normal"> · {rotuloTipo(c.tipo, c.checklist_nome)}</span>
                  </p>
                  <p className="text-xs text-slate-500">{new Date(c.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {c.tem_pendencia && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">pendência</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${c.status === 'resolvido' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {c.status === 'resolvido' ? 'resolvido' : 'aberto'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function rotuloTipo(tipo, checklistNome) {
  if (tipo === 'corretiva') return 'Corretiva'
  if (tipo === 'preventiva') return 'Preventiva'
  if (tipo === 'checklist') return checklistNome || 'Checklist'
  return tipo
}
