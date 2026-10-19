// Olho do card no Gerir catálogo dava "null value in column marca_id": mandava
// só { id, slug, visivel } via upsert, e o Postgres valida NOT NULL como INSERT.
// Ficha existente tem que virar UPDATE ... WHERE id.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const chamadas = []
function query() {
  const q = {
    update: (p) => (chamadas.push(['update', p]), q),
    insert: (p) => (chamadas.push(['insert', p]), q),
    upsert: (p) => (chamadas.push(['upsert', p]), q),
    eq: (c, v) => (chamadas.push(['eq', c, v]), q),
    select: () => q,
    single: async () => ({ data: { id: 7, titulo: 'X' }, error: null }),
  }
  return q
}

vi.mock('../lib/sync', () => ({
  supabase: {
    from: () => query(),
    auth: { getSession: async () => ({ data: { session: { expires_at: Date.now() / 1000 + 3600 } } }) },
  },
}))
vi.mock('../lib/auditoria', () => ({ registrarLogSupervisor: () => {} }))
vi.mock('../lib/embed', () => ({ estaEmbutido: () => false, renovarSessao: async () => null }))

const { salvarProdutoCatalogo } = await import('../lib/catalogoSupabase')

beforeEach(() => { chamadas.length = 0 })

describe('salvarProdutoCatalogo', () => {
  it('ficha existente com payload parcial faz UPDATE pelo id (sem upsert)', async () => {
    await salvarProdutoCatalogo({ id: 7, slug: 'trator-x', visivel: false }, 'sup-1')
    expect(chamadas.map((c) => c[0])).toEqual(['update', 'eq'])
    expect(chamadas[0][1]).not.toHaveProperty('id')
    expect(chamadas[0][1]).toMatchObject({ visivel: false, updated_by: 'sup-1' })
    expect(chamadas[1]).toEqual(['eq', 'id', 7])
  })
})
