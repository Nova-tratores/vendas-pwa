// Gamificação: XP = nota da visita, nível em cv, sequência com proteção mensal.
import { describe, it, expect } from 'vitest'
import { nivelDe, subiuDeNivel, sequencia, chama, perfilVendedor, camposParaVerde } from '../lib/gamificacao'
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
