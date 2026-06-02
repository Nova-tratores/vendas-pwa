import { createClient } from '@supabase/supabase-js'
import {
  getAllRecords, getPendingRecords, markAsSynced, saveRecord,
  getFotosPendentes, deleteFotoPendente, updateFotoPath, getLogs,
  clearAll, clearSyncedOnly,
} from './db'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Mapeamento: IndexedDB store -> Supabase table
const TABLE_MAP = {
  clientes: 'clientes_vendas',
  propriedades: 'Clientes',
  pessoas: 'pessoas',
  maquinas: 'maquinas',
  negocios: 'negocios',
  visitas: 'visitas',
}

// Ordem respeita FKs
const SYNC_ORDER = ['clientes', 'propriedades', 'pessoas', 'maquinas', 'negocios', 'visitas']

// Callbacks para notificar a UI
let onSyncStatusChange = null
export function setSyncCallback(cb) { onSyncStatusChange = cb }

function notify(status, detail) {
  if (onSyncStatusChange) onSyncStatusChange({ status, detail })
}

// ============================================
// PUSH: IndexedDB (pending) → Supabase
// ============================================

function mapForPush(store, record) {
  const { id, status_sync, ...clean } = record

  if (store === 'propriedades') {
    // IndexedDB "propriedades" → Supabase "Clientes"
    const mapped = { ...clean }
    if (mapped.nome) {
      mapped.nome_fantasia = mapped.nome
      delete mapped.nome
    }
    return mapped
  }

  return clean
}

async function pushRecords() {
  let totalPushed = 0

  for (const store of SYNC_ORDER) {
    const pending = await getPendingRecords(store)
    if (pending.length === 0) continue

    const supaTable = TABLE_MAP[store]
    notify('pushing', `Enviando ${pending.length} ${store}...`)

    for (const record of pending) {
      try {
        const mapped = mapForPush(store, record)

        // Tentar insert primeiro (registro novo criado offline)
        const { data, error } = await supabase
          .from(supaTable)
          .insert(mapped)
          .select()

        if (error) {
          if (error.code === '23505') {
            // Registro já existe - tentar update
            const { error: upErr } = await supabase
              .from(supaTable)
              .update(mapped)
              .eq('id', record.id)
            if (upErr) {
              console.error(`[Push] ${store} update:`, upErr.message)
              continue
            }
          } else {
            console.error(`[Push] ${store}:`, error.message)
            continue
          }
        }

        await markAsSynced(store, record.id)
        totalPushed++
      } catch (err) {
        console.error(`[Push] ${store}:`, err)
      }
    }
  }

  // Push logs de auditoria
  try {
    const logs = await getLogs()
    const pendingLogs = logs.filter((l) => l.status_sync === 'pending')
    for (const log of pendingLogs) {
      const { id, status_sync, ...clean } = log
      const { error } = await supabase.from('audit_logs_vendas').insert(clean)
      if (!error) await markAsSynced('logs', id)
    }
  } catch (err) {
    console.error('[Push] logs:', err)
  }

  return totalPushed
}

async function pushFotos() {
  const fotos = await getFotosPendentes()
  for (const { visita_id, blob } of fotos) {
    try {
      const path = `visitas/${visita_id}.jpg`
      notify('pushing', 'Enviando foto...')

      const { error } = await supabase.storage
        .from('fotos-visitas')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error

      await updateFotoPath(visita_id, path)

      // Atualizar foto_path na tabela visitas do Supabase
      await supabase
        .from('visitas')
        .update({ foto_path: path })
        .eq('id', visita_id)

      await deleteFotoPendente(visita_id)
    } catch (err) {
      console.error('[Push] foto:', err)
    }
  }
}

// ============================================
// PULL: Supabase → IndexedDB
// ============================================

function mapForPull(store, record) {
  if (store === 'propriedades') {
    // Supabase "Clientes" → IndexedDB "propriedades"
    return {
      id: record.id,
      cliente_dono_id: record.cliente_dono_id,
      nome: record.nome_fantasia || record.razao_social || '',
      nome_fantasia: record.nome_fantasia || '',
      razao_social: record.razao_social || '',
      cnpj_cpf: record.cnpj_cpf || '',
      telefone: record.telefone || '',
      email: record.email || '',
      endereco: record.endereco || '',
      cidade: record.cidade || '',
      estado: record.estado || '',
      area_hectares: record.area_hectares,
      culturas: record.culturas || [],
      latitude: record.latitude,
      longitude: record.longitude,
      observacoes: record.observacoes || '',
      created_at: record.created_at,
      status_sync: 'synced',
    }
  }

  return { ...record, status_sync: 'synced' }
}

