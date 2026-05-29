import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getByIndex, saveRecord, getRecord, deleteRecord, registrarLog } from '../lib/db'
import PullToRefresh from '../components/PullToRefresh'
import ConfirmModal from '../components/ConfirmModal'

import { TIPOS_PRODUTO, MARCAS } from '../lib/constants'
const ESTADOS = ['otimo', 'bom', 'regular', 'critico']
const ESTADO_LABELS = { otimo: 'Ótimo', bom: 'Bom', regular: 'Regular', critico: 'Crítico' }
const ESTADO_COLORS = { otimo: 'bg-green-100 text-green-800', bom: 'bg-blue-100 text-blue-800', regular: 'bg-yellow-100 text-yellow-800', critico: 'bg-red-100 text-red-800' }

const EMPTY = {
  tipo: 'Trator Novo', marca: 'New Holland', modelo: '', tamanho: '', ano: '', numero_serie: '',
  horimetro: '', estado: 'bom', observacoes: '',
}

export default function Maquinas() {
  const { propriedadeId } = useParams()
  const navigate = useNavigate()
  const [maquinas, setMaquinas] = useState([])
  const [propriedade, setPropriedade] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => { carregar() }, [propriedadeId])

  async function carregar() {
    setMaquinas(await getByIndex('maquinas', 'propriedade_id', propriedadeId))
    setPropriedade(await getRecord('propriedades', propriedadeId))
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await saveRecord('maquinas', {
      propriedade_id: parseInt(propriedadeId),
      tipo: form.tipo,
      marca: form.marca,
      modelo: form.modelo,
      tamanho: form.tamanho || null,
      ano: form.ano ? parseInt(form.ano) : null,
      numero_serie: form.numero_serie,
      horimetro: form.horimetro ? parseInt(form.horimetro) : null,
      estado: form.estado,
      observacoes: form.observacoes,
      created_at: new Date().toISOString(),
    })
    await registrarLog('criar', 'maquinas', null, `Máquina: ${form.marca} ${form.modelo}`)
    setForm(EMPTY)
    setShowForm(false)
    carregar()
  }

  function abrirEdicao(m) {
    setEditTarget(m)
    setEditForm({
      tipo: m.tipo || 'Trator Novo',
      marca: m.marca || '',
      modelo: m.modelo || '',
      tamanho: m.tamanho || '',
      ano: m.ano != null ? String(m.ano) : '',
      numero_serie: m.numero_serie || '',
      horimetro: m.horimetro != null ? String(m.horimetro) : '',
      estado: m.estado || 'bom',
      observacoes: m.observacoes || '',
    })
  }

  async function handleSalvarEdicao() {
    if (!editTarget || !editForm) return

    const camposComparar = [
      ['tipo', editTarget.tipo],
      ['marca', editTarget.marca],
      ['modelo', editTarget.modelo],
      ['tamanho', editTarget.tamanho || ''],
      ['ano', editTarget.ano != null ? String(editTarget.ano) : ''],
      ['numero_serie', editTarget.numero_serie || ''],
      ['horimetro', editTarget.horimetro != null ? String(editTarget.horimetro) : ''],
      ['estado', editTarget.estado],
      ['observacoes', editTarget.observacoes || ''],
    ]
    const alteracoes = []
    for (const [campo, valorAntigo] of camposComparar) {
      const valorNovo = String(editForm[campo] ?? '')
      if (String(valorAntigo ?? '') !== valorNovo) {
        alteracoes.push(`${campo}: "${valorAntigo ?? ''}" → "${valorNovo}"`)
      }
    }

    await saveRecord('maquinas', {
      ...editTarget,
      tipo: editForm.tipo,
      marca: editForm.marca,
      modelo: editForm.modelo,
      tamanho: editForm.tamanho || null,
      ano: editForm.ano ? parseInt(editForm.ano) : null,
      numero_serie: editForm.numero_serie,
      horimetro: editForm.horimetro ? parseInt(editForm.horimetro) : null,
      estado: editForm.estado,
      observacoes: editForm.observacoes,
      status_sync: 'pending',
    })

    await registrarLog(
      'alterar',
      'maquinas',
      editTarget.id,
      alteracoes.length > 0 ? alteracoes.join(' · ') : 'sem alterações'
    )

    setEditTarget(null)
    setEditForm(null)
    carregar()
  }

  async function handleDelete() {
    if (deleteTarget) {
      await registrarLog('excluir', 'maquinas', deleteTarget.id, `Máquina: ${deleteTarget.marca} ${deleteTarget.modelo}`)
      await deleteRecord('maquinas', deleteTarget.id)
      setDeleteTarget(null)
      carregar()
    }
  }

  return (
    <PullToRefresh onRefresh={carregar}>
      <button onClick={() => navigate(-1)} className="text-blue-700 text-sm mb-2 active:text-blue-900">&larr; Voltar</button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">Máquinas</h2>
          {propriedade && <p className="text-sm text-slate-500">{propriedade.nome}</p>}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-blue-800"
        >
          {showForm ? 'Cancelar' : '+ Nova'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-4 space-y-3 animate-slide-up">
          <select name="tipo" value={form.tipo} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
            {TIPOS_PRODUTO.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="marca" value={form.marca} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
            {MARCAS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input name="modelo" value={form.modelo} onChange={handleChange} placeholder="Modelo" className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            <input name="tamanho" value={form.tamanho} onChange={handleChange} placeholder="Tamanho" className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="ano" value={form.ano} onChange={handleChange} placeholder="Ano" type="number" inputMode="numeric" className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            <input name="numero_serie" value={form.numero_serie} onChange={handleChange} placeholder="Nº Série" className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input name="horimetro" value={form.horimetro} onChange={handleChange} placeholder="Horímetro (h)" type="number" inputMode="numeric" className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
            <select name="estado" value={form.estado} onChange={handleChange} className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white">
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
              ))}
            </select>
          </div>
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm active:bg-green-700">Salvar Máquina</button>
        </form>
      )}

      {maquinas.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🚜</p>
          <p className="text-slate-400">Nenhuma máquina cadastrada</p>
          <button onClick={() => setShowForm(true)} className="text-blue-700 text-sm mt-2 font-medium">
            Cadastrar primeira máquina
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {maquinas.map((m, i) => (
            <div key={m.id} className="bg-white rounded-xl shadow p-4 animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium">{m.marca} {m.modelo}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${ESTADO_COLORS[m.estado]}`}>
                    {ESTADO_LABELS[m.estado]}
                  </span>
                  <button onClick={() => abrirEdicao(m)} className="text-slate-400 hover:text-blue-600 text-sm px-1">✎</button>
                  <button onClick={() => setDeleteTarget(m)} className="text-slate-300 hover:text-red-500 text-lg px-1">&times;</button>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {m.tipo}
                {m.tamanho ? ` · ${m.tamanho}` : ''}
                {m.ano ? ` · ${m.ano}` : ''}
                {m.horimetro ? ` · ${m.horimetro}h` : ''}
              </p>
              {m.numero_serie && <p className="text-xs text-slate-400 mt-1">S/N: {m.numero_serie}</p>}
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        show={!!deleteTarget}
        title="Excluir máquina"
        message={`Excluir "${deleteTarget?.marca} ${deleteTarget?.modelo}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {editTarget && editForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[85vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Editar Máquina</h3>
                <button onClick={() => { setEditTarget(null); setEditForm(null) }} className="text-slate-400 text-xl px-1">&times;</button>
              </div>
              <p className="text-xs text-slate-500">{editTarget.marca} {editTarget.modelo}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <select
                value={editForm.tipo}
                onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
              >
                {TIPOS_PRODUTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={editForm.marca}
                onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
              >
                {MARCAS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.modelo}
                  onChange={(e) => setEditForm({ ...editForm, modelo: e.target.value })}
                  placeholder="Modelo"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
                <input
                  value={editForm.tamanho}
                  onChange={(e) => setEditForm({ ...editForm, tamanho: e.target.value })}
                  placeholder="Tamanho"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.ano}
                  onChange={(e) => setEditForm({ ...editForm, ano: e.target.value })}
                  placeholder="Ano"
                  type="number"
                  inputMode="numeric"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
                <input
                  value={editForm.numero_serie}
                  onChange={(e) => setEditForm({ ...editForm, numero_serie: e.target.value })}
                  placeholder="Nº Série"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={editForm.horimetro}
                  onChange={(e) => setEditForm({ ...editForm, horimetro: e.target.value })}
                  placeholder="Horímetro (h)"
                  type="number"
                  inputMode="numeric"
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
                />
                <select
                  value={editForm.estado}
                  onChange={(e) => setEditForm({ ...editForm, estado: e.target.value })}
                  className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  {ESTADOS.map((e) => (
                    <option key={e} value={e}>{ESTADO_LABELS[e]}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={editForm.observacoes}
                onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                placeholder="Observações"
                rows={2}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
              />
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
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg font-medium text-sm active:bg-blue-800"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  )
}
