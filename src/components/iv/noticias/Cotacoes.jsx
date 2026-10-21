// Cotações: faixa rolando (como no Portal) + cartões dos indicadores com contador animado.
import { ArrowDown, ArrowUp, ChartColumn, ExternalLink, Minus } from 'lucide-react'
import { TEND, useConta } from './util'
import { Bloco } from './Pecas'

const fmtReal = (n) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtPct = (n) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`

function Variacao({ v, tend, tam = 12 }) {
  if (v == null || v === 0) return null
  const cor = tend === 'boa' ? '#15803d' : tend === 'ruim' ? '#b91c1c' : v > 0 ? '#16a34a' : '#dc2626'
  const I = v > 0 ? ArrowUp : ArrowDown
  return (
    <span className="inline-flex items-center gap-0.5 font-extrabold tabular-nums" style={{ color: cor, fontSize: tam }}>
      <I size={tam} strokeWidth={3} aria-hidden="true" /> {Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
    </span>
  )
}

/** Faixa preta "COTAÇÕES" rolando sozinha; segurar o dedo pausa. */
export function FaixaCotacoes({ ind, focus }) {
  const itens = [
    ...ind.map((i) => ({ k: i.id, nome: i.nome, valor: i.texto, var: i.variacaoPct, tend: i.tendencia, url: i.fonte_url })),
    ...focus.filter((f) => f.anterior != null).map((f) => ({
      k: `f-${f.indicador}-${f.ano}`, nome: `Focus ${f.indicador === 'Câmbio' ? 'dólar' : f.indicador} ${f.ano}`,
      valor: f.indicador === 'Câmbio' ? fmtReal(f.mediana) : fmtPct(f.mediana),
      var: f.anterior ? ((f.mediana - f.anterior) / f.anterior) * 100 : null, tend: 'neutra', url: 'https://www.bcb.gov.br/publicacoes/focus',
    })),
  ]
  if (!itens.length) return null
  const um = (dup) => itens.map((i) => (
    <a key={`${dup}${i.k}`} href={i.url} target="_blank" rel="noreferrer" tabIndex={dup ? -1 : 0} aria-hidden={dup || undefined}
      className="flex items-baseline gap-1.5 px-3.5 py-2 border-r border-slate-200 text-[13px] text-slate-900 whitespace-nowrap no-underline">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{i.nome}</span>
      <b>{i.valor}</b>
      <Variacao v={i.var} />
    </a>
  ))
  return (
    <div className="ntv-sobe flex items-stretch rounded-xl overflow-hidden bg-white border border-slate-200">
      <span className="flex items-center gap-1.5 px-2.5 bg-[#111111] text-[#fefefe] text-[10.5px] font-black tracking-widest shrink-0">
        <i className="ntv-ao-vivo block w-2 h-2 rounded-full bg-red-500" /> COTAÇÕES
      </span>
      <div className="ntv-rolo">
        <div className="ntv-trilho" style={{ animationDuration: `${Math.max(30, itens.length * 5)}s` }}>{um('')}{um('d')}</div>
      </div>
    </div>
  )
}

function CartaoIndicador({ i, k }) {
  const t = TEND[i.tendencia] || TEND.neutra
  const v = useConta(Number(i.valor) || 0, 1000)
  const real = i.texto.startsWith('R$')
  const sufixo = real ? (i.texto.match(/\/\S+$/) || [''])[0] : (i.texto.split('%')[1] || '')
  const texto = !Number.isFinite(Number(i.valor)) ? i.texto
    : real ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  const I = i.variacaoPct == null || i.variacaoPct === 0 ? Minus : i.variacaoPct > 0 ? ArrowUp : ArrowDown
  return (
    <a href={i.fonte_url} target="_blank" rel="noreferrer"
      className="ntv-sobe ntv-toque block rounded-xl border border-slate-200 bg-white p-3 no-underline min-w-0"
      style={{ animationDelay: `${k * 45}ms` }} title={`${i.referencia} · ${i.fonte_nome}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 truncate flex-1">{i.nome}</span>
        <span className="w-5 h-5 rounded-full grid place-items-center shrink-0" style={{ background: t.fundo, color: t.cor }}>
          <I size={12} strokeWidth={3} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-1 text-[19px] font-black text-slate-900 tabular-nums leading-tight tracking-tight">
        {texto}<small className="text-[11px] font-semibold text-slate-500">{sufixo}</small>
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
        {i.variacaoPct != null && i.variacaoPct !== 0 ? <Variacao v={i.variacaoPct} tend={i.tendencia} tam={11} /> : <span className="text-[11px] font-bold text-slate-400">estável</span>}
        <span className="text-[10.5px] text-slate-400 truncate">{i.referencia}</span>
      </div>
    </a>
  )
}

/** Grade 2 x N dos indicadores do dia. */
export function Indicadores({ ind, atraso = 0 }) {
  if (!ind.length) return null
  return (
    <Bloco titulo="Indicadores do dia" icone={ChartColumn} atraso={atraso}
      direita={<span className="normal-case tracking-normal font-semibold text-[11px] text-slate-400 inline-flex items-center gap-1">toque abre a fonte <ExternalLink size={11} aria-hidden="true" /></span>}>
      <div className="grid grid-cols-2 gap-2">
        {ind.map((i, k) => <CartaoIndicador key={i.id} i={i} k={k} />)}
      </div>
      <p className="text-[11px] text-slate-400 mt-2.5 leading-snug">
        Verde: bom para quem vende. Vermelho: pede atenção. Dólar e Selic do Banco Central; preços da CONAB, semanais.
      </p>
    </Bloco>
  )
}
