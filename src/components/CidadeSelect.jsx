import { useState, useEffect } from 'react'
import { getAllRecords, saveRecord } from '../lib/db'

// Dropdown de cidade (lê do cache offline `cidades`); permite criar nova,
// que sincroniza e fica disponível pra todos os vendedores.
export default function CidadeSelect({ value, onChange }) {
  const [cidades, setCidades] = useState([])
  const [criando, setCriando] = useState(false)
  const [novo, setNovo] = useState({ nome: '', uf: '' })

  useEffect(() => { carregar() }, [])
  async function carregar() {
    const lista = (await getAllRecords('cidades')) || []
    lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    setCidades(lista)
  }

  async function criar() {
    const nome = novo.nome.trim()
    if (!nome) return
    await saveRecord('cidades', {
      nome,
      uf: novo.uf.trim().toUpperCase() || null,
      created_at: new Date().toISOString(),
    })
    await carregar()
    onChange(nome)
    setNovo({ nome: '', uf: '' })
    setCriando(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-slate-500">Cidade</label>
        <button type="button" onClick={() => setCriando(!criando)} className="text-xs text-blue-600 font-medium">
          {criando ? 'Cancelar' : '+ nova'}
        </button>
      </div>
      {criando ? (
        <div className="flex gap-2">
          <input
            value={novo.nome}
            onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
            placeholder="Nome da cidade *"
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={novo.uf}
            onChange={(e) => setNovo({ ...novo, uf: e.target.value })}
            placeholder="UF"
            maxLength={2}
            className="w-16 border border-slate-300 rounded-lg px-2 py-2 text-sm uppercase"
          />
          <button type="button" onClick={criar} className="px-3 bg-green-600 text-white rounded-lg text-sm font-medium">OK</button>
        </div>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Selecione a cidade</option>
          {value && !cidades.some((c) => c.nome === value) && <option value={value}>{value}</option>}
          {cidades.map((c) => (
            <option key={c.id} value={c.nome}>{c.nome}{c.uf ? ` - ${c.uf}` : ''}</option>
          ))}
        </select>
      )}
    </div>
  )
}
