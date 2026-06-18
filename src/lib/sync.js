import { createClient } from '@supabase/supabase-js'
import {
  getAllRecords, getPendingRecords, markAsSynced, saveRecord, deleteRecord,
  getFotosPendentes, deleteFotoPendente, updateFotoPath, getLogs,
  clearAll, clearSyncedOnly, clearStore,
  FK_REFS, chaveConteudo, getServerId, mapearId, remapearFilhos,
  repararFKsNegativasVisitas,
} from './db'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Mapeamento: IndexedDB store -> Supabase table
const TABLE_MAP = {
  clientes: 'clientes_vendas',
  propriedades: 'portal_nt_clientes_PRINCIPAL',
  pessoas: 'pessoas',
  maquinas: 'maquinas',
  negocios: 'negocios',
  visitas: 'visitas',
  cidades: 'cidades',
  opcoes_maquina: 'opcoes_maquina',
}

// Ordem respeita FKs. cidades/opcoes_maquina são opções compartilhadas (push das criações).
const SYNC_ORDER = ['clientes', 'propriedades', 'pessoas', 'maquinas', 'negocios', 'visitas', 'cidades', 'opcoes_maquina']

// Callbacks para notificar a UI
let onSyncStatusChange = null
export function setSyncCallback(cb) { onSyncStatusChange = cb }

function notify(status, detail) {
  if (onSyncStatusChange) onSyncStatusChange({ status, detail })
}

// Sinaliza à UI que há pendentes mas a sessão expirou (vendedor precisa reentrar)
let onAuthRequired = null
export function setAuthRequiredCallback(cb) { onAuthRequired = cb }
function sinalizarAuth(precisa) { if (onAuthRequired) onAuthRequired(precisa) }

// ============================================
// PUSH: IndexedDB (pending) → Supabase
// ============================================

