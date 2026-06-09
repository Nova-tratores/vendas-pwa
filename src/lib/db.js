const DB_NAME = 'vendas-offline'
const DB_VERSION = 7
const STORES = ['clientes', 'propriedades', 'pessoas', 'maquinas', 'visitas', 'negocios', 'cidades', 'opcoes_maquina', 'cat_maquinas']

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    // Upgrade ADITIVO: só cria o que falta, nunca apaga (preserva dados/pendentes
    // ao subir de versão). Index é criado dentro do bloco de criação da store.
    req.onupgradeneeded = (e) => {
      const db = e.target.result

      STORES.forEach((name) => {
        if (db.objectStoreNames.contains(name)) return
        const store = db.createObjectStore(name, { keyPath: 'id', autoIncrement: true })
        store.createIndex('status_sync', 'status_sync', { unique: false })
        if (name === 'propriedades') store.createIndex('cliente_dono_id', 'cliente_dono_id')
        if (name === 'pessoas') store.createIndex('propriedade_id', 'propriedade_id')
        if (name === 'maquinas') store.createIndex('propriedade_id', 'propriedade_id')
        if (name === 'visitas') store.createIndex('propriedade_id', 'propriedade_id')
        if (name === 'negocios') store.createIndex('cliente_id', 'cliente_id')
      })

      if (!db.objectStoreNames.contains('fotos_pendentes')) {
        db.createObjectStore('fotos_pendentes', { keyPath: 'visita_id' })
      }

      if (!db.objectStoreNames.contains('logs')) {
        const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true })
        logStore.createIndex('status_sync', 'status_sync', { unique: false })
        logStore.createIndex('entidade', 'entidade')
        logStore.createIndex('entidade_id', 'entidade_id')
      }

      // Mapa de id local -> id do servidor (reconciliação de sync). key = "store:localId"
      if (!db.objectStoreNames.contains('id_map')) {
        db.createObjectStore('id_map', { keyPath: 'key' })
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// ============================================
// RECONCILIAÇÃO DE ID (local <-> servidor)
// ============================================

// Relações FK do app: para cada store, campos que apontam pra um "store pai".
// Usado pra traduzir antes do push e pra remapear filhos no pull.
export const FK_REFS = {
  propriedades: [{ campo: 'cliente_dono_id', pai: 'clientes' }],
  negocios: [{ campo: 'cliente_id', pai: 'clientes' }, { campo: 'propriedade_id', pai: 'propriedades' }],
  pessoas: [{ campo: 'propriedade_id', pai: 'propriedades' }],
  maquinas: [{ campo: 'propriedade_id', pai: 'propriedades' }],
  visitas: [{ campo: 'propriedade_id', pai: 'propriedades' }, { campo: 'negocio_id', pai: 'negocios' }],
}

// Chave de conteúdo por store: identifica o "mesmo" registro entre local e servidor
// (pra casar o gêmeo criado offline com o que voltou do servidor com outro id).
export function chaveConteudo(store, r) {
  if (!r) return null
  switch (store) {
    case 'clientes': return [r.nome, r.created_at].join('|')
    case 'propriedades': return [r.nome_fantasia, r.created_at].join('|')
    case 'negocios': return [r.created_at, r.valor, r.status].join('|')
    case 'visitas': return [r.created_at, r.data_visita, r.resumo].join('|')
    case 'pessoas': return [r.nome, r.telefone, r.created_at].join('|')
    case 'maquinas': return [r.modelo, r.numero_serie, r.created_at].join('|')
    case 'cidades': return [(r.nome || '').toLowerCase(), (r.uf || '').toUpperCase()].join('|')
    case 'opcoes_maquina': return [r.familia_nome, r.marca, r.modelo].join('|')
    default: return null
  }
}

let idMapCache = null
async function carregarIdMap() {
  if (idMapCache) return idMapCache
  const db = await openDB()
  idMapCache = await new Promise((res, rej) => {
    const req = db.transaction('id_map', 'readonly').objectStore('id_map').getAll()
    req.onsuccess = () => {
      const m = new Map()
      for (const row of req.result) m.set(row.key, row.server_id)
      res(m)
    }
    req.onerror = () => rej(req.error)
  })
  return idMapCache
}

/** id do servidor pra um id local, ou null se não há mapeamento. */
export async function getServerId(store, localId) {
  if (localId == null) return null
  const m = await carregarIdMap()
  const v = m.get(`${store}:${localId}`)
  return v == null ? null : v
}

/** Grava o mapeamento local->servidor. */
export async function mapearId(store, localId, serverId) {
  if (localId == null || serverId == null || localId === serverId) return
  const db = await openDB()
  await new Promise((res, rej) => {
    const req = db.transaction('id_map', 'readwrite').objectStore('id_map')
      .put({ key: `${store}:${localId}`, store, local_id: localId, server_id: serverId })
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
  const m = await carregarIdMap()
  m.set(`${store}:${localId}`, serverId)
}

/**
 * Reescreve as FKs dos filhos locais que apontam pro id antigo do pai.
 * Ex.: pai 'clientes' 5->30 => negocios.cliente_id 5 vira 30, propriedades.cliente_dono_id 5 vira 30.
 */
export async function remapearFilhos(paiStore, oldId, newId) {
  if (oldId === newId) return
  for (const [filhoStore, refs] of Object.entries(FK_REFS)) {
    const campos = refs.filter((r) => r.pai === paiStore).map((r) => r.campo)
    if (campos.length === 0) continue
    const registros = await getAllRecords(filhoStore)
    for (const reg of registros) {
      let mudou = false
      for (const campo of campos) {
        if (reg[campo] === oldId) { reg[campo] = newId; mudou = true }
      }
      if (mudou) await saveRecord(filhoStore, { ...reg, status_sync: reg.status_sync })
    }
  }
}

// Gera um id LOCAL único e NEGATIVO para registros criados no dispositivo.
// Ids do servidor (Supabase/Omie) são sempre positivos e começam em 1, então
// manter os locais no espaço negativo impede que um registro baixado pelo pull
// (gravado via put no id do servidor) sobrescreva um registro criado localmente
// que tinha o mesmo id pequeno. A reconciliação local<->servidor (chaveConteudo +
// id_map + remapearFilhos) continua funcionando com ids negativos.
let _localSeq = 0
function nextLocalId() {
  _localSeq = (_localSeq + 1) % 1000
  return -(Date.now() * 1000 + _localSeq)
}

export async function saveRecord(store, record) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    const objStore = tx.objectStore(store)
    const data = { ...record, status_sync: record.status_sync || 'pending' }

    // Criação nova (sem id): atribui id local negativo e usa put (não autoIncrement,
    // que geraria ids pequenos positivos colidindo com os ids do servidor no pull).
    // Edição ou registro vindo do pull (já tem id): put normal.
    if (data.id == null) data.id = nextLocalId()
    const req = objStore.put(data)
    req.onsuccess = () => {
      // Escrita local pendente: avisa o sync pra agendar um push automático.
      // O pull grava com status_sync 'synced', então não dispara (evita loop).
      if (data.status_sync === 'pending' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('vendas:pending-write'))
      }
      res(req.result) // retorna o id gerado
    }
    req.onerror = () => rej(req.error)
  })
}

