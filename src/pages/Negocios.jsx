import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getAllRecords, saveRecord, deleteRecord, registrarLog } from '../lib/db'
import { TIPOS_PRODUTO, MARCAS } from '../lib/constants'
import { STATUS_NEGOCIO, MOTIVOS_PERDA, isAberto, isPerdido, FORMAS_PAGAMENTO, TEMPERATURAS, tendenciaNegocio } from '../lib/funil'
import PullToRefresh from '../components/PullToRefresh'
import ConfirmModal from '../components/ConfirmModal'
import CidadeSelect from '../components/CidadeSelect'
import MaquinaSelect from '../components/MaquinaSelect'

const STATUS_FUNIL = STATUS_NEGOCIO
const STATUS_PERDIDO = 'fechamento_negativo'

// Classifica o negócio por prazo de fechamento — usado só para o selo "Atrasado"
// no card (o filtro de prazo foi removido por ser redundante/pouco preenchido).
function classificarHorizonte(negocio, hoje) {
  if (!negocio.data_fechamento_prevista) return 'sem_data'
  const prevista = new Date(negocio.data_fechamento_prevista)
  prevista.setHours(0, 0, 0, 0)
  const diffDias = Math.floor((prevista - hoje) / 86400000)
  if (diffDias < 0) {
    return isAberto(negocio.status) ? 'atrasado' : 'distante'
  }
  if (diffDias <= 30) return 'proximos_30'
  if (diffDias <= 90) return 'proximos_90'
  return 'distante'
}

