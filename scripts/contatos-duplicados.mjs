// Junta contatos (pessoas) com o MESMO nome no MESMO cliente (05/11/2026).
// Fica o mais antigo (menor id), que herda telefone/cargo que faltarem; as
// visitas que citavam os repetidos passam a citar o que fica; os repetidos são
// apagados. "Marco" × "Marco Antônio" NÃO entra (alguém decide).
// O celular não apaga sozinho o que sumiu do servidor: os vendedores que
// visitaram esses clientes ganham force_resync_at (o app envia o pendente
// primeiro e só depois recarrega — lib/sync.js checarForceResync).
//
//   npx tsx --env-file=../Portal_Nova_Tratores/.env.local scripts/contatos-duplicados.mjs            (simula)
//   npx tsx --env-file=../Portal_Nova_Tratores/.env.local scripts/contatos-duplicados.mjs --gravar   (grava)
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error('faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
const GRAVAR = process.argv.includes('--gravar')
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
const chave = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const [pessoas, visitas, props] = await Promise.all([
  todas('pessoas?select=id,propriedade_id,nome,cargo,telefone&order=id'),
  todas('visitas?select=id,vendedor_id,propriedade_id,pessoa_ids&order=id'),
  todas('portal_nt_clientes_PRINCIPAL?select=id,nome_fantasia,razao_social&id=gt.0&order=id'),
])
const nomeProp = new Map(props.map((p) => [p.id, p.nome_fantasia || p.razao_social]))

const grupos = new Map()
for (const p of pessoas) {
  if (!chave(p.nome)) continue
  const k = `${p.propriedade_id}|${chave(p.nome)}`
  if (!grupos.has(k)) grupos.set(k, [])
  grupos.get(k).push(p)
}
// 2295 = Marco Antônio Paiva: a visita de 04/11 ainda está no celular do Matheus e
// pode citar um dos dois "Allan" — fica para depois que ela subir.
const ESPERAR = new Set([2295])
const dup = [...grupos.values()].filter((g) => g.length > 1 && !ESPERAR.has(g[0].propriedade_id))
const deParaId = new Map() // id repetido -> id que fica
const atualizaFica = []
for (const g of dup) {
  const [fica, ...resto] = g
  const telefone = fica.telefone || resto.map((r) => r.telefone).find(Boolean) || fica.telefone
  const cargo = fica.cargo || resto.map((r) => r.cargo).find(Boolean) || fica.cargo
  if (telefone !== fica.telefone || cargo !== fica.cargo) atualizaFica.push({ id: fica.id, telefone, cargo })
  for (const r of resto) deParaId.set(r.id, fica.id)
  console.log(`${String(nomeProp.get(fica.propriedade_id) || fica.propriedade_id).slice(0, 38).padEnd(38)} "${String(fica.nome).trim()}" fica #${fica.id}, sai ${resto.map((r) => '#' + r.id).join(' ')}${telefone !== fica.telefone ? ` · herda tel ${telefone}` : ''}`)
}

const visitasMudar = []
for (const v of visitas) {
  const ids = v.pessoa_ids || []
  if (!ids.some((i) => deParaId.has(i))) continue
  const novos = [...new Set(ids.map((i) => deParaId.get(i) ?? i))]
  visitasMudar.push({ id: v.id, de: ids, para: novos })
}
const propsAfetadas = new Set(dup.map((g) => g[0].propriedade_id))
const vendedores = [...new Set(visitas.filter((v) => propsAfetadas.has(v.propriedade_id)).map((v) => v.vendedor_id).filter(Boolean))]

console.log(`\nGrupos: ${dup.length} · contatos que saem: ${deParaId.size} · contatos que herdam dado: ${atualizaFica.length}`)
console.log(`Visitas que trocam o contato: ${visitasMudar.length} · vendedores com resync: ${vendedores.join(', ')}`)
if (!GRAVAR) { console.log('\n(simulação — nada gravado; use --gravar)'); process.exit(0) }

for (const f of atualizaFica) await rest(`pessoas?id=eq.${f.id}`, { method: 'PATCH', body: JSON.stringify({ telefone: f.telefone, cargo: f.cargo }) })
for (const v of visitasMudar) await rest(`visitas?id=eq.${v.id}`, { method: 'PATCH', body: JSON.stringify({ pessoa_ids: v.para }) })
// confere antes de apagar: nenhuma visita pode continuar citando um id que sai
const sobra = (await todas('visitas?select=id,pessoa_ids&order=id')).filter((v) => (v.pessoa_ids || []).some((i) => deParaId.has(i)))
if (sobra.length) throw new Error(`visitas ainda citam contatos que sairiam: ${sobra.map((v) => v.id).join(', ')} — nada apagado`)
await rest(`pessoas?id=in.(${[...deParaId.keys()].join(',')})`, { method: 'DELETE' })
if (vendedores.length) await rest(`vendedores?id=in.(${vendedores.join(',')})`, { method: 'PATCH', body: JSON.stringify({ force_resync_at: new Date().toISOString() }) })
console.log('Gravado: contatos juntados, visitas reapontadas, repetidos apagados, resync pedido.')
