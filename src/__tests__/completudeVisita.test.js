// Nota de completude da visita: a mesma régua para o vendedor e o supervisor.
import { describe, it, expect } from 'vitest'
import {
  notaVisita, resumoReal, indicaInteresse, passaFiltroNota, dataMaisDias, semRetornoJustificado,
  incompletasDoDia, faltouNaUltima, completadaDepois, horaDoAvisoDoDia, visitaParaNota,
  resumoPorVendedor, alertasCompletude,
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

describe('painel do supervisor', () => {
  const v = (o) => ({ vendedor_id: 1, vendedor_nome: 'Matheus', resumo: 'oi', pessoas: [], culturas: [], maquina_ids: [], ...o })

  it('feitas × completas e o que cada um esquece', () => {
    const [r] = resumoPorVendedor([v({ id: 1 }), v({ id: 2, ...completa })])
    expect(r).toMatchObject({ feitas: 2, completas: 1, pct: 50 })
    expect(r.pctFalta.maquina).toBe(50)
    expect(r.pctFalta.negocio).toBe(0) // só a visita com interesse conta, e ela tem negócio
  })

  it('GPS repetido: propriedades diferentes no mesmo ponto em menos de 1 h', () => {
    const { gps } = alertasCompletude([
      v({ id: 1, propriedade_id: 10, data_visita: '2026-10-22T10:00:00Z', latitude: -23.2, longitude: -49.3 }),
      v({ id: 2, propriedade_id: 11, data_visita: '2026-10-22T10:20:00Z', latitude: -23.2001, longitude: -49.3001 }),
      v({ id: 3, propriedade_id: 12, data_visita: '2026-10-22T14:00:00Z', latitude: -23.2, longitude: -49.3 }),
    ])
    expect(gps.map((g) => [g.a.id, g.b.id])).toEqual([[1, 2]])
  })

  it('retroativas em excesso e retornos vencidos', () => {
    const vis = [1, 2, 3, 4, 5].map((i) => v({ id: i, retroativa: i <= 2, propriedade_id: i, data_visita: `2026-10-0${i}T10:00:00Z` }))
    const { retro, vencidos } = alertasCompletude(vis, [
      ...vis,
      v({ id: 9, propriedade_id: 20, data_visita: '2026-10-01T10:00:00Z', data_proximo_contato: '2026-10-10' }),
      v({ id: 10, propriedade_id: 21, data_visita: '2026-10-01T10:00:00Z', data_proximo_contato: '2026-10-10' }),
      v({ id: 11, propriedade_id: 21, data_visita: '2026-10-12T10:00:00Z' }), // voltou: não está vencido
    ], '2026-10-22')
    expect(retro).toEqual([{ vendedor_id: 1, nome: 'Matheus', retro: 2, feitas: 5 }])
    expect(vencidos.map((x) => x.id)).toEqual([9])
  })
})
