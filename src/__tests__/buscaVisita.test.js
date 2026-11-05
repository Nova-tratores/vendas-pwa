import { describe, it, expect } from 'vitest'
import { passaBusca } from '../lib/buscaVisita'

const visita = {
  cliente_nome: null,
  propriedade_nome: 'MARCO ANTONIO PAIVA',
  pessoas: [{ nome: 'Allan ' }],
  vendedor_nome: 'MATHEUS PARMEZAN',
  resumo: 'Conversei sobre o 6075E',
}

describe('passaBusca', () => {
  it('sem termo passa tudo', () => {
    expect(passaBusca(visita, '')).toBe(true)
    expect(passaBusca(visita, '   ')).toBe(true)
  })
  it('acha pelo cliente/propriedade sem acento e sem maiúscula', () => {
    expect(passaBusca(visita, 'paiva')).toBe(true)
    expect(passaBusca(visita, 'Marco Antônio')).toBe(true)
  })
  it('várias palavras: todas precisam aparecer', () => {
    expect(passaBusca(visita, 'marco paiva')).toBe(true)
    expect(passaBusca(visita, 'marco fernandes')).toBe(false)
  })
  it('acha pelo contato, vendedor e resumo', () => {
    expect(passaBusca(visita, 'allan')).toBe(true)
    expect(passaBusca(visita, 'matheus')).toBe(true)
    expect(passaBusca(visita, '6075e')).toBe(true)
  })
  it('palavras em campos diferentes também valem', () => {
    expect(passaBusca(visita, 'allan paiva')).toBe(true)
  })
  it('visita sem pessoas não quebra', () => {
    expect(passaBusca({ propriedade_nome: 'Sítio Nogueira' }, 'nogueira')).toBe(true)
  })
})
