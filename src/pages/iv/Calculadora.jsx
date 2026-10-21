// =============================================================================
// /inteligencia/calculadora — a máquina se paga? (espelho de Calculadora.tsx +
// roi.ts do Portal, adaptado ao celular).
// Escolhe o modelo Mahindra, a linha de crédito (Plano Safra) e o prazo; o
// resultado muda ao vivo: parcela, total pago, custo por hora e por hectare,
// economia por ano e em quanto tempo se paga. Compartilha no WhatsApp e imprime
// a folha para o produtor. Aceita ?taxa=&prazo=&linha=&cliente=&carencia=.
// A última simulação fica guardada só neste aparelho.
// =============================================================================
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from 'recharts'
import { Banknote, ChevronDown, Landmark, MessageCircle, Printer, RotateCcw, Sprout, Tractor, TrendingUp, User } from 'lucide-react'
import { carregarCalculadora, carregarFicha } from '../../lib/iv/fonte'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import { brl, Cartao, Chip, Chips, ComoLer, compacto, Conta, EstilosIVF, Kpi, num, Selo } from '../../components/iv/ferramentas/kit'
import { CampoNumero, Chave, Regua, Segmentos } from '../../components/iv/ferramentas/campos'
import { lerQuery, simular } from '../../components/iv/ferramentas/simulacao'

const CHAVE = 'ivf-calculadora'
const NOME_PARCELA = { 1: ['anual', 'anuais'], 2: ['semestral', 'semestrais'], 12: ['mensal', 'mensais'] }
const anos = (v) => (v == null ? '—' : v < 0.05 ? 'na hora' : `${num(v, 1)} ${v >= 0.95 && v < 1.05 ? 'ano' : 'anos'}`)
const mesesTxt = (m) => (m % 12 === 0 && m >= 12 ? `${m / 12} ${m === 12 ? 'ano' : 'anos'}` : `${m} ${m === 1 ? 'mês' : 'meses'}`)

function lerSalvo() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || 'null') } catch { return null }
}

export default function Calculadora() {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarCalculadora(), [])
  return (
    <div>
      <EstilosIVF />
      <CabecalhoIV titulo="Calculadora" subtitulo="Financiamento e retorno da máquina para o produtor" />
      {carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {dados && <Simulador base={dados} />}
    </div>
  )
}

