// Cidade oficial a partir das grafias do cadastro (caso real: Matheus marcou
// 10 "cidades" que eram 3).
import { describe, it, expect } from 'vitest'
import { cidadeCanonica, agruparCidades, limparCidade } from '../lib/cidadesCanon'

describe('cidade oficial', () => {
  it('as 10 grafias do Matheus viram 3 municípios', () => {
    const grafias = ['Carloplolis', 'Carlopolis', 'CARLOPOLIS (PR)', 'TAGUAI (SP)', 'Taguaí', 'Taguai', 'Fartura', 'FARTURA (SP)', 'Fartura/B Guaiuvira', 'Carlipolis']
    const g = agruparCidades(grafias.map((cidade) => ({ cidade, total: 1 })))
    expect(g.map((x) => `${x.nome}/${x.uf}:${x.total}`)).toEqual(['Carlópolis/PR:4', 'Fartura/SP:3', 'Taguaí/SP:3'])
  })
  it('limpa UF, bairro e abreviações', () => {
    expect(limparCidade('Sta. Cruz do Rio Pardo - SP')).toEqual({ nome: 'SANTA CRUZ DO RIO PARDO', uf: 'SP' })
    expect(cidadeCanonica('PIRAJU/SP')).toMatchObject({ nome: 'Piraju', uf: 'SP', oficial: true })
  })
  it('texto que não é município fica no próprio grupo', () => {
    expect(cidadeCanonica('ZONA RURAL XYZ')).toMatchObject({ oficial: false, nome: 'ZONA RURAL XYZ' })
  })
})

describe('estado informado manda', () => {
  it('não troca cidade de outro estado por parecida daqui', () => {
    expect(cidadeCanonica('CANOAS (RS)')).toMatchObject({ oficial: false, nome: 'CANOAS', uf: 'RS' })
    expect(cidadeCanonica('PORTO ALEGRE (RS)').oficial).toBe(false)
    expect(cidadeCanonica('ITAIUBA (SP)').oficial).toBe(false)
  })
  it('erro de digitação sem estado continua sendo corrigido', () => {
    expect(cidadeCanonica('Piraj')).toMatchObject({ nome: 'Piraju', uf: 'SP' })
  })
})
