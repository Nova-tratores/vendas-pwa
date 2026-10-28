// Quests do vendedor — rede e fila offline.
// Leitura: as quests dele (RLS: só aberta/concluída do próprio vendedor), com
// cópia no aparelho (localStorage `nt-quests`) para abrir sem internet.
// Resposta: vai para uma FILA no IndexedDB próprio (`nt-quests`, com as fotos
// em Blob) e sai quando há internet: sobe as fotos para o bucket privado
// `vendas-quests/<quest_id>/<uuid>.jpg` e grava vendas_quest_respostas (upsert
// por quest_id — reenviar depois de uma devolução substitui). O banco conclui a
// quest por trigger. Regras puras em lib/quests.js.
import { supabase } from './sync'
import { xpDasQuests } from './quests'

const CHAVE_CACHE = 'nt-quests'
const BUCKET = 'vendas-quests'
const DB_NOME = 'nt-quests'

const meuId = () => { try { return Number(JSON.parse(localStorage.getItem('vendedor') || '{}').id) || null } catch { return null } }
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export const tabelaFaltando = (msg) => /vendas_quest/.test(String(msg || ''))

// ─── IndexedDB da fila ─────────────────────────────────────────────────────────
function abrirDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOME, 1)
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('fila')) req.result.createObjectStore('fila', { keyPath: 'quest_id' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function fila(modo, fn) {
  const db = await abrirDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fila', modo)
    const r = fn(tx.objectStore('fila'))
    tx.oncomplete = () => { db.close(); resolve(r?.result) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}
export const itensNaFila = () => fila('readonly', (s) => s.getAll()).then((x) => x || []).catch(() => [])
export const idsNaFila = async () => (await itensNaFila()).map((x) => Number(x.quest_id))

// ─── Leitura ───────────────────────────────────────────────────────────────────
function lerCache() { try { return JSON.parse(localStorage.getItem(CHAVE_CACHE) || 'null') } catch { return null } }

/** { quests, respostas: {quest_id: resposta}, offline, erro } — tenta a rede, cai na cópia do aparelho. */
export async function carregarMinhasQuests() {
  const id = meuId()
  if (!id) return { quests: [], respostas: {}, offline: false }
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    enviarFila().catch(() => {})
    const { data, error } = await supabase.from('vendas_quests').select('*').eq('vendedor_id', id).in('status', ['aberta', 'concluida'])
      .order('prazo', { ascending: true, nullsFirst: false }).order('id').limit(200)
    if (!error) {
      const { data: resp } = await supabase.from('vendas_quest_respostas').select('*').in('quest_id', (data || []).map((q) => q.id).concat(0))
      const respostas = Object.fromEntries((resp || []).map((r) => [r.quest_id, r]))
      const pacote = { quests: data || [], respostas, em: new Date().toISOString() }
      try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(pacote)) } catch { /* sem espaço */ }
      return { ...pacote, offline: false }
    }
    if (tabelaFaltando(error.message)) return { quests: [], respostas: {}, offline: false }
  }
  const c = lerCache()
  return { quests: c?.quests || [], respostas: c?.respostas || {}, offline: true }
}

/** XP das quests (concluídas + na fila), para a Garagem. */
export async function xpQuestsDoVendedor() {
  const c = lerCache()
  if (!c?.quests?.length) return 0
  return xpDasQuests(c.quests, await idsNaFila())
}

// ─── Resposta ──────────────────────────────────────────────────────────────────
/**
 * Guarda a resposta na fila e tenta enviar. `respostas` traz os textos/números;
 * `fotos` = Blobs novos; `fotosExistentes` = caminhos já no bucket (reenvio).
 */
export async function responderQuest(quest, { respostas, fotos = [], fotosExistentes = [], gps = null }) {
  const chaveFotos = (quest.itens || []).find((i) => i.tipo === 'fotos')?.chave || 'fotos'
  await fila('readwrite', (s) => s.put({
    quest_id: Number(quest.id), vendedor_id: meuId(), respostas, chaveFotos, fotos, fotosExistentes,
    enviadas: [], gps, client_uuid: uuid(), criado_em: new Date().toISOString(),
  }))
  return enviarFila()
}

let enviando = null
/** Envia o que estiver na fila (uma por vez). Devolve quantas saíram. */
export function enviarFila() {
  if (!enviando) enviando = enviar().finally(() => { enviando = null })
  return enviando
}

async function enviar() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 0
  let ok = 0
  for (const item of await itensNaFila()) {
    try {
      // fotos: sobe as que faltam e guarda o caminho na própria fila (não sobe duas vezes)
      const enviadas = [...(item.enviadas || [])]
      for (let i = enviadas.length; i < item.fotos.length; i++) {
        const caminho = `${item.quest_id}/${uuid()}.jpg`
        const { error } = await supabase.storage.from(BUCKET).upload(caminho, item.fotos[i], { contentType: 'image/jpeg', upsert: false })
        if (error) throw error
        enviadas.push(caminho)
        await fila('readwrite', (s) => s.put({ ...item, enviadas }))
      }
      const respostas = { ...item.respostas, [item.chaveFotos]: [...(item.fotosExistentes || []), ...enviadas] }
      const { error } = await supabase.from('vendas_quest_respostas').upsert({
        quest_id: item.quest_id, vendedor_id: item.vendedor_id, respostas,
        lat: item.gps?.lat ?? null, lng: item.gps?.lng ?? null, gps_precisao_m: item.gps?.precisao ?? null,
        client_uuid: item.client_uuid, enviado_em: new Date().toISOString(),
      }, { onConflict: 'quest_id' })
      if (error) throw error
      await fila('readwrite', (s) => s.delete(item.quest_id))
      ok++
      // a cópia do aparelho já mostra a quest concluída
      const c = lerCache()
      if (c?.quests) {
        c.quests = c.quests.map((q) => (Number(q.id) === Number(item.quest_id) ? { ...q, status: 'concluida', concluida_em: new Date().toISOString() } : q))
        c.respostas = { ...(c.respostas || {}), [item.quest_id]: { quest_id: item.quest_id, respostas } }
        try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(c)) } catch { /* sem espaço */ }
      }
    } catch (e) {
      console.warn('[quests] envio adiado:', e?.message || e)
    }
  }
  return ok
}

if (typeof window !== 'undefined') window.addEventListener('online', () => { enviarFila().catch(() => {}) })

/** URL temporária de uma foto do bucket privado (1 h). */
export async function urlFoto(caminho) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, 3600)
  return data?.signedUrl || null
}
