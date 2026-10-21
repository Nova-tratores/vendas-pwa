// =============================================================================
// INTELIGÊNCIA DE VENDAS — CAMADA DE ACESSO das telas do app.
//
// HOJE: devolve os dados de EXEMPLO (./exemplo.js) com um atraso de ~300 ms, para
// a tela já tratar "carregando". AMANHÃ: cada função passa a chamar a rota do
// Portal indicada no comentário — o formato devolvido é o MESMO, então a tela
// não muda. Troca = mudar só o corpo da função (e MODO_EXEMPLO = false).
//
// As telas devem mostrar um selo "dados de exemplo" enquanto MODO_EXEMPLO = true.
// Tudo devolvido é cópia: a tela pode mexer à vontade sem estragar o exemplo.
// =============================================================================
import {
  dadosExemplo, hojeISO, diasEntre, VENDEDOR_LOGADO, VENDEDORES, REGRAS, ICONE_REGRA, PERGUNTAS, ROTULO_MOTIVO, ROTULO_ETAPA_CRM,
  CATEGORIAS_NOTICIA, PADRAO_ROI, MODELOS_CALCULADORA, CENARIO_EXEMPLO_ROI, resumoPorVendedor, somar, SOMA_ZERO, nomeCurto, reaisCurto,
} from './exemplo.js'

export const MODO_EXEMPLO = true

// constantes que as telas usam (mesmas do Portal)
export { VENDEDOR_LOGADO, REGRAS, ICONE_REGRA, PERGUNTAS, ROTULO_MOTIVO, ROTULO_ETAPA_CRM, CATEGORIAS_NOTICIA, PADRAO_ROI, MODELOS_CALCULADORA, CENARIO_EXEMPLO_ROI, somar, SOMA_ZERO, nomeCurto, reaisCurto, hojeISO }

const ATRASO_MS = 300
const espera = (ms = ATRASO_MS) => new Promise((r) => setTimeout(r, ms))
const copia = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)))
/** Simula a chamada à rota: espera e devolve uma cópia. */
async function responder(valor) {
  await espera()
  return copia(valor)
}

// ── Notícias ────────────────────────────────────────────────────────────────
/**
 * Boletim do agro de um dia (padrão: o mais recente).
 * Depois: GET /api/inteligencia-vendas/noticias?dia=YYYY-MM-DD (tabelas iv_boletim + iv_noticias).
 * → { dia, dias[], geradoEm, manchete:{titulo,resumo}, indicadores[], noticias[], previsoes:{focus[], clima[]}, fontes, podeAtualizar }
 */
export async function carregarNoticias(dia) {
  const d = dadosExemplo()
  const alvo = dia && d.boletins[dia] ? dia : d.dias[0]
  return responder(d.boletins[alvo])
}

/** Uma matéria (para a tela de leitura). Depois: sai do mesmo GET /noticias (iv_noticias.corpo). */
export async function carregarMateria(id) {
  const d = dadosExemplo()
  for (const dia of d.dias) {
    const n = d.boletins[dia].noticias.find((x) => String(x.id) === String(id))
    if (n) return responder({ ...n, dia })
  }
  return responder(null)
}

// ── Plano Safra ─────────────────────────────────────────────────────────────
/**
 * Linhas de crédito do Plano Safra.
 * Depois: GET /api/inteligencia-vendas/plano-safra (iv_linhas_credito, iv_fontes_monitor, iv_config).
 * → { linhas[], fontes[], conferentes[], safra, lendo, podeConferir, podeEscolher }
 *   (extra do exemplo em cada linha: vigencia_de / vigencia_ate)
 */
export async function carregarPlanoSafra() {
  return responder(dadosExemplo().planoSafra)
}

// ── Oportunidades (base de clientes) ────────────────────────────────────────
/**
 * Ficha de cada cliente com oportunidades e score.
 * Depois: GET /api/inteligencia-vendas/base (cache iv_snapshot; fontes Omie, revisões, OS, propostas, CRM).
 * → { clientes: ClienteIV[], totalCadastro, atualizadoEm }
 */
export async function carregarOportunidades() {
  const d = dadosExemplo()
  return responder({ clientes: d.clientes, totalCadastro: 1834, atualizadoEm: `${d.hoje}T07:00:00-03:00` })
}

