// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

// banco de mentira: consorcio_planilhas devolve a cópia anônima da planilha
vi.mock('../lib/sync', () => {
  const texto = readFileSync(resolve(__dirname, 'fixtures/cotas-exemplo.csv'), 'utf8')
  const consulta = {
    select: () => consulta, order: () => consulta, limit: () => consulta,
    maybeSingle: () => Promise.resolve({ data: { nome: 'cotas.csv', texto, criado_em: '2026-11-04T12:00:00Z' }, error: null }),
  }
  return { supabase: { from: () => consulta } }
})

globalThis.IS_REACT_ACT_ENVIRONMENT = true

describe('tela /consorcio', () => {
  it.each(['radar', 'cotas', 'clientes', 'grupos', 'simular', 'regras'])('abre a aba %s', async (aba) => {
    localStorage.setItem('vendedor', JSON.stringify({ nome: 'Joaquim Leme' }))
    localStorage.removeItem('consorcio-escopo')
    const { default: Consorcio } = await import('../pages/Consorcio')
    const div = document.createElement('div')
    document.body.appendChild(div)
    const root = createRoot(div)
    await act(async () => {
      root.render(<MemoryRouter initialEntries={[`/consorcio?aba=${aba}`]}><Routes><Route path="/consorcio" element={<Consorcio />} /></Routes></MemoryRouter>)
    })
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(div.textContent).toContain('Carteira de cotas')
    expect(div.textContent).toContain('Todas 44')
    expect(div.textContent).toMatch(/Minhas \d+/)
    if (aba === 'cotas') {
      const botao = [...div.querySelectorAll('button')].find((b) => /cota \d+/.test(b.textContent))
      await act(async () => { botao.click() })
      expect(document.body.textContent).toContain('Números da cota')
    }
    await act(async () => root.unmount())
    div.remove()
  })
})