export async function getAllRecords(store) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function getRecord(store, id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const numId = typeof id === 'string' ? parseInt(id) : id
    const req = db.transaction(store, 'readonly').objectStore(store).get(numId)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

// Limpa todos os registros de uma store (usado pra repovoar caches read-only).
export async function clearStore(store) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readwrite').objectStore(store).clear()
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function deleteRecord(store, id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const numId = typeof id === 'string' ? parseInt(id) : id
    const req = db.transaction(store, 'readwrite').objectStore(store).delete(numId)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function getByIndex(store, indexName, value) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value
    const req = db.transaction(store, 'readonly')
      .objectStore(store)
      .index(indexName)
      .getAll(numValue)
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function getPendingRecords(store) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction(store, 'readonly')
      .objectStore(store).index('status_sync').getAll('pending')
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function markAsSynced(store, id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(store, 'readwrite')
    const objStore = tx.objectStore(store)
    const get = objStore.get(id)
    get.onsuccess = () => {
      const r = get.result
      if (r) { r.status_sync = 'synced'; objStore.put(r).onsuccess = () => res() }
    }
    get.onerror = () => rej(get.error)
  })
}

export async function saveFotoPendente(visita_id, blob) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction('fotos_pendentes', 'readwrite')
      .objectStore('fotos_pendentes').put({ visita_id, blob })
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function getFotosPendentes() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction('fotos_pendentes', 'readonly')
      .objectStore('fotos_pendentes').getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function deleteFotoPendente(visita_id) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction('fotos_pendentes', 'readwrite')
      .objectStore('fotos_pendentes').delete(visita_id)
    req.onsuccess = () => res()
    req.onerror = () => rej(req.error)
  })
}

