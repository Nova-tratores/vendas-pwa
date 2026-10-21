// =============================================================================
// /inteligencia/indicacoes — cliente satisfeito indica (espelho de Indicacoes.tsx).
// Quem indicou, quem foi indicado (com autorização), máquina de interesse,
// vendedor, prazo para ligar e situação até ganhar/perder. No modo de exemplo a
// nova indicação e a troca de situação ficam só no estado da tela.
// Aceita ?indicante=&doc= (vindo da ficha do cliente) para abrir o formulário.
// =============================================================================
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarClock, ChevronRight, Gift, Handshake, Plus, ShieldAlert, Tractor, Trophy, UserRound } from 'lucide-react'
import { carregarIndicacoes, hojeISO, VENDEDOR_LOGADO } from '../../lib/iv/fonte'
import { CabecalhoIV, CarregandoIV, ErroIV, useAbrirCliente, useDados } from '../../components/iv/kit'
import {
  AvisoLocal, Barra, BotoesContato, Campo, Cartao, Chip, Chips, ComoLer, dataBR, estiloCampo, EstilosIVF, Folha, fmtFone, Kpi, pct, Selo, Texto, Vazio,
} from '../../components/iv/ferramentas/kit'
import { somarDias } from '../../components/iv/ferramentas/periodos'

const STATUS = {
  nova: { rotulo: 'Nova', cor: '#dc2626' }, contatada: { rotulo: 'Contatada', cor: '#2563eb' },
  proposta: { rotulo: 'Proposta', cor: '#ca8a04' }, ganha: { rotulo: 'Ganha', cor: '#16a34a' }, perdida: { rotulo: 'Perdida', cor: '#64748b' },
}
const atrasada = (i, hoje) => i.status === 'nova' && !!i.prazo_contato && i.prazo_contato < hoje

export default function Indicacoes() {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarIndicacoes(), [])
  return (
    <div>
      <EstilosIVF />
      <CabecalhoIV titulo="Indicações" subtitulo="Clientes satisfeitos indicando novos contatos" />
      <ComoLer itens={[
        <><b>Cada cartão</b> é um contato que um cliente nosso indicou: quem indicou, quem foi indicado, a máquina de interesse e até quando ligar.</>,
        <><b>Prazo vencido</b> = indicação ainda "nova" com a data de ligar já passada. É a primeira coisa a resolver.</>,
        <><b>Só procure quem autorizou</b>: o selo amarelo avisa quando a autorização não foi registrada.</>,
        <><b>Conversão</b> = ganhas dividido por fechadas (ganhas + perdidas). Toque em quem indicou para abrir a ficha do cliente.</>,
      ]} />
      {carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {dados && <Lista dados={dados} />}
    </div>
  )
}

