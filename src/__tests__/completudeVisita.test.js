// Nota de completude da visita: a mesma régua para o vendedor e o supervisor.
import { describe, it, expect } from 'vitest'
import { notaVisita, resumoReal, indicaInteresse, passaFiltroNota, dataMaisDias, semRetornoJustificado } from '../lib/completudeVisita'

const completa = {
  resumo: 'Conversei com o Fernando sobre a plantadeira; a dele está com 12 anos e falha na distribuição do adubo, quer ver proposta da nova.',
  pessoas: [{ nome: 'Fernando', cargo: 'FAMILIAR' }],
  culturas: ['Grãos'],
  maquina_ids: [3],
  proximos_passos: 'Levar proposta da plantadeira 7 linhas',
  data_proximo_contato: '2026-10-29',
  negocio_id: 12,
}

describe('nota de completude da visita', () => {
  it('visita completa vale 100 e fica verde', () => {
    const n = notaVisita(completa)
    expect(n.nota).toBe(100)
    expect(n.faixa.key).toBe('completa')
    expect(n.faltam).toEqual([])
  })

  it('visita rasa do print fica vermelha', () => {
    const n = notaVisita({ resumo: 'Conversa produtiva, me apresentei.', pessoas: [{ nome: 'Alex' }], culturas: [], maquina_ids: [] })
    expect(n.nota).toBe(10) // só o negócio, que não se aplica
    expect(n.faixa.key).toBe('incompleta')
    expect(n.faltam).toEqual(['resumo', 'pessoa com cargo', 'cultura', 'máquina', 'próximos passos', 'retorno'])
  })

  it('resumo genérico curto não conta; com conteúdo além da frase feita conta', () => {
    expect(resumoReal('Conversa produtiva com o cliente na fazenda dele, me apresentei e mostrei os produtos')).toBe(false)
    expect(resumoReal(completa.resumo)).toBe(true)
  })

  it('interesse sem negócio derruba 10 pontos e acende o filtro', () => {
    expect(indicaInteresse('Vai precisar de implementos para a safra')).toBe(true)
    const n = notaVisita({ ...completa, negocio_id: null })
    expect(n.nota).toBe(90)
    expect(n.oportunidadeSemNegocio).toBe(true)
    expect(passaFiltroNota({ ...completa, negocio_id: null }, 'oportunidade')).toBe(true)
  })

  it('"sem retorno" justificado vale como retorno', () => {
    expect(semRetornoJustificado('Sem retorno: vendeu a fazenda')).toBe(true)
    expect(semRetornoJustificado('Sem retorno:')).toBe(false)
    const n = notaVisita({ ...completa, data_proximo_contato: null, proximos_passos: 'Sem retorno: vendeu a fazenda' })
    expect(n.itens.find((i) => i.key === 'retorno').ok).toBe(true)
    expect(passaFiltroNota({ ...completa, data_proximo_contato: null, proximos_passos: '' }, 'sem_retorno')).toBe(true)
  })

  it('atalhos de retorno', () => {
    expect(dataMaisDias(7, new Date(2026, 9, 28))).toBe('2026-11-04')
  })
})