/**
 * Ficha 360 de um cliente (aceita id do exemplo 'c1'…'c25' ou a chave/documento).
 * Depois: cliente vem de GET /api/inteligencia-vendas/base, município de GET /municipios e o
 * raio-x da cidade de GET /api/inteligencia-vendas/cidade?ibge=&nome=&lat=&lng=.
 * → { cliente: ClienteIV, municipio: MunicipioIV|null, cidade: CidadeIV|null, retorno: ItemRetorno[], indicacoes[], imoveis[], perdas[] }
 */
export async function carregarFicha(clienteId) {
  const d = dadosExemplo()
  const k = String(clienteId ?? '')
  const c = d.clientes.find((x) => x.id === k || x.chave === k || x.doc === k.replace(/\D/g, ''))
  if (!c) return responder(null)
  const municipio = d.municipios.find((m) => m.nome === c.cidade) || null
  return responder({
    cliente: c, municipio, cidade: municipio ? d.cidades[municipio.ibge] : null,
    retorno: d.fila(15).filter((i) => i.cliente === c.nome),
    indicacoes: d.indicacoes.filter((i) => i.indicante_doc === c.doc),
    imoveis: d.imoveis.filter((p) => p.clienteChave === c.chave),
    perdas: d.concorrencia.perdas.filter((p) => p.cliente.startsWith(c.nome)),
  })
}

/** Raio-x de uma cidade. Depois: GET /api/inteligencia-vendas/cidade?ibge=…&nome=…&lat=…&lng=… → CidadeIV */
export async function carregarCidade(ibge) {
  return responder(dadosExemplo().cidades[Number(ibge)] || null)
}

// ── Feed do vendedor (rota do dia) ──────────────────────────────────────────
/**
 * Reserva de contatos do vendedor logado (carteira / recuperar / novos), cada um com posição.
 * Depois: leitura direta de iv_feed_pool (itens) + iv_perfil_vendedor pelo Supabase do app
 * (o Portal gera com POST /api/inteligencia-vendas/feed {acao:'gerar'}).
 * → { vendedor:{id,nome,perfil,mix,cidades}, geradoEm, cidades[], itens: ItemFeed[] }
 */
export async function carregarFeed() {
  const d = dadosExemplo()
  return responder({ vendedor: VENDEDOR_LOGADO, geradoEm: `${d.hoje}T05:30:00-03:00`, cidades: VENDEDOR_LOGADO.cidades, itens: d.feed })
}

// ── Prospecção ──────────────────────────────────────────────────────────────
/**
 * Aba Prospecção (Carteira · Recuperar · Novos · Território + falas do Tratorilson).
 * Depois: GET /api/inteligencia-vendas/prospeccao (agro_v_car_perfil, iv_indicacoes, iv_cnpj, base, municípios).
 * → ResumoProspeccao & { falas:{abertura, grupos:{carteira,recuperar,novos,territorio}} }
 */
export async function carregarProspeccao() {
  return responder(dadosExemplo().prospeccao)
}

/**
 * Imóveis rurais do CAR com polígono, prioridade e cliente vinculado (para o mapa).
 * Depois: agro_v_car_perfil (cod_car, municipio, area_ha, cultura_nome, credito_36m, credito_invest_36m,
 * score_oportunidade, vinculos) + geometria do CAR (agro_car) — rota a criar no Portal.
 * → { imoveis: [{ cod, municipio, uf, ibge, areaHa, cultura, investimento, credito, lat, lng, poligono:[[lat,lng]…],
 *      score, prioridade:'alta'|'media'|'baixa', vinculos, clienteChave, clienteNome, clienteId, status_car }] }
 */
export async function carregarImoveisCar() {
  return responder({ imoveis: dadosExemplo().imoveis })
}

// ── Sem retorno ─────────────────────────────────────────────────────────────
/**
 * Fila de propostas, negócios do CRM e retornos de visita parados.
 * Depois: GET /api/inteligencia-vendas/retorno?dias=15 (Formulario/v_formulario, negocios, visitas; cache iv_snapshot).
 * → { itens: ItemRetorno[], porVendedor:[{vendedor,itens,urgentes,valor}], dias }
 */
export async function carregarRetorno({ dias = 15 } = {}) {
  const n = Math.min(90, Math.max(5, Number(dias) || 15))
  const itens = dadosExemplo().fila(n)
  return responder({ itens, porVendedor: resumoPorVendedor(itens), dias: n })
}

