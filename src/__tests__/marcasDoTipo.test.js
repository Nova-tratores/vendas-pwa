// Cadastro de máquina mostrava marcas sem relação com o tipo (ex.: marcas de
// trator ao cadastrar uma grade). O select agora filtra pelo tipo.
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/sync', () => ({ supabase: {} }))
const { marcasDoTipo } = await import('../lib/maquinaOpcoes')

const marcas = [
  { id: 1, nome: 'Mahindra' },
  { id: 2, nome: 'Baldan' },
  { id: 3, nome: 'John Deere' },
  { id: 4, nome: 'Jacto' },
]
const porTipo = [
  { tipo: 'Trator Novo', marca_id: 1 },
  { tipo: 'Trator Novo', marca_id: 3 },
  { tipo: 'Grade', marca_id: 2 },
  { tipo: 'Pulverizador', marca_id: 4 },
]

describe('marcasDoTipo', () => {
  it('só traz as marcas daquele tipo, na ordem das marcas', () => {
    expect(marcasDoTipo('Grade', porTipo, marcas)).toEqual(['Baldan'])
    expect(marcasDoTipo('Trator Novo', porTipo, marcas)).toEqual(['Mahindra', 'John Deere'])
  })

  it('tipo sem marca conhecida → null (mostra todas)', () => {
    expect(marcasDoTipo('Trincha', porTipo, marcas)).toBeNull()
  })
})
