// Cliente repetido Nova × Castro e busca que casava pelo endereço (caso do Márcio, 28/10/2026).
import { describe, it, expect } from 'vitest'
import { unirCopias, ondeCasou } from '../lib/propriedadesUnicas'

describe('uma propriedade por CPF/CNPJ', () => {
  it('junta as cópias e fica com a já trabalhada', () => {
    const props = [
      { id: 1322, nome_fantasia: 'PEROTO', cnpj_cpf: '12.345.678/0001-90' },
      { id: 10814, nome_fantasia: 'PEROTO', cnpj_cpf: '12345678000190' },
      { id: 50, nome_fantasia: 'SEM DOC', cnpj_cpf: '' },
      { id: 51, nome_fantasia: 'SEM DOC', cnpj_cpf: '' },
    ]
    const r = unirCopias(props, (p) => (p.id === 10814 ? 2 : 0))
    expect(r.map((p) => p.id)).toEqual([10814, 50, 51])
    expect(r[0]._copias).toEqual([1322])
  })
  it('sem uso, fica a mais preenchida e depois o menor id', () => {
    const r = unirCopias([
      { id: 9, cnpj_cpf: '11122233344' },
      { id: 3, cnpj_cpf: '111.222.333-44' },
      { id: 7, cnpj_cpf: '11122233344', culturas: ['Café'] },
    ])
    expect(r.map((p) => p.id)).toEqual([7])
    expect(r[0]._copias.sort()).toEqual([3, 9])
  })
})

describe('onde a busca casou', () => {
  const p = { nome_fantasia: 'PEDREIRA PIRAJU', cidade: 'PIRAJU (SP)', endereco: 'ESTRADA VELHA PIRAJU FARTURA KM 07' }
  it('endereço fica marcado como endereço', () => {
    expect(ondeCasou(p, 'fartura')).toBe('endereco')
    expect(ondeCasou(p, 'piraju')).toBe('nome')
    expect(ondeCasou({ ...p, nome_fantasia: 'X' }, 'piraju')).toBe('cidade')
    expect(ondeCasou(p, 'avare')).toBeNull()
  })
})
