// Completude das visitas (fase 3): quanto cada vendedor registra de verdade.
// Mesma régua do card e do formulário (lib/completudeVisita). Números escritos
// junto de cada gráfico. Ranking entre vendedores fica de fora de propósito até
// a régua estar calibrada (senão gera preenchimento falso).
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getVisitas } from '../lib/supabaseQueries'
import VendedorAvatar from '../components/VendedorAvatar'
import { ITENS_NOTA, faixaNota, resumoPorVendedor, alertasCompletude, dataMaisDias } from '../lib/completudeVisita'

const PERIODOS = [
  { key: 'semana', label: 'Esta semana' },
  { key: '4sem', label: 'Últimas 4 semanas' },
  { key: 'mes', label: 'Este mês' },
]

function inicioPeriodo(key, hoje = new Date()) {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  if (key === 'semana') d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // segunda
  else if (key === '4sem') d.setDate(d.getDate() - 27)
  else d.setDate(1)
  return d
}

// % sem o campo → fundo vermelho de claro a escuro (uma cor só, valor escrito)
function corCalor(pct) {
  if (pct == null) return { bg: '#f8fafc', fg: '#94a3b8' }
  const passos = ['#fef2f2', '#fee2e2', '#fecaca', '#fca5a5', '#f87171', '#dc2626']
  const i = Math.min(passos.length - 1, Math.floor(pct / 20))
  return { bg: passos[i], fg: i >= 4 ? '#fff' : '#7f1d1d' }
}