// ── Municípios ──────────────────────────────────────────────────────────────
/**
 * Ranking "onde focar".
 * Depois: GET /api/inteligencia-vendas/municipios[?todos=1] (IBGE PAM/PPM, agro_* do CAR/SICOR, base de clientes).
 * → { municipios: MunicipioIV[], anoIBGE, avisos[] }
 */
export async function carregarMunicipios() {
  const d = dadosExemplo()
  return responder({ municipios: d.municipios, anoIBGE: String(Number(d.hoje.slice(0, 4)) - 1), avisos: [] })
}

// ── Calculadora ─────────────────────────────────────────────────────────────
/**
 * Valores padrão da calculadora + modelos + taxas do Plano Safra para escolher.
 * Depois: padrão fixo (roi.ts → PADRAO_ROI) + taxas de GET /api/inteligencia-vendas/plano-safra.
 * → { padrao: EntradaROI, cenarioExemplo: EntradaROI, modelos[], taxas:[{programa,nome,taxa_aa,prazo_anos,carencia_meses,participacao_pct}] }
 */
export async function carregarCalculadora() {
  const ps = dadosExemplo().planoSafra
  return responder({
    padrao: PADRAO_ROI, cenarioExemplo: CENARIO_EXEMPLO_ROI, modelos: MODELOS_CALCULADORA,
    taxas: ps.linhas.filter((l) => l.status === 'vigente').map(({ programa, nome, taxa_aa, prazo_anos, carencia_meses, participacao_pct }) => ({ programa, nome, taxa_aa, prazo_anos, carencia_meses, participacao_pct })),
  })
}

/** Parcela do sistema Price (port de roi.ts). Taxa 0 = divide igual. */
export function parcelaPrice(valor, taxaPeriodo, n) {
  if (n <= 0) return null
  if (valor <= 0) return 0
  if (taxaPeriodo <= 0) return valor / n
  const f = Math.pow(1 + taxaPeriodo, n)
  return (valor * taxaPeriodo * f) / (f - 1)
}

/** Port fiel de roi.ts → calcularROI (pura, sem rede). Divisão por zero devolve null. */
export function calcularROI(ent) {
  const pos = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0)
  const area = pos(ent.areaHa), haTer = pos(ent.haTerceiros), rend = pos(ent.rendimentoHaH), preco = pos(ent.preco)
  const usado = Math.min(pos(ent.valorUsado), preco)
  const horasProprias = rend ? area / rend : null
  const horasTerceiros = rend ? haTer / rend : 0
  const horasAno = horasProprias == null ? null : horasProprias + horasTerceiros
  const custoHora = pos(ent.consumoLH) * pos(ent.precoDiesel) + pos(ent.operadorHora)
  const manut = (preco * pos(ent.manutencaoPctAno)) / 100
  const custoOperacionalAno = (horasAno ?? 0) * custoHora + manut
  const vida = pos(ent.vidaUtilAnos)
  const residual = (preco * pos(ent.residualPct)) / 100
  const depreciacaoAno = vida ? (preco - residual) / vida : null
  const custoNovoHa = area && depreciacaoAno != null ? (custoOperacionalAno + depreciacaoAno) / (area + haTer) : null
  const custoAtualAno = area * pos(ent.custoAtualHa)
  const receitaTerceirosAno = haTer * pos(ent.precoServicoHa)
  const economiaAno = custoAtualAno + receitaTerceirosAno - custoOperacionalAno
  const investimentoLiquido = preco - usado
  const paybackAnos = economiaAno > 0 ? investimentoLiquido / economiaAno : null
  let entrada = investimentoLiquido, financiado = 0, parcela = null, totalParcelas = null, jurosTotais = null, parcelaAnual = null
  const ppa = Number(ent.parcelasPorAno) || 1
  const n = Math.round(pos(ent.prazoAnos) * ppa)
  if (ent.financiar && n > 0) {
    const entradaTotal = Math.max(usado, (preco * pos(ent.entradaPct)) / 100)
    entrada = entradaTotal - usado
    financiado = Math.max(0, preco - entradaTotal)
    const taxaPeriodo = Math.pow(1 + pos(ent.taxaAnualPct) / 100, 1 / ppa) - 1
    parcela = parcelaPrice(financiado, taxaPeriodo, n)
    totalParcelas = parcela == null ? null : parcela * n
    jurosTotais = totalParcelas == null ? null : totalParcelas - financiado
    parcelaAnual = parcela == null ? null : parcela * ppa
  }
  const sobraAnoComParcela = parcelaAnual == null ? null : economiaAno - parcelaAnual
  const anos = Math.max(vida || 0, ent.financiar ? Math.ceil(pos(ent.prazoAnos)) : 0, 1)
  const fluxo = []
  let acumulado = -entrada
  for (let a = 1; a <= Math.min(anos, 20); a++) {
    const p = parcelaAnual != null && a <= Math.ceil(pos(ent.prazoAnos)) ? parcelaAnual : 0
    const extra = a === vida ? residual : 0
    const caixa = economiaAno - p + extra
    acumulado += caixa
    fluxo.push({ ano: a, economia: economiaAno, parcela: p, caixa, acumulado })
  }
  return { horasAno, custoOperacionalAno, depreciacaoAno, custoNovoHa, custoAtualAno, receitaTerceirosAno, economiaAno, investimentoLiquido, paybackAnos,
    financiado, entrada, parcela, totalParcelas, jurosTotais, parcelaAnual, sobraAnoComParcela, fluxo }
}

