// =============================================================================
// /inteligencia/retorno — "Sem retorno": tudo que está esperando um retorno nosso
// (propostas do Portal, negócios do CRM e retornos combinados nas visitas).
// Port de Retorno.tsx + lib/inteligencia-vendas/retorno.ts do Portal, no celular:
// filtro de dias e de motivo, gravidade com cor, agrupado por vendedor e um
// "o que fazer" em cada cartão com atalho para a ficha.
// =============================================================================
import { useMemo, useState } from 'react'
import { ArrowRight, CalendarClock, ChevronRight, FileText, Hourglass, Lightbulb, MapPin, Users } from 'lucide-react'
import { CabecalhoIV, CarregandoIV, ErroIV, useAbrirCliente, useDados } from '../../components/iv/kit'
import { carregarOportunidades, carregarRetorno, ROTULO_MOTIVO } from '../../lib/iv/fonte'
import { BotoesContato, brl, Chip, ComoLer, Conta, dataBR, EstilosIV, reais, Rolagem, Rotulo, Selo, Vazio } from '../../components/iv/oport/comum'
import { COR_MOTIVO } from '../../components/iv/oport/FichaAbas'

const ORIGEM = {
  proposta: { rotulo: 'Proposta', cor: '#DC2626', icone: FileText },
  negocio: { rotulo: 'CRM · negócio', cor: '#2563EB', icone: Users },
  visita: { rotulo: 'CRM · visita', cor: '#7C3AED', icone: MapPin },
}
const GRAVIDADE = { 3: { rotulo: 'Urgente', cor: '#DC2626' }, 2: { rotulo: 'Atenção', cor: '#F59E0B' }, 1: { rotulo: 'Baixa', cor: '#94A3B8' } }
const O_QUE_FAZER = {
  contato_vencido: 'Ligue hoje: o contato combinado já passou. No fim, marque a data do próximo.',
  validade: 'A validade está acabando: ligue para fechar ou renove a proposta antes de vencer.',
  parada: 'Descubra o que trava (preço, banco, prazo) e avance a fase, ou registre o motivo da perda.',
  sem_proximo: 'Marque a data do próximo contato para o negócio não esfriar.',
  retorno_visita: 'Faça o retorno combinado na visita: uma ligação ou uma nova visita.',
}
const DIAS = [7, 15, 30, 60]
const AJUDA = [
  'Aqui aparece tudo que está esperando um retorno nosso: propostas abertas, negócios do CRM e retornos combinados nas visitas.',
  '"Parada há mais de" muda o corte: com 15 dias, entra o que está há mais de 15 dias na mesma fase.',
  'A cor diz a urgência: vermelho = urgente (contato vencido, validade acabando ou parada há mais de 45 dias), amarelo = atenção, cinza = baixa.',
  'Toque num motivo para filtrar. "Por vendedor" junta a fila de cada um, para a cobrança na reunião.',
  'Cada cartão diz o que fazer; toque nele para abrir a ficha 360 do cliente.',
]

async function carregarTudo(dias) {
  const [r, base] = await Promise.all([carregarRetorno({ dias }), carregarOportunidades()])
  const porNome = new Map(base.clientes.map((c) => [c.nome, c]))
  return { ...r, itens: r.itens.map((i) => { const c = porNome.get(i.cliente); return { ...i, clienteId: c?.id || c?.chave || null, telefone: c?.telefone || null } }) }
}

