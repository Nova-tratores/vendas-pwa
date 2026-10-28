import { describe, it, expect } from 'vitest'
import { chaveDePergunta, faltando, numeroDigitado, questsAFazer, rotuloAlvo, situacaoPrazo, xpDasQuests, ITENS_PRONTOS } from '../lib/quests'

const itens = ITENS_PRONTOS.slice(0, 4) // horímetro, fotos (mín. 2), relato operador, relato dono

describe('faltando', () => {
  it('lista os obrigatórios sem resposta e as fotos que faltam', () => {
    expect(faltando(itens, {})).toEqual([
      'Horímetro (horas)', 'Fotos do trator (painel com o horímetro + trator inteiro): 2 fotos a mais',
      'Relato do operador (como o trator está indo, algum problema?)', 'Relato do dono (satisfação, planos, o que precisa)',
    ])
  })
  it('completo não falta nada; horímetro precisa ser número', () => {
    const r = { horimetro: '1.234,5', fotos: ['a', 'b'], relato_operador: 'ok', relato_dono: 'satisfeito' }
    expect(faltando(itens, r)).toEqual([])
    expect(faltando(itens, { ...r, horimetro: 'abc' })).toEqual(['Horímetro (horas)'])
  })
  it('sim/não precisa de escolha; opcional pode ficar em branco', () => {
    expect(faltando([{ chave: 'x', tipo: 'simnao', rotulo: 'X?', obrigatorio: true }], {})).toEqual(['X?'])
    expect(faltando([{ chave: 'x', tipo: 'simnao', rotulo: 'X?', obrigatorio: true }], { x: false })).toEqual([])
    expect(faltando([{ chave: 't', tipo: 'texto', rotulo: 'T', obrigatorio: false }], {})).toEqual([])
  })
})

describe('auxiliares', () => {
  it('número digitado em formato brasileiro', () => {
    expect(numeroDigitado('1.234,5')).toBe(1234.5)
    expect(numeroDigitado('987')).toBe(987)
    expect(numeroDigitado('')).toBeNull()
  })
  it('chave de pergunta sem acento e sem repetir', () => {
    expect(chaveDePergunta('Está usando o implemento?')).toBe('esta_usando_o_implemento')
    expect(chaveDePergunta('Fotos', ['fotos'])).toBe('fotos_2')
  })
  it('prazo', () => {
    const hoje = new Date('2026-10-28T10:00:00')
    expect(situacaoPrazo('2026-10-25', hoje)).toEqual({ atrasada: true, texto: 'atrasada 3 dias' })
    expect(situacaoPrazo('2026-10-28', hoje).texto).toBe('vence hoje')
    expect(situacaoPrazo(null, hoje)).toBeNull()
  })
  it('XP conta concluídas e as da fila; a fazer exclui a fila', () => {
    const qs = [{ id: 1, status: 'concluida', xp: 50 }, { id: 2, status: 'aberta', xp: 60, prazo: '2026-11-01' }, { id: 3, status: 'aberta', xp: 40, prazo: '2026-10-30' }]
    expect(xpDasQuests(qs)).toBe(50)
    expect(xpDasQuests(qs, [2])).toBe(110)
    expect(questsAFazer(qs, [2]).map((q) => q.id)).toEqual([3])
    expect(questsAFazer(qs).map((q) => q.id)).toEqual([3, 2])
  })
  it('rótulo do alvo', () => {
    expect(rotuloAlvo({ chassis: 'MBN1KGCBFNGF00710', modelo: 'JIVO 2025', cliente_nome: 'PAULO', cidade: 'CARLOPOLIS' }))
      .toBe('JIVO 2025 …F00710 · PAULO · CARLOPOLIS')
  })
})
