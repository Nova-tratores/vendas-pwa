import { useState, useEffect } from 'react'
import { getAllRecords, saveRecord } from '../lib/db'

// Cascata família → marca → modelo. Família vem do ERP (cache `cat_maquinas`);
// marca/modelo combinam ERP + opções criadas pelo vendedor (`opcoes_maquina`).
// Família não é criável; marca e modelo sim (sincronizam e ficam pra todos).
export default function MaquinaSelect({ familia, marca, modelo, onChange }) {
  const [opcoes, setOpcoes] = useState([])
  const [criando, setCriando] = useState(null) // 'marca' | 'modelo'
  const [novo, setNovo] = useState('')

  useEffect(() => { carregar() }, [])
  async function carregar() {
    const [cat, extra] = await Promise.all([
      getAllRecords('cat_maquinas'),
      getAllRecords('opcoes_maquina'),
    ])
    setOpcoes([...(cat || []), ...(extra || [])])
  }

  // Dedupe case-insensitive (o ERP traz "mahindra/Mahindra/MAHINDRA") mantendo o 1º texto.
  const uniqCI = (arr) => {
    const seen = new Map()
    for (const v of arr) { const t = (v || '').trim(); const k = t.toLowerCase(); if (t && !seen.has(k)) seen.set(k, t) }
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }
  const eq = (a, b) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase()
  const familias = uniqCI(opcoes.map((o) => o.familia_nome))
  const marcas = uniqCI(opcoes.filter((o) => eq(o.familia_nome, familia)).map((o) => o.marca))
  const modelos = uniqCI(opcoes.filter((o) => eq(o.familia_nome, familia) && eq(o.marca, marca)).map((o) => o.modelo))

  const setFamilia = (f) => onChange({ maquina_familia: f, maquina_marca: '', maquina_modelo: '' })
  const setMarca = (m) => onChange({ maquina_familia: familia, maquina_marca: m, maquina_modelo: '' })
  const setModelo = (m) => onChange({ maquina_familia: familia, maquina_marca: marca, maquina_modelo: m })

  async function criar() {
    const val = novo.trim()
    if (!val) { setCriando(null); return }
    if (criando === 'marca') {
      await saveRecord('opcoes_maquina', { familia_nome: familia, marca: val, modelo: null, created_at: new Date().toISOString() })
      await carregar(); setMarca(val)
    } else if (criando === 'modelo') {
      await saveRecord('opcoes_maquina', { familia_nome: familia, marca, modelo: val, created_at: new Date().toISOString() })
      await carregar(); setModelo(val)
    }
    setNovo(''); setCriando(null)
  }

  const ehMahindra = (marca || '').toLowerCase().includes('mahindra')

  return (
    <div className="space-y-2">
      {/* Família (não criável) */}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Família da máquina</label>
        <select
          value={familia || ''}
          onChange={(e) => setFamilia(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione a família</option>
          {familia && !familias.includes(familia) && <option value={familia}>{familia}</option>}
          {familias.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Marca */}
      {familia && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500">Marca</label>
            <button type="button" onClick={() => { setCriando(criando === 'marca' ? null : 'marca'); setNovo('') }} className="text-xs text-blue-600 font-medium">
              {criando === 'marca' ? 'Cancelar' : '+ nova'}
            </button>
          </div>
          {criando === 'marca' ? (
            <div className="flex gap-2">
              <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Nova marca *" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={criar} className="px-3 bg-green-600 text-white rounded-lg text-sm font-medium">OK</button>
            </div>
          ) : (
            <select value={marca || ''} onChange={(e) => setMarca(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Selecione a marca</option>
              {marca && !marcas.includes(marca) && <option value={marca}>{marca}</option>}
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Modelo */}
      {familia && marca && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-500">Modelo</label>
            <button type="button" onClick={() => { setCriando(criando === 'modelo' ? null : 'modelo'); setNovo('') }} className="text-xs text-blue-600 font-medium">
              {criando === 'modelo' ? 'Cancelar' : '+ novo'}
            </button>
          </div>
          {criando === 'modelo' ? (
            <div className="flex gap-2">
              <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo modelo *" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
              <button type="button" onClick={criar} className="px-3 bg-green-600 text-white rounded-lg text-sm font-medium">OK</button>
            </div>
          ) : (
            <select value={modelo || ''} onChange={(e) => setModelo(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Selecione o modelo</option>
              {modelo && !modelos.includes(modelo) && <option value={modelo}>{modelo}</option>}
              {modelos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          )}
        </div>
      )}

      {ehMahindra && (
        <a href="/catalogo" className="inline-block text-xs text-blue-700 font-medium">🚜 Ver no catálogo Mahindra →</a>
      )}
    </div>
  )
}
