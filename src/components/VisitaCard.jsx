import { useState, useEffect } from 'react'
import { getRecord } from '../lib/db'
import { Car, Tractor, User, MapPin, Phone, Mail, FileText } from 'lucide-react'
import { rotuloLocal } from '../lib/localVisita'
import { foneWhats } from '../lib/whatsVendedor'
import BotaoWhats from './BotaoWhats'
import { maskTelefone } from '../lib/masks'

// Junta os telefones da visita: pessoas atendidas primeiro, depois o dono e a
// propriedade. O mesmo número aparece uma vez só.
function montarContatos(pessoas, cliente, prop) {
  const lista = []
  const vistos = new Set()
  const add = (nome, cargo, tel) => {
    const chave = foneWhats(tel) || String(tel || '').replace(/\D/g, '')
    if (!chave || vistos.has(chave)) return
    vistos.add(chave)
    lista.push({ nome: (nome || '').trim(), cargo: (cargo || '').trim(), tel: String(tel) })
  }
  for (const p of pessoas) add(p.nome, p.cargo, p.telefone)
  if (cliente) add(cliente.nome, '', cliente.telefone)
  if (prop) add(prop.razao_social || prop.nome, '', prop.telefone)
  return lista
}

export const TIPO_LABELS = {
  presencial: 'Presencial',
  mensagem: 'Mensagem',
  telefonema: 'Telefonema',
  email: 'E-mail',
  // legado
  presenca: 'Presença',
  negociacao: 'Negociação',
}

export const TIPO_COLORS = {
  presencial: 'bg-blue-100 text-blue-800',
  mensagem: 'bg-green-100 text-green-800',
  telefonema: 'bg-amber-100 text-amber-800',
  email: 'bg-purple-100 text-purple-800',
  presenca: 'bg-blue-100 text-blue-800',
  negociacao: 'bg-purple-100 text-purple-800',
}

