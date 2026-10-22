import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRecords, getRecord } from '../lib/db'
import { getConfig } from '../lib/supabaseQueries'
import { STATUS_EM_ANDAMENTO, isAberto } from '../lib/funil'
import { diasDesde } from '../lib/tempo'
import { completudePropriedade, FALTA_INFO } from '../lib/completude'
import Icone from '../components/Icone'
import { Calendar, ClipboardList, Clock, Hourglass, MapPin, Plus, TriangleAlert, Users, Wallet } from 'lucide-react'
import RotaHoje from '../components/inicio/RotaHoje'
import { Atalhos, ClimaMini, FeedHoje, NoticiasHoje, TituloBloco } from '../components/inicio/blocos'
import TaxasPlanoSafra from '../components/inicio/TaxasPlanoSafra'
import { contatoVigentePorPropriedade } from '../lib/agenda'

// Lê o X dias de lembrete: online busca da config e cacheia; offline usa o cache.
async function getDiasLembrete() {
  let dias = Number(localStorage.getItem('cfg_dias_lembrete')) || 7
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const c = await getConfig({ force: true })
      if (c?.dias_lembrete_negocio) {
        dias = c.dias_lembrete_negocio
        localStorage.setItem('cfg_dias_lembrete', String(dias))
      }
    } catch { /* mantém cache/fallback */ }
  }
  return dias
}

