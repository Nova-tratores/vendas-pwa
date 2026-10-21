// Abas da Ficha 360 no celular (port de FichaAbas.tsx / Ficha360.tsx do Portal):
// Resumo · Máquinas · Compras e visitas · Propostas · Mercado da cidade.
import { useMemo, useState } from 'react'
import {
  ArrowRight, Banknote, Building2, CalendarClock, CloudRain, FileText, Flag, Gauge, Handshake, Lightbulb, MapPin,
  Package, Sprout, Target, Tractor, TrendingDown, TrendingUp, TriangleAlert, Users, Wrench,
} from 'lucide-react'
import Icone from '../../Icone'
import { ICONE_REGRA, REGRAS, ROTULO_MOTIVO } from '../../../lib/iv/fonte'
import { BD, Cartao, Chip, Conta, dataBR, dataCurta, mil, reais, Rolagem, Rotulo, Selo, Vazio } from './comum'

export const COR_MOTIVO = { contato_vencido: '#DC2626', validade: '#B91C1C', parada: '#CA8A04', sem_proximo: '#64748B', retorno_visita: '#7C3AED' }
const PERDIDA = /n[aã]o vendido/i, GANHA = /- vendido/i

function Secao({ titulo, icone: I, children, atraso = 0, direita }) {
  return (
    <Cartao className="p-3.5" atraso={atraso}>
      <div className="flex items-center gap-2 mb-3">
        {I && <I size={16} className="text-red-600" aria-hidden="true" />}
        <h3 className="text-[14.5px] font-extrabold text-slate-900 flex-1">{titulo}</h3>
        {direita}
      </div>
      {children}
    </Cartao>
  )
}

function Kpi({ titulo, valor, formato, sub, cor, icone: I, onClick, atraso = 0, alerta }) {
  return (
    <button type="button" onClick={onClick} className="iv-entra iv-toque relative overflow-hidden text-left rounded-2xl border border-slate-200 bg-[#fefefe] p-3 min-w-0" style={{ animationDelay: `${atraso}ms` }}>
      {I && <I size={20} className="absolute right-3 top-3 opacity-20" style={{ color: cor }} aria-hidden="true" />}
      <div className="text-[11.5px] font-bold text-slate-500 pr-6 leading-tight">{titulo}</div>
      <div className="text-[22px] font-extrabold tabular-nums mt-0.5 truncate" style={{ color: cor, letterSpacing: '-.02em' }}>
        {typeof valor === 'number' ? <Conta valor={valor} formato={formato} /> : valor}
      </div>
      {sub && <div className={`text-[11.5px] leading-tight ${alerta ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{sub}</div>}
    </button>
  )
}

function Barra({ pct, cor, atraso = 0, alto = 8 }) {
  return (
    <span className="block rounded-full bg-slate-100 overflow-hidden" style={{ height: alto }}>
      <span className="iv-barra block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, pct))}%`, background: cor, animationDelay: `${atraso}ms` }} />
    </span>
  )
}

function Rosca({ pct, cor, rotulo, tam = 92 }) {
  const r = tam / 2 - 8, circ = 2 * Math.PI * r
  return (
    <span className="relative inline-grid place-items-center shrink-0" style={{ width: tam, height: tam }}>
      <svg width={tam} height={tam} className="-rotate-90">
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle cx={tam / 2} cy={tam / 2} r={r} fill="none" stroke={cor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.8,.2,1)' }} />
      </svg>
      <span className="absolute text-center leading-none"><b className="text-[18px] text-slate-900">{Math.round(pct)}%</b><br /><span className="text-[10px] text-slate-500">{rotulo}</span></span>
    </span>
  )
}

