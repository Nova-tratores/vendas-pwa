// Mapa do supervisor: abre no dia de hoje (Brasília) e a timeline junta as visitas.
import { describe, it, expect } from 'vitest'
import { hojeBR, fmtDuracao, juntarVisitas, corParada, haQuanto } from '../lib/mapaVendedoresRegras'

describe('mapa do supervisor', () => {
  it('hoje é o dia de Brasília, não o de UTC', () => {
    expect(hojeBR(new Date('2026-10-21T01:30:00Z'))).toBe('2026-10-20')
  })

  it('durações curtas e longas', () => {
    expect(fmtDuracao(13)).toBe('13min')
    expect(fmtDuracao(437)).toBe('7h17min')
    expect(fmtDuracao(60)).toBe('1h')
  })

  it('visitas entram na timeline pela hora, entre a saída e o fim', () => {
    const tl = [
      { tipo: 'inicio', hora: '2026-10-20T03:08:00Z' },
      { tipo: 'parada', hora: '2026-10-20T11:03:00Z', dur: 17 },
      { tipo: 'fim', hora: '2026-10-20T19:40:00Z' },
    ]
    const evs = juntarVisitas(tl, [
      { id: 1, data_visita: '2026-10-20T11:10:00Z', cliente_nome: 'Fazenda X', tipo: 'presencial' },
      { id: 2, data_visita: '2026-10-20T21:00:00Z', cliente_nome: 'Ligação tarde', tipo: 'telefonema' },
    ])
    expect(evs.map((e) => e.tipo)).toEqual(['inicio', 'parada', 'visita', 'visita', 'fim'])
  })

  it('cor da parada pelo tempo parado', () => {
    expect(corParada(10)).toBe('#F59E0B')
    expect(corParada(45)).toBe('#EA580C')
    expect(corParada(90)).toBe('#DC2626')
  })

  it('há quanto tempo', () => {
    const agora = Date.parse('2026-10-20T12:00:00Z')
    expect(haQuanto('2026-10-20T11:53:00Z', agora)).toBe('há 7 min')
    expect(haQuanto(null, agora)).toBe('sem posição')
  })
})
