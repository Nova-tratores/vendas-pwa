import { describe, it, expect } from 'vitest'
import { normalizarVisitaPush } from '../lib/visitaPush'

describe('visita antes de subir', () => {
  it('sem tipo e com GPS vira presencial', () => {
    expect(normalizarVisitaPush({ tipo: '', latitude: -23.4, longitude: -49.4 }).tipo).toBe('presencial')
  })
  it('sem tipo e sem GPS vira mensagem', () => {
    expect(normalizarVisitaPush({ tipo: '', latitude: null, longitude: null }).tipo).toBe('mensagem')
  })
  it('não mexe no tipo escolhido', () => {
    expect(normalizarVisitaPush({ tipo: 'telefonema', latitude: -23, longitude: -49 }).tipo).toBe('telefonema')
  })
  it('data de retorno vazia vira nula', () => {
    expect(normalizarVisitaPush({ tipo: 'presencial', data_proximo_contato: '' }).data_proximo_contato).toBeNull()
    expect(normalizarVisitaPush({ tipo: 'presencial', data_proximo_contato: '2026-11-10' }).data_proximo_contato).toBe('2026-11-10')
  })
})
