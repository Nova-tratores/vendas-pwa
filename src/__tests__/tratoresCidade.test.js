import { describe, it, expect } from 'vitest'
import { cidadeDoTrator, indexarClientesOmie, umaLetraDeDiferenca, limparCidadeDigitada, tituloQuestTrator } from '../lib/tratoresCidade'

const omie = indexarClientesOmie([
  { nome: 'LUIZ ROGERIO UGUCCIONI', cidade: 'CARLOPOLIS (PR)' },
  { nome: 'LAUDAIR JUVENCIO NATAL', cidade: 'CARLOPOLIS (PR)' },
  { nome: 'LUIZ GUSTAVO GOMES RIBEIRO 31143411870', cidade: 'PIRAJU (SP)' },
  { nome: 'JOSE DA SILVA', cidade: 'FARTURA (SP)' },
  { nome: 'JOSE DA SILVA', cidade: 'TAGUAI (SP)' },
  { nome: 'NOVA TRATORES', cidade: 'PIRAJU (SP)' },
])

describe('cidade do trator vendido', () => {
  it('cliente achado no Omie: vale a cidade do Omie, mesmo com 1 letra diferente no nome', () => {
    const c = cidadeDoTrator({ Cliente: 'LUIZ ROGERIO UGUCCIONE', Cidade: 'PIRAJU' }, omie)
    expect(c).toMatchObject({ nome: 'Carlópolis', uf: 'PR', origem: 'omie' })
    expect(cidadeDoTrator({ Cliente: 'LAUDAIR JUVENCIO NATAL', Cidade: 'RIBEIRÃO BONITO' }, omie).nome).toBe('Carlópolis')
  })

  it('nome do Omie com CPF no fim casa pelo começo', () => {
    expect(cidadeDoTrator({ Cliente: 'Luiz Gustavo Gomes Ribeiro', Cidade: 'FARTURA' }, omie)).toMatchObject({ uf: 'SP', origem: 'omie' })
  })

  it('não achou no Omie: fica a digitada, limpa', () => {
    expect(cidadeDoTrator({ Cliente: 'FULANO DE TAL', Cidade: 'AGUDOS FAZ SÃO DOMINGOS' }, omie)).toMatchObject({ nome: 'Agudos', origem: 'controle' })
  })

  it('homônimos em cidades diferentes: usa a do Omie que bate com a digitada, senão a digitada', () => {
    expect(cidadeDoTrator({ Cliente: 'JOSE DA SILVA', Cidade: 'Taguai' }, omie)).toMatchObject({ nome: 'Taguaí', origem: 'omie' })
    expect(cidadeDoTrator({ Cliente: 'JOSE DA SILVA', Cidade: 'PIRAJU' }, omie)).toMatchObject({ nome: 'Piraju', origem: 'controle' })
  })

  it('trator em nome da própria loja (estoque) não pega cidade do Omie', () => {
    expect(cidadeDoTrator({ Cliente: 'NOVA TRATORES', Cidade: 'ESTOQUE' }, omie).origem).toBe('controle')
  })

  it('auxiliares', () => {
    expect(umaLetraDeDiferenca('UGUCCIONE', 'UGUCCIONI')).toBe(true)
    expect(umaLetraDeDiferenca('ABC', 'AXY')).toBe(false)
    expect(limparCidadeDigitada('FARTURA/TAGUAI')).toBe('FARTURA')
    expect(tituloQuestTrator({ Modelo: '6075E CAB', Chassis: 'MDI07513VS0005756', Cliente: 'LUIZ' })).toBe('Visitar 6075E CAB …005756 — LUIZ')
  })
})
