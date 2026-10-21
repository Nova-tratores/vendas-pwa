// =============================================================================
// INTELIGÊNCIA DE VENDAS — DADOS DE EXEMPLO (imaginários) para as telas do app.
//
// Tudo aqui é inventado: nomes, CPF/CNPJ (dígitos válidos, mas fictícios), telefones
// (14 99999-00NN), valores e coordenadas. NADA vai ao banco.
//
// Os NOMES DE CAMPOS seguem o Portal (src/lib/inteligencia-vendas/*.ts e as rotas
// /api/inteligencia-vendas/*): quando trocar pela fonte real, a tela não muda.
// Para os dados ficarem coerentes entre si, as regras puras do Portal foram
// portadas para cá (avaliarCliente, montarFila, montarReserva, foco dos municípios,
// falas do Tratorilson): a ficha, as oportunidades, o "sem retorno", o feed e a
// prospecção saem dos MESMOS 25 clientes e das MESMAS propostas.
//
// Datas: sempre relativas a hoje (nunca envelhecem). Use dadosExemplo() — o
// resultado fica guardado por dia.
//
// Os 4 contatos de src/components/modulos/dadosExemplo.js estão aqui com os mesmos
// nomes: Sítio Boa Vista (Piraju), Fazenda Santa Rita (Piraju), Chácara São José
// (Tejupá) e a propriedade "420 ha de soja" (Fartura, CAR sem cliente nosso).
// =============================================================================

