// Checklist mensal completo do carro do vendedor (mesmo do técnico, 20 itens com foto).
import { describe, it, expect } from 'vitest'
import { mapaSalvos, primeiroPendente, erroDoItem, kmValido, resumoItens, concluido } from '../lib/checklistVeiculoRegras'

const items = [{ key: 'crlv' }, { key: 'pneu_de' }, { key: 'estepe' }]

describe('checklist mensal completo', () => {
  it('retoma no primeiro item sem resposta', () => {
    const salvos = mapaSalvos([{ item_key: 'crlv', resposta: 'ok' }])
    expect(primeiroPendente(items, salvos)).toBe(1)
    expect(primeiroPendente(items, mapaSalvos(items.map((i) => ({ item_key: i.key }))))).toBe(3)
  })

  it('item precisa de foto e resposta; problema pede o que é', () => {
    expect(erroDoItem({ temFoto: false, resposta: 'ok' })).toBe('Tire a foto do item.')
    expect(erroDoItem({ temFoto: true, resposta: '' })).toBe('Marque OK ou Problema.')
    expect(erroDoItem({ temFoto: true, resposta: 'problema', observacao: '  ' })).toBe('Escreva qual é o problema.')
    expect(erroDoItem({ temFoto: true, resposta: 'problema', observacao: 'pneu careca' })).toBe('')
    expect(erroDoItem({ temFoto: true, resposta: 'ok' })).toBe('')
  })

  it('km só aceita número positivo', () => {
    expect(kmValido('45.230')).toBe(45230)
    expect(kmValido('')).toBeNull()
    expect(kmValido('0')).toBeNull()
  })

  it('resumo conta respondidos e problemas', () => {
    const salvos = mapaSalvos([{ item_key: 'crlv', resposta: 'ok' }, { item_key: 'estepe', resposta: 'problema' }])
    expect(resumoItens(items, salvos)).toEqual({ total: 3, respondidos: 2, problemas: 1 })
  })

  it('completo e suspeito contam como feito no mês', () => {
    expect(concluido('completo')).toBe(true)
    expect(concluido('suspeito')).toBe(true)
    expect(concluido('em_andamento')).toBe(false)
  })
})
