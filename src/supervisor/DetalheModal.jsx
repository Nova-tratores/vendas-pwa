import VendedorAvatar from '../components/VendedorAvatar'

const TIPO_COLORS = {
  presencial: 'bg-blue-100 text-blue-800',
  mensagem: 'bg-green-100 text-green-800',
  telefonema: 'bg-amber-100 text-amber-800',
  email: 'bg-purple-100 text-purple-800',
}

const STATUS_LABELS = {
  prospect: 'Prospect',
  proposta_enviada: 'Proposta Enviada',
  em_negociacao: 'Em Negociação',
  fechado_ganho: 'Fechado (Ganho)',
  fechado_perdido: 'Fechado (Perdido)',
}

const STATUS_COLORS = {
  prospect: 'bg-slate-100 text-slate-700',
  proposta_enviada: 'bg-blue-100 text-blue-800',
  em_negociacao: 'bg-yellow-100 text-yellow-800',
  fechado_ganho: 'bg-green-100 text-green-800',
  fechado_perdido: 'bg-red-100 text-red-800',
}

function fmtData(iso, comHora = true) {
  if (!iso) return '—'
  const d = new Date(iso)
  const data = d.toLocaleDateString('pt-BR')
  if (!comHora) return data
  return data + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function LinhaVisita({ v }) {
  return (
    <div className={`bg-white border border-slate-100 rounded-xl p-3 ${v.retroativa ? 'border-l-4 border-l-amber-400' : ''}`}>
      <div className="flex items-start justify-between mb-1 gap-2">
        {/* Cliente em destaque; vendedor vira o círculo com a inicial */}
        <div className="flex items-center gap-2 min-w-0">
          <VendedorAvatar id={v.vendedor_id} nome={v.vendedor_nome} size={28} />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{v.cliente_nome || '—'}</p>
            {v.propriedade_nome && <p className="text-xs text-slate-500 leading-tight truncate">{v.propriedade_nome}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_COLORS[v.tipo] || 'bg-slate-100 text-slate-700'}`}>
            {v.tipo}
          </span>
          {v.retroativa && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Retro</span>
          )}
          {v.acionar_pos_vendas && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">PV</span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-500">{fmtData(v.data_visita)}</p>
      {v.resumo && <p className="text-sm text-slate-700 mt-1">{v.resumo}</p>}
    </div>
  )
}

function LinhaNegocio({ n }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-sm">{n.cliente_nome || 'Cliente'}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[n.status] || 'bg-slate-100 text-slate-700'}`}>
          {STATUS_LABELS[n.status] || n.status}
        </span>
      </div>
      {n.vendedor_nome && <p className="text-xs text-slate-500">{n.vendedor_nome}</p>}
      {n.valor != null && (
        <p className="text-base font-bold text-green-700 mt-1">
          R$ {Number(n.valor).toLocaleString('pt-BR')}
        </p>
      )}
      <p className="text-xs text-slate-400 mt-1">Criado em {fmtData(n.created_at, false)}</p>
    </div>
  )
}

/**
 * Popup só-leitura com a lista de itens que compõem um valor.
 * @param {boolean} show
 * @param {string}  titulo
 * @param {'visitas'|'negocios'} tipo
 * @param {Array}   itens
 * @param {function} onClose
 */
export default function DetalheModal({ show, titulo, tipo, itens = [], onClose }) {
  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <h3 className="font-bold text-base">{titulo}</h3>
            <p className="text-xs text-slate-500">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 active:text-slate-700 text-2xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {itens.length === 0 ? (
            <p className="text-center text-slate-400 py-10 text-sm">Nenhum item</p>
          ) : (
            itens.map((item) =>
              tipo === 'negocios'
                ? <LinhaNegocio key={item.id} n={item} />
                : <LinhaVisita key={item.id} v={item} />
            )
          )}
        </div>
      </div>
    </div>
  )
}
