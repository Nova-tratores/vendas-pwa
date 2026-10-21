// =============================================================================
// Inteligência de Vendas > Notícias (app do vendedor).
// Espelho da opção "Jornal" do Portal (BoletimOpcoes.tsx, escolhida pelo José em 19/10/2026):
// manchete do dia, cotações, destaques com foto, lista com miniaturas, matéria inteira em
// tela cheia, Plano Safra, clima das notícias, previsões do Focus e tempo na região.
// Adaptado ao celular: tudo numa coluna, na ordem de uso do vendedor.
// =============================================================================
import { useMemo, useState } from 'react'
import { Bot, CircleHelp, Coffee, TrendingDown, TrendingUp, Zap } from 'lucide-react'
import Icone from '../../components/Icone'
import { CabecalhoIV, CarregandoIV, ErroIV, useDados } from '../../components/iv/kit'
import { carregarNoticias, carregarPlanoSafra, hojeISO } from '../../lib/iv/fonte'
import { CATEGORIAS, ESTILO, TEND, dataLonga, haQuanto, rotuloDia } from '../../components/iv/noticias/util'
import { FaixaCotacoes, Indicadores } from '../../components/iv/noticias/Cotacoes'
import { ClimaNoticias, Fontes, Previsoes, TempoRegiao } from '../../components/iv/noticias/Paineis'
import { CartaoDestaque, ItemLista } from '../../components/iv/noticias/Itens'
import { PainelPlanoSafra } from '../../components/iv/noticias/PlanoSafra'
import ModalMateria from '../../components/iv/noticias/ModalMateria'
import ComoLer from '../../components/iv/noticias/ComoLer'

