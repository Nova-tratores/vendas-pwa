// =============================================================================
// /inteligencia/concorrencia — radar de concorrentes e preços (espelho de
// Concorrencia.tsx). Em cima: perdas (propostas + negócios do CRM) por marca e
// por motivo. Embaixo: o que a equipe registrou (anúncios, campanhas, feiras,
// preços). No modo de exemplo o registro novo fica só no estado da tela.
// =============================================================================
import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList } from 'recharts'
import { ExternalLink, Megaphone, Plus, Search, Swords, TrendingDown, X } from 'lucide-react'
import { carregarConcorrencia, hojeISO, VENDEDOR_LOGADO } from '../../lib/iv/fonte'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import {
  AvisoLocal, Barra, brl, Campo, Cartao, Chip, Chips, ComoLer, dataBR, estiloCampo, EstilosIVF, Folha, Kpi, reais, Selo, Texto, textoNorm, Vazio,
} from '../../components/iv/ferramentas/kit'

const TIPOS = { anuncio: 'Anúncio', campanha: 'Campanha', evento: 'Feira / dia de campo', loja: 'Loja nova', outro: 'Outro' }
const COR_MARCA = {
  'John Deere': '#15803d', 'Massey Ferguson': '#b91c1c', 'New Holland': '#1d4ed8', Valtra: '#0f172a', 'LS Tractor': '#0369a1',
  Yanmar: '#dc2626', Case: '#c2410c', Kubota: '#ea580c', Agrale: '#64748b',
}
const corMarca = (m) => COR_MARCA[m] || '#7c3aed'
const SEM_CONC = 'Não informado'

export default function Concorrencia() {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarConcorrencia(), [])
  return (
    <div>
      <EstilosIVF />
      <CabecalhoIV titulo="Concorrência" subtitulo="Por que perdemos, para quem e o que as outras revendas anunciam" />
      <ComoLer itens={[
        <><b>Perdas por concorrente</b>: propostas do portal e negócios do CRM perdidos, agrupados pela marca que levou. Toque numa barra para ver só as perdas dela.</>,
        <><b>Motivos</b>: o que o vendedor marcou ao perder. "Sem motivo" é perda sem registro; vale pedir ao vendedor para preencher.</>,
        <><b>Anúncios e preços</b>: o que a equipe viu ou ouviu das outras revendas (campanha, feira, preço de tabela, usado à venda). Só informação pública.</>,
      ]} />
      {carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {dados && <Radar dados={dados} />}
    </div>
  )
}