// Card de uma visita. onEdit/onDelete são opcionais: sem eles (e/ou editavel
// falso), o card fica somente-leitura — usado no histórico por cliente.
export default function VisitaCard({ visita, index = 0, onDelete, onEdit, editavel, onNovaVisita }) {
  const [propNome, setPropNome] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [expandido, setExpandido] = useState(false)
  const [detalhes, setDetalhes] = useState(null)
  const [info, setInfo] = useState(null)

  const temDetalhes = (visita.pessoa_ids?.length || 0) > 0
    || (visita.maquina_ids?.length || 0) > 0
    || !!visita.veiculo

  // Hidrata os ids pra nomes legíveis só quando o vendedor expande (offline ok:
  // tudo vem do IndexedDB). Ids não encontrados no cache são omitidos.
  async function toggleDetalhes() {
    if (!expandido && !detalhes) {
      const pessoas = (await Promise.all(
        (visita.pessoa_ids || []).map((id) => getRecord('pessoas', id))
      )).filter(Boolean)
      const maquinas = (await Promise.all(
        (visita.maquina_ids || []).map((id) => getRecord('maquinas', id))
      )).filter(Boolean)
      setDetalhes({ pessoas, maquinas })
    }
    setExpandido((e) => !e)
  }

  const pessoaIdsChave = (visita.pessoa_ids || []).join(',')
  useEffect(() => {
    let vivo = true
    ;(async () => {
      const p = visita.propriedade_id != null ? await getRecord('propriedades', visita.propriedade_id) : null
      // Cliente = dono (clientes_vendas). Propriedades vindas do ERP não têm
      // dono (cliente_dono_id nulo), então usamos o nome da própria propriedade
      // (razão social) pra não exibir "..." no lugar do cliente.
      const c = p?.cliente_dono_id ? await getRecord('clientes', p.cliente_dono_id) : null
      const pessoas = (await Promise.all(
        (visita.pessoa_ids || []).map((id) => getRecord('pessoas', id))
      )).filter(Boolean)
      if (!vivo) return
      if (p) {
        setPropNome(p.nome)
        setClienteNome(c?.nome || p.razao_social || p.nome || '')
      }
      setInfo({
        cidade: [p?.cidade, p?.estado].filter(Boolean).join(' / '),
        documento: p?.cnpj_cpf || c?.documento || '',
        email: c?.email || p?.email || '',
        contatos: montarContatos(pessoas, c, p),
      })
    })()
    return () => { vivo = false }
  }, [visita.propriedade_id, pessoaIdsChave])

  const data = new Date(visita.data_visita)
  const dataStr = data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="bg-white rounded-xl shadow p-4 animate-fade-in" style={{ animationDelay: `${index * 0.03}s` }}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="font-medium text-sm">{clienteNome || '...'}</p>
          <p className="text-xs text-slate-500">{propNome || '...'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[visita.tipo] || 'bg-slate-100 text-slate-700'}`}>
            {TIPO_LABELS[visita.tipo] || visita.tipo}
          </span>
          {editavel && onEdit && (
            <button onClick={onEdit} className="text-xs text-slate-500 hover:text-blue-600 border border-slate-200 rounded px-1.5 py-0.5">✎ editar</button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="text-slate-300 hover:text-red-500 text-lg px-1">&times;</button>
          )}
        </div>
      </div>
      {info && (info.cidade || info.documento || info.email) && (
        <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-slate-500 mb-1">
          {info.cidade && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {info.cidade}</span>}
          {info.documento && <span className="inline-flex items-center gap-1"><FileText size={12} /> {info.documento}</span>}
          {info.email && <a href={`mailto:${info.email}`} className="inline-flex items-center gap-1 hover:underline break-all"><Mail size={12} /> {info.email}</a>}
        </div>
      )}
      {info?.contatos?.length > 0 && (
        <div className="my-2 space-y-1.5">
          {info.contatos.map((ct) => {
            return (
              <div key={ct.tel} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 truncate">
                    {ct.nome || 'Telefone'}
                    {ct.cargo && <span className="text-xs text-slate-500"> · {ct.cargo}</span>}
                  </p>
                  <a href={`tel:${ct.tel.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:underline">
                    <Phone size={11} /> {maskTelefone(ct.tel) || ct.tel}
                  </a>
                </div>
                <BotaoWhats telefone={ct.tel} contato={ct.nome} />
              </div>
            )
          })}
        </div>
      )}
      {info && info.contatos.length === 0 && (
        <p className="text-xs text-slate-400 my-1 inline-flex items-center gap-1"><Phone size={11} /> Sem telefone cadastrado</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500">{dataStr}</p>
        {rotuloLocal(visita) && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">{rotuloLocal(visita)}</span>
        )}
        {visita.primeira_visita && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Primeira Visita</span>
        )}
        {visita.retroativa && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Retroativa</span>
        )}
        {visita.acionar_pos_vendas && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">Pós Vendas</span>
        )}
      </div>
      {visita.resumo && <p className="text-sm text-slate-700 mt-2">{visita.resumo}</p>}
      {visita.proximos_passos && <p className="text-xs text-slate-500 mt-1">Próximos: {visita.proximos_passos}</p>}
      {visita.data_proximo_contato && (
        <p className="text-xs text-blue-600 mt-1 font-medium">
          Contato planejado: {new Date(visita.data_proximo_contato + 'T00:00:00').toLocaleDateString('pt-BR')}
        </p>
      )}
      {temDetalhes && (
        <button onClick={toggleDetalhes} className="text-xs text-blue-600 font-medium mt-2">
          {expandido ? 'ocultar detalhes ▴' : 'ver detalhes ▾'}
        </button>
      )}
      {expandido && detalhes && (
        <div className="mt-1 bg-slate-50 rounded-lg p-2.5 space-y-1 text-xs text-slate-600">
          {detalhes.pessoas.length > 0 && (
            <p className="flex items-start gap-1"><User size={12} className="shrink-0 mt-0.5" /> <span>{detalhes.pessoas.map((p) => p.cargo ? `${p.nome} (${p.cargo})` : p.nome).join(', ')}</span></p>
          )}
          {detalhes.maquinas.length > 0 && (
            <p className="flex items-start gap-1"><Tractor size={12} className="shrink-0 mt-0.5" /> <span>{detalhes.maquinas.map((m) => [m.marca, m.modelo].filter(Boolean).join(' ') || m.tipo).join(', ')}</span></p>
          )}
          {visita.veiculo && <p className="flex items-center gap-1"><Car size={12} /> Veículo: {visita.veiculo}</p>}
          {detalhes.pessoas.length === 0 && detalhes.maquinas.length === 0 && !visita.veiculo && (
            <p className="text-slate-400">Itens não encontrados no cache local</p>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-slate-400">
          {visita.latitude?.toFixed(4)}, {visita.longitude?.toFixed(4)}
        </span>
        <span className={`w-2 h-2 rounded-full ${visita.status_sync === 'synced' ? 'bg-green-500' : 'bg-yellow-500'}`} />
      </div>
      {onNovaVisita && (
        <button
          onClick={onNovaVisita}
          className="mt-3 w-full text-sm font-medium text-blue-700 border border-blue-200 bg-blue-50 rounded-lg py-1.5 active:bg-blue-100"
        >
          + Nova visita neste cliente
        </button>
      )}
    </div>
  )
}