// ── Resumo ──────────────────────────────────────────────────────────────────
export function AbaResumo({ f, trocar }) {
  const c = f.cliente, mun = f.municipio
  const varPecas = c.pecas12a24m > 0 ? Math.round(((c.pecas12m - c.pecas12a24m) / c.pecas12a24m) * 100) : null
  const o = c.oportunidades[0]
  const maxP = Math.max(1, c.pecas12m, c.pecas12a24m)
  return (
    <div className="space-y-3">
      {o ? (
        <section className="iv-entra relative overflow-hidden rounded-2xl p-4 text-white iv-brilho" style={{ background: `linear-gradient(135deg, ${REGRAS[o.regra].cor}, ${REGRAS[o.regra].cor}cc)`, boxShadow: `0 10px 24px ${REGRAS[o.regra].cor}40` }}>
          <span className="absolute right-3 bottom-2 opacity-20 iv-flutua"><Icone nome={ICONE_REGRA[o.regra]} size={70} /></span>
          <div className="relative">
            <div className="text-[11px] font-extrabold uppercase tracking-wider opacity-90 flex items-center gap-1"><Lightbulb size={13} aria-hidden="true" /> Ação sugerida</div>
            <div className="text-[18px] font-extrabold leading-snug mt-1">{o.oferecer}</div>
            <div className="text-[13px] opacity-95 mt-1 leading-snug">{o.titulo}. {o.porque}</div>
          </div>
        </section>
      ) : (
        <Vazio icone={Target}>Nenhum motivo forte para ligar agora. Mantenha o relacionamento.</Vazio>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Kpi titulo="Máquinas compradas" valor={c.valorMaquinas} formato={reais} sub={`${c.qtdTratores} trator(es) · ${c.qtdImplementos} impl.`} cor="#2563eb" icone={Tractor} onClick={() => trocar('maquinas')} atraso={60} />
        <Kpi titulo="Peças em 12 meses" valor={c.pecas12m} formato={reais} sub={varPecas == null ? `${c.pedidosPecas12m} pedidos` : `${varPecas >= 0 ? 'subiu' : 'caiu'} ${Math.abs(varPecas)}% no ano`} alerta={varPecas != null && varPecas < 0} cor="#ea580c" icone={Package} onClick={() => trocar('historico')} atraso={110} />
        <Kpi titulo="Propostas abertas" valor={c.valorPropostasAbertas} formato={reais} sub={`${c.propostasAbertas} aberta(s) · ${c.propostasGanhas} ganha(s) · ${c.propostasPerdidas} perdida(s)`} cor="#16a34a" icone={FileText} onClick={() => trocar('propostas')} atraso={160} />
        <Kpi titulo="Mercado da cidade" valor={mun ? `foco ${mun.foco}` : 'fora da área'} sub={mun ? mun.culturaPrincipal : 'sem dados do IBGE'} cor="#dc2626" icone={Building2} onClick={() => trocar('mercado')} atraso={210} />
      </div>

      <Secao titulo="Por que ligar e o que oferecer" icone={Target} atraso={120}>
        {c.oportunidades.length === 0 && <p className="text-[13px] text-slate-500">Nenhum motivo agora.</p>}
        <div className="space-y-3">
          {c.oportunidades.map((x, i) => {
            const cor = REGRAS[x.regra].cor
            return (
              <div key={x.regra} className="iv-entra flex gap-3" style={{ animationDelay: `${180 + i * 80}ms` }}>
                <span className="w-9 h-9 shrink-0 rounded-xl grid place-items-center" style={{ background: `${cor}16`, color: cor }}><Icone nome={ICONE_REGRA[x.regra]} size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <b className="text-[14px] text-slate-900 leading-snug flex-1">{x.titulo}</b>
                    <span className="text-[11.5px] font-bold text-slate-400 whitespace-nowrap">+{x.peso}</span>
                  </div>
                  <div className="text-[12.5px] text-slate-500 leading-snug">{x.porque}</div>
                  <div className="text-[13px] font-bold leading-snug mt-1 flex gap-1" style={{ color: cor }}><ArrowRight size={14} className="mt-[2px] shrink-0" aria-hidden="true" /> {x.oferecer}</div>
                </div>
              </div>
            )
          })}
        </div>
      </Secao>

      {f.retorno.length > 0 && (
        <Secao titulo="Esperando retorno nosso" icone={CalendarClock} atraso={160} direita={<Selo cor="#dc2626" cheio>{f.retorno.length}</Selo>}>
          <div className="space-y-2">
            {f.retorno.map((r) => (
              <div key={`${r.origem}-${r.id}`} className="rounded-xl bg-slate-50 p-2.5">
                <div className="flex items-center gap-2"><Selo cor={COR_MOTIVO[r.motivo]}>{ROTULO_MOTIVO[r.motivo]}</Selo>{r.valor > 0 && <b className="text-[12.5px] text-slate-700 ml-auto">{reais(r.valor)}</b>}</div>
                <div className="text-[13px] font-semibold text-slate-800 mt-1">{r.oque || r.fase}</div>
                <div className="text-[12px] text-slate-500">{r.detalhe}</div>
              </div>
            ))}
          </div>
        </Secao>
      )}

      <Secao titulo="Peças: este ano × ano anterior" icone={Package} atraso={200}>
        {[{ t: 'Últimos 12 meses', v: c.pecas12m, n: c.pedidosPecas12m, cor: '#ea580c' }, { t: '12 a 24 meses atrás', v: c.pecas12a24m, n: c.pedidosPecas12a24m, cor: '#94a3b8' }].map((x, i) => (
          <div key={x.t} className="mb-2.5 last:mb-0">
            <div className="flex justify-between text-[12.5px] mb-1"><span className="text-slate-600">{x.t} · {x.n} pedidos</span><b className="text-slate-900">{reais(x.v)}</b></div>
            <Barra pct={(x.v / maxP) * 100} cor={x.cor} atraso={250 + i * 100} />
          </div>
        ))}
        <div className="text-[12px] text-slate-500 mt-2">Última compra de peças: {dataBR(c.ultimaCompraPecas)}</div>
      </Secao>

      {(f.indicacoes.length > 0 || f.imoveis.length > 0) && (
        <Secao titulo="Indicações e propriedades" icone={Handshake} atraso={240}>
          {f.indicacoes.map((i) => (
            <div key={i.id} className="flex gap-2 items-start mb-2">
              <Users size={15} className="mt-0.5 text-violet-600 shrink-0" aria-hidden="true" />
              <div className="text-[13px] text-slate-700 leading-snug">Indicou <b>{i.indicado_nome}</b> ({i.indicado_cidade}) · {i.interesse} <Selo cor="#7c3aed">{i.status}</Selo></div>
            </div>
          ))}
          {f.imoveis.map((p) => (
            <div key={p.cod} className="flex gap-2 items-start mb-2 last:mb-0">
              <MapPin size={15} className="mt-0.5 text-emerald-600 shrink-0" aria-hidden="true" />
              <div className="text-[13px] text-slate-700 leading-snug">Imóvel no CAR: <b>{mil(p.areaHa)} ha</b>{p.cultura ? ` de ${p.cultura.toLowerCase()}` : ''} em {p.municipio}{p.investimento ? ` · ${reais(p.investimento)} de crédito para investir` : ''}</div>
            </div>
          ))}
        </Secao>
      )}
    </div>
  )
}

// ── Máquinas ────────────────────────────────────────────────────────────────
export function AbaMaquinas({ f }) {
  const c = f.cliente
  const frota = c.frota || []
  const nossas = frota.filter((m) => m.nossa || m.marca === 'Mahindra').length
  const pct = frota.length ? (nossas / frota.length) * 100 : 0
  const maxH = Math.max(10000, ...frota.map((m) => m.horimetro || 0))
  return (
    <div className="space-y-3">
      <Secao titulo="Frota no campo" icone={Tractor}>
        {frota.length === 0 ? <p className="text-[13px] text-slate-500">Sem frota registrada no CRM.</p> : (
          <>
            <div className="flex items-center gap-4 mb-3">
              <Rosca pct={pct} cor="#dc2626" rotulo="nossa marca" />
              <div className="text-[13px] text-slate-600 space-y-1">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> <b className="text-slate-900">{nossas}</b> Mahindra</div>
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-violet-600" /> <b className="text-slate-900">{frota.length - nossas}</b> outra marca</div>
                {c.maiorHorimetro != null && <div className="flex items-center gap-2"><Gauge size={14} aria-hidden="true" /> maior horímetro: <b className="text-slate-900">{mil(c.maiorHorimetro)} h</b></div>}
              </div>
            </div>
            <div className="space-y-2.5">
              {frota.map((m, i) => {
                const nossa = m.nossa || m.marca === 'Mahindra'
                const cor = nossa ? '#dc2626' : '#7c3aed'
                const idade = m.ano ? new Date().getFullYear() - m.ano : null
                return (
                  <div key={i} className="iv-entra rounded-xl border border-slate-200 p-3" style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-center gap-2.5">
                      <span className="w-10 h-10 shrink-0 rounded-xl grid place-items-center" style={{ background: `${cor}14`, color: cor }}><Tractor size={19} aria-hidden="true" /></span>
                      <div className="min-w-0 flex-1">
                        <b className="block text-[14px] text-slate-900 leading-tight">{m.marca} {m.modelo}</b>
                        <span className="text-[12px] text-slate-500">{m.ano ? `ano ${m.ano}${idade != null ? ` · ${idade} anos` : ''}` : 'ano não informado'}</span>
                      </div>
                      <Selo cor={cor}>{nossa ? 'Nossa' : 'Outra marca'}</Selo>
                    </div>
                    {m.horimetro != null && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[11.5px] text-slate-500 mb-1"><span>Horímetro</span><b className={m.horimetro >= 5000 ? 'text-red-600' : 'text-slate-800'}>{mil(m.horimetro)} h{m.horimetro >= 5000 ? ' · muito rodado' : ''}</b></div>
                        <Barra pct={(m.horimetro / maxH) * 100} cor={m.horimetro >= 5000 ? '#dc2626' : m.horimetro >= 3000 ? '#f59e0b' : '#16a34a'} atraso={200 + i * 80} alto={6} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Secao>

      <Secao titulo="Compradas conosco" icone={Banknote} atraso={80} direita={<b className="text-[13px] text-blue-700">{reais(c.valorMaquinas)}</b>}>
        {c.maquinas.length === 0 ? <p className="text-[13px] text-slate-500">Nenhuma máquina comprada conosco ainda.</p> : (
          <div className="divide-y divide-slate-100">
            {c.maquinas.map((m, i) => (
              <div key={i} className="flex items-center gap-2.5 py-2">
                <span className="text-slate-400">{m.tipo === 'trator' ? <Tractor size={17} aria-hidden="true" /> : <Wrench size={17} aria-hidden="true" />}</span>
                <div className="min-w-0 flex-1">
                  <b className="block text-[13.5px] text-slate-900 truncate">{m.modelo}</b>
                  <span className="text-[11.5px] text-slate-500">{dataBR(m.data)} · {m.tipo}</span>
                </div>
                <b className="text-[13px] text-slate-800 whitespace-nowrap">{reais(m.valor)}</b>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {c.marcasNaOficina.length > 0 && (
        <Secao titulo="Outras marcas na oficina" icone={Flag} atraso={140}>
          <div className="flex flex-wrap gap-1.5">{c.marcasNaOficina.map((m) => <Selo key={m} cor="#7c3aed">{m}</Selo>)}</div>
          <p className="text-[12.5px] text-slate-500 mt-2">Vistas nas OS da nossa oficina. Boa chance de apresentar a linha Mahindra.</p>
        </Secao>
      )}
      <Secao titulo="Oficina" icone={Wrench} atraso={180}>
        <div className="grid grid-cols-2 gap-2 text-[13px]">
          <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-[11px] text-slate-500 font-bold">OS em 12 meses</div><b className="text-[18px] text-slate-900">{c.os12m}</b></div>
          <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-[11px] text-slate-500 font-bold">Última OS</div><b className="text-[15px] text-slate-900">{dataBR(c.ultimaOS)}</b></div>
        </div>
      </Secao>
    </div>
  )
}

// ── Compras e visitas (linha do tempo) ──────────────────────────────────────
const TIPO_EVENTO = {
  maquina: { rotulo: 'Máquina', cor: '#2563eb', icone: Tractor },
  pecas: { rotulo: 'Peças', cor: '#ea580c', icone: Package },
  os: { rotulo: 'Oficina', cor: '#7c3aed', icone: Wrench },
  visita: { rotulo: 'Visita', cor: '#16a34a', icone: MapPin },
}
export function AbaHistorico({ f }) {
  const c = f.cliente
  const [filtro, setFiltro] = useState('')
  const eventos = useMemo(() => [
    ...(c.compras || []).map((x) => ({ ...x, chave: `${x.tipo}-${x.data}-${x.descricao}` })),
    ...(c.historicoVisitas || []).map((v) => ({ tipo: 'visita', chave: `v-${v.id}`, data: v.data_visita, descricao: v.resumo, proximos: v.proximos_passos, vendedor: v.vendedor, canal: v.tipo, prox: v.data_proximo_contato })),
  ].sort((a, b) => b.data.localeCompare(a.data)), [c])
  const lista = eventos.filter((e) => !filtro || e.tipo === filtro)
  return (
    <div>
      <Rolagem className="mb-3">
        <Chip ativo={!filtro} onClick={() => setFiltro('')} contagem={eventos.length}>Tudo</Chip>
        {Object.entries(TIPO_EVENTO).map(([k, t]) => {
          const n = eventos.filter((e) => e.tipo === k).length
          return n ? <Chip key={k} ativo={filtro === k} cor={t.cor} onClick={() => setFiltro(filtro === k ? '' : k)} contagem={n}><t.icone size={14} aria-hidden="true" /> {t.rotulo}</Chip> : null
        })}
      </Rolagem>
      {lista.length === 0 ? <Vazio>Nada registrado.</Vazio> : (
        <ol className="relative ml-4 border-l-2 border-slate-200 space-y-3 pb-1">
          {lista.map((e, i) => {
            const t = TIPO_EVENTO[e.tipo] || TIPO_EVENTO.pecas
            return (
              <li key={e.chave} className="iv-entra relative pl-5" style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}>
                <span className="absolute -left-[15px] top-2 w-7 h-7 rounded-full grid place-items-center text-white ring-4 ring-[#fefefe]" style={{ background: t.cor }}><t.icone size={14} aria-hidden="true" /></span>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-bold" style={{ color: t.cor }}>{t.rotulo}{e.canal ? ` · ${e.canal}` : ''}</span>
                    <span className="text-[11.5px] text-slate-400 ml-auto">{dataBR(e.data)}</span>
                  </div>
                  <div className="text-[13.5px] font-semibold text-slate-900 leading-snug mt-0.5">{e.descricao}</div>
                  {e.valor ? <div className="text-[12.5px] text-slate-600 mt-0.5">{reais(e.valor)}</div> : null}
                  {e.proximos && <div className="text-[12.5px] text-slate-600 mt-1 leading-snug"><b>Próximos passos:</b> {e.proximos}</div>}
                  {(e.vendedor || e.prox) && <div className="text-[11.5px] text-slate-400 mt-1">{e.vendedor}{e.prox ? ` · retorno combinado ${dataBR(e.prox)}` : ''}</div>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ── Propostas ───────────────────────────────────────────────────────────────
export function AbaPropostas({ f }) {
  const c = f.cliente
  const props = [...(c.propostasLista || [])].sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)))
  const st = (p) => (PERDIDA.test(p.status) ? { r: 'Perdida', cor: '#64748b' } : GANHA.test(p.status) ? { r: 'Ganha', cor: '#16a34a' } : { r: 'Em aberto', cor: '#ca8a04' })
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[{ t: 'Abertas', v: c.propostasAbertas, cor: '#ca8a04' }, { t: 'Ganhas', v: c.propostasGanhas, cor: '#16a34a' }, { t: 'Perdidas', v: c.propostasPerdidas, cor: '#64748b' }].map((x, i) => (
          <div key={x.t} className="iv-entra rounded-2xl border border-slate-200 bg-white p-3 text-center" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="text-[24px] font-extrabold tabular-nums" style={{ color: x.cor }}><Conta valor={x.v} /></div>
            <div className="text-[11.5px] font-bold text-slate-500">{x.t}</div>
          </div>
        ))}
      </div>
      {props.length === 0 ? <Vazio icone={FileText}>Nenhuma proposta para este cliente ainda.</Vazio> : props.map((p, i) => {
        const s = st(p)
        const ret = f.retorno.find((r) => r.origem === 'proposta' && String(r.id) === String(p.id))
        return (
          <Cartao key={p.id} className="p-3.5" atraso={100 + i * 60}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <b className="block text-[14.5px] text-slate-900 leading-tight">{p.oque || 'Proposta'}</b>
                <span className="text-[12px] text-slate-500">nº {p.id} · criada {dataBR(String(p.criado_em).slice(0, 10))}{p.fechado_em ? ` · fechada ${dataBR(String(p.fechado_em).slice(0, 10))}` : ''}</span>
              </div>
              <Selo cor={s.cor}>{s.r}</Selo>
            </div>
            <div className="flex items-center justify-between mt-2">
              <b className="text-[18px] text-slate-900">{reais(p.valor)}</b>
              <span className="text-[12px] text-slate-500 text-right max-w-[60%] truncate">{p.status}</span>
            </div>
            {p.concorrente && <div className="mt-2 text-[12.5px] text-slate-600 flex items-center gap-1.5"><Flag size={13} className="text-violet-600" aria-hidden="true" /> Perdida para <b>{p.concorrente}</b></div>}
            {ret && <div className="mt-2 rounded-xl p-2.5 text-[12.5px]" style={{ background: `${COR_MOTIVO[ret.motivo]}0f`, color: COR_MOTIVO[ret.motivo] }}><b>{ROTULO_MOTIVO[ret.motivo]}:</b> {ret.detalhe}</div>}
          </Cartao>
        )
      })}
      {f.perdas.length > 0 && (
        <Secao titulo="Perdas para a concorrência" icone={TriangleAlert} atraso={200}>
          {f.perdas.map((p) => (
            <div key={`${p.origem}-${p.id}`} className="text-[13px] text-slate-700 mb-1.5 last:mb-0">{dataBR(p.data)} · {p.oque} para <b>{p.concorrente || '—'}</b> ({p.motivo})</div>
          ))}
        </Secao>
      )}
    </div>
  )
}

// ── Mercado da cidade ───────────────────────────────────────────────────────
export function AbaMercado({ f }) {
  const c = f.cliente, mun = f.municipio, cid = f.cidade
  if (!mun) return <Vazio icone={Building2}>{c.cidade || 'A cidade do cliente'} está fora dos municípios da loja: sem dados do IBGE, do CAR e do crédito rural aqui.</Vazio>
  const maxV = Math.max(1, ...(cid?.valorCulturas || []).map((x) => x.valorMil))
  const maxS = Math.max(1, ...(cid?.serie || []).map((x) => x.valorMil))
  const ce = cid?.censo
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Kpi titulo="Foco da cidade" valor={mun.foco} sub="mercado grande × pouca presença" cor="#dc2626" icone={Target} />
        <Kpi titulo="População" valor={cid?.populacao?.valor || 0} formato={(v) => mil(v)} sub={cid?.populacao ? `IBGE ${cid.populacao.ano}` : 'sem dado'} cor="#2563eb" icone={Users} atraso={50} />
        <Kpi titulo="Agro no PIB" valor={cid?.pib ? `${cid.pib.agroPct.toLocaleString('pt-BR')}%` : '—'} sub={cid?.pib ? `PIB ${cid.pib.ano}` : ''} cor="#16a34a" icone={Sprout} atraso={100} />
        <Kpi titulo="Valor da produção" valor={mun.valorProducaoMil * 1000} formato={reais} sub={`${mil(mun.areaPlantadaHa)} ha plantados`} cor="#ea580c" icone={Banknote} atraso={150} />
      </div>

      <Secao titulo="Nossa presença lá" icone={Handshake} atraso={80}>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[{ t: 'Clientes', v: mun.clientes }, { t: 'Tratores vendidos', v: mun.tratoresVendidos }, { t: 'Oportunidades', v: mun.oportunidades }].map((x) => (
            <div key={x.t} className="rounded-xl bg-slate-50 p-2"><b className="block text-[18px] text-slate-900 tabular-nums"><Conta valor={x.v} /></b><span className="text-[11px] text-slate-500 font-semibold leading-tight">{x.t}</span></div>
          ))}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[12px] text-slate-600 mb-1"><span>Penetração (clientes ÷ imóveis rurais)</span><b>{(mun.penetracao * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</b></div>
          <Barra pct={mun.penetracao * 100} cor="#dc2626" atraso={200} />
        </div>
      </Secao>

      {ce && (
        <Secao titulo="Tratores na cidade (Censo Agro)" icone={Tractor} atraso={120}>
          <div className="flex items-center gap-4">
            <Rosca pct={ce.semTratorPct * 100} cor="#dc2626" rotulo="sem trator" />
            <div className="text-[13px] text-slate-600 space-y-0.5">
              <div><b className="text-slate-900">{mil(ce.propriedades)}</b> propriedades</div>
              <div><b className="text-slate-900">{mil(ce.comTrator)}</b> com trator ({mil(ce.tratores)} tratores)</div>
              <div><b className="text-slate-900">{mil(ce.menos100cv)}</b> com menos de 100 cv</div>
              <div><b className="text-slate-900">{mil(ce.mais100cv)}</b> com 100 cv ou mais</div>
            </div>
          </div>
        </Secao>
      )}

      {cid?.valorCulturas?.length > 0 && (
        <Secao titulo={`O que a cidade produz (${cid.anoAgro})`} icone={Sprout} atraso={160}>
          {cid.valorCulturas.map((x, i) => (
            <div key={x.nome} className="mb-2 last:mb-0">
              <div className="flex justify-between text-[12.5px] mb-1"><span className="text-slate-700 font-semibold">{x.nome}</span><span className="text-slate-500">{reais(x.valorMil * 1000)}</span></div>
              <Barra pct={(x.valorMil / maxV) * 100} cor="#16a34a" atraso={200 + i * 70} />
            </div>
          ))}
        </Secao>
      )}

      {cid?.serie?.length > 0 && (
        <Secao titulo="Evolução do valor da produção" icone={TrendingUp} atraso={200}>
          <div className="flex items-end gap-2 h-28">
            {cid.serie.map((x, i) => (
              <div key={x.ano} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[10px] text-slate-500 tabular-nums">{Math.round(x.valorMil / 1000)}</span>
                <span className="w-full rounded-t-lg iv-cresce" style={{ height: `${(x.valorMil / maxS) * 80}%`, background: i === cid.serie.length - 1 ? '#dc2626' : '#fca5a5', animationDelay: `${i * 70}ms`, transformOrigin: 'bottom' }} />
                <span className="text-[10.5px] text-slate-500">{x.ano}</span>
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-1">Em R$ milhões, IBGE (PAM).</p>
        </Secao>
      )}

      <Secao titulo="Crédito rural (SICOR)" icone={Banknote} atraso={220}>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-[11px] text-slate-500 font-bold">Crédito em 12 meses</div><b className="text-[16px] text-cyan-700">{reais(mun.credito12m)}</b></div>
          <div className="rounded-xl bg-slate-50 p-2.5"><div className="text-[11px] text-slate-500 font-bold">Investimento em 3 anos</div><b className="text-[16px] text-cyan-700">{reais(mun.invest36m)}</b><div className="text-[10.5px] text-slate-400">o que mais vira máquina</div></div>
        </div>
      </Secao>

      {cid?.rebanhos && (
        <Secao titulo="Pecuária" icone={Sprout} atraso={240}>
          <div className="flex flex-wrap gap-2">
            {cid.rebanhos.map((r) => <span key={r.nome} className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600"><b className="text-slate-900">{mil(r.cabecas)}</b> {r.nome.toLowerCase()}</span>)}
            {cid.leiteMilLitros > 0 && <span className="rounded-xl bg-slate-50 px-3 py-2 text-[12.5px] text-slate-600"><b className="text-slate-900">{mil(cid.leiteMilLitros)} mil L</b> de leite</span>}
          </div>
        </Secao>
      )}

      {cid?.concorrentes?.length > 0 && (
        <Secao titulo="Concorrência na cidade" icone={Flag} atraso={260}>
          {cid.concorrentes.map((x) => (
            <div key={x.nome} className="flex items-center gap-2 text-[13px] mb-1.5 last:mb-0">
              <TrendingDown size={14} className="text-violet-600" aria-hidden="true" />
              <b className="text-slate-900">{x.nome}</b><span className="text-slate-500">{x.perdas} perda(s) · {reais(x.valor)} · última {dataBR(x.ultima)}</span>
            </div>
          ))}
        </Secao>
      )}

      {mun.linhas?.length > 0 && (
        <Secao titulo="O que vender lá" icone={Lightbulb} atraso={280}>
          <ul className="space-y-1.5">{mun.linhas.map((l) => <li key={l} className="flex gap-2 text-[13px] text-slate-700"><ArrowRight size={14} className="mt-[3px] text-red-600 shrink-0" aria-hidden="true" /> {l}</li>)}</ul>
        </Secao>
      )}

      {cid?.clima?.length > 0 && (
        <Secao titulo={`Tempo em ${mun.nome}`} icone={CloudRain} atraso={300}>
          {cid.alertasClima?.length > 0 && <div className="mb-2 rounded-xl bg-sky-50 text-sky-800 text-[12.5px] font-semibold px-3 py-2">{cid.alertasClima.join(' · ')}</div>}
          <div className="grid grid-cols-7 gap-1 text-center">
            {cid.clima.map((d) => (
              <div key={d.data} className="rounded-xl bg-slate-50 py-1.5">
                <div className="text-[10px] text-slate-500 font-bold">{dataCurta(d.data)}</div>
                <div className="h-10 flex items-end justify-center my-1"><span className="w-3 rounded-t bg-sky-500" style={{ height: `${Math.max(6, Math.min(100, d.chuvaMm * 3))}%`, opacity: 0.4 + d.prob / 170 }} /></div>
                <div className="text-[10px] font-bold text-sky-700">{d.chuvaMm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}mm</div>
                <div className="text-[10px] text-slate-500">{d.tmax}°</div>
              </div>
            ))}
          </div>
        </Secao>
      )}
      <p className="text-[11px] text-slate-400 text-center" style={{ borderColor: BD }}>Fontes: IBGE, Censo Agro 2017, SICOR/Bacen, CAR e propostas da Nova.</p>
    </div>
  )
}