// ── datas ────────────────────────────────────────────────────────────────────
const p2 = (n) => String(n).padStart(2, '0')
export function hojeISO() {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
export function somarDias(iso, n) {
  const [a, m, d] = iso.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, d + n))
  return `${x.getUTCFullYear()}-${p2(x.getUTCMonth() + 1)}-${p2(x.getUTCDate())}`
}
export function diasEntre(a, b) {
  if (!a || !b) return null
  const ta = Date.parse(String(a).slice(0, 10) + 'T00:00:00Z'), tb = Date.parse(String(b).slice(0, 10) + 'T00:00:00Z')
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return null
  return Math.round((tb - ta) / 86400000)
}
const dataISO = (s) => (s ? String(s).slice(0, 10) : '')
const br = (iso) => { if (!iso) return '—'; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}` }
const fimDeSemana = (iso) => { const w = new Date(iso + 'T12:00:00Z').getUTCDay(); return w === 0 || w === 6 }
/** dia útil anterior (ou o próprio) */
function diaUtil(iso) { let d = iso; while (fimDeSemana(d)) d = somarDias(d, -1); return d }
/** dias úteis entre a e b (port de equipe.ts) */
export function diasUteisEntre(a, b) {
  if (!a || !b || a > b) return a && b ? 0 : null
  let n = 0, d = a
  while (d < b) { d = somarDias(d, 1); if (!fimDeSemana(d)) n++ }
  return n
}

// ── sorteio determinístico (mesmo resultado a cada carga) ───────────────────
function prng(seed) {
  let s = seed >>> 0
  return () => { s += 0x6d2b79f5; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const semente = (txt) => { let h = 0x811c9dc5; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 0x01000193) } return h >>> 0 }

// ── documentos fictícios com dígito verificador válido ──────────────────────
function cpf(base9) {
  const d = String(base9).padStart(9, '0').split('').map(Number)
  for (const len of [9, 10]) { let s = 0; for (let i = 0; i < len; i++) s += d[i] * (len + 1 - i); const r = (s * 10) % 11; d.push(r === 10 ? 0 : r) }
  return d.join('')
}
function cnpj(base12) {
  const d = String(base12).padStart(12, '0').split('').map(Number)
  const pesos = [[5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]]
  for (const p of pesos) { const s = p.reduce((acc, w, i) => acc + w * d[i], 0); const r = s % 11; d.push(r < 2 ? 0 : 11 - r) }
  return d.join('')
}
export const textoNorm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

// =============================================================================
// EQUIPE e VENDEDOR LOGADO
// =============================================================================
export const VENDEDORES = [
  { id: 11, nome: 'Carlos Henrique Prado', cidades: ['Piraju', 'Tejupá', 'Sarutaiá', 'Timburi', 'Fartura'], perfil: 'relacionamento', mix: { carteira: 0.6, recuperar: 0.25, novos: 0.15 }, ritmo: 2.3, telefone: '14999991101' },
  { id: 12, nome: 'Mariana Lopes Siqueira', cidades: ['Ipaussu', 'Bernardino de Campos', 'Chavantes'], perfil: 'cacador', mix: { carteira: 0.35, recuperar: 0.25, novos: 0.4 }, ritmo: 1.5, telefone: '14999991102' },
  { id: 13, nome: 'Rafael Antunes Moraes', cidades: ['Ourinhos', 'Carlópolis', 'Chavantes'], perfil: 'negociador', mix: { carteira: 0.4, recuperar: 0.45, novos: 0.15 }, ritmo: 1.9, telefone: '14999991103' },
  { id: 14, nome: 'Tiago Mendes Rocha', cidades: ['Fartura', 'Timburi', 'Tejupá'], perfil: 'relacionamento', mix: { carteira: 0.55, recuperar: 0.3, novos: 0.15 }, ritmo: 1.2, parouHaDias: 11, telefone: '14999991104' },
]
const VEND = Object.fromEntries(VENDEDORES.map((v) => [v.id, v]))
const nomeVend = (id) => VEND[id]?.nome || ''
/** O vendedor que "está logado" no app nos exemplos. */
export const VENDEDOR_LOGADO = { id: 11, nome: 'Carlos Henrique Prado', email: 'carlos.exemplo@novatratores.invalid', perfil: 'relacionamento', mix: { carteira: 0.6, recuperar: 0.25, novos: 0.15 }, cidades: VENDEDORES[0].cidades }

// =============================================================================
// MUNICÍPIOS (IBGE e centro reais; os números agro são imaginários)
// =============================================================================
export const CIDADES = [
  { ibge: 3538808, nome: 'Piraju', uf: 'SP', centro: [-23.18887, -49.3855], daLoja: true, populacao: 29900 },
  { ibge: 3515400, nome: 'Fartura', uf: 'SP', centro: [-23.39875, -49.5061], daLoja: true, populacao: 15600 },
  { ibge: 3554201, nome: 'Tejupá', uf: 'SP', centro: [-23.34546, -49.31285], daLoja: true, populacao: 4500 },
  { ibge: 3551207, nome: 'Sarutaiá', uf: 'SP', centro: [-23.25855, -49.48267], daLoja: true, populacao: 3700 },
  { ibge: 3554607, nome: 'Timburi', uf: 'SP', centro: [-23.19985, -49.62017], daLoja: true, populacao: 2600 },
  { ibge: 3520905, nome: 'Ipaussu', uf: 'SP', centro: [-23.06298, -49.59901], daLoja: true, populacao: 14400 },
  { ibge: 3506300, nome: 'Bernardino de Campos', uf: 'SP', centro: [-23.02527, -49.4904], daLoja: true, populacao: 11000 },
  { ibge: 3557204, nome: 'Chavantes', uf: 'SP', centro: [-23.04029, -49.7559], daLoja: true, populacao: 12100 },
  { ibge: 3534708, nome: 'Ourinhos', uf: 'SP', centro: [-22.93675, -49.83407], daLoja: true, populacao: 103000 },
  { ibge: 4104709, nome: 'Carlópolis', uf: 'PR', centro: [-23.4256, -49.7236], daLoja: false, populacao: 14000 },
]
const CID = Object.fromEntries(CIDADES.map((c) => [textoNorm(c.nome), c]))
export const centroDaCidade = (nome) => CID[textoNorm(String(nome || '').replace(/\s*[(/-]\s*[A-Za-z]{2}\)?\s*$/, ''))]?.centro || null

/** valor da produção por hectare (R$ mil/ha) por cultura — só para o exemplo */
const VALOR_HA = { Soja: 7.2, Milho: 5.4, 'Café arábica': 38, 'Cana-de-açúcar': 11.5, Laranja: 24, Feijão: 9.8, Trigo: 4.6, Mandioca: 12, Banana: 30 }
// [nome, culturas {nome: ha}, bovinos, agro{imoveis, areaUtilHa, credito12m, credito36m, invest36m, imoveisComCredito}, base{clientes, ativos, tratores, comTrator, propostasAbertas, pecas12m, oportunidades}]
const MUNI_DADOS = {
  Piraju: [{ 'Café arábica': 3200, Soja: 9500, Milho: 6800, 'Cana-de-açúcar': 2100, Feijão: 900, Laranja: 400 }, 48000, [1450, 42000, 185e6, 510e6, 96e6, 610], [312, 141, 188, 132, 14, 1.85e6, 96]],
  Fartura: [{ Soja: 14000, Milho: 8000, Trigo: 3500, Feijão: 1200, 'Café arábica': 600 }, 22000, [980, 39000, 240e6, 690e6, 148e6, 520], [118, 61, 70, 52, 6, 0.74e6, 44]],
  Tejupá: [{ Soja: 6200, Milho: 3900, Feijão: 2400, Trigo: 1800 }, 15000, [620, 21000, 96e6, 270e6, 52e6, 300], [64, 30, 38, 31, 3, 0.31e6, 22]],
  Sarutaiá: [{ Soja: 3100, Milho: 2500, 'Café arábica': 900 }, 9000, [410, 12500, 44e6, 128e6, 21e6, 170], [41, 19, 24, 19, 1, 0.19e6, 15]],
  Timburi: [{ Soja: 4200, Milho: 2600, 'Café arábica': 500 }, 26000, [520, 17800, 61e6, 170e6, 34e6, 210], [38, 15, 17, 14, 1, 0.12e6, 13]],
  Ipaussu: [{ 'Cana-de-açúcar': 9800, Soja: 5200, Milho: 2400, Laranja: 1200 }, 12000, [470, 19600, 88e6, 240e6, 47e6, 190], [57, 26, 29, 22, 2, 0.28e6, 21]],
  'Bernardino de Campos': [{ Soja: 7400, Milho: 4800, 'Cana-de-açúcar': 3100, 'Café arábica': 700 }, 18000, [690, 23400, 105e6, 300e6, 63e6, 280], [49, 22, 23, 18, 2, 0.22e6, 17]],
  Chavantes: [{ 'Cana-de-açúcar': 11200, Soja: 6100, Milho: 2900 }, 14000, [560, 22800, 112e6, 330e6, 71e6, 230], [33, 14, 14, 11, 2, 0.15e6, 12]],
  Ourinhos: [{ 'Cana-de-açúcar': 14500, Soja: 8800, Milho: 4100 }, 11000, [760, 30500, 164e6, 470e6, 92e6, 330], [72, 34, 26, 20, 3, 0.41e6, 25]],
  Carlópolis: [{ Soja: 8200, Milho: 5100, 'Café arábica': 1800, Feijão: 1300 }, 31000, [1100, 33000, 120e6, 350e6, 66e6, 450], [26, 11, 9, 7, 1, 0.09e6, 9]],
}

const semAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** port de municipios.ts → linhasParaCulturas */
export function linhasParaCulturas(culturas, bovinos) {
  const total = culturas.reduce((s, c) => s + c.ha, 0) || 1
  const pct = (re) => culturas.filter((c) => re.test(semAcento(c.nome))).reduce((s, c) => s + c.ha, 0) / total
  const out = []
  if (pct(/soja|milho|trigo|feijao|sorgo|aveia|amendoim/) >= 0.3) out.push('Plantadeira e pulverizador (grãos)')
  if (pct(/cana/) >= 0.2) out.push('Trator de alta potência e carreta (cana)')
  if (pct(/cafe|laranja|limao|tangerina|abacate|manga|uva|banana/) >= 0.1) out.push('Trator estreito/fruteiro e pulverizador (perenes)')
  if ((bovinos || 0) >= 20000) out.push('Vagão misturador, roçadeira e forrageira (pecuária)')
  if (out.length === 0) out.push('Trator de uso geral e implementos de preparo')
  return out
}

function montarMunicipios() {
  const lista = CIDADES.map((c) => {
    const [cult, bovinos, ag, base] = MUNI_DADOS[c.nome]
    const culturas = Object.entries(cult).map(([nome, ha]) => ({ nome, ha })).sort((a, b) => b.ha - a.ha)
    return {
      ibge: c.ibge, nome: c.nome, uf: c.uf, daLoja: c.daLoja,
      areaPlantadaHa: culturas.reduce((s, x) => s + x.ha, 0), culturas, culturaPrincipal: culturas[0]?.nome || '',
      valorProducaoMil: Math.round(culturas.reduce((s, x) => s + x.ha * (VALOR_HA[x.nome] || 5), 0)), bovinos,
      imoveis: ag[0], areaUtilHa: ag[1], credito12m: ag[2], credito36m: ag[3], invest36m: ag[4], imoveisComCredito: ag[5],
      clientes: base[0], clientesAtivos: base[1], tratoresVendidos: base[2], clientesComTrator: base[3], propostasAbertas: base[4], pecas12m: base[5], oportunidades: base[6],
      penetracao: null, foco: 0, linhas: linhasParaCulturas(culturas, bovinos), centro: c.centro,
    }
  })
  // port do cálculo de foco de municipios.ts
  const max = (f) => Math.max(1, ...lista.map(f))
  const mArea = max((m) => m.areaPlantadaHa), mBov = max((m) => m.bovinos || 0), mInv = max((m) => m.invest36m || 0)
  for (const m of lista) {
    m.penetracao = m.imoveis ? Math.min(1, m.clientesComTrator / m.imoveis) : null
    const espaco = m.penetracao == null ? 0.5 : 1 - Math.min(1, m.penetracao / 0.05)
    const potencial = 0.5 * (m.areaPlantadaHa / mArea) + 0.15 * ((m.bovinos || 0) / mBov) + 0.35 * ((m.invest36m || 0) / mInv)
    m.foco = Math.round(100 * (0.65 * potencial + 0.35 * espaco))
  }
  return lista.sort((a, b) => b.foco - a.foco)
}

// =============================================================================
// REGRAS DE OPORTUNIDADE (port de regras.ts)
// =============================================================================
export const REGRAS = {
  renovacao: { rotulo: 'Renovar trator', cor: '#DC2626', explicacao: 'Trator comprado conosco há 5 anos ou mais, ou horímetro alto na oficina.' },
  cruzada: { rotulo: 'Implemento', cor: '#EA580C', explicacao: 'Comprou trator nos últimos 4 anos e nenhum implemento conosco.' },
  outra_marca: { rotulo: 'Outra marca', cor: '#7C3AED', explicacao: 'Traz trator de outra marca na oficina, ou compra peças sem ter trator comprado conosco.' },
  reabordar: { rotulo: 'Reabordar', cor: '#0891B2', explicacao: 'Perdeu proposta entre 3 meses e 2 anos atrás. A situação pode ter mudado.' },
  proposta_parada: { rotulo: 'Proposta parada', cor: '#CA8A04', explicacao: 'Tem proposta em aberto. Ver a fila em "Propostas sem retorno".' },
  sumiu: { rotulo: 'Sumiu', cor: '#BE185D', explicacao: 'Comprava peças no ano anterior e não comprou nada nos últimos 12 meses.' },
  sem_visita: { rotulo: 'Sem visita', cor: '#475569', explicacao: 'Tem máquina nossa e nenhum vendedor visitou nos últimos 6 meses (CRM).' },
  perfil: { rotulo: 'Perfil', cor: '#16A34A', explicacao: 'Área ou cultura registrada no CRM combina com uma linha de máquinas.' },
  prestador: { rotulo: 'Prestador', cor: '#2563EB', explicacao: 'CNPJ de prestador de serviço agrícola (CNAE 0161): precisa de alta capacidade.' },
}
/** ícone lucide sugerido por regra (só no app) */
export const ICONE_REGRA = { renovacao: 'RefreshCw', cruzada: 'Wrench', outra_marca: 'Shuffle', reabordar: 'RotateCcw', proposta_parada: 'Hourglass', sumiu: 'UserX', sem_visita: 'MapPinOff', perfil: 'Sprout', prestador: 'Tractor' }

const temCultura = (c, chaves) => { const t = semAcento(c.culturas.join(' ')); return chaves.some((k) => t.includes(k)) }
const PERFIS = [
  { id: 'graos-grande', quando: 'Grãos (soja, milho, trigo, feijão) com 300 ha ou mais', oferecer: 'Plantadeira de maior capacidade, pulverizador, trator de alta potência', casa: (c) => temCultura(c, ['soja', 'milho', 'trigo', 'feijao', 'sorgo', 'graos']) && (c.areaHa || 0) >= 300 },
  { id: 'graos', quando: 'Grãos em área menor que 300 ha', oferecer: 'Plantadeira, distribuidor, pulverizador de barra', casa: (c) => temCultura(c, ['soja', 'milho', 'trigo', 'feijao', 'sorgo', 'graos']) && (c.areaHa || 0) < 300 },
  { id: 'pecuaria', quando: 'Pecuária / pastagem', oferecer: 'Vagão misturador, roçadeira, conjunto frontal, forrageira', casa: (c) => temCultura(c, ['pastagem', 'pecuaria', 'gado', 'leite', 'bovino']) },
  { id: 'perene', quando: 'Café, laranja ou fruta', oferecer: 'Trator estreito/fruteiro, pulverizador, trincha', casa: (c) => temCultura(c, ['cafe', 'laranja', 'citros', 'fruta', 'abacate', 'uva']) },
  { id: 'cana', quando: 'Cana-de-açúcar', oferecer: 'Trator de alta potência, carreta, subsolador', casa: (c) => temCultura(c, ['cana']) },
]

export function avaliarCliente(c, hoje) {
  const out = []
  const t = c.ultimoTrator
  if (t && c.anosUltimoTrator != null && c.anosUltimoTrator >= 5) {
    out.push({ regra: 'renovacao', peso: 30 + Math.min(15, (c.anosUltimoTrator - 5) * 3), titulo: `Trator ${t.modelo} com ${c.anosUltimoTrator} anos`,
      porque: `Comprou o ${t.modelo} em ${br(t.data)}${c.maiorHorimetro ? `; maior horímetro visto na oficina: ${c.maiorHorimetro} h` : ''}.`, oferecer: 'Troca do trator (avaliar o usado na negociação)' })
  } else if (c.maiorHorimetro != null && c.maiorHorimetro >= 5000) {
    out.push({ regra: 'renovacao', peso: 20, titulo: `Trator com ${c.maiorHorimetro.toLocaleString('pt-BR')} h na oficina`,
      porque: `Horímetro de ${c.maiorHorimetro.toLocaleString('pt-BR')} h numa OS (pode ser de outra máquina da frota dele).`, oferecer: 'Troca do trator (avaliar o usado na negociação)' })
  }
  if (t && c.qtdImplementos === 0 && (diasEntre(t.data, hoje) ?? 9999) <= 4 * 365) {
    out.push({ regra: 'cruzada', peso: 25, titulo: `Tem o ${t.modelo} e nenhum implemento conosco`, porque: `Trator comprado em ${br(t.data)}; nenhum implemento na nossa base.`, oferecer: `Implementos para o ${t.modelo} (roçadeira, grade, carreta, plantadeira)` })
  }
  if (c.qtdTratores === 0 && (c.marcasNaOficina.length > 0 || c.pecas12m + c.pecas12a24m >= 3000)) {
    const marcas = c.marcasNaOficina.join(', ')
    out.push({ regra: 'outra_marca', peso: 25, titulo: marcas ? `Trator ${marcas} na oficina` : 'Compra peças, trator não é nosso',
      porque: marcas ? `As OS citam ${marcas}. Ainda não comprou trator conosco.` : `R$ ${Math.round(c.pecas12m + c.pecas12a24m).toLocaleString('pt-BR')} em peças em 2 anos, sem trator comprado aqui.`,
      oferecer: 'Apresentar a linha Mahindra (demonstração / comparativo)' })
  }
  if (c.ultimaPerdida) {
    const d = diasEntre(c.ultimaPerdida.data, hoje)
    if (d != null && d >= 90 && d <= 730) {
      const oq = [c.ultimaPerdida.marca, c.ultimaPerdida.modelo].filter(Boolean).join(' ')
      out.push({ regra: 'reabordar', peso: 20, titulo: `Perdeu proposta ${oq ? `de ${oq} ` : ''}há ${Math.round(d / 30)} meses`, porque: `Proposta não vendida em ${br(c.ultimaPerdida.data)}.`, oferecer: oq ? `Nova condição para ${oq}` : 'Nova proposta' })
    }
  }
  if (c.propostasAbertas > 0) {
    out.push({ regra: 'proposta_parada', peso: 15, titulo: `${c.propostasAbertas} proposta(s) em aberto`, porque: `R$ ${Math.round(c.valorPropostasAbertas).toLocaleString('pt-BR')} em aberto.`, oferecer: 'Ligar para fechar ou registrar o motivo da perda' })
  }
  if (c.pedidosPecas12a24m >= 2 && c.pedidosPecas12m === 0) {
    out.push({ regra: 'sumiu', peso: 15, titulo: 'Parou de comprar peças', porque: `${c.pedidosPecas12a24m} pedidos no ano anterior; nenhum nos últimos 12 meses (última compra ${br(c.ultimaCompraPecas)}).`, oferecer: 'Ligar: revisão, peças, entender por que parou' })
  }
  if (c.qtdTratores > 0) {
    const d = c.ultimaVisita ? diasEntre(c.ultimaVisita, hoje) : null
    if (d == null || d > 180) out.push({ regra: 'sem_visita', peso: 10, titulo: c.ultimaVisita ? `Última visita há ${Math.round(d / 30)} meses` : 'Nunca visitado pelo CRM', porque: 'Tem trator comprado conosco.', oferecer: 'Visita de relacionamento' })
  }
  const perfil = PERFIS.find((p) => p.casa(c))
  if (perfil) out.push({ regra: 'perfil', peso: 15, titulo: perfil.quando, porque: `CRM: ${c.culturas.join(', ') || '—'}${c.areaHa ? ` · ${Math.round(c.areaHa)} ha` : ''}.`, oferecer: perfil.oferecer })
  if (/^0161/.test(String(c.cnae).replace(/\D/g, ''))) out.push({ regra: 'prestador', peso: 20, titulo: 'Prestador de serviço agrícola', porque: `CNAE ${c.cnae} — ${c.cnaeDescricao}.`, oferecer: 'Equipamento de alta capacidade operacional' })
  return out.sort((a, b) => b.peso - a.peso)
}

/** Perguntas prontas do buscador (port de regras.ts → PERGUNTAS). */
export const PERGUNTAS = [
  { id: 'trator5', texto: 'Compraram trator há mais de 5 anos', filtro: (c) => (c.anosUltimoTrator ?? -1) >= 5 },
  { id: 'sem-implemento', texto: 'Têm trator e nunca compraram implemento', filtro: (c) => c.qtdTratores > 0 && c.qtdImplementos === 0 },
  { id: 'outra-marca', texto: 'Trazem trator de outra marca na oficina', filtro: (c) => c.marcasNaOficina.length > 0 && c.qtdTratores === 0 },
  { id: 'pecas-sem-trator', texto: 'Compram peças e não têm trator nosso', filtro: (c) => c.qtdTratores === 0 && c.pecas12m >= 1000 },
  { id: 'perdida', texto: 'Perderam proposta (reabordar)', filtro: (c) => c.oportunidades.some((o) => o.regra === 'reabordar') },
  { id: 'aberta', texto: 'Têm proposta em aberto', filtro: (c) => c.propostasAbertas > 0 },
  { id: 'sumiu', texto: 'Pararam de comprar peças', filtro: (c) => c.oportunidades.some((o) => o.regra === 'sumiu') },
  { id: 'sem-visita', texto: 'Têm trator nosso e ninguém visitou em 6 meses', filtro: (c) => c.oportunidades.some((o) => o.regra === 'sem_visita') },
  { id: 'nunca-proposta', texto: 'Clientes ativos que nunca receberam proposta', filtro: (c) => !c.ultimaProposta && (c.pecas12m > 0 || c.os12m > 0) },
  { id: 'horimetro', texto: 'Trator com mais de 5.000 h na oficina', filtro: (c) => (c.maiorHorimetro ?? 0) >= 5000 },
  { id: 'prestador', texto: 'Prestadores de serviço agrícola (CNAE)', filtro: (c) => c.oportunidades.some((o) => o.regra === 'prestador') },
]

// =============================================================================
// CLIENTES (25) — a "verdade" do exemplo. Datas em dias/anos atrás.
//   compras: máquinas compradas conosco  [tipo, familia, modelo, anosAtras, valor]
//   frota:   tudo que ele tem no campo   [marca, modelo, ano, horimetro]
//   pecas:   [valor12m, pedidos12m, valor12a24m, pedidos12a24m, diasDaUltima]
//   os:      [qtd12m, diasDaUltima, marcas de outras marcas, maiorHorimetro]
//   visitas: [diasAtras, tipo, resumo, proximos passos, próximo contato (dias a partir de hoje, negativo = já passou)]
// =============================================================================
const PESSOA = 'pf', EMPRESA = 'pj'
const SPEC_CLIENTES = [
  { id: 'c1', tp: PESSOA, base: 312845106, nome: 'Sítio Boa Vista', contato: 'João Carlos Ribeiro', cidade: 'Piraju', fone: '14999990001', vend: 11, areaHa: 85, culturas: ['Café', 'Milho'], gps: [0.034, -0.041],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6075', 8.6, 168000], ['implemento', 'Venda de Implementos', 'Grade aradora 14 discos', 7.4, 24500]],
    frota: [['Mahindra', '6075', 2017, 6200], ['Tatu', 'Grade aradora 14 discos', 2018, null]],
    pecas: [4800, 6, 3900, 5, 22], os: [2, 210, [], 6200],
    visitas: [[128, 'presencial', 'Pediu preço de grade niveladora; trator com 6.200 h, pensando em trocar no ano que vem.', 'Levar orçamento de grade e simulação de troca do 6075', -98], [301, 'telefone', 'Agendou revisão de 6.000 h.', 'Confirmar revisão', null]] },
  { id: 'c2', tp: PESSOA, base: 208114937, nome: 'Fazenda Santa Rita', contato: 'Antônio Marcos Ferreira', cidade: 'Piraju', fone: '14999990002', vend: 11, areaHa: 260, culturas: ['Soja', 'Milho'], gps: [-0.051, 0.022],
    compras: [], frota: [['Massey Ferguson', '275', 2005, 11800], ['Massey Ferguson', '4275', 2011, 8400]],
    pecas: [6100, 7, 5200, 6, 35], os: [3, 41, ['Massey Ferguson'], 11800],
    visitas: [[40, 'telefone', 'Disse que vai ver com o banco a liberação do Moderfrota.', 'Ligar para saber do banco', 4], [54, 'presencial', 'Apresentada proposta do Yuvo 585 com carreta.', 'Aguardar resposta', null]] },
  { id: 'c3', tp: PESSOA, base: 401229585, nome: 'Chácara São José', contato: 'José Aparecido Lima', cidade: 'Tejupá', fone: '14999990004', vend: 11, areaHa: 32, culturas: ['Pastagem', 'Leite'], gps: [0.022, 0.031],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 4025', 3.85, 152000]], frota: [['Mahindra', '4025', 2021, 1100]],
    pecas: [1200, 3, 600, 1, 61], os: [1, 95, [], 1100],
    visitas: [[171, 'telefone', 'Perguntou de roçadeira para o pasto.', 'Mandar orçamento de roçadeira e carreta', null]] },
  { id: 'c4', tp: PESSOA, base: 517330218, nome: 'Fazenda Três Irmãos', contato: 'Luiz Fernando Baptista', cidade: 'Fartura', fone: '14999990005', vend: 14, areaHa: 520, culturas: ['Soja', 'Milho', 'Trigo'], gps: [0.046, 0.058],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 9500', 7.2, 420000], ['implemento', 'Venda de Implementos', 'Plantadeira 9 linhas', 7.1, 185000]],
    frota: [['Mahindra', '9500', 2019, 5400], ['John Deere', '6110J', 2014, 9800]],
    pecas: [9800, 9, 8700, 8, 15], os: [3, 33, ['John Deere'], 9800],
    visitas: [[88, 'presencial', 'Quer trator maior para o plantio; olhou John Deere na feira.', 'Levar 9500 4x4 para demonstração', -60]] },
  { id: 'c5', tp: EMPRESA, base: 452271830001, nome: 'Agropecuária Paranapanema Ltda', contato: 'Ricardo Okamoto', cidade: 'Piraju', fone: '14999990006', vend: 11, areaHa: 1200, culturas: ['Cana-de-açúcar', 'Soja'], gps: [-0.072, -0.065],
    cnae: '0161-0/03', cnaeDescricao: 'Serviço de preparação de terreno, cultivo e colheita', aberturaAnos: 12, porte: 'DEMAIS',
    compras: [['trator', 'Venda de Tratores', 'Mahindra 7590', 2.6, 465000], ['trator', 'Venda de Tratores', 'Mahindra Yuvo 585', 1.7, 238000], ['implemento', 'Venda de Implementos', 'Subsolador 7 hastes', 2.5, 96000]],
    frota: [['Mahindra', '7590', 2023, 3100], ['Mahindra', 'Yuvo 585', 2024, 1900], ['Valtra', 'BH 180', 2016, 12400], ['Case', 'Puma 230', 2018, 9200]],
    pecas: [28400, 22, 25100, 19, 6], os: [6, 12, ['Valtra', 'Case'], 12400],
    visitas: [[9, 'presencial', 'Quer mais um trator para a safra de cana; pediu 6110 com plantadeira.', 'Proposta 6110 + plantadeira', 3], [36, 'presencial', 'Revisão do 7590 ok; elogiou o consumo.', null, null]] },
  { id: 'c6', tp: PESSOA, base: 329018774, nome: 'Sítio Santa Luzia', contato: 'Benedito Rosa', cidade: 'Sarutaiá', fone: '14999990007', vend: 11, areaHa: 40, culturas: ['Café'], gps: [0.018, -0.026],
    compras: [['trator', 'Venda de Tratores', 'Mahindra Yuvo 575', 6.1, 142000], ['implemento', 'Venda de Implementos', 'Pulverizador 600 L', 6.0, 21000]],
    frota: [['Mahindra', 'Yuvo 575', 2020, 4700]], pecas: [0, 0, 3600, 4, 455], os: [0, 470, [], 4700],
    visitas: [[29, 'presencial', 'Filho assumiu o sítio; quer um trator fruteiro para o café adensado.', 'Apresentação da proposta do Yuvo 575 novo', null]] },
  { id: 'c7', tp: PESSOA, base: 606173452, nome: 'Fazenda Água Limpa', contato: 'Sebastião Prudente', cidade: 'Timburi', fone: '14999990008', vend: 14, areaHa: 350, culturas: ['Pastagem', 'Gado de corte'], gps: [-0.031, 0.044],
    compras: [], frota: [['John Deere', '5075E', 2015, 8100], ['New Holland', 'TL75', 2009, 13200]],
    pecas: [2100, 3, 1800, 2, 80], os: [2, 80, ['John Deere', 'New Holland'], 13200],
    visitas: [[244, 'presencial', 'Fechou com a John Deere por causa do preço; disse que o 5075E está dando problema de embreagem.', 'Ligar em 6 meses', -60]] },
  { id: 'c8', tp: PESSOA, base: 115904367, nome: 'Sítio Recanto Verde', contato: 'Marta Helena Cassiano', cidade: 'Ipaussu', fone: '14999990009', vend: 12, areaHa: 60, culturas: ['Laranja'], gps: [0.028, 0.036],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6075', 2.4, 279000]], frota: [['Mahindra', '6075', 2024, 1650]],
    pecas: [2300, 4, 900, 1, 48], os: [2, 48, [], 1650],
    visitas: [[63, 'presencial', 'Quer pulverizador turbo para a laranja.', 'Orçar pulverizador e trincha', -33]] },
  { id: 'c9', tp: PESSOA, base: 734552190, nome: 'Fazenda São Sebastião', contato: 'Paulo Roberto Gimenes', cidade: 'Bernardino de Campos', fone: '14999990010', vend: 12, areaHa: 410, culturas: ['Milho', 'Soja'], gps: [-0.038, -0.027],
    compras: [], frota: [['New Holland', 'TL75', 2012, 10900], ['New Holland', 'T6.110', 2017, 7300]],
    pecas: [5400, 5, 4300, 4, 39], os: [2, 39, ['New Holland'], 10900],
    visitas: [[22, 'presencial', 'Negociando 7590 com entrada do TL75.', 'Retorno com a avaliação do usado', -6]] },
  { id: 'c10', tp: PESSOA, base: 820467335, nome: 'Fazenda Boa Esperança', contato: 'Hélio Damasceno', cidade: 'Chavantes', fone: '14999990011', vend: 12, areaHa: 800, culturas: ['Cana-de-açúcar'], gps: [0.043, 0.039],
    compras: [], frota: [['Valtra', 'BH 180', 2023, 2800], ['Valtra', 'BM 125', 2010, 14100]],
    pecas: [3100, 4, 2900, 3, 70], os: [1, 70, ['Valtra'], 14100],
    visitas: [[402, 'presencial', 'Comprou Valtra pela condição de pagamento da revenda.', 'Voltar na próxima safra', null]] },
  { id: 'c11', tp: PESSOA, base: 948201673, nome: 'Sítio Bela Vista', contato: 'Edson Kenji Tanaka', cidade: 'Ourinhos', fone: '14999990012', vend: 13, areaHa: 18, culturas: ['Hortaliças', 'Milho'], gps: [-0.024, 0.031],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 2025 Jivo', 1.9, 112000], ['implemento', 'Venda de Implementos', 'Roçadeira 1,5 m', 1.8, 14500]],
    frota: [['Mahindra', '2025 Jivo', 2024, 980]], pecas: [1500, 3, 400, 1, 27], os: [1, 120, [], 980],
    visitas: [[17, 'whatsapp', 'Quer encanteirador para hortaliças.', 'Mandar fotos e preço do encanteirador', 6]] },
  { id: 'c12', tp: PESSOA, base: 271630548, nome: 'Fazenda Santa Helena', contato: 'Wilson Bortolotto', cidade: 'Carlópolis', uf: 'PR', fone: '43999990013', vend: 13, areaHa: 210, culturas: ['Café', 'Milho'], gps: [0.031, 0.027],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6110', 8.1, 245000], ['implemento', 'Venda de Implementos', 'Carreta 6 t', 7.9, 32000]],
    frota: [['Mahindra', '6110', 2018, 7400], ['Yanmar', '1050', 2008, 15800]],
    pecas: [7200, 8, 6400, 7, 19], os: [2, 19, ['Yanmar'], 7400],
    visitas: [[19, 'presencial', 'Proposta do 6075 para o café; gostou, vai pensar.', null, null]] },
  { id: 'c13', tp: PESSOA, base: 583014296, nome: 'Sítio Nossa Senhora Aparecida', contato: 'Aparecida de Fátima Moreira', cidade: 'Piraju', fone: '14999990014', vend: 11, areaHa: 25, culturas: ['Leite', 'Pastagem'], gps: [0.061, 0.018],
    compras: [], frota: [['LS Tractor', 'Plus 80', 2019, 4300]], pecas: [2400, 6, 1700, 4, 12], os: [1, 140, ['LS Tractor'], 4300],
    visitas: [[205, 'presencial', 'Comprou LS Plus 80 pelo preço; disse que falta assistência.', 'Mostrar o 4025 com o pós-vendas', null]] },
  { id: 'c14', tp: PESSOA, base: 690337412, nome: 'Fazenda Ribeirão Claro', contato: 'Osvaldo Brizola', cidade: 'Fartura', fone: '14999990015', vend: 14, areaHa: 680, culturas: ['Soja', 'Trigo'], gps: [-0.044, -0.052],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 7590', 3.9, 448000], ['trator', 'Venda de Tratores', 'Mahindra 9500', 4.6, 512000], ['implemento', 'Venda de Implementos', 'Pulverizador 2.000 L', 3.8, 118000]],
    frota: [['Mahindra', '7590', 2022, 3900], ['Mahindra', '9500', 2021, 4800], ['Massey Ferguson', '4292', 2013, 10100]],
    pecas: [12400, 11, 11800, 10, 8], os: [4, 8, ['Massey Ferguson'], 10100],
    visitas: [[221, 'presencial', 'Pediu proposta de mais um trator para a colheita de trigo.', 'Enviar proposta do 6110', null]] },
  { id: 'c15', tp: PESSOA, base: 147258963, nome: 'Sítio Pedra Branca', contato: 'Valdir Aparecido Nogueira', cidade: 'Tejupá', fone: '14999990016', vend: 11, areaHa: 55, culturas: ['Feijão', 'Milho'], gps: [-0.033, -0.021],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 4025', 10.2, 98000], ['implemento', 'Venda de Implementos', 'Plantadeira 4 linhas', 9.8, 41000]],
    frota: [['Mahindra', '4025', 2016, 8900]], pecas: [3300, 5, 3100, 5, 44], os: [2, 44, [], 8900],
    visitas: [[51, 'presencial', 'Gostou do 4025 4x4 novo, mas acha a parcela alta.', 'Simular Pronaf Mais Alimentos', -21]] },
  { id: 'c16', tp: EMPRESA, base: 287461530001, nome: 'Rancho Alegre Agropecuária Ltda', contato: 'Marcelo Viana', cidade: 'Ipaussu', fone: '14999990017', vend: 12, areaHa: 1500, culturas: ['Cana-de-açúcar'], gps: [-0.041, -0.048],
    cnae: '0161-0/99', cnaeDescricao: 'Atividades de apoio à agricultura não especificadas anteriormente', aberturaAnos: 0.55, porte: 'EPP',
    compras: [], frota: [['John Deere', '6125J', 2020, 6900], ['John Deere', '7225J', 2022, 4100]],
    pecas: [4100, 4, 0, 0, 55], os: [2, 55, ['John Deere'], 6900],
    visitas: [[300, 'presencial', 'Fechou John Deere pelo relacionamento antigo com a revenda.', 'Voltar com demonstração do 9500', null]] },
  { id: 'c17', tp: PESSOA, base: 369852147, nome: 'Sítio São Francisco', contato: 'Francisco Chagas', cidade: 'Sarutaiá', fone: '14999990018', vend: 11, areaHa: 22, culturas: ['Café'], gps: [-0.019, 0.024],
    compras: [], frota: [['Yanmar', '1155', 2012, 4200]], pecas: [1800, 3, 900, 2, 65], os: [1, 65, ['Yanmar'], 4200],
    visitas: [[115, 'telefone', 'Achou o Yuvo 575 caro; vai reformar o Yanmar.', null, null]] },
  { id: 'c18', tp: PESSOA, base: 852963741, nome: 'Fazenda Cachoeira', contato: 'Dirceu Amaral', cidade: 'Timburi', fone: '14999990019', vend: 14, areaHa: 280, culturas: ['Pastagem'], gps: [0.037, -0.029],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6075', 6.3, 178000]], frota: [['Mahindra', '6075', 2020, 5900]],
    pecas: [2600, 4, 2200, 3, 74], os: [1, 74, [], 5900], visitas: [] },
  { id: 'c19', tp: PESSOA, base: 963741852, nome: 'Sítio Três Marias', contato: 'Maria José Pedroso', cidade: 'Bernardino de Campos', fone: '14999990020', vend: 12, areaHa: 70, culturas: ['Mandioca', 'Milho'], gps: [0.024, 0.033],
    compras: [['trator', 'Venda de Tratores', 'Mahindra Yuvo 585', 0.33, 236000], ['implemento', 'Venda de Implementos', 'Carreta basculante 4 t', 0.3, 28000]],
    frota: [['Mahindra', 'Yuvo 585', 2025, 310]], pecas: [600, 1, 0, 0, 96], os: [1, 60, [], 310],
    visitas: [[60, 'presencial', 'Entrega técnica do Yuvo 585. Indicou o vizinho.', null, null]] },
  { id: 'c20', tp: PESSOA, base: 741852963, nome: 'Fazenda Santa Cecília', contato: 'Gilberto Zanella', cidade: 'Chavantes', fone: '14999990021', vend: 13, areaHa: 900, culturas: ['Soja', 'Milho'], gps: [-0.035, 0.041],
    compras: [], frota: [['Massey Ferguson', '4292', 2014, 9900], ['Valtra', 'A950', 2019, 5200]],
    pecas: [3900, 4, 3500, 4, 51], os: [2, 51, ['Massey Ferguson', 'Valtra'], 9900],
    visitas: [[33, 'presencial', 'Banco analisando o Moderfrota do 9500 4x4.', 'Ligar para saber do banco', -12], [62, 'presencial', 'Perdemos o 7590 para a Massey pelo prazo de entrega.', null, null]] },
  { id: 'c21', tp: PESSOA, base: 258369147, nome: 'Sítio Vista Alegre', contato: 'Rosângela Tavares', cidade: 'Piraju', fone: '14999990022', vend: 11, areaHa: 15, culturas: ['Banana', 'Café'], gps: [-0.016, 0.052],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 2025 Jivo', 3.8, 98000]], frota: [['Mahindra', '2025 Jivo', 2022, 2100]],
    pecas: [900, 2, 700, 2, 101], os: [1, 101, [], 2100],
    visitas: [[150, 'whatsapp', 'Perguntou de trincha para o bananal.', 'Mandar preço de trincha', -120]] },
  { id: 'c22', tp: EMPRESA, base: 194735260001, nome: 'Ourinhos Agrícola Serviços Ltda', contato: 'Fábio Correia Lemos', cidade: 'Ourinhos', fone: '14999990023', vend: 13, areaHa: 1100, culturas: ['Cana-de-açúcar'], gps: [0.052, -0.046],
    cnae: '0161-0/03', cnaeDescricao: 'Serviço de preparação de terreno, cultivo e colheita', aberturaAnos: 8, porte: 'DEMAIS',
    compras: [['trator', 'Venda de Tratores', 'Mahindra 7590', 7.4, 389000], ['implemento', 'Venda de Implementos', 'Carreta canavieira 10 t', 7.3, 88000]],
    frota: [['Mahindra', '7590', 2019, 8700], ['Case', 'Magnum 340', 2021, 6100]],
    pecas: [19800, 15, 17600, 14, 9], os: [4, 9, ['Case'], 8700],
    visitas: [[19, 'presencial', 'Pediu proposta de 7590 para nova frente de cana.', 'Enviar proposta', null]] },
  { id: 'c23', tp: PESSOA, base: 475869231, nome: 'Sítio Primavera', contato: 'Ademir Kruger', cidade: 'Carlópolis', uf: 'PR', fone: '43999990024', vend: 13, areaHa: 48, culturas: ['Café'], gps: [-0.027, -0.022],
    compras: [], frota: [['LS Tractor', 'U60', 2025, 420], ['Agrale', '4100', 2006, 12900]],
    pecas: [1300, 2, 2100, 3, 140], os: [1, 140, ['LS Tractor', 'Agrale'], 420],
    visitas: [[152, 'presencial', 'Fechou LS U60 pelo preço. Ficou de pensar num fruteiro no futuro.', null, null]] },
  { id: 'c24', tp: PESSOA, base: 632587410, nome: 'Fazenda Palmital', contato: 'Nelson Guarnieri', cidade: 'Fartura', fone: '14999990025', vend: 14, areaHa: 330, culturas: ['Milho', 'Pastagem'], gps: [0.058, -0.031],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6110', 3.2, 352000], ['implemento', 'Venda de Implementos', 'Grade niveladora 32 discos', 3.1, 39000]],
    frota: [['Mahindra', '6110', 2023, 2600]], pecas: [0, 0, 4400, 5, 420], os: [0, 420, [], 2600],
    visitas: [[64, 'presencial', 'Quer mais um 6110 para o milho safrinha.', 'Retorno com proposta', null]] },
  { id: 'c25', tp: PESSOA, base: 908172635, nome: 'Sítio Santo Antônio', contato: 'Antônio Carlos Baldin', cidade: 'Tejupá', fone: '14999990026', vend: 11, areaHa: 40, culturas: ['Leite'], gps: [0.041, -0.036],
    compras: [['trator', 'Venda de Tratores', 'Mahindra 6075', 7.9, 162000]], frota: [['Mahindra', '6075', 2018, 6800]],
    pecas: [3700, 6, 3300, 5, 18], os: [2, 18, [], 6800],
    visitas: [[10, 'presencial', 'Quer trocar o 6075 por um 6075 4x4 com concha.', 'Aguardar resposta da proposta', null], [190, 'telefone', 'Revisão em dia.', null, null]] },
]

// =============================================================================
// PROPOSTAS do Portal (formato FonteProposta) — abertas, ganhas e perdidas
//   d = { criado (dias atrás), desde (dias atrás), prox (dias a partir de hoje), val (dias a partir de hoje), fechado (dias atrás) }
// =============================================================================
const PROPOSTA_PERDIDA = 'Concluida- Não vendido.'
const PROPOSTA_GANHA = 'Concluida- Vendido.'
const SPEC_PROPOSTAS = [
  { id: 4101, cli: 'c2', marca: 'Mahindra', modelo: 'Yuvo 585 4x4 + carreta', valor: 290000, status: 'Aguardando resposta do cliente', vend: 11, d: { criado: 60, desde: 54, val: 10 }, termometro: 3 },
  { id: 4102, cli: 'c9', marca: 'Mahindra', modelo: '7590 4x4', valor: 420000, status: 'Em negociação', vend: 12, d: { criado: 30, desde: 22, prox: -6, val: 15 }, termometro: 4 },
  { id: 4103, cli: 'c14', marca: 'Mahindra', modelo: '6110 4x4', valor: 365000, status: 'Enviada ao cliente', vend: 14, d: { criado: 25, desde: 12, prox: 4, val: 3 }, termometro: 3 },
  { id: 4104, cli: 'c20', marca: 'Mahindra', modelo: '9500 4x4', valor: 610000, status: 'Aguardando aprovação do banco', vend: 13, d: { criado: 40, desde: 33, prox: -12, val: 20 }, termometro: 4 },
  { id: 4105, cli: 'c5', marca: 'Mahindra', modelo: '6110 + plantadeira 7 linhas', valor: 480000, status: 'Em negociação', vend: 11, d: { criado: 9, desde: 8, prox: 3, val: 21 }, termometro: 5 },
  { id: 4106, cli: 'c12', marca: 'Mahindra', modelo: '6075 4x4', valor: 289000, status: 'Enviada ao cliente', vend: 13, d: { criado: 19, desde: 19, val: 11 }, termometro: 3 },
  { id: 4107, cli: 'c25', marca: 'Mahindra', modelo: '6075 4x4 com concha', valor: 298000, status: 'Aguardando resposta do cliente', vend: 11, d: { criado: 10, desde: 10, val: 20 }, termometro: 4 },
  { id: 4108, cli: 'c18', marca: '', modelo: 'Roçadeira hidráulica 1,7 m', valor: 38000, status: 'Enviada ao cliente', vend: 14, d: { criado: 50, desde: 47, val: -2 }, termometro: 2 },
  { id: 4109, cli: 'c22', marca: 'Mahindra', modelo: '7590 4x4', valor: 472000, status: 'Elaborando proposta', vend: 13, d: { criado: 18, desde: 18, prox: 2, val: 30 }, termometro: 4 },
  // perdidas
  { id: 3901, cli: 'c7', marca: 'Mahindra', modelo: '6110', valor: 372000, status: PROPOSTA_PERDIDA, vend: 14, d: { criado: 280, fechado: 244 }, concorrente: 'John Deere', concorrenteValor: 395000, motivo: 'Preço' },
  { id: 3902, cli: 'c10', marca: 'Mahindra', modelo: '9500 4x4', valor: 598000, status: PROPOSTA_PERDIDA, vend: 12, d: { criado: 450, fechado: 402 }, concorrente: 'Valtra', concorrenteValor: 590000, motivo: 'Condição de pagamento' },
  { id: 3903, cli: 'c23', marca: 'Mahindra', modelo: 'Yuvo 575', valor: 205000, status: PROPOSTA_PERDIDA, vend: 13, d: { criado: 175, fechado: 152 }, concorrente: 'LS Tractor', concorrenteValor: 186000, motivo: 'Preço' },
  { id: 3904, cli: 'c20', marca: 'Mahindra', modelo: '7590', valor: 455000, status: PROPOSTA_PERDIDA, vend: 13, d: { criado: 95, fechado: 62 }, concorrente: 'Massey Ferguson', concorrenteValor: 468000, motivo: 'Prazo de entrega' },
  { id: 3905, cli: 'c16', marca: 'Mahindra', modelo: '7590 4x4', valor: 462000, status: PROPOSTA_PERDIDA, vend: 12, d: { criado: 330, fechado: 300 }, concorrente: 'John Deere', concorrenteValor: 489000, motivo: 'Relacionamento com a outra revenda' },
  { id: 3906, cli: 'c13', marca: 'Mahindra', modelo: '4025', valor: 158000, status: PROPOSTA_PERDIDA, vend: 11, d: { criado: 230, fechado: 205 }, concorrente: 'LS Tractor', concorrenteValor: 141000, motivo: 'Preço' },
  { id: 3907, cli: 'c9', marca: 'Mahindra', modelo: '6075', valor: 255000, status: PROPOSTA_PERDIDA, vend: 12, d: { criado: 540, fechado: 505 }, concorrente: 'New Holland', concorrenteValor: 262000, motivo: 'Usado mal avaliado' },
  { id: 3908, cli: 'c17', marca: 'Mahindra', modelo: 'Yuvo 575', valor: 199000, status: PROPOSTA_PERDIDA, vend: 11, d: { criado: 130, fechado: 115 }, concorrente: '', concorrenteValor: null, motivo: 'Sem orçamento' },
  { id: 3909, cli: 'c4', marca: 'Mahindra', modelo: '9500 4x4', valor: 575000, status: PROPOSTA_PERDIDA, vend: 14, d: { criado: 40, fechado: 28 }, concorrente: 'John Deere', concorrenteValor: 610000, motivo: 'Produto (potência)' },
  // ganhas
  { id: 3801, cli: 'c19', marca: 'Mahindra', modelo: 'Yuvo 585 4x4', valor: 236000, status: PROPOSTA_GANHA, vend: 12, d: { criado: 150, fechado: 121 } },
  { id: 3802, cli: 'c8', marca: 'Mahindra', modelo: '6075 4x4', valor: 279000, status: PROPOSTA_GANHA, vend: 12, d: { criado: 900, fechado: 877 } },
  { id: 3803, cli: 'c11', marca: 'Mahindra', modelo: '2025 Jivo', valor: 112000, status: PROPOSTA_GANHA, vend: 13, d: { criado: 720, fechado: 694 } },
  { id: 3804, cli: 'c5', marca: 'Mahindra', modelo: 'Yuvo 585', valor: 238000, status: PROPOSTA_GANHA, vend: 11, d: { criado: 650, fechado: 621 } },
  { id: 3805, cli: 'c24', marca: 'Mahindra', modelo: '6110', valor: 352000, status: PROPOSTA_GANHA, vend: 14, d: { criado: 1200, fechado: 1168 } },
]

// Negócios do CRM dos vendedores (tabela negocios)
const SPEC_NEGOCIOS = [
  { id: 701, cli: 'c6', vend: 11, status: 'apresentacao_proposta', valor: 210000, marca: 'Mahindra', modelo: 'Yuvo 575 fruteiro', parado: 28, prevista: 15 },
  { id: 702, cli: 'c15', vend: 11, status: 'contorno_objecoes', valor: 175000, marca: 'Mahindra', modelo: '4025 4x4', parado: 51, prevista: -5 },
  { id: 703, cli: 'c22', vend: 13, status: 'solicitacao_proposta', valor: 470000, marca: 'Mahindra', modelo: '7590', parado: 19, prevista: 25 },
  { id: 704, cli: 'c24', vend: 14, status: 'andamento', valor: 390000, marca: 'Mahindra', modelo: '6110', parado: 64, prevista: -20 },
  { id: 705, cli: 'c11', vend: 13, status: 'prospeccao', valor: 22000, marca: '', modelo: 'Encanteirador 1,2 m', parado: 17, prevista: 30 },
  { id: 706, cli: 'c3', vend: 11, status: 'prospeccao', valor: 46000, marca: '', modelo: 'Roçadeira + carreta 3 t', parado: 8, prevista: 20 },
]
// Negócios perdidos no CRM (status fechamento_negativo) — entram na Concorrência
const SPEC_NEGOCIOS_PERDIDOS = [
  { id: 651, cli: 'c17', vend: 11, marca: 'Mahindra', modelo: 'Yuvo 575', motivo: 'concorrencia', concorrente: 'Yanmar', valorConcorrente: 165000, dias: 118 },
  { id: 652, cli: 'c21', vend: 11, marca: '', modelo: 'Trincha 1,6 m', motivo: 'sem_orcamento', concorrente: '', valorConcorrente: null, dias: 96 },
  { id: 653, cli: 'c10', vend: 12, marca: 'Mahindra', modelo: '7590', motivo: 'preco', concorrente: 'Valtra', valorConcorrente: 451000, dias: 260 },
  { id: 654, cli: 'c20', vend: 13, marca: 'Mahindra', modelo: '6110', motivo: 'prazo', concorrente: 'Case', valorConcorrente: 398000, dias: 190 },
]
const MOTIVO_CRM = { preco: 'Preço', concorrencia: 'Concorrência', sem_orcamento: 'Sem orçamento', sem_interesse: 'Sem interesse', prazo: 'Prazo', produto_inadequado: 'Produto inadequado', sem_retorno: 'Sem retorno', outro: 'Outro' }

// =============================================================================
// MONTAGEM
// =============================================================================
const anosAtras = (hoje, a) => somarDias(hoje, -Math.round(a * 365.25))

function montarClientes(hoje) {
  const props = montarPropostas(hoje)
  let visitaId = 90000
  return SPEC_CLIENTES.map((s, i) => {
    const doc = s.tp === EMPRESA ? cnpj(s.base) : cpf(s.base)
    const uf = s.uf || 'SP'
    const centro = centroDaCidade(s.cidade)
    const maquinas = s.compras.map(([tipo, familia, modelo, a, valor]) => ({ tipo, familia, modelo, data: anosAtras(hoje, a), valor, origem: a > 3.9 ? 'revisoes' : 'omie' }))
      .sort((a, b) => b.data.localeCompare(a.data))
    const tratores = maquinas.filter((m) => m.tipo === 'trator')
    const ultimoTrator = tratores[0] || null
    const minhas = props.filter((p) => p._cli === s.id)
    const abertas = minhas.filter((p) => p.em_aberto)
    const perdidas = minhas.filter((p) => p.status === PROPOSTA_PERDIDA).sort((a, b) => b.fechado_em.localeCompare(a.fechado_em))
    const historicoVisitas = s.visitas.map(([dias, tipo, resumo, proximos, prox]) => ({
      id: ++visitaId, data_visita: somarDias(hoje, -dias), tipo, resumo, proximos_passos: proximos, vendedor_id: s.vend, vendedor: nomeVend(s.vend),
      data_proximo_contato: prox == null ? null : somarDias(hoje, prox), propriedade_id: 5000 + i + 1,
    })).sort((a, b) => b.data_visita.localeCompare(a.data_visita))
    const [p12, n12, p24, n24, diasPecas] = s.pecas
    const [os12, diasOS, marcas, horimetro] = s.os
    const compras = [
      ...maquinas.map((m) => ({ data: m.data, tipo: 'maquina', descricao: m.modelo, valor: m.valor })),
      ...Array.from({ length: Math.min(6, n12 + n24) }, (_, k) => ({ data: somarDias(hoje, -(diasPecas + k * 47)), tipo: 'pecas', descricao: ['Filtros e óleo', 'Kit embreagem', 'Pneu dianteiro', 'Rolamentos', 'Bomba d\'água', 'Correias'][k % 6], valor: Math.round(((p12 + p24) / Math.max(1, n12 + n24)) * (0.7 + (k % 3) * 0.3)) })),
      ...(diasOS < 800 ? [{ data: somarDias(hoje, -diasOS), tipo: 'os', descricao: horimetro ? `Revisão / OS · horímetro ${horimetro.toLocaleString('pt-BR')} h` : 'OS de oficina', valor: null }] : []),
    ].sort((a, b) => b.data.localeCompare(a.data))
    const c = {
      // ── campos do ClienteIV do Portal ──
      chave: doc, doc, nome: s.nome, cidade: s.cidade, chaveCidade: `${textoNorm(s.cidade)}|${uf}`, uf, telefone: s.fone,
      lojas: ['NOVA'], codigos: [{ empresa: 'Nova Tratores', cod: String(2400 + i * 37) }], inativo: false,
      maquinas, ultimoTrator, anosUltimoTrator: ultimoTrator ? Math.floor(diasEntre(ultimoTrator.data, hoje) / 365.25) : null,
      qtdTratores: tratores.length, qtdImplementos: maquinas.filter((m) => m.tipo === 'implemento').length, valorMaquinas: maquinas.reduce((a, m) => a + (m.valor || 0), 0),
      pecas12m: p12, pedidosPecas12m: n12, pecas12a24m: p24, pedidosPecas12a24m: n24, ultimaCompraPecas: somarDias(hoje, -diasPecas),
      os12m: os12, ultimaOS: somarDias(hoje, -diasOS), marcasNaOficina: marcas, maiorHorimetro: horimetro,
      propostasAbertas: abertas.length, propostasGanhas: minhas.filter((p) => p.status === PROPOSTA_GANHA).length, propostasPerdidas: perdidas.length,
      ultimaProposta: minhas.map((p) => p.criado_em).sort().pop() || '',
      ultimaPerdida: perdidas[0] ? { data: perdidas[0].fechado_em, modelo: perdidas[0].Modelo, marca: perdidas[0].Marca } : null,
      valorPropostasAbertas: abertas.reduce((a, p) => a + Number(p.Valor_Total), 0),
      areaHa: s.areaHa, propriedades: [5000 + i + 1], local: centro ? [+(centro[0] + s.gps[0]).toFixed(5), +(centro[1] + s.gps[1]).toFixed(5)] : null,
      culturas: s.culturas, ultimaVisita: historicoVisitas[0]?.data_visita || '', visitas: historicoVisitas.length, vendedor: nomeVend(s.vend),
      cnae: s.cnae || '', cnaeDescricao: s.cnaeDescricao || '', abertura: s.aberturaAnos != null ? anosAtras(hoje, s.aberturaAnos) : '', porte: s.porte || '',
      oportunidades: [], score: 0,
      // ── EXTRAS só do exemplo (o Portal ainda não manda; a ficha do app pode usar) ──
      id: s.id, contato: s.contato, tipoPessoa: s.tp === EMPRESA ? 'PJ' : 'PF', vendedorId: s.vend,
      frota: s.frota.map(([marca, modelo, ano, horimetroM]) => ({ marca, modelo, ano, horimetro: horimetroM, nossa: marca === 'Mahindra' && s.compras.some((x) => x[2].includes(modelo)) })),
      historicoVisitas, compras,
      propostasLista: minhas.map((p) => ({ id: p.id, oque: [p.Marca, p.Modelo].filter(Boolean).join(' '), valor: Number(p.Valor_Total), status: p.status, criado_em: p.criado_em, fechado_em: p.fechado_em, concorrente: p.concorrente })),
    }
    c.oportunidades = avaliarCliente(c, hoje)
    c.score = Math.min(100, c.oportunidades.reduce((a, o) => a + o.peso, 0))
    return c
  }).sort((a, b) => b.score - a.score || b.pecas12m - a.pecas12m)
}

const SPEC_CLI = Object.fromEntries(SPEC_CLIENTES.map((s) => [s.id, s]))
function montarPropostas(hoje) {
  const d = (n) => (n == null ? null : somarDias(hoje, -n))
  const f = (n) => (n == null ? null : somarDias(hoje, n))
  return SPEC_PROPOSTAS.map((p) => {
    const s = SPEC_CLI[p.cli]
    const fechada = p.status === PROPOSTA_PERDIDA || p.status === PROPOSTA_GANHA
    const doc = s.tp === EMPRESA ? cnpj(s.base) : cpf(s.base)
    return {
      id: p.id, Cliente: s.nome, cliente_doc_norm: doc, 'Cpf/Cpnj': doc, Cidade: s.cidade, Modelo: p.modelo, Marca: p.marca || null, status: p.status,
      vendedor_id: p.vend, vendedor_nome: nomeVend(p.vend), criado_em: d(p.d.criado), status_desde: fechada ? d(p.d.fechado) : d(p.d.desde ?? p.d.criado),
      proximo_contato: f(p.d.prox), previsao_fechamento: fechada ? null : f((p.d.val ?? 15) + 5), validade: f(p.d.val),
      Valor_Total: String(p.valor), em_aberto: !fechada, motivo_perda_id: null, motivo: p.motivo || null,
      concorrente: p.concorrente || null, concorrente_valor: p.concorrenteValor ?? null, fechado_em: fechada ? d(p.d.fechado) : null, termometro: p.termometro ?? null,
      dias_na_fase: fechada ? null : (p.d.desde ?? p.d.criado),
      _cli: p.cli,
    }
  })
}

// ── fila "sem retorno" (port de retorno.ts → montarFila) ──────────────────────
export const ETAPAS_ABERTAS_CRM = ['prospeccao', 'andamento', 'solicitacao_proposta', 'apresentacao_proposta', 'contorno_objecoes']
export const ROTULO_ETAPA_CRM = { prospeccao: 'Prospecção', andamento: 'Andamento', solicitacao_proposta: 'Solicitação da proposta', apresentacao_proposta: 'Apresentação da proposta', contorno_objecoes: 'Contorno de objeções' }
export const ROTULO_MOTIVO = { contato_vencido: 'Contato combinado venceu', parada: 'Parada na mesma fase', sem_proximo: 'Sem próximo contato marcado', validade: 'Validade vencendo', retorno_visita: 'Retorno da visita não feito' }

function montarFila({ propostas, negocios, visitas, hoje, diasParada = 15 }) {
  const out = []
  for (const p of propostas) {
    if (!p.em_aberto) continue
    const desde = dataISO(p.status_desde || p.criado_em), dias = diasEntre(desde, hoje)
    const prox = dataISO(p.proximo_contato), val = dataISO(p.validade)
    const base = { origem: 'proposta', id: p.id, cliente: p.Cliente, cidade: p.Cidade, vendedor: p.vendedor_nome, oque: [p.Marca, p.Modelo].filter(Boolean).join(' '),
      valor: Number(p.Valor_Total) || 0, fase: p.status, desde, dias, idadeIncerta: false, proximoContato: prox }
    if (prox && prox < hoje) out.push({ ...base, motivo: 'contato_vencido', detalhe: `Contato marcado para ${br(prox)} (${diasEntre(prox, hoje)} dia(s) atrás)`, gravidade: 3 })
    else if (val && val >= hoje && (diasEntre(hoje, val) ?? 99) <= 5) out.push({ ...base, motivo: 'validade', detalhe: `Validade termina em ${br(val)}`, gravidade: 3 })
    else if (dias != null && dias > diasParada) out.push({ ...base, motivo: 'parada', detalhe: `Há ${dias} dias em "${base.fase}"`, gravidade: dias > 45 ? 3 : 2 })
    else if (!prox) out.push({ ...base, motivo: 'sem_proximo', detalhe: 'Nenhum próximo contato marcado', gravidade: 1 })
  }
  for (const n of negocios) {
    if (!ETAPAS_ABERTAS_CRM.includes(n.status)) continue
    const desde = dataISO(n.updated_at), dias = diasEntre(desde, hoje)
    if (dias == null || dias <= diasParada) continue
    out.push({ origem: 'negocio', id: n.id, cliente: n._nome, cidade: n.cidade, vendedor: nomeVend(n.vendedor_id), oque: [n.maquina_marca, n.maquina_modelo].filter(Boolean).join(' '),
      valor: n.valor || 0, fase: ROTULO_ETAPA_CRM[n.status], desde, dias, idadeIncerta: false, motivo: 'parada', detalhe: `Negócio sem movimento há ${dias} dias no CRM`,
      gravidade: dias > 45 ? 3 : 2, proximoContato: dataISO(n.data_fechamento_prevista) })
  }
  const ultima = new Map()
  for (const v of visitas) { const a = ultima.get(v.propriedade_id); if (!a || v.data_visita > a.data_visita) ultima.set(v.propriedade_id, v) }
  for (const v of ultima.values()) {
    const prox = dataISO(v.data_proximo_contato)
    if (!prox || prox >= hoje) continue
    const atraso = diasEntre(prox, hoje)
    out.push({ origem: 'visita', id: v.id, cliente: v._nome, cidade: v._cidade, vendedor: nomeVend(v.vendedor_id), oque: String(v.proximos_passos || '').slice(0, 80), valor: 0, fase: 'Visita',
      desde: v.data_visita, dias: diasEntre(v.data_visita, hoje), idadeIncerta: false, motivo: 'retorno_visita', detalhe: `Retorno combinado para ${br(prox)} (${atraso} dia(s) atrás)`,
      gravidade: atraso > 15 ? 3 : 2, proximoContato: prox })
  }
  return out.sort((a, b) => b.gravidade - a.gravidade || b.valor - a.valor || (b.dias ?? 0) - (a.dias ?? 0))
}
export function resumoPorVendedor(itens) {
  const m = new Map()
  for (const i of itens) { const k = i.vendedor || 'Sem vendedor'; const r = m.get(k) || { vendedor: k, itens: 0, urgentes: 0, valor: 0 }; r.itens++; if (i.gravidade === 3) r.urgentes++; r.valor += i.valor; m.set(k, r) }
  return [...m.values()].sort((a, b) => b.urgentes - a.urgentes || b.valor - a.valor)
}

function montarNegocios(hoje) {
  return SPEC_NEGOCIOS.map((n) => {
    const s = SPEC_CLI[n.cli]
    return { id: n.id, vendedor_id: n.vend, propriedade_id: 5000 + SPEC_CLIENTES.indexOf(s) + 1, status: n.status, valor: n.valor, updated_at: somarDias(hoje, -n.parado), created_at: somarDias(hoje, -n.parado - 20),
      data_fechamento_prevista: somarDias(hoje, n.prevista), maquina_modelo: n.modelo, maquina_marca: n.marca || null, notas: `${s.nome} — ${s.contato}`, cidade: s.cidade, _nome: s.nome }
  })
}

// =============================================================================
// IMÓVEIS RURAIS DO CAR (prospecção) — com polígono simples
//   [municipio, areaHa, cultura, investimento 36m, crédito 36m, cliente vinculado | null, [dLat, dLng]]
// =============================================================================
const SPEC_CAR = [
  ['Fartura', 420, 'Soja', 1200000, 2900000, null, [0.071, -0.038]],
  ['Fartura', 520, 'Soja', 640000, 1800000, 'c4', [0.046, 0.058]],
  ['Fartura', 680, 'Soja', 980000, 2600000, 'c14', [-0.044, -0.052]],
  ['Fartura', 310, 'Milho', 640000, 1100000, null, [-0.068, 0.031]],
  ['Fartura', 1150, 'Soja', 2400000, 5200000, null, [0.012, 0.089]],
  ['Piraju', 85, 'Café', 0, 180000, 'c1', [0.034, -0.041]],
  ['Piraju', 260, 'Soja', 290000, 760000, 'c2', [-0.051, 0.022]],
  ['Piraju', 1200, 'Cana-de-açúcar', 1900000, 4100000, 'c5', [-0.072, -0.065]],
  ['Piraju', 390, 'Soja', 780000, 1400000, null, [0.082, 0.047]],
  ['Piraju', 140, 'Café', 310000, 520000, null, [-0.029, -0.083]],
  ['Piraju', 75, 'Pastagem', 0, 60000, null, [0.055, 0.074]],
  ['Tejupá', 32, 'Pastagem', 0, 40000, 'c3', [0.022, 0.031]],
  ['Tejupá', 610, 'Soja', 1500000, 2700000, null, [-0.062, 0.049]],
  ['Tejupá', 230, 'Feijão', 420000, 690000, null, [0.071, -0.044]],
  ['Sarutaiá', 40, 'Café', 0, 90000, 'c6', [0.018, -0.026]],
  ['Sarutaiá', 180, 'Café', 520000, 610000, null, [-0.045, 0.051]],
  ['Timburi', 350, 'Pastagem', 120000, 380000, 'c7', [-0.031, 0.044]],
  ['Timburi', 870, 'Pastagem', 900000, 1300000, null, [0.064, 0.058]],
  ['Timburi', 260, 'Soja', 150000, 640000, null, [-0.07, -0.039]],
  ['Ipaussu', 1500, 'Cana-de-açúcar', 1600000, 3900000, 'c16', [-0.041, -0.048]],
  ['Ipaussu', 460, 'Soja', 1100000, 1700000, null, [0.059, -0.063]],
  ['Ipaussu', 95, 'Laranja', 260000, 330000, null, [-0.066, 0.042]],
  ['Bernardino de Campos', 410, 'Milho', 350000, 1200000, 'c9', [-0.038, -0.027]],
  ['Bernardino de Campos', 720, 'Soja', 1700000, 2500000, null, [0.069, 0.061]],
  ['Chavantes', 800, 'Cana-de-açúcar', 600000, 2200000, 'c10', [0.043, 0.039]],
  ['Chavantes', 1340, 'Cana-de-açúcar', 2100000, 4600000, null, [-0.064, -0.058]],
  ['Ourinhos', 1100, 'Cana-de-açúcar', 1300000, 3500000, 'c22', [0.052, -0.046]],
  ['Ourinhos', 540, 'Soja', 980000, 1600000, null, [-0.058, 0.067]],
  ['Carlópolis', 210, 'Café', 280000, 640000, 'c12', [0.031, 0.027]],
  ['Carlópolis', 650, 'Soja', 1300000, 2100000, null, [-0.069, 0.054]],
  ['Carlópolis', 120, 'Café', 0, 150000, null, [0.061, -0.067]],
]

function montarImoveisCar(clientes) {
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]))
  return SPEC_CAR.map(([municipio, areaHa, cultura, investimento, credito, cli, off], i) => {
    const cid = CID[textoNorm(municipio)]
    const r = prng(semente(`car${i}${municipio}`))
    const hex = Array.from({ length: 32 }, () => '0123456789ABCDEF'[Math.floor(r() * 16)]).join('')
    const lat = +(cid.centro[0] + off[0]).toFixed(5), lng = +(cid.centro[1] + off[1]).toFixed(5)
    // polígono de 5 a 6 pontos com área aproximada à do imóvel
    const lado = Math.sqrt(areaHa / 100) / 111 // km → graus
    const n = 5 + (i % 2)
    const poligono = Array.from({ length: n }, (_, k) => {
      const ang = (2 * Math.PI * k) / n + r() * 0.3
      const raio = (lado / 1.6) * (0.8 + r() * 0.4)
      return [+(lat + raio * Math.sin(ang)).toFixed(5), +(lng + raio * Math.cos(ang) * 1.09).toFixed(5)]
    })
    const score = Math.round(Math.min(100, 20 + 40 * Math.min(1, areaHa / 1200) + 40 * Math.min(1, investimento / 2000000)))
    const c = cli ? porId[cli] : null
    return {
      cod: `${cid.uf}-${cid.ibge}-${hex}`, municipio, uf: cid.uf, ibge: cid.ibge, areaHa, cultura, investimento, credito,
      lat, lng, poligono, score, prioridade: score >= 60 ? 'alta' : score >= 35 ? 'media' : 'baixa',
      vinculos: c ? 1 : 0, clienteChave: c?.chave || null, clienteNome: c?.nome || null, clienteId: c?.id || null, status_car: 'AT',
    }
  })
}

// =============================================================================
// FEED do vendedor (port de feed.ts → montarReserva) — formato de iv_feed_pool.itens
// =============================================================================
const chaveNome = (c) => textoNorm(String(c).replace(/\s*[(/-]\s*[A-Za-z]{2}\)?\s*$/, '').trim())
const tituloCaso = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase())
export const nomeCurto = (s) => {
  const ps = String(s).split(/\s+/).filter(Boolean).slice(0, 3)
  while (ps.length > 1 && /^(da|de|do|das|dos|e)$/i.test(ps[ps.length - 1])) ps.pop()
  return ps.map((p) => (p.length > 2 ? p[0] + p.slice(1).toLowerCase() : p.toLowerCase())).join(' ')
}
export const reaisCurto = (v) => (v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi` : v >= 1e3 ? `R$ ${Math.round(v / 1e3).toLocaleString('pt-BR')} mil` : `R$ ${Math.round(v)}`)

