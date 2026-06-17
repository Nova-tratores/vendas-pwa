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
import { readFile, mkdtemp, rm } from 'node:fs/promises'
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
// Tamanho-alvo do vídeo final (MB). Fica abaixo do teto global do Storage (50MB no
// plano free). O worker calcula a taxa de bits pra caber nesse orçamento.
const MAX_MB = Number(process.env.MAX_MB) || 45

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
    // player_client=android,ios dispensa o runtime de JS do YouTube e costuma sofrer
    // menos bloqueio (429) que o cliente web; retries/sleep ajudam contra rate-limit.
    await execFileP('yt-dlp', [
      '-f', `bestvideo[height<=${ALTURA}]+bestaudio/best[height<=${ALTURA}]/best`,
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--retries', '5', '--fragment-retries', '5', '--sleep-requests', '1',
      '-o', brutoTpl,
      job.origem_url,
    ], { timeout: 1000 * 60 * 20, maxBuffer: 1024 * 1024 * 64 })

    // 2) Descobre a duração pra calcular a taxa de bits que cabe no orçamento de tamanho.
    const { stdout: durOut } = await execFileP('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', bruto,
    ])
    const dur = Math.max(1, Math.floor(parseFloat(durOut) || 0))
    const AUDIO_K = 128
    const totalK = Math.floor((MAX_MB * 8 * 1024) / dur)   // kbps totais p/ caber em MAX_MB
    const videoK = Math.max(200, Math.min(totalK - AUDIO_K, 4500))
    const vf = `scale='-2:min(${ALTURA},ih)'`
    const baseV = ['-c:v', 'libx264', '-b:v', `${videoK}k`, '-vf', vf, '-preset', 'medium']
    const optExec = { timeout: 1000 * 60 * 25, maxBuffer: 1024 * 1024 * 64, cwd: dir }
    log(`  · ${dur}s → vídeo ${videoK}k + áudio ${AUDIO_K}k (alvo ${MAX_MB}MB)`)

    // 3) Re-encode em 2 passagens (taxa de bits média previsível → tamanho previsível).
    await execFileP('ffmpeg', ['-y', '-i', bruto, ...baseV, '-pass', '1', '-an', '-f', 'mp4', '/dev/null'], optExec)
    await execFileP('ffmpeg', [
      '-y', '-i', bruto, ...baseV, '-pass', '2',
      '-c:a', 'aac', '-b:a', `${AUDIO_K}k`,
      '-movflags', '+faststart', saida,
    ], optExec)

    // 4) Upload pro bucket.
    const buffer = await readFile(saida)
    const path = storagePathDe(job)
    const { error: upErr } = await supabase.storage
      .from(MIDIA_BUCKET)
      .upload(path, buffer, { contentType: 'video/mp4', upsert: false })
    if (upErr) throw new Error(`upload: ${upErr.message}`)

    await marcar(job.id, { storage_path: path, status: 'pronto', erro: null })
    log(`✓ job ${job.id} pronto (${(buffer.length / 1048576).toFixed(1)} MB) → ${path}`)
  } catch (err) {
    // O stderr do yt-dlp tem WARNINGs antes do ERRO real — pega a linha ERROR: de fato.
    const stderr = String(err?.stderr || '')
    const linhaErro = stderr.split('\n').reverse().find((l) => /^\s*ERROR:/i.test(l))
    const msg = (linhaErro || err?.message || String(err)).trim().slice(0, 800)
    await marcar(job.id, { status: 'erro', erro: msg })
    log(`✗ job ${job.id} erro: ${msg.split('\n')[0]}`)
    if (stderr) log(`  stderr completo:\n${stderr.slice(-1500)}`)
  } finally {
    try { await rm(dir, { recursive: true, force: true }) } catch { /* ignora */ }
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

  // Diagnóstico: confirma que yt-dlp e Deno (runtime de JS p/ nsig) estão no build.
  for (const [cmd, a] of [['yt-dlp', ['--version']], ['deno', ['--version']], ['ffmpeg', ['-version']]]) {
    try { const { stdout } = await execFileP(cmd, a); log(`  ${cmd}: ${stdout.trim().split('\n')[0]}`) }
    catch (e) { log(`  ${cmd}: INDISPONÍVEL — ${e.message}`) }
  }

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