export default function Dashboard() {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [visitas, negocios, clientes, propriedades, pessoas, maquinas] = await Promise.all([
        getAllRecords('visitas').then((vs) => vs.filter((v) => !v.deleted_at)),
        getAllRecords('negocios'),
        getAllRecords('clientes'),
        getAllRecords('propriedades'),
        getAllRecords('pessoas'),
        getAllRecords('maquinas'),
      ])

      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const inicioSemana = new Date(hoje)
      inicioSemana.setDate(hoje.getDate() - (hoje.getDay() === 0 ? 6 : hoje.getDay() - 1))
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

      const visitasHoje = visitas.filter((v) => new Date(v.data_visita) >= hoje).length
      const visitasSemana = visitas.filter((v) => new Date(v.data_visita) >= inicioSemana).length
      const visitasMes = visitas.filter((v) => new Date(v.data_visita) >= inicioMes).length

      const pipeline = negocios
        .filter((n) => isAberto(n.status))
        .reduce((acc, n) => acc + (n.valor || 0), 0)

      const negociosAbertos = negocios.filter((n) => isAberto(n.status)).length

      // Próximos contatos planejados
      const hojeStr = new Date().toISOString().slice(0, 10)
      // Só o contato vigente de cada propriedade (agendamentos antigos substituídos não contam)
      const contatosVigentes = [...contatoVigentePorPropriedade(visitas).values()]
      const proximosContatos = contatosVigentes
        .filter((v) => v.data_proximo_contato && v.data_proximo_contato >= hojeStr)
        .sort((a, b) => a.data_proximo_contato.localeCompare(b.data_proximo_contato))
        .slice(0, 5)

      // Contatos atrasados
      const contatosAtrasados = contatosVigentes
        .filter((v) => v.data_proximo_contato && v.data_proximo_contato < hojeStr)
        .sort((a, b) => a.data_proximo_contato.localeCompare(b.data_proximo_contato))

      // Últimas visitas
      const ultimasVisitas = [...visitas]
        .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))
        .slice(0, 3)

      // Negócios em andamento parados há mais de X dias (config global)
      const diasLembrete = await getDiasLembrete()
      const negociosParaAtualizar = negocios
        .filter((n) => STATUS_EM_ANDAMENTO.includes(n.status))
        .filter((n) => diasDesde(n.updated_at || n.created_at) >= diasLembrete)
        .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at))

      // Completude de cadastro: propriedades sem cultivos / pessoas / máquinas
      const nPessoasPorProp = {}; for (const x of pessoas) nPessoasPorProp[x.propriedade_id] = (nPessoasPorProp[x.propriedade_id] || 0) + 1
      const nMaquinasPorProp = {}; for (const x of maquinas) nMaquinasPorProp[x.propriedade_id] = (nMaquinasPorProp[x.propriedade_id] || 0) + 1
      const propriedadesIncompletas = propriedades
        .map((p) => ({ prop: p, comp: completudePropriedade(p, nPessoasPorProp[p.id] || 0, nMaquinasPorProp[p.id] || 0) }))
        .filter((x) => !x.comp.completa)
        .sort((a, b) => b.comp.faltam.length - a.comp.faltam.length)
      const totalCompletas = propriedades.length - propriedadesIncompletas.length

      setDados({
        visitasHoje,
        visitasSemana,
        visitasMes,
        pipeline,
        negociosAbertos,
        totalClientes: clientes.length,
        totalPropriedades: propriedades.length,
        proximosContatos,
        contatosAtrasados,
        ultimasVisitas,
        negociosParaAtualizar,
        propriedadesIncompletas,
        totalCompletas,
      })
    } catch (err) {
      console.error('[Dashboard]', err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!dados) return null

  const saudacao = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const dataHoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const totalPendencias = dados.contatosAtrasados.length + (dados.negociosParaAtualizar?.length || 0)

  return (
    <div>
      {/* Topo: saudação, clima e os números de visitas */}
      <section
        className="ini-entra -mx-4 -mt-4 mb-4 px-4 pt-4 pb-5 text-white rounded-b-3xl"
        style={{ background: 'linear-gradient(135deg, #DC2626, #7F1D1D)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm opacity-85 capitalize">{saudacao()} · {dataHoje}</p>
            <h2 className="text-xl font-bold truncate">{vendedor.nome || 'Vendedor'}</h2>
          </div>
        </div>
        <div className="mt-3"><ClimaMini /></div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[['Hoje', dados.visitasHoje], ['Semana', dados.visitasSemana], ['Mês', dados.visitasMes]].map(([rot, v]) => (
            <button key={rot} onClick={() => navigate('/visitas')} className="bg-white/15 backdrop-blur rounded-xl py-2.5 text-center active:bg-white/25">
              <p className="text-2xl font-bold leading-none">{v}</p>
              <p className="text-[11px] opacity-85 mt-1">visitas · {rot.toLowerCase()}</p>
            </button>
          ))}
        </div>
        {totalPendencias > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-white/20 rounded-full px-3 py-1">
            <TriangleAlert size={13} aria-hidden="true" /> {totalPendencias} pendência{totalPendencias > 1 ? 's' : ''} para hoje — veja abaixo
          </p>
        )}
      </section>

      {/* Carteira: pipeline e clientes */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => navigate('/negocios')} className="text-left bg-white border border-slate-200 rounded-2xl p-3 active:bg-slate-50">
          <p className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase"><Wallet size={13} aria-hidden="true" /> Pipeline</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">R$ {dados.pipeline.toLocaleString('pt-BR')}</p>
          <p className="text-[11px] text-slate-500">{dados.negociosAbertos} negócio{dados.negociosAbertos === 1 ? '' : 's'} aberto{dados.negociosAbertos === 1 ? '' : 's'}</p>
        </button>
        <button onClick={() => navigate('/clientes')} className="text-left bg-white border border-slate-200 rounded-2xl p-3 active:bg-slate-50">
          <p className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase"><Users size={13} aria-hidden="true" /> Clientes</p>
          <p className="text-lg font-bold text-slate-900 mt-1">{dados.totalClientes}</p>
          <p className="text-[11px] text-slate-500">{dados.totalPropriedades} propriedade{dados.totalPropriedades === 1 ? '' : 's'}</p>
        </button>
      </div>

      <button
        onClick={() => navigate('/visitas')}
        className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 text-white py-3 rounded-2xl font-semibold text-sm mb-4 shadow-sm active:bg-blue-800"
      >
        <Plus size={18} aria-hidden="true" /> Nova visita
      </button>

      <Atalhos />

      {/* Rota de hoje: mapa + paradas, mexe direto aqui */}
      <RotaHoje />

      {/* Feed do dia (Inteligência de Vendas) */}
      <FeedHoje />

      {/* Contatos atrasados */}
      {dados.contatosAtrasados.length > 0 && (
        <section className="mb-5">
          <TituloBloco icone={Clock} titulo={`Contatos atrasados (${dados.contatosAtrasados.length})`} />
          <div className="space-y-2">
            {dados.contatosAtrasados.slice(0, 3).map((v) => (
              <ContatoCard key={v.id} visita={v} atrasado onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </section>
      )}

      {/* Negócios para atualizar (lembrete) */}
      {dados.negociosParaAtualizar?.length > 0 && (
        <section className="mb-5">
          <TituloBloco icone={Hourglass} titulo={`Negócios para atualizar (${dados.negociosParaAtualizar.length})`} acao="Negócios" onAcao={() => navigate('/negocios')} />
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {dados.negociosParaAtualizar.slice(0, 5).map((n) => {
              const dias = diasDesde(n.updated_at || n.created_at)
              return (
                <button key={n.id} onClick={() => navigate('/negocios')} className="w-full text-left flex items-center justify-between gap-2 p-3 active:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">{n.titulo || n.descricao || 'Negócio em andamento'}</span>
                    {n.valor > 0 && <span className="block text-xs text-slate-500">R$ {Number(n.valor).toLocaleString('pt-BR')}</span>}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 whitespace-nowrap">parado há {dias}d</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Notícias do agro + Plano Safra */}
      <NoticiasHoje />
      <TaxasPlanoSafra />

      {/* Propriedades para completar (nudge de cadastro) */}
      {dados.propriedadesIncompletas?.length > 0 && (
        <section className="mb-5">
          <TituloBloco icone={ClipboardList} titulo={`Cadastros para completar (${dados.propriedadesIncompletas.length})`} />
          <p className="text-[11px] text-slate-500 -mt-1 mb-2">
            {dados.totalCompletas} de {dados.totalPropriedades} propriedades completas
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100">
            {dados.propriedadesIncompletas.slice(0, 5).map(({ prop, comp }) => {
              const primeiroFalta = comp.faltam[0]
              const rota = FALTA_INFO[primeiroFalta]?.rota(prop.id) || '/clientes'
              return (
                <button key={prop.id} onClick={() => navigate(rota)} className="w-full text-left flex items-center justify-between gap-2 p-3 active:bg-slate-50">
                  <span className="text-sm font-medium truncate min-w-0">{prop.nome_fantasia || prop.razao_social || prop.nome || 'Propriedade'}</span>
                  <span className="flex gap-1 shrink-0">
                    {comp.faltam.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium whitespace-nowrap">
                        <Icone nome={FALTA_INFO[f]?.icon} size={12} /> {f}
                      </span>
                    ))}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Próximos contatos */}
      {dados.proximosContatos.length > 0 && (
        <section className="mb-5">
          <TituloBloco icone={Calendar} titulo="Próximos contatos" acao="Agenda" onAcao={() => navigate('/agenda')} />
          <div className="space-y-2">
            {dados.proximosContatos.map((v) => (
              <ContatoCard key={v.id} visita={v} onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </section>
      )}

      {/* Últimas visitas */}
      {dados.ultimasVisitas.length > 0 && (
        <section>
          <TituloBloco icone={MapPin} titulo="Últimas visitas" acao="Ver todas" onAcao={() => navigate('/visitas')} />
          <div className="space-y-2">
            {dados.ultimasVisitas.map((v) => (
              <UltimaVisitaCard key={v.id} visita={v} onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ContatoCard({ visita, atrasado, onClick }) {
  const dataContato = new Date(visita.data_proximo_contato + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((dataContato - hoje) / (1000 * 60 * 60 * 24))

  let diasLabel
  if (dias === 0) diasLabel = 'Hoje'
  else if (dias === 1) diasLabel = 'Amanhã'
  else if (dias < 0) diasLabel = `${Math.abs(dias)}d atrás`
  else diasLabel = `em ${dias}d`

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-3 ${atrasado ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'} ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{visita.proximos_passos || 'Contato planejado'}</p>
          <p className="text-xs text-slate-500">{visita.resumo || ''}</p>
        </div>
        <div className="text-right">
          <p className={`text-xs font-bold ${atrasado ? 'text-red-600' : dias === 0 ? 'text-blue-600' : 'text-slate-600'}`}>
            {diasLabel}
          </p>
          <p className="text-[10px] text-slate-400">
            {dataContato.toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  )
}

// Card de "Últimas visitas": nome do cliente à esquerda, data no extremo
// direito e a descrição (resumo) logo abaixo.
function UltimaVisitaCard({ visita, onClick }) {
  const [clienteNome, setClienteNome] = useState('')

  useEffect(() => {
    let alive = true
    getRecord('propriedades', visita.propriedade_id).then((p) => {
      if (!alive || !p) return
      if (p.cliente_dono_id) {
        getRecord('clientes', p.cliente_dono_id).then((c) => {
          if (alive) setClienteNome(c?.nome || p.razao_social || p.nome || '')
        })
      } else {
        setClienteNome(p.razao_social || p.nome || '')
      }
    })
    return () => { alive = false }
  }, [visita.propriedade_id])

  const data = new Date(visita.data_visita)

  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-3 ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium truncate">{clienteNome || '...'}</p>
        <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
          {data.toLocaleDateString('pt-BR')}
        </p>
      </div>
      {(visita.resumo || visita.proximos_passos) && (
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {visita.resumo || visita.proximos_passos}
        </p>
      )}
    </div>
  )
}