function Simulador({ base }) {
  const [sp] = useSearchParams()
  const q = useMemo(() => lerQuery(sp), [sp])
  const [e, setE] = useState(() => {
    const salvo = lerSalvo()
    const ini = { ...base.padrao, carenciaMeses: 0, ...(salvo?.e || {}) }
    if (q.taxa) Object.assign(ini, { taxaAnualPct: q.taxa, financiar: true })
    if (q.prazo) ini.prazoAnos = q.prazo
    if (q.carencia != null) ini.carenciaMeses = q.carencia
    else if (q.taxa) ini.carenciaMeses = base.taxas.find((t) => Math.abs(t.taxa_aa - q.taxa) < 0.01 && (!q.prazo || t.prazo_anos === q.prazo))?.carencia_meses ?? 0
    if (q.area) ini.areaHa = q.area
    if (q.entrada) ini.entradaPct = q.entrada
    return ini
  })
  const [modeloId, setModeloId] = useState(() => {
    const m = base.modelos.find((x) => x.id === q.modelo)
    return m ? m.id : lerSalvo()?.modeloId || ''
  })
  const [linha, setLinha] = useState(() => q.linha || (q.taxa ? 'Taxa informada' : lerSalvo()?.linha || ''))
  const [cliente, setCliente] = useState(() => (q.cliente && !/^c\d+$|^\d{11,14}$/.test(q.cliente) ? q.cliente : lerSalvo()?.cliente || ''))
  const [ajustes, setAjustes] = useState(false)

  // ?cliente= pode vir com o id da ficha (c7) ou o documento: busca o nome
  useEffect(() => {
    if (!q.cliente || !/^c\d+$|^\d{11,14}$/.test(q.cliente)) return
    let vivo = true
    carregarFicha(q.cliente).then((f) => { if (vivo && f?.cliente) setCliente(f.cliente.nome) }).catch(() => {})
    return () => { vivo = false }
  }, [q.cliente])

  // ?modelo= aplica preço e consumo do modelo
  useEffect(() => {
    const m = base.modelos.find((x) => x.id === q.modelo)
    if (m) setE((x) => ({ ...x, preco: m.preco, rendimentoHaH: m.rendimentoHaH, consumoLH: m.consumoLH }))
  }, [q.modelo, base.modelos])

  useEffect(() => {
    try { localStorage.setItem(CHAVE, JSON.stringify({ e, modeloId, linha, cliente })) } catch { /* sem storage */ }
  }, [e, modeloId, linha, cliente])

  const r = useMemo(() => simular(e), [e])
  const set = (k) => (v) => setE((x) => ({ ...x, [k]: v }))
  const modelo = base.modelos.find((m) => m.id === modeloId)
  const nomeMaquina = modelo?.modelo || 'Máquina nova'
  const np = NOME_PARCELA[e.parcelasPorAno] || NOME_PARCELA[1]

  function escolherModelo(m) {
    setModeloId(m.id)
    setE((x) => ({ ...x, preco: m.preco, rendimentoHaH: m.rendimentoHaH, consumoLH: m.consumoLH }))
  }
  function escolherLinha(t) {
    setLinha(t.nome)
    setE((x) => ({ ...x, financiar: true, taxaAnualPct: t.taxa_aa, prazoAnos: t.prazo_anos, carenciaMeses: t.carencia_meses || 0,
      entradaPct: t.participacao_pct && t.participacao_pct < 100 ? Math.max(x.entradaPct, 100 - t.participacao_pct) : x.entradaPct }))
  }
  function padrao() {
    setE({ ...base.padrao, carenciaMeses: 0 }); setModeloId(''); setLinha(''); setCliente('')
  }

  const textoWhats = montarTexto({ e, r, cliente, nomeMaquina, linha, np })
  const corEconomia = r.economiaAno > 0 ? '#16a34a' : '#dc2626'

  return (
    <div className="grid grid-cols-1 gap-3">
      <ComoLer itens={[
        <><b>Escolha o modelo</b> e a <b>linha de crédito</b>: preço, consumo, taxa, prazo e carência já vêm preenchidos. Ajuste o que o produtor falar.</>,
        <><b>Parcela e total pago</b> saem pelo sistema Price. Na carência ninguém paga; os juros do período entram no saldo e a 1ª parcela vence no fim dela.</>,
        <><b>Economia por ano</b> = quanto ele gasta hoje por hectare (terceirizando ou com a máquina velha) menos o custo da máquina nova (diesel, operador e manutenção), mais o serviço para vizinhos.</>,
        <><b>Se paga em</b>: anos para a economia devolver o investimento. O gráfico mostra o caixa de cada ano (barra) e o acumulado (linha): onde a linha passa do zero, a máquina se pagou.</>,
        <>É uma estimativa. Taxas e condições sempre conferidas com o banco antes de fechar.</>,
      ]} />

      {/* ── 1. máquina ── */}
      <Cartao titulo="Máquina e cliente" icone={Tractor}>
        <div className="grid grid-cols-1 gap-3">
          <label className="grid grid-cols-1 gap-1">
            <span className="text-[12.5px] font-semibold text-slate-600">Produtor</span>
            <span className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:ring-2 focus-within:ring-red-500/40">
              <User size={16} className="text-slate-400 shrink-0" aria-hidden="true" />
              <input value={cliente} onChange={(x) => setCliente(x.target.value)} placeholder="Nome do produtor" className="w-full py-2.5 bg-transparent focus:outline-none text-slate-900" />
            </span>
          </label>
          <div>
            <div className="text-[12.5px] font-semibold text-slate-600 mb-1.5">Modelo Mahindra</div>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1.5 snap-x" style={{ scrollbarWidth: 'none' }}>
              {base.modelos.map((m) => {
                const ativo = m.id === modeloId
                return (
                  <button key={m.id} type="button" onClick={() => escolherModelo(m)}
                    className={`snap-start shrink-0 w-[148px] text-left rounded-2xl p-3 border-2 transition-all ivf-toque ${ativo ? 'border-red-600 bg-red-50' : 'border-slate-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <Tractor size={18} className={ativo ? 'text-red-600' : 'text-slate-400'} aria-hidden="true" />
                      <span className="text-[11px] font-bold text-slate-500">{m.cv} cv</span>
                    </div>
                    <div className="mt-1 text-[13.5px] font-extrabold text-slate-900 leading-tight">{m.modelo.replace('Mahindra ', '')}</div>
                    <div className="text-[13px] font-bold text-red-700 mt-0.5">{compactoR(m.preco)}</div>
                    <div className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{m.uso}</div>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <CampoNumero rotulo="Preço da máquina" prefixo="R$" valor={e.preco} onMuda={set('preco')} />
            <CampoNumero rotulo="Usado na troca" prefixo="R$" valor={e.valorUsado} onMuda={set('valorUsado')} />
          </div>
        </div>
      </Cartao>

      {/* ── 2. financiamento ── */}
      <Cartao titulo="Financiamento" icone={Landmark} atraso={60} extra={<Chave ligado={!!e.financiar} onMuda={set('financiar')} rotulo={e.financiar ? 'Financiar' : 'À vista'} />}>
        <div className={`grid grid-cols-1 gap-3.5 transition-opacity ${e.financiar ? '' : 'opacity-40 pointer-events-none'}`}>
          <div>
            <div className="text-[12.5px] font-semibold text-slate-600 mb-1.5">Linha de crédito (Plano Safra)</div>
            <Chips>
              {base.taxas.map((t) => (
                <Chip key={t.nome} ativo={linha === t.nome} onClick={() => escolherLinha(t)}>
                  {t.nome.split(' — ')[0]} {num(t.taxa_aa, 1)}%
                </Chip>
              ))}
              <Chip ativo={!!linha && !base.taxas.some((t) => t.nome === linha)} onClick={() => setLinha('Outra taxa')}>Outra taxa</Chip>
            </Chips>
            {linha && (
              <div key={linha} className="ivf-troca mt-1.5 text-[12px] text-slate-500 leading-snug">
                {linha}{(() => { const t = base.taxas.find((x) => x.nome === linha); return t ? ` · até ${t.prazo_anos} anos · carência até ${t.carencia_meses} meses · financia até ${t.participacao_pct}%` : '' })()}
              </div>
            )}
          </div>
          <Regua rotulo="Entrada" valor={e.entradaPct} onMuda={set('entradaPct')} min={0} max={90} passo={1} formato={(v) => `${v}%`}
            extra={brl((e.preco * e.entradaPct) / 100)} />
          <div className="grid grid-cols-2 gap-2.5">
            <CampoNumero rotulo="Taxa de juros" sufixo="% a.a." casas={1} valor={e.taxaAnualPct} onMuda={(v) => { set('taxaAnualPct')(v); if (base.taxas.some((t) => t.nome === linha && t.taxa_aa !== v)) setLinha('Outra taxa') }} />
            <Segmentos rotulo="Parcelas" valor={e.parcelasPorAno} onMuda={set('parcelasPorAno')} opcoes={[[1, 'Anual'], [2, 'Sem.'], [12, 'Mensal']]} />
          </div>
          <Regua rotulo="Prazo total" valor={e.prazoAnos} onMuda={set('prazoAnos')} min={1} max={12} formato={(v) => `${v} ${v === 1 ? 'ano' : 'anos'}`} />
          <Regua rotulo="Carência" valor={e.carenciaMeses || 0} onMuda={set('carenciaMeses')} min={0} max={36} formato={(v) => (v ? mesesTxt(v) : 'sem carência')} />
        </div>
      </Cartao>

      {/* ── resultado do financiamento ── */}
      <section className="ivf-entra rounded-2xl text-white p-4 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', boxShadow: '0 10px 24px rgba(220,38,38,.3)', animationDelay: '120ms' }}>
        <Banknote size={64} className="absolute -right-2 -bottom-3 opacity-15" aria-hidden="true" />
        {e.financiar && r.parcela != null ? (
          <>
            <div className="text-[11.5px] font-bold uppercase tracking-wide opacity-90">Parcela {np[0]}</div>
            <div className="text-[34px] font-extrabold leading-tight tabular-nums"><Conta valor={r.parcela} formato={(v) => brl(v)} /></div>
            <div className="text-[13px] opacity-95">
              {r.nParcelas} parcelas {np[1]} · 1ª em {mesesTxt(r.primeiraMes)}{r.carenciaUsada ? ` (carência de ${mesesTxt(r.carenciaUsada)})` : ''}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                ['Entrada', r.entrada, e.valorUsado ? `+ usado ${compactoR(e.valorUsado)}` : 'do bolso'],
                ['Financiado', r.financiado, `${num(e.taxaAnualPct, 1)}% a.a.`],
                ['Total pago', r.totalPago, `juros ${compactoR(r.jurosTotais)}`],
              ].map(([t, v, s]) => (
                <div key={t} className="rounded-xl bg-white/15 px-2.5 py-2 min-w-0">
                  <div className="text-[10.5px] font-bold uppercase opacity-90">{t}</div>
                  <div className="text-[15px] font-extrabold tabular-nums truncate"><Conta valor={v} formato={compactoR} /></div>
                  <div className="text-[10.5px] opacity-90 truncate">{s}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-[11.5px] font-bold uppercase tracking-wide opacity-90">Pagamento à vista</div>
            <div className="text-[34px] font-extrabold leading-tight tabular-nums"><Conta valor={r.investimentoLiquido} formato={(v) => brl(v)} /></div>
            <div className="text-[13px] opacity-95">preço {brl(e.preco)}{e.valorUsado ? ` menos o usado de ${brl(e.valorUsado)}` : ''}</div>
          </>
        )}
      </section>

      {/* ── 3. propriedade ── */}
      <Cartao titulo="Como ele trabalha hoje" icone={Sprout} atraso={160}>
        <div className="grid grid-cols-2 gap-2.5">
          <CampoNumero rotulo="Área trabalhada por ano" sufixo="ha" valor={e.areaHa} onMuda={set('areaHa')} dica="Some as passadas: 300 ha x 2 = 600" />
          <CampoNumero rotulo="Custo atual por hectare" prefixo="R$" sufixo="/ha" valor={e.custoAtualHa} onMuda={set('custoAtualHa')} dica="Terceirizando ou com a máquina velha" />
          <CampoNumero rotulo="Serviço para vizinhos" sufixo="ha/ano" valor={e.haTerceiros} onMuda={set('haTerceiros')} dica="Opcional" />
          <CampoNumero rotulo="Preço cobrado" prefixo="R$" sufixo="/ha" valor={e.precoServicoHa} onMuda={set('precoServicoHa')} />
        </div>
        <button type="button" onClick={() => setAjustes(!ajustes)} className="mt-3 w-full flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-[13px] font-bold text-slate-700">
          Mais ajustes da máquina (diesel, operador, vida útil)
          <ChevronDown size={16} className={`transition-transform ${ajustes ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {ajustes && (
          <div className="ivf-entra grid grid-cols-2 gap-2.5 mt-3">
            <CampoNumero rotulo="Rendimento" sufixo="ha/h" casas={1} valor={e.rendimentoHaH} onMuda={set('rendimentoHaH')} />
            <CampoNumero rotulo="Consumo de diesel" sufixo="L/h" casas={1} valor={e.consumoLH} onMuda={set('consumoLH')} />
            <CampoNumero rotulo="Preço do diesel" prefixo="R$" sufixo="/L" casas={2} valor={e.precoDiesel} onMuda={set('precoDiesel')} />
            <CampoNumero rotulo="Operador" prefixo="R$" sufixo="/h" valor={e.operadorHora} onMuda={set('operadorHora')} dica="0 se é o próprio produtor" />
            <CampoNumero rotulo="Manutenção por ano" sufixo="% preço" casas={1} valor={e.manutencaoPctAno} onMuda={set('manutencaoPctAno')} />
            <CampoNumero rotulo="Vida útil" sufixo="anos" valor={e.vidaUtilAnos} onMuda={set('vidaUtilAnos')} />
            <CampoNumero rotulo="Valor no fim da vida" sufixo="% preço" valor={e.residualPct} onMuda={set('residualPct')} />
          </div>
        )}
      </Cartao>

      {/* ── 4. retorno ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi rotulo="Economia por ano" valor={r.economiaAno} formato={(v) => compactoR(v)} cor={corEconomia} icone={TrendingUp} atraso={200}
          sub={r.receitaTerceirosAno ? `inclui ${compactoR(r.receitaTerceirosAno)} de serviço` : 'diferença de caixa'} />
        <Kpi rotulo="Se paga em" valor={anos(r.paybackAnos)} cor="#0f172a" atraso={240}
          sub={e.financiar ? `com as parcelas: ${r.paybackFinanciado == null ? 'não se paga' : anos(r.paybackFinanciado)}` : 'sem contar juros'} />
        <Kpi rotulo="Custo por hora" valor={r.custoHora == null ? '—' : brl(r.custoHora)} cor="#7c3aed" atraso={280}
          sub={r.horasAno == null ? 'informe o rendimento' : `${num(r.horasAno)} horas por ano`} />
        <Kpi rotulo="Custo por hectare" valor={r.custoNovoHa == null ? '—' : brl(r.custoNovoHa)} cor="#ea580c" atraso={320}
          sub={`hoje ${brl(e.custoAtualHa)}/ha`} />
      </div>
      {e.financiar && r.sobraAnoComParcela != null && (
        <div className={`ivf-entra rounded-2xl border px-3.5 py-3 text-[13.5px] leading-snug ${r.sobraAnoComParcela >= 0 ? 'bg-green-50 border-green-200 text-green-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
          {r.sobraAnoComParcela >= 0
            ? <>A economia paga a parcela e ainda <b>sobram {brl(r.sobraAnoComParcela)}</b> por ano.</>
            : <>A economia não cobre a parcela: <b>faltam {brl(-r.sobraAnoComParcela)}</b> por ano. Tente mais prazo, mais entrada ou serviço para vizinhos.</>}
        </div>
      )}
      {r.economiaAno <= 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-[13.5px] text-red-900 leading-snug">
          Com esses números a máquina custa mais por ano do que o jeito atual. Revise a área, o custo de hoje ou o serviço para terceiros.
        </div>
      )}

      <Cartao titulo="Caixa ano a ano" icone={TrendingUp} atraso={360} corpo="px-2 pt-2 pb-3">
        <div className="flex gap-3 px-2 pb-1 text-[11.5px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-600" /> caixa do ano</span>
          <span className="inline-flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-900" /> acumulado</span>
        </div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={[{ ano: 0, caixa: -r.entrada, acumulado: -r.entrada }, ...r.fluxo]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => compacto(v).replace(" ", "")} tick={{ fontSize: 10.5, fill: '#64748b' }} axisLine={false} tickLine={false} width={46} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Tooltip formatter={(v, n) => [brl(v), n === 'caixa' ? 'Caixa do ano' : 'Acumulado']} labelFormatter={(a) => (a === 0 ? 'Entrada' : `Ano ${a}`)} />
              <Bar dataKey="caixa" radius={[5, 5, 0, 0]} animationDuration={800}>
                {[{ caixa: -r.entrada }, ...r.fluxo].map((f, i) => <Cell key={i} fill={f.caixa >= 0 ? '#16a34a' : '#dc2626'} fillOpacity={0.75} />)}
              </Bar>
              <Line dataKey="acumulado" type="monotone" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 2.5 }} animationDuration={1000} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="mx-2 mt-2 rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-[12.5px] tabular-nums">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="text-left px-2 py-1.5">Ano</th><th className="text-right px-2 py-1.5">Parcelas</th><th className="text-right px-2 py-1.5">Caixa</th><th className="text-right px-2 py-1.5">Acumulado</th></tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-100"><td className="px-2 py-1.5 text-slate-500">0</td><td className="px-2 py-1.5 text-right text-slate-500">entrada</td><td className="px-2 py-1.5 text-right">{compactoR(-r.entrada)}</td><td className="px-2 py-1.5 text-right font-bold text-red-700">{compactoR(-r.entrada)}</td></tr>
              {r.fluxo.map((a) => (
                <tr key={a.ano} className="border-t border-slate-100">
                  <td className="px-2 py-1.5">{a.ano}{a.residual ? <Selo cor="#7c3aed">venda</Selo> : null}</td>
                  <td className="px-2 py-1.5 text-right text-slate-600">{a.parcela ? compactoR(-a.parcela) : '—'}</td>
                  <td className="px-2 py-1.5 text-right">{compactoR(a.caixa)}</td>
                  <td className={`px-2 py-1.5 text-right font-bold ${a.acumulado >= 0 ? 'text-green-700' : 'text-red-700'}`}>{compactoR(a.acumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mx-2 mt-2 text-[11.5px] text-slate-500 leading-snug">
          No último ano da vida útil entra a venda da máquina ({e.residualPct}% do preço). Estimativa com os números informados; taxas e condições devem ser confirmadas com o banco.
        </p>
      </Cartao>

      {/* ── ações ── */}
      <div className="grid grid-cols-2 gap-2.5">
        <a href={`https://wa.me/?text=${encodeURIComponent(textoWhats)}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white text-[14px]" style={{ background: '#16a34a' }}>
          <MessageCircle size={18} aria-hidden="true" /> Enviar no WhatsApp
        </a>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-bold text-white text-[14px] bg-slate-900">
          <Printer size={18} aria-hidden="true" /> Imprimir
        </button>
      </div>
      <button type="button" onClick={padrao} className="inline-flex items-center justify-center gap-1.5 text-[13px] font-semibold text-slate-500 py-1">
        <RotateCcw size={14} aria-hidden="true" /> Voltar aos valores padrão
      </button>

      <FolhaImpressao e={e} r={r} cliente={cliente} maquina={nomeMaquina} linha={linha} np={np} />
    </div>
  )
}

const compactoR = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${v < 0 ? '-' : ''}R$ ${compacto(Math.abs(v))}`)

function montarTexto({ e, r, cliente, nomeMaquina, linha, np }) {
  const L = ['*Simulação Nova Tratores*']
  if (cliente) L.push(`Produtor: ${cliente}`)
  L.push(`Máquina: ${nomeMaquina}`, `Preço: ${brl(e.preco)}`)
  if (e.valorUsado) L.push(`Usado na troca: ${brl(e.valorUsado)}`)
  if (e.financiar && r.parcela != null) {
    L.push(`Entrada: ${brl(r.entrada)}`, `Financiado: ${brl(r.financiado)}${linha ? ` (${linha})` : ''}`,
      `Taxa: ${num(e.taxaAnualPct, 1)}% ao ano · prazo ${e.prazoAnos} anos${r.carenciaUsada ? ` · carência ${mesesTxt(r.carenciaUsada)}` : ''}`,
      `*${r.nParcelas} parcelas ${np[1]} de ${brl(r.parcela)}*`, `Total pago: ${brl(r.totalPago)}`)
  } else L.push(`À vista: ${brl(r.investimentoLiquido)}`)
  L.push('', `Área: ${num(e.areaHa)} ha/ano · custo hoje ${brl(e.custoAtualHa)}/ha`, `Custo com a máquina nova: ${brl(r.custoNovoHa)}/ha`,
    `Economia estimada: ${brl(r.economiaAno)} por ano`, `Se paga em: ${anos(r.paybackAnos)}`,
    '', '_Estimativa. Taxas e condições sujeitas à aprovação do banco._')
  return L.join('\n')
}

/** Folha limpa para imprimir (só aparece na impressão: #relatorio-print do index.css). */
function FolhaImpressao({ e, r, cliente, maquina, linha, np }) {
  const hoje = new Date().toLocaleDateString('pt-BR')
  const L = (rot, val) => <tr><td style={{ padding: '4px 0', color: '#475569' }}>{rot}</td><td style={{ padding: '4px 0', textAlign: 'right', fontWeight: 700 }}>{val}</td></tr>
  return createPortal(
    <div id="relatorio-print">
      <div style={{ borderBottom: '3px solid #dc2626', paddingBottom: 8, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '1.7em', fontWeight: 800 }}>Nova Tratores</div>
          <div style={{ fontSize: '1.15em', fontWeight: 600, color: '#334155' }}>Estudo de viabilidade{cliente ? ` · ${cliente}` : ''}</div>
        </div>
        <div style={{ fontSize: '0.9em', color: '#64748b' }}>{hoje}</div>
      </div>
      <div style={{ fontSize: '1.3em', fontWeight: 800, marginBottom: 10 }}>{maquina}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="rel-evitar-quebra">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td colSpan={2} style={{ fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>Condições</td></tr>
          {L('Preço', brl(e.preco))}
          {e.valorUsado ? L('Usado na troca', brl(e.valorUsado)) : null}
          {e.financiar && r.parcela != null ? <>
            {L('Entrada', brl(r.entrada))}
            {L('Financiado', brl(r.financiado))}
            {linha ? L('Linha', linha) : null}
            {L('Taxa', `${num(e.taxaAnualPct, 1)}% ao ano`)}
            {L('Prazo', `${e.prazoAnos} anos${r.carenciaUsada ? `, carência ${mesesTxt(r.carenciaUsada)}` : ''}`)}
            {L(`Parcela ${np[0]}`, `${r.nParcelas} x ${brl(r.parcela)}`)}
            {L('Total pago', brl(r.totalPago))}
          </> : L('À vista', brl(r.investimentoLiquido))}
        </tbody></table>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody>
          <tr><td colSpan={2} style={{ fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: 4 }}>Retorno</td></tr>
          {L('Área trabalhada', `${num(e.areaHa)} ha/ano`)}
          {L('Custo hoje', `${brl(e.custoAtualHa)}/ha`)}
          {L('Custo com a máquina nova', `${brl(r.custoNovoHa)}/ha`)}
          {L('Custo por hora', brl(r.custoHora))}
          {r.receitaTerceirosAno ? L('Serviço para vizinhos', `${brl(r.receitaTerceirosAno)}/ano`) : null}
          {L('Economia por ano', brl(r.economiaAno))}
          {L('Se paga em', anos(r.paybackAnos))}
          {e.financiar && r.sobraAnoComParcela != null ? L('Sobra por ano após a parcela', brl(r.sobraAnoComParcela)) : null}
        </tbody></table>
      </div>
      <div style={{ fontWeight: 800, margin: '16px 0 6px' }}>Caixa ano a ano</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95em' }} className="rel-evitar-quebra">
        <thead><tr style={{ background: '#f1f5f9' }}>{['Ano', 'Economia', 'Parcelas', 'Caixa do ano', 'Acumulado'].map((h) => <th key={h} style={{ padding: 5, textAlign: h === 'Ano' ? 'left' : 'right' }}>{h}</th>)}</tr></thead>
        <tbody>
          <tr><td style={{ padding: 5, borderBottom: '1px solid #e2e8f0' }}>0</td><td colSpan={3} style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>entrada</td><td style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{brl(-r.entrada)}</td></tr>
          {r.fluxo.map((a) => (
            <tr key={a.ano}>
              <td style={{ padding: 5, borderBottom: '1px solid #e2e8f0' }}>{a.ano}</td>
              <td style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{brl(a.economia)}</td>
              <td style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{a.parcela ? brl(-a.parcela) : '—'}</td>
              <td style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>{brl(a.caixa)}</td>
              <td style={{ padding: 5, textAlign: 'right', borderBottom: '1px solid #e2e8f0', fontWeight: 700 }}>{brl(a.acumulado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.85em', color: '#64748b', marginTop: 12 }}>
        Estimativa feita com os números informados pelo produtor. No último ano da vida útil ({e.vidaUtilAnos} anos) entra a venda da máquina ({e.residualPct}% do preço).
        Taxas, prazos e condições de financiamento estão sujeitos à aprovação do banco.
      </p>
    </div>,
    document.body,
  )
}
