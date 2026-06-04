import { useState, useEffect, useMemo } from 'react'
import {
  getClientes, getPropriedades, getPessoas, getMaquinas, getVisitas, getVendedores,
} from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome } from '../components/VendedorAvatar'

const TIPO_LABELS = {
  presencial: 'Presencial', mensagem: 'Mensagem', telefonema: 'Telefonema', email: 'E-mail',
  presenca: 'Presença', negociacao: 'Negociação',
}

export default function SupervisorClientes() {
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [dados, setDados] = useState({
    clientes: [], propriedades: [], pessoas: [], maquinas: [], visitas: [], vendedores: [],
  })

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    try {
      const [clientes, propriedades, pessoas, maquinas, visitas, vendedores] = await Promise.all([
        getClientes(), getPropriedades(), getPessoas(), getMaquinas(), getVisitas({}), getVendedores(),
      ])
      setDados({ clientes, propriedades, pessoas, maquinas, visitas, vendedores })
    } catch (err) {
      console.error('[SupervisorClientes]', err)
    }
    setLoading(false)
  }

  // Monta, para cada cliente (dono), suas propriedades já enriquecidas + visitas.
  const fichas = useMemo(() => {
    const { clientes, propriedades, pessoas, maquinas, visitas, vendedores } = dados
    const vendById = Object.fromEntries(vendedores.map((v) => [v.id, v]))

    const pessoasByProp = {}
    for (const p of pessoas) (pessoasByProp[p.propriedade_id] ||= []).push(p)
    const maquinasByProp = {}
    for (const m of maquinas) (maquinasByProp[m.propriedade_id] ||= []).push(m)

    // propriedade_id -> cliente dono (pra agrupar visitas por cliente)
    const propsByDono = {}
    const donoByProp = {}
    for (const pr of propriedades) {
      if (pr.cliente_dono_id == null) continue
      ;(propsByDono[pr.cliente_dono_id] ||= []).push(pr)
      donoByProp[pr.id] = pr.cliente_dono_id
    }

    const visitasByDono = {}
    for (const v of visitas) {
      const dono = donoByProp[v.propriedade_id]
      if (dono == null) continue
      ;(visitasByDono[dono] ||= []).push(v)
    }

    return clientes.map((c) => {
      const props = (propsByDono[c.id] || []).map((pr) => ({
        ...pr,
        nome: pr.nome_fantasia || pr.razao_social || 'Propriedade',
        pessoas: pessoasByProp[pr.id] || [],
        maquinas: maquinasByProp[pr.id] || [],
        culturas: pr.culturas || [],
      }))
      const visitasCli = (visitasByDono[c.id] || [])
        .slice()
        .sort((a, b) => new Date(b.data_visita) - new Date(a.data_visita))

      const temCulturas = props.some((p) => p.culturas.length > 0)
      const temPessoas = props.some((p) => p.pessoas.length > 0)
      const temMaquinas = props.some((p) => p.maquinas.length > 0)

      return {
        cliente: c,
        vendedor: vendById[c.vendedor_id] || { id: c.vendedor_id, nome: '—' },
        props,
        visitas: visitasCli,
        ultimaVisita: visitasCli[0]?.data_visita || null,
        temCulturas, temPessoas, temMaquinas,
      }
    })
  }, [dados])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const arr = fichas.filter((f) => {
      if (!termo) return true
      const campos = [
        f.cliente.nome, f.vendedor.nome,
        ...f.props.map((p) => p.nome), ...f.props.map((p) => p.cidade),
      ].filter(Boolean).map((s) => s.toLowerCase())
      return campos.some((s) => s.includes(termo))
    })
    return arr.sort((a, b) => (a.cliente.nome || '').localeCompare(b.cliente.nome || ''))
  }, [fichas, busca])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-1">Clientes</h2>
      <p className="text-xs text-slate-500 mb-3">{filtradas.length} cliente(s) · visitas, máquinas, culturas e pessoas por cliente</p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar cliente, vendedor, propriedade ou cidade..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm mb-3"
      />

      {filtradas.length === 0 ? (
        <p className="text-center text-slate-400 py-12">Nenhum cliente encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtradas.map((f) => {
            const aberto = expandido === f.cliente.id
            return (
              <div key={f.cliente.id} className="bg-white rounded-xl shadow">
                <button
                  onClick={() => setExpandido(aberto ? null : f.cliente.id)}
                  className="w-full text-left p-4 flex items-center gap-3 active:bg-slate-50"
                >
                  <VendedorAvatar id={f.vendedor.id} nome={f.vendedor.nome} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{f.cliente.nome}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {primeiroNome(f.vendedor.nome) || '—'}
                      {f.cliente.telefone ? ` · ${f.cliente.telefone}` : ''}
                      {` · ${f.props.length} propriedade${f.props.length !== 1 ? 's' : ''}`}
                    </p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      <Badge ok={f.visitas.length > 0}>{f.visitas.length} visita{f.visitas.length !== 1 ? 's' : ''}</Badge>
                      <Badge ok={f.temCulturas}>🌱 Culturas</Badge>
                      <Badge ok={f.temPessoas}>👥 Pessoas</Badge>
                      <Badge ok={f.temMaquinas}>🚜 Máquinas</Badge>
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm shrink-0">{aberto ? '▲' : '▼'}</span>
                </button>

                {aberto && (
                  <div className="px-4 pb-4 space-y-4 animate-slide-up">
                    {/* Propriedades enriquecidas */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Propriedades</p>
                      {f.props.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma propriedade cadastrada</p>
                      ) : (
                        <div className="space-y-2">
                          {f.props.map((p) => (
                            <div key={p.id} className="border border-slate-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{p.nome}</p>
                                <span className="text-xs text-slate-400">
                                  {[p.cidade, p.estado].filter(Boolean).join(' - ')}
                                  {p.area_hectares ? ` · ${p.area_hectares} ha` : ''}
                                </span>
                              </div>
                              {p.culturas.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {p.culturas.map((c) => (
                                    <span key={c} className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{c}</span>
                                  ))}
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                                <div>
                                  <p className="text-slate-400 font-medium mb-0.5">👥 Pessoas</p>
                                  {p.pessoas.length === 0 ? (
                                    <p className="text-slate-300 italic">nenhuma</p>
                                  ) : p.pessoas.map((pe) => (
                                    <p key={pe.id} className="text-slate-600">{pe.nome}{pe.cargo ? ` · ${pe.cargo}` : ''}</p>
                                  ))}
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium mb-0.5">🚜 Máquinas</p>
                                  {p.maquinas.length === 0 ? (
                                    <p className="text-slate-300 italic">nenhuma</p>
                                  ) : p.maquinas.map((m) => (
                                    <p key={m.id} className="text-slate-600">{[m.marca, m.modelo].filter(Boolean).join(' ')}</p>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Histórico de visitas ao cliente */}
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase mb-1">Visitas</p>
                      {f.visitas.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhuma visita registrada</p>
                      ) : (
                        <div className="space-y-1.5">
                          {f.visitas.map((v) => (
                            <div key={v.id} className="flex items-start gap-2 border-l-2 border-slate-200 pl-2">
                              <VendedorAvatar id={v.vendedor_id} nome={v.vendedor_nome} size={24} />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs">
                                  <span className="text-slate-500">{new Date(v.data_visita).toLocaleDateString('pt-BR')}</span>
                                  {' · '}
                                  <span className="text-slate-600">{TIPO_LABELS[v.tipo] || v.tipo}</span>
                                  {v.propriedade_nome ? ` · ${v.propriedade_nome}` : ''}
                                </p>
                                {v.resumo && <p className="text-xs text-slate-500 italic truncate">{v.resumo}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Badge({ ok, children }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
      {children}
    </span>
  )
}