function Lista({ dados }) {
  const hoje = hojeISO()
  const [sp] = useSearchParams()
  const abrirCliente = useAbrirCliente()
  const [todas, setTodas] = useState(dados.indicacoes)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState(null)
  const [aberta, setAberta] = useState(null)

  useEffect(() => {
    const ind = sp.get('indicante')
    if (ind) setForm(novoForm({ indicante_nome: ind, indicante_doc: sp.get('doc') || '' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  function novoForm(extra = {}) {
    return { prazo_contato: somarDias(hoje, 3), autorizado: false, vendedor_id: String(VENDEDOR_LOGADO.id), status: 'nova', ...extra }
  }

  const lista = useMemo(() => todas
    .filter((i) => !filtro || (filtro === 'atrasada' ? atrasada(i, hoje) : i.status === filtro))
    .sort((a, b) => Number(atrasada(b, hoje)) - Number(atrasada(a, hoje)) || String(b.criado_em).localeCompare(String(a.criado_em))), [todas, filtro, hoje])
  const ganhas = todas.filter((i) => i.status === 'ganha').length
  const fechadas = ganhas + todas.filter((i) => i.status === 'perdida').length
  const vencidas = todas.filter((i) => atrasada(i, hoje)).length
  const abertas = todas.filter((i) => !['ganha', 'perdida'].includes(i.status)).length

  const ranking = useMemo(() => {
    const m = new Map()
    for (const i of todas) {
      const r = m.get(i.indicante_nome) || { nome: i.indicante_nome, doc: i.indicante_doc, total: 0, ganhas: 0 }
      r.total++; if (i.status === 'ganha') r.ganhas++
      m.set(i.indicante_nome, r)
    }
    return [...m.values()].sort((a, b) => b.total - a.total || b.ganhas - a.ganhas).slice(0, 5)
  }, [todas])

  function salvar() {
    if (!form.indicante_nome?.trim() || !form.indicado_nome?.trim()) return
    const v = dados.vendedores.find((x) => x.id === Number(form.vendedor_id))
    const agora = new Date().toISOString()
    if (form.id) {
      setTodas((t) => t.map((i) => (i.id === form.id ? { ...i, ...form, vendedor_id: v?.id ?? null, vendedor_nome: v?.nome ?? null, atualizado_em: agora } : i)))
    } else {
      setTodas((t) => [{ ...form, id: Date.now(), criado_em: agora, atualizado_em: agora, criado_por: VENDEDOR_LOGADO.nome, vendedor_id: v?.id ?? null, vendedor_nome: v?.nome ?? null,
        beneficio_entregue: !!form.beneficio_entregue, local: true }, ...t])
    }
    setForm(null)
  }
  function mudarStatus(i, status) {
    setTodas((t) => t.map((x) => (x.id === i.id ? { ...x, status, contatado_em: x.contatado_em || (status !== 'nova' ? new Date().toISOString() : null) } : x)))
    setAberta((a) => (a && a.id === i.id ? { ...a, status } : a))
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi rotulo="Em aberto" valor={abertas} cor="#0f172a" icone={Handshake} sub={`${todas.length} no total`} ativo={!filtro} onClick={() => setFiltro('')} />
        <Kpi rotulo="Prazo vencido" valor={vencidas} cor="#b91c1c" icone={CalendarClock} atraso={60} sub="ninguém ligou ainda"
          ativo={filtro === 'atrasada'} onClick={() => setFiltro(filtro === 'atrasada' ? '' : 'atrasada')} />
        <Kpi rotulo="Ganhas" valor={ganhas} cor="#16a34a" icone={Trophy} atraso={120} ativo={filtro === 'ganha'} onClick={() => setFiltro(filtro === 'ganha' ? '' : 'ganha')} />
        <Kpi rotulo="Conversão" valor={fechadas ? pct(ganhas / fechadas) : '—'} cor="#16a34a" atraso={180} sub="ganhas ÷ fechadas" />
      </div>

      <button type="button" onClick={() => setForm(novoForm())}
        className="ivf-toque inline-flex items-center justify-center gap-2 rounded-2xl py-3 font-extrabold text-white text-[14.5px] bg-red-600 shadow-[0_6px_16px_rgba(220,38,38,.3)]">
        <Plus size={18} aria-hidden="true" /> Nova indicação
      </button>

      {ranking.length > 0 && (
        <Cartao titulo="Quem mais indica" icone={Trophy} atraso={100}>
          <div className="grid grid-cols-1 gap-2">
            {ranking.map((r, i) => (
              <button key={r.nome} type="button" onClick={() => r.doc && abrirCliente(r.doc)} className="text-left grid gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13.5px] font-bold text-slate-900 truncate">{r.nome}</span>
                  <span className="text-[12px] text-slate-500 whitespace-nowrap">{r.total} {r.total === 1 ? 'indicação' : 'indicações'}{r.ganhas ? ` · ${r.ganhas} ganha${r.ganhas > 1 ? 's' : ''}` : ''}</span>
                </div>
                <Barra valor={r.total} max={ranking[0].total} cor={i === 0 ? '#dc2626' : '#fca5a5'} atraso={i * 80} altura={6} />
              </button>
            ))}
          </div>
        </Cartao>
      )}

      <Chips>
        <Chip ativo={!filtro} onClick={() => setFiltro('')}>Todas ({todas.length})</Chip>
        <Chip ativo={filtro === 'atrasada'} cor="#b91c1c" onClick={() => setFiltro(filtro === 'atrasada' ? '' : 'atrasada')}>Prazo vencido ({vencidas})</Chip>
        {Object.entries(STATUS).map(([k, s]) => (
          <Chip key={k} ativo={filtro === k} cor={s.cor} onClick={() => setFiltro(filtro === k ? '' : k)}>{s.rotulo} ({todas.filter((i) => i.status === k).length})</Chip>
        ))}
      </Chips>

      <div key={filtro} className="grid grid-cols-1 gap-2.5">
        {lista.map((i, n) => <CartaoIndicacao key={i.id} i={i} hoje={hoje} ordem={n} onAbrir={() => setAberta(i)} />)}
        {lista.length === 0 && <Vazio>Nenhuma indicação aqui. Use "Nova indicação" ou "Registrar indicação" na ficha do cliente.</Vazio>}
      </div>

      {aberta && (
        <Folha titulo={aberta.indicado_nome} sub={`indicado por ${aberta.indicante_nome}`} onFechar={() => setAberta(null)}
          rodape={<button type="button" onClick={() => { setForm({ ...aberta, vendedor_id: String(aberta.vendedor_id || '') }); setAberta(null) }}
            className="w-full rounded-xl py-2.5 font-bold border border-slate-300 bg-white text-slate-800">Editar indicação</button>}>
          <Detalhe i={aberta} hoje={hoje} onStatus={(s) => mudarStatus(aberta, s)} onCliente={() => aberta.indicante_doc && abrirCliente(aberta.indicante_doc)} />
        </Folha>
      )}

      {form && (
        <Folha titulo={form.id ? 'Editar indicação' : 'Nova indicação'} onFechar={() => setForm(null)}
          rodape={<div className="flex gap-2">
            <button type="button" onClick={() => setForm(null)} className="flex-1 rounded-xl py-2.5 font-bold border border-slate-300 bg-white text-slate-700">Cancelar</button>
            <button type="button" onClick={salvar} disabled={!form.indicante_nome?.trim() || !form.indicado_nome?.trim()}
              className="flex-1 rounded-xl py-2.5 font-bold bg-red-600 text-white disabled:opacity-40">Salvar</button>
          </div>}>
          <Formulario form={form} setForm={setForm} vendedores={dados.vendedores} />
        </Folha>
      )}
    </div>
  )
}

function CartaoIndicacao({ i, hoje, ordem, onAbrir }) {
  const s = STATUS[i.status] || STATUS.nova
  const venc = atrasada(i, hoje)
  return (
    <button type="button" onClick={onAbrir} className="ivf-entra ivf-toque text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]"
      style={{ animationDelay: `${Math.min(ordem, 10) * 45}ms` }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-extrabold text-slate-900 leading-tight">{i.indicado_nome}</div>
          <div className="text-[12.5px] text-slate-500 mt-0.5">{[i.indicado_cidade, fmtFone(i.indicado_telefone)].filter(Boolean).join(' · ')}</div>
        </div>
        <Selo cor={s.cor} cheio>{s.rotulo}</Selo>
      </div>
      <div className="mt-2 grid gap-1 text-[12.5px] text-slate-700">
        <div className="flex items-center gap-1.5 min-w-0"><UserRound size={14} className="text-slate-400 shrink-0" aria-hidden="true" /><span className="truncate">indicado por <b>{i.indicante_nome}</b></span></div>
        {i.interesse && <div className="flex items-center gap-1.5 min-w-0"><Tractor size={14} className="text-slate-400 shrink-0" aria-hidden="true" /><span className="truncate">{i.interesse}</span></div>}
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {venc
          ? <Selo cor="#b91c1c" cheio>ligar até {dataBR(i.prazo_contato)} · vencido</Selo>
          : i.status === 'nova' && i.prazo_contato ? <Selo cor="#475569">ligar até {dataBR(i.prazo_contato)}</Selo> : null}
        {!i.autorizado && <Selo cor="#b45309">sem autorização registrada</Selo>}
        {i.beneficio && <Selo cor="#7c3aed">{i.beneficio}{i.beneficio_entregue ? ' · entregue' : ''}</Selo>}
        {i.local && <Selo cor="#0891b2">só nesta tela</Selo>}
        <span className="ml-auto text-[11.5px] text-slate-500 inline-flex items-center">{i.vendedor_nome ? i.vendedor_nome.split(' ')[0] : 'sem vendedor'}<ChevronRight size={14} aria-hidden="true" /></span>
      </div>
    </button>
  )
}

function Detalhe({ i, hoje, onStatus, onCliente }) {
  const linha = (rot, val) => (val ? <div className="flex justify-between gap-3 py-1.5 border-b border-slate-100 text-[13.5px]"><span className="text-slate-500">{rot}</span><span className="font-semibold text-slate-900 text-right">{val}</span></div> : null)
  return (
    <div className="grid grid-cols-1 gap-3">
      <AvisoLocal>No modo de exemplo a troca de situação vale só nesta tela; nada é gravado.</AvisoLocal>
      <div>
        <div className="text-[12.5px] font-semibold text-slate-600 mb-1.5">Situação</div>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(STATUS).map(([k, s]) => (
            <button key={k} type="button" onClick={() => onStatus(k)} className="rounded-lg py-2 text-[11.5px] font-extrabold border transition-colors"
              style={i.status === k ? { background: s.cor, borderColor: s.cor, color: '#fefefe' } : { background: '#fefefe', borderColor: '#e2e8f0', color: s.cor }}>{s.rotulo}</button>
          ))}
        </div>
      </div>
      {i.indicado_telefone && (
        <div><BotoesContato telefone={i.indicado_telefone} texto={`Olá, ${i.indicado_nome.split(' ')[0]}! Aqui é da Nova Tratores. O ${i.indicante_nome} nos indicou seu contato${i.interesse ? ` (${i.interesse})` : ''}.`} /></div>
      )}
      {!i.autorizado && (
        <div className="flex gap-2 items-start text-[13px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" aria-hidden="true" /> Autorização não registrada: confirme com quem indicou antes de ligar.
        </div>
      )}
      <Cartao>
        {linha('Telefone', fmtFone(i.indicado_telefone))}
        {linha('Cidade', i.indicado_cidade)}
        {linha('Interesse', i.interesse)}
        {linha('Vendedor', i.vendedor_nome || 'sem vendedor')}
        {linha('Ligar até', i.prazo_contato ? `${dataBR(i.prazo_contato)}${atrasada(i, hoje) ? ' (vencido)' : ''}` : null)}
        {linha('Registrada em', `${dataBR(i.criado_em)}${i.criado_por ? ` por ${i.criado_por}` : ''}`)}
        {linha('Contatada em', i.contatado_em ? dataBR(i.contatado_em) : null)}
        {i.beneficio && <div className="flex gap-2 items-center py-1.5 text-[13.5px] text-violet-800"><Gift size={15} aria-hidden="true" /> {i.beneficio}{i.beneficio_entregue ? ' (já entregue)' : ' (a entregar)'}</div>}
        {i.obs && <div className="text-[13px] text-slate-600 pt-1.5">{i.obs}</div>}
      </Cartao>
      {i.indicante_doc && (
        <button type="button" onClick={onCliente} className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13.5px] font-bold text-slate-800">
          Abrir ficha de {i.indicante_nome} <ChevronRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  )
}

function Formulario({ form, setForm, vendedores }) {
  const f = (k) => (v) => setForm({ ...form, [k]: v })
  return (
    <div className="grid grid-cols-1 gap-3">
      <AvisoLocal />
      <Campo rotulo="Quem indicou *"><Texto valor={form.indicante_nome} onMuda={f('indicante_nome')} placeholder="Cliente que indicou" /></Campo>
      <Campo rotulo="CPF/CNPJ de quem indicou"><Texto valor={form.indicante_doc} onMuda={f('indicante_doc')} inputMode="numeric" /></Campo>
      <Campo rotulo="Nome do indicado *"><Texto valor={form.indicado_nome} onMuda={f('indicado_nome')} /></Campo>
      <div className="grid grid-cols-2 gap-2.5">
        <Campo rotulo="Telefone"><Texto tipo="tel" valor={form.indicado_telefone} onMuda={f('indicado_telefone')} /></Campo>
        <Campo rotulo="Cidade"><Texto valor={form.indicado_cidade} onMuda={f('indicado_cidade')} /></Campo>
      </div>
      <label className="flex gap-2.5 items-center text-[13.5px] text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2.5">
        <input type="checkbox" className="w-5 h-5 accent-red-600" checked={!!form.autorizado} onChange={(e) => setForm({ ...form, autorizado: e.target.checked })} />
        O indicado autorizou ser procurado
      </label>
      <Campo rotulo="Máquina de interesse"><Texto valor={form.interesse} onMuda={f('interesse')} placeholder="ex.: 6075 com concha" /></Campo>
      <div className="grid grid-cols-2 gap-2.5">
        <Campo rotulo="Vendedor">
          <select value={form.vendedor_id || ''} onChange={(e) => setForm({ ...form, vendedor_id: e.target.value })} className={estiloCampo}>
            <option value="">—</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Ligar até"><Texto tipo="date" valor={form.prazo_contato} onMuda={f('prazo_contato')} /></Campo>
      </div>
      <Campo rotulo="Reconhecimento combinado (se houver)"><Texto valor={form.beneficio} onMuda={f('beneficio')} placeholder="ex.: revisão grátis" /></Campo>
      {form.beneficio && (
        <label className="flex gap-2.5 items-center text-[13.5px] text-slate-800">
          <input type="checkbox" className="w-5 h-5 accent-red-600" checked={!!form.beneficio_entregue} onChange={(e) => setForm({ ...form, beneficio_entregue: e.target.checked })} /> Já entregue
        </label>
      )}
      <Campo rotulo="Observação">
        <textarea value={form.obs ?? ''} onChange={(e) => setForm({ ...form, obs: e.target.value })} rows={3} className={estiloCampo} />
      </Campo>
    </div>
  )
}