const dt = (iso) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function SupervisorCompletude() {
  const [periodo, setPeriodo] = useState('semana')
  const [visitas, setVisitas] = useState([])
  const [recentes, setRecentes] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let vivo = true
    setCarregando(true)
    const ini = inicioPeriodo(periodo)
    Promise.all([
      getVisitas({ dateFrom: ini.toISOString() }),
      // retornos vencidos olham os últimos 120 dias, não só o período
      getVisitas({ dateFrom: new Date(Date.now() - 120 * 86400000).toISOString() }),
    ]).then(([p, r]) => { if (vivo) { setVisitas(p); setRecentes(r) } })
      .catch((e) => console.error('[Completude]', e))
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [periodo])

  const porVendedor = useMemo(() => resumoPorVendedor(visitas), [visitas])
  const alertas = useMemo(() => alertasCompletude(visitas, recentes, dataMaisDias(0)), [visitas, recentes])
  const maxFeitas = Math.max(1, ...porVendedor.map((r) => r.feitas))
  const total = porVendedor.reduce((s, r) => ({ feitas: s.feitas + r.feitas, completas: s.completas + r.completas }), { feitas: 0, completas: 0 })
  const pctGeral = total.feitas ? Math.round((total.completas / total.feitas) * 100) : 0

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="text-xl font-bold">Completude das visitas</h2>
          <p className="text-xs text-slate-500">Visita completa = nota 80 ou mais (resumo, pessoa com cargo, cultura, máquina, próximos passos, retorno e negócio quando há interesse).</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button key={p.key} type="button" onClick={() => setPeriodo(p.key)}
              className={`text-xs px-3 py-1 rounded-full border ${periodo === p.key ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : porVendedor.length === 0 ? (
        <p className="text-slate-400 text-center py-10">Nenhuma visita no período.</p>
      ) : (
        <div className="space-y-4">
          {/* % de visitas completas: geral + por vendedor */}
          <section className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            <div className="bg-white rounded-xl shadow p-3">
              <p className="text-xs text-slate-500">Equipe</p>
              <p className="text-3xl font-extrabold" style={{ color: faixaNota(pctGeral).cor }}>{pctGeral}%</p>
              <p className="text-xs text-slate-500">{total.completas} de {total.feitas} completas</p>
            </div>
            {porVendedor.map((r) => {
              const f = faixaNota(r.pct)
              return (
                <div key={r.vendedor_id} className="bg-white rounded-xl shadow p-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <VendedorAvatar id={r.vendedor_id} nome={r.nome} size={20} />
                    <p className="text-xs text-slate-600 truncate">{r.nome}</p>
                  </div>
                  <p className="text-3xl font-extrabold" style={{ color: f.cor }}>{r.pct}%</p>
                  <p className="text-xs text-slate-500">{r.completas} de {r.feitas} · {f.label.toLowerCase()}</p>
                </div>
              )
            })}
          </section>

          {/* Feitas × completas */}
          <section className="bg-white rounded-xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold">Visitas feitas × completas</h3>
              <span className="flex gap-3 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-300" />feitas</span>
                <span className="inline-flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-blue-600" />completas</span>
              </span>
            </div>
            <div className="space-y-2">
              {porVendedor.map((r) => (
                <div key={r.vendedor_id} className="grid grid-cols-[110px_1fr] items-center gap-2 text-xs">
                  <span className="truncate text-slate-700">{r.nome}</span>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 rounded-r bg-slate-300" style={{ width: `${(r.feitas / maxFeitas) * 85}%` }} />
                      <span className="text-slate-600">{r.feitas}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 rounded-r bg-blue-600" style={{ width: `${(r.completas / maxFeitas) * 85}%`, minWidth: r.completas ? 3 : 0 }} />
                      <span className="text-slate-600">{r.completas}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Mapa de calor vendedor × campo: % das visitas SEM o campo */}
          <section className="bg-white rounded-xl shadow p-3 overflow-x-auto">
            <h3 className="text-sm font-bold">O que cada vendedor esquece</h3>
            <p className="text-[11px] text-slate-500 mb-2">% das visitas sem o campo. Coluna toda escura num vendedor = treinamento dele, não o app.</p>
            <table className="text-xs border-separate" style={{ borderSpacing: 2 }}>
              <thead>
                <tr>
                  <th className="text-left font-medium text-slate-500 pr-2">Vendedor</th>
                  {ITENS_NOTA.map((i) => <th key={i.key} className="font-medium text-slate-500 px-1 whitespace-nowrap">{i.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {porVendedor.map((r) => (
                  <tr key={r.vendedor_id}>
                    <td className="pr-2 whitespace-nowrap text-slate-700">{r.nome}</td>
                    {ITENS_NOTA.map((i) => {
                      const pct = r.pctFalta[i.key]
                      const c = corCalor(pct)
                      return (
                        <td key={i.key} title={pct == null ? 'não se aplicou' : `${r.nome}: ${pct}% das visitas sem ${i.label} (${r.falta[i.key] || 0} de ${r.aplica[i.key]})`}
                          className="text-center font-semibold rounded px-2 py-1 min-w-[56px]" style={{ background: c.bg, color: c.fg }}>
                          {pct == null ? '—' : `${pct}%`}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Alertas automáticos */}
          <section className="grid gap-3 lg:grid-cols-2">
            <Alerta titulo="📍 GPS repetido" vazio="Nenhum ponto repetido no período."
              itens={alertas.gps.map((g) => ({
                k: `${g.a.id}-${g.b.id}`,
                texto: <><b>{g.a.vendedor_nome}</b>: {g.a.cliente_nome || g.a.propriedade_nome} e {g.b.cliente_nome || g.b.propriedade_nome} a {g.metros} m, com {g.minutos} min de diferença ({dt(g.a.data_visita)})</>,
              }))} />
            <Alerta titulo="🕒 Excesso de visitas retroativas" vazio="Nenhum vendedor com 30% ou mais de retroativas."
              itens={alertas.retro.map((r) => ({ k: r.vendedor_id, texto: <><b>{r.nome}</b>: {r.retro} de {r.feitas} visitas retroativas ({Math.round((r.retro / r.feitas) * 100)}%)</> }))} />
            <Alerta titulo="💼 Interesse sem negócio" vazio="Toda visita com interesse tem negócio."
              itens={alertas.semNegocio.map((v) => ({ k: v.id, texto: <><b>{v.vendedor_nome}</b>: {v.cliente_nome || v.propriedade_nome} ({dt(v.data_visita)}) — “{String(v.resumo || '').slice(0, 90)}”</> }))} />
            <Alerta titulo="📅 Retornos vencidos" vazio="Nenhum retorno vencido."
              itens={alertas.vencidos.map((v) => ({ k: v.id, texto: <><b>{v.vendedor_nome}</b>: {v.cliente_nome || v.propriedade_nome} — retorno era {new Date(v.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}</> }))} />
          </section>

          <p className="text-xs text-slate-500">
            Para ver as visitas uma a uma, use <Link to="/supervisor/visitas" className="text-blue-700 underline">Visitas</Link> com os filtros Incompletas, Sem retorno e Oportunidade sem negócio.
          </p>
        </div>
      )}
    </div>
  )
}

function Alerta({ titulo, itens, vazio }) {
  const [todos, setTodos] = useState(false)
  const lista = todos ? itens : itens.slice(0, 6)
  return (
    <div className="bg-white rounded-xl shadow p-3">
      <h3 className="text-sm font-bold mb-1">{titulo} <span className="text-slate-400 font-normal">{itens.length}</span></h3>
      {itens.length === 0 ? <p className="text-xs text-slate-400">{vazio}</p> : (
        <ul className="space-y-1">
          {lista.map((i) => <li key={i.k} className="text-xs text-slate-700">{i.texto}</li>)}
        </ul>
      )}
      {itens.length > 6 && (
        <button type="button" onClick={() => setTodos((t) => !t)} className="text-xs text-blue-700 underline mt-1">
          {todos ? 'mostrar menos' : `ver todos (${itens.length})`}
        </button>
      )}
    </div>
  )
}