function CartaoRetorno({ i, onFicha, atraso }) {
  const g = GRAVIDADE[i.gravidade] || GRAVIDADE[1]
  const o = ORIGEM[i.origem] || ORIGEM.proposta
  return (
    <article className="iv-entra rounded-2xl border border-slate-200 bg-[#fefefe] p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]" style={{ animationDelay: `${atraso}ms` }}>
      <button type="button" disabled={!i.clienteId} onClick={() => onFicha(i.clienteId)} className="w-full text-left iv-toque">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Selo cor={g.cor} cheio>{g.rotulo}</Selo>
          <Selo cor={o.cor}><o.icone size={11} aria-hidden="true" /> {o.rotulo}</Selo>
          {i.dias != null && <span className="ml-auto text-[12px] font-bold text-slate-500 tabular-nums">{i.dias}{i.idadeIncerta ? '+' : ''} dias</span>}
        </div>
        <div className="flex items-start gap-2 mt-2">
          <div className="min-w-0 flex-1">
            <b className="block text-[15.5px] text-slate-900 leading-tight">{i.cliente || '—'}</b>
            <span className="block text-[12.5px] text-slate-500 mt-0.5">{[i.cidade, i.vendedor || 'Sem vendedor'].filter(Boolean).join(' · ')}</span>
          </div>
          {i.valor > 0 && <b className="text-[16px] text-slate-900 whitespace-nowrap">{reais(i.valor)}</b>}
          {i.clienteId && <ChevronRight size={18} className="text-slate-300 mt-0.5 -mr-1" aria-hidden="true" />}
        </div>
        {i.oque && <div className="text-[13.5px] font-semibold text-slate-800 mt-1.5 leading-snug">{i.oque}</div>}
        <div className="text-[12px] text-slate-500 mt-0.5">Fase: {i.fase}{i.proximoContato ? ` · próx. contato ${dataBR(i.proximoContato)}` : ''}</div>
      </button>
      <div className="mt-2.5 rounded-xl px-3 py-2" style={{ background: `${COR_MOTIVO[i.motivo]}0f`, border: `1px solid ${COR_MOTIVO[i.motivo]}30` }}>
        <div className="text-[12.5px] font-bold leading-snug" style={{ color: COR_MOTIVO[i.motivo] }}>{ROTULO_MOTIVO[i.motivo]}</div>
        <div className="text-[12.5px] text-slate-600 leading-snug">{i.detalhe}</div>
      </div>
      <div className="mt-2 flex gap-2 items-start text-[13px] text-slate-800 leading-snug">
        <Lightbulb size={15} className="mt-[2px] text-amber-500 shrink-0" aria-hidden="true" />
        <span><b>O que fazer:</b> {O_QUE_FAZER[i.motivo]}</span>
      </div>
      {i.telefone && <BotoesContato telefone={i.telefone} className="mt-3" texto="Olá! Aqui é da Nova Tratores, passando para dar o retorno combinado." />}
    </article>
  )
}

