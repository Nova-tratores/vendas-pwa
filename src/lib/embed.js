// Painel do supervisor embutido no portal.novatratores.com (iframe).
//
// O portal usa o MESMO Supabase Auth, mas outra origem: a sessão não passa
// sozinha. O portal entrega {access_token, refresh_token} por postMessage.
//
// Regras do modo embutido (quebrar qualquer uma desloga o portal):
// - o cliente Supabase NÃO persiste nem auto-renova a sessão (ver sync.js):
//   renovar aqui rotacionaria o refresh token que é do portal;
// - quando precisar de token novo, pede ao portal (renovarSessao);
// - nunca signOut() global (o padrão revoga todas as sessões do usuário).

const PORTAL = import.meta.env.VITE_PORTAL_ORIGIN || 'https://portal.novatratores.com'
export const ORIGENS_PORTAL = import.meta.env.DEV ? [PORTAL, 'http://localhost:3000'] : [PORTAL]

// Embutido = está dentro de um frame. Nada é guardado em storage: uma marca
// persistida vazava para a aba normal do app (mesma origem) e prendia o
// supervisor no modo embutido, sem formulário de login.
export function estaEmbutido() {
  try {
    return window.self !== window.top
  } catch {
    return true // acesso ao top negado = está num frame de outra origem
  }
}

function avisarPortal(msg) {
  // Não sabemos qual das origens permitidas é o pai; as outras são descartadas pelo navegador.
  for (const origem of ORIGENS_PORTAL) {
    try { window.parent.postMessage(msg, origem) } catch { /* ignora */ }
  }
}

const ehSessaoDoPortal = (e) =>
  ORIGENS_PORTAL.includes(e.origin) &&
  e.data?.tipo === 'portal:sessao' &&
  typeof e.data.access_token === 'string' &&
  typeof e.data.refresh_token === 'string'

// Pede a sessão ao portal e resolve com { access_token, refresh_token }.
export function pedirSessaoAoPortal({ timeoutMs = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const onMsg = (e) => {
      if (!ehSessaoDoPortal(e)) return
      fim()
      resolve({ access_token: e.data.access_token, refresh_token: e.data.refresh_token })
    }
    const timer = setTimeout(() => {
      fim()
      reject(new Error('O portal não respondeu com a sessão'))
    }, timeoutMs)
    function fim() {
      clearTimeout(timer)
      window.removeEventListener('message', onMsg)
    }
    window.addEventListener('message', onMsg)
    avisarPortal({ tipo: 'vendas:precisa-sessao' })
  })
}

// Aplica toda sessão que o portal empurrar (ele reenvia a cada TOKEN_REFRESHED).
export function ouvirSessaoDoPortal(auth) {
  const onMsg = (e) => {
    if (!ehSessaoDoPortal(e)) return
    auth.setSession({ access_token: e.data.access_token, refresh_token: e.data.refresh_token })
  }
  window.addEventListener('message', onMsg)
  return () => window.removeEventListener('message', onMsg)
}

// Substitui supabase.auth.refreshSession() em todo o app.
export async function renovarSessao(auth) {
  if (!estaEmbutido()) return auth.refreshSession()
  const tokens = await pedirSessaoAoPortal()
  return auth.setSession(tokens)
}