/**
 * Pull com isolamento por vendedor:
 *   - clientes_vendas / negocios / visitas: filtro direto por vendedor_id
 *   - Clientes (propriedades): filtro via cliente_dono_id IN (ids dos clientes do vendedor)
 *   - pessoas / maquinas: filtro via propriedade_id IN (ids das propriedades do vendedor)
 *
 * Cada celular so baixa os dados do vendedor logado.
 * Sem vendedor_id (modo teste sem id real), pula tudo (zero pull).
 */
/**
 * Checa se o supervisor sinalizou force_resync no banco. Se sim e ainda
 * nao processamos esse carimbo localmente, limpa o IDB e devolve true
 * (caller deve fazer pull from scratch).
 */
async function checarForceResync(vendedorId) {
  try {
    const { data, error } = await supabase
      .from('vendedores')
      .select('force_resync_at')
      .eq('id', vendedorId)
      .maybeSingle()
    if (error || !data?.force_resync_at) return false
    const carimboServidor = data.force_resync_at
    const carimboLocal = localStorage.getItem('lastForceResync') || ''
    if (carimboServidor > carimboLocal) {
      console.log('[Sync] force_resync detectado, limpando cache (preserva pendentes)...')
      // Antes garante o envio de pendentes (não perder o que ainda não subiu),
      // depois limpa só os sincronizados. clearAll cego apagaria visitas/negócios
      // criados offline que ainda não chegaram ao Supabase.
      try { await pushRecords(); await pushFotos() } catch (e) { console.warn('[Sync] push pré-resync:', e) }
      await clearSyncedOnly()
      localStorage.setItem('lastForceResync', carimboServidor)
      return true
    }
  } catch (err) {
    console.warn('[Sync] checarForceResync falhou:', err)
  }
  return false
}

async function pullRecords() {
  let totalPulled = 0

  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const vendedorId = vendedor.id
  if (!vendedorId) {
    console.warn('[Pull] sem vendedor logado, pulando pull')
    return 0
  }

  // Se admin pediu force_resync, IDB foi limpo. Pull abaixo re-popula do zero.
  await checarForceResync(vendedorId)

  async function pullStore(store, query, mapFn = (r) => r) {
    notify('pulling', `Baixando ${store}...`)
    const { data, error } = await query
    if (error) {
      console.error(`[Pull] ${store}:`, error.message)
      return []
    }
    if (!data || data.length === 0) return []
    for (const record of data) {
      const mapped = mapFn(record)
      await saveRecord(store, mapped)
    }
    totalPulled += data.length
    return data
  }

  // 1. clientes (donos) do vendedor
  const clientesData = await pullStore(
    'clientes',
    supabase.from('clientes_vendas').select('*').eq('vendedor_id', vendedorId),
    (r) => mapForPull('clientes', r)
  )
  const clientesIds = clientesData.map((c) => c.id)

  // 2. propriedades (Supabase "Clientes") cujos donos sao do vendedor
  let propriedadesIds = []
  if (clientesIds.length > 0) {
    const propsData = await pullStore(
      'propriedades',
      supabase.from('Clientes').select('*').in('cliente_dono_id', clientesIds),
      (r) => mapForPull('propriedades', r)
    )
    propriedadesIds = propsData.map((p) => p.id)
  }

  // 3. pessoas dessas propriedades
  if (propriedadesIds.length > 0) {
    await pullStore(
      'pessoas',
      supabase.from('pessoas').select('*').in('propriedade_id', propriedadesIds),
      (r) => mapForPull('pessoas', r)
    )
    // 4. maquinas dessas propriedades
    await pullStore(
      'maquinas',
      supabase.from('maquinas').select('*').in('propriedade_id', propriedadesIds),
      (r) => mapForPull('maquinas', r)
    )
  }

  // 5. negocios do vendedor
  await pullStore(
    'negocios',
    supabase.from('negocios').select('*').eq('vendedor_id', vendedorId),
    (r) => mapForPull('negocios', r)
  )

  // 6. visitas do vendedor
  await pullStore(
    'visitas',
    supabase.from('visitas').select('*').eq('vendedor_id', vendedorId),
    (r) => mapForPull('visitas', r)
  )

  return totalPulled
}