function mapForPush(store, record) {
  // _srv é flag interna (registro veio do servidor) — não vai pro Supabase.
  const { id, status_sync, _srv, ...clean } = record

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

// Traduz as FKs locais do registro pros ids do servidor (via id_map), quando houver.
async function traduzFKs(store, record) {
  const refs = FK_REFS[store]
  if (!refs) return record
  const out = { ...record }
  for (const { campo, pai } of refs) {
    if (out[campo] != null) {
      const sid = await getServerId(pai, out[campo])
      if (sid != null) out[campo] = sid
    }
  }
  return out
}

async function pushRecords() {
  let totalPushed = 0
  const failed = []

  for (const store of SYNC_ORDER) {
    const pending = await getPendingRecords(store)
    if (pending.length === 0) continue

    const supaTable = TABLE_MAP[store]
    notify('pushing', `Enviando ${pending.length} ${store}...`)

    for (const record of pending) {
      try {
        // Traduz FKs (cliente_id, propriedade_id, etc) pro id do servidor antes de inserir
        const mapped = mapForPush(store, await traduzFKs(store, record))

        if (record._srv === true) {
          // Já existe no servidor (veio de um pull): EDIÇÃO → UPDATE pelo id.
          // (Insert criaria duplicata, pois a coluna id é GENERATED ALWAYS.)
          const { data: upd, error: upErr } = await supabase
            .from(supaTable).update(mapped).eq('id', record.id).select()
          if (upErr) {
            failed.push({ store, id: record.id, code: upErr.code, message: upErr.message })
            console.error(`[Push] ${store} #${record.id} update:`, upErr.code, upErr.message)
            continue
          }
          // Se o update não achou a linha (sumiu no servidor), cai pra insert.
          if (!upd || upd.length === 0) {
            const { data: ins, error: insErr } = await supabase.from(supaTable).insert(mapped).select()
            if (insErr) {
              failed.push({ store, id: record.id, code: insErr.code, message: insErr.message })
              console.error(`[Push] ${store} #${record.id} insert:`, insErr.code, insErr.message)
              continue
            }
            if (ins && ins[0] && ins[0].id !== record.id) await mapearId(store, record.id, ins[0].id)
          }
        } else {
          // Registro novo criado offline: INSERT.
          const { data, error } = await supabase.from(supaTable).insert(mapped).select()
          if (error) {
            if (error.code === '23505') {
              const { error: upErr } = await supabase.from(supaTable).update(mapped).eq('id', record.id)
              if (upErr) {
                failed.push({ store, id: record.id, code: upErr.code, message: upErr.message })
                console.error(`[Push] ${store} #${record.id} update:`, upErr.code, upErr.message)
                continue
              }
            } else {
              failed.push({ store, id: record.id, code: error.code, message: error.message })
              console.error(`[Push] ${store} #${record.id}:`, error.code, error.message)
              continue
            }
          } else if (data && data[0] && data[0].id !== record.id) {
            // Servidor gerou outro id: guarda o mapeamento pros filhos apontarem certo
            await mapearId(store, record.id, data[0].id)
          }
        }

        await markAsSynced(store, record.id)
        totalPushed++
      } catch (err) {
        failed.push({ store, id: record.id, message: String(err) })
        console.error(`[Push] ${store} #${record.id}:`, err)
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

  return { pushed: totalPushed, failed }
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

  // Grava linhas já carregadas do servidor, reconciliando o "gêmeo" criado
  // offline (id local) com o que voltou do servidor (id novo).
  async function savePulled(store, rows, mapFn = (r) => r) {
    if (!rows || rows.length === 0) return []

    const locais = await getAllRecords(store)
    const idxLocal = new Map()
    for (const loc of locais) {
      if (loc.status_sync !== 'synced') continue
      const ch = chaveConteudo(store, loc)
      if (ch) idxLocal.set(ch, loc)
    }

    for (const record of rows) {
      const mapped = mapFn(record)
      mapped._srv = true // veio do servidor: edições futuras fazem UPDATE, não INSERT
      const ch = chaveConteudo(store, mapped)
      const gemeo = ch ? idxLocal.get(ch) : null
      if (gemeo && gemeo.id !== mapped.id) {
        // Mesmo registro com id local diferente: mapeia, reaponta os filhos e
        // remove a duplicata local, ficando só com o id do servidor.
        await mapearId(store, gemeo.id, mapped.id)
        await remapearFilhos(store, gemeo.id, mapped.id)
        await deleteRecord(store, gemeo.id)
        idxLocal.delete(ch)
      }
      await saveRecord(store, mapped)
    }
    totalPulled += rows.length
    return rows
  }

  async function pullStore(store, query, mapFn = (r) => r) {
    notify('pulling', `Baixando ${store}...`)
    const { data, error } = await query
    if (error) {
      console.error(`[Pull] ${store}:`, error.message)
      return []
    }
    return savePulled(store, data, mapFn)
  }

  // Busca em "portal_nt_clientes_PRINCIPAL" filtrando por uma coluna com lista
  // de valores, em lotes pra não estourar o tamanho da URL.
  async function fetchClientesIn(coluna, valores) {
    const out = []
    for (let i = 0; i < valores.length; i += 200) {
      const chunk = valores.slice(i, i + 200)
      const { data, error } = await supabase.from('portal_nt_clientes_PRINCIPAL').select('*').in(coluna, chunk)
      if (error) { console.error(`[Pull] propriedades por ${coluna}:`, error.message); continue }
      if (data) out.push(...data)
    }
    return out
  }

  // 1. clientes (donos) do vendedor
  const clientesData = await pullStore(
    'clientes',
    supabase.from('clientes_vendas').select('*').eq('vendedor_id', vendedorId),
    (r) => mapForPull('clientes', r)
  )
  const clientesIds = clientesData.map((c) => c.id)

  // 2. propriedades (Supabase "Clientes"): UNIÃO de três fontes —
  //    (a) cidades atribuídas ao vendedor (vendedor_cidades)
  //    (b) donos do vendedor (cliente_dono_id) — clientes criados no check-in
  //    (c) histórico — propriedades com visita/negócio do vendedor
  //    Assim o vendedor enxerga a base do ERP da sua região sem perder o que já trabalhou.
  let propriedadesIds = []
  {
    notify('pulling', 'Baixando propriedades...')

    // (a) cidades atribuídas
    let cidades = []
    try {
      const { data: vc } = await supabase
        .from('vendedor_cidades').select('cidade').eq('vendedor_id', vendedorId)
      cidades = [...new Set((vc || []).map((r) => r.cidade).filter(Boolean))]
    } catch (e) { console.warn('[Pull] vendedor_cidades:', e) }

    // (c) histórico: ids de propriedade citados nas visitas/negócios do vendedor
    let histIds = []
    try {
      const [{ data: vis }, { data: neg }] = await Promise.all([
        supabase.from('visitas').select('propriedade_id').eq('vendedor_id', vendedorId),
        supabase.from('negocios').select('propriedade_id').eq('vendedor_id', vendedorId),
      ])
      const s = new Set()
      for (const r of vis || []) if (r.propriedade_id != null) s.add(r.propriedade_id)
      for (const r of neg || []) if (r.propriedade_id != null) s.add(r.propriedade_id)
      histIds = [...s]
    } catch (e) { console.warn('[Pull] histórico propriedades:', e) }

    // Coleta as três fontes e deduplica por id
    const byId = new Map()
    if (cidades.length > 0) for (const r of await fetchClientesIn('cidade', cidades)) byId.set(r.id, r)
    if (clientesIds.length > 0) for (const r of await fetchClientesIn('cliente_dono_id', clientesIds)) byId.set(r.id, r)
    if (histIds.length > 0) for (const r of await fetchClientesIn('id', histIds)) byId.set(r.id, r)

    const propsArr = [...byId.values()]
    await savePulled('propriedades', propsArr, (r) => mapForPull('propriedades', r))
    propriedadesIds = propsArr.map((p) => p.id)
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

  // 7. Opções compartilhadas (não isoladas por vendedor): cidades e marca/modelo criados
  await pullStore('cidades', supabase.from('cidades').select('*'), (r) => ({ ...r, status_sync: 'synced' }))
  await pullStore('opcoes_maquina', supabase.from('opcoes_maquina').select('*'), (r) => ({ ...r, status_sync: 'synced' }))

  // 8. Catálogo de máquinas (DISTINCT família/marca/modelo do ERP `produtos`) p/ a cascata offline.
  //    Cache read-only: limpa e repovoa; id = "familia|marca|modelo" (sem duplicar entre pulls).
  try {
    const { data: prod, error } = await supabase
      .from('produtos')
      .select('familia_nome, marca, modelo')
      .neq('familia_nome', 'Peças')
    if (!error && prod) {
      await clearStore('cat_maquinas')
      const seen = new Set()
      for (const p of prod) {
        const familia = (p.familia_nome || '').trim()
        if (!familia) continue
        const marca = (p.marca || '').trim()
        const modelo = (p.modelo || '').trim()
        const id = [familia, marca, modelo].join('|')
        if (seen.has(id)) continue
        seen.add(id)
        await saveRecord('cat_maquinas', { id, familia_nome: familia, marca, modelo, status_sync: 'synced' })
      }
      totalPulled += seen.size
    }
  } catch (e) {
    console.warn('[Pull] cat_maquinas:', e)
  }

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
    // Se há trabalho local pra enviar e a sessão caiu, avisa pra reentrar
    if ((await countPending()) > 0) sinalizarAuth(true)
  } else {
    sinalizarAuth(false)
  }
  isSyncing = true

  try {
    notify('syncing', 'Sincronizando...')

    // 1. Push: enviar pendentes locais para o Supabase (só com sessão)
    let pushed = 0
    let falhas = 0
    if (hasSession) {
      const res = await pushRecords()
      pushed = res.pushed
      falhas = res.failed.length
      await pushFotos()

      // 1b. Reparo: agora que o push subiu propriedades/pessoas que faltavam, o
      //     id_map tem o de->para. Religa as visitas que ainda apontam pra ids
      //     locais (negativos) e reenvia como UPDATE. Rodar ANTES do pull, com
      //     os negativos ainda intactos. (Cobre as visitas quebradas pelo bug
      //     da tabela de propriedades.)
      try {
        const religadas = await repararFKsNegativasVisitas()
        if (religadas > 0) {
          console.log(`[Sync] ${religadas} visita(s) religada(s), reenviando...`)
          const res2 = await pushRecords()
          pushed += res2.pushed
        }
      } catch (e) {
        console.warn('[Sync] reparo de FKs das visitas:', e)
      }
    }

    // 2. Pull: baixar dados do Supabase para o IndexedDB
    const pulled = await pullRecords()

    if (falhas > 0) {
      notify('error', `${falhas} não enviado(s) — tentando de novo automaticamente`)
    } else {
      notify('done', `Sync OK: ${pushed} enviados, ${pulled} baixados`)
    }
    console.log(`[Sync] Push: ${pushed} (falhas: ${falhas}), Pull: ${pulled}`)
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
    const res = await pushRecords()
    await pushFotos()
    if (res.failed.length > 0) {
      notify('error', `${res.failed.length} não enviado(s) — tentando de novo automaticamente`)
    } else {
      notify('done', `${res.pushed} registros enviados`)
    }
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
  // Sem sessão não dá pra escrever (RLS bloqueia) — avisa se há pendentes presos.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    if ((await countPending()) > 0) sinalizarAuth(true)
    return
  }
  sinalizarAuth(false)
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
