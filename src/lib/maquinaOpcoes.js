import { supabase } from './sync'
import { buscarTodas } from './paginar'

export const ESTADOS_MAQUINA = ['otimo', 'bom', 'regular', 'critico']
export const ESTADO_LABELS = { otimo: 'Ótimo', bom: 'Bom', regular: 'Regular', critico: 'Crítico' }

export const FREQUENCIAS_USO = ['Diário', 'Semanal', 'Quinzenal', 'Mensal', 'Só na safra', 'Parada']

/**
 * Pares { tipo, marca_id } da view vw_marcas_por_tipo (tipo = família do Omie).
 * Cacheia em localStorage pra funcionar OFFLINE no cadastro em campo.
 */
export async function getMarcasPorTipo() {
  try {
    const linhas = await buscarTodas(() =>
      supabase.from('vw_marcas_por_tipo').select('tipo, marca_id').order('tipo').order('marca_id'))
    localStorage.setItem('cache_marcas_por_tipo', JSON.stringify(linhas))
    return linhas
  } catch {
    try { return JSON.parse(localStorage.getItem('cache_marcas_por_tipo') || '[]') } catch { return [] }
  }
}

/**
 * Nomes de marca relacionados ao tipo, na ordem de `marcas` ([{ id, nome }]).
 * Tipo sem nenhuma marca conhecida → null (o select mostra todas).
 */
export function marcasDoTipo(tipo, porTipo, marcas) {
  const ids = new Set(porTipo.filter((r) => r.tipo === tipo).map((r) => r.marca_id))
  const nomes = marcas.filter((m) => ids.has(m.id)).map((m) => m.nome)
  return nomes.length ? nomes : null
}
