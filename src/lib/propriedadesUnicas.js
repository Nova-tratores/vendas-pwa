// O mesmo cliente vem duas vezes da base do Omie (cadastro na Nova e na Castro, mesmo
// CPF/CNPJ, ids diferentes): no celular do Márcio eram 880 de 1.783 propriedades
// (28/10/2026). Aqui fica uma cópia por documento — a que já foi trabalhada.

export const docDigitos = (p) => String(p?.cnpj_cpf || '').replace(/\D/g, '')

const preenchidos = (p) =>
  [p.cliente_dono_id, p.latitude ?? p.lat, p.area_hectares, p.culturas?.length, p.telefone].filter((x) => x != null && x !== '' && x !== 0).length

/**
 * Uma propriedade por CPF/CNPJ. `peso(p)` diz quanto aquela cópia já foi usada
 * (visitas, negócios, pessoas…): fica a de maior peso, depois a mais preenchida,
 * depois o menor id. Sem documento (menos de 11 dígitos) nunca é juntada.
 * Cada propriedade que fica ganha `_copias` com os ids das que saíram.
 */
export function unirCopias(propriedades, peso = () => 0) {
  const porDoc = new Map()
  const soltas = []
  for (const p of propriedades || []) {
    const d = docDigitos(p)
    if (d.length < 11) { soltas.push(p); continue }
    if (!porDoc.has(d)) porDoc.set(d, [])
    porDoc.get(d).push(p)
  }
  const unicas = []
  for (const grupo of porDoc.values()) {
    const [fica, ...saem] = [...grupo].sort((a, b) =>
      (peso(b) - peso(a)) || (preenchidos(b) - preenchidos(a)) || (Number(a.id) - Number(b.id)))
    unicas.push(saem.length ? { ...fica, _copias: saem.map((x) => x.id) } : fica)
  }
  return [...unicas, ...soltas]
}

/**
 * Onde o termo casou na propriedade: 'nome' (nome, razão social, dono, contato),
 * 'cidade', 'endereco' (só no endereço/bairro) ou null. Serve para pôr primeiro
 * quem é da cidade ou tem o nome, e marcar quem só aparece por causa da rua.
 */
export function ondeCasou(p, termo, { dono = '', contato = '' } = {}) {
  const t = termo.trim().toLowerCase()
  if (!t) return null
  const tem = (...xs) => xs.filter(Boolean).some((x) => String(x).toLowerCase().includes(t))
  if (tem(p.nome, p.nome_fantasia, p.razao_social, dono, contato, p.cnpj_cpf)) return 'nome'
  if (tem(p.cidade, p.estado)) return 'cidade'
  if (tem(p.endereco, p.bairro)) return 'endereco'
  return null
}
