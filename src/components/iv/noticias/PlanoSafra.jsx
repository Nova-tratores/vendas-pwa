// Plano Safra no boletim: um bloco por programa (abre/fecha), menor taxa em destaque,
// linhas com taxa, prazo e carência, "Simular" leva à calculadora. "Ver todas" abre a lista completa.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Bot, Calculator, CalendarDays, ChevronDown, CircleHelp, ExternalLink, Hourglass, Landmark, Percent, Satellite, UserCheck } from 'lucide-react'
import { ORDEM_PROGRAMAS, PARA_QUEM, haQuanto, linhaServeMaquina, linkCalculadora, pct, prog, useConta } from './util'
import { Folha } from './Pecas'

const posProg = (x) => { const i = ORDEM_PROGRAMAS.indexOf(x); return i < 0 ? 99 : i }
const curto = (l) => l.nome.replace(/^[^—–-]*[—–-]\s*/, '').replace(/^\w/, (x) => x.toUpperCase()) || l.nome
const faixaTaxa = (l) => `${pct(l.taxa_aa)}${l.taxa_aa_max != null && l.taxa_aa_max !== l.taxa_aa ? ` a ${pct(l.taxa_aa_max)}` : ''}`
const quando = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

function TaxaConta({ v, casas = 1 }) {
  const x = useConta(v ?? 0, 900)
  if (v == null) return '—'
  return <>{x.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: 2 })}%</>
}

function SeloProposta() {
  return (
    <span className="ntv-pulso inline-flex items-center gap-1 text-[10.5px] font-extrabold uppercase tracking-wide text-amber-800 bg-amber-100 rounded-full px-2 py-0.5 whitespace-nowrap">
      <Bell size={11} aria-hidden="true" /> a conferir
    </span>
  )
}

function LinhaCredito({ l, onSimular }) {
  const p = prog(l.programa)
  const proposta = l.status === 'proposta'
  return (
    <div className={`rounded-xl p-2.5 ${proposta ? 'bg-amber-50 ring-1 ring-amber-200' : ''}`}>
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-2.5 items-center">
        <b className="text-[15px] tabular-nums leading-tight" style={{ color: p.cor }}>{faixaTaxa(l)}</b>
        <span className="text-[13px] leading-snug text-slate-900 min-w-0">
          {curto(l)}
          <small className="block text-[11.5px] text-slate-500 mt-0.5">
            {[l.prazo_anos ? `${l.prazo_anos.toLocaleString('pt-BR')} anos` : '', l.carencia_meses ? `carência ${l.carencia_meses} m` : '', l.participacao_pct ? `financia ${pct(l.participacao_pct)}` : ''].filter(Boolean).join(' · ')}
          </small>
        </span>
        <button type="button" onClick={() => onSimular(l)}
          className="ntv-toque inline-flex items-center gap-1 text-[12px] font-bold rounded-lg px-2.5 py-1.5 border"
          style={{ color: p.cor, borderColor: `color-mix(in srgb, ${p.cor} 35%, #e2e8f0)` }}>
          <Calculator size={13} aria-hidden="true" /> Simular
        </button>
      </div>
      {proposta && (
        <div className="flex items-start gap-1.5 mt-2 text-[11.5px] text-amber-900 leading-snug">
          <SeloProposta /> <span>{l.observacao || 'Leitura nova do robô; falta alguém conferir.'} Ainda não vale como taxa oficial.</span>
        </div>
      )}
    </div>
  )
}

