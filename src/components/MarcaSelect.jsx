import { useState } from 'react'
import { marcasDoTipo } from '../lib/maquinaOpcoes'

const OUTRA = '__outra__'

// Select de marca filtrado pelo tipo da máquina. "Outra marca…" libera a lista
// completa (cliente pode ter marca rara/concorrente fora do Omie).
export default function MarcaSelect({ tipo, value, onChange, marcas, porTipo, fallback = [], required, className }) {
  const [todas, setTodas] = useState(false)
  const nomesTodas = marcas.length ? marcas.map((m) => m.nome) : fallback
  const doTipo = marcas.length ? marcasDoTipo(tipo, porTipo, marcas) : null
  const filtrando = !todas && !!doTipo

  let opcoes = filtrando ? doTipo : nomesTodas
  if (value && !opcoes.includes(value)) opcoes = [value, ...opcoes]

  return (
    <select
      value={value}
      onChange={(e) => (e.target.value === OUTRA ? setTodas(true) : onChange(e.target.value))}
      required={required}
      className={className}
    >
      {!value && <option value="">Marca</option>}
      {opcoes.map((m) => <option key={m} value={m}>{m}</option>)}
      {filtrando && <option value={OUTRA}>Outra marca…</option>}
    </select>
  )
}
