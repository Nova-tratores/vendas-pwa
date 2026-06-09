import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRecords, getRecord } from '../lib/db'
import { getConfig } from '../lib/supabaseQueries'
import { STATUS_EM_ANDAMENTO, isAberto } from '../lib/funil'
import { diasDesde } from '../lib/tempo'

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
      const [visitas, negocios, clientes, propriedades] = await Promise.all([
        getAllRecords('visitas'),
        getAllRecords('negocios'),
        getAllRecords('clientes'),
        getAllRecords('propriedades'),
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
      const proximosContatos = visitas
        .filter((v) => v.data_proximo_contato && v.data_proximo_contato >= hojeStr)
        .sort((a, b) => a.data_proximo_contato.localeCompare(b.data_proximo_contato))
        .slice(0, 5)

      // Contatos atrasados
      const contatosAtrasados = visitas
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

  return (
    <div>
      <p className="text-sm text-slate-500 mb-1">{saudacao()},</p>
      <h2 className="text-xl font-bold mb-4">{vendedor.nome || 'Vendedor'}</h2>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-blue-600 text-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{dados.visitasHoje}</p>
          <p className="text-[10px] opacity-80">Hoje</p>
        </div>
        <div className="bg-blue-500 text-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{dados.visitasSemana}</p>
          <p className="text-[10px] opacity-80">Semana</p>
        </div>
        <div className="bg-blue-400 text-white rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{dados.visitasMes}</p>
          <p className="text-[10px] opacity-80">Mês</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="bg-green-600 text-white rounded-xl p-3 cursor-pointer active:bg-green-700"
          onClick={() => navigate('/negocios')}
        >
          <p className="text-lg font-bold">R$ {dados.pipeline.toLocaleString('pt-BR')}</p>
          <p className="text-[10px] opacity-80">Pipeline ({dados.negociosAbertos} abertos)</p>
        </div>
        <div
          className="bg-slate-600 text-white rounded-xl p-3 cursor-pointer active:bg-slate-700"
          onClick={() => navigate('/clientes')}
        >
          <p className="text-lg font-bold">{dados.totalClientes}</p>
          <p className="text-[10px] opacity-80">Clientes ({dados.totalPropriedades} prop.)</p>
        </div>
      </div>

      {/* Atalho rápido */}
      <button
        onClick={() => navigate('/visitas')}
        className="w-full bg-blue-700 text-white py-3 rounded-xl font-medium text-sm mb-4 active:bg-blue-800"
      >
        + Nova Visita
      </button>

      {/* Contatos atrasados */}
      {dados.contatosAtrasados.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-red-600 uppercase mb-2">
            Contatos atrasados ({dados.contatosAtrasados.length})
          </p>
          <div className="space-y-2">
            {dados.contatosAtrasados.slice(0, 3).map((v) => (
              <ContatoCard key={v.id} visita={v} atrasado onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </div>
      )}

      {/* Negócios para atualizar (lembrete) */}
      {dados.negociosParaAtualizar?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-amber-600 uppercase mb-2">
            Negócios para atualizar ({dados.negociosParaAtualizar.length})
          </p>
          <div className="space-y-2">
            {dados.negociosParaAtualizar.slice(0, 5).map((n) => {
              const dias = diasDesde(n.updated_at || n.created_at)
              return (
                <div
                  key={n.id}
                  onClick={() => navigate('/negocios')}
                  className="rounded-xl shadow p-3 bg-amber-50 border-l-4 border-amber-400 cursor-pointer active:bg-amber-100"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.titulo || n.descricao || 'Negócio em andamento'}</p>
                      {n.valor > 0 && (
                        <p className="text-xs text-slate-500">R$ {Number(n.valor).toLocaleString('pt-BR')}</p>
                      )}
                    </div>
                    <p className="text-xs font-bold text-amber-700 whitespace-nowrap ml-2">
                      parado há {dias}d
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Próximos contatos */}
      {dados.proximosContatos.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Próximos contatos</p>
          <div className="space-y-2">
            {dados.proximosContatos.map((v) => (
              <ContatoCard key={v.id} visita={v} onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </div>
      )}

      {/* Últimas visitas */}
      {dados.ultimasVisitas.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase">Últimas visitas</p>
            <button onClick={() => navigate('/visitas')} className="text-xs text-blue-600 font-medium">Ver todas</button>
          </div>
          <div className="space-y-2">
            {dados.ultimasVisitas.map((v) => (
              <UltimaVisitaCard key={v.id} visita={v} onClick={() => navigate('/visitas')} />
            ))}
          </div>
        </div>
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
      className={`rounded-xl shadow p-3 ${atrasado ? 'bg-red-50 border-l-4 border-red-400' : 'bg-white'} ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
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
      className={`bg-white rounded-xl shadow p-3 ${onClick ? 'cursor-pointer active:opacity-80' : ''}`}
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