export async function updateFotoPath(visita_id, foto_path) {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction('visitas', 'readwrite')
    const store = tx.objectStore('visitas')
    const get = store.get(visita_id)
    get.onsuccess = () => {
      const r = get.result
      if (r) { r.foto_path = foto_path; store.put(r).onsuccess = () => res() }
    }
    get.onerror = () => rej(get.error)
  })
}

// ============================================
// LOGS DE AUDITORIA
// ============================================

// acao: 'criar' | 'alterar' | 'excluir'
// entidade: 'clientes' | 'propriedades' | 'pessoas' | 'maquinas' | 'visitas' | 'negocios'
export async function registrarLog(acao, entidade, entidade_id, detalhes) {
  const db = await openDB()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  return new Promise((res, rej) => {
    const req = db.transaction('logs', 'readwrite')
      .objectStore('logs')
      .add({
        acao,
        entidade,
        entidade_id,
        vendedor_id: vendedor.id || null,
        vendedor_nome: vendedor.nome || '',
        detalhes: detalhes || '',
        data_hora: new Date().toISOString(),
        status_sync: 'pending',
      })
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

export async function getLogs() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const req = db.transaction('logs', 'readonly').objectStore('logs').getAll()
    req.onsuccess = () => res(req.result)
    req.onerror = () => rej(req.error)
  })
}

/**
 * Limpa TODOS os stores do IndexedDB.
 * Usado no logout e ao detectar vendedor diferente do que esta em cache.
 * Garante isolamento: vendedor B nao acessa dados que vendedor A baixou no celular.
 */
export async function clearAll() {
  const db = await openDB()
  idMapCache = null
  const allStores = [...STORES, 'logs', 'fotos_pendentes', 'id_map']
  return new Promise((res, rej) => {
    const tx = db.transaction(allStores, 'readwrite')
    let pending = allStores.length
    let erro = null
    allStores.forEach((name) => {
      const req = tx.objectStore(name).clear()
      req.onsuccess = () => {
        if (--pending === 0) erro ? rej(erro) : res()
      }
      req.onerror = () => {
        erro = req.error
        if (--pending === 0) rej(erro)
      }
    })
  })
}

/**
 * Limpa só os registros JÁ SINCRONIZADOS (status_sync === 'synced'), preservando
 * os pendentes (criados/editados localmente e ainda não enviados). Usado no
 * force_resync do supervisor: re-popula o cache sem destruir trabalho do
 * vendedor que ainda não subiu. Não toca em 'logs' nem 'fotos_pendentes'.
 */
export async function clearSyncedOnly() {
  const db = await openDB()
  return new Promise((res, rej) => {
    const tx = db.transaction(STORES, 'readwrite')
    let pending = STORES.length
    let erro = null
    const done = () => { if (--pending === 0) erro ? rej(erro) : res() }
    STORES.forEach((name) => {
      const objStore = tx.objectStore(name)
      const cur = objStore.openCursor()
      cur.onsuccess = (e) => {
        const c = e.target.result
        if (c) {
          if (c.value.status_sync !== 'pending') objStore.delete(c.primaryKey)
          c.continue()
        } else {
          done()
        }
      }
      cur.onerror = () => { erro = cur.error; done() }
    })
  })
}
