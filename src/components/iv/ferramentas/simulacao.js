// =============================================================================
// Simulação da Calculadora no app = calcularROI (port do roi.ts do Portal, em
// lib/iv/fonte.js) + CARÊNCIA no financiamento, que o roi.ts não tem.
//
// Carência (meses): ninguém paga nada nesse tempo; os juros do período entram
// no saldo (capitalizados) e a 1ª parcela vence no fim da carência. O prazo
// informado é o TOTAL, já com a carência dentro (como o Plano Safra publica:
// "até 7 anos, com até 14 meses de carência").
//   ex.: 7 anos, 14 meses de carência, parcelas anuais → vencem nos meses
//   14, 26, 38, 50, 62 e 74 (6 parcelas).
// Sem carência o resultado é IGUAL ao do Portal.
// =============================================================================
import { calcularROI, parcelaPrice } from '../../../lib/iv/fonte'

const pos = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0)

export function simular(ent) {
  const r = calcularROI(ent)
  const preco = pos(ent.preco)
  const usado = Math.min(pos(ent.valorUsado), preco)
  const vida = pos(ent.vidaUtilAnos)
  const residual = (preco * pos(ent.residualPct)) / 100
  const ppa = Number(ent.parcelasPorAno) || 1
  const passo = 12 / ppa // meses entre parcelas
  const prazoMeses = Math.round(pos(ent.prazoAnos) * 12)
  const carencia = Math.min(pos(ent.carenciaMeses), Math.max(0, prazoMeses - passo))

  let fin = { entrada: preco - usado, financiado: 0, parcela: null, nParcelas: 0, totalParcelas: null, jurosTotais: null, primeiraMes: null, saldoAposCarencia: null, vencimentos: [] }
  if (ent.financiar && prazoMeses >= passo) {
    const entradaTotal = Math.max(usado, (preco * pos(ent.entradaPct)) / 100)
    const financiado = Math.max(0, preco - entradaTotal)
    const taxaMes = Math.pow(1 + pos(ent.taxaAnualPct) / 100, 1 / 12) - 1
    const taxaPeriodo = Math.pow(1 + pos(ent.taxaAnualPct) / 100, 1 / ppa) - 1
    const primeira = Math.max(carencia, passo)
    const n = Math.floor((prazoMeses - primeira) / passo) + 1
    const saldo = financiado * Math.pow(1 + taxaMes, primeira - passo)
    const parcela = parcelaPrice(saldo, taxaPeriodo, n)
    const totalParcelas = parcela == null ? null : parcela * n
    fin = {
      entrada: entradaTotal - usado, financiado, parcela, nParcelas: n, totalParcelas,
      jurosTotais: totalParcelas == null ? null : totalParcelas - financiado, primeiraMes: primeira, saldoAposCarencia: saldo,
      vencimentos: Array.from({ length: n }, (_, i) => primeira + i * passo),
    }
  }

  // caixa ano a ano: parcelas caem no ano em que vencem
  const ultimoMes = fin.vencimentos.length ? fin.vencimentos[fin.vencimentos.length - 1] : 0
  const anos = Math.min(20, Math.max(vida || 0, Math.ceil(ultimoMes / 12), 1))
  const fluxo = []
  let acumulado = -fin.entrada
  let paybackFinanciado = null
  for (let a = 1; a <= anos; a++) {
    const nAno = fin.vencimentos.filter((m) => m > (a - 1) * 12 && m <= a * 12).length
    const p = (fin.parcela || 0) * nAno
    const extra = a === vida ? residual : 0
    const caixa = r.economiaAno - p + extra
    const antes = acumulado
    acumulado += caixa
    if (paybackFinanciado == null && antes < 0 && acumulado >= 0 && caixa > 0) paybackFinanciado = a - 1 + -antes / caixa
    fluxo.push({ ano: a, economia: r.economiaAno, parcela: p, caixa, acumulado, residual: extra })
  }
  if (paybackFinanciado == null && fin.entrada <= 0 && fluxo[0]?.caixa >= 0) paybackFinanciado = 0

  // parcela de um ano "cheio" (para comparar com a economia do ano)
  const parcelaAnual = fin.parcela == null ? null : fin.parcela * ppa
  const horas = r.horasAno
  const custoHora = horas ? (r.custoOperacionalAno + (r.depreciacaoAno || 0)) / horas : null
  const totalPago = fin.totalParcelas == null ? null : fin.totalParcelas + fin.entrada + usado

  return {
    ...r, ...fin, parcelaAnual,
    sobraAnoComParcela: parcelaAnual == null ? null : r.economiaAno - parcelaAnual,
    custoHora, totalPago, fluxo, paybackFinanciado, residual, carenciaUsada: carencia,
  }
}

/** Valores da URL (?taxa=&prazo=&linha=&cliente=&carencia=&area=&modelo=&entrada=). */
export function lerQuery(sp) {
  const n = (k) => { const v = Number(String(sp.get(k) ?? '').replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : null }
  return {
    taxa: n('taxa'), prazo: n('prazo'), carencia: sp.get('carencia') != null ? Number(sp.get('carencia')) || 0 : null, area: n('area'), entrada: n('entrada'),
    linha: sp.get('linha') || '', cliente: sp.get('cliente') || '', modelo: sp.get('modelo') || '',
  }
}
