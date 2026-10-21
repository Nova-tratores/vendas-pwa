// =============================================================================
// /inteligencia/equipe — Painel dos vendedores por período (espelho de Equipe.tsx
// + vivo/ModoEquipe.tsx + painel-vendedores.ts do Portal, molde da Janela Mecânicos).
//   1. escolhe o período (semana · mês · trimestre · ano, com setas)
//   2. a conta do período, comparada com o anterior (até o mesmo dia)
//   3. um cartão por vendedor, do que mais vendeu ao que menos vendeu
//   4. evolução em gráfico (tocar na barra vai para aquele período)
//   5. ficha do vendedor: tudo o que ele fez no período + CRM e alertas
// Os eventos (2 anos) vêm de carregarEquipe(); a soma é feita aqui.
// =============================================================================
import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts'
import { ChevronLeft, ChevronRight, CircleX, FileText, MapPin, Route, Tractor, TriangleAlert, Trophy, Users, Wrench } from 'lucide-react'
import { carregarEquipe, hojeISO, somar } from '../../lib/iv/fonte'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import { Avatar, Barra, Cartao, Chip, Chips, ComoLer, Conta, dataBR, Delta, EstilosIVF, Folha, Kpi, reais, Selo, Vazio, brl } from '../../components/iv/ferramentas/kit'
import { andar, anteriorComparavel, conversao, ESCALAS, periodo, serie } from '../../components/iv/ferramentas/periodos'

const SIT = {
  parado: { rotulo: 'Parado', longo: 'parado no CRM', cor: '#dc2626' },
  atencao: { rotulo: 'Atenção', longo: 'atenção no CRM', cor: '#d97706' },
  ativo: { rotulo: 'Em dia', longo: 'em dia no CRM', cor: '#16a34a' },
  sem_crm: { rotulo: 'Sem CRM', longo: 'não usa o CRM', cor: '#94a3b8' },
}
const METRICAS = [
  { id: 'valorMaquinas', nome: 'Máquinas', cor: '#dc2626', fmt: reais },
  { id: 'valorPecas', nome: 'Peças', cor: '#ea580c', fmt: reais },
  { id: 'propostas', nome: 'Propostas', cor: '#ca8a04', fmt: (v) => String(Math.round(v)) },
  { id: 'visitas', nome: 'Visitas', cor: '#2563eb', fmt: (v) => String(Math.round(v)) },
]
const ROT = {
  maquina: { nome: 'Máquina faturada', cor: '#dc2626', Ic: Tractor },
  pecas: { nome: 'Peças faturadas', cor: '#ea580c', Ic: Wrench },
  proposta: { nome: 'Proposta criada', cor: '#ca8a04', Ic: FileText },
  ganha: { nome: 'Proposta ganha', cor: '#16a34a', Ic: Trophy },
  perdida: { nome: 'Proposta perdida', cor: '#64748b', Ic: CircleX },
  visita: { nome: 'Visita', cor: '#2563eb', Ic: MapPin },
}
// cor dos números de visita: o tailwind deixa blue = vermelho, aqui é azul de verdade (mesmo do Portal)

export default function Equipe() {
  const { dados, carregando, erro, recarregar } = useDados(() => carregarEquipe(), [])
  return (
    <div>
      <EstilosIVF />
      <CabecalhoIV titulo="Equipe" subtitulo="Painel dos vendedores por período" />
      <ComoLer itens={[
        <><b>Escolha o período</b> (semana, mês, trimestre ou ano) e ande com as setas. Tudo na tela muda junto.</>,
        <><b>A conta do período</b>: máquinas e peças faturadas no Omie, propostas criadas, ganhas e perdidas e visitas no CRM. A setinha compara com o período anterior; no período em andamento, até o mesmo dia.</>,
        <><b>Um cartão por vendedor</b>, do que mais vendeu máquina ao que menos vendeu. As barrinhas são as vendas de máquina dos últimos 8 períodos; a bolinha no avatar mostra como ele está no CRM.</>,
        <><b>Toque no cartão</b> para ver cada venda, proposta e visita do período, e os alertas do CRM. <b>Toque numa barra</b> do gráfico de evolução para ir até aquele período.</>,
      ]} />
      {carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}
      {dados && <Painel dados={dados} />}
    </div>
  )
}