function montarReserva({ vendedor, clientes, parados, imoveis }) {
  const cidades = new Set(vendedor.cidades.map(chaveNome))
  const naArea = (c) => cidades.has(chaveNome(c))
  const ehDele = (nome) => nome === vendedor.nome
  const pos = (cidade, local) => {
    if (local) return { lat: local[0], lng: local[1], aprox: false }
    const c = centroDaCidade(cidade)
    return c ? { lat: c[0], lng: c[1], aprox: true } : { lat: null, lng: null, aprox: true }
  }
  const out = []
  const cart = clientes.filter((c) => c.oportunidades.some((o) => o.regra !== 'reabordar') && (naArea(c.cidade) || ehDele(c.vendedor))).sort((a, b) => b.score - a.score).slice(0, 60)
  const maxS = Math.max(1, ...cart.map((c) => c.score))
  for (const c of cart) {
    const o = c.oportunidades.find((x) => x.regra !== 'reabordar') || c.oportunidades[0]
    out.push({ id: `c:${c.chave}`, tipo: 'carteira', titulo: nomeCurto(c.nome), sub: [tituloCaso(c.cidade), c.ultimoTrator?.modelo].filter(Boolean).join(' · '), cidade: c.cidade,
      porque: `${o.titulo}. ${o.porque}`, acao: `Ofereça ${o.oferecer.replace(/^./, (x) => x.toLowerCase())}.`, selo: `nota ${c.score}`, peso: c.score / maxS,
      ...pos(c.cidade, c.local), propriedadeId: c.propriedades?.[0], telefone: c.telefone, clienteId: c.id })
  }
  const par = parados.filter((p) => ehDele(p.vendedor) || (!p.vendedor && naArea(p.cidade))).sort((a, b) => b.gravidade - a.gravidade || b.valor - a.valor).slice(0, 30)
  const maxV = Math.max(1, ...par.map((p) => p.valor || 0))
  for (const p of par) {
    const c = clientes.find((x) => x.nome === p.cliente)
    out.push({ id: `p:${p.origem}:${p.id}`, tipo: 'recuperar', titulo: nomeCurto(p.cliente), sub: p.oque || p.fase, cidade: p.cidade,
      porque: `${p.detalhe || p.fase}${p.dias != null && !/dias/.test(p.detalhe || '') ? ` — parado há ${p.dias} dias` : ''}.`, acao: 'Feche o negócio ou registre o motivo da perda.',
      selo: p.valor ? reaisCurto(p.valor) : 'sem valor', peso: 0.5 + 0.5 * ((p.valor || 0) / maxV) * (p.gravidade / 3), ...pos(p.cidade, c?.local || null),
      propriedadeId: c?.propriedades?.[0], telefone: c?.telefone, clienteId: c?.id })
  }
  for (const c of clientes.filter((x) => x.oportunidades.some((o) => o.regra === 'reabordar') && naArea(x.cidade)).slice(0, 10)) {
    const o = c.oportunidades.find((x) => x.regra === 'reabordar')
    out.push({ id: `r:${c.chave}`, tipo: 'recuperar', titulo: nomeCurto(c.nome), sub: c.cidade, cidade: c.cidade, porque: `${o.titulo}. ${o.porque}`,
      acao: 'Pergunte se a máquina que ele comprou está atendendo.', selo: 'reabordar', peso: 0.4, ...pos(c.cidade, c.local), propriedadeId: c.propriedades?.[0], telefone: c.telefone, clienteId: c.id })
  }
  const novos = imoveis.filter((p) => !p.vinculos && naArea(p.municipio)).sort((a, b) => b.areaHa - a.areaHa).slice(0, 30)
  const maxA = Math.max(1, ...novos.map((p) => p.areaHa))
  for (const p of novos) {
    out.push({ id: `n:${p.cod}`, tipo: 'novos', titulo: `${Math.round(p.areaHa).toLocaleString('pt-BR')} ha${p.cultura ? ` de ${p.cultura.toLowerCase()}` : ''}`,
      sub: `Propriedade sem cliente nosso · ${p.municipio}`, cidade: p.municipio,
      porque: `Propriedade grande no CAR sem nenhum cliente nosso ligado${p.investimento ? `, que pegou ${reaisCurto(p.investimento)} de crédito para investir em 3 anos` : ''}.`,
      acao: 'Passe na propriedade ou pergunte aos vizinhos quem é o dono.', selo: `${Math.round(p.areaHa).toLocaleString('pt-BR')} ha`, peso: p.areaHa / maxA, lat: p.lat, lng: p.lng, aprox: false })
  }
  return out
}

