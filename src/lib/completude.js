// Fonte única da regra de "propriedade completa" no app do vendedor.
// Uma propriedade é completa quando tem cultivos E pelo menos 1 máquina E pelo menos 1 pessoa.
// Espelha a regra que já era usada inline em Clientes.jsx (PropCard) e SupervisorClientes.jsx.

// nPessoas/nMaquinas: contagens já calculadas por propriedade_id (evita N queries).
export function completudePropriedade(prop, nPessoas = 0, nMaquinas = 0) {
  const temCultura = Array.isArray(prop?.culturas) && prop.culturas.length > 0
  const temPessoas = nPessoas > 0
  const temMaquinas = nMaquinas > 0

  const faltam = []
  if (!temCultura) faltam.push('cultivos')
  if (!temPessoas) faltam.push('pessoas')
  if (!temMaquinas) faltam.push('máquinas')

  return {
    temCultura,
    temPessoas,
    temMaquinas,
    faltam,                 // ex.: ['pessoas', 'máquinas']
    completa: faltam.length === 0,
  }
}

// Rótulo curto + ícone por campo faltante, pra montar chips no nudge.
export const FALTA_INFO = {
  cultivos: { icon: '🌱', rota: (propId) => '/clientes' },
  pessoas: { icon: '👥', rota: (propId) => `/pessoas/${propId}` },
  'máquinas': { icon: '🚜', rota: (propId) => `/maquinas/${propId}` },
}
