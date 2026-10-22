// Resumo de sexta: a semana do vendedor em 4 telas deslizáveis (estilo
// retrospectiva): números × semana anterior, melhor visita, selos + XP, missões.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Trator from '../components/gamificacao/Trator'
import { carregarResumoSemana } from '../lib/gamificacaoLocal'
import { confete } from '../lib/recompensas'

function Seta({ atual, antes }) {
  if (atual === antes) return <span className="text-white/70">= igual à semana passada</span>
  const subiu = atual > antes
  return (
    <span className={subiu ? 'text-green-300' : 'text-amber-200'}>
      {subiu ? '▲' : '▼'} {Math.abs(atual - antes)} vs. semana passada ({antes})
    </span>
  )
}

function Tela({ cor, children }) {
  return (
    <section className="snap-center shrink-0 w-full h-full flex flex-col items-center justify-center text-center px-6 text-white" style={{ background: cor }}>
      {children}
    </section>
  )
}

export default function ResumoSemana() {
  const [r, setR] = useState(null)
  const [pagina, setPagina] = useState(0)

  useEffect(() => { carregarResumoSemana().then(setR).catch(() => setR(null)) }, [])
  useEffect(() => { if (pagina === 2 && r?.selos.length) confete({ dourado: true }) }, [pagina, r])

  if (!r) return <p className="p-4 text-sm text-slate-500">Montando o seu resumo…</p>
  const s = r.semana

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      <div className="flex gap-1 p-3 pr-12">
        {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= pagina ? 'bg-white' : 'bg-white/30'}`} />)}
      </div>
      <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory"
        onScroll={(e) => setPagina(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
        <Tela cor="#1e3a8a">
          <p className="text-sm text-white/70">Sua semana</p>
          <p className="text-6xl font-extrabold mt-2">{s.feitas}</p>
          <p className="text-lg">visita{s.feitas === 1 ? '' : 's'}</p>
          <p className="text-sm mt-1"><Seta atual={s.feitas} antes={r.anterior.feitas} /></p>
          <p className="text-4xl font-extrabold mt-6">{s.media}%</p>
          <p className="text-lg">nota média</p>
          <p className="text-sm mt-1"><Seta atual={s.media} antes={r.anterior.media} /></p>
          <p className="text-xs text-white/60 mt-8">deslize para o lado →</p>
        </Tela>

        <Tela cor="#166534">
          <p className="text-sm text-white/70">Sua melhor visita</p>
          {r.melhor ? (
            <>
              <p className="text-6xl font-extrabold mt-2">{r.melhor.n.nota}%</p>
              <p className="text-xl font-bold mt-2">{r.melhor.propriedade || 'Cliente'}</p>
              <p className="text-sm text-white/80">{new Date(r.melhor.v.data_visita).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
              {r.melhor.v.resumo && <p className="text-sm italic mt-4 max-w-sm">“{String(r.melhor.v.resumo).slice(0, 160)}”</p>}
            </>
          ) : <p className="text-lg mt-4">Nenhuma visita esta semana. A próxima é sua!</p>}
        </Tela>

        <Tela cor="#7c2d12">
          <p className="text-sm text-white/70">Selos da semana</p>
          {r.selos.length ? (
            <div className="grid grid-cols-2 gap-3 mt-4">
              {r.selos.map((x) => (
                <div key={x.key} className="bg-white/10 rounded-xl p-3">
                  <p className="text-3xl">{x.icone}</p>
                  <p className="font-bold text-sm">{x.nome}</p>
                  <p className="text-[11px] text-white/70">{x.desc}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm mt-3">Nenhum selo esta semana. Dá para buscar na próxima.</p>}
          <div className="mt-6"><Trator cv={r.nivel.cv} size={110} /></div>
          <p className="text-sm mt-1">+{s.xp} XP na semana · você é <b>{r.nivel.cv} cv</b></p>
          {r.nivel.proximo && <p className="text-xs text-white/70">faltam {r.nivel.faltaXp.toLocaleString('pt-BR')} XP para {r.nivel.proximo.cv} cv</p>}
        </Tela>

        <Tela cor="#334155">
          <p className="text-sm text-white/70">Missões da semana que vem</p>
          <ul className="mt-4 space-y-3 text-left max-w-sm">
            {r.missoes.map((m) => <li key={m.key} className="bg-white/10 rounded-xl p-3 text-sm">🎯 {m.texto}</li>)}
          </ul>
          <Link to="/dashboard" className="mt-8 bg-white text-slate-900 font-bold px-6 py-2.5 rounded-full">Bom fim de semana!</Link>
        </Tela>
      </div>
      <Link to="/dashboard" className="absolute top-2 right-4 text-white/80 text-xl" aria-label="Fechar">✕</Link>
    </div>
  )
}