// =============================================================================
// PROSPECÇÃO (port de prospeccao-server.ts + falasTratorilson de prospeccao.ts)
// =============================================================================
const cidadeBonita = (c) => String(c).replace(/\s*\(..\)$/, '').toLowerCase().replace(/(^|\s)\S/g, (x) => x.toUpperCase())
const nfmt = (v) => Math.round(v).toLocaleString('pt-BR')
const reaisLongo = (v) => (v >= 1e6 ? `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} milhões` : v >= 1e3 ? `R$ ${nfmt(v / 1e3)} mil` : `R$ ${nfmt(v)}`)
const primeiro = (nome) => nome.split(/\s+/).slice(0, 2).map((p) => p[0] + p.slice(1).toLowerCase()).join(' ')
const minus = (t) => t.replace(/^./, (x) => x.toLowerCase())
const plural = (q, um, varios) => `${nfmt(q)} ${q === 1 ? um : varios}`

export function falasTratorilson(r) {
  const c = r.carteira, rec = r.recuperar, nv = r.novos, t = r.territorio
  const motivoTop = c.porMotivo[0], topCli = c.top[0], parado = rec.topParados[0], conc = rec.concorrentes[0], prop = nv.propriedades[0], cid = t.municipios[0]
  const abertura = c.comMotivo
    ? `Separei a prospecção em 4 caminhos. Comece pela Carteira: ${plural(c.comMotivo, 'cliente já compra', 'clientes já compram')} com a gente e ${c.comMotivo === 1 ? 'tem' : 'têm'} motivo para uma ligação${motivoTop ? ` — o mais comum é "${motivoTop.rotulo}" (${nfmt(motivoTop.qtd)})` : ''}. Depois vá para Recuperar, que é dinheiro que já esteve na mesa.`
    : 'Separei a prospecção em 4 caminhos: Carteira, Recuperar, Novos clientes e Território. Clique em cada um que eu explico.'
  return {
    abertura,
    grupos: {
      carteira: { titulo: 'Quem da carteira eu ligo hoje?',
        texto: `São clientes que já compraram com a gente. Eu cruzo vendas, revisões, oficina, propostas e as visitas do CRM e dou uma nota de 0 a 100 para cada um: quanto maior, mais vale ligar agora. Hoje são ${plural(c.comMotivo, 'cliente', 'clientes')} com pelo menos um motivo.`,
        dica: topCli ? `Comece por ${primeiro(topCli.nome)}${topCli.cidade ? ` (${cidadeBonita(topCli.cidade)})` : ''}: ${minus(topCli.oportunidades[0]?.titulo || 'tem motivo para ligar')}. Ofereça ${minus(topCli.oportunidades[0]?.oferecer || 'uma visita')}.` : 'Ninguém da carteira com motivo agora.' },
      recuperar: { titulo: 'Que negócio eu deixei pelo caminho?',
        texto: `Aqui é venda que quase aconteceu. ${rec.parados ? `${plural(rec.parados, 'proposta ou negócio parado', 'propostas e negócios parados')}${rec.valorParado ? ` somando ${reaisLongo(rec.valorParado)}` : ''}` : 'Nenhuma proposta parada'}${rec.reabordar ? `, e ${plural(rec.reabordar, 'cliente perdeu', 'clientes perderam')} proposta entre 3 meses e 2 anos atrás — a situação deles pode ter mudado` : ''}.${rec.perdidas12m ? ` No último ano perdemos ${plural(rec.perdidas12m, 'proposta', 'propostas')}${conc ? `; quem mais ganhou de nós foi ${conc.nome} (${nfmt(conc.qtd)})` : ''}.` : ''}`,
        dica: parado ? `O mais urgente: ${primeiro(parado.cliente)}${parado.oque ? `, ${parado.oque}` : ''}${parado.dias ? `, parado há ${parado.dias} dias` : ''}${parado.vendedor ? ` com ${primeiro(parado.vendedor)}` : ''}. Ligue para fechar ou registrar o motivo da perda.` : rec.reabordar ? 'Ligue para quem perdeu proposta: pergunte se a máquina que ele comprou está atendendo.' : 'Nada parado agora.' },
      novos: { titulo: 'Quem é cliente novo?',
        texto: `Gente que ainda não compra com a gente. ${nv.propriedades.length ? 'Achei propriedades grandes, com bom potencial no CAR, sem nenhum cliente nosso ligado a elas.' : 'Sem propriedades do CAR para mostrar agora.'} ${nv.indicacoesAbertas ? `Tem ${plural(nv.indicacoesAbertas, 'indicação esperando', 'indicações esperando')} contato.` : 'Ainda não há indicações registradas — peça uma em cada entrega de máquina.'} ${nv.empresasNovas ? `E ${plural(nv.empresasNovas, 'empresa rural nova', 'empresas rurais novas')} na região.` : 'O levantamento de empresas rurais novas da Receita ainda não foi rodado.'}`,
        dica: prop ? `A maior: ${nfmt(prop.areaHa)} ha${prop.cultura ? ` de ${prop.cultura.toLowerCase()}` : ''} em ${prop.municipio}${prop.investimento ? `, que pegou ${reaisLongo(prop.investimento)} de crédito para investir nos últimos 3 anos` : ''}. Descubra quem é o dono numa visita na região.` : 'Cadastre as indicações que os clientes fizerem: elas aparecem aqui.' },
      territorio: { titulo: 'Em que cidade vale mais a pena?',
        texto: 'Aqui eu não aponto pessoas, aponto onde. A nota de foco junta o tamanho do mercado da cidade (área plantada, valor da produção, crédito rural) com o espaço que ainda temos (poucos clientes com trator nosso).',
        dica: cid ? `${cid.nome} está em 1º (foco ${cid.foco}): ${cid.cultura ? `forte em ${cid.cultura.toLowerCase()}, ` : ''}${plural(cid.clientes, 'cliente nosso', 'clientes nossos')} e ${plural(cid.tratores, 'trator vendido', 'tratores vendidos')}. Vale um dia de visitas por lá.` : 'Sem dados de municípios agora.' },
    },
  }
}

