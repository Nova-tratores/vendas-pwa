// Quests do vendedor — regras puras (sem rede nem banco).
// Uma quest tem um ALVO (trator, cliente ou livre) e uma lista de ITENS que o
// vendedor traz da visita: número (horímetro), fotos, texto (relatos) e
// sim/não. O supervisor cria (manual) ou aprova as sugeridas pelo portal
// (automáticas). Tabelas: supabase-quests.sql; rede/fila: lib/questsLocal.js.

export const ROTULO_REGRA = {
  revisao_chegando: 'Revisão chegando',
  aniversario_entrega: 'Aniversário de entrega',
  cliente_sumido: 'Cliente sumido',
  trator_sem_noticia: 'Trator sem notícia',
}

export const ROTULO_STATUS = {
  sugerida: 'Sugerida', aberta: 'Em andamento', concluida: 'Concluída', descartada: 'Descartada', cancelada: 'Cancelada',
}

// Itens prontos (os mesmos que o portal usa nas automáticas — lib/vendas-app/quests-regras.ts)
export const ITENS_PRONTOS = [
  { chave: 'horimetro', tipo: 'numero', rotulo: 'Horímetro (horas)', obrigatorio: true },
  { chave: 'fotos', tipo: 'fotos', rotulo: 'Fotos do trator (painel com o horímetro + trator inteiro)', obrigatorio: true, min: 2 },
  { chave: 'relato_operador', tipo: 'texto', rotulo: 'Relato do operador (como o trator está indo, algum problema?)', obrigatorio: true },
  { chave: 'relato_dono', tipo: 'texto', rotulo: 'Relato do dono (satisfação, planos, o que precisa)', obrigatorio: true },
  { chave: 'ofereceu_revisao', tipo: 'simnao', rotulo: 'Ofereceu a revisão ao cliente?', obrigatorio: false },
]

/** Chave livre para uma pergunta nova ("Pergunta 1" → "pergunta_1"). */
export function chaveDePergunta(rotulo, usadas = []) {
  const base = String(rotulo || 'pergunta').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'pergunta'
  let c = base, n = 2
  while (usadas.includes(c)) c = `${base}_${n++}`
  return c
}

const vazio = (v) => v == null || (typeof v === 'string' && !v.trim())

/**
 * O que falta para enviar: itens obrigatórios sem resposta e fotos abaixo do
 * mínimo. `respostas` = {chave: valor}; fotos = array (blobs ou caminhos).
 */
export function faltando(itens, respostas) {
  const out = []
  for (const it of itens || []) {
    const v = respostas?.[it.chave]
    if (it.tipo === 'fotos') {
      const n = Array.isArray(v) ? v.length : 0
      const min = it.obrigatorio ? Math.max(1, Number(it.min) || 1) : 0
      if (n < min) out.push(min > 1 ? `${it.rotulo}: ${min - n} foto${min - n > 1 ? 's' : ''} a mais` : it.rotulo)
      continue
    }
    if (!it.obrigatorio) continue
    if (it.tipo === 'numero' && numeroDigitado(v) == null) out.push(it.rotulo)
    else if (it.tipo === 'simnao' && v !== true && v !== false) out.push(it.rotulo)
    else if (it.tipo === 'texto' && vazio(v)) out.push(it.rotulo)
  }
  return out
}

/** Horímetro digitado ("1.234,5" / "1234") → número, ou null. */
export function numeroDigitado(v) {
  const s = String(v ?? '').trim().replace(/\s/g, '')
  if (!s) return null
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s)
  return Number.isFinite(n) ? n : null
}

/** Situação do prazo: atrasada, vence hoje/em N dias, ou sem prazo. */
export function situacaoPrazo(prazo, hoje = new Date()) {
  if (!prazo) return null
  const d0 = new Date(hoje); d0.setHours(12, 0, 0, 0)
  const dias = Math.round((new Date(`${prazo}T12:00:00`) - d0) / 86400000)
  if (dias < 0) return { atrasada: true, texto: `atrasada ${-dias} dia${dias < -1 ? 's' : ''}` }
  if (dias === 0) return { atrasada: false, texto: 'vence hoje' }
  return { atrasada: false, texto: `vence em ${dias} dia${dias > 1 ? 's' : ''}` }
}

/** XP das quests do vendedor: concluídas + as que estão na fila esperando internet (não conta em dobro). */
export function xpDasQuests(quests, idsNaFila = []) {
  const fila = new Set((idsNaFila || []).map(Number))
  return (quests || []).reduce((s, q) => s + ((q.status === 'concluida' || fila.has(Number(q.id))) ? Number(q.xp) || 0 : 0), 0)
}

/** Quests que o vendedor ainda tem para fazer (abertas e fora da fila), as atrasadas primeiro. */
export function questsAFazer(quests, idsNaFila = []) {
  const fila = new Set((idsNaFila || []).map(Number))
  return (quests || [])
    .filter((q) => q.status === 'aberta' && !fila.has(Number(q.id)))
    .sort((a, b) => String(a.prazo || '9999').localeCompare(String(b.prazo || '9999')) || a.id - b.id)
}

/** Texto curto do alvo: "JIVO 2025 …F00710 · Paulo Rogério · Carlópolis". */
export function rotuloAlvo(q) {
  const trator = q.chassis ? `${q.modelo || 'Trator'} …${String(q.chassis).slice(-6)}` : null
  return [trator, q.cliente_nome, q.cidade].filter(Boolean).join(' · ')
}
