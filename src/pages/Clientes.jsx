import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllRecords, saveRecord, deleteRecord, getByIndex, registrarLog } from '../lib/db'
import { maskCPFouCNPJ, maskTelefone } from '../lib/masks'
import { CULTURAS } from '../lib/constants'
import PullToRefresh from '../components/PullToRefresh'
import ConfirmModal from '../components/ConfirmModal'

const EMPTY_CLIENTE = { nome: '', documento: '', telefone: '', email: '', observacoes: '' }

export default function Clientes() {
  const navigate = useNavigate()
  const [propriedades, setPropriedades] = useState([])
  const [clientes, setClientes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_CLIENTE)
  const [busca, setBusca] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [expandedDono, setExpandedDono] = useState(null)
  const [agenda, setAgenda] = useState({ atrasados: [], hoje: [], semana: [] })
  const [showAgenda, setShowAgenda] = useState(true)
  const [pessoasCount, setPessoasCount] = useState({})
  const [maquinasCount, setMaquinasCount] = useState({})
  const [culturaTarget, setCulturaTarget] = useState(null)
  const [culturaSel, setCulturaSel] = useState([])

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const props = await getAllRecords('propriedades')
    const cls = await getAllRecords('clientes')
    // Contagem de pessoas/máquinas por propriedade (1 leitura cada, sem N queries)
    const pessoas = await getAllRecords('pessoas')
    const maquinas = await getAllRecords('maquinas')
    const pc = {}; for (const x of pessoas) pc[x.propriedade_id] = (pc[x.propriedade_id] || 0) + 1
    const mc = {}; for (const x of maquinas) mc[x.propriedade_id] = (mc[x.propriedade_id] || 0) + 1
    setPessoasCount(pc)
    setMaquinasCount(mc)
    setPropriedades(props)
    setClientes(cls)
    await carregarAgenda(props, cls)
  }

  function abrirCultura(prop) {
    setCulturaTarget(prop)
    setCulturaSel(Array.isArray(prop.culturas) ? prop.culturas : [])
  }
  function toggleCultura(c) {
    setCulturaSel((sel) => sel.includes(c) ? sel.filter((x) => x !== c) : [...sel, c])
  }
  async function salvarCultura() {
    if (!culturaTarget) return
    await saveRecord('propriedades', { ...culturaTarget, culturas: culturaSel })
    await registrarLog('alterar', 'propriedades', culturaTarget.id, `Culturas: ${culturaSel.join(', ') || '—'}`)
    setCulturaTarget(null)
    setCulturaSel([])
    await carregar()
  }

  async function carregarAgenda(props, cls) {
    const visitas = await getAllRecords('visitas')
    const hojeStr = new Date().toISOString().slice(0, 10)
    const fimSemana = new Date(hojeStr + 'T00:00:00')
    fimSemana.setDate(fimSemana.getDate() + 7)
    const fimSemanaStr = fimSemana.toISOString().slice(0, 10)

    // Pegar último contato agendado por propriedade
    const propContatos = {}
    for (const v of visitas) {
      if (!v.data_proximo_contato) continue
      if (!propContatos[v.propriedade_id] || v.data_proximo_contato > propContatos[v.propriedade_id].data_proximo_contato) {
        propContatos[v.propriedade_id] = v
      }
    }

    const clienteMap = Object.fromEntries(cls.map((c) => [c.id, c]))
    const atrasados = []
    const hoje = []
    const semana = []

    for (const p of props) {
      const contato = propContatos[p.id]
      if (!contato) continue
      const data = contato.data_proximo_contato
      const item = { prop: p, cliente: clienteMap[p.cliente_dono_id] || null, data, visita: contato }
      if (data < hojeStr) atrasados.push(item)
      else if (data === hojeStr) hoje.push(item)
      else if (data <= fimSemanaStr) semana.push(item)
    }

    atrasados.sort((a, b) => a.data.localeCompare(b.data))
    semana.sort((a, b) => a.data.localeCompare(b.data))
    setAgenda({ atrasados, hoje, semana })
  }

  // Agrupar propriedades: donos com +1 prop ficam agrupados
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c]))

  // Filtrar por busca
  const filtradas = propriedades.filter((p) => {
    const termo = busca.toLowerCase()
    if (!termo) return true
    const campos = [
      p.nome, p.nome_fantasia, p.razao_social,
      p.cidade, p.estado, p.endereco, p.cnpj_cpf,
    ].filter(Boolean).map((c) => c.toLowerCase())
    const dono = clienteMap[p.cliente_dono_id]
    if (dono) campos.push(dono.nome.toLowerCase())
    return campos.some((c) => c.includes(termo))
  })

  // Separar: propriedades de donos com múltiplas props vs singles
  const donoCount = {}
  for (const p of filtradas) {
    if (p.cliente_dono_id) {
      donoCount[p.cliente_dono_id] = (donoCount[p.cliente_dono_id] || 0) + 1
    }
  }

  const singles = [] // propriedades cujo dono tem só 1 (ou sem dono)
  const grupos = {} // cliente_dono_id -> [props]
  for (const p of filtradas) {
    if (p.cliente_dono_id && donoCount[p.cliente_dono_id] > 1) {
      if (!grupos[p.cliente_dono_id]) grupos[p.cliente_dono_id] = []
      grupos[p.cliente_dono_id].push(p)
    } else {
      singles.push(p)
    }
  }

  // Montar lista final: singles + grupos intercalados alfabeticamente
  const listaFinal = []
  for (const p of singles) {
    listaFinal.push({ type: 'single', prop: p, dono: clienteMap[p.cliente_dono_id] || null })
  }
  for (const [donoId, props] of Object.entries(grupos)) {
    listaFinal.push({ type: 'group', donoId: parseInt(donoId), dono: clienteMap[parseInt(donoId)], props })
  }
  listaFinal.sort((a, b) => {
    const nomeA = a.type === 'single' ? (a.prop.nome || '') : (a.dono?.nome || '')
    const nomeB = b.type === 'single' ? (b.prop.nome || '') : (b.dono?.nome || '')
    return nomeA.localeCompare(nomeB)
  })

  function handleChange(e) {
    let { name, value } = e.target
    if (name === 'documento') value = maskCPFouCNPJ(value)
    if (name === 'telefone') value = maskTelefone(value)
    setForm({ ...form, [name]: value })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const vendedor = JSON.parse(localStorage.getItem('vendedor'))
    const clienteId = await saveRecord('clientes', {
      vendedor_id: vendedor.id,
      ...form,
      created_at: new Date().toISOString(),
    })
    await registrarLog('criar', 'clientes', clienteId, `Cliente: ${form.nome}`)
    setForm(EMPTY_CLIENTE)
    setShowForm(false)
    await carregar()
  }

  async function handleDelete() {
    if (deleteTarget) {
      await registrarLog('excluir', 'propriedades', deleteTarget.id, `Propriedade: ${deleteTarget.nome}`)
      await deleteRecord('propriedades', deleteTarget.id)
      setDeleteTarget(null)
      carregar()
    }
  }

  return (
    <PullToRefresh onRefresh={carregar}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Clientes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium active:bg-blue-800"
        >
          {showForm ? 'Cancelar' : '+ Novo'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-4 mb-4 space-y-3 animate-slide-up">
          <input name="nome" value={form.nome} onChange={handleChange} required placeholder="Nome do cliente/dono *" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <input name="documento" value={form.documento} onChange={handleChange} placeholder="CPF / CNPJ" inputMode="numeric" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <input name="telefone" value={form.telefone} onChange={handleChange} placeholder="Telefone" inputMode="tel" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <input name="email" value={form.email} onChange={handleChange} placeholder="E-mail" type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <textarea name="observacoes" value={form.observacoes} onChange={handleChange} placeholder="Observações" rows={2} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm" />
          <button type="submit" className="w-full bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm active:bg-green-700">Salvar Cliente</button>
        </form>
      )}

      {/* Agenda de contatos */}
      {(agenda.atrasados.length > 0 || agenda.hoje.length > 0 || agenda.semana.length > 0) && (
        <div className="mb-4">
          <button onClick={() => setShowAgenda(!showAgenda)} className="flex items-center justify-between w-full mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase">
              Agenda de contatos
              {agenda.atrasados.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                  {agenda.atrasados.length} atrasado{agenda.atrasados.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
            <span className="text-xs text-slate-400">{showAgenda ? '▲' : '▼'}</span>
          </button>
          {showAgenda && (
            <div className="space-y-2 animate-slide-up">
              {agenda.atrasados.map((item) => (
                <AgendaCard key={`a-${item.prop.id}`} item={item} tipo="atrasado" navigate={navigate} />
              ))}
              {agenda.hoje.map((item) => (
                <AgendaCard key={`h-${item.prop.id}`} item={item} tipo="hoje" navigate={navigate} />
              ))}
              {agenda.semana.map((item) => (
                <AgendaCard key={`s-${item.prop.id}`} item={item} tipo="semana" navigate={navigate} />
              ))}
            </div>
          )}
        </div>
      )}

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar propriedade, cidade ou dono..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mb-3"
      />

      {listaFinal.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">🏡</p>
          <p className="text-slate-400">{busca ? 'Nenhum resultado' : 'Nenhuma propriedade cadastrada'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listaFinal.map((item, i) => {
            if (item.type === 'single') {
              return (
                <PropCard
                  key={item.prop.id}
                  prop={item.prop}
                  dono={item.dono}
                  index={i}
                  navigate={navigate}
                  onDelete={() => setDeleteTarget(item.prop)}
                  nPessoas={pessoasCount[item.prop.id] || 0}
                  nMaquinas={maquinasCount[item.prop.id] || 0}
                  onCultura={() => abrirCultura(item.prop)}
                />
              )
            }
            // Grupo: dono com múltiplas propriedades
            const isExpanded = expandedDono === item.donoId
            return (
              <div key={`g-${item.donoId}`} className="animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                <button
                  onClick={() => setExpandedDono(isExpanded ? null : item.donoId)}
                  className="w-full bg-blue-50 rounded-xl shadow p-4 flex items-center justify-between active:bg-blue-100"
                >
                  <div className="text-left">
                    <p className="font-medium text-sm">{item.dono?.nome || 'Sem dono'}</p>
                    <p className="text-xs text-blue-600">{item.props.length} propriedades</p>
                  </div>
                  <span className="text-blue-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>
                {isExpanded && (
                  <div className="ml-3 mt-1 space-y-1 border-l-2 border-blue-200 pl-3 animate-slide-up">
                    {item.props.map((p) => (
                      <PropCard
                        key={p.id}
                        prop={p}
                        dono={null}
                        index={0}
                        navigate={navigate}
                        onDelete={() => setDeleteTarget(p)}
                        nPessoas={pessoasCount[p.id] || 0}
                        nMaquinas={maquinasCount[p.id] || 0}
                        onCultura={() => abrirCultura(p)}
                        compact
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmModal
        show={!!deleteTarget}
        title="Excluir propriedade"
        message={`Excluir "${deleteTarget?.nome}"? Pessoas e máquinas vinculadas também serão perdidas.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Editor rápido de culturas da propriedade */}
      {culturaTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4"
          onClick={() => setCulturaTarget(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg">Culturas</h3>
              <p className="text-xs text-slate-500 truncate">{culturaTarget.nome}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                {CULTURAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCultura(c)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${culturaSel.includes(c) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => setCulturaTarget(null)}
                className="flex-1 bg-slate-100 text-slate-600 py-2.5 rounded-lg font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCultura}
                className="flex-1 bg-green-600 text-white py-2.5 rounded-lg font-medium text-sm active:bg-green-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  )
}

// Ícones monocromáticos (currentColor) — acesos (preto) quando há cadastro,
// apagados (cinza) quando falta. Ver padrão de SVG inline em VisitasMapa.jsx.
function IconCultura({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M13 21v-6.3c3.4-.4 6-3.2 6-7.1V6h-1.8c-2.6 0-4.9 1.6-5.9 3.9C10.4 8 8.4 6.8 6 6.8H4v.9c0 3.3 2.6 6 5.9 6.1.4 0 .8 0 1.1-.1V21h2Z" />
    </svg>
  )
}
function IconPessoas({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  )
}
function IconTrator({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <g fill="currentColor">
        <path d="M4 13V8h5l1.5-2.5H14V11h3.6L19 15h-1.3a3.5 3.5 0 0 0-6.4 0H10.4A3.5 3.5 0 0 0 4 13Z" />
        <circle cx="7" cy="16.5" r="3.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </g>
    </svg>
  )
}

function PropCard({ prop, dono, index, navigate, onDelete, onCultura, nPessoas = 0, nMaquinas = 0, compact }) {
  const temCultura = Array.isArray(prop.culturas) && prop.culturas.length > 0
  const aceso = 'text-black opacity-100'
  const apagado = 'text-slate-400 opacity-80'
  return (
    <div
      className={`bg-white rounded-xl shadow flex items-center justify-between card-touch animate-fade-in ${compact ? 'p-3' : 'p-4'}`}
      style={!compact ? { animationDelay: `${index * 0.03}s` } : undefined}
    >
      <div className="flex-1 min-w-0" onClick={() => navigate(`/pessoas/${prop.id}`)}>
        <p className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>{prop.nome}</p>
        <p className="text-xs text-slate-500 truncate">
          {[prop.cidade, prop.estado].filter(Boolean).join(' - ')}
          {dono ? ` · ${dono.nome}` : ''}
        </p>
        {prop.telefone && <p className="text-xs text-blue-600 truncate">{prop.telefone}</p>}
      </div>
      <div className="flex items-center gap-3 ml-2 shrink-0">
        {/* 3 ícones de completude: cultura, pessoas, máquinas */}
        <button type="button" title="Cultura" aria-label="Cultura"
          onClick={(e) => { e.stopPropagation(); onCultura && onCultura() }}
          className={temCultura ? aceso : apagado}>
          <IconCultura className="w-5 h-5" />
        </button>
        <button type="button" title="Pessoas" aria-label="Pessoas"
          onClick={(e) => { e.stopPropagation(); navigate(`/pessoas/${prop.id}`) }}
          className={nPessoas > 0 ? aceso : apagado}>
          <IconPessoas className="w-5 h-5" />
        </button>
        <button type="button" title="Máquinas" aria-label="Máquinas"
          onClick={(e) => { e.stopPropagation(); navigate(`/maquinas/${prop.id}`) }}
          className={nMaquinas > 0 ? aceso : apagado}>
          <IconTrator className="w-5 h-5" />
        </button>
        <span className={`w-2 h-2 rounded-full ${prop.status_sync === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`} />
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-slate-300 hover:text-red-500 text-lg px-1">&times;</button>
      </div>
    </div>
  )
}

function AgendaCard({ item, tipo, navigate }) {
  const dataContato = new Date(item.data + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dias = Math.round((dataContato - hoje) / (1000 * 60 * 60 * 24))

  let diasLabel
  if (dias === 0) diasLabel = 'Hoje'
  else if (dias === 1) diasLabel = 'Amanhã'
  else if (dias < 0) diasLabel = `${Math.abs(dias)}d atrás`
  else diasLabel = `em ${dias}d`

  const cores = {
    atrasado: 'bg-red-50 border-l-4 border-red-400',
    hoje: 'bg-blue-50 border-l-4 border-blue-400',
    semana: 'bg-white border-l-4 border-slate-300',
  }
  const corDias = {
    atrasado: 'text-red-600',
    hoje: 'text-blue-600',
    semana: 'text-slate-600',
  }

  return (
    <div
      onClick={() => navigate(`/pessoas/${item.prop.id}`)}
      className={`rounded-xl shadow p-3 cursor-pointer active:opacity-80 ${cores[tipo]}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.prop.nome}</p>
          <p className="text-xs text-slate-500 truncate">
            {item.cliente?.nome ? `${item.cliente.nome} · ` : ''}{item.visita?.proximos_passos || ''}
          </p>
        </div>
        <div className="text-right ml-3 shrink-0">
          <p className={`text-xs font-bold ${corDias[tipo]}`}>{diasLabel}</p>
          <p className="text-[10px] text-slate-400">{dataContato.toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  )
}
