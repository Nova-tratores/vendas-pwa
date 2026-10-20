// =============================================================================
// Minha rota (feed do vendedor) — regras puras. O portal (Inteligência de Vendas) grava
// em iv_feed_pool a reserva de contatos de cada vendedor (carteira, recuperar, novos),
// com cidade e posição. Aqui: o teste de perfil, a mistura de cada perfil e as três
// formas de rota (cidades do dia, ordem pelo mapa, semana planejada).
// José, 20/10/2026.
// =============================================================================

/** Loja da Nova Tratores em Piraju (ponto de partida padrão da rota). */
export const LOJA = [-23.2085475, -49.3709057]

export const TIPOS = {
  carteira: { nome: 'Carteira', cor: '#dc2626', fundo: '#fef2f2', icone: '🤝', frase: 'já compra com a gente' },
  recuperar: { nome: 'Recuperar', cor: '#d97706', fundo: '#fffbeb', icone: '🔁', frase: 'negócio parado ou perdido' },
  novos: { nome: 'Cliente novo', cor: '#16a34a', fundo: '#f0fdf4', icone: '🌱', frase: 'ainda não compra com a gente' },
}

export const PERFIS = {
  conquistador: {
    nome: 'Conquistador', icone: '🚀', cor: '#16a34a',
    texto: 'Você gosta de abrir porteira e conhecer gente nova. Seu feed traz mais propriedades que ainda não compram com a gente.',
    mix: { novos: 0.5, carteira: 0.3, recuperar: 0.2 },
  },
  relacionamento: {
    nome: 'Relacionamento', icone: '🤝', cor: '#dc2626',
    texto: 'Você ganha pela confiança e pela presença. Seu feed traz mais clientes da carteira para renovar e vender implemento.',
    mix: { carteira: 0.6, recuperar: 0.25, novos: 0.15 },
  },
  negociador: {
    nome: 'Negociador', icone: '💼', cor: '#d97706',
    texto: 'Você é bom de fechar e de virar o jogo. Seu feed traz mais propostas paradas e clientes que perderam negócio.',
    mix: { recuperar: 0.5, carteira: 0.3, novos: 0.2 },
  },
  equilibrado: {
    nome: 'Equilibrado', icone: '⚖️', cor: '#991b1b',
    texto: 'Você vai bem em tudo. Seu feed mistura carteira, recuperação e clientes novos na mesma medida.',
    mix: { carteira: 0.4, recuperar: 0.35, novos: 0.25 },
  },
}

// cada resposta soma 2 pontos num dos três jeitos de vender
const C = 'conquista', R = 'relacionamento', N = 'negociacao'
export const PERGUNTAS = [
  { texto: 'Que tipo de dia de trabalho te deixa mais animado?', opcoes: [
    { texto: 'Conhecer gente nova e abrir porteira', eixo: C },
    { texto: 'Visitar quem já é cliente e ver como está a máquina', eixo: R },
    { texto: 'Fechar aquele negócio que estava parado', eixo: N }] },
  { texto: 'Um produtor diz "agora não". O que você faz?', opcoes: [
    { texto: 'Parto para o próximo: tem muita gente para conhecer', eixo: C },
    { texto: 'Combino de voltar e mantenho contato', eixo: R },
    { texto: 'Descubro o motivo e volto com outra proposta', eixo: N }] },
  { texto: 'O que você faz melhor?', opcoes: [
    { texto: 'Puxar conversa com quem nunca me viu', eixo: C },
    { texto: 'Ganhar a confiança e virar amigo do produtor', eixo: R },
    { texto: 'Negociar preço, prazo e financiamento', eixo: N }] },
  { texto: 'Na sua região, o que mais te traz venda?', opcoes: [
    { texto: 'Fazendas que ainda não compram com a gente', eixo: C },
    { texto: 'Clientes antigos que renovam ou compram implemento', eixo: R },
    { texto: 'Propostas que precisam de um empurrão', eixo: N }] },
  { texto: 'Como você prefere planejar a semana?', opcoes: [
    { texto: 'Rodando cidades e propriedades novas', eixo: C },
    { texto: 'Seguindo a agenda de visitas dos clientes', eixo: R },
    { texto: 'Priorizando quem tem proposta aberta', eixo: N }] },
  { texto: 'Perdeu uma venda para a concorrência. E agora?', opcoes: [
    { texto: 'Bola para frente, foco nos novos', eixo: C },
    { texto: 'Continuo visitando: uma hora ele troca', eixo: R },
    { texto: 'Pergunto o que faltou e tento reverter', eixo: N }] },
  { texto: 'O que mais te incomoda?', opcoes: [
    { texto: 'Ficar só nos mesmos clientes', eixo: C },
    { texto: 'Cliente que compra e some', eixo: R },
    { texto: 'Proposta esquecida na gaveta', eixo: N }] },
  { texto: 'Como você quer ser lembrado pelo cliente?', opcoes: [
    { texto: 'Quem trouxe a Mahindra para a fazenda dele', eixo: C },
    { texto: 'O vendedor de confiança que sempre aparece', eixo: R },
    { texto: 'Quem conseguiu a melhor condição', eixo: N }] },
]