// ============================================
// SYNC ALL: Push primeiro, depois Pull
// ============================================

let isSyncing = false

export async function syncAll() {
  if (isSyncing || !navigator.onLine) return

  // Verificar se tem sessão autenticada
  const { data: { session } } = await supabase.auth.getSession()
  const hasSession = !!session
  // Sem sessão: ainda faz pull (leitura), mas pula push (escrita)
  if (!hasSession) {
    console.log('[Sync] Sem sessão autenticada, apenas pull')
  }
  isSyncing = true

  try {
    notify('syncing', 'Sincronizando...')

    // 1. Push: enviar pendentes locais para o Supabase (só com sessão)
    let pushed = 0
    if (hasSession) {
      pushed = await pushRecords()
      await pushFotos()
    }

    // 2. Pull: baixar dados do Supabase para o IndexedDB
    const pulled = await pullRecords()

    notify('done', `Sync OK: ${pushed} enviados, ${pulled} baixados`)
    console.log(`[Sync] Push: ${pushed}, Pull: ${pulled}`)
  } catch (err) {
    notify('error', err.message)
    console.error('[Sync] erro geral:', err)
  } finally {
    isSyncing = false
    // Limpar status após 3 segundos
    setTimeout(() => notify('idle', ''), 3000)
  }
}

export async function pullOnly() {
  if (!navigator.onLine) return
  notify('pulling', 'Baixando dados...')
  try {
    const pulled = await pullRecords()
    notify('done', `${pulled} registros baixados`)
    setTimeout(() => notify('idle', ''), 3000)
  } catch (err) {
    notify('error', err.message)
  }
}

export async function pushOnly() {
  if (isSyncing || !navigator.onLine) return
  isSyncing = true
  notify('pushing', 'Enviando dados...')
  try {
    const pushed = await pushRecords()
    await pushFotos()
    notify('done', `${pushed} registros enviados`)
    setTimeout(() => notify('idle', ''), 3000)
  } catch (err) {
    notify('error', err.message)
  } finally {
    isSyncing = false
  }
}

// ============================================
// AUTO-PUSH: dispara um push (debounced) após escritas locais,
// pra não depender do botão SYNC / reload / reconexão.
// ============================================

let autoPushTimer = null

async function runAutoPush() {
  autoPushTimer = null
  if (isSyncing || !navigator.onLine) return
  // Sem sessão não dá pra escrever (RLS bloqueia) — espera o próximo gatilho.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return
  await pushOnly()
}

export function scheduleAutoPush(delay = 2000) {
  if (autoPushTimer) clearTimeout(autoPushTimer)
  autoPushTimer = setTimeout(runAutoPush, delay)
}

// Contagem de pendentes
export async function countPending() {
  let total = 0
  for (const store of SYNC_ORDER) {
    const pending = await getPendingRecords(store)
    total += pending.length
  }
  return total
}

// Verificador periódico: se há pendentes e tem internet, reenvia sozinho.
// Cobre itens que ficaram presos (falha passageira, sessão que voltou) sem
// depender de nova escrita, reconexão ou clique manual.
async function retryPendentesSeNecessario() {
  if (isSyncing || !navigator.onLine) return
  const pend = await countPending()
  if (pend > 0) scheduleAutoPush(0)
}

export function initSyncListener() {
  window.addEventListener('online', () => syncAll())
  // Auto-push após escritas locais (saveRecord dispara 'vendas:pending-write')
  window.addEventListener('vendas:pending-write', () => scheduleAutoPush())
  // Reenvia pendentes ao voltar pro app (reabrir aba / trazer pra frente)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') retryPendentesSeNecessario()
  })
  // Verificação periódica: pendência + internet => envia
  setInterval(retryPendentesSeNecessario, 30000)
  // Sync inicial se online
  if (navigator.onLine) syncAll()
}