// =============================================================================
// INDICAÇÕES (iv_indicacoes), CONCORRÊNCIA (iv_concorrentes), EMPRESAS (iv_cnpj)
// =============================================================================
function montarIndicacoes(hoje, clientes) {
  const porId = Object.fromEntries(clientes.map((c) => [c.id, c]))
  const L = [
    ['c19', 'Joaquim Pedroso Neto', '14999990031', 'Bernardino de Campos', true, 'Yuvo 585 para mandioca', 12, 'contatada', 6, 'Revisão de 300 h grátis', false, 'Vizinho do Sítio Três Marias; tem um MF 265 velho.'],
    ['c5', 'Fazenda Lagoa Seca', '14999990032', 'Piraju', true, '7590 para cana', 11, 'proposta', 20, 'Kit de filtros', false, 'Indicado pelo Ricardo (Paranapanema). Proposta enviada.'],
    ['c1', 'Sítio Recreio', '14999990033', 'Piraju', true, '4025 para café', 11, 'nova', -2, null, false, 'Cunhado do João Carlos.'],
    ['c14', 'Agropecuária Três Pontes', '14999990034', 'Fartura', false, 'Plantadeira 13 linhas', 14, 'nova', 3, null, false, 'Ainda não autorizou contato; Osvaldo vai falar antes.'],
    ['c8', 'Chácara Laranjal', '14999990035', 'Ipaussu', true, 'Pulverizador turbo', 12, 'ganha', -40, 'Desconto em peças 10%', true, 'Comprou pulverizador.'],
    ['c25', 'Sítio Bom Jardim', '14999990036', 'Tejupá', true, '6075 com concha', 11, 'contatada', 4, null, false, 'Leiteiro, 30 vacas.'],
    ['c12', 'Fazenda Monte Alegre', '43999990037', 'Carlópolis', true, 'Fruteiro para café', 13, 'perdida', -60, null, false, 'Comprou LS por preço.'],
    ['c22', 'Usina de Serviços Paranapanema', '14999990038', 'Ourinhos', true, '9500 4x4', 13, 'proposta', 9, 'Revisão grátis', false, ''],
    ['c3', 'Sítio Cachoeirinha', '14999990039', 'Tejupá', true, 'Roçadeira', 11, 'nova', -5, null, false, 'Prazo vencido: ligar.'],
    ['c21', 'Chácara Vó Ana', '14999990040', 'Piraju', false, '2025 Jivo', 11, 'nova', 7, null, false, ''],
  ]
  return L.map(([cli, nome, fone, cidade, aut, interesse, vend, status, prazo, beneficio, entregue, obs], i) => {
    const c = porId[cli]
    const criado = somarDias(hoje, -(8 + i * 9)) + 'T10:00:00-03:00'
    return { id: 300 + i, criado_em: criado, criado_por: nomeVend(vend), atualizado_em: criado, indicante_doc: c.doc, indicante_nome: c.nome, indicado_nome: nome, indicado_telefone: fone,
      indicado_cidade: cidade, autorizado: aut, interesse, vendedor_id: vend, vendedor_nome: nomeVend(vend), prazo_contato: somarDias(hoje, prazo), status,
      contatado_em: status !== 'nova' ? somarDias(hoje, -(3 + i)) + 'T15:00:00-03:00' : null, beneficio, beneficio_entregue: entregue, obs: obs || null }
  })
}

function montarConcorrencia(hoje, propostas, clientes) {

  const perdas = [
    ...propostas.filter((p) => p.status === PROPOSTA_PERDIDA).map((p) => ({ origem: 'proposta', id: p.id, cliente: p.Cliente, cidade: p.Cidade, oque: [p.Marca, p.Modelo].filter(Boolean).join(' '),
      motivo: p.motivo || 'Sem motivo registrado', concorrente: p.concorrente || '', valorConcorrente: p.concorrente_valor, data: p.fechado_em, vendedor: p.vendedor_nome })),
    ...SPEC_NEGOCIOS_PERDIDOS.map((n) => { const s = SPEC_CLI[n.cli]; return { origem: 'negocio', id: n.id, cliente: `${s.nome} — ${s.contato}`, cidade: s.cidade, oque: [n.marca, n.modelo].filter(Boolean).join(' '),
      motivo: MOTIVO_CRM[n.motivo] || n.motivo, concorrente: n.concorrente, valorConcorrente: n.valorConcorrente, data: somarDias(hoje, -n.dias), vendedor: nomeVend(n.vend) } }),
  ].sort((a, b) => String(b.data).localeCompare(String(a.data)))
  const R = [
    [5, 'Concessionária John Deere — Ourinhos (exemplo)', 'John Deere', '5075E', 2026, 'novo', 'anuncio', 309000, 'Taxa 0% em 12 parcelas anuais + entrada de 30%', 'Ourinhos', 'Visto no Instagram da revenda', 'Cliente Fazenda Água Limpa mostrou o anúncio.'],
    [12, 'Revenda Massey Ferguson — Avaré (exemplo)', 'Massey Ferguson', '4707', 2026, 'novo', 'campanha', 285000, 'Primeira parcela para depois da safra', 'Avaré', 'Folheto entregue em Piraju', null],
    [19, 'Revenda Valtra — Santa Cruz do Rio Pardo (exemplo)', 'Valtra', 'A114', 2026, 'novo', 'evento', null, 'Dia de campo com test drive', 'Chavantes', 'Convite no grupo de WhatsApp dos produtores', null],
    [26, 'LS Tractor — Carlópolis (exemplo)', 'LS Tractor', 'U60', 2026, 'novo', 'loja', 176000, 'À vista com 5% de desconto', 'Carlópolis', 'Cliente Sítio Primavera contou', 'Preço de tabela parece abaixo do nosso Yuvo 575.'],
    [33, 'Particular (OLX)', 'New Holland', 'TL75E', 2014, 'usado', 'anuncio', 168000, null, 'Bernardino de Campos', 'OLX', 'Referência para avaliar usado do Fazenda São Sebastião.'],
    [41, 'Revenda Case — Ourinhos (exemplo)', 'Case', 'Farmall 110A', 2026, 'novo', 'campanha', 334000, 'Moderfrota + revisões grátis até 1.000 h', 'Ourinhos', 'Rádio local', null],
    [55, 'Revenda Yanmar — Ourinhos (exemplo)', 'Yanmar', 'Solis 75', 2026, 'novo', 'anuncio', 189000, 'Entrada + 5 anuais', 'Sarutaiá', 'Panfleto na cooperativa', null],
    [70, 'Particular', 'Massey Ferguson', '275', 2008, 'usado', 'outro', 92000, null, 'Piraju', 'Cliente contou', 'Valor que o Antônio (Fazenda Santa Rita) espera pelo usado.'],
  ]
  const registros = R.map(([dias, revenda, marca, modelo, ano, condicao, tipo, preco, condicoes, cidade, fonte, obs], i) => ({
    id: 800 + i, criado_em: somarDias(hoje, -dias) + 'T09:00:00-03:00', criado_por: nomeVend(11 + (i % 4)), data_ref: somarDias(hoje, -dias), revenda, marca, modelo, ano, condicao, tipo, preco, condicoes, cidade, fonte, obs,
  }))
  return { registros, perdas }
}

function montarEmpresas(hoje, clientes) {
  const docs = new Set(clientes.filter((c) => c.doc.length === 14).map((c) => c.doc))
  const rancho = clientes.find((c) => c.id === 'c16')
  const N = [
    [318204560001, 'AGRO SERVICOS TEJUPA LTDA', 'AgroTejupá Serviços', '0161003', 'Serviço de preparação de terreno, cultivo e colheita', 18, 'Tejupá', 'ME'],
    [527193840001, 'FAZENDA SANTA CLARA PARTICIPACOES LTDA', 'Fazenda Santa Clara', '0115600', 'Cultivo de soja', 33, 'Fartura', 'EPP'],
    [640281950001, 'CAFE ALTO DO PARANAPANEMA LTDA', 'Café Alto do Paranapanema', '0134200', 'Cultivo de café', 41, 'Piraju', 'ME'],
    [739102640001, 'PECUARIA TIMBURI LTDA', 'Pecuária Timburi', '0151201', 'Criação de bovinos para corte', 57, 'Timburi', 'ME'],
    [812736450001, 'COLHEITA FORTE SERVICOS AGRICOLAS LTDA', 'Colheita Forte', '0161003', 'Serviço de preparação de terreno, cultivo e colheita', 66, 'Chavantes', 'EPP'],
    [903847560001, 'CITROS IPAUSSU LTDA', 'Citros Ipaussu', '0131800', 'Cultivo de laranja', 79, 'Ipaussu', 'ME'],
    [154826370001, 'LATICINIOS E LEITE BOM JARDIM LTDA', 'Leite Bom Jardim', '0151202', 'Criação de bovinos para leite', 95, 'Tejupá', 'ME'],
    [265937480001, 'GRAOS BERNARDINO AGRICOLA LTDA', 'Grãos Bernardino', '0111302', 'Cultivo de milho', 112, 'Bernardino de Campos', 'EPP'],
    [376048590001, 'CANAVIAL OURINHOS AGRO LTDA', 'Canavial Ourinhos', '0113000', 'Cultivo de cana-de-açúcar', 140, 'Ourinhos', 'DEMAIS'],
    [487159600001, 'PULVERIZA SARUTAIA SERVICOS LTDA', 'Pulveriza Sarutaiá', '0161001', 'Serviço de pulverização e controle de pragas agrícolas', 168, 'Sarutaiá', 'ME'],
    [598260710001, 'CAFEICULTORES CARLOPOLIS LTDA', 'Café Carlópolis', '0134200', 'Cultivo de café', 190, 'Carlópolis', 'ME'],
  ]
  const novas = N.map(([b, razao, fantasia, cnae, desc, dias, municipio, porte], i) => {
    const c = cnpj(b), cid = CID[textoNorm(municipio)]
    return { cnpj: c, razao_social: razao, nome_fantasia: fantasia, cnae_codigo: cnae, cnae_descricao: desc, cnaes_secundarios: null, data_inicio: somarDias(hoje, -dias), situacao: 'ATIVA', porte,
      municipio: municipio.toUpperCase(), uf: cid.uf, municipio_ibge: cid.ibge, telefone: `14 9999-${String(7100 + i * 13).padStart(4, '0')}`, origem: 'receita', consultado_em: somarDias(hoje, -2) + 'T06:00:00-03:00', erro: null, jaCliente: docs.has(c) }
  })
  // o Rancho Alegre (cliente nosso, CNPJ aberto há ~6 meses) também aparece como empresa nova
  novas.push({ cnpj: rancho.doc, razao_social: rancho.nome.toUpperCase(), nome_fantasia: rancho.nome, cnae_codigo: '0161099', cnae_descricao: rancho.cnaeDescricao, cnaes_secundarios: null, data_inicio: rancho.abertura,
    situacao: 'ATIVA', porte: rancho.porte, municipio: 'IPAUSSU', uf: 'SP', municipio_ibge: 3520905, telefone: rancho.telefone, origem: 'receita', consultado_em: somarDias(hoje, -2) + 'T06:00:00-03:00', erro: null, jaCliente: true })
  novas.sort((a, b) => String(b.data_inicio).localeCompare(String(a.data_inicio)))
  const pj = clientes.filter((c) => c.doc.length === 14)
  const porCnae = new Map()
  for (const c of pj) { const k = c.cnae.replace(/\D/g, '') || '—'; const r = porCnae.get(k) || { cnae: k, descricao: c.cnaeDescricao, clientes: 0 }; r.clientes++; porCnae.set(k, r) }
  return {
    semTabela: false, novas,
    carteira: { cnpjs: pj.length, consultados: pj.length, porCnae: [...porCnae.values()].sort((a, b) => b.clientes - a.clientes),
      prestadores: pj.filter((c) => /^0161/.test(c.cnae.replace(/\D/g, ''))).map((c) => ({ cnpj: c.doc, nome: c.nome.toUpperCase(), cnae: c.cnaeDescricao, municipio: c.cidade.toUpperCase() })) },
  }
}