// ── Indicações ──────────────────────────────────────────────────────────────
/**
 * Indicações entre clientes.
 * Depois: GET /api/inteligencia-vendas/indicacoes (tabela iv_indicacoes; POST/PATCH/DELETE para gravar).
 * → { indicacoes: Indicacao[], vendedores:[{id,nome}], podeEditar }
 */
export async function carregarIndicacoes() {
  const d = dadosExemplo()
  return responder({ indicacoes: d.indicacoes, vendedores: VENDEDORES.map(({ id, nome }) => ({ id, nome })), podeEditar: false })
}

// ── Concorrência ────────────────────────────────────────────────────────────
/**
 * Perdas (propostas + CRM) e registros de anúncios/campanhas de concorrentes.
 * Depois: GET /api/inteligencia-vendas/concorrencia (iv_concorrentes + perdas de v_formulario/negocios).
 * → { registros: Registro[], perdas: Perda[], semTabela, podeEditar }
 */
export async function carregarConcorrencia() {
  const c = dadosExemplo().concorrencia
  return responder({ registros: c.registros, perdas: c.perdas, semTabela: false, podeEditar: false })
}

// ── Empresas ────────────────────────────────────────────────────────────────
/**
 * Empresas rurais novas (CNPJ na Receita) e CNAE da carteira.
 * Depois: GET /api/inteligencia-vendas/empresas (tabela iv_cnpj, origem 'receita' e 'cliente').
 * → { semTabela, novas: (iv_cnpj & {jaCliente})[], carteira:{cnpjs, consultados, porCnae[], prestadores[]} }
 */
export async function carregarEmpresas() {
  return responder(dadosExemplo().empresas)
}

// ── Equipe ──────────────────────────────────────────────────────────────────
/**
 * Placar da equipe comercial + eventos datados para o painel por período.
 * Depois: GET /api/inteligencia-vendas/equipe (vendedores, vw_visitas_detalhadas, negocios, v_formulario,
 * pedidos_venda_relatorio; cache iv_snapshot).
 * → { linhas: LinhaEquipe[], eventos: Evento[] (2 anos), vendedores:[{id,nome}], atualizadoEm,
 *     periodos: { escala:'mes', periodos:[{de,ate,rotulo,curto,parcial}] x8, time: Soma[8], porVendedor:{[id]: Soma[8]} } }
 *   `periodos` é extra do exemplo (no Portal a tela soma os eventos com somar()); pode recalcular com somar(eventos, de, ate, v).
 */
export async function carregarEquipe() {
  const d = dadosExemplo()
  return responder({ linhas: d.equipe, eventos: d.eventos, vendedores: VENDEDORES.map(({ id, nome }) => ({ id, nome })), atualizadoEm: `${d.hoje}T07:00:00-03:00`, periodos: d.periodos })
}

// ── utilidades para as telas ────────────────────────────────────────────────
/** Dias entre duas datas ISO (b − a). */
export { diasEntre }