function Radar({ dados }) {
  const hoje = hojeISO()
  const [regs, setRegs] = useState(dados.registros)
  const [marca, setMarca] = useState('')
  const [motivo, setMotivo] = useState('')
  const [busca, setBusca] = useState('')
  const [form, setForm] = useState(null)
  const [aba, setAba] = useState('perdas')
  const perdas = dados.perdas

  const porMarca = useMemo(() => {
    const m = new Map()
    for (const p of perdas) {
      const k = p.concorrente || SEM_CONC
      const r = m.get(k) || { marca: k, n: 0, valor: 0 }
      r.n++; r.valor += Number(p.valorConcorrente) || 0
      m.set(k, r)
    }
    return [...m.values()].sort((a, b) => (a.marca === SEM_CONC) - (b.marca === SEM_CONC) || b.n - a.n)
  }, [perdas])
  const motivos = useMemo(() => {
    const m = new Map()
    for (const p of perdas) m.set(p.motivo, (m.get(p.motivo) || 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [perdas])
  const listaPerdas = perdas.filter((p) => (!marca || (p.concorrente || SEM_CONC) === marca) && (!motivo || p.motivo === motivo))
  const listaRegs = useMemo(() => {
    const q = textoNorm(busca)
    return regs.filter((r) => !q || textoNorm([r.revenda, r.marca, r.modelo, r.cidade, r.condicoes, r.obs].join(' ')).includes(q))
      .sort((a, b) => String(b.data_ref).localeCompare(String(a.data_ref)))
  }, [regs, busca])
  const semMotivo = perdas.filter((p) => /sem motivo/i.test(p.motivo)).length
  const comConc = perdas.filter((p) => p.concorrente).length

  function salvar() {
    if (!form.revenda?.trim()) return
    setRegs((r) => [{ ...form, id: Date.now(), ano: form.ano ? Number(form.ano) : null, preco: form.preco ? Number(form.preco) : null, criado_por: VENDEDOR_LOGADO.nome, criado_em: new Date().toISOString(), local: true }, ...r])
    setForm(null); setAba('registros')
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        <Kpi rotulo="Perdas registradas" valor={perdas.length} cor="#dc2626" icone={TrendingDown} />
        <Kpi rotulo="Com concorrente" valor={comConc} cor="#7c3aed" icone={Swords} atraso={60} sub={`${porMarca.filter((m) => m.marca !== SEM_CONC).length} marcas`} />
        <Kpi rotulo="Sem motivo" valor={semMotivo} cor="#b45309" atraso={120} sub="pedir ao vendedor" ativo={motivo && /sem motivo/i.test(motivo)}
          onClick={semMotivo ? () => { const k = motivos.find(([mm]) => /sem motivo/i.test(mm))?.[0] || ''; setMotivo(motivo === k ? '' : k); setAba('perdas') } : undefined} />
        <Kpi rotulo="Registros da equipe" valor={regs.length} cor="#0f172a" icone={Megaphone} atraso={180} onClick={() => setAba('registros')} />
      </div>

      <Cartao titulo="Perdas por concorrente" icone={Swords} atraso={100} corpo="px-2 pt-1 pb-3"
        extra={marca ? <button type="button" onClick={() => setMarca('')} className="text-[12px] font-bold text-red-700 inline-flex items-center gap-0.5"><X size={13} /> {marca}</button> : null}>
        <div style={{ height: Math.max(150, porMarca.length * 38 + 20) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porMarca} layout="vertical" margin={{ top: 6, right: 34, left: 4, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="marca" width={112} tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, it) => [`${v} perda${v > 1 ? 's' : ''}${it?.payload?.valor ? ` · preço dele ${reais(it.payload.valor / v)} em média` : ''}`, '']} cursor={{ fill: '#94a3b822' }} />
              <Bar dataKey="n" radius={[0, 7, 7, 0]} barSize={22} animationDuration={900} style={{ cursor: 'pointer' }}
                onClick={(d) => { const k = d?.payload?.marca || d?.marca; if (k) { setMarca(marca === k ? '' : k); setAba('perdas') } }}>
                {porMarca.map((m) => <Cell key={m.marca} fill={m.marca === SEM_CONC ? '#cbd5e1' : corMarca(m.marca)} fillOpacity={!marca || marca === m.marca ? 1 : 0.3} />)}
                <LabelList dataKey="n" position="right" style={{ fontSize: 12, fontWeight: 800, fill: '#0f172a' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Cartao>

      {motivos.length > 0 && (
        <Cartao titulo="Motivos de perda" atraso={160}>
          <div className="grid grid-cols-1 gap-2">
            {motivos.map(([mm, n], i) => (
              <button key={mm} type="button" onClick={() => { setMotivo(motivo === mm ? '' : mm); setAba('perdas') }} className={`text-left grid gap-1 rounded-lg ${motivo && motivo !== mm ? 'opacity-40' : ''}`}>
                <div className="flex justify-between gap-2 text-[13px]"><span className="font-semibold text-slate-800">{mm}</span><b className="tabular-nums">{n}</b></div>
                <Barra valor={n} max={motivos[0][1]} cor={/sem motivo/i.test(mm) ? '#f59e0b' : i === 0 ? '#dc2626' : '#f87171'} atraso={i * 70} altura={7} />
              </button>
            ))}
          </div>
        </Cartao>
      )}

      <div className="flex gap-1 p-1 rounded-2xl bg-white border border-slate-200">
        {[['perdas', `Perdas (${listaPerdas.length})`], ['registros', `Anúncios e preços (${regs.length})`]].map(([k, n]) => (
          <button key={k} type="button" onClick={() => setAba(k)} className={`flex-1 rounded-xl py-2 text-[13px] font-extrabold ${aba === k ? 'bg-red-600 text-white shadow' : 'text-slate-700'}`}>{n}</button>
        ))}
      </div>

      {aba === 'perdas' && (
        <div key={`${marca}-${motivo}`} className="grid grid-cols-1 gap-2">
          {(marca || motivo) && (
            <div className="flex gap-1.5 flex-wrap">
              {marca && <Chip ativo cor={corMarca(marca)} onClick={() => setMarca('')}>{marca} <X size={12} className="inline" /></Chip>}
              {motivo && <Chip ativo onClick={() => setMotivo('')}>{motivo} <X size={12} className="inline" /></Chip>}
            </div>
          )}
          {listaPerdas.map((p, i) => (
            <div key={`${p.origem}-${p.id}`} className="ivf-entra bg-white border border-slate-200 rounded-2xl p-3.5" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-extrabold text-slate-900 leading-tight">{p.cliente || '—'}</div>
                  <div className="text-[12.5px] text-slate-500">{[p.cidade, p.oque].filter(Boolean).join(' · ')}</div>
                </div>
                <Selo cor={p.origem === 'proposta' ? '#dc2626' : '#475569'}>{p.origem === 'proposta' ? 'Proposta' : 'CRM'}</Selo>
              </div>
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                {p.concorrente ? <Selo cor={corMarca(p.concorrente)} cheio>{p.concorrente}</Selo> : <Selo cor="#94a3b8">concorrente não registrado</Selo>}
                <Selo cor={/sem motivo/i.test(p.motivo) ? '#b45309' : '#475569'}>{p.motivo}</Selo>
                {p.valorConcorrente ? <span className="text-[12.5px] font-bold text-slate-800">preço dele {brl(p.valorConcorrente)}</span> : null}
              </div>
              <div className="mt-1.5 text-[11.5px] text-slate-500">{dataBR(p.data)}{p.vendedor ? ` · ${p.vendedor}` : ''}</div>
            </div>
          ))}
          {listaPerdas.length === 0 && <Vazio>Nenhuma perda com esse filtro.</Vazio>}
        </div>
      )}

      {aba === 'registros' && (
        <div className="grid grid-cols-1 gap-2">
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:ring-2 focus-within:ring-red-500/40">
              <Search size={16} className="text-slate-400" aria-hidden="true" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar revenda, modelo, cidade" className="w-full py-2.5 bg-transparent focus:outline-none" />
            </label>
            <button type="button" onClick={() => setForm({ tipo: 'anuncio', condicao: 'novo', data_ref: hoje })}
              className="shrink-0 inline-flex items-center gap-1 rounded-xl px-3 font-extrabold text-white bg-red-600 text-[13.5px]"><Plus size={17} aria-hidden="true" /> Registrar</button>
          </div>
          {listaRegs.map((r, i) => (
            <div key={r.id} className="ivf-entra bg-white border border-slate-200 rounded-2xl p-3.5" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[14.5px] font-extrabold text-slate-900 leading-tight">{r.revenda}</div>
                  <div className="text-[12.5px] text-slate-600 mt-0.5">
                    {[r.marca, r.modelo].filter(Boolean).join(' ') || '—'}{r.ano ? ` · ${r.ano}` : ''}{r.condicao ? ` · ${r.condicao}` : ''}
                  </div>
                </div>
                {r.preco ? <div className="text-[15px] font-extrabold text-red-700 tabular-nums whitespace-nowrap">{reais(r.preco)}</div> : null}
              </div>
              {r.condicoes && <div className="mt-2 text-[13px] text-slate-800 bg-slate-50 rounded-lg px-2.5 py-1.5">{r.condicoes}</div>}
              {r.obs && <div className="mt-1.5 text-[12.5px] text-slate-500">{r.obs}</div>}
              <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                <Selo cor="#7c3aed">{TIPOS[r.tipo] || r.tipo}</Selo>
                {r.cidade && <Selo cor="#475569">{r.cidade}</Selo>}
                {r.local && <Selo cor="#0891b2">só nesta tela</Selo>}
                <span className="ml-auto text-[11.5px] text-slate-500">{dataBR(r.data_ref)}{r.criado_por ? ` · ${r.criado_por.split(' ')[0]}` : ''}</span>
              </div>
              {r.fonte && (/^https?:\/\//.test(r.fonte)
                ? <a href={r.fonte} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-bold text-red-700">abrir fonte <ExternalLink size={13} /></a>
                : <div className="mt-1 text-[11.5px] text-slate-500">fonte: {r.fonte}</div>)}
            </div>
          ))}
          {listaRegs.length === 0 && <Vazio>Nada registrado. Use "Registrar" quando ver um anúncio, campanha ou preço de outra revenda.</Vazio>}
        </div>
      )}

      {form && (
        <Folha titulo="Registrar concorrência" sub="Anúncio, campanha, feira ou preço de outra revenda" onFechar={() => setForm(null)}
          rodape={<div className="flex gap-2">
            <button type="button" onClick={() => setForm(null)} className="flex-1 rounded-xl py-2.5 font-bold border border-slate-300 bg-white text-slate-700">Cancelar</button>
            <button type="button" onClick={salvar} disabled={!form.revenda?.trim()} className="flex-1 rounded-xl py-2.5 font-bold bg-red-600 text-white disabled:opacity-40">Salvar</button>
          </div>}>
          <FormRegistro form={form} setForm={setForm} />
        </Folha>
      )}
    </div>
  )
}

function FormRegistro({ form, setForm }) {
  const f = (k) => (v) => setForm({ ...form, [k]: v })
  return (
    <div className="grid grid-cols-1 gap-3">
      <AvisoLocal />
      <Campo rotulo="Revenda / concorrente *"><Texto valor={form.revenda} onMuda={f('revenda')} placeholder="ex.: Revenda John Deere de Ourinhos" /></Campo>
      <div className="grid grid-cols-2 gap-2.5">
        <Campo rotulo="Tipo">
          <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className={estiloCampo}>
            {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Data"><Texto tipo="date" valor={form.data_ref} onMuda={f('data_ref')} /></Campo>
      </div>
      <div className="grid grid-cols-[1fr_1fr_76px] gap-2">
        <Campo rotulo="Marca"><Texto valor={form.marca} onMuda={f('marca')} /></Campo>
        <Campo rotulo="Modelo"><Texto valor={form.modelo} onMuda={f('modelo')} /></Campo>
        <Campo rotulo="Ano"><Texto tipo="number" valor={form.ano} onMuda={f('ano')} inputMode="numeric" /></Campo>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Campo rotulo="Condição">
          <select value={form.condicao || ''} onChange={(e) => setForm({ ...form, condicao: e.target.value })} className={estiloCampo}>
            <option value="novo">Novo</option><option value="seminovo">Seminovo</option><option value="usado">Usado</option>
          </select>
        </Campo>
        <Campo rotulo="Preço (R$)"><Texto tipo="number" valor={form.preco} onMuda={f('preco')} inputMode="numeric" /></Campo>
      </div>
      <Campo rotulo="Condições (prazo, taxa, entrada, brinde)"><Texto valor={form.condicoes} onMuda={f('condicoes')} /></Campo>
      <Campo rotulo="Cidade"><Texto valor={form.cidade} onMuda={f('cidade')} /></Campo>
      <Campo rotulo="Fonte (link ou onde viu)"><Texto valor={form.fonte} onMuda={f('fonte')} /></Campo>
      <Campo rotulo="Observação"><textarea rows={3} value={form.obs ?? ''} onChange={(e) => setForm({ ...form, obs: e.target.value })} className={estiloCampo} /></Campo>
    </div>
  )
}