// =============================================================================
// EQUIPE (port simplificado de equipe.ts + painel-vendedores.ts)
// =============================================================================
const NOMES_PROSPECT = ['Sítio Água Branca', 'Fazenda Barreiro', 'Sítio Capão Bonito', 'Fazenda Jacutinga', 'Sítio dos Pinheiros', 'Chácara Recanto', 'Fazenda Cruzeiro', 'Sítio Ponte Alta',
  'Fazenda Lageado', 'Sítio Boa Sorte', 'Fazenda Estrela', 'Sítio Palmeiras', 'Fazenda São Pedro', 'Sítio Morro Azul', 'Fazenda Taquaral', 'Sítio Santa Fé']

function montarVisitasEquipe(hoje, clientes) {
  const out = []
  let id = 60000
  // as visitas reais dos 25 clientes
  for (const c of clientes) for (const v of c.historicoVisitas) {
    out.push({ id: v.id, vendedor_id: v.vendedor_id, propriedade_id: v.propriedade_id, tipo: v.tipo, data_visita: v.data_visita, latitude: v.tipo === 'presencial' ? c.local?.[0] ?? null : null,
      retroativa: false, acionar_pos_vendas: false, pos_vendas_resolvido: false, data_proximo_contato: v.data_proximo_contato, resumo: v.resumo, proximos_passos: v.proximos_passos,
      cliente_nome: c.contato, propriedade_nome: c.nome, _cidade: c.cidade })
  }
  // visitas de rotina (prospects) sorteadas por vendedor, 2 anos
  for (const vd of VENDEDORES) {
    const r = prng(semente(`visitas${vd.id}`))
    for (let d = 730; d >= 0; d--) {
      const dia = somarDias(hoje, -d)
      if (fimDeSemana(dia)) continue
      if (vd.parouHaDias && d < vd.parouHaDias + 4) continue
      const qtd = Math.floor(vd.ritmo * (0.4 + r() * 1.2))
      for (let k = 0; k < qtd; k++) {
        const tipo = r() < 0.68 ? 'presencial' : r() < 0.6 ? 'telefone' : 'whatsapp'
        const cidade = vd.cidades[Math.floor(r() * vd.cidades.length)]
        const centro = centroDaCidade(cidade)
        const semGps = tipo === 'presencial' && r() < (vd.id === 12 ? 0.12 : 0.03)
        out.push({ id: ++id, vendedor_id: vd.id, propriedade_id: 7000 + Math.floor(r() * 400), tipo, data_visita: dia, latitude: tipo === 'presencial' && !semGps ? centro[0] + (r() - 0.5) * 0.1 : null,
          retroativa: r() < 0.04, acionar_pos_vendas: r() < 0.03, pos_vendas_resolvido: r() < 0.7, data_proximo_contato: r() < 0.05 ? somarDias(dia, 7 + Math.floor(r() * 20)) : null,
          resumo: ['Visita de relacionamento.', 'Apresentou a linha Yuvo.', 'Levantou frota e área.', 'Cliente pediu orçamento de peças.', 'Mostrou simulação do Moderfrota.', 'Entregou catálogo de implementos.'][Math.floor(r() * 6)],
          proximos_passos: r() < 0.4 ? 'Retornar com proposta' : null, cliente_nome: null, propriedade_nome: `${NOMES_PROSPECT[Math.floor(r() * NOMES_PROSPECT.length)]} — ${cidade}`, _cidade: cidade })
      }
    }
  }
  return out.sort((a, b) => b.data_visita.localeCompare(a.data_visita) || b.id - a.id)
}

function montarEventos(hoje, visitas, propostas) {
  const ev = []
  for (const v of visitas) ev.push({ v: v.vendedor_id, t: 'visita', d: v.data_visita, valor: 0, desc: v.propriedade_nome || '' })
  for (const p of propostas) {
    ev.push({ v: p.vendedor_id, t: 'proposta', d: p.criado_em, valor: Number(p.Valor_Total), desc: `${p.Cliente} · ${[p.Marca, p.Modelo].filter(Boolean).join(' ')}` })
    if (p.status === PROPOSTA_GANHA) ev.push({ v: p.vendedor_id, t: 'ganha', d: p.fechado_em, valor: Number(p.Valor_Total), desc: p.Cliente })
    if (p.status === PROPOSTA_PERDIDA) ev.push({ v: p.vendedor_id, t: 'perdida', d: p.fechado_em, valor: Number(p.Valor_Total), desc: p.Cliente })
  }
  // propostas, vendas de máquina e peças sorteadas (para as séries ficarem cheias)
  const MODELOS = [['4025', 158000], ['6075 4x4', 289000], ['6110', 372000], ['7590', 465000], ['9500 4x4', 598000], ['Yuvo 575', 205000], ['Yuvo 585', 238000], ['2025 Jivo', 115000], ['Roçadeira 1,7 m', 32000], ['Plantadeira 7 linhas', 168000]]
  for (const vd of VENDEDORES) {
    const r = prng(semente(`eventos${vd.id}`))
    for (let s = 104; s >= 0; s--) {
      const base = somarDias(hoje, -s * 7)
      const nProp = Math.floor(vd.ritmo * (0.3 + r() * 1.1))
      for (let k = 0; k < nProp; k++) {
        const [mod, preco] = MODELOS[Math.floor(r() * MODELOS.length)]
        const d = diaUtil(somarDias(base, -Math.floor(r() * 6)))
        const valor = Math.round(preco * (0.92 + r() * 0.16))
        ev.push({ v: vd.id, t: 'proposta', d, valor, desc: `${NOMES_PROSPECT[Math.floor(r() * NOMES_PROSPECT.length)]} · Mahindra ${mod}` })
        const sorte = r()
        if (s > 2 && sorte < 0.28) {
          const df = diaUtil(somarDias(d, 10 + Math.floor(r() * 25)))
          if (df <= hoje) { ev.push({ v: vd.id, t: 'ganha', d: df, valor, desc: `Mahindra ${mod}` }); ev.push({ v: vd.id, t: 'maquina', d: df, valor, desc: `Pedido Omie · Mahindra ${mod}` }) }
        } else if (s > 2 && sorte < 0.55) {
          const df = diaUtil(somarDias(d, 12 + Math.floor(r() * 30)))
          if (df <= hoje) ev.push({ v: vd.id, t: 'perdida', d: df, valor, desc: `Mahindra ${mod}` })
        }
      }
      // peças de balcão do vendedor
      ev.push({ v: vd.id, t: 'pecas', d: diaUtil(somarDias(base, -2)), valor: Math.round((1800 + r() * 5200) * (vd.ritmo / 2)), desc: 'Pedidos de peças da semana' })
    }
  }
  return ev.filter((e) => e.d && e.d <= hoje).sort((a, b) => a.d.localeCompare(b.d))
}

export const SOMA_ZERO = { visitas: 0, propostas: 0, valorPropostas: 0, ganhas: 0, perdidas: 0, maquinas: 0, valorMaquinas: 0, valorPecas: 0 }
/** port de painel-vendedores.ts → somar */
export function somar(eventos, de, ate, v) {
  const s = { ...SOMA_ZERO }
  for (const e of eventos) {
    if (e.d < de || e.d > ate || (v != null && e.v !== v)) continue
    if (e.t === 'visita') s.visitas++
    else if (e.t === 'proposta') { s.propostas++; s.valorPropostas += e.valor }
    else if (e.t === 'ganha') s.ganhas++
    else if (e.t === 'perdida') s.perdidas++
    else if (e.t === 'maquina') { s.maquinas++; s.valorMaquinas += e.valor }
    else if (e.t === 'pecas') s.valorPecas += e.valor
  }
  return s
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
/** últimos n meses (o atual por último) com a Soma de cada vendedor e do time */
function periodosMensais(hoje, eventos, n = 8) {
  const [a, m] = hoje.split('-').map(Number)
  const lista = []
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(Date.UTC(a, m - 1 - i, 1)), ano = x.getUTCFullYear(), mes = x.getUTCMonth()
    const de = `${ano}-${p2(mes + 1)}-01`, fim = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate()
    const ate = i === 0 ? hoje : `${ano}-${p2(mes + 1)}-${p2(fim)}`
    lista.push({ de, ate, rotulo: `${MESES[mes]}/${String(ano).slice(2)}`, curto: MESES[mes], parcial: i === 0 })
  }
  return {
    escala: 'mes', periodos: lista.map(({ de, ate, rotulo, curto, parcial }) => ({ de, ate, rotulo, curto, parcial })),
    time: lista.map((p) => somar(eventos, p.de, p.ate)),
    porVendedor: Object.fromEntries(VENDEDORES.map((vd) => [vd.id, lista.map((p) => somar(eventos, p.de, p.ate, vd.id))])),
  }
}

function montarEquipe(hoje, visitas, negocios, propostas, clientes, eventos) {
  const d7 = somarDias(hoje, -7), d30 = somarDias(hoje, -30), d90 = somarDias(hoje, -90), d180 = somarDias(hoje, -180), d365 = somarDias(hoje, -365)
  const ordem = { parado: 0, atencao: 1, ativo: 2, sem_crm: 3 }
  return VENDEDORES.map((vd) => {
    const vv = visitas.filter((v) => v.vendedor_id === vd.id)
    const v30 = vv.filter((v) => v.data_visita >= d30)
    const ultima = vv[0]?.data_visita || ''
    const diasSem = ultima ? diasUteisEntre(ultima, hoje) : null
    const ultimaPorProp = new Map()
    for (const v of vv) if (!ultimaPorProp.has(v.propriedade_id)) ultimaPorProp.set(v.propriedade_id, v)
    const retornosVencidos = [...ultimaPorProp.values()].filter((v) => v.data_proximo_contato && v.data_proximo_contato < hoje && v.data_proximo_contato >= d90).length
    const abertas = propostas.filter((p) => p.em_aberto && p.vendedor_id === vd.id)
    const negs = negocios.filter((n) => n.vendedor_id === vd.id && ETAPAS_ABERTAS_CRM.includes(n.status))
    const carteira = clientes.filter((c) => c.vendedorId === vd.id)
    const ev12 = eventos.filter((e) => e.v === vd.id && e.d >= d365)
    const ev90 = eventos.filter((e) => e.v === vd.id && e.d >= d90)
    const l = {
      id: vd.id, nome: vd.nome, situacao: 'ativo',
      visitas7: vv.filter((v) => v.data_visita >= d7).length, visitas30: v30.length, visitas90: vv.filter((v) => v.data_visita >= d90).length,
      presenciais30: v30.filter((v) => v.tipo === 'presencial').length, semGps30: v30.filter((v) => v.tipo === 'presencial' && v.latitude == null).length,
      retroativas30: v30.filter((v) => v.retroativa).length, clientesVisitados30: new Set(v30.map((v) => v.propriedade_id)).size,
      visitasSemanas: Array.from({ length: 8 }, (_, i) => { const de = somarDias(hoje, -7 * (8 - i)), ate = somarDias(hoje, -7 * (7 - i)); return vv.filter((v) => v.data_visita > de && v.data_visita <= ate).length }),
      ultimaVisita: ultima, diasSemVisita: diasSem, retornosVencidos,
      posVendasPendentes: vv.filter((v) => v.data_visita >= d90 && v.acionar_pos_vendas && !v.pos_vendas_resolvido).length,
      negociosAbertos: negs.length, valorNegocios: negs.reduce((s, n) => s + (n.valor || 0), 0),
      propostasAbertas: abertas.length, valorPropostas: abertas.reduce((s, p) => s + Number(p.Valor_Total), 0),
      propostasParadas: abertas.filter((p) => (p.dias_na_fase ?? 0) > 15).length, semProximoContato: abertas.filter((p) => !p.proximo_contato).length,
      ganhas90: ev90.filter((e) => e.t === 'ganha').length, perdidas90: ev90.filter((e) => e.t === 'perdida').length,
      pedidosMaquina12m: ev12.filter((e) => e.t === 'maquina').length, vendasMaquina12m: ev12.filter((e) => e.t === 'maquina').reduce((s, e) => s + e.valor, 0),
      vendasPecas12m: ev12.filter((e) => e.t === 'pecas').reduce((s, e) => s + e.valor, 0),
      carteira: carteira.length, carteiraComOportunidade: carteira.filter((c) => c.oportunidades.length > 0).length,
      carteiraSemVisita: carteira.filter((c) => c.qtdTratores > 0 && (!c.ultimaVisita || c.ultimaVisita < d180)).length,
      alertas: [],
      ultimasVisitas: vv.slice(0, 40).map(({ _cidade, ...v }) => v),
      propostas: abertas.map((p) => ({ id: p.id, cliente: p.Cliente, oque: [p.Marca, p.Modelo].filter(Boolean).join(' '), valor: Number(p.Valor_Total), fase: p.status, dias: p.dias_na_fase, proximo: dataISO(p.proximo_contato) })),
    }
    if (vv.length === 0) l.alertas.push('Nunca registrou visita no CRM')
    else if ((diasSem ?? 0) > 3) l.alertas.push(`${diasSem} dias úteis sem visita`)
    if (l.semGps30) l.alertas.push(`${l.semGps30} visita(s) presencial(is) sem GPS em 30 dias`)
    if (l.retroativas30) l.alertas.push(`${l.retroativas30} visita(s) lançada(s) depois (retroativa) em 30 dias`)
    if (l.retornosVencidos) l.alertas.push(`${l.retornosVencidos} retorno(s) combinado(s) vencido(s)`)
    if (l.propostasParadas) l.alertas.push(`${l.propostasParadas} proposta(s) parada(s) há mais de 15 dias`)
    if (l.posVendasPendentes) l.alertas.push(`${l.posVendasPendentes} pedido(s) ao pós-vendas sem resposta`)
    l.situacao = vv.length === 0 ? 'sem_crm' : (diasSem ?? 99) > 7 ? 'parado' : (diasSem ?? 0) > 3 || l.semGps30 > 0 || l.retornosVencidos > 0 ? 'atencao' : 'ativo'
    return l
  }).sort((a, b) => ordem[a.situacao] - ordem[b.situacao] || b.visitas30 - a.visitas30 || a.nome.localeCompare(b.nome))
}

