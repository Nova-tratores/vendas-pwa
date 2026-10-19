// Regressão: na tela Comparar, as células sticky (z-10) da tabela passavam por
// cima da barra de baixo, que não tinha z-index. Regra das camadas do app:
//   conteúdo da página (sticky)  <  barra de baixo (z-30)  <  menus/modais fixos (z-40+)
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..')
const NAV_Z = 30

function arquivosJsx(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const p = join(dir, nome)
    if (statSync(p).isDirectory()) return nome === '__tests__' ? [] : arquivosJsx(p)
    return p.endsWith('.jsx') ? [p] : []
  })
}

// Todas as classes de className="..." e className={`...`} com o arquivo de origem.
function classNames() {
  const re = /className=(?:"([^"]*)"|\{`([^`]*)`\})/g
  return arquivosJsx(SRC).flatMap((arq) => {
    const src = readFileSync(arq, 'utf-8')
    return [...src.matchAll(re)].map((m) => ({ arq: arq.slice(SRC.length + 1), cls: m[1] ?? m[2] }))
  })
}

const zDe = (cls) => [...cls.matchAll(/\bz-\[?(\d+)\]?/g)].map((m) => Number(m[1]))
const temClasse = (cls, c) => new RegExp(`(^|\\s)${c}(\\s|$)`).test(cls)
const ehBarraDeBaixo = (cls) => temClasse(cls, 'fixed') && cls.includes('bottom-0 left-0 right-0')

describe('camadas (z-index) da barra de baixo', () => {
  it(`a barra de baixo do vendedor tem z-${NAV_Z}`, () => {
    const nav = classNames().find((c) => c.arq.endsWith('Layout.jsx') && ehBarraDeBaixo(c.cls))
    expect(nav, 'barra de baixo não encontrada em Layout.jsx').toBeTruthy()
    expect(nav.cls).toContain(`z-${NAV_Z}`)
  })

  it('nenhum elemento sticky passa por cima da barra de baixo', () => {
    const violam = classNames()
      .filter((c) => temClasse(c.cls, 'sticky') && zDe(c.cls).some((z) => z >= NAV_Z))
      .map((c) => `${c.arq}: ${c.cls}`)
    expect(violam).toEqual([])
  })

  // Só no app do vendedor: o painel do supervisor não tem barra de baixo.
  it('menus e modais fixos ficam por cima da barra de baixo', () => {
    const violam = classNames()
      .filter((c) => !c.arq.startsWith('supervisor'))
      .filter((c) => temClasse(c.cls, 'fixed') && !ehBarraDeBaixo(c.cls))
      .filter((c) => zDe(c.cls).some((z) => z <= NAV_Z))
      .map((c) => `${c.arq}: ${c.cls}`)
    expect(violam).toEqual([])
  })

  it('mapas Leaflet ficam isolados (z-index 400–1000 não vaza)', () => {
    const css = readFileSync(join(SRC, 'index.css'), 'utf-8')
    expect(css).toMatch(/\.leaflet-container\s*\{[^}]*isolation:\s*isolate/)
  })
})
