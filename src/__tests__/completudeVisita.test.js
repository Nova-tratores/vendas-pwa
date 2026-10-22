// Nota de completude da visita: a mesma régua para o vendedor e o supervisor.
import { describe, it, expect } from 'vitest'
import {
  notaVisita, resumoReal, indicaInteresse, passaFiltroNota, dataMaisDias, semRetornoJustificado,
  incompletasDoDia, faltouNaUltima, completadaDepois, horaDoAvisoDoDia, visitaParaNota,
} from '../lib/completudeVisita'

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

describe('cobrança da completude', () => {
  const ctx = { pessoasById: { 1: { nome: 'Fernando', cargo: 'FAMILIAR' }, 2: { nome: 'Alex' } }, propById: { 9: { culturas: ['Grãos'] } } }

  it('visita do IndexedDB vira o formato da régua', () => {
    const v = visitaParaNota({ pessoa_ids: [1, 2], propriedade_id: 9 }, ctx)
    expect(v.pessoas.length).toBe(2)
    expect(v.culturas).toEqual(['Grãos'])
  })

  it('incompletas de hoje, mais antiga primeiro; completas e de ontem ficam fora', () => {
    const agora = new Date(2026, 9, 22, 18, 0)
    const hoje = (h) => new Date(2026, 9, 22, h, 0).toISOString()
    const r = incompletasDoDia([
      { id: 1, data_visita: hoje(15), resumo: 'oi' },
      { id: 2, data_visita: hoje(9), resumo: 'oi' },
      { id: 3, data_visita: new Date(2026, 9, 21, 10).toISOString(), resumo: 'oi' },
      { id: 4, data_visita: hoje(11), ...{ resumo: completa.resumo, pessoa_ids: [1], propriedade_id: 9, maquina_ids: [3], proximos_passos: 'x', data_proximo_contato: '2026-10-30', negocio_id: 1 } },
    ], ctx, agora)
    expect(r.map((x) => x.v.id)).toEqual([2, 1])
    expect(horaDoAvisoDoDia(agora)).toBe(true)
    expect(horaDoAvisoDoDia(new Date(2026, 9, 22, 17, 0))).toBe(false)
  })

  it('"da última vez faltou" usa a visita mais recente e só o que dá para coletar', () => {
    const r = faltouNaUltima([
      { id: 1, data_visita: '2026-10-01T10:00:00Z', propriedade_id: 9, pessoa_ids: [1], maquina_ids: [3] },
      { id: 2, data_visita: '2026-10-15T10:00:00Z', propriedade_id: 9, pessoa_ids: [2], resumo: 'quer comprar um trator novo' },
    ], ctx)
    expect(r.visita.id).toBe(2)
    expect(r.faltam).toEqual(['pessoa com cargo', 'máquina', 'negócio'])
  })

  it('completada depois de 48 h; edição sem alteração não conta', () => {
    const v = { created_at: '2026-10-20T10:00:00Z' }
    expect(completadaDepois(v, [{ acao: 'alterar', detalhes: 'Edição: sem alterações', data_hora: '2026-10-23T10:00:00Z' }])).toBeNull()
    expect(completadaDepois(v, [{ acao: 'alterar', detalhes: 'Completou: máquina', data_hora: '2026-10-21T09:00:00Z' }])).toBeNull()
    expect(completadaDepois(v, [{ acao: 'alterar', detalhes: 'Completou: máquina', data_hora: '2026-10-23T10:00:00Z' }])).toBe('2026-10-23T10:00:00.000Z')
  })
})
