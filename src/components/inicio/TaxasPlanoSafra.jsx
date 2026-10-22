// Início: TODAS as taxas do Plano Safra num carrossel (da menor para a maior). Tocar abre
// os detalhes da linha: para quem é, o que financia, limite, prazo, carência, vigência,
// quem conferiu, aviso de nova leitura do robô, simular na calculadora e a página do BNDES.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calculator, ExternalLink, Landmark, TriangleAlert } from 'lucide-react'
import { TituloBloco } from './blocos'
import Folha, { Dado } from './Folha'

const PROGRAMAS = {
  moderfrota: { nome: 'Moderfrota', cor: '#b91c1c', fundo: '#fef2f2' },
  pronaf: { nome: 'Pronaf', cor: '#15803d', fundo: '#f0fdf4' },
  pronamp: { nome: 'Pronamp', cor: '#1d4ed8', fundo: '#eff6ff' },
  inovagro: { nome: 'Inovagro', cor: '#7c3aed', fundo: '#f5f3ff' },
}
const prog = (p) => PROGRAMAS[p] || { nome: p, cor: '#475569', fundo: '#f1f5f9' }
const pct = (v) => `${String(v).replace('.', ',')}%`
const taxaTxt = (l) => (l.taxa_aa_max ? `${pct(l.taxa_aa)} a ${pct(l.taxa_aa_max)}` : pct(l.taxa_aa))
const dataBR = (d) => (d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR') : '')
const subtitulo = (nome) => (nome.includes('—') ? nome.split('—').slice(1).join('—').trim() : '')

export default function TaxasPlanoSafra() {
  const navigate = useNavigate()
  const [dados, setDados] = useState(null)
  const [aberta, setAberta] = useState(null)
  useEffect(() => {
    let vivo = true
    import('../../lib/iv/fonte').then((f) => f.carregarPlanoSafra()).then((d) => { if (vivo) setDados(d) }).catch(() => { if (vivo) setDados(false) })
    return () => { vivo = false }
  }, [])

  const vigentes = useMemo(() => (dados?.linhas || []).filter((l) => l.status !== 'proposta').sort((a, b) => a.taxa_aa - b.taxa_aa), [dados])
  const propostas = useMemo(() => new Map((dados?.linhas || []).filter((l) => l.status === 'proposta' && l.proposta_de).map((l) => [l.proposta_de, l])), [dados])
  if (dados === false || (dados && !vigentes.length)) return null

  const simular = (l) => navigate(`/inteligencia/calculadora?taxa=${l.taxa_aa}&prazo=${l.prazo_anos * 12}&carencia=${l.carencia_meses}&linha=${encodeURIComponent(l.nome)}`)
  const safra = vigentes[0]?.safra

  return (
    <section className="mb-5">
      <TituloBloco icone={Landmark} titulo={`Taxas do Plano Safra${safra ? ` ${safra}` : ''}`} acao="Todas" onAcao={() => navigate('/inteligencia/noticias')} />
      <div className="flex gap-2.5 overflow-x-auto snap-x -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
        {!dados && [0, 1, 2].map((i) => <div key={i} className="snap-start shrink-0 w-40 h-32 rounded-2xl bg-slate-100 animate-pulse" />)}
        {vigentes.map((l, i) => {
          const p = prog(l.programa)
          const nova = propostas.get(l.id)
          return (
            <button
              key={l.id}
              onClick={() => setAberta(l)}
              className="ini-entra snap-start shrink-0 w-44 text-left bg-white border border-slate-200 rounded-2xl p-3 active:scale-[0.98] transition flex flex-col"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="self-start text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5" style={{ background: p.fundo, color: p.cor }}>{p.nome}</span>
              <span className="mt-2 text-2xl font-black leading-none" style={{ color: p.cor }}>{taxaTxt(l)}</span>
              <span className="text-[10px] font-semibold text-slate-400">ao ano</span>
              <span className="mt-1.5 text-xs font-semibold text-slate-700 leading-snug line-clamp-2 min-h-[2rem]">{subtitulo(l.nome) || l.financia}</span>
              <span className="mt-1 text-[11px] text-slate-500">{l.prazo_anos} anos · carência {l.carencia_meses} m</span>
              {nova && (
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-full px-1.5 py-0.5 self-start">
                  <TriangleAlert size={11} /> nova taxa a conferir
                </span>
              )}
            </button>
          )
        })}
      </div>

      <Folha aberta={!!aberta} onFechar={() => setAberta(null)} sobretitulo={aberta ? `${prog(aberta.programa).nome} · safra ${aberta.safra}` : ''} cor={aberta ? prog(aberta.programa).cor : undefined} titulo={aberta?.nome || ''}>
        {aberta && (() => {
          const p = prog(aberta.programa)
          const nova = propostas.get(aberta.id)
          return (
            <>
              <div className="grid grid-cols-3 gap-2">
                {[['Taxa', `${taxaTxt(aberta)} a.a.`], ['Prazo', `${aberta.prazo_anos} anos`], ['Carência', `${aberta.carencia_meses} meses`]].map(([r, v]) => (
                  <div key={r} className="rounded-xl p-2.5 text-center" style={{ background: p.fundo }}>
                    <p className="text-[10px] font-bold uppercase text-slate-500">{r}</p>
                    <p className="text-base font-black leading-tight" style={{ color: p.cor }}>{v}</p>
                  </div>
                ))}
              </div>
              {nova && (
                <div className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
                  <TriangleAlert size={16} className="shrink-0 mt-0.5" />
                  <p className="text-sm leading-snug"><b>Nova leitura do robô: {taxaTxt(nova)} a.a.</b> {nova.observacao} Até alguém conferir, vale a taxa acima.</p>
                </div>
              )}
              <Dado rotulo="Para quem é">{aberta.publico}</Dado>
              <Dado rotulo="O que financia">{aberta.financia}</Dado>
              <Dado rotulo="Quanto financia">{[aberta.limite, aberta.participacao_pct ? `até ${aberta.participacao_pct}% do valor` : null].filter(Boolean).join(' · ')}</Dado>
              <Dado rotulo="Vigência">{aberta.vigencia_de ? `${dataBR(aberta.vigencia_de)} a ${dataBR(aberta.vigencia_ate)}` : aberta.observacao}</Dado>
              <Dado rotulo="Conferido">{aberta.conferido_em ? `${dataBR(aberta.conferido_em)}${aberta.conferido_por ? ` · ${aberta.conferido_por}` : ''}` : 'ainda não conferido'}</Dado>
              <button onClick={() => simular(aberta)} className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-2xl font-bold active:bg-blue-800">
                <Calculator size={18} /> Simular na calculadora
              </button>
              {aberta.fonte_url && (
                <a href={aberta.fonte_url} target="_blank" rel="noreferrer" className="w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-blue-700 border border-slate-200 rounded-2xl py-2.5">
                  <ExternalLink size={15} /> Página oficial do BNDES
                </a>
              )}
            </>
          )
        })()}
      </Folha>
    </section>
  )
}
