// Perfil de gamificação do vendedor lido do IndexedDB (as visitas dele já
// sincronizadas no aparelho). Regras em ./gamificacao.
import { getAllRecords } from './db'
import { perfilVendedor } from './gamificacao'

export async function carregarPerfil(hoje = new Date()) {
  const [visitas, pessoas, propriedades] = await Promise.all([
    getAllRecords('visitas'), getAllRecords('pessoas'), getAllRecords('propriedades'),
  ])
  const ctx = {
    pessoasById: Object.fromEntries(pessoas.map((p) => [p.id, p])),
    propById: Object.fromEntries(propriedades.map((p) => [p.id, p])),
  }
  return perfilVendedor(visitas, ctx, hoje)
}
