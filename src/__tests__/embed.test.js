// @vitest-environment jsdom
// Painel do supervisor embutido no portal: a sessão é emprestada do portal.
// O que não pode quebrar: aceitar sessão de outra origem (sequestro de sessão)
// ou renovar a sessão aqui (rotaciona o refresh token e desloga o portal).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { estaEmbutido, pedirSessaoAoPortal, ouvirSessaoDoPortal, renovarSessao } from '../lib/embed'

const PORTAL = 'https://portal.novatratores.com'
const TOKENS = { access_token: 'acesso-1', refresh_token: 'refresh-1' }

function chegaMensagem(origin, data) {
  window.dispatchEvent(new MessageEvent('message', { origin, data }))
}

// O portal responde a cada pedido de sessão que o iframe fizer.
function portalResponde(origin = PORTAL, tokens = TOKENS) {
  return vi.spyOn(window.parent, 'postMessage').mockImplementation((msg) => {
    if (msg?.tipo === 'vendas:precisa-sessao') {
      queueMicrotask(() => chegaMensagem(origin, { tipo: 'portal:sessao', ...tokens }))
    }
  })
}

// Simula estar dentro do iframe do portal (window.top diferente de window).
const dentroDoFrame = () => vi.spyOn(window, 'top', 'get').mockReturnValue({})

const authFalso = () => ({
  refreshSession: vi.fn(async () => ({ data: { session: { via: 'refresh' } } })),
  setSession: vi.fn(async () => ({ data: { session: { via: 'portal' } } })),
})

beforeEach(() => {
  sessionStorage.clear()
  window.history.replaceState({}, '', '/supervisor')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('estaEmbutido', () => {
  it('fora de iframe e sem ?embed=1 → falso', () => {
    expect(estaEmbutido()).toBe(false)
  })

  it('dentro do frame do portal → verdadeiro', () => {
    dentroDoFrame()
    expect(estaEmbutido()).toBe(true)
  })

  // Regressão: a marca de embutido ficava no sessionStorage e vazava para a
  // aba normal do app — o supervisor ficava sem formulário de login.
  it('fora de frame não fica preso no modo embutido, nem com ?embed=1 ou marca antiga', () => {
    sessionStorage.setItem('embed_portal', '1')
    window.history.replaceState({}, '', '/supervisor?embed=1')
    expect(estaEmbutido()).toBe(false)
  })
})

describe('pedirSessaoAoPortal', () => {
  it('ignora sessão vinda de outra origem e aceita só a do portal', async () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    const p = pedirSessaoAoPortal({ timeoutMs: 1000 })
    chegaMensagem('https://site-malicioso.com', { tipo: 'portal:sessao', access_token: 'x', refresh_token: 'y' })
    chegaMensagem(PORTAL, { tipo: 'portal:sessao', ...TOKENS })
    await expect(p).resolves.toEqual(TOKENS)
  })

  it('pede a sessão ao portal com a origem certa', async () => {
    const spy = portalResponde()
    await pedirSessaoAoPortal()
    expect(spy).toHaveBeenCalledWith({ tipo: 'vendas:precisa-sessao' }, PORTAL)
  })

  it('desiste se o portal não responder', async () => {
    vi.useFakeTimers()
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    const p = pedirSessaoAoPortal({ timeoutMs: 8000 })
    vi.advanceTimersByTime(8000)
    await expect(p).rejects.toThrow('O portal não respondeu')
  })
})

describe('renovarSessao', () => {
  it('embutido: NUNCA chama refreshSession — usa o token do portal', async () => {
    dentroDoFrame()
    portalResponde()
    const auth = authFalso()
    await renovarSessao(auth)
    expect(auth.refreshSession).not.toHaveBeenCalled()
    expect(auth.setSession).toHaveBeenCalledWith(TOKENS)
  })

  it('fora do portal: continua renovando normalmente', async () => {
    const auth = authFalso()
    await renovarSessao(auth)
    expect(auth.refreshSession).toHaveBeenCalledOnce()
    expect(auth.setSession).not.toHaveBeenCalled()
  })
})

describe('ouvirSessaoDoPortal', () => {
  it('aplica a sessão nova do portal e ignora outras origens', () => {
    const auth = authFalso()
    const parar = ouvirSessaoDoPortal(auth)
    chegaMensagem('https://site-malicioso.com', { tipo: 'portal:sessao', access_token: 'x', refresh_token: 'y' })
    chegaMensagem(PORTAL, { tipo: 'portal:sessao', ...TOKENS })
    parar()
    chegaMensagem(PORTAL, { tipo: 'portal:sessao', access_token: 'depois', refresh_token: 'depois' })
    expect(auth.setSession).toHaveBeenCalledTimes(1)
    expect(auth.setSession).toHaveBeenCalledWith(TOKENS)
  })
})