// =============================================================================
// NOTÍCIAS — boletim diário (iv_boletim + iv_noticias)
// =============================================================================
const IMG = (id) => `https://images.unsplash.com/photo-${id}?w=800`
export const CATEGORIAS_NOTICIA = {
  taxas: { nome: 'Juros e câmbio', cor: '#2563eb', icone: 'Percent' },
  mercado: { nome: 'Mercado', cor: '#ea580c', icone: 'TrendingUp' },
  regiao: { nome: 'Região', cor: '#dc2626', icone: 'MapPin' },
  clima: { nome: 'Clima', cor: '#0891b2', icone: 'CloudSunRain' },
  credito: { nome: 'Crédito rural', cor: '#16a34a', icone: 'Landmark' },
  maquinas: { nome: 'Máquinas', cor: '#7c3aed', icone: 'Tractor' },
  politica: { nome: 'Política agrícola', cor: '#475569', icone: 'Scale' },
}
// [dia (0 = hoje, 1 = dia útil anterior...), categoria, tendencia, destaque, titulo, resumo, impacto, fonte, imagem, cidades, corpo[]]
const SPEC_NOTICIAS = [
  [0, 'credito', 'boa', true, 'Moderfrota mantém 11,5% ao ano e libera nova rodada de recursos para tratores',
    'O BNDES confirmou a liberação de mais recursos do Moderfrota para a safra 2026/27, com taxa de 11,5% ao ano, até 7 anos para pagar e 14 meses de carência.',
    'Argumento forte para quem está com proposta parada esperando o banco: os recursos voltaram. Ligue hoje para quem tem proposta "aguardando banco".',
    'Agência de notícias do agro (exemplo)', '1625246333195-78d9c38ad449', [],
    ['O Banco Nacional de Desenvolvimento Econômico e Social (BNDES) anunciou nesta semana a liberação de uma nova rodada de recursos do Moderfrota, a principal linha de financiamento de tratores e implementos para médios e grandes produtores.',
      'As condições foram mantidas: taxa de 11,5% ao ano, prazo de até 7 anos e carência de até 14 meses. O banco financia até 85% do valor do bem, e o restante pode vir do usado dado na troca.',
      'Segundo os agentes financeiros, a fila de pedidos que estava parada desde agosto deve andar nas próximas semanas. Cooperativas de crédito da região já voltaram a receber propostas.',
      'Para o produtor que está pensando em renovar a frota antes do plantio, a recomendação dos bancos é levar a documentação completa (CAR, matrícula e projeto técnico) para não perder a vez na fila.']],
  [0, 'mercado', 'boa', true, 'Soja sobe 3% na semana em Assis com dólar firme e demanda chinesa',
    'A saca de 60 kg fechou a semana a R$ 132,40 na praça de Assis, alta de 3%. Exportação aquecida e câmbio acima de R$ 5,40 sustentam o preço.',
    'Produtor de soja mais capitalizado antes do plantio: momento de visitar quem planta grãos em Fartura, Tejupá e Bernardino.',
    'Boletim de mercado (exemplo)', '1500382017468-9049fed747ef', ['Fartura', 'Tejupá', 'Bernardino de Campos'],
    ['O preço da soja voltou a subir no interior paulista. Na praça de Assis, a referência da região de Piraju, a saca fechou a semana a R$ 132,40, alta de 3% sobre a semana anterior.',
      'Analistas atribuem a alta à combinação de dólar firme e compras chinesas mais fortes que o esperado para outubro. Os prêmios nos portos também subiram.',
      'Com o plantio da safra de verão começando, a boa margem ajuda o produtor a decidir investimentos em máquinas e implementos que estavam adiados.',
      'Em Fartura e Tejupá, onde a soja ocupa a maior parte da área de grãos, cerealistas relatam mais negócios antecipados para entrega na colheita.',
      'A previsão é de preços firmes até o fim do ano, mas os analistas lembram que a safra recorde na América do Sul pode pressionar as cotações a partir de março.']],
  [0, 'regiao', 'boa', false, 'Piraju recebe dia de campo de café com foco em mecanização de lavoura de montanha',
    'O encontro reuniu cerca de 300 cafeicultores e mostrou máquinas estreitas para lavouras adensadas e de declive.',
    'Cafeicultor interessado em mecanizar: bom público para o Yuvo 575 e trator fruteiro. Peça a lista de presença à cooperativa.',
    'Jornal regional (exemplo)', '1559884743-74a57598c6c7', ['Piraju', 'Sarutaiá'],
    ['Piraju sediou na última quinta-feira um dia de campo sobre mecanização da lavoura de café, organizado pela cooperativa local com apoio da prefeitura.',
      'Cerca de 300 produtores de Piraju, Sarutaiá e Timburi acompanharam demonstrações de tratores estreitos, pulverizadores e derriçadeiras em uma lavoura adensada com declive.',
      'Os técnicos destacaram que a falta de mão de obra na colheita é hoje o principal motivo para os pequenos cafeicultores procurarem máquinas.',
      'A próxima edição deve acontecer em março, antes do início da colheita.']],
  [0, 'clima', 'neutra', false, 'Chuva volta ao sudoeste paulista no fim de semana, mas irregular',
    'Frente fria traz entre 15 e 35 mm para a região de Piraju a partir de sábado. Volume ainda abaixo da média de outubro.',
    'Plantio pode se concentrar em poucos dias: quem tem plantadeira e trator velhos pode querer agilizar a operação.',
    'Serviço de meteorologia (exemplo)', '1530836369250-ef72a3f5cda8', ['Piraju', 'Fartura', 'Ourinhos'],
    ['Uma frente fria deve chegar ao sudoeste paulista no sábado e trazer chuva entre 15 e 35 milímetros até segunda-feira.',
      'O volume ajuda a repor a umidade do solo, mas ainda fica abaixo da média histórica de outubro para Piraju, Fartura e Ourinhos.',
      'Os meteorologistas recomendam cautela no plantio da soja: a chuva deve ser irregular e mal distribuída entre as propriedades.']],
  [0, 'taxas', 'ruim', false, 'Dólar fecha a R$ 5,46 e encarece peças e máquinas importadas',
    'A moeda americana subiu 0,6% no dia. Para a loja, o câmbio alto pressiona tabela de peças e de alguns modelos.',
    'Se o cliente está em dúvida, lembre que a tabela pode subir com o câmbio: fechar agora protege o preço.',
    'Agência de economia (exemplo)', '1560493676-04071c5f467b', [],
    ['O dólar comercial fechou a R$ 5,46, alta de 0,6% no dia, pressionado pelo cenário externo e pela incerteza fiscal.',
      'Para o agro, o câmbio alto é uma faca de dois gumes: melhora o preço das commodities exportadas, mas encarece fertilizantes, defensivos, peças e máquinas com componentes importados.',
      'Fabricantes já sinalizaram reajuste de tabela para novembro caso o câmbio se mantenha acima de R$ 5,40.']],
  [0, 'maquinas', 'boa', false, 'Venda de tratores cresce 8% no ano com renovação de frota de médio porte',
    'Segundo a associação dos fabricantes, os tratores de 50 a 100 cv puxam o crescimento em 2026.',
    'É a faixa do 6075 e do Yuvo: reforce a abordagem de renovação com quem tem trator com mais de 5 anos.',
    'Revista de máquinas agrícolas (exemplo)', '1592982537447-7440770cbfc9', [],
    ['As vendas de tratores no mercado interno cresceram 8% de janeiro a setembro na comparação com o mesmo período do ano passado, segundo dados da associação dos fabricantes.',
      'O destaque são os modelos de 50 a 100 cv, usados em propriedades médias de grãos, café e pecuária, que respondem por mais da metade das unidades vendidas.',
      'A renovação da frota é o principal motor: a idade média dos tratores no Brasil passa de 15 anos, e muitos produtores aproveitaram a safra boa para trocar.',
      'O setor projeta fechar o ano com alta entre 6% e 9%, dependendo das condições do crédito rural no último trimestre.']],
  [1, 'mercado', 'boa', true, 'Café arábica volta a R$ 2.100 a saca com estoques baixos',
    'A saca de café arábica bebida dura tipo 6 voltou a passar de R$ 2.100 na praça de Marília.',
    'Cafeicultor de Piraju, Sarutaiá e Carlópolis está capitalizado: hora de falar de trator fruteiro e pulverizador.',
    'Boletim de mercado (exemplo)', '1516253593875-bd7ba052fbc5', ['Piraju', 'Sarutaiá', 'Carlópolis'],
    ['O café arábica voltou a subir e a saca de 60 kg passou de R$ 2.100 na praça de Marília, referência para os produtores do sudoeste paulista e do norte pioneiro do Paraná.',
      'Os estoques baixos nos países consumidores e a quebra parcial da safra em outras regiões produtoras sustentam o preço.',
      'Em Piraju e Carlópolis, cafeicultores relatam que estão usando a boa margem para quitar dívidas e investir em mecanização.']],
  [1, 'credito', 'neutra', false, 'Pronaf Mais Alimentos tem fila nos bancos cooperativos da região',
    'Linha de 5% ao ano para agricultor familiar está com demanda alta; cooperativas pedem documentação completa.',
    'Para cliente pequeno (até R$ 500 mil de renda), monte a proposta já com a simulação do Pronaf e ajude na papelada.',
    'Agência de notícias do agro (exemplo)', '1464226184884-fa280b87c399', ['Tejupá', 'Sarutaiá'],
    ['As cooperativas de crédito do sudoeste paulista relatam fila para o Pronaf Mais Alimentos, linha de investimento do agricultor familiar com juros de 5% ao ano.',
      'A linha financia tratores de até 105 cv e implementos, com prazo de até 10 anos e 3 anos de carência.',
      'Os gerentes recomendam que o produtor tenha a DAP/CAF em dia e o CAR regularizado antes de pedir o crédito.']],
  [1, 'regiao', 'boa', false, 'Fartura amplia área de trigo e cooperativa prevê safra recorde no inverno',
    'Área de trigo cresceu 18% em Fartura; produtores investem em plantio direto e colheita própria.',
    'Produtor de trigo precisa de trator de mais potência na safra de inverno: liste os de Fartura com trator antigo.',
    'Jornal regional (exemplo)', '1574943320219-553eb213f72d', ['Fartura'],
    ['A área de trigo em Fartura cresceu 18% nesta safra de inverno, segundo a cooperativa local, que prevê produção recorde.',
      'O avanço do trigo na região é atribuído ao bom preço do cereal e a variedades mais adaptadas ao clima do sudoeste paulista.',
      'Com duas safras por ano, os produtores estão usando mais as máquinas, o que acelera a necessidade de renovação.',
      'A cooperativa planeja um encontro técnico em novembro para discutir a próxima safra.']],
  [2, 'politica', 'neutra', true, 'Governo anuncia renegociação de dívidas rurais para produtores afetados pela seca',
    'Medida permite alongar parcelas de investimento de quem teve perda comprovada na safra passada.',
    'Cliente com dívida renegociada pode voltar a ter limite no banco no ano que vem: anote quem está nessa situação.',
    'Agência de notícias (exemplo)', '1605000797499-95a51c5269ae', [],
    ['O governo federal anunciou uma medida para renegociar dívidas de crédito rural de produtores que tiveram perdas comprovadas por estiagem na safra passada.',
      'O produtor poderá alongar as parcelas de investimento por até 3 anos, mantendo a taxa original do contrato.',
      'A medida vale para contratos do Pronaf, Pronamp e das demais linhas com recursos controlados.',
      'Os bancos têm até 60 dias para começar a operar a renegociação.']],
  [2, 'mercado', 'ruim', false, 'Milho recua em Avaré com colheita da safrinha no Paraná',
    'A saca de milho caiu 2,1% e fechou a R$ 63,80 em Avaré.',
    'Produtor de milho mais cauteloso: aborde com foco em economia de diesel e custo por hectare (use a Calculadora).',
    'Boletim de mercado (exemplo)', '1498408040764-ab6eb772a145', ['Ourinhos', 'Bernardino de Campos'],
    ['O preço do milho caiu na região com a entrada da colheita da safrinha no Paraná. Em Avaré, a saca fechou a R$ 63,80, queda de 2,1% na semana.',
      'Os compradores estão retraídos, à espera de mais oferta nas próximas semanas.',
      'Para o produtor, a recomendação é escalonar as vendas e aproveitar a armazenagem quando possível.']],
  [3, 'clima', 'ruim', false, 'Risco de geada tardia preocupa cafeicultores do norte do Paraná',
    'Massa de ar polar pode derrubar a temperatura para 3 °C nas baixadas de Carlópolis na quinta-feira.',
    'Evite visitas de venda a cafeicultores de Carlópolis nesta semana: o foco deles é proteger a lavoura.',
    'Serviço de meteorologia (exemplo)', '1416879595882-3373a0480b5b', ['Carlópolis'],
    ['Uma massa de ar polar deve derrubar as temperaturas no norte do Paraná e no sudoeste paulista na quinta-feira, com risco de geada fraca nas baixadas.',
      'Em Carlópolis, a mínima pode chegar a 3 °C. Os cafeicultores estão em alerta porque as lavouras estão em florada.',
      'A partir de sábado, as temperaturas voltam a subir.']],
  [3, 'maquinas', 'boa', false, 'Feira regional de Ourinhos terá área dedicada a tratores compactos',
    'A feira acontece em novembro e deve reunir 40 expositores de máquinas e implementos.',
    'Confirme a presença da loja e agende demonstrações do 2025 Jivo e do Yuvo para pequenos produtores.',
    'Jornal regional (exemplo)', '1586771107445-d3ca888129ff', ['Ourinhos'],
    ['A feira agropecuária de Ourinhos, marcada para novembro, terá pela primeira vez uma área exclusiva para tratores compactos e implementos para pequenas propriedades.',
      'A organização espera 40 expositores e cerca de 15 mil visitantes em quatro dias.',
      'Bancos e cooperativas terão estandes com condições especiais de financiamento durante o evento.']],
  [4, 'taxas', 'neutra', false, 'Copom mantém Selic em 14,75% e indica cortes só em 2027',
    'O Banco Central manteve a taxa básica e sinalizou que o ciclo de cortes deve começar no ano que vem.',
    'Juro livre segue alto: as linhas do Plano Safra (Moderfrota, Pronamp, Pronaf) são o melhor argumento de financiamento.',
    'Agência de economia (exemplo)', '1595841696677-6489ff3f8cd1', [],
    ['O Comitê de Política Monetária do Banco Central manteve a taxa Selic em 14,75% ao ano, como esperado pelo mercado.',
      'No comunicado, o comitê indicou que a inflação ainda está acima da meta e que cortes devem ficar para 2027.',
      'Para o produtor, o juro alto encarece o crédito livre, mas as linhas equalizadas do Plano Safra seguem com taxas bem menores.']],
  [4, 'regiao', 'boa', false, 'Ipaussu ganha nova unidade de armazenagem de grãos',
    'Silo com capacidade para 30 mil toneladas deve começar a operar na colheita da soja.',
    'Mais armazenagem perto = produtor de Ipaussu com mais margem para investir. Visite os grandes de soja da cidade.',
    'Jornal regional (exemplo)', '1523348837708-15d4a09cfac2', ['Ipaussu'],
    ['Ipaussu vai ganhar uma unidade de armazenagem de grãos com capacidade para 30 mil toneladas, que deve começar a operar na próxima colheita de soja.',
      'O investimento é de uma cerealista da região e deve reduzir o custo de frete dos produtores, que hoje levam a soja até Ourinhos ou Chavantes.',
      'A prefeitura estima que a obra gere 40 empregos diretos.']],
]

