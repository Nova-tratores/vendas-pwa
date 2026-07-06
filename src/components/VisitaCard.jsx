import { useState, useEffect } from 'react'
import { getRecord } from '../lib/db'

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

  useEffect(() => {
    getRecord('propriedades', visita.propriedade_id).then((p) => {
      if (p) {
        setPropNome(p.nome)
        // Cliente = dono (clientes_vendas). Propriedades vindas do ERP não têm
        // dono (cliente_dono_id nulo), então usamos o nome da própria propriedade
        // (razão social) pra não exibir "..." no lugar do cliente.
        if (p.cliente_dono_id) {
          getRecord('clientes', p.cliente_dono_id).then((c) => {
            setClienteNome(c?.nome || p.razao_social || p.nome || '')
          })
        } else {
          setClienteNome(p.razao_social || p.nome || '')
        }
      }
    })
  }, [visita.propriedade_id])

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
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-xs text-slate-500">{dataStr}</p>
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
            <p>👤 {detalhes.pessoas.map((p) => p.cargo ? `${p.nome} (${p.cargo})` : p.nome).join(', ')}</p>
          )}
          {detalhes.maquinas.length > 0 && (
            <p>🚜 {detalhes.maquinas.map((m) => [m.marca, m.modelo].filter(Boolean).join(' ') || m.tipo).join(', ')}</p>
          )}
          {visita.veiculo && <p>🚗 Veículo: {visita.veiculo}</p>}
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
