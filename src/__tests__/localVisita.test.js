import { describe, it, expect } from 'vitest'
import { camposLocal, ehParceiro, foraDaPropriedade, gravaCoordenadaNaPropriedade, localValido, rotuloLocal, semParceiros } from '../lib/localVisita'
import { alertasCompletude, notaVisita, resumoPorVendedor, visitaParaNota } from '../lib/completudeVisita'
import { resumoSemana } from '../lib/gamificacao'

const fora = { tipo: 'presencial', onde: 'outro', local_tipo: 'banco', local_nome: ' Sicredi Taguaí ' }

describe('local da visita', () => {
  it('na propriedade não manda campo nenhum', () => {
    expect(camposLocal({ tipo: 'presencial', onde: 'propriedade', local_tipo: 'banco' })).toEqual({})
    expect(camposLocal({ ...fora, tipo: 'mensagem' })).toEqual({})
  })
  it('fora da propriedade grava tipo e nome limpo', () => {
    expect(camposLocal(fora)).toEqual({ local_tipo: 'banco', local_nome: 'Sicredi Taguaí' })
    expect(rotuloLocal(camposLocal(fora))).toBe('Banco · Sicredi Taguaí')
  })
  it('exige o motivo e o nome, menos na loja', () => {
    expect(localValido({ tipo: 'presencial', onde: 'outro' })).toBe(false)
    expect(localValido({ ...fora, local_nome: ' ' })).toBe(false)
    expect(localValido({ tipo: 'presencial', onde: 'outro', local_tipo: 'loja' })).toBe(true)
    expect(localValido({ tipo: 'mensagem', onde: 'outro' })).toBe(true)
  })
  it('GPS de fora não vira coordenada da propriedade', () => {
    expect(gravaCoordenadaNaPropriedade({ tipo: 'presencial' }, {})).toBe(true)
    expect(gravaCoordenadaNaPropriedade({ tipo: 'presencial', local_tipo: 'banco' }, {})).toBe(false)
    expect(gravaCoordenadaNaPropriedade({ tipo: 'mensagem' }, {})).toBe(false)
  })
  it('parceiro sai da carteira', () => {
    const lista = [{ id: 1 }, { id: 2, tipo_cadastro: 'parceiro' }]
    expect(semParceiros(lista).map((p) => p.id)).toEqual([1])
    expect(ehParceiro(lista[1])).toBe(true)
  })
})

describe('nota e métricas', () => {
  const base = {
    resumo: 'Fui ao banco levar o pedido de compra do trator do cliente e falar com o gerente do agro sobre o projeto',
    proximos_passos: 'Cobrar a liberação', data_proximo_contato: '2026-11-10',
    pessoas: [{ cargo: 'GERENTE' }], maquina_ids: [], culturas: [],
  }
  it('fora da propriedade não cobra cultura nem máquina', () => {
    const n = notaVisita({ ...base, local_tipo: 'banco' })
    expect(n.faltam).toEqual([])
    expect(n.nota).toBe(100)
    expect(n.itens.find((i) => i.key === 'maquina').naoSeAplica).toBe(true)
  })
  it('na propriedade continua cobrando', () => {
    expect(notaVisita(base).faltam).toEqual(expect.arrayContaining(['cultura', 'máquina']))
  })
  it('visita em cadastro de parceiro também não cobra', () => {
    const v = visitaParaNota({ ...base, propriedade_id: 9 }, { propById: { 9: { tipo_cadastro: 'parceiro' } } })
    expect(foraDaPropriedade(v)).toBe(true)
    expect(notaVisita(v).itens.find((i) => i.key === 'cultura').ok).toBe(true)
  })
  it('separa campo de atendimento e não conta o campo que não se aplica', () => {
    const [r] = resumoPorVendedor([
      { ...base, vendedor_id: 1 },
      { ...base, vendedor_id: 1, local_tipo: 'cartorio' },
    ])
    expect(r).toMatchObject({ feitas: 2, campo: 1, atendimentos: 1 })
    expect(r.pctFalta.maquina).toBe(100)
  })
  it('dois clientes no mesmo banco não disparam GPS repetido', () => {
    const v = (id, prop, extra) => ({ ...base, id, vendedor_id: 1, propriedade_id: prop, latitude: -23, longitude: -49, data_visita: `2026-10-30T10:0${id}:00Z`, ...extra })
    expect(alertasCompletude([v(1, 10, { local_tipo: 'banco' }), v(2, 11, { local_tipo: 'banco' })]).gps).toHaveLength(0)
    expect(alertasCompletude([v(1, 10), v(2, 11)]).gps).toHaveLength(1)
  })
  it('selos de campo ignoram atendimento fora', () => {
    const hoje = new Date('2026-10-30T15:00:00')
    const vs = Array.from({ length: 10 }, (_, i) => ({ ...base, id: i, data_visita: `2026-10-2${6 + (i % 4)}T1${i % 9}:00:00`, local_tipo: 'banco', primeira_visita: true, pessoa_ids: [] }))
    const r = resumoSemana(vs, { pessoasById: {}, propById: {} }, hoje)
    expect(r.semana.feitas).toBe(10)
    expect(r.semana.campo).toBe(0)
    expect(r.selos.map((s) => s.key)).not.toContain('maratona')
    expect(r.selos.map((s) => s.key)).not.toContain('desbravador')
  })
})
