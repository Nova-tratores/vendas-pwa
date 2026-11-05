import { describe, it, expect } from 'vitest'
import { contatoRepetido } from '../lib/contatoRepetido'

const pessoas = [
  { id: 1, nome: 'Marco Antônio Paiva ' },
  { id: 2, nome: 'Allan ' },
  { id: 3, nome: 'Zé' },
]

describe('contato repetido no cliente', () => {
  it('nome igual (acento, maiúscula e espaço sobrando não contam) = o mesmo contato', () => {
    expect(contatoRepetido('allan', pessoas)).toEqual({ tipo: 'igual', pessoa: pessoas[1] })
    expect(contatoRepetido('  MARCO  antonio paiva', pessoas)).toEqual({ tipo: 'igual', pessoa: pessoas[0] })
  })
  it('mesmo primeiro nome = pergunta', () => {
    expect(contatoRepetido('Marco', pessoas)).toEqual({ tipo: 'parecido', pessoa: pessoas[0] })
    expect(contatoRepetido('Allan Souza', pessoas)).toEqual({ tipo: 'parecido', pessoa: pessoas[1] })
  })
  it('nome diferente ou primeiro nome curto = cria normal', () => {
    expect(contatoRepetido('Valter', pessoas)).toBeNull()
    expect(contatoRepetido('Zé Carlos', pessoas)).toBeNull()
    expect(contatoRepetido('', pessoas)).toBeNull()
    expect(contatoRepetido('Allan', [])).toBeNull()
  })
})
