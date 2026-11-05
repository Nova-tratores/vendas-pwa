// Lote único de quests (05/11/2026): uma quest por trator vendido em Fartura,
// Taguaí e Carlópolis para o Matheus (vendedor 28), igual ao "Em lote por cidade"
// do painel (SupervisorQuests.criarLote). Cidade = a do cliente no Clientes_Omie
// (lib/tratoresCidade), não a digitada no controle de revisões.
//
//   npx tsx --env-file=../Portal_Nova_Tratores/.env.local scripts/quests-lote-matheus.mjs            (simula)
//   npx tsx --env-file=../Portal_Nova_Tratores/.env.local scripts/quests-lote-matheus.mjs --gravar   (grava)
import { cidadeDoTrator, indexarClientesOmie, tituloQuestTrator, limparCidadeDigitada, nomeChave, umaLetraDeDiferenca } from '../src/lib/tratoresCidade.js'
import { cidadeCanonica } from '../src/lib/cidadesCanon.js'
import { ITENS_PRONTOS } from '../src/lib/quests.js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
const GRAVAR = process.argv.includes('--gravar')
const VENDEDOR = 28
const CIDADES = ['FARTURA', 'TAGUAI', 'CARLOPOLIS']
const AUTOR = 'HENRI'
const XP = 50

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }
async function rest(path, opts = {}) {
  const r = await fetch(`${URL}/rest/v1/${path}`, { ...opts, headers: { ...H, ...(opts.headers || {}) } })
  const txt = await r.text()
  if (!r.ok) throw new Error(`${r.status} ${path}: ${txt}`)
  return txt ? JSON.parse(txt) : null
}
async function todas(path) {
  const out = []
  for (let o = 0; ; o += 1000) {
    const d = await rest(`${path}&limit=1000&offset=${o}`)
    out.push(...d)
    if (d.length < 1000) return out
  }
}

const hoje = new Date()
const prazo = new Date(hoje.getTime() + 14 * 86400000).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
const fmt = (d) => d.split('-').reverse().slice(0, 2).join('/')

const [tratores, omie, quests] = await Promise.all([
  todas('tratores?select=Chassis,Modelo,Cliente,Cidade,Entrega&Chassis=not.is.null&order=ID'),
  todas('Clientes_Omie?select=nome,cidade,telefone&order=id'),
  todas('vendas_quests?select=id,chassis,status,vendedor_id,vendedor_sugerido_id&order=id'),
])
const clientes = indexarClientesOmie(omie)
// telefone do cliente no Omie (mesmo casamento de nome da cidade); prefere o da cidade escolhida
const omieTel = omie
  .map((c) => ({ k: nomeChave(c.nome), cid: cidadeCanonica(c.cidade).chave, tel: String(c.telefone || '').trim() }))
  .filter((c) => c.tel.replace(/\D/g, '').length >= 10)
function telefoneDe(t, cid) {
  const k = nomeChave(t.Cliente)
  if (!k || k === 'NOVA TRATORES') return null
  let c = omieTel.filter((x) => x.k === k)
  if (!c.length && k.length >= 10) c = omieTel.filter((x) => x.k.startsWith(k + ' ') || k.startsWith(x.k + ' '))
  if (!c.length && k.length >= 12) c = omieTel.filter((x) => umaLetraDeDiferenca(x.k, k))
  return (c.find((x) => x.cid === cid.chave) || c[0])?.tel || null
}
const comAberta = new Set(quests.filter((q) => q.chassis && q.status === 'aberta').map((q) => q.chassis))

const alvos = new Set(CIDADES.map((c) => cidadeCanonica(c).chave))
const vistos = new Set()
const escolhidos = []
const pulados = []
for (const t of tratores) {
  const Modelo = String(t.Modelo ?? '').replace(/\.0$/, '')
  const cid = cidadeDoTrator(t, clientes)
  if (!alvos.has(cid.chave)) continue
  if (vistos.has(t.Chassis)) { pulados.push([t, 'chassi repetido']); continue }
  vistos.add(t.Chassis)
  if (comAberta.has(t.Chassis)) { pulados.push([t, 'já tem quest aberta']); continue }
  escolhidos.push({ ...t, Modelo, cid, telefone: telefoneDe(t, cid) })
}
escolhidos.sort((a, b) => a.cid.nome.localeCompare(b.cid.nome, 'pt-BR') || String(a.Cliente).localeCompare(String(b.Cliente), 'pt-BR'))

for (const t of escolhidos) {
  const dig = cidadeCanonica(limparCidadeDigitada(t.Cidade)).chave
  const mudou = t.cid.origem === 'omie' && dig !== t.cid.chave ? `  (controle: ${t.Cidade})` : ''
  console.log(`${t.cid.nome.padEnd(11)} ${String(t.Cliente).trim().padEnd(42)} ${t.Modelo.padEnd(10)} …${String(t.Chassis).slice(-6)} ${(t.telefone || '—').padEnd(16)}${mudou}`)
}
for (const [t, motivo] of pulados) console.log(`  pulado: ${t.Cliente} …${String(t.Chassis).slice(-6)} — ${motivo}`)
const porCidade = escolhidos.reduce((m, t) => ({ ...m, [t.cid.nome]: (m[t.cid.nome] || 0) + 1 }), {})
console.log('\nTotal:', escolhidos.length, porCidade, '· prazo', prazo, '· com telefone:', escolhidos.filter((t) => t.telefone).length)

const descartar = quests.filter((q) => q.status === 'sugerida' && escolhidos.some((t) => t.Chassis === q.chassis))
console.log('Sugestões do robô que viram descartada:', descartar.map((q) => q.id).join(', ') || 'nenhuma')

if (!GRAVAR) { console.log('\n(simulação — nada gravado; use --gravar)'); process.exit(0) }

const agora = new Date().toISOString()
const itens = ITENS_PRONTOS.slice(0, 4).map((i) => ({ ...i }))
const linhas = escolhidos.map((t) => ({
  titulo: tituloQuestTrator(t), descricao: t.telefone ? `Telefone do cliente (Omie): ${t.telefone}` : null, origem: 'manual', itens, xp: XP,
  vendedor_id: VENDEDOR, prazo, status: 'aberta',
  criado_por: AUTOR, aprovado_por: AUTOR, aprovado_em: agora,
  alvo_tipo: 'trator', chassis: t.Chassis, modelo: t.Modelo || null, cliente_nome: t.Cliente || null, cidade: t.cid.nome || t.Cidade || null,
}))
const criadas = await rest('vendas_quests', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(linhas) })
console.log('Criadas:', criadas.length)
if (descartar.length) {
  await rest(`vendas_quests?id=in.(${descartar.map((q) => q.id).join(',')})`, {
    method: 'PATCH', body: JSON.stringify({ status: 'descartada', nota_supervisor: 'coberta pelo lote de 05/11', updated_at: agora }),
  })
  console.log('Descartadas:', descartar.length)
}
const nomes = [...new Set(escolhidos.map((t) => t.cid.nome))]
await rest('mensagens_vendedor', {
  method: 'POST',
  body: JSON.stringify({
    vendedor_id: VENDEDOR, titulo: `${criadas.length} quests novas`,
    corpo: `Visitar tratores vendidos em ${nomes.join(', ')} — +${XP} XP cada, até ${fmt(prazo)}.`,
    created_by: AUTOR, link: '/quests',
  }),
})
console.log('Aviso enviado ao vendedor.')
