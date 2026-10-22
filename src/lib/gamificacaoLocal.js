// Perfil de gamificação do vendedor lido do IndexedDB (as visitas dele já
// sincronizadas no aparelho). Regras em ./gamificacao.
import { getAllRecords } from './db'
import { perfilVendedor, resumoSemana } from './gamificacao'

async function carregarBase() {
  const [visitas, pessoas, propriedades] = await Promise.all([
    getAllRecords('visitas'), getAllRecords('pessoas'), getAllRecords('propriedades'),
  ])
  const ctx = {
    pessoasById: Object.fromEntries(pessoas.map((p) => [p.id, p])),
    propById: Object.fromEntries(propriedades.map((p) => [p.id, p])),
  }
  return { visitas, ctx }
}

export async function carregarPerfil(hoje = new Date()) {
  const { visitas, ctx } = await carregarBase()
  return perfilVendedor(visitas, ctx, hoje)
}

/** Resumo da semana do vendedor (resumo de sexta). */
export async function carregarResumoSemana(hoje = new Date()) {
  const { visitas, ctx } = await carregarBase()
  const r = resumoSemana(visitas, ctx, hoje)
  // nome da propriedade da melhor visita, para a tela
  if (r.melhor) r.melhor.propriedade = ctx.propById[r.melhor.v.propriedade_id]?.nome || ''
  return r
}
