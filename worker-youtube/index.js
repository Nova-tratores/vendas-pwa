// Worker de vídeos do YouTube → bucket do catálogo.
//
// Faz polling da tabela `catalogo_midia`: linhas com tipo='video',
// origem_url preenchida e status='pendente' são "pedidos" de download.
// Para cada uma: baixa com yt-dlp, comprime/normaliza com ffmpeg (720p, faststart),
// sobe no bucket `catalogo-midia` e marca status='pronto' (ou 'erro').
//
// Roda como serviço separado no Railway. Usa a SERVICE_ROLE key (ignora RLS) —
// essa key fica SÓ aqui, nunca no app/GitHub.

import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, unlink, mkdtemp, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const execFileP = promisify(execFile)

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MIDIA_BUCKET = 'catalogo-midia',
  POLL_INTERVAL = '15000',
  MAX_HEIGHT = '720',
} = process.env

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const POLL_MS = Math.max(5000, Number(POLL_INTERVAL) || 15000)
const ALTURA = Number(MAX_HEIGHT) || 720

const log = (...a) => console.log(new Date().toISOString(), ...a)

// Caminho no bucket: mesmo padrão do app (cat-{id}/... pro curado, {codigo}/... pro estoque).
function storagePathDe(job, ext = 'mp4') {
  const prefixo = job.catalogo_produto_id != null ? `cat-${job.catalogo_produto_id}` : `${job.codigo_produto}`
  return `${prefixo}/yt-${job.id}-${Date.now()}.${ext}`
}

async function marcar(id, campos) {
  const { error } = await supabase.from('catalogo_midia').update(campos).eq('id', id)
  if (error) log('  ! falha ao atualizar linha', id, error.message)
}

async function processar(job) {
  log(`→ job ${job.id}: ${job.origem_url}`)
  await marcar(job.id, { status: 'baixando', erro: null })

  const dir = await mkdtemp(join(tmpdir(), 'yt-'))
  const brutoTpl = join(dir, 'bruto.%(ext)s')
  const bruto = join(dir, 'bruto.mp4')
  const saida = join(dir, 'saida.mp4')

  try {
    // 1) Download até 720p, mesclando em mp4.
    await execFileP('yt-dlp', [
      '-f', `bestvideo[height<=${ALTURA}]+bestaudio/best[height<=${ALTURA}]/best`,
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '-o', brutoTpl,
      job.origem_url,
    ], { timeout: 1000 * 60 * 20, maxBuffer: 1024 * 1024 * 64 })

    // 2) Re-encode pra normalizar (H.264/AAC), garantir <=720p e faststart (streaming web).
    await execFileP('ffmpeg', [
      '-y', '-i', bruto,
      '-vf', `scale='-2:min(${ALTURA},ih)'`,
      '-c:v', 'libx264', '-crf', '26', '-preset', 'veryfast',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      saida,
    ], { timeout: 1000 * 60 * 20, maxBuffer: 1024 * 1024 * 64 })

    // 3) Upload pro bucket.
    const buffer = await readFile(saida)
    const path = storagePathDe(job)
    const { error: upErr } = await supabase.storage
      .from(MIDIA_BUCKET)
      .upload(path, buffer, { contentType: 'video/mp4', upsert: false })
    if (upErr) throw new Error(`upload: ${upErr.message}`)

    await marcar(job.id, { storage_path: path, status: 'pronto', erro: null })
    log(`✓ job ${job.id} pronto (${(buffer.length / 1048576).toFixed(1)} MB) → ${path}`)
  } catch (err) {
    const msg = String(err?.stderr || err?.message || err).slice(0, 800)
    await marcar(job.id, { status: 'erro', erro: msg })
    log(`✗ job ${job.id} erro: ${msg.split('\n')[0]}`)
  } finally {
    for (const f of [bruto, saida]) { try { await unlink(f) } catch { /* ignora */ } }
    try { await rmdir(dir, { recursive: true }) } catch { /* ignora */ }
  }
}

async function proximoJob() {
  const { data, error } = await supabase
    .from('catalogo_midia')
    .select('id, origem_url, codigo_produto, catalogo_produto_id')
    .eq('tipo', 'video')
    .eq('status', 'pendente')
    .not('origem_url', 'is', null)
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) { log('! erro no poll:', error.message); return null }
  return data?.[0] || null
}

async function main() {
  log(`worker-youtube iniciado · bucket=${MIDIA_BUCKET} · poll=${POLL_MS}ms · ${ALTURA}p`)

  // Se o worker reiniciou no meio de um download, reabre as linhas presas.
  const { error: resetErr } = await supabase
    .from('catalogo_midia')
    .update({ status: 'pendente' })
    .eq('status', 'baixando')
  if (resetErr) log('! falha ao reabrir baixando:', resetErr.message)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await proximoJob()
      if (job) await processar(job)
      else await new Promise((r) => setTimeout(r, POLL_MS))
    } catch (err) {
      log('! loop:', err?.message || err)
      await new Promise((r) => setTimeout(r, POLL_MS))
    }
  }
}

main()