function DataBoletim({ b, hoje }) {
  const dt = new Date(`${b.dia}T12:00:00`)
  const gerado = b.geradoEm ? new Date(b.geradoEm) : null
  const semana = ((b.dia === hoje ? 'hoje, ' : '') + dt.toLocaleDateString('pt-BR', { weekday: 'long' })).replace(/^./, (x) => x.toUpperCase())
  return (
    <div key={b.dia} className="ntv-sobe flex items-center gap-3">
      <div className="w-[54px] rounded-xl overflow-hidden text-center bg-white border border-slate-200 shadow-[0_6px_16px_rgba(15,23,42,.08)] shrink-0">
        <span className="block bg-[#dc2626] text-[#fefefe] text-[10.5px] font-black uppercase tracking-widest py-0.5">{dt.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
        <b className="block text-[24px] font-black text-slate-900 leading-tight pb-0.5">{dt.getDate()}</b>
      </div>
      <div className="min-w-0">
        <div className="text-[19px] font-black text-slate-900 tracking-tight leading-tight">{semana}</div>
        <div className="text-[13px] text-slate-500 font-semibold">{dataLonga(b.dia)}</div>
        {gerado && (
          <div className="flex items-center gap-1 text-[11.5px] text-green-700 font-bold mt-0.5">
            <Bot size={13} aria-hidden="true" /> atualizado às {gerado.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {haQuanto(b.geradoEm)}
          </div>
        )}
      </div>
    </div>
  )
}

function Filtros({ ns, fCat, setFCat, fTend, setFTend }) {
  const conta = (k) => ns.filter((n) => n.categoria === k).length
  const chip = (on, cor) => ({ borderColor: on ? cor : '#e2e8f0', background: on ? cor : '#fefefe', color: on ? '#fefefe' : '#0f172a' })
  return (
    <div className="flex gap-1.5 overflow-x-auto ntv-sem-barra -mx-4 px-4 py-1" role="toolbar" aria-label="Filtrar notícias">
      <button type="button" onClick={() => setFCat('')} className="shrink-0 border rounded-full px-3 py-1.5 text-[13px] font-semibold transition" style={chip(!fCat, '#111111')}>
        Todas <b className="opacity-60 ml-0.5">{ns.length}</b>
      </button>
      {Object.entries(CATEGORIAS).filter(([k]) => conta(k)).map(([k, c]) => {
        const on = fCat === k
        return (
          <button key={k} type="button" onClick={() => setFCat(on ? '' : k)} aria-pressed={on}
            className="shrink-0 inline-flex items-center gap-1 border rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition" style={chip(on, c.cor)}>
            <span style={{ color: on ? '#fefefe' : c.cor }} className="inline-flex"><Icone nome={c.icone} size={13} /></span> {c.nome} <b className="opacity-60">{conta(k)}</b>
          </button>
        )
      })}
      <span className="shrink-0 w-px my-1 bg-slate-200" />
      {['boa', 'ruim'].map((t) => {
        const on = fTend === t
        const I = t === 'boa' ? TrendingUp : TrendingDown
        return (
          <button key={t} type="button" onClick={() => setFTend(on ? '' : t)} aria-pressed={on}
            className="shrink-0 inline-flex items-center gap-1 border rounded-full px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition" style={chip(on, TEND[t].cor)}>
            <I size={13} style={{ color: on ? '#fefefe' : TEND[t].cor }} aria-hidden="true" /> {t === 'boa' ? 'Só as boas' : 'Só as de atenção'}
          </button>
        )
      })}
    </div>
  )
}

const Separador = ({ children }) => (
  <div className="text-[11.5px] font-black tracking-widest uppercase text-slate-500 pt-3 pb-1.5 border-b border-slate-200">{children}</div>
)

export default function NoticiasIV() {
  const [dia, setDia] = useState('')
  const [fCat, setFCat] = useState('')
  const [fTend, setFTend] = useState('')
  const [aberta, setAberta] = useState(null)
  const [ajuda, setAjuda] = useState(false)
  const { dados: b, carregando, erro, recarregar } = useDados(() => carregarNoticias(dia || undefined), [dia])
  const { dados: ps } = useDados(carregarPlanoSafra, [])
  const hoje = hojeISO()

  const ns = useMemo(() => b?.noticias ?? [], [b])
  const filtrando = !!(fCat || fTend)
  const filtradas = ns.filter((n) => (!fCat || n.categoria === fCat) && (!fTend || n.tendencia === fTend))
  const destaques = ns.filter((n) => n.destaque).slice(0, 3)
  const resto = ns.filter((n) => !destaques.includes(n))
  const abrir = (n) => setAberta(ns.indexOf(n))
  const trocarDia = (d) => { setDia(d); setAberta(null) }

  const botaoAjuda = (
    <button type="button" onClick={() => setAjuda(true)}
      className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-slate-700 active:bg-slate-50">
      <CircleHelp size={16} aria-hidden="true" /> Como ler
    </button>
  )

  return (
    <div className="space-y-4">
      <style>{ESTILO}</style>
      <CabecalhoIV titulo="Notícias do agro" subtitulo="Boletim do dia e Plano Safra" direita={botaoAjuda} />

      {!b && carregando && <CarregandoIV linhas={5} />}
      {erro && <ErroIV erro={erro} onTentar={recarregar} />}

      {b && (
        <div className={`space-y-4 transition-opacity ${carregando ? 'opacity-60' : ''}`} aria-busy={carregando || undefined}>
          <DataBoletim b={b} hoje={hoje} />

          {b.dias?.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto ntv-sem-barra -mx-4 px-4" role="tablist" aria-label="Dia do boletim">
              {b.dias.slice(0, 7).map((d) => {
                const on = d === b.dia
                return (
                  <button key={d} type="button" role="tab" aria-selected={on} onClick={() => trocarDia(d)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-bold border transition ${on ? 'bg-[#111111] text-[#fefefe] border-[#111111]' : 'bg-white text-slate-500 border-slate-200'}`}>
                    {rotuloDia(d, hoje)}
                  </button>
                )
              })}
            </div>
          )}

          <FaixaCotacoes ind={b.indicadores || []} focus={b.previsoes?.focus || []} />

          {!ns.length && (
            <div className="grid justify-items-center gap-2 text-center py-10 px-5 text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl">
              <Coffee size={32} className="opacity-50" aria-hidden="true" />
              <b className="text-[17px] text-slate-900">Ainda não tem boletim neste dia</b>
              <span className="text-[13.5px]">O robô monta o boletim todo dia às 06:30.</span>
            </div>
          )}

          {ns.length > 0 && (
            <>
              {!filtrando && b.manchete && (
                <section key={`m${b.dia}`} className="ntv-sobe border-b-[3px] border-[#111111] pb-3.5">
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-black tracking-widest uppercase text-[#dc2626]">
                    <Zap size={13} aria-hidden="true" /> Manchete do dia
                  </span>
                  <h1 className="mt-1.5 mb-2 text-[25px] leading-[1.15] font-black tracking-tight text-slate-900">{b.manchete.titulo}</h1>
                  <p className="m-0 text-[15.5px] leading-normal text-slate-600">{b.manchete.resumo}</p>
                </section>
              )}

              {!filtrando && destaques.length > 0 && (
                <div key={`d${b.dia}`} className="grid gap-3">
                  {destaques.map((n, i) => <CartaoDestaque key={n.id} n={n} i={i} onAbrir={() => abrir(n)} />)}
                </div>
              )}

              <ClimaNoticias ns={ns} fTend={fTend} setFTend={setFTend} />

              <div>
                <Filtros ns={ns} fCat={fCat} setFCat={setFCat} fTend={fTend} setFTend={setFTend} />
                <div key={`${fCat}${fTend}${b.dia}`}>
                  {filtrando ? (
                    <>
                      <Separador>{filtradas.length} notícia{filtradas.length === 1 ? '' : 's'} no filtro</Separador>
                      {filtradas.map((n, i) => <ItemLista key={n.id} n={n} i={i} onAbrir={() => abrir(n)} />)}
                      {!filtradas.length && <div className="text-slate-500 italic text-[14px] py-6 text-center">Nenhuma notícia com esse filtro.</div>}
                    </>
                  ) : resto.length > 0 && (
                    <>
                      <Separador>Mais notícias</Separador>
                      {resto.map((n, i) => <ItemLista key={n.id} n={n} i={i} onAbrir={() => abrir(n)} />)}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <PainelPlanoSafra ps={ps} />
          <Indicadores ind={b.indicadores || []} />
          <Previsoes focus={b.previsoes?.focus} />
          <TempoRegiao clima={b.previsoes?.clima} />
          <Fontes fontes={b.fontes} />
        </div>
      )}

      {aberta != null && ns[aberta] && <ModalMateria lista={ns} i={aberta} onTrocar={setAberta} onFechar={() => setAberta(null)} />}
      {ajuda && <ComoLer onFechar={() => setAjuda(false)} />}
    </div>
  )
}
