// Agendamento: antecipar o próximo contato (nova visita com data menor) não
// aparecia em Clientes/Notificações/Dashboard, que pegavam a data MAIS DISTANTE.
// Regra única: vale o contato da visita mais recente que agendou.
import { describe, it, expect, vi } from 'vitest'

const salvos = []
vi.mock('../lib/db', () => ({
  saveRecord: async (store, r) => { salvos.push([store, r]); return r.id },
  registrarLog: async () => {},
}))
const { contatoVigentePorPropriedade, alterarDataProximoContato } = await import('../lib/agenda')

describe('contatoVigentePorPropriedade', () => {
  it('vale a visita mais recente, mesmo com data de contato menor', () => {
    const m = contatoVigentePorPropriedade([
      { id: 'a', propriedade_id: 1, data_visita: '2026-10-01', data_proximo_contato: '2026-12-01' },
      { id: 'b', propriedade_id: 1, data_visita: '2026-10-10', data_proximo_contato: '2026-10-20' },
      { id: 'c', propriedade_id: 2, data_visita: '2026-10-05', data_proximo_contato: '2026-11-01' },
    ])
    expect(m.get(1).id).toBe('b')
    expect(m.get(2).id).toBe('c')
  })

  it('ignora visita excluída e visita sem data agendada', () => {
    const m = contatoVigentePorPropriedade([
      { id: 'a', propriedade_id: 1, data_visita: '2026-10-01', data_proximo_contato: '2026-11-01' },
      { id: 'b', propriedade_id: 1, data_visita: '2026-10-10', data_proximo_contato: '2026-10-15', deleted_at: '2026-10-11' },
      { id: 'c', propriedade_id: 1, data_visita: '2026-10-12', data_proximo_contato: null },
    ])
    expect(m.get(1).id).toBe('a')
  })
})

describe('alterarDataProximoContato', () => {
  it('troca só a data e marca pra sincronizar', async () => {
    salvos.length = 0
    await alterarDataProximoContato({ id: 'v1', resumo: 'x', data_proximo_contato: '2026-10-20', status_sync: 'synced' }, '2026-10-25')
    expect(salvos).toEqual([['visitas', { id: 'v1', resumo: 'x', data_proximo_contato: '2026-10-25', status_sync: 'pending' }]])
  })

  it('vazio remove o agendamento; mesma data não grava', async () => {
    salvos.length = 0
    await alterarDataProximoContato({ id: 'v1', data_proximo_contato: '2026-10-20' }, '2026-10-20')
    expect(salvos).toHaveLength(0)
    await alterarDataProximoContato({ id: 'v1', data_proximo_contato: '2026-10-20' }, '')
    expect(salvos[0][1].data_proximo_contato).toBeNull()
  })
})
