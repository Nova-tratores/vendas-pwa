// Mapa do supervisor: abre no dia de hoje (Brasília) e a timeline junta as visitas.
import { describe, it, expect } from 'vitest'
import { hojeBR, fmtDuracao, juntarVisitas, corParada, haQuanto, diasDoPeriodo, combinarRotas } from '../lib/mapaVendedoresRegras'

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

describe('trajeto de um período', () => {
  it('lista os dias e respeita o teto', () => {
    expect(diasDoPeriodo('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(diasDoPeriodo('2026-10-01', '2026-12-31', 31).length).toBe(31)
    expect(diasDoPeriodo('2026-10-05', '2026-10-01')).toEqual([])
  })
  it('soma o resumo e separa os dias', () => {
    const r = combinarRotas([
      { data: '2026-10-20', resumo: { km: 70, paradas: 3, visitas: 1, dirigindo_min: 100, inicio: 'a', fim: 'b' }, segmentos: [[[1, 1], [2, 2]]], paradas: [{ lat: 1 }], inicio: [1, 1], fim: [2, 2] },
      { data: '2026-10-21', resumo: { km: 0, paradas: 0, visitas: 0, dirigindo_min: 0 }, segmentos: [], paradas: [], inicio: null, fim: null },
    ])
    expect(r.rotulo).toBe('20/10/26 a 21/10/26')
    expect(r.resumo).toMatchObject({ km: 70, paradas: 3, inicio: 'a', fim: 'b' })
    expect(r.paradas[0].data).toBe('2026-10-20')
    expect(r.unico).toBe(false)
  })
})