function Programa({ g, ls, aberto, onAlternar, onSimular, k }) {
  const p = prog(g)
  const vig = ls.filter((l) => l.status === 'vigente')
  const menor = (vig.length ? vig : ls).find((l) => l.taxa_aa != null)
  const temProposta = ls.some((l) => l.status === 'proposta')
  return (
    <div className="ntv-sobe rounded-xl border overflow-hidden transition-shadow" style={{ borderColor: aberto ? `color-mix(in srgb, ${p.cor} 45%, #e2e8f0)` : '#e2e8f0', boxShadow: aberto ? '0 8px 20px rgba(15,23,42,.08)' : 'none', animationDelay: `${k * 60}ms` }}>
      <button type="button" onClick={onAlternar} aria-expanded={aberto} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-slate-50">
        <span className="w-2.5 h-2.5 rounded-[4px] shrink-0" style={{ background: p.cor }} />
        <span className="flex-1 min-w-0">
          <b className="block text-[14.5px] text-slate-900">{p.nome}</b>
          <small className="flex items-center gap-1.5 text-[11.5px] text-slate-500">{ls.length} linha{ls.length > 1 ? 's' : ''}{temProposta && <SeloProposta />}</small>
        </span>
        <span className="text-right leading-none">
          <small className="block text-[9.5px] font-bold uppercase tracking-wide text-slate-500 mb-0.5">a partir de</small>
          <b className="text-[20px] font-black tabular-nums" style={{ color: p.cor }}><TaxaConta v={menor?.taxa_aa} /></b>
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {aberto && (
        <div className="ntv-sobe border-t border-dashed border-slate-200 px-1.5 pt-1.5 pb-2" style={{ animationDuration: '.3s' }}>
          {PARA_QUEM[g] && (
            <div className="flex gap-2 text-[12.5px] leading-snug text-slate-700 rounded-lg px-2.5 py-2 mx-1 mb-1" style={{ background: `color-mix(in srgb, ${p.cor} 7%, transparent)` }}>
              <UserCheck size={15} className="shrink-0 mt-px" style={{ color: p.cor }} aria-hidden="true" /> {PARA_QUEM[g]}
            </div>
          )}
          {ls.map((l) => <LinhaCredito key={l.id} l={l} onSimular={onSimular} />)}
          {ls[0]?.fonte_url && (
            <a href={ls[0].fonte_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[12px] font-bold text-sky-700 px-2.5 pt-1.5">
              Página oficial no BNDES <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/** Bloco do Plano Safra (coluna da opção "Jornal" do Portal, adaptada ao celular). */
export function PainelPlanoSafra({ ps, atraso = 0 }) {
  const navigate = useNavigate()
  const [completo, setCompleto] = useState(false)
  const [ajuda, setAjuda] = useState(false)
  const linhas = useMemo(() => (ps?.linhas || []).filter((l) => (l.status === 'vigente' || l.status === 'proposta') && linhaServeMaquina(l))
    .sort((a, z) => (a.taxa_aa ?? 99) - (z.taxa_aa ?? 99)), [ps])
  const grupos = useMemo(() => [...new Set(linhas.map((l) => l.programa))].sort((a, z) => posProg(a) - posProg(z)), [linhas])
  const [aberto, setAberto] = useState(null)
  const abertoAgora = aberto ?? grupos[0] ?? ''
  const atualizado = linhas.map((l) => l.conferido_em).filter(Boolean).sort().pop() || null
  const propostas = linhas.filter((l) => l.status === 'proposta').length
  const simular = (l) => navigate(linkCalculadora(l))

  return (
    <section className="ntv-sobe bg-white border border-slate-200 rounded-2xl p-4" style={{ animationDelay: `${atraso}ms` }}>
      <div className="flex items-center gap-2">
        <span className="w-9 h-9 rounded-xl grid place-items-center bg-green-50 text-green-700 shrink-0"><Landmark size={18} aria-hidden="true" /></span>
        <div className="flex-1 min-w-0">
          <div className="text-[17px] font-black text-slate-900 leading-tight">Plano Safra <span className="text-slate-500 font-bold text-[14px]">{ps?.safra || ''}</span></div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-500 mt-0.5">
            <span className="inline-flex items-center gap-1 font-extrabold text-green-700 bg-green-100 rounded-full px-2 py-px"><Bot size={11} aria-hidden="true" /> automático</span>
            {ps?.lendo ? 'lendo o BNDES agora' : atualizado ? `conferido ${haQuanto(atualizado)}` : 'lido 2x por dia'}
          </div>
        </div>
        <button type="button" onClick={() => setAjuda((v) => !v)} aria-label="O que as taxas significam" aria-expanded={ajuda}
          className={`w-8 h-8 grid place-items-center rounded-full transition ${ajuda ? 'bg-slate-900 text-[#fefefe]' : 'text-slate-500 active:bg-slate-100'}`}>
          <CircleHelp size={17} aria-hidden="true" />
        </button>
      </div>

      {ajuda && (
        <div className="ntv-sobe mt-3 text-[12.5px] leading-snug text-slate-700 bg-slate-50 rounded-xl p-3 space-y-1.5">
          <div><b>% ao ano</b>: o juro do financiamento, fixo no contrato. Quanto menor, mais barata a parcela.</div>
          <div><b>A partir de</b>: a menor taxa do programa. A taxa certa depende do tamanho do produtor e do que ele vai comprar.</div>
          <div><b>Prazo</b>: tempo total para pagar. <b>Carência</b>: meses até a 1ª parcela.</div>
          <div><b>A conferir</b>: o robô leu um número novo no BNDES e ninguém conferiu ainda. Use a taxa vigente até aprovarem.</div>
          <div className="text-slate-500">Toque em <b>Simular</b> para abrir a Calculadora já com a taxa e o prazo.</div>
        </div>
      )}

      {propostas > 0 && (
        <div className="mt-3 flex items-center gap-2 text-[12.5px] text-amber-900 bg-amber-50 rounded-xl px-3 py-2">
          <Bell size={15} className="shrink-0" aria-hidden="true" />
          <span>{propostas === 1 ? '1 leitura nova do robô' : `${propostas} leituras novas do robô`} esperando conferência.</span>
        </div>
      )}

      {!linhas.length && <div className="text-[13.5px] text-slate-500 py-3">Ainda sem linhas: o robô faz a primeira leitura sozinho.</div>}
      <div className="grid gap-2 mt-3">
        {grupos.map((g, k) => (
          <Programa key={g} g={g} k={k} ls={linhas.filter((l) => l.programa === g)} aberto={abertoAgora === g}
            onAlternar={() => setAberto(abertoAgora === g ? '' : g)} onSimular={simular} />
        ))}
      </div>
      {linhas.length > 0 && (
        <button type="button" onClick={() => setCompleto(true)}
          className="ntv-toque mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-[13.5px] font-bold text-slate-800 active:bg-slate-50">
          Ver todas as linhas em detalhe
        </button>
      )}
      {completo && <PlanoSafraCompleto ps={ps} onSimular={simular} onFechar={() => setCompleto(false)} />}
    </section>
  )
}

/** Lista completa (espelho de PlanoSafra.tsx do Portal, só leitura no app). */
function PlanoSafraCompleto({ ps, onSimular, onFechar }) {
  const vigentes = (ps?.linhas || []).filter((l) => l.status === 'vigente')
  const propostas = (ps?.linhas || []).filter((l) => l.status === 'proposta')
  const programas = [...new Set([...vigentes, ...propostas].map((l) => l.programa))].sort((a, z) => posProg(a) - posProg(z))
  return (
    <Folha titulo={`Plano Safra ${ps?.safra || ''} · todas as linhas`} onFechar={onFechar} rotulo="Plano Safra completo">
      <div className="p-4 space-y-4 bg-slate-50 min-h-full">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[12px] text-slate-500 font-bold uppercase tracking-wider">Plano Safra</div>
            <div className="text-[30px] font-black text-slate-900 tracking-tight leading-none">{ps?.safra}</div>
          </div>
          {ps?.conferentes?.length > 0 && (
            <div className="ml-auto text-right">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Quem confere</div>
              <div className="text-[13.5px] font-bold text-slate-800">{ps.conferentes.map((c) => c.nome.split(' ')[0]).join(', ')}</div>
            </div>
          )}
        </div>

        {[...new Set(propostas.map((p) => p.programa))].map((pg) => {
          const novas = propostas.filter((p) => p.programa === pg)
          const velhas = vigentes.filter((v) => v.programa === pg)
          return (
            <section key={pg} className="ntv-sobe rounded-2xl bg-amber-50 border border-amber-200 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="ntv-pulso w-9 h-9 rounded-full grid place-items-center bg-amber-400 text-[#fefefe] shrink-0"><Bell size={17} aria-hidden="true" /></span>
                <div className="min-w-0">
                  <div className="text-[15.5px] font-extrabold text-slate-900">{prog(pg).nome}: o robô leu {velhas.length ? 'uma mudança' : 'as condições'}</div>
                  <div className="text-[12.5px] text-slate-600">Falta alguém conferir com a página oficial. Até lá, vale a taxa vigente.</div>
                </div>
              </div>
              {novas.map((nv, i) => {
                const antiga = velhas.find((v) => nv.nome.startsWith(v.nome)) || velhas[i]
                const mudou = antiga && antiga.taxa_aa !== nv.taxa_aa
                return (
                  <div key={nv.id} className="mt-2.5 bg-white rounded-xl border border-amber-200 p-3">
                    <div className="font-bold text-[14px] text-slate-900">{nv.nome}</div>
                    <div className="flex gap-3 flex-wrap mt-1 text-[13.5px] text-slate-700">
                      <span className={mudou ? 'bg-amber-200 rounded px-1' : ''}>Taxa <b>{faixaTaxa(nv)}</b>{mudou && <s className="text-slate-500 ml-1.5">{pct(antiga.taxa_aa)}</s>}</span>
                      <span>Prazo <b>{nv.prazo_anos ?? '—'} anos</b></span>
                      <span>Carência <b>{nv.carencia_meses ?? '—'} m</b></span>
                    </div>
                    {nv.observacao && <div className="text-[12px] text-slate-500 mt-1">{nv.observacao}</div>}
                    {nv.fonte_url && <a href={nv.fonte_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[12px] font-bold text-sky-700">Página oficial <ExternalLink size={12} aria-hidden="true" /></a>}
                  </div>
                )
              })}
            </section>
          )
        })}

        {programas.filter((pg) => vigentes.some((v) => v.programa === pg)).map((pg, gi) => {
          const p = prog(pg)
          return (
            <section key={pg} className="ntv-sobe bg-white border border-slate-200 rounded-2xl p-3.5" style={{ animationDelay: `${gi * 80}ms` }}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0" style={{ background: `color-mix(in srgb, ${p.cor} 12%, #fefefe)`, color: p.cor }}><Landmark size={18} aria-hidden="true" /></span>
                <div>
                  <div className="text-[17px] font-extrabold text-slate-900 leading-tight">{p.nome}</div>
                  <div className="text-[12.5px] text-slate-500">{p.frase}</div>
                </div>
              </div>
              <div className="grid gap-2.5">
                {vigentes.filter((v) => v.programa === pg).map((l) => (
                  <article key={l.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="text-[14px] font-extrabold text-slate-900 leading-snug">{l.nome}</div>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="text-[32px] font-black tracking-tight tabular-nums leading-none" style={{ color: p.cor }}><TaxaConta v={l.taxa_aa} /></span>
                      <span className="text-[13px] text-slate-500 font-bold">ao ano{l.taxa_aa_max ? ` até ${pct(l.taxa_aa_max)}` : ''}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {l.prazo_anos != null && <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 bg-slate-100 rounded-md px-2 py-0.5"><CalendarDays size={12} aria-hidden="true" /> {l.prazo_anos} anos</span>}
                      {l.carencia_meses != null && <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 bg-slate-100 rounded-md px-2 py-0.5"><Hourglass size={12} aria-hidden="true" /> carência {l.carencia_meses} m</span>}
                      {l.participacao_pct != null && <span className="inline-flex items-center gap-1 text-[11.5px] text-slate-600 bg-slate-100 rounded-md px-2 py-0.5"><Percent size={12} aria-hidden="true" /> financia {l.participacao_pct}%</span>}
                    </div>
                    {l.publico && <div className="text-[12.5px] text-slate-600 mt-2"><b>Para quem:</b> {l.publico}</div>}
                    {l.financia && <div className="text-[12.5px] text-slate-600 mt-0.5"><b>Financia:</b> {l.financia}</div>}
                    {l.limite && <div className="text-[12.5px] text-slate-600 mt-0.5"><b>Limite:</b> {l.limite}</div>}
                    <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                      <button type="button" onClick={() => onSimular(l)} className="ntv-toque inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-bold text-[#fefefe]" style={{ background: p.cor }}>
                        <Calculator size={14} aria-hidden="true" /> Usar na calculadora
                      </button>
                      {l.conferido_por && <span className="text-[11px] text-slate-400 ml-auto">conferido por {l.conferido_por.split(' ')[0]} · {quando(l.conferido_em)}</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )
        })}

        {ps?.fontes?.length > 0 && (
          <section className="bg-white border border-slate-200 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 text-[14.5px] font-extrabold text-slate-900 mb-2"><Satellite size={16} className="text-red-600" aria-hidden="true" /> Páginas oficiais vigiadas pelo robô</div>
            <div className="grid gap-1.5">
              {ps.fontes.map((f) => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2.5 py-2 bg-slate-50 text-[12.5px] text-slate-700 no-underline">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${f.erro ? 'bg-red-500' : 'bg-green-500'}`} />
                  <b className="flex-1 min-w-0 truncate">{f.nome}</b>
                  <span className="text-[11px] text-slate-500 text-right">{f.erro ? `erro: ${f.erro}` : `lida ${quando(f.verificado_em)}`}{f.mudou_em ? ` · mudou ${quando(f.mudou_em)}` : ''}</span>
                </a>
              ))}
            </div>
            <p className="text-[12px] text-slate-500 mt-2 leading-snug">O robô lê essas páginas duas vezes por dia. Se as condições mudarem, a IA propõe os números novos e quem confere recebe um aviso.</p>
          </section>
        )}
      </div>
    </Folha>
  )
}
