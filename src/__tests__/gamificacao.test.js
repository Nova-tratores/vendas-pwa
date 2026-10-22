// Gamificação: XP = nota da visita, nível em cv, sequência com proteção mensal.
import { describe, it, expect } from 'vitest'
import { nivelDe, subiuDeNivel, sequencia, chama, perfilVendedor, camposParaVerde, resumoDisponivel, resumoSemana, bonusNaoVistos } from '../lib/gamificacao'
import { notaVisita } from '../lib/completudeVisita'

describe('nível em cv', () => {
  it('começa em 50 cv e sobe pelas faixas de XP', () => {
    expect(nivelDe(0).cv).toBe(50)
    expect(nivelDe(499)).toMatchObject({ cv: 50, faltaXp: 1 })
    expect(nivelDe(1500).cv).toBe(100)
    expect(nivelDe(99999)).toMatchObject({ cv: 250, proximo: null, pct: 100 })
  })
  it('detecta a subida', () => {
    expect(subiuDeNivel(480, 560).cv).toBe(75)
    expect(subiuDeNivel(560, 600)).toBeNull()
  })
})

describe('sequência (dias úteis com visita completa)', () => {
  // qui 22/10/2026
  const hoje = new Date(2026, 9, 22, 15)
  it('fim de semana não quebra; hoje sem visita ainda não apaga', () => {
    // seg 19, ter 20, qua 21 + sex 16 (sáb/dom pulados)
    expect(sequencia(['2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21'], hoje).dias).toBe(4)
  })
  it('um buraco no mês é coberto pela proteção; o segundo encerra', () => {
    const s = sequencia(['2026-10-22', '2026-10-21', '2026-10-19', '2026-10-16'], hoje) // falta ter 20
    expect(s.dias).toBe(4)
    expect(s.protecoesUsadas).toEqual(['2026-10-20'])
    expect(s.protecaoDisponivel).toBe(false)
    expect(sequencia(['2026-10-22', '2026-10-20', '2026-10-16'], hoje).dias).toBe(2) // faltam 21 e 19
  })
  it('chama cresce aos 5, 10 e 20 dias', () => {
    expect([0, 3, 5, 12, 25].map(chama)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('perfil e "quase lá"', () => {
  it('XP soma a nota de cada visita', () => {
    const p = perfilVendedor([{ resumo: 'oi', data_visita: '2026-10-22T12:00:00Z' }], {}, new Date(2026, 9, 22))
    expect(p.xp).toBe(10) // só o "negócio não se aplica"
    expect(p.nivel.cv).toBe(50)
  })
  it('quantos campos faltam para verde', () => {
    const n = notaVisita({ resumo: 'x', pessoas: [{ cargo: 'GERENTE' }], culturas: ['Café'], maquina_ids: [1], proximos_passos: 'y' })
    expect(n.nota).toBe(65)
    expect(camposParaVerde(n)).toBe(1) // o retorno (20) já fecha
  })
})

describe('resumo de sexta', () => {
  const sexta = new Date(2026, 9, 23, 16) // sex 23/10
  const visita = (dia, extra = {}) => ({ data_visita: new Date(2026, 9, dia, 10).toISOString(), resumo: 'oi', ...extra })
  const verde = {
    resumo: 'Conversei com o Fernando sobre a plantadeira; a dele está com 12 anos e falha na distribuição do adubo, quer ver proposta.',
    pessoa_ids: [1], propriedade_id: 9, maquina_ids: [3], proximos_passos: 'Levar proposta', data_proximo_contato: '2026-10-28', negocio_id: 1,
  }
  const ctx = { pessoasById: { 1: { cargo: 'FAMILIAR' } }, propById: { 9: { culturas: ['Grãos'] } } }

  it('aparece de sexta 15h ao domingo', () => {
    expect(resumoDisponivel(sexta)).toBe(true)
    expect(resumoDisponivel(new Date(2026, 9, 23, 10))).toBe(false)
    expect(resumoDisponivel(new Date(2026, 9, 26, 9))).toBe(false)
  })

  it('compara com a semana anterior, acha a melhor visita, dá selos e missões', () => {
    const r = resumoSemana([
      visita(19, verde), visita(20, verde), visita(21, verde),
      visita(14), visita(15),
    ], ctx, sexta)
    expect(r.semana).toMatchObject({ feitas: 3, completas: 3, media: 100 })
    expect(r.anterior).toEqual({ feitas: 2, media: 10 })
    expect(r.melhor.n.nota).toBe(100)
    expect(r.selos.map((s) => s.key)).toEqual(expect.arrayContaining(['semana_verde', 'olho_na_maquina', 'agenda_cheia']))
    expect(r.missoes.length).toBeGreaterThan(0)
  })
})

describe('fase 3: Bônus de Safra e missões', () => {
  const verde = {
    resumo: 'Conversei com o Fernando sobre a plantadeira; a dele está com 12 anos e falha na distribuição do adubo, quer ver proposta.',
    pessoa_ids: [1], propriedade_id: 9, maquina_ids: [3], proximos_passos: 'Levar proposta', data_proximo_contato: '2026-10-28', negocio_id: 1,
    data_visita: '2026-10-22T13:00:00Z',
  }
  const ctx = { pessoasById: { 1: { cargo: 'FAMILIAR' } }, propById: { 9: { culturas: ['Grãos'] } } }
  const hoje = new Date(2026, 9, 22, 18)

  it('bônus dobra só a visita completa', () => {
    expect(perfilVendedor([{ ...verde, bonus_safra: true }], ctx, hoje).xp).toBe(200)
    expect(perfilVendedor([{ resumo: 'oi', data_visita: verde.data_visita, bonus_safra: true }], ctx, hoje).xp).toBe(10)
  })

  it('missão relâmpago multiplica no período e com o campo pedido; não soma com o bônus', () => {
    const missao = { campo: 'maquina', multiplicador: 3, inicio: '2026-10-22T10:00:00Z', fim: '2026-10-23T10:00:00Z' }
    expect(perfilVendedor([verde], ctx, hoje, [missao]).xp).toBe(300)
    expect(perfilVendedor([{ ...verde, bonus_safra: true }], ctx, hoje, [missao]).xp).toBe(300)
    expect(perfilVendedor([{ ...verde, maquina_ids: [] }], ctx, hoje, [missao]).xp).toBe(80) // sem máquina: fora da missão
    expect(perfilVendedor([verde], ctx, hoje, [{ ...missao, fim: '2026-10-22T12:00:00Z' }]).xp).toBe(100) // fora do período
  })

  it('bônus ainda não celebrado', () => {
    const vs = [{ ...verde, id: 1, bonus_safra: true }, { ...verde, id: 2, bonus_safra: false }, { ...verde, id: 3, bonus_safra: true }]
    expect(bonusNaoVistos(vs, ctx, new Set(['3'])).map((v) => v.id)).toEqual([1])
  })
})