export default function Negocios() {
  const navigate = useNavigate()
  const [negocios, setNegocios] = useState([])
  const [clientes, setClientes] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setNegocios(await getAllRecords('negocios'))
    setClientes(await getAllRecords('clientes'))
  }

  // Atualização rápida da temperatura pelo card. Guarda a anterior pra calcular
  // a tendência (avançando / estagnado / recuando).
  async function atualizarTemperatura(negocio, key) {
    if (negocio.temperatura === key) return
    await saveRecord('negocios', {
      ...negocio,
      temperatura: key,
      temperatura_anterior: negocio.temperatura || null,
      updated_at: new Date().toISOString(),
    })
    await registrarLog('alterar', 'negocios', negocio.id, `Temperatura: ${negocio.temperatura || '—'} → ${key}`)
    carregar()
  }

  async function handleDelete() {
    if (deleteTarget) {
      await registrarLog('excluir', 'negocios', deleteTarget.id, `Negócio: R$ ${deleteTarget.valor || '0'}`)
      await deleteRecord('negocios', deleteTarget.id)
      setDeleteTarget(null)
      carregar()
    }
  }

  function parseMotivo(motivo_perda) {
    if (!motivo_perda) return { categoria: '', detalhes: {} }
    try {
      return JSON.parse(motivo_perda)
    } catch {
      return { categoria: 'outro', detalhes: { descricao: motivo_perda } }
    }
  }

  function abrirEdicao(negocio) {
    setEditTarget(negocio)
    const motivo = parseMotivo(negocio.motivo_perda)
    setEditForm({
      status: negocio.status,
      valor: negocio.valor || '',
      notas: negocio.notas || '',
      produtos: negocio.produtos || [],
      data_fechamento_prevista: negocio.data_fechamento_prevista || '',
      motivo_categoria: motivo.categoria || '',
      motivo_detalhes: motivo.detalhes || {},
      temperatura: negocio.temperatura || '',
      cidade: negocio.cidade || '',
      maquina_familia: negocio.maquina_familia || '',
      maquina_marca: negocio.maquina_marca || '',
      maquina_modelo: negocio.maquina_modelo || '',
      proposta: negocio.proposta_dados || {},
    })
  }

  // Toda mudança de etapa abre o modal, pois a cada movimentação o vendedor
  // precisa (obrigatoriamente) reavaliar a temperatura do negócio.
  function iniciarMudanca(negocio, novoStatus) {
    abrirEdicao(negocio)
    setEditForm((f) => ({ ...f, status: novoStatus }))
  }

  async function handleSalvarEdicao() {
    if (!editTarget || !editForm) return
    // Temperatura é obrigatória a cada movimentação do negócio.
    if (!editForm.temperatura) {
      alert('Marque a temperatura do negócio (termômetro)')
      return
    }

    const alteracoes = []
    if (editForm.status !== editTarget.status) alteracoes.push(`status: ${editTarget.status} → ${editForm.status}`)
    if (editForm.temperatura !== (editTarget.temperatura || '')) alteracoes.push(`temperatura: ${editTarget.temperatura || '—'} → ${editForm.temperatura}`)
    if (String(editForm.valor) !== String(editTarget.valor || '')) alteracoes.push(`valor: R$ ${editTarget.valor || 0} → R$ ${editForm.valor || 0}`)
    if (editForm.notas !== (editTarget.notas || '')) alteracoes.push('notas alteradas')
    if (editForm.data_fechamento_prevista !== (editTarget.data_fechamento_prevista || '')) alteracoes.push('previsão alterada')

    // Montar motivo de perda estruturado
    let motivo_perda = null
    if (editForm.status === STATUS_PERDIDO && editForm.motivo_categoria) {
      motivo_perda = JSON.stringify({
        categoria: editForm.motivo_categoria,
        detalhes: editForm.motivo_detalhes,
      })
      const motivoLabel = MOTIVOS_PERDA.find((m) => m.key === editForm.motivo_categoria)?.label || editForm.motivo_categoria
      alteracoes.push(`motivo perda: ${motivoLabel}`)
    }

    // Solicitação da Proposta: carimba quando entrou nessa etapa (1ª vez)
    let proposta_solicitada_em = editTarget.proposta_solicitada_em || null
    if (editForm.status === 'solicitacao_proposta' && !proposta_solicitada_em) {
      proposta_solicitada_em = new Date().toISOString()
      alteracoes.push('proposta solicitada')
    }

    await saveRecord('negocios', {
      ...editTarget,
      status: editForm.status,
      valor: editForm.valor ? parseFloat(editForm.valor) : null,
      notas: editForm.notas,
      produtos: editForm.produtos || [],
      data_fechamento_prevista: editForm.data_fechamento_prevista || null,
      motivo_perda,
      temperatura: editForm.temperatura,
      temperatura_anterior: editForm.temperatura !== editTarget.temperatura
        ? (editTarget.temperatura || null)
        : (editTarget.temperatura_anterior || null),
      cidade: editForm.cidade || null,
      maquina_familia: editForm.maquina_familia || null,
      maquina_marca: editForm.maquina_marca || null,
      maquina_modelo: editForm.maquina_modelo || null,
      proposta_dados: editForm.proposta && Object.keys(editForm.proposta).length ? editForm.proposta : null,
      proposta_solicitada_em,
      updated_at: new Date().toISOString(),
      status_sync: 'pending',
    })

    await registrarLog('alterar', 'negocios', editTarget.id, `Edição: ${alteracoes.join(', ') || 'sem alterações'}`)
    setEditTarget(null)
    setEditForm(null)
    carregar()
  }

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const negociosComHorizonte = negocios.map((n) => ({ ...n, _horizonte: classificarHorizonte(n, hoje) }))

  const negociosFiltrados = negociosComHorizonte
    .filter((n) => filtroStatus === 'todos' || n.status === filtroStatus)

  const totalValor = negocios
    .filter((n) => !isPerdido(n.status))
    .reduce((acc, n) => acc + (n.valor || 0), 0)

  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c.nome]))

  return (
    <PullToRefresh onRefresh={carregar}>
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold">Negócios</h2>
        <p className="text-sm text-slate-500">Pipeline: R$ {totalValor.toLocaleString('pt-BR')}</p>
        <p className="text-xs text-slate-400 mt-1">Novos negócios são criados ao registrar uma visita.</p>
      </div>

      {/* Filtro por etapa do funil */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-3 items-center">
        <button
          onClick={() => setFiltroStatus('todos')}
          className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${filtroStatus === 'todos' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
        >
          Todos ({negocios.length})
        </button>
        {STATUS_FUNIL.map((s) => {
          const count = negocios.filter((n) => n.status === s.key).length
          return (
            <button
              key={s.key}
              onClick={() => setFiltroStatus(s.key)}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${filtroStatus === s.key ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300'}`}
            >
              {s.label} ({count})
            </button>
          )
        })}
      </div>

      {negociosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-slate-400">{filtroStatus === 'todos' ? 'Nenhum negócio cadastrado' : 'Nenhum negócio neste filtro'}</p>
          {filtroStatus === 'todos' && (
            <Link to="/visitas" className="text-blue-700 text-sm mt-2 font-medium inline-block">
              Registrar uma visita →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {negociosFiltrados.map((n, i) => {
            const statusInfo = STATUS_FUNIL.find((s) => s.key === n.status)
            return (
              <div key={n.id} className="bg-white rounded-xl shadow p-4 animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium text-sm">{clienteMap[n.cliente_id] || '...'}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo?.color}`}>
                      {statusInfo?.label}
                    </span>
                    <button onClick={() => abrirEdicao(n)} className="text-slate-400 hover:text-blue-600 text-sm px-1">✎</button>
                    <button onClick={() => setDeleteTarget(n)} className="text-slate-300 hover:text-red-500 text-lg px-1">&times;</button>
                  </div>
                </div>
                {n.valor && <p className="text-lg font-bold text-green-700">R$ {n.valor.toLocaleString('pt-BR')}</p>}
                {(n.maquina_familia || n.cidade) && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[n.maquina_familia, n.maquina_marca, n.maquina_modelo].filter(Boolean).join(' · ')}
                    {n.cidade ? ` — ${n.cidade}` : ''}
                  </p>
                )}
                {n.produtos?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {n.produtos.map((p, idx) => {
                      const label = typeof p === 'string' ? p : `${p.tipo} · ${p.marca}${p.modelo ? ' ' + p.modelo : ''}`
                      return <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{label}</span>
                    })}
                  </div>
                )}
                {n.notas && <p className="text-sm text-slate-600 mt-1">{n.notas}</p>}
                {n.data_fechamento_prevista && (
                  <p className={`text-xs mt-1 flex items-center gap-1.5 ${n._horizonte === 'atrasado' ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
                    Previsão: {new Date(n.data_fechamento_prevista).toLocaleDateString('pt-BR')}
                    {n._horizonte === 'atrasado' && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-semibold">Atrasado</span>
                    )}
                  </p>
                )}
                {n.motivo_perda && (() => {
                  const m = parseMotivo(n.motivo_perda)
                  const motivoLabel = MOTIVOS_PERDA.find((x) => x.key === m.categoria)?.label || m.categoria
                  const detalhesStr = Object.entries(m.detalhes || {})
                    .filter(([, v]) => v)
                    .map(([, v]) => v)
                    .join(' · ')
                  return (
                    <div className="mt-1">
                      <p className="text-xs text-red-600 font-medium">Motivo: {motivoLabel}</p>
                      {detalhesStr && <p className="text-xs text-red-400">{detalhesStr}</p>}
                    </div>
                  )
                })()}

                {/* Termômetro + tendência (negócios em andamento) */}
                {isAberto(n.status) && (
                  <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm" aria-hidden="true">🌡️</span>
                    {TEMPERATURAS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => atualizarTemperatura(n, t.key)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${n.temperatura === t.key ? t.sel : t.off}`}
                      >
                        {t.label}
                      </button>
                    ))}
                    {(() => {
                      const tr = tendenciaNegocio(n.temperatura, n.temperatura_anterior)
                      return tr ? <span className={`text-[11px] font-bold ml-auto ${tr.cor}`}>{tr.icon} {tr.label}</span> : null
                    })()}
                  </div>
                )}

                {/* Registrar visita já vinculada a este negócio */}
                {isAberto(n.status) && (
                  <button
                    type="button"
                    onClick={() => navigate('/visitas', { state: { negocioId: n.id, propriedadeId: n.propriedade_id, clienteId: n.cliente_id } })}
                    className="mt-2 w-full py-2 rounded-lg text-sm font-medium border border-blue-200 bg-blue-50 text-blue-700 active:bg-blue-100"
                  >
                    📍 Registrar visita
                  </button>
                )}

                {/* Mudança rápida de etapa (select, pois são 11 etapas) */}
                {!isPerdido(n.status) && (
                  <div className="mt-3">
                    <select
                      value=""
                      onChange={(e) => { if (e.target.value) iniciarMudanca(n, e.target.value) }}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white text-slate-600"
                    >
                      <option value="">Mudar etapa…</option>
                      {STATUS_FUNIL.filter((s) => s.key !== n.status).map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        show={!!deleteTarget}
        title="Excluir negócio"
        message={`Excluir este negócio${deleteTarget?.valor ? ` de R$ ${deleteTarget.valor.toLocaleString('pt-BR')}` : ''}? Essa ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal de edição */}
      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Editar Negócio</h3>
                <button onClick={() => { setEditTarget(null); setEditForm(null) }} className="text-slate-400 text-xl px-1">&times;</button>
              </div>
              <p className="text-xs text-slate-500">{clienteMap[editTarget.cliente_id] || 'Cliente'}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Status */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                >
                  {STATUS_FUNIL.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>

              {/* Temperatura — obrigatória a cada movimentação */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Temperatura do negócio <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  {TEMPERATURAS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, temperatura: t.key })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border ${editForm.temperatura === t.key ? t.sel : t.off}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={editForm.valor}
                  onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })}
                  placeholder="0,00"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Previsão de fechamento */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Previsão de fechamento</label>
                <input
                  type="date"
                  value={editForm.data_fechamento_prevista}
                  onChange={(e) => setEditForm({ ...editForm, data_fechamento_prevista: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Cidade */}
              <CidadeSelect
                value={editForm.cidade}
                onChange={(cidade) => setEditForm({ ...editForm, cidade })}
              />

              {/* Máquina (cascata família → marca → modelo) */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Máquina</label>
                <MaquinaSelect
                  familia={editForm.maquina_familia}
                  marca={editForm.maquina_marca}
                  modelo={editForm.maquina_modelo}
                  onChange={(campos) => setEditForm({ ...editForm, ...campos })}
                />
              </div>

              {/* Solicitação da Proposta: campos pro responsável cotar */}
              {editForm.status === 'solicitacao_proposta' && (
                <PropostaEditor
                  dados={editForm.proposta || {}}
                  onChange={(proposta) => setEditForm({ ...editForm, proposta })}
                />
              )}

              {/* Produtos */}
              <ProdutosEditor
                produtos={editForm.produtos || []}
                onChange={(prods) => setEditForm({ ...editForm, produtos: prods })}
              />

              {/* Notas */}
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <textarea
                  value={editForm.notas}
                  onChange={(e) => setEditForm({ ...editForm, notas: e.target.value })}
                  placeholder="Notas sobre o negócio"
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {/* Motivo de perda (se status for Fechamento Negativo) */}
              {editForm.status === STATUS_PERDIDO && (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-500 mb-1">Motivo da perda</label>
                  <select
                    value={editForm.motivo_categoria}
                    onChange={(e) => setEditForm({ ...editForm, motivo_categoria: e.target.value, motivo_detalhes: {} })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Selecione o motivo *</option>
                    {MOTIVOS_PERDA.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>

                  {/* Sub-campos dinâmicos */}
                  {editForm.motivo_categoria && (() => {
                    const motivo = MOTIVOS_PERDA.find((m) => m.key === editForm.motivo_categoria)
                    if (!motivo) return null
                    return (
                      <div className="bg-red-50 rounded-lg p-3 space-y-2 animate-slide-up">
                        <p className="text-xs font-medium text-red-700">Detalhes - {motivo.label}</p>
                        {motivo.campos.map((campo) => (
                          <div key={campo.key}>
                            <label className="block text-[10px] text-red-500 mb-0.5">{campo.label}</label>
                            <input
                              type={campo.tipo === 'number' ? 'number' : campo.tipo === 'date' ? 'date' : 'text'}
                              inputMode={campo.tipo === 'number' ? 'decimal' : undefined}
                              value={editForm.motivo_detalhes[campo.key] || ''}
                              onChange={(e) => setEditForm({
                                ...editForm,
                                motivo_detalhes: { ...editForm.motivo_detalhes, [campo.key]: e.target.value },
                              })}
                              className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => { setEditTarget(null); setEditForm(null) }}
                className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={!editForm.temperatura}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800 disabled:opacity-40"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}

// Campos da Solicitação da Proposta (vão pro responsável cotar/montar a proposta).
function PropostaEditor({ dados, onChange }) {
  const set = (campo, valor) => onChange({ ...dados, [campo]: valor })
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-2 animate-slide-up">
      <p className="text-xs font-bold text-indigo-800">Solicitação da Proposta</p>
      <div>
        <label className="block text-[10px] text-indigo-600 mb-0.5">Valor pretendido / faixa (R$)</label>
        <input type="number" step="0.01" inputMode="decimal" value={dados.valor_pretendido || ''}
          onChange={(e) => set('valor_pretendido', e.target.value)}
          className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" />
      </div>
      <div>
        <label className="block text-[10px] text-indigo-600 mb-0.5">Forma de pagamento</label>
        <select value={dados.forma_pagamento || ''} onChange={(e) => set('forma_pagamento', e.target.value)}
          className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Selecione</option>
          {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-indigo-600 mb-0.5">Entrada (R$)</label>
          <input type="number" step="0.01" inputMode="decimal" value={dados.entrada || ''}
            onChange={(e) => set('entrada', e.target.value)}
            className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" />
        </div>
        <div>
          <label className="block text-[10px] text-indigo-600 mb-0.5">Prazo / parcelas</label>
          <input value={dados.prazo || ''} onChange={(e) => set('prazo', e.target.value)}
            placeholder="ex.: 60x" className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-indigo-800">
        <input type="checkbox" checked={!!dados.troca_tem} onChange={(e) => set('troca_tem', e.target.checked)} className="rounded" />
        Tem máquina na troca
      </label>
      {dados.troca_tem && (
        <div className="grid grid-cols-2 gap-2">
          <input value={dados.troca_descricao || ''} onChange={(e) => set('troca_descricao', e.target.value)}
            placeholder="Marca/modelo/ano/horas" className="border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" />
          <input type="number" step="0.01" inputMode="decimal" value={dados.troca_valor || ''}
            onChange={(e) => set('troca_valor', e.target.value)}
            placeholder="Valor estimado (R$)" className="border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white" />
        </div>
      )}
    </div>
  )
}

function ProdutosEditor({ produtos, onChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [novo, setNovo] = useState({ tipo: '', marca: '', modelo: '' })

  function addProduto() {
    if (!novo.tipo) return
    onChange([...produtos, { ...novo }])
    setNovo({ tipo: '', marca: '', modelo: '' })
    setShowAdd(false)
  }

  function removeProduto(idx) {
    onChange(produtos.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-500">Produtos ({produtos.length})</p>
        <button type="button" onClick={() => setShowAdd(!showAdd)} className="text-xs text-blue-600 font-medium">
          {showAdd ? 'Cancelar' : '+ Adicionar'}
        </button>
      </div>

      {/* Formulário adicionar */}
      {showAdd && (
        <div className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2 animate-slide-up">
          <select
            value={novo.tipo}
            onChange={(e) => setNovo({ ...novo, tipo: e.target.value })}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">Selecione o tipo *</option>
            {TIPOS_PRODUTO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {novo.tipo && (
            <>
              <select
                value={novo.marca}
                onChange={(e) => setNovo({ ...novo, marca: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
              >
                <option value="">Marca (opcional)</option>
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input
                value={novo.modelo}
                onChange={(e) => setNovo({ ...novo, modelo: e.target.value })}
                placeholder="Modelo (opcional)"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={addProduto}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium"
              >
                Adicionar Produto
              </button>
            </>
          )}
        </div>
      )}

      {/* Lista de produtos adicionados */}
      {produtos.length > 0 && (
        <div className="space-y-1">
          {produtos.map((p, idx) => {
            const label = typeof p === 'string' ? p : `${p.tipo}${p.marca ? ' · ' + p.marca : ''}${p.modelo ? ' ' + p.modelo : ''}`
            return (
              <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-800">{label}</p>
                <button type="button" onClick={() => removeProduto(idx)} className="text-blue-400 hover:text-red-500 text-sm px-1">&times;</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
