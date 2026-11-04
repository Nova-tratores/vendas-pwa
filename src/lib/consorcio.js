// =============================================================================
// Consórcio Mahindra — leitura da planilha de cotas da administradora e as contas
// do módulo /consorcio (José, 04/11/2026).
//
// A planilha vem "suja" (números como 139.700,00 / 161857,06 / R$ 198.163,04,
// células #DIV/0! e #REF!, colunas deslocadas na última linha): tudo é lido
// pelo NOME da coluna e cada número passa por lerNumero. O que a planilha não
// traz (ou traz com erro) é recalculado aqui: saldo devedor, parcelas que
// faltam, lance do grupo.
//
// Regras do plano (site /credito): até 120 meses, sem juros, taxa de
// administração; contemplação por sorteio, lance fixo de 30% ou 40% ou lance
// livre. Na planilha, "Vlr Bem c/ Taxas" = preço × 1,16 e parcela = carta ÷ 120.
// =============================================================================
import { textoNorm } from '../components/iv/ferramentas/kit'

export const PRAZO_MESES = 120
export const TAXA_TOTAL = 0.16 // carta com taxas ÷ preço do bem − 1 (igual em todas as linhas da planilha)
export const SEGURO_MES = 0.000973 // seguro mensal ÷ preço do bem (R$ 136 num 2025 de R$ 139.700)
export const LANCES_FIXOS = [0.3, 0.4]

// ── leitura ──────────────────────────────────────────────────────────────────
/** CSV com aspas e vírgula dentro do campo. */
export function lerCsv(texto) {
  const linhas = []
  let campo = '', linha = [], aspas = false
  const t = String(texto || '').replace(/^﻿/, '')
  // Excel em português salva com ";" — decide pelo cabeçalho
  const cab = t.slice(0, t.search(/\r?\n/) >>> 0)
  const sep = (cab.match(/;/g) || []).length > (cab.match(/,/g) || []).length ? ';' : ','
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (aspas) {
      if (c === '"' && t[i + 1] === '"') { campo += '"'; i++ }
      else if (c === '"') aspas = false
      else campo += c
    } else if (c === '"') aspas = true
    else if (c === sep) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++
      linha.push(campo); campo = ''
      if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
      linha = []
    } else campo += c
  }
  linha.push(campo)
  if (linha.some((x) => x.trim() !== '')) linhas.push(linha)
  return linhas
}

