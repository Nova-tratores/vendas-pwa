// Monitor de uso: as contagens que alimentam a aba Padrões do portal.
import { describe, it, expect } from 'vitest'
import {
  normalizarRota, idsDaRota, entrarNaTela, registrarAtalho, registrarFluxo,
  montarLotes, mesclar, podarDias, novoBuffer, FLUXO_MAX_S,
} from '../lib/uso'

const T0 = Date.parse('2026-10-27T13:00:00Z') // 10:00 em SP
const s = (seg) => T0 + seg * 1000

function navegar(caminhos) {
  const buf = novoBuffer()
  let est = null
  for (const [p, seg] of caminhos) est = entrarNaTela(buf, est, p, s(seg))
  return { buf, lote: montarLotes(buf)[0] }
}
const trans = (lote, de, para) => lote.transicoes.find((t) => t.de === de && t.para === para)

describe('normalizarRota', () => {
  it('prefixa /vendas e troca ids (inclusive negativos do offline e placa) por [id]', () => {
    expect(normalizarRota('/pessoas/123')).toBe('/vendas/pessoas/[id]')
    expect(normalizarRota('/completar-visita/-7')).toBe('/vendas/completar-visita/[id]')
    expect(normalizarRota('/inteligencia/cliente/3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90')).toBe('/vendas/inteligencia/cliente/[id]')
    expect(normalizarRota('/supervisor/visitas')).toBe('/vendas/supervisor/visitas')
  })

  it('nunca grava query string e o index vira o Início', () => {
    expect(normalizarRota('/checklist-veiculo?placa=SEB9J47')).toBe('/vendas/checklist-veiculo')
    expect(normalizarRota('/')).toBe('/vendas/dashboard')
  })

  it('telas de login não contam', () => {
    expect(normalizarRota('/login')).toBe('')
    expect(normalizarRota('/supervisor/login')).toBe('')
  })

  it('ids da URL servem só para "mesmo caso"', () => {
    expect(idsDaRota('/maquinas/55')).toEqual(['55'])
    expect(idsDaRota('/visitas')).toEqual([])
  })
})

describe('entrarNaTela', () => {
  it('conta a página e a transição com o tempo na tela de origem', () => {
    const { lote } = navegar([['/dashboard', 0], ['/visitas', 90]])
    expect(lote.paginas).toEqual(expect.arrayContaining([{ rota: '/vendas/dashboard', n: 1 }, { rota: '/vendas/visitas', n: 1 }]))
    expect(trans(lote, '/vendas/dashboard', '/vendas/visitas')).toMatchObject({ n: 1, soma_gap_s: 90, n_rapida: 0, n_volta: 0 })
  })

  it('ida-e-volta A→B→A em até 5 min, e saída rápida (< 60 s)', () => {
    const { lote } = navegar([['/clientes', 0], ['/pessoas/9', 120], ['/clientes', 150]])
    expect(trans(lote, '/vendas/pessoas/[id]', '/vendas/clientes')).toMatchObject({ n: 1, n_volta: 1, n_rapida: 1 })
  })

  it('volta depois de 5 min não é ida-e-volta', () => {
    const { lote } = navegar([['/clientes', 0], ['/pessoas/9', 10], ['/clientes', 10 + 6 * 60]])
    expect(trans(lote, '/vendas/pessoas/[id]', '/vendas/clientes').n_volta).toBe(0)
  })

  it('mesmo caso = mesmo id nas duas telas', () => {
    const { lote } = navegar([['/pessoas/9', 0], ['/maquinas/9', 30], ['/maquinas/10', 60]])
    expect(trans(lote, '/vendas/pessoas/[id]', '/vendas/maquinas/[id]').n_mesmo_alvo).toBe(1)
  })

  it('parado mais de 30 min: conta a página, não a transição', () => {
    const { lote } = navegar([['/dashboard', 0], ['/visitas', 31 * 60]])
    expect(lote.transicoes).toEqual([])
    expect(lote.paginas).toHaveLength(2)
  })

  it('mesma tela (só mudou a query) não conta de novo', () => {
    const { lote } = navegar([['/rota', 0], ['/rota?aba=semana', 5]])
    expect(lote.paginas).toEqual([{ rota: '/vendas/rota', n: 1 }])
  })

  it('uso offline em dias diferentes vira um lote por dia', () => {
    const buf = novoBuffer()
    let est = entrarNaTela(buf, null, '/dashboard', T0)
    est = entrarNaTela(buf, est, '/visitas', T0 + 86400000)
    expect(montarLotes(buf).map((l) => l.dia)).toEqual(['2026-10-27', '2026-10-28'])
  })
})

describe('atalhos e fluxos', () => {
  it('atalho guarda de onde e para onde', () => {
    const buf = novoBuffer()
    registrarAtalho(buf, T0, 'inicio:nova-visita', '/vendas/dashboard', '/vendas/visitas')
    registrarAtalho(buf, T0, 'inicio:nova-visita', '/vendas/dashboard', null)
    expect(montarLotes(buf)[0].eventos).toEqual(expect.arrayContaining([
      { tipo: 'atalho', chave: 'inicio:nova-visita', detalhe: '/vendas/dashboard→/vendas/visitas', n: 1, soma_s: 0 },
      { tipo: 'atalho', chave: 'inicio:nova-visita', detalhe: '/vendas/dashboard→(mesma tela)', n: 1, soma_s: 0 },
    ]))
  })

  it('fluxo soma o tempo e limita a 1 h (celular esquecido aberto)', () => {
    const buf = novoBuffer()
    registrarFluxo(buf, T0, 'visita', 'iniciado')
    registrarFluxo(buf, T0, 'visita', 'concluido', 95)
    registrarFluxo(buf, T0, 'visita', 'concluido', 5 * 3600)
    const conc = montarLotes(buf)[0].eventos.find((e) => e.detalhe === 'concluido')
    expect(conc).toMatchObject({ n: 2, soma_s: 95 + FLUXO_MAX_S })
  })
})

describe('buffer', () => {
  it('mesclar soma tudo (envio que falhou volta sem perder nada)', () => {
    const a = navegar([['/dashboard', 0], ['/visitas', 30]]).buf
    const b = navegar([['/dashboard', 0], ['/visitas', 30]]).buf
    const lote = montarLotes(mesclar(a, b))[0]
    expect(trans(lote, '/vendas/dashboard', '/vendas/visitas')).toMatchObject({ n: 2, soma_gap_s: 60, n_rapida: 2 })
  })

  it('poda dias com mais de 30 dias (o portal recusa)', () => {
    const buf = { '2026-08-01': { p: {}, t: {}, e: {} }, '2026-10-27': { p: {}, t: {}, e: {} } }
    expect(Object.keys(podarDias(buf, T0))).toEqual(['2026-10-27'])
  })
})