export default function Retorno() {
  const [dias, setDias] = useState(15)
  const { dados, carregando, erro, recarregar } = useDados(() => carregarTudo(dias), [dias])
  const abrir = useAbrirCliente()
  const [motivo, setMotivo] = useState('')
  const [origem, setOrigem] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [agrupar, setAgrupar] = useState(true)

  const todos = dados?.itens || []
  const itens = useMemo(() => todos.filter((i) => (!motivo || i.motivo === motivo) && (!origem || i.origem === origem) && (!vendedor || (i.vendedor || 'Sem vendedor') === vendedor)), [todos, motivo, origem, vendedor])
  const grupos = useMemo(() => {
    const m = new Map()
    for (const i of itens) { const k = i.vendedor || 'Sem vendedor'; if (!m.has(k)) m.set(k, []); m.get(k).push(i) }
    return [...m.entries()].map(([v, l]) => ({ vendedor: v, itens: l, urgentes: l.filter((x) => x.gravidade === 3).length, valor: l.reduce((s, x) => s + x.valor, 0) }))
      .sort((a, b) => b.urgentes - a.urgentes || b.valor - a.valor)
  }, [itens])

  const total = todos.reduce((s, i) => s + i.valor, 0)
  const urgentes = todos.filter((i) => i.gravidade === 3).length
  const conta = (m) => todos.filter((i) => i.motivo === m).length
  const contaO = (o) => todos.filter((i) => i.origem === o).length

  return (
    <div>
      <EstilosIV />
      <CabecalhoIV titulo="Sem retorno" subtitulo="Propostas, negócios e visitas esperando um retorno nosso" direita={<ComoLer itens={AJUDA} />} />

      {/* corte de dias */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[12.5px] text-slate-600 font-semibold whitespace-nowrap">Parada há mais de</span>
        <div className="flex-1 flex p-1 rounded-2xl bg-slate-100 gap-0.5">
          {DIAS.map((d) => (
            <button key={d} type="button" onClick={() => setDias(d)} aria-pressed={dias === d}
              className="flex-1 h-8 rounded-xl text-[13px] font-bold transition"
              style={dias === d ? { background: '#fefefe', color: '#0f172a', boxShadow: '0 2px 6px rgba(15,23,42,.10)' } : { color: '#64748b' }}>{d} dias</button>
          ))}
        </div>
      </div>

      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {carregando && !dados && <CarregandoIV />}
      {dados && (
        <div style={{ opacity: carregando ? 0.55 : 1, transition: 'opacity .2s' }}>
          <section className="iv-entra relative overflow-hidden rounded-3xl p-4 text-white iv-brilho" style={{ background: 'linear-gradient(135deg, #ef4444, #991b1b)', boxShadow: '0 12px 28px rgba(153,27,27,.3)' }}>
            <Hourglass size={96} className="absolute -right-3 -bottom-3 opacity-15 iv-flutua" aria-hidden="true" />
            <div className="relative grid grid-cols-3 gap-2">
              <div><div className="text-[11px] font-bold uppercase tracking-wider opacity-90">Na fila</div><div className="text-[34px] font-extrabold leading-none tabular-nums mt-1"><Conta valor={todos.length} /></div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-wider opacity-90">Urgentes</div><div className="text-[34px] font-extrabold leading-none tabular-nums mt-1"><Conta valor={urgentes} /></div></div>
              <div><div className="text-[11px] font-bold uppercase tracking-wider opacity-90">Valor parado</div><div className="text-[20px] font-extrabold leading-tight tabular-nums mt-1.5"><Conta valor={total} formato={reais} /></div></div>
            </div>
            <div className="relative flex h-2.5 rounded-full overflow-hidden mt-3 bg-white/20 gap-[2px]">
              {[3, 2, 1].map((g, k) => {
                const n = todos.filter((i) => i.gravidade === g).length
                return <span key={g} className="iv-barra block h-full" style={{ width: `${(n / Math.max(1, todos.length)) * 100}%`, background: k === 0 ? '#fefefe' : k === 1 ? '#fcd34d' : 'rgba(255,255,255,.45)', animationDelay: `${200 + k * 120}ms` }} />
              })}
            </div>
            <div className="relative text-[11.5px] opacity-90 mt-1.5">branco = urgente · amarelo = atenção · claro = baixa</div>
          </section>

          {/* motivos */}
          <Rotulo className="mt-4 mb-2">Por que está aqui</Rotulo>
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(ROTULO_MOTIVO).map((m, k) => {
              const n = conta(m), on = motivo === m, cor = COR_MOTIVO[m]
              return (
                <button key={m} type="button" onClick={() => setMotivo(on ? '' : m)} disabled={!n}
                  className="iv-entra iv-toque text-left rounded-2xl p-3 transition disabled:opacity-40"
                  style={{ animationDelay: `${k * 50}ms`, ...(on ? { background: cor, color: '#fefefe', border: `1px solid ${cor}`, boxShadow: `0 6px 16px ${cor}40` } : { background: '#fefefe', border: '1px solid #e2e8f0' }) }}>
                  <div className="text-[24px] font-extrabold leading-none tabular-nums" style={{ color: on ? '#fefefe' : cor }}><Conta valor={n} /></div>
                  <div className={`text-[12.5px] font-bold leading-tight mt-1 ${on ? '' : 'text-slate-700'}`}>{ROTULO_MOTIVO[m]}</div>
                </button>
              )
            })}
          </div>

          <Rotulo className="mt-4 mb-2">Origem</Rotulo>
          <Rolagem>
            <Chip ativo={!origem} onClick={() => setOrigem('')} contagem={todos.length}>Todas</Chip>
            {Object.entries(ORIGEM).map(([k, o]) => (
              <Chip key={k} ativo={origem === k} cor={o.cor} onClick={() => setOrigem(origem === k ? '' : k)} contagem={contaO(k)}><o.icone size={14} aria-hidden="true" /> {o.rotulo}</Chip>
            ))}
          </Rolagem>

          {/* por vendedor */}
          <div className="flex items-center justify-between mt-4 mb-2">
            <Rotulo>Por vendedor</Rotulo>
            <label className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-slate-600">
              Agrupar
              <button type="button" role="switch" aria-checked={agrupar} onClick={() => setAgrupar(!agrupar)}
                className="relative w-10 h-6 rounded-full transition" style={{ background: agrupar ? '#dc2626' : '#cbd5e1' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: agrupar ? 18 : 2 }} />
              </button>
            </label>
          </div>
          <Rolagem>
            {dados.porVendedor.map((v) => {
              const on = vendedor === v.vendedor
              return (
                <button key={v.vendedor} type="button" onClick={() => setVendedor(on ? '' : v.vendedor)}
                  className="shrink-0 text-left rounded-2xl px-3 py-2 transition iv-toque min-w-[150px]"
                  style={on ? { background: '#0f172a', color: '#fefefe', border: '1px solid #0f172a' } : { background: '#fefefe', border: '1px solid #e2e8f0' }}>
                  <b className={`block text-[13px] truncate ${on ? '' : 'text-slate-900'}`}>{v.vendedor}</b>
                  <span className={`text-[11.5px] ${on ? 'opacity-90' : 'text-slate-500'}`}>{v.itens} itens · <b style={{ color: on ? '#fca5a5' : '#dc2626' }}>{v.urgentes} urg.</b> · {reais(v.valor)}</span>
                </button>
              )
            })}
          </Rolagem>

          <div className="flex items-center justify-between mt-4 mb-2 text-[13px] text-slate-600">
            <span><b className="text-slate-900">{itens.length}</b> {itens.length === 1 ? 'item' : 'itens'} · {brl(itens.reduce((s, i) => s + i.valor, 0))}</span>
            {(motivo || origem || vendedor) && <button type="button" onClick={() => { setMotivo(''); setOrigem(''); setVendedor('') }} className="text-red-700 font-semibold underline">limpar filtros</button>}
          </div>

          {itens.length === 0 ? <Vazio icone={CalendarClock}>Nada esperando retorno com esse filtro.</Vazio> : agrupar ? (
            <div className="space-y-5">
              {grupos.map((g, gi) => (
                <section key={g.vendedor}>
                  <div className="iv-entra flex items-center gap-2.5 mb-2" style={{ animationDelay: `${gi * 60}ms` }}>
                    <span className="w-9 h-9 rounded-xl grid place-items-center text-[13px] font-extrabold text-red-700 bg-red-50 border border-red-100">
                      {g.vendedor.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block text-[14.5px] text-slate-900 truncate">{g.vendedor}</b>
                      <span className="text-[12px] text-slate-500">{g.itens.length} itens · <b className="text-red-600">{g.urgentes} urgentes</b> · {reais(g.valor)}</span>
                    </div>
                  </div>
                  <div className="space-y-2.5">{g.itens.map((i, k) => <CartaoRetorno key={`${i.origem}-${i.id}`} i={i} onFicha={abrir} atraso={Math.min(k, 6) * 50} />)}</div>
                </section>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">{itens.map((i, k) => <CartaoRetorno key={`${i.origem}-${i.id}`} i={i} onFicha={abrir} atraso={Math.min(k, 8) * 45} />)}</div>
          )}
          <p className="text-[11.5px] text-slate-400 mt-4 flex items-center gap-1"><ArrowRight size={12} aria-hidden="true" /> Mesma fila do Portal: Formulário de propostas, negócios e visitas do CRM.</p>
        </div>
      )}
    </div>
  )
}
