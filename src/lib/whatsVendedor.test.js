import { describe, it, expect } from 'vitest'
import { saudacao, foneWhats, textoWhats, nomeBonito } from './whatsVendedor'

describe('whatsVendedor', () => {
  it('saudação pela hora', () => {
    expect(saudacao(new Date(2026, 10, 13, 9))).toBe('Bom dia')
    expect(saudacao(new Date(2026, 10, 13, 14))).toBe('Boa tarde')
    expect(saudacao(new Date(2026, 10, 13, 19))).toBe('Boa noite')
  })
  it('telefone vira 55 + DDD', () => {
    expect(foneWhats('(43) 99644-4939')).toBe('5543996444939')
    expect(foneWhats('4133334444')).toBe('554133334444')
    expect(foneWhats('5543996444939')).toBe('5543996444939')
    expect(foneWhats('99644-4939')).toBe('')
    expect(foneWhats('')).toBe('')
  })
  it('texto pronto', () => {
    const agora = new Date(2026, 10, 13, 9)
    expect(textoWhats({ contato: 'JOSÉ CLAUDIO ', vendedor: 'MATHEUS PARMEZAN', agora }))
      .toBe('Bom dia, José! Aqui é Matheus Parmezan, vendedor da Nova Tratores.')
    expect(textoWhats({ contato: '', vendedor: 'MATHEUS PARMEZAN', agora }))
      .toBe('Bom dia! Aqui é Matheus Parmezan, vendedor da Nova Tratores.')
    expect(nomeBonito('MARIA DA SILVA')).toBe('Maria da Silva')
  })
})
