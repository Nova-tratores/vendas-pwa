import { useState, useEffect } from 'react'
import { getComentarios, addComentario, deleteComentario } from '../lib/supabaseQueries'

// Modal de comentários do supervisor sobre uma visita ou negócio.
export default function ComentariosModal({ show, entidade, entidadeId, titulo, onClose, onChanged }) {
  const [itens, setItens] = useState([])
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (show && entidadeId != null) carregar()
    if (!show) { setTexto(''); setItens([]) }
  }, [show, entidade, entidadeId])

  async function carregar() {
    setLoading(true)
    setItens(await getComentarios(entidade, entidadeId))
    setLoading(false)
  }

  async function enviar() {
    const t = texto.trim()
    if (!t) return
    setSalvando(true)
    try {
      const sup = JSON.parse(localStorage.getItem('supervisor') || '{}')
      await addComentario({ entidade, entidade_id: entidadeId, texto: t, autor_id: sup.id || null, autor_nome: sup.nome || 'Supervisor' })
      setTexto('')
      await carregar()
      onChanged?.()
    } catch (e) {
      alert('Erro ao salvar comentário: ' + (e.message || e))
    }
    setSalvando(false)
  }

  async function remover(id) {
    try {
      await deleteComentario(id)
      await carregar()
      onChanged?.()
    } catch (e) {
      alert('Erro ao remover: ' + (e.message || e))
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-slate-50 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <h3 className="font-bold text-base">Comentários</h3>
            {titulo && <p className="text-xs text-slate-500 truncate">{titulo}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 active:text-slate-700 text-2xl leading-none px-2" aria-label="Fechar">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <p className="text-center text-slate-400 py-8 text-sm">Carregando...</p>
          ) : itens.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">Nenhum comentário ainda</p>
          ) : (
            itens.map((c) => (
              <div key={c.id} className="bg-white border border-slate-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-600">{c.autor_nome || 'Supervisor'}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString('pt-BR')}</span>
                    <button onClick={() => remover(c.id)} className="text-slate-300 hover:text-red-500 text-base leading-none" aria-label="Remover">×</button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.texto}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-200 flex gap-2">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escrever um comentário..."
            rows={2}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <button
            onClick={enviar}
            disabled={salvando || !texto.trim()}
            className="px-4 rounded-lg bg-slate-800 text-white text-sm font-medium disabled:opacity-50"
          >
            {salvando ? '...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )
}
