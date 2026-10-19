// Gerir catálogo: Categoria é lista + "Nova categoria". As criadas pelo
// supervisor precisam aparecer na lista e como filtro no catálogo do vendedor.
import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/sync', () => ({ supabase: {} }))
vi.mock('../lib/auditoria', () => ({ registrarLogSupervisor: () => {} }))
vi.mock('../lib/embed', () => ({ estaEmbutido: () => false, renovarSessao: async () => null }))
const { categoriasDe, CATEGORIAS } = await import('../lib/catalogoSupabase')

describe('categoriasDe', () => {
  it('fixas primeiro, depois as criadas, sem repetir nem vazias', () => {
    const out = categoriasDe([
      { categoria: 'tratores' }, { categoria: 'Subsoladores' }, { categoria: ' Arados ' },
      { categoria: 'Subsoladores' }, { categoria: '' }, { categoria: null },
    ])
    expect(out.map((c) => c.key)).toEqual([...CATEGORIAS.map((c) => c.key), 'Arados', 'Subsoladores'])
  })
})
