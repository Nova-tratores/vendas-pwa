// O Supabase (PostgREST) corta cada resposta em 1000 linhas, sem avisar.
// Busca página por página até vir uma página incompleta.
// `montarQuery` devolve uma query NOVA a cada chamada, com .order() estável
// (sem ordem, as páginas podem repetir/pular linhas).
export async function buscarTodas(montarQuery, tamanho = 1000) {
  const out = []
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await montarQuery().range(de, de + tamanho - 1)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < tamanho) return out
  }
}
