// Tela Cidades mostrava só ~50 cidades (até "Campinas"): a busca da tabela de
// clientes (~5.800 linhas) voltava cortada em 1000 pelo Supabase.
import { describe, it, expect } from 'vitest'
import { buscarTodas } from '../lib/paginar'

// Imita o PostgREST: devolve no máximo 1000 linhas por resposta.
function tabelaFalsa(total) {
  const linhas = Array.from({ length: total }, (_, i) => ({ id: i + 1 }))
  const chamadas = []
  const montar = () => ({
    range: async (de, ate) => {
      chamadas.push([de, ate])
      return { data: linhas.slice(de, Math.min(ate + 1, de + 1000)), error: null }
    },
  })
  return { montar, chamadas }
}

describe('buscarTodas', () => {
  it('traz todas as linhas acima do teto de 1000', async () => {
    const { montar } = tabelaFalsa(5835)
    const out = await buscarTodas(montar)
    expect(out).toHaveLength(5835)
    expect(out.at(-1).id).toBe(5835)
  })

  it('para na primeira página incompleta', async () => {
    const { montar, chamadas } = tabelaFalsa(1500)
    await buscarTodas(montar)
    expect(chamadas).toEqual([[0, 999], [1000, 1999]])
  })

  it('total múltiplo de 1000 termina com uma página vazia', async () => {
    const { montar } = tabelaFalsa(2000)
    expect(await buscarTodas(montar)).toHaveLength(2000)
  })

  it('propaga erro do Supabase', async () => {
    const montar = () => ({ range: async () => ({ data: null, error: new Error('falhou') }) })
    await expect(buscarTodas(montar)).rejects.toThrow('falhou')
  })
})