/** "139.700,00" · "161857,06" · "R$ 198.163,04" · "5,83" · "150,00%" · 161857 → número; erro de planilha → null. */
export function lerNumero(v) {
  if (v == null) return null
  let s = String(v).trim()
  if (!s || s.startsWith('#')) return null
  s = s.replace(/R\$/gi, '').replace(/%/g, '').replace(/\s/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "23/09/24" ou "01/04/2025" → "2024-09-23". */
export function lerData(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)
  if (!m) return null
  const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
  return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export function mesesEntre(isoA, b = new Date()) {
  if (!isoA) return null
  const a = new Date(`${isoA}T12:00:00`)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  if (b.getDate() < a.getDate()) m--
  return Math.max(0, m)
}

const COL = {
  grupo: 'grupo', cota: 'cota', contrato: 'contrato', serie: 'serie', consorciado: 'consorciado',
  situacao: 'situacao', concessionaria: 'concessionaria', vendedor: 'vendedor', bem: 'bem',
  preco: 'preco atual', carta: 'vlr bem c/ taxas', cartaSeguro: 'vlr bem tx+seg.',
  dataContemplacao: 'data contemplacao', dataVenda: 'data da venda', parcela: 'parcela atual',
  percPago: 'perc. adquirido', valorLance: 'valor lance', valorAtraso: 'valor atraso', valorAberto: 'valor aberto',
  quitacao: '% quitacao', seguro: 'seguro mensal', lancePct: '% lance ganhador sugerido', lanceValor: 'lance ganhador sugerido',
}

/** Bem da planilha → nome curto do modelo ("MAHINDRA 6075 80CV PLATAFORMA…" → "6075"). */
export function modeloDoBem(bem) {
  const m = String(bem || '').toUpperCase().replace(/MAHINDRA\s*/, '').match(/^([\dA-Z-]+?)(?=\s|$)/)
  return m ? m[1] : String(bem || '').trim()
}
export function cvDoBem(bem) {
  const m = String(bem || '').match(/(\d+)\s*CV/i)
  return m ? Number(m[1]) : null
}

/** Planilha (texto CSV) → cotas já com as contas do módulo. */
export function lerPlanilha(texto, hoje = new Date()) {
  const linhas = lerCsv(texto)
  if (linhas.length < 2) return { cotas: [], avisos: ['A planilha está vazia.'] }
  const cab = linhas[0].map((h) => textoNorm(h).replace(/\s+/g, ' '))
  const idx = {}
  for (const [k, nome] of Object.entries(COL)) idx[k] = cab.findIndex((h) => h === nome)
  const faltam = ['grupo', 'cota', 'consorciado', 'bem'].filter((k) => idx[k] < 0)
  if (faltam.length) return { cotas: [], avisos: [`Colunas que não achei na planilha: ${faltam.join(', ')}.`] }

  const brutas = linhas.slice(1).map((l, i) => {
    const pega = (k) => (idx[k] >= 0 ? (l[idx[k]] ?? '').trim() : '')
    const problemas = []
    if (l.some((x) => /^#(DIV\/0!|REF!|N\/A|VALOR!|VALUE!)/i.test(String(x).trim()))) problemas.push('células com erro de fórmula (#DIV/0! ou #REF!)')
    let percPago = lerNumero(pega('percPago'))
    if (percPago != null && percPago > 100) { problemas.push(`% pago de ${percPago.toLocaleString('pt-BR')}% (acima de 100%)`); percPago = 100 }
    return {
      linha: i + 2,
      grupo: pega('grupo'),
      cota: pega('cota'),
      contrato: pega('contrato'),
      serie: pega('serie'),
      cliente: pega('consorciado'),
      situacaoTexto: pega('situacao'),
      concessionaria: pega('concessionaria'),
      vendedor: pega('vendedor'),
      bem: pega('bem'),
      preco: lerNumero(pega('preco')),
      carta: lerNumero(pega('carta')),
      cartaSeguro: lerNumero(pega('cartaSeguro')),
      dataContemplacao: lerData(pega('dataContemplacao')),
      dataVenda: lerData(pega('dataVenda')),
      parcela: lerNumero(pega('parcela')),
      percPago,
      valorLance: lerNumero(pega('valorLance')) || 0,
      valorAtraso: lerNumero(pega('valorAtraso')) || 0,
      valorAberto: lerNumero(pega('valorAberto')) || 0,
      quitadoTexto: /quitad/i.test(pega('quitacao')),
      seguro: lerNumero(pega('seguro')),
      lancePct: lerNumero(pega('lancePct')),
      lanceValor: lerNumero(pega('lanceValor')),
      problemas,
    }
  }).filter((c) => c.grupo && c.cota)

  // lance do grupo: quando a linha não traz (ou traz #REF!), vale o que as outras cotas do grupo mostram
  const lanceDoGrupo = {}
  for (const c of brutas) if (c.lancePct != null && c.lancePct <= 100 && !lanceDoGrupo[c.grupo]) lanceDoGrupo[c.grupo] = c.lancePct

  const cotas = brutas.map((c) => completar(c, lanceDoGrupo, hoje))
  const avisos = cotas.filter((c) => c.problemas.length).map((c) => `Linha ${c.linha} (grupo ${c.grupo}, cota ${c.cota}): ${c.problemas.join('; ')}.`)
  return { cotas, avisos }
}

function completar(c, lanceDoGrupo, hoje) {
  const carta = c.carta ?? (c.preco ? c.preco * (1 + TAXA_TOTAL) : null)
  const s = textoNorm(c.situacaoTexto)
  const formaContemplacao = s.startsWith('lance') ? 'lance' : s.startsWith('sorteio') ? 'sorteio' : null
  const contemplada = !!(formaContemplacao || c.dataContemplacao)
  const percPago = c.percPago ?? 0
  const quitada = c.quitadoTexto || percPago >= 99.9
  const saldo = quitada || carta == null ? 0 : carta * (1 - percPago / 100)
  const parcelasRestantes = quitada ? 0 : c.parcela > 0 ? Math.ceil(saldo / c.parcela - 0.01) : null
  const lancePct = c.lancePct != null && c.lancePct <= 100 ? c.lancePct : lanceDoGrupo[c.grupo] ?? null
  const lanceValor = !contemplada && lancePct != null && carta ? (c.lanceValor && c.lancePct === lancePct ? c.lanceValor : carta * lancePct / 100) : null
  const nossa = /nova tratores/i.test(c.concessionaria || '')
  const problemas = [...c.problemas]
  if (!nossa && c.concessionaria) problemas.push(`vendida por ${c.concessionaria}`)
  return {
    ...c,
    id: `${c.grupo}-${c.cota}`,
    modelo: modeloDoBem(c.bem),
    cv: cvDoBem(c.bem),
    carta,
    percPago,
    contemplada,
    formaContemplacao: formaContemplacao || (c.dataContemplacao ? 'contemplada' : null),
    quitada,
    status: quitada ? 'quitada' : contemplada ? 'contemplada' : 'aguardando',
    saldo,
    parcelasRestantes,
    mesesDesdeVenda: mesesEntre(c.dataVenda, hoje),
    mesesDesdeContemplacao: mesesEntre(c.dataContemplacao, hoje),
    lancePct,
    lanceValor,
    emAtraso: c.valorAtraso > 0 && !quitada,
    nossa,
    problemas,
  }
}

// ── agrupamentos ─────────────────────────────────────────────────────────────
export function porCliente(cotas) {
  const m = new Map()
  for (const c of cotas) {
    const k = textoNorm(c.cliente)
    if (!m.has(k)) m.set(k, { chave: k, nome: c.cliente, cotas: [] })
    m.get(k).cotas.push(c)
  }
  return [...m.values()].map((g) => ({
    ...g,
    carta: soma(g.cotas, 'carta'),
    parcelaMes: soma(g.cotas.filter((c) => !c.quitada), 'parcela'),
    aguardando: g.cotas.filter((c) => c.status === 'aguardando').length,
    contempladas: g.cotas.filter((c) => c.contemplada).length,
  })).sort((a, b) => b.cotas.length - a.cotas.length || b.carta - a.carta)
}

export function porGrupo(cotas) {
  const m = new Map()
  for (const c of cotas) {
    if (!m.has(c.grupo)) m.set(c.grupo, [])
    m.get(c.grupo).push(c)
  }
  return [...m.entries()].map(([grupo, cs]) => {
    const vendas = cs.map((c) => c.dataVenda).filter(Boolean).sort()
    const inicio = vendas[0] || null
    const fim = inicio ? somarMeses(inicio, PRAZO_MESES) : null
    return {
      grupo,
      cotas: cs.sort((a, b) => Number(a.cota) - Number(b.cota)),
      lancePct: cs.find((c) => c.lancePct != null)?.lancePct ?? null,
      inicio,
      fim,
      decorridoPct: inicio ? Math.min(1, mesesEntre(inicio) / PRAZO_MESES) : null,
      contempladas: cs.filter((c) => c.contemplada).length,
      aguardando: cs.filter((c) => c.status === 'aguardando').length,
      carta: soma(cs, 'carta'),
      percMedio: cs.length ? cs.reduce((s, c) => s + c.percPago, 0) / cs.length : 0,
      lancesVencedores: cs.filter((c) => c.formaContemplacao === 'lance' && c.valorLance > 0 && c.carta)
        .map((c) => ({ cota: c.cota, pct: (c.valorLance / c.carta) * 100, valor: c.valorLance, data: c.dataContemplacao })),
    }
  }).sort((a, b) => Number(a.grupo) - Number(b.grupo))
}

export function resumo(cotas) {
  const ativas = cotas.filter((c) => !c.quitada)
  return {
    cotas: cotas.length,
    clientes: new Set(cotas.map((c) => textoNorm(c.cliente))).size,
    carta: soma(cotas, 'carta'),
    parcelaMes: soma(ativas, 'parcela'),
    saldo: soma(ativas, 'saldo'),
    aguardando: cotas.filter((c) => c.status === 'aguardando').length,
    contempladas: cotas.filter((c) => c.status === 'contemplada').length,
    quitadas: cotas.filter((c) => c.status === 'quitada').length,
    atraso: soma(cotas.filter((c) => c.emAtraso), 'valorAtraso'),
    emAtraso: cotas.filter((c) => c.emAtraso).length,
  }
}

// ── radar: o que fazer com cada cliente ──────────────────────────────────────
/**
 * Cada item diz POR QUE apareceu (motivo) e O QUE FAZER (acao). Prioridade 1 =
 * hoje, 2 = esta semana, 3 = quando passar perto.
 */
export function radar(cotas, hoje = new Date()) {
  const itens = []
  const clientes = porCliente(cotas)

  for (const c of cotas) {
    const ref = `grupo ${c.grupo}, cota ${c.cota}`
    if (!c.nossa) {
      itens.push({
        id: `outra-${c.id}`, tipo: 'outra', prioridade: 3, cliente: c.cliente, cotas: [c],
        titulo: 'Cota de outra concessionária',
        motivo: `${c.modelo} vendido por ${c.concessionaria} (${ref}). Se o cliente é da nossa região, a revisão e as peças podem ser nossas.`,
        acao: 'Apresentar a oficina e o pós-vendas da Nova.',
      })
      continue
    }
    if (c.emAtraso) {
      itens.push({
        id: `atraso-${c.id}`, tipo: 'atraso', prioridade: 1, cliente: c.cliente, cotas: [c], valor: c.valorAtraso,
        titulo: 'Parcela em atraso',
        motivo: `R$ ${fmt(c.valorAtraso)} em atraso no ${c.modelo} (${ref}). Cota em atraso pode ficar fora do sorteio e do lance.`,
        acao: 'Ligar hoje e combinar o pagamento antes da próxima assembleia.',
      })
    }
    if (c.status === 'aguardando' && c.percPago >= 15) {
      const falta = c.parcelasRestantes != null ? ` Faltam umas ${c.parcelasRestantes} parcelas.` : ''
      itens.push({
        id: `lance-${c.id}`, tipo: 'lance', prioridade: c.percPago >= 40 ? 1 : 2, cliente: c.cliente, cotas: [c], valor: c.lanceValor,
        titulo: 'Pronto para um lance',
        motivo: `Já pagou ${fmt(c.percPago, 0)}% do ${c.modelo} e ainda não foi contemplado.${falta}${c.lancePct != null ? ` No grupo ${c.grupo} o lance que costuma ganhar é ${fmt(c.lancePct, 1)}% (R$ ${fmt(c.lanceValor)}).` : ''}`,
        acao: 'Perguntar se tem recurso da safra (ou a venda de um usado) para dar lance e tirar o trator agora.',
      })
    }
    if (c.status === 'contemplada' && c.mesesDesdeContemplacao != null && c.mesesDesdeContemplacao >= 6) {
      const anos = c.mesesDesdeContemplacao / 12
      itens.push({
        id: `pos-${c.id}`, tipo: 'pos', prioridade: anos >= 3 ? 2 : 3, cliente: c.cliente, cotas: [c],
        titulo: anos >= 3 ? 'Trator com mais de 3 anos' : 'Já está com o trator',
        motivo: `Contemplado por ${c.formaContemplacao === 'lance' ? 'lance' : 'sorteio'} em ${dataCurta(c.dataContemplacao)} (há ${tempo(c.mesesDesdeContemplacao)}), ${c.modelo}. Ainda paga R$ ${fmt(c.parcela)} por mês.`,
        acao: anos >= 3 ? 'Oferecer uma cota nova para a troca, implemento e revisão.' : 'Oferecer implemento e revisão; anotar o que mais ele precisa na propriedade.',
      })
    }
    if (c.status === 'quitada') {
      itens.push({
        id: `quitada-${c.id}`, tipo: 'quitada', prioridade: 2, cliente: c.cliente, cotas: [c],
        titulo: 'Cota quitada',
        motivo: `Pagou o ${c.modelo} até o fim (${ref}${c.dataContemplacao ? `, contemplado em ${dataCurta(c.dataContemplacao)}` : ''}). Cliente que cumpre o plano.`,
        acao: 'Oferecer a próxima cota: o segundo trator ou a troca deste.',
      })
    }
  }

  for (const g of clientes) {
    if (g.cotas.length < 3) continue
    const nossas = g.cotas.filter((c) => c.nossa)
    if (nossas.length < 3) continue
    itens.push({
      id: `vip-${g.chave}`, tipo: 'vip', prioridade: g.aguardando >= 3 ? 1 : 2, cliente: g.nome, cotas: nossas, valor: g.carta,
      titulo: `${nossas.length} cotas: cliente grande`,
      motivo: `R$ ${fmt(g.carta)} em cartas${g.aguardando ? `, ${g.aguardando} ainda esperando contemplação` : ''}. Paga R$ ${fmt(g.parcelaMes)} por mês somando todas.`,
      acao: g.aguardando >= 2 ? 'Visita do gerente: montar um plano de lances, uma cota por vez.' : 'Visita do gerente: ver a frota e o que falta na propriedade.',
    })
  }

  const peso = { atraso: 0, vip: 1, lance: 2, quitada: 3, pos: 4, outra: 5 }
  return itens.sort((a, b) => a.prioridade - b.prioridade || peso[a.tipo] - peso[b.tipo] || (b.valor || 0) - (a.valor || 0))
}

// ── simulação ────────────────────────────────────────────────────────────────
/** Modelos que aparecem na planilha, com o preço mais recente de cada um. */
export function modelosDaPlanilha(cotas) {
  const m = new Map()
  for (const c of cotas) {
    if (!c.preco) continue
    const k = textoNorm(c.bem).replace(/\s+/g, ' ')
    const atual = m.get(k)
    if (!atual || (c.dataVenda || '') > (atual.dataVenda || '')) m.set(k, { id: k, bem: c.bem, modelo: c.modelo, cv: c.cv, preco: c.preco, dataVenda: c.dataVenda })
  }
  return [...m.values()].sort((a, b) => a.preco - b.preco)
}

/**
 * preco: valor do bem · lancePct: 0–100 · usarLancePara: 'prazo' (parcela igual, termina antes)
 * ou 'parcela' (mesmo prazo, parcela menor).
 */
export function simular({ preco, prazo = PRAZO_MESES, lancePct = 0, usarLancePara = 'prazo', taxa = TAXA_TOTAL, seguroMes = SEGURO_MES }) {
  const carta = preco * (1 + taxa)
  const parcela = carta / prazo
  const seguro = preco * seguroMes
  const lance = carta * (lancePct / 100)
  const saldoDepois = Math.max(0, carta - lance)
  let parcelaDepois = parcela, prazoDepois = prazo
  if (lance > 0) {
    if (usarLancePara === 'parcela') parcelaDepois = saldoDepois / prazo
    else prazoDepois = Math.ceil(saldoDepois / parcela - 0.01)
  }
  const totalPago = carta + seguro * prazoDepois
  return {
    carta, parcela, seguro, parcelaComSeguro: parcela + seguro, lance, saldoDepois, parcelaDepois, prazoDepois,
    totalPago, custoTotal: totalPago - preco, custoAoAno: taxa / (prazo / 12),
  }
}

// ── auxiliares ───────────────────────────────────────────────────────────────
export function ehDoVendedor(cota, nomeVendedor) {
  const a = textoNorm(nomeVendedor).split(/\s+/).filter((p) => p.length > 2)
  const b = textoNorm(cota.vendedor).split(/\s+/).filter((p) => p.length > 2)
  if (!a.length || !b.length || a[0] !== b[0]) return false
  return a.length === 1 || b.length === 1 || a.slice(1).some((p) => b.includes(p))
}

export function somarMeses(iso, n) {
  const d = new Date(`${iso}T12:00:00`)
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}
const soma = (lista, campo) => lista.reduce((s, c) => s + (Number(c[campo]) || 0), 0)
const fmt = (v, casas = 0) => (v == null ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }))
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
export const dataCurta = (iso) => (iso ? `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(2, 4)}` : '—')
export const tempo = (meses) => {
  if (meses == null) return '—'
  if (meses < 12) return `${meses} ${meses === 1 ? 'mês' : 'meses'}`
  const a = Math.floor(meses / 12), m = meses % 12
  return `${a} ${a === 1 ? 'ano' : 'anos'}${m ? ` e ${m} ${m === 1 ? 'mês' : 'meses'}` : ''}`
}