function montarBoletins(hoje) {
  const dias = []
  let d = diaUtil(hoje)
  for (let i = 0; i < 5; i++) { dias.push(d); d = diaUtil(somarDias(d, -1)) }
  let id = 1000
  const noticias = SPEC_NOTICIAS.map(([dia, categoria, tendencia, destaque, titulo, resumo, impacto, fonte, img, cidades, corpo]) => {
    const slug = textoNorm(titulo).split(' ').slice(0, 6).join('-')
    return { id: ++id, _dia: dias[dia], categoria, tendencia, titulo, resumo, impacto, fonte_nome: fonte, fonte_url: `https://noticias.exemplo.invalid/${slug}`,
      publicado_em: `${dias[dia]}T${p2(6 + (id % 10))}:${p2((id * 7) % 60)}:00-03:00`, destaque, cidades, imagem_url: IMG(img), url_artigo: `https://noticias.exemplo.invalid/${slug}`, corpo }
  })
  const MANCHETES = [
    { titulo: 'Crédito do Moderfrota volta a andar e soja sobe: semana boa para fechar negócio', resumo: 'Recursos novos no BNDES, soja em alta e chuva chegando no fim de semana. Ligue para quem tem proposta esperando o banco.' },
    { titulo: 'Café acima de R$ 2.100 e trigo recorde em Fartura', resumo: 'Cafeicultores e triticultores capitalizados. Pronaf com fila: ajude o cliente pequeno na papelada.' },
    { titulo: 'Renegociação de dívidas rurais e milho em queda', resumo: 'Medida do governo alonga parcelas de quem perdeu na seca. Milho recua com a safrinha do Paraná.' },
    { titulo: 'Geada no norte do Paraná e feira de Ourinhos com área de compactos', resumo: 'Cafeicultores de Carlópolis em alerta. Prepare demonstrações para a feira de novembro.' },
    { titulo: 'Selic mantida em 14,75%: Plano Safra é o melhor argumento', resumo: 'Juro livre alto; linhas equalizadas seguem bem mais baratas. Ipaussu ganha silo novo.' },
  ]
  const boletins = {}
  dias.forEach((dia, i) => {
    const r = prng(semente(`ind${i}`))
    const v = (base, amp) => +(base * (1 + (r() - 0.5) * amp)).toFixed(2)
    const dolar = v(5.46 - i * 0.012, 0.004), dolarAnt = v(dolar * 0.994, 0.002)
    const ind = (id2, nome, valor, anterior, texto, sentido, limiar, referencia, fonte_nome, fonte_url) => {
      const variacaoPct = anterior ? +(((valor - anterior) / anterior) * 100).toFixed(2) : null
      const tendencia = variacaoPct == null || Math.abs(variacaoPct) < limiar ? 'neutra' : (sentido === 'alta_boa') === variacaoPct > 0 ? 'boa' : 'ruim'
      return { id: id2, nome, valor, texto, variacaoPct, tendencia, referencia, fonte_nome, fonte_url }
    }
    const reais = (n, u) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${u}`
    const soja = v(132.4 - i * 0.6, 0.01), milho = v(63.8 + i * 0.3, 0.01), cafe = v(2108 - i * 9, 0.01), boi = v(318.5 - i * 0.8, 0.008), feijao = v(268 + i, 0.01)
    const ddmm = dia.slice(8, 10) + '/' + dia.slice(5, 7)
    boletins[dia] = {
      dia, dias, geradoEm: `${dia}T06:12:00-03:00`, manchete: MANCHETES[i],
      indicadores: [
        ind('dolar', 'Dólar', dolar, dolarAnt, `R$ ${dolar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'alta_ruim', 0.3, `fechamento de ${ddmm} · var. no dia`, 'Banco Central (PTAX)', 'https://www.bcb.gov.br/estabilidadefinanceira/historicocotacoes'),
        { id: 'selic', nome: 'Selic (meta)', valor: 14.75, texto: '14,75% a.a.', variacaoPct: null, tendencia: 'neutra', referencia: 'meta atual do Copom', fonte_nome: 'Banco Central (SGS 432)', fonte_url: 'https://www.bcb.gov.br/controleinflacao/taxaselic' },
        ind('preco-soja', 'Soja', soja, +(soja / 1.03).toFixed(2), reais(soja, 'sc'), 'alta_boa', 1, `Assis · semana de ${ddmm}`, 'CONAB — preços semanais', 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html#soja'),
        ind('preco-milho', 'Milho', milho, +(milho * 1.021).toFixed(2), reais(milho, 'sc'), 'alta_boa', 1, `Avaré · semana de ${ddmm}`, 'CONAB — preços semanais', 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html#milho'),
        ind('preco-cafe', 'Café arábica', cafe, +(cafe / 1.024).toFixed(2), reais(cafe, 'sc'), 'alta_boa', 1, `Marília · semana de ${ddmm}`, 'CONAB — preços semanais', 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html#cafe'),
        ind('preco-boi', 'Boi gordo', boi, +(boi * 0.996).toFixed(2), reais(boi, '@'), 'alta_boa', 1, `Araçatuba · semana de ${ddmm}`, 'CONAB — preços semanais', 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html#boi'),
        ind('preco-feijao', 'Feijão', feijao, +(feijao * 0.985).toFixed(2), reais(feijao, 'sc'), 'alta_boa', 1, `Taquarituba · semana de ${ddmm}`, 'CONAB — preços semanais', 'https://portaldeinformacoes.conab.gov.br/precos-agropecuarios.html#feijao'),
      ],
      noticias: noticias.filter((n) => n._dia === dia).sort((a, b) => Number(b.destaque) - Number(a.destaque) || a.id - b.id).map(({ _dia, ...n }) => n),
      previsoes: {
        focus: [
          { indicador: 'Selic', ano: dia.slice(0, 4), mediana: 14.75, anterior: 14.75, data: dia },
          { indicador: 'Selic', ano: String(Number(dia.slice(0, 4)) + 1), mediana: 12.5, anterior: 12.75, data: dia },
          { indicador: 'IPCA', ano: dia.slice(0, 4), mediana: 4.62, anterior: 4.7, data: dia },
          { indicador: 'Câmbio', ano: dia.slice(0, 4), mediana: 5.45, anterior: 5.4, data: dia },
          { indicador: 'PIB Agropecuária', ano: dia.slice(0, 4), mediana: 2.1, anterior: 1.8, data: dia },
        ],
        clima: ['Piraju', 'Fartura', 'Ourinhos', 'Carlópolis'].map((cidade, k) => climaCidade(dia, cidade, k)),
      },
      fontes: { bcb: 'ok', conab: 'ok', focus: 'ok', clima: 'ok', noticias: 'ok', ia: 'ok' },
      podeAtualizar: false,
    }
  })
  return { dias, boletins }
}

function climaCidade(dia, cidade, k) {
  const r = prng(semente(`clima${dia}${cidade}`))
  const chuvaBase = [0, 0, 2, 0, 18, 26, 9] // chuva do fim de semana (frente fria)
  const dias = chuvaBase.map((ch, i) => {
    const mm = Math.max(0, +(ch * (0.6 + r() * 0.8) + (r() < 0.15 ? r() * 4 : 0)).toFixed(1))
    return { data: somarDias(dia, i), chuva_mm: mm, prob: Math.min(95, Math.round(mm > 0 ? 40 + mm * 2 : r() * 20)), tmin: Math.round(15 + r() * 4 - (k === 3 && i === 1 ? 6 : 0)), tmax: Math.round(29 + r() * 4 - (mm > 10 ? 5 : 0)) }
  })
  const total = dias.reduce((s, x) => s + x.chuva_mm, 0)
  const alertas = []
  if (dias.some((x) => x.tmin <= 9)) alertas.push('Risco de frio forte / geada nas baixadas')
  if (dias.some((x) => x.chuva_mm >= 30)) alertas.push('Chuva forte prevista: atenção às estradas rurais')
  if (total >= 25) alertas.push(`Chuva boa para o plantio: ${Math.round(total)} mm na semana`)
  if (total < 5) alertas.push('Semana seca: plantio deve esperar')
  return { cidade, dias, alertas }
}

// =============================================================================
// PLANO SAFRA (iv_linhas_credito + iv_fontes_monitor)
// =============================================================================
function safraAtual(hojeIso) { const a = Number(hojeIso.slice(0, 4)), m = Number(hojeIso.slice(5, 7)); const ini = m >= 7 ? a : a - 1; return `${ini}/${String(ini + 1).slice(2)}` }
const BNDES = 'https://www.bndes.gov.br/wps/portal/site/home/financiamento/produto/'
function montarPlanoSafra(hoje) {
  const safra = safraAtual(hoje)
  const ini = safra.slice(0, 4)
  const vig = { vigencia_de: `${ini}-07-01`, vigencia_ate: `${Number(ini) + 1}-06-30` }
  const conf = somarDias(hoje, -12) + 'T14:20:00-03:00'
  const L = [
    ['moderfrota', 'Moderfrota — receita bruta até R$ 45 milhões', 11.5, null, 7, 14, 85, 'Até 85% do valor do bem', 'Produtores e cooperativas com receita bruta anual até R$ 45 milhões', 'Tratores, colheitadeiras, plantadeiras, pulverizadores e implementos novos', 'moderfrota', 'vigente'],
    ['moderfrota', 'Moderfrota — máquinas usadas (revenda credenciada)', 12.5, null, 4, 6, 85, 'Até 85% do valor; máquina com até 8 anos', 'Mesmo público do Moderfrota', 'Tratores e colheitadeiras usados com até 8 anos', 'moderfrota', 'vigente'],
    ['pronaf', 'Pronaf Mais Alimentos — tratores até 105 cv', 5, null, 10, 36, 100, 'Até R$ 250 mil por beneficiário por ano agrícola', 'Agricultor familiar com DAP/CAF ativa (renda bruta até R$ 500 mil)', 'Tratores até 105 cv, implementos e equipamentos', 'pronaf-mais-alimentos', 'vigente'],
    ['pronaf', 'Pronaf Mais Alimentos — produção agroecológica e renda até R$ 100 mil', 2.5, 3, 10, 36, 100, 'Até R$ 250 mil', 'Agricultor familiar de menor renda', 'Máquinas e equipamentos de pequeno porte', 'pronaf-mais-alimentos', 'vigente'],
    ['pronamp', 'Pronamp Investimento — médio produtor', 8, null, 8, 36, 100, 'Até R$ 600 mil por beneficiário', 'Médio produtor com receita bruta anual até R$ 3,5 milhões', 'Máquinas, implementos, correção de solo e benfeitorias', 'pronamp-investimento', 'vigente'],
    ['inovagro', 'Inovagro — agricultura de precisão e conectividade', 10.5, null, 10, 36, 100, 'Até R$ 2,6 milhões (individual)', 'Produtores rurais e cooperativas', 'Máquinas com agricultura de precisão, piloto automático, telemetria e conectividade', 'inovagro', 'vigente'],
    // leitura nova do robô aguardando conferência
    ['moderfrota', 'Moderfrota — receita bruta até R$ 45 milhões (nova leitura)', 11, null, 7, 14, 85, 'Até 85% do valor do bem', 'Produtores e cooperativas com receita bruta anual até R$ 45 milhões', 'Tratores e implementos novos', 'moderfrota', 'proposta'],
  ]
  const linhas = L.map(([programa, nome, taxa_aa, taxa_aa_max, prazo_anos, carencia_meses, participacao_pct, limite, publico, financia, url, status], i) => ({
    id: 200 + i, programa, nome, safra, taxa_aa, taxa_aa_max, prazo_anos, carencia_meses, participacao_pct, limite, publico, financia, fonte_url: BNDES + url,
    observacao: status === 'proposta' ? 'O robô leu taxa de 11% na página do BNDES; falta conferir.' : `Vigente de ${br(vig.vigencia_de)} a ${br(vig.vigencia_ate)}.`,
    status, proposta_de: status === 'proposta' ? 200 : null, origem: status === 'proposta' ? 'robo' : 'manual',
    criado_em: status === 'proposta' ? somarDias(hoje, -1) + 'T06:30:00-03:00' : `${ini}-07-03T10:00:00-03:00`, criado_por: status === 'proposta' ? 'robô' : 'Financeiro (exemplo)',
    conferido_em: status === 'proposta' ? null : conf, conferido_por: status === 'proposta' ? null : 'Financeiro (exemplo)', ...vig,
  }))
  const fontes = [['moderfrota', 'Moderfrota (BNDES)', 'moderfrota', -1], ['pronaf', 'Pronaf Mais Alimentos (BNDES)', 'pronaf-mais-alimentos', null], ['pronamp', 'Pronamp Investimento (BNDES)', 'pronamp-investimento', null], ['inovagro', 'Inovagro (BNDES)', 'inovagro', null]]
    .map(([programa, nome, url, mudou], i) => ({ id: 20 + i, programa, nome, url: BNDES + url, verificado_em: somarDias(hoje, -1) + 'T06:30:00-03:00', mudou_em: mudou != null ? somarDias(hoje, mudou) + 'T06:30:00-03:00' : null, erro: null }))
  return { linhas, fontes, conferentes: [{ id: 'u-exemplo-1', nome: 'Financeiro (exemplo)' }], safra, lendo: false, podeConferir: false, podeEscolher: false }
}

// =============================================================================
// CALCULADORA (roi.ts)
// =============================================================================
export const PADRAO_ROI = {
  areaHa: 600, custoAtualHa: 180, preco: 350000, valorUsado: 0, rendimentoHaH: 2.5, consumoLH: 12, precoDiesel: 6.2, operadorHora: 35, manutencaoPctAno: 3,
  vidaUtilAnos: 10, residualPct: 35, haTerceiros: 0, precoServicoHa: 180, financiar: true, entradaPct: 20, taxaAnualPct: 8.5, prazoAnos: 7, parcelasPorAno: 1,
}
/** Modelos para pré-preencher a calculadora (preços imaginários). */
export const MODELOS_CALCULADORA = [
  { id: '2025-jivo', modelo: 'Mahindra 2025 Jivo 4x4', cv: 25, preco: 115000, rendimentoHaH: 0.6, consumoLH: 3.5, uso: 'Hortaliças, chácara, pomar' },
  { id: '4025', modelo: 'Mahindra 4025 4x4', cv: 41, preco: 165000, rendimentoHaH: 1, consumoLH: 5.5, uso: 'Pecuária leiteira, sítio' },
  { id: 'yuvo-575', modelo: 'Mahindra Yuvo 575 4x4', cv: 47, preco: 205000, rendimentoHaH: 1.2, consumoLH: 6.5, uso: 'Café, fruticultura' },
  { id: 'yuvo-585', modelo: 'Mahindra Yuvo 585 4x4', cv: 50, preco: 238000, rendimentoHaH: 1.4, consumoLH: 7, uso: 'Uso geral, café, grãos pequenos' },
  { id: '6075', modelo: 'Mahindra 6075 4x4', cv: 75, preco: 289000, rendimentoHaH: 2, consumoLH: 9.5, uso: 'Grãos, pastagem, uso geral' },
  { id: '6110', modelo: 'Mahindra 6110 4x4', cv: 110, preco: 372000, rendimentoHaH: 2.8, consumoLH: 13, uso: 'Grãos, plantio, cana' },
  { id: '7590', modelo: 'Mahindra 7590 4x4', cv: 90, preco: 465000, rendimentoHaH: 2.5, consumoLH: 12, uso: 'Grãos, cana, prestador de serviço' },
  { id: '9500', modelo: 'Mahindra 9500 4x4', cv: 125, preco: 598000, rendimentoHaH: 3.4, consumoLH: 16, uso: 'Grande área, cana, prestador' },
]
/** Cenário pronto: 6075 com Moderfrota para o Sítio Boa Vista (entrada = usado). */
export const CENARIO_EXEMPLO_ROI = { ...PADRAO_ROI, areaHa: 170, custoAtualHa: 210, preco: 289000, valorUsado: 95000, rendimentoHaH: 2, consumoLH: 9.5, entradaPct: 33, taxaAnualPct: 11.5, prazoAnos: 7, haTerceiros: 60, precoServicoHa: 190 }

// =============================================================================
// RAIO-X DA CIDADE (formato CidadeIV de cidade.ts) — para a ficha
// =============================================================================
function montarCidadeIV(hoje, m, perdas) {
  const cid = CIDADES.find((c) => c.ibge === m.ibge)
  const r = prng(semente(`cidade${m.ibge}`))
  const anoAgro = String(Number(hoje.slice(0, 4)) - 1)
  const minhas = perdas.filter((p) => textoNorm(p.cidade) === textoNorm(m.nome) && p.concorrente)
  const conc = new Map()
  for (const p of minhas) { const e = conc.get(p.concorrente) || { nome: p.concorrente, perdas: 0, valor: 0, ultima: '' }; e.perdas++; e.valor += p.valorConcorrente || 0; if (p.data > e.ultima) e.ultima = p.data; conc.set(p.concorrente, e) }
  const pibTotal = Math.round(cid.populacao * (38 + r() * 12))
  const agroMil = Math.round(m.valorProducaoMil * 0.42)
  const props = Math.round(m.imoveis * 0.9)
  const comTrator = Math.round(props * (0.32 + r() * 0.15))
  return {
    ibge: m.ibge,
    populacao: { valor: cid.populacao, ano: '2025' },
    pib: { totalMil: pibTotal, agroMil, agroPct: +((agroMil / pibTotal) * 100).toFixed(1), ano: '2023' },
    censo: { propriedades: props, comTrator, tratores: Math.round(comTrator * 1.4), menos100cv: Math.round(comTrator * 1.1), mais100cv: Math.round(comTrator * 0.3), semTratorPct: +(1 - comTrator / props).toFixed(3) },
    valorCulturas: m.culturas.map((c) => ({ nome: c.nome, valorMil: Math.round(c.ha * (VALOR_HA[c.nome] || 5)) })).sort((a, b) => b.valorMil - a.valorMil),
    serie: Array.from({ length: 6 }, (_, i) => { const f = 0.84 + i * 0.035 + r() * 0.02; return { ano: String(Number(anoAgro) - 5 + i), areaHa: Math.round(m.areaPlantadaHa * f), valorMil: Math.round((m.valorProducaoMil || 0) * f * (0.85 + i * 0.04)) } }),
    rebanhos: [{ nome: 'Bovino', cabecas: m.bovinos || 0 }, { nome: 'Galináceos', cabecas: Math.round(20000 + r() * 90000) }, { nome: 'Suíno', cabecas: Math.round(800 + r() * 4000) }],
    leiteMilLitros: Math.round((m.bovinos || 0) * 0.12),
    anoAgro,
    clima: climaCidade(hoje, m.nome, 0).dias.map((d) => ({ data: d.data, chuvaMm: d.chuva_mm, prob: d.prob, tmin: d.tmin, tmax: d.tmax })),
    alertasClima: climaCidade(hoje, m.nome, 0).alertas,
    concorrentes: [...conc.values()].sort((a, b) => b.perdas - a.perdas),
    perdasTotal: minhas.length,
    fontes: { ibge: 'ok', clima: 'ok', propostas: 'ok' },
  }
}

// =============================================================================
// TUDO — guardado por dia
// =============================================================================
let cache = null
export function dadosExemplo() {
  const hoje = hojeISO()
  if (cache && cache.hoje === hoje) return cache
  const propostas = montarPropostas(hoje)
  const clientes = montarClientes(hoje)
  const negocios = montarNegocios(hoje)
  const visitasCli = clientes.flatMap((c) => c.historicoVisitas.map((v) => ({ ...v, _nome: c.nome, _cidade: c.cidade })))
  const fila = (dias) => montarFila({ propostas, negocios, visitas: visitasCli, hoje, diasParada: dias })
  const municipios = montarMunicipios()
  const imoveis = montarImoveisCar(clientes)
  const indicacoes = montarIndicacoes(hoje, clientes)
  const concorrencia = montarConcorrencia(hoje, propostas, clientes)
  const empresas = montarEmpresas(hoje, clientes)
  const visitasEquipe = montarVisitasEquipe(hoje, clientes)
  const eventos = montarEventos(hoje, visitasEquipe, propostas)
  const equipe = montarEquipe(hoje, visitasEquipe, negocios, propostas, clientes, eventos)
  const { dias, boletins } = montarBoletins(hoje)
  const planoSafra = montarPlanoSafra(hoje)
  const cidades = Object.fromEntries(municipios.map((m) => [m.ibge, montarCidadeIV(hoje, m, concorrencia.perdas)]))

  // prospecção (mesmo formato de ResumoProspeccao)
  const parados = fila(15)
  const comMotivo = clientes.filter((c) => c.oportunidades.length > 0)
  const cont = new Map()
  for (const c of comMotivo) for (const o of c.oportunidades) cont.set(o.regra, (cont.get(o.regra) || 0) + 1)
  const reabordar = clientes.filter((c) => c.oportunidades.some((o) => o.regra === 'reabordar'))
  const desde = somarDias(hoje, -365)
  const perdidas = propostas.filter((p) => p.status === PROPOSTA_PERDIDA && p.fechado_em >= desde)
  const porConc = new Map()
  for (const p of perdidas) if (p.concorrente) { const e = porConc.get(p.concorrente) || { nome: p.concorrente, qtd: 0 }; e.qtd++; porConc.set(p.concorrente, e) }
  const indAbertas = indicacoes.filter((i) => !/ganha|perdida/.test(i.status))
  const resumo = {
    geradoEm: `${hoje}T07:00:00-03:00`,
    carteira: { clientes: clientes.length, comMotivo: comMotivo.length, porMotivo: [...cont.entries()].map(([regra, qtd]) => ({ regra, rotulo: REGRAS[regra].rotulo, cor: REGRAS[regra].cor, qtd })).sort((a, b) => b.qtd - a.qtd), top: comMotivo.slice(0, 24) },
    recuperar: { parados: parados.length, valorParado: parados.reduce((a, i) => a + (i.valor || 0), 0), topParados: [...parados].sort((a, b) => b.gravidade - a.gravidade || b.valor - a.valor).slice(0, 14),
      reabordar: reabordar.length, topReabordar: reabordar.slice(0, 8), perdidas12m: perdidas.length, concorrentes: [...porConc.values()].sort((a, b) => b.qtd - a.qtd).slice(0, 5) },
    novos: {
      propriedades: imoveis.filter((p) => !p.vinculos).sort((a, b) => b.score - a.score || b.areaHa - a.areaHa).slice(0, 12).map((p) => ({ cod: p.cod, municipio: p.municipio, areaHa: p.areaHa, cultura: p.cultura, investimento: p.investimento, credito: p.credito })),
      sugestoesVinculo: 3, indicacoesAbertas: indAbertas.length,
      indicacoes: indAbertas.slice(0, 6).map((i) => ({ nome: i.indicado_nome, cidade: i.indicado_cidade, quem: i.indicante_nome, status: i.status })),
      empresasNovas: empresas.novas.length,
      empresas: empresas.novas.slice(0, 6).map((e) => ({ nome: e.nome_fantasia || e.razao_social, municipio: e.municipio, cnae: e.cnae_descricao, abertura: e.data_inicio })),
    },
    territorio: { municipios: municipios.slice(0, 12).map((m) => ({ nome: m.nome, foco: m.foco, cultura: m.culturaPrincipal, clientes: m.clientes, tratores: m.tratoresVendidos, areaHa: m.areaPlantadaHa, linhas: m.linhas })) },
  }

  const feed = montarReserva({ vendedor: VENDEDOR_LOGADO, clientes, parados, imoveis })
  cache = {
    hoje, propostas, clientes, negocios, fila, municipios, imoveis, indicacoes, concorrencia, empresas,
    visitasEquipe, eventos, equipe, periodos: periodosMensais(hoje, eventos, 8), dias, boletins, planoSafra, cidades,
    prospeccao: { ...resumo, falas: falasTratorilson(resumo) }, feed,
  }
  return cache
}
