// Perfil de gamificação do vendedor lido do IndexedDB (as visitas dele já
// sincronizadas no aparelho). Regras em ./gamificacao.
import { getAllRecords } from './db'
import { perfilVendedor, resumoSemana } from './gamificacao'

const CHAVE_MISSOES = 'nt-missoes'

/**
 * Missões relâmpago (tabela vendas_missoes, criadas pelo supervisor). Guardadas
 * no aparelho: sem internet o XP continua saindo igual.
 */
export async function carregarMissoes() {
  let guardadas = []
  try { guardadas = JSON.parse(localStorage.getItem(CHAVE_MISSOES) || '[]') } catch { /* sem storage */ }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return guardadas
  try {
    const { supabase } = await import('./sync')
    const { data, error } = await supabase.from('vendas_missoes').select('*').order('inicio', { ascending: false }).limit(200)
    if (error) return guardadas // tabela ainda não criada
    try { localStorage.setItem(CHAVE_MISSOES, JSON.stringify(data || [])) } catch { /* sem storage */ }
    return data || []
  } catch {
    return guardadas
  }
}

/** Missões valendo agora (para o banner do Início e o formulário). */
export const missoesAtivas = (missoes, agora = Date.now()) =>
  (missoes || []).filter((m) => m.ativo !== false && new Date(m.inicio).getTime() <= agora && new Date(m.fim).getTime() >= agora)

async function carregarBase() {
  const [visitas, pessoas, propriedades, missoes] = await Promise.all([
    getAllRecords('visitas'), getAllRecords('pessoas'), getAllRecords('propriedades'), carregarMissoes(),
  ])
  const ctx = {
    pessoasById: Object.fromEntries(pessoas.map((p) => [p.id, p])),
    propById: Object.fromEntries(propriedades.map((p) => [p.id, p])),
  }
  return { visitas, ctx, missoes }
}

export async function carregarPerfil(hoje = new Date()) {
  const { visitas, ctx, missoes } = await carregarBase()
  return perfilVendedor(visitas, ctx, hoje, missoes)
}

/** Base completa (para o Bônus de Safra e afins). */
export const carregarBaseGamificacao = carregarBase

/** Resumo da semana do vendedor (resumo de sexta). */
export async function carregarResumoSemana(hoje = new Date()) {
  const { visitas, ctx, missoes } = await carregarBase()
  const r = resumoSemana(visitas, ctx, hoje, missoes)
  // nome da propriedade da melhor visita, para a tela
  if (r.melhor) r.melhor.propriedade = ctx.propById[r.melhor.v.propriedade_id]?.nome || ''
  return r
}