/** respostas = índice da opção escolhida em cada pergunta. */
export function resultadoTeste(respostas) {
  const pontos = { conquista: 0, relacionamento: 0, negociacao: 0 }
  respostas.forEach((r, i) => { const op = PERGUNTAS[i]?.opcoes[r]; if (op) pontos[op.eixo] += 2 })
  const ordem = Object.entries(pontos).sort((a, b) => b[1] - a[1])
  const [primeiro, segundo] = ordem
  const perfil = primeiro[1] - segundo[1] <= 2 ? 'equilibrado'
    : primeiro[0] === 'conquista' ? 'conquistador' : primeiro[0] === 'relacionamento' ? 'relacionamento' : 'negociador'
  // a mistura sai dos pontos (cada jeito tem no mínimo 15%) — mais fiel que o perfil sozinho
  const total = pontos.conquista + pontos.relacionamento + pontos.negociacao || 1
  const parte = (p) => 0.15 + 0.55 * (p / total)
  const bruto = { novos: parte(pontos.conquista), carteira: parte(pontos.relacionamento), recuperar: parte(pontos.negociacao) }
  const soma = bruto.novos + bruto.carteira + bruto.recuperar
  const mix = Object.fromEntries(Object.entries(bruto).map(([k, v]) => [k, Math.round((v / soma) * 100) / 100]))
  return { pontos, perfil, mix }
}

export function haversineKm(a, b) {
  if (!a || !b || a[0] == null || b[0] == null) return null
  const R = 6371, rad = (x) => (x * Math.PI) / 180
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Escolhe `n` contatos respeitando a mistura do perfil; os mais urgentes de cada tipo primeiro, intercalados. */
export function aplicarMix(itens, mix, n) {
  const por = (t) => itens.filter((i) => i.tipo === t).sort((a, b) => b.peso - a.peso)
  const listas = { carteira: por('carteira'), recuperar: por('recuperar'), novos: por('novos') }
  const cota = Object.fromEntries(Object.keys(listas).map((t) => [t, Math.round((mix[t] || 0) * n)]))
  // o que um tipo não tem passa para os outros
  let sobra = 0
  for (const t of Object.keys(listas)) { if (listas[t].length < cota[t]) { sobra += cota[t] - listas[t].length; cota[t] = listas[t].length } }
  for (const t of Object.keys(listas).sort((a, b) => (mix[b] || 0) - (mix[a] || 0))) {
    const cabe = Math.min(sobra, listas[t].length - cota[t]); cota[t] += cabe; sobra -= cabe
  }
  const out = []
  for (let i = 0; out.length < n; i++) {
    let pos = false
    for (const t of ['carteira', 'recuperar', 'novos']) if (i < cota[t] && listas[t][i]) { out.push(listas[t][i]); pos = true }
    if (!pos) break
  }
  return out.slice(0, n)
}

/** Cidades da reserva com quantos contatos e a posição média. */
export function resumoCidades(itens) {
  const m = new Map()
  for (const it of itens) {
    if (!it.cidade) continue
    const c = m.get(it.cidade) || { cidade: it.cidade, qtd: 0, valor: 0, porTipo: { carteira: 0, recuperar: 0, novos: 0 }, lats: [], lngs: [] }
    c.qtd++; c.valor += it.peso; c.porTipo[it.tipo]++
    if (it.lat != null) { c.lats.push(it.lat); c.lngs.push(it.lng) }
    m.set(it.cidade, c)
  }
  return [...m.values()].map((c) => ({
    cidade: c.cidade, qtd: c.qtd, valor: c.valor, porTipo: c.porTipo,
    pos: c.lats.length ? [c.lats.reduce((a, b) => a + b, 0) / c.lats.length, c.lngs.reduce((a, b) => a + b, 0) / c.lngs.length] : null,
  })).sort((a, b) => b.valor - a.valor)
}

/** Cidades do dia sugeridas: a de mais valor e as vizinhas (até 45 km dela). */
export function sugerirCidadesDoDia(cidades, max = 3) {
  if (!cidades.length) return []
  const [primeira, ...resto] = cidades
  const perto = resto.filter((c) => (haversineKm(primeira.pos, c.pos) ?? 999) <= 45).slice(0, max - 1)
  return [primeira, ...perto].map((c) => c.cidade)
}

/** Ordem pelo mapa: sempre o mais perto a seguir (vizinho mais próximo), a partir do início. */
export function ordemPeloMapa(itens, inicio = LOJA) {
  const resta = itens.filter((i) => i.lat != null)
  const semPos = itens.filter((i) => i.lat == null)
  const out = []
  let atual = inicio, km = 0
  while (resta.length) {
    let melhor = 0, dMelhor = Infinity
    resta.forEach((it, k) => { const d = haversineKm(atual, [it.lat, it.lng]); if (d < dMelhor) { dMelhor = d; melhor = k } })
    const [it] = resta.splice(melhor, 1)
    km += dMelhor
    out.push({ ...it, kmAteAqui: Math.round(km) })
    atual = [it.lat, it.lng]
  }
  const volta = haversineKm(atual, inicio) || 0
  // estrada não é linha reta: +30% (estimativa)
  return { itens: [...out, ...semPos], kmTotal: Math.round((km + volta) * 1.3) }
}

/** Semana planejada: divide as cidades em `dias` grupos vizinhos (pelo ângulo em volta da loja), equilibrando os contatos. */
export function planejarSemana(cidades, dias = 5, inicio = LOJA) {
  const com = cidades.filter((c) => c.pos)
  const ang = (c) => Math.atan2(c.pos[0] - inicio[0], c.pos[1] - inicio[1])
  const ordem = [...com].sort((a, b) => ang(a) - ang(b))
  const total = ordem.reduce((s, c) => s + c.qtd, 0)
  const alvo = total / dias
  const grupos = Array.from({ length: dias }, () => [])
  let g = 0, acum = 0
  for (const c of ordem) {
    if (acum >= alvo * (g + 1) && g < dias - 1) g++
    grupos[g].push(c); acum += c.qtd
  }
  const semPos = cidades.filter((c) => !c.pos)
  if (semPos.length) grupos[dias - 1].push(...semPos)
  return grupos
}
