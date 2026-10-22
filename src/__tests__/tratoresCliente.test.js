// Tratores vendidos de um cliente: casamento por nome do dono e cidade.
import { describe, it, expect } from 'vitest'
import { mesmoDono, tratoresDoCliente, cidadeDoTrator, ultimaPorChassi } from '../lib/tratoresCliente'

const tratores = [
  { Chassis: 'A1', Modelo: '6075', Cliente: 'OLINTO RODRIGUES DE ARRUDA', Cidade: 'AGUDOS FAZ SÃO DOMINGOS', Entrega: '28/02/2019' },
  { Chassis: 'B2', Modelo: '4530', Cliente: 'JOSÉ CARLOS RIBEIRO E OUTROS', Cidade: 'PIRAJU', Entrega: '01/03/2021' },
  { Chassis: 'C3', Modelo: '4530', Cliente: 'JOSE CARLOS SILVA', Cidade: 'FARTURA', Entrega: '01/03/2021' },
]

describe('tratores do cliente', () => {
  it('casa pelo nome com 2+ palavras em comum, sem acento e sem "de/e/outros"', () => {
    expect(mesmoDono('OLINTO RODRIGUES DE ARRUDA', 'Olinto Arruda')).toBe(true)
    expect(mesmoDono('JOSÉ CARLOS RIBEIRO E OUTROS', 'Jose Carlos Ribeiro')).toBe(true)
    expect(mesmoDono('JOSE CARLOS SILVA', 'Jose Pereira')).toBe(false)
    // nomes comuns não bastam: o último sobrenome tem que bater
    expect(mesmoDono('ADRIANO SILVA LEME', 'ADRIANO SILVA NASCIMENTO')).toBe(false)
    expect(mesmoDono('ANTONIO MARCOS R DE ALMEIDA', 'MARCOS ANTONIO FERNANDES')).toBe(false)
  })
  it('a cidade separa homônimos; trator sem cidade continua aparecendo', () => {
    expect(tratoresDoCliente(tratores, { nomes: ['Jose Carlos Ribeiro'], cidade: 'Piraju' }).map((t) => t.Chassis)).toEqual(['B2'])
    expect(tratoresDoCliente(tratores, { nomes: ['Olinto Rodrigues'], cidade: 'Agudos' }).map((t) => t.Chassis)).toEqual(['A1'])
    expect(tratoresDoCliente([{ ...tratores[2], Cidade: '' }], { nomes: ['Jose Carlos Silva'], cidade: 'Piraju' }).length).toBe(1)
  })
  it('cidade do trator sem a fazenda', () => {
    expect(cidadeDoTrator('AGUDOS FAZ SÃO DOMINGOS')).toBe('AGUDOS')
  })
  it('última confirmação por chassi', () => {
    const m = ultimaPorChassi([
      { chassis: 'A1', resposta: 'nao_esta', confirmado_em: '2026-10-01' },
      { chassis: 'A1', resposta: 'aqui', confirmado_em: '2026-10-20' },
    ])
    expect(m.get('A1').resposta).toBe('aqui')
  })
})