function Painel({ dados }) {
  const hoje = hojeISO()
  const [escala, setEscala] = useState('mes')
  const [ref, setRef] = useState(hoje)
  const [metrica, setMetrica] = useState('valorMaquinas')
  const [filtro, setFiltro] = useState('')
  const [ficha, setFicha] = useState(null)

  const ev = dados.eventos
  const p = periodo(escala, ref)
  const pAnt = anteriorComparavel(escala, ref, hoje)
  const atual = periodo(escala, hoje).de === p.de
  const total = useMemo(() => somar(ev, p.de, p.ate), [ev, p.de, p.ate])
  const totalAnt = useMemo(() => somar(ev, pAnt.de, pAnt.ate), [ev, pAnt.de, pAnt.ate])
  const hist = useMemo(() => serie(ev, escala, ref, 8), [ev, escala, ref])
  const linhaDe = (id) => dados.linhas.find((l) => l.id === id)

  const cartoes = useMemo(() => dados.vendedores.map((v) => ({
    v, s: somar(ev, p.de, p.ate, v.id), ant: somar(ev, pAnt.de, pAnt.ate, v.id),
    hist: serie(ev, escala, ref, 8, v.id).map((x) => x.soma.valorMaquinas), linha: dados.linhas.find((l) => l.id === v.id),
  })).sort((a, b) => b.s.valorMaquinas - a.s.valorMaquinas || b.s.propostas - a.s.propostas || b.s.visitas - a.s.visitas),
  [dados, ev, p.de, p.ate, pAnt.de, pAnt.ate, escala, ref])
  const vis = cartoes.filter((c) => !filtro || c.linha?.situacao === filtro)
  const maxV = Math.max(1, cartoes[0]?.s.valorMaquinas || 0)
  const m = METRICAS.find((x) => x.id === metrica)
  const conv = conversao(total)
  const contSit = (s) => dados.linhas.filter((l) => l.situacao === s).length

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* período */}
      <div className="grid grid-cols-1 gap-2">
        <div className="flex gap-1 p-1 rounded-2xl bg-white border border-slate-200">
          {ESCALAS.map(([id, nome]) => (
            <button key={id} type="button" onClick={() => setEscala(id)}
              className={`flex-1 rounded-xl py-2 text-[13.5px] font-extrabold transition-all ${escala === id ? 'bg-red-600 text-white shadow' : 'text-slate-700'}`}>{nome}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-white border border-slate-200">
          <button type="button" onClick={() => setRef(andar(escala, ref, -1))} aria-label="Período anterior" className="w-10 h-10 grid place-items-center rounded-xl bg-slate-100 text-slate-800"><ChevronLeft size={20} /></button>
          <div className="flex-1 text-center min-w-0">
            <div key={p.de + escala} className="ivf-troca text-[16px] font-extrabold text-slate-900 truncate">{p.rotulo}</div>
            {atual
              ? <div className="text-[11.5px] font-bold text-green-700 inline-flex items-center gap-1.5"><span className="ivf-pulso w-2 h-2 rounded-full bg-green-600" style={{ '--c': 'rgba(22,163,74,.6)' }} />em andamento · compara até o mesmo dia</div>
              : <button type="button" onClick={() => setRef(hoje)} className="text-[12px] font-bold text-red-700 underline">voltar para hoje</button>}
          </div>
          <button type="button" onClick={() => setRef(andar(escala, ref, 1))} disabled={atual} aria-label="Próximo período"
            className="w-10 h-10 grid place-items-center rounded-xl bg-slate-100 text-slate-800 disabled:opacity-30"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* a conta do período */}
      <div key={`k-${escala}-${p.de}`} className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2">
          <Kpi destaque cor="#dc2626" rotulo="Máquinas faturadas" valor={total.valorMaquinas} formato={(v) => brl(v)} icone={Tractor}
            delta={<Delta agora={total.valorMaquinas} antes={totalAnt.valorMaquinas} claro />} sub={`${total.maquinas} pedidos · antes ${reais(totalAnt.valorMaquinas)}`} />
        </div>
        <Kpi rotulo="Peças faturadas" valor={total.valorPecas} formato={reais} cor="#ea580c" icone={Wrench} atraso={60}
          delta={<Delta agora={total.valorPecas} antes={totalAnt.valorPecas} />} sub={`antes ${reais(totalAnt.valorPecas)}`} />
        <Kpi rotulo="Propostas" valor={total.propostas} cor="#ca8a04" icone={FileText} atraso={120}
          delta={<Delta agora={total.propostas} antes={totalAnt.propostas} />} sub={reais(total.valorPropostas)} />
        <Kpi rotulo="Ganhas" valor={total.ganhas} cor="#16a34a" icone={Trophy} atraso={180}
          delta={<Delta agora={total.ganhas} antes={totalAnt.ganhas} />} sub={`${total.perdidas} perdidas · conv. ${conv == null ? '—' : `${Math.round(conv * 100)}%`}`} />
        <Kpi rotulo="Visitas no CRM" valor={total.visitas} cor="#2563eb" icone={Route} atraso={240}
          delta={<Delta agora={total.visitas} antes={totalAnt.visitas} />} sub={`antes ${totalAnt.visitas}`} />
      </div>

      {/* situação no CRM (hoje) */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <h2 className="text-[15px] font-extrabold text-slate-900 inline-flex items-center gap-1.5"><Users size={17} className="text-red-600" aria-hidden="true" /> Vendedores no período</h2>
          <span className="text-[11.5px] text-slate-500">situação = CRM de hoje</span>
        </div>
        <Chips>
          <Chip ativo={!filtro} onClick={() => setFiltro('')}>Todos ({dados.linhas.length})</Chip>
          {Object.entries(SIT).filter(([k]) => contSit(k) > 0).map(([k, s]) => (
            <Chip key={k} ativo={filtro === k} cor={s.cor} onClick={() => setFiltro(filtro === k ? '' : k)}>{s.rotulo} ({contSit(k)})</Chip>
          ))}
        </Chips>
      </div>

      <div key={`c-${escala}-${p.de}`} className="grid grid-cols-1 gap-2.5">
        {vis.map((c, i) => <CartaVendedor key={c.v.id} {...c} pos={cartoes.indexOf(c)} ordem={i} maxV={maxV} onAbrir={() => setFicha(c.v.id)} />)}
        {vis.length === 0 && <Vazio>Nenhum vendedor nessa situação.</Vazio>}
      </div>

      {/* evolução */}
      <Cartao titulo="Evolução — últimos 8 períodos" atraso={120} corpo="px-2 pt-2 pb-3">
        <div className="px-2"><Chips>
          {METRICAS.map((x) => <Chip key={x.id} ativo={metrica === x.id} cor={x.cor} onClick={() => setMetrica(x.id)}>{x.nome}</Chip>)}
        </Chips></div>
        <div style={{ height: 220 }} className="mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hist.map((h) => ({ nome: h.curto, v: h.soma[metrica], inicio: h.ref }))} margin={{ top: 10, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tickFormatter={(v) => (metrica.startsWith('valor') ? reais(v).replace('R$ ', '').replace(' ', '') : String(v))} tick={{ fontSize: 10.5, fill: '#64748b' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={(v) => [m.fmt(Number(v)), m.nome]} cursor={{ fill: '#94a3b822' }} />
              <Bar dataKey="v" radius={[7, 7, 0, 0]} animationDuration={900} style={{ cursor: 'pointer' }}
                onClick={(d) => { const r = d?.payload?.inicio || d?.inicio; if (r) setRef(r) }}>
                {hist.map((h) => <Cell key={h.de} fill={m.cor} fillOpacity={h.de === p.de ? 1 : 0.4} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="px-2 text-[11.5px] text-slate-500">Toque numa barra para ir até aquele período.</p>
      </Cartao>

      {ficha != null && (
        <FichaVendedor nome={dados.vendedores.find((v) => v.id === ficha)?.nome || ''} rotulo={p.rotulo}
          eventos={ev.filter((e) => e.v === ficha && e.d >= p.de && e.d <= p.ate)} s={somar(ev, p.de, p.ate, ficha)}
          ant={somar(ev, pAnt.de, pAnt.ate, ficha)} linha={linhaDe(ficha)} onFechar={() => setFicha(null)} />
      )}
    </div>
  )
}

function CartaVendedor({ v, s, ant, hist, linha, pos, ordem, maxV, onAbrir }) {
  const sit = SIT[linha?.situacao ?? 'sem_crm']
  const maxH = Math.max(1, ...hist)
  const medalha = s.valorMaquinas > 0 ? ['#eab308', '#94a3b8', '#b45309'][pos] : undefined
  const conv = conversao(s)
  return (
    <button type="button" onClick={onAbrir} className="ivf-entra ivf-toque relative text-left bg-white border border-slate-200 rounded-2xl p-3.5 shadow-[0_1px_3px_rgba(15,23,42,.05)]"
      style={{ animationDelay: `${ordem * 60}ms` }}>
      {medalha && (
        <span title={`${pos + 1}º em máquinas no período`} className="absolute right-3 top-3 w-7 h-7 rounded-full grid place-items-center text-white text-[13px] font-extrabold"
          style={{ background: medalha, boxShadow: `0 4px 10px ${medalha}88` }}>{pos + 1}</span>
      )}
      <div className="flex gap-3 items-center pr-9">
        <Avatar nome={v.nome} situacao={{ cor: sit.cor, rotulo: sit.longo }} />
        <div className="min-w-0">
          <div className="text-[15.5px] font-extrabold text-slate-900 leading-tight truncate">{v.nome}</div>
          <div className="text-[12px] font-bold" style={{ color: sit.cor }}>{sit.longo}{linha?.diasSemVisita > 0 && linha.situacao !== 'ativo' ? ` · ${linha.diasSemVisita} dias úteis sem visita` : ''}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-end gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10.5px] font-extrabold uppercase text-slate-500">Máquinas faturadas</div>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[21px] font-extrabold text-red-600 tabular-nums"><Conta valor={s.valorMaquinas} formato={reais} /></span>
            <span className="text-[12px] text-slate-500">{s.maquinas} ped.</span>
            <Delta agora={s.valorMaquinas} antes={ant.valorMaquinas} />
          </div>
        </div>
        <div className="flex items-end gap-[3px] h-8 w-[88px] shrink-0" title="Máquinas nos últimos 8 períodos">
          {hist.map((x, i) => (
            <div key={i} className="ivf-barrav flex-1 rounded-[3px]"
              style={{ animationDelay: `${ordem * 60 + i * 35}ms`, height: `${Math.max(8, (x / maxH) * 100)}%`, background: x ? (i === 7 ? '#dc2626' : '#fca5a5') : '#f1f5f9' }} />
          ))}
        </div>
      </div>
      <div className="mt-1.5"><Barra valor={s.valorMaquinas} max={maxV} cor="linear-gradient(90deg, #f87171, #b91c1c)" atraso={ordem * 60} altura={6} /></div>
      <div className="grid grid-cols-4 gap-1.5 mt-2.5">
        {[
          ['Peças', s.valorPecas ? reais(s.valorPecas).replace('R$ ', '') : '—'],
          ['Propostas', String(s.propostas)],
          ['Gan./perd.', `${s.ganhas}/${s.perdidas}`],
          ['Visitas', String(s.visitas)],
        ].map(([t, val]) => (
          <div key={t} className="bg-slate-50 rounded-lg px-1.5 py-1 min-w-0">
            <div className="text-[9.5px] font-extrabold uppercase text-slate-500 truncate">{t}</div>
            <div className="text-[14px] font-extrabold text-slate-900 tabular-nums truncate">{val}</div>
          </div>
        ))}
      </div>
      {conv != null && <div className="mt-1.5 text-[11px] text-slate-500">conversão no período: {Math.round(conv * 100)}%</div>}
    </button>
  )
}

function FichaVendedor({ nome, rotulo, eventos, s, ant, linha, onFechar }) {
  const [aba, setAba] = useState('periodo')
  const [tipo, setTipo] = useState('')
  const lista = [...eventos].filter((e) => !tipo || e.t === tipo).sort((a, b) => b.d.localeCompare(a.d))
  const sit = SIT[linha?.situacao ?? 'sem_crm']
  const topo = (
    <div className="px-4 pt-4 pb-3 text-white" style={{ background: 'linear-gradient(135deg, #F87171, #991B1B)' }}>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/25 grid place-items-center font-extrabold text-[17px]">{nome.split(' ').slice(0, 2).map((x) => x[0]).join('')}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-extrabold leading-tight truncate">{nome}</div>
          <div className="text-[13px] opacity-95">{rotulo} · {sit.longo}</div>
        </div>
        <button type="button" onClick={onFechar} aria-label="Fechar" className="w-9 h-9 grid place-items-center rounded-full bg-white/25"><CircleX size={20} /></button>
      </div>
      <div className="flex gap-1 mt-3 p-1 rounded-xl bg-black/15">
        {[['periodo', 'No período'], ['crm', `CRM e alertas${linha?.alertas?.length ? ` (${linha.alertas.length})` : ''}`]].map(([k, n]) => (
          <button key={k} type="button" onClick={() => setAba(k)} className={`flex-1 rounded-lg py-1.5 text-[13px] font-extrabold ${aba === k ? 'bg-white text-red-700' : 'text-white'}`}>{n}</button>
        ))}
      </div>
    </div>
  )
  return (
    <Folha titulo={nome} onFechar={onFechar} cheia topo={topo}>
      {aba === 'periodo' && (
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <Kpi rotulo="Máquinas" valor={s.valorMaquinas} formato={reais} cor="#dc2626" delta={<Delta agora={s.valorMaquinas} antes={ant.valorMaquinas} />} sub={`${s.maquinas} pedidos`} />
            <Kpi rotulo="Peças" valor={s.valorPecas} formato={reais} cor="#ea580c" atraso={50} delta={<Delta agora={s.valorPecas} antes={ant.valorPecas} />} />
            <Kpi rotulo="Propostas" valor={s.propostas} cor="#ca8a04" atraso={100} sub={reais(s.valorPropostas)} />
            <Kpi rotulo="Ganhas / perdidas" valor={`${s.ganhas} / ${s.perdidas}`} cor="#16a34a" atraso={150} />
            <div className="col-span-2"><Kpi rotulo="Visitas" valor={s.visitas} cor="#2563eb" atraso={200} delta={<Delta agora={s.visitas} antes={ant.visitas} />} sub={`antes ${ant.visitas}`} /></div>
          </div>
          <Chips>
            <Chip ativo={!tipo} onClick={() => setTipo('')}>Tudo ({eventos.length})</Chip>
            {Object.keys(ROT).filter((t) => eventos.some((e) => e.t === t)).map((t) => (
              <Chip key={t} ativo={tipo === t} cor={ROT[t].cor} onClick={() => setTipo(t)}>{ROT[t].nome} ({eventos.filter((e) => e.t === t).length})</Chip>
            ))}
          </Chips>
          {lista.length === 0 && <Vazio>Nada neste período.</Vazio>}
          <div className="grid grid-cols-1 gap-1.5">
            {lista.slice(0, 200).map((e, i) => {
              const R = ROT[e.t]
              return (
                <div key={i} className="ivf-entra flex gap-2.5 items-center bg-white border border-slate-200 rounded-xl px-3 py-2" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${R.cor}1a`, color: R.cor }}><R.Ic size={16} aria-hidden="true" /></span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-slate-900 truncate">{e.desc || '—'}</div>
                    <div className="text-[11.5px] font-bold" style={{ color: R.cor }}>{R.nome}</div>
                  </div>
                  <div className="text-right shrink-0">
                    {e.valor > 0 && <div className="text-[13px] font-extrabold text-slate-900 tabular-nums">{reais(e.valor)}</div>}
                    <div className="text-[11.5px] text-slate-500">{e.d.slice(8, 10)}/{e.d.slice(5, 7)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {aba === 'crm' && linha && <AbaCrm l={linha} />}
      {aba === 'crm' && !linha && <Vazio>Sem dados do CRM para este vendedor.</Vazio>}
    </Folha>
  )
}

function AbaCrm({ l }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {l.alertas.length > 0 && (
        <Cartao titulo="Alertas" icone={TriangleAlert}>
          <div className="grid grid-cols-1 gap-1.5">
            {l.alertas.map((a) => <div key={a} className="text-[13.5px] text-slate-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">{a}</div>)}
          </div>
        </Cartao>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Kpi rotulo="Visitas 7 / 30 / 90 d" valor={`${l.visitas7} / ${l.visitas30} / ${l.visitas90}`} cor="#2563eb" sub={`última ${dataBR(l.ultimaVisita)}`} />
        <Kpi rotulo="Propostas abertas" valor={l.propostasAbertas} cor="#ca8a04" sub={reais(l.valorPropostas)} />
        <Kpi rotulo="Negócios no CRM" valor={l.negociosAbertos} cor="#475569" sub={reais(l.valorNegocios)} />
        <Kpi rotulo="Carteira sem visita 6 m" valor={l.carteiraSemVisita} cor="#475569" sub={`de ${l.carteira} clientes`} />
      </div>
      <Cartao titulo={`Propostas em aberto (${l.propostas.length})`} icone={FileText}>
        {l.propostas.length === 0 && <div className="text-[13px] text-slate-500">Nenhuma.</div>}
        <div className="divide-y divide-slate-100">
          {l.propostas.map((p) => (
            <div key={p.id} className="py-2">
              <div className="flex justify-between gap-2"><b className="text-[13.5px] text-slate-900 truncate">{p.cliente}</b><span className="text-[13px] font-bold tabular-nums">{reais(p.valor)}</span></div>
              <div className="text-[12px] text-slate-500">{p.oque}</div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <Selo cor={(p.dias ?? 0) > 15 ? '#d97706' : '#64748b'}>{p.dias ?? '—'} d na fase</Selo>
                <Selo cor={p.proximo ? '#475569' : '#dc2626'}>{p.proximo ? `próx. ${dataBR(p.proximo)}` : 'sem próximo contato'}</Selo>
              </div>
            </div>
          ))}
        </div>
      </Cartao>
      <Cartao titulo={`Últimas visitas (${l.ultimasVisitas.length})`} icone={MapPin}>
        <div className="divide-y divide-slate-100">
          {l.ultimasVisitas.slice(0, 25).map((v) => (
            <div key={v.id} className="py-2">
              <div className="flex gap-1.5 items-center flex-wrap">
                <b className="text-[13px] text-slate-900">{dataBR(v.data_visita)}</b>
                <span className="text-[13px] text-slate-700 truncate">{v.propriedade_nome || v.cliente_nome || '—'}</span>
              </div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <Selo cor="#475569">{v.tipo}</Selo>
                {v.tipo === 'presencial' && v.latitude == null && <Selo cor="#dc2626">sem GPS</Selo>}
                {v.retroativa && <Selo cor="#d97706">retroativa</Selo>}
                {v.acionar_pos_vendas && <Selo cor={v.pos_vendas_resolvido ? '#16a34a' : '#7c3aed'}>pós-vendas{v.pos_vendas_resolvido ? ' ok' : ''}</Selo>}
              </div>
              {v.resumo && <div className="text-[12.5px] text-slate-500 mt-1">{v.resumo}</div>}
            </div>
          ))}
        </div>
      </Cartao>
    </div>
  )
}
