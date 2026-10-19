import { supabase } from './sync'

// Supervisor ativo ligado a este login (auth.users.id), ou null.
// Usado no login manual e na entrada automática pelo portal.
export async function buscarSupervisor(authUid) {
  const { data, error } = await supabase
    .from('supervisores')
    .select('*')
    .eq('auth_uid', authUid)
    .eq('ativo', true)
    .single()
  if (error || !data) return null
  return data
}

export function salvarSupervisor(sup) {
  localStorage.setItem('supervisor', JSON.stringify({
    id: sup.id,
    nome: sup.nome,
    email: sup.email,
    tipo: sup.tipo || 'admin',
  }))
}
