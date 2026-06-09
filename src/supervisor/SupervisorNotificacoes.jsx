import { useState, useEffect } from 'react'
import { getVendedores, enviarMensagem, getMensagensEnviadas, deletarMensagem } from '../lib/supabaseQueries'
import VendedorAvatar, { primeiroNome } from '../components/VendedorAvatar'

export default function SupervisorNotificacoes() {
  const supervisor = JSON.parse(localStorage.getItem('supervisor') || '{}')
  const [vendedores, setVendedores] = useState([])
  const [enviadas, setEnviadas] = useState([])
  const [destino, setDestino] = useState('todos') // 'todos' | id do vendedor
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [ok, setOk] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    const [v, m] = await Promise.all([getVendedores(), getMensagensEnviadas()])
    setVendedores(v)
    setEnviadas(m)
  }

  async function handleEnviar(e) {
    e.preventDefault()
    setErro('')
    if (!corpo.trim()) { setErro('Escreva a mensagem.'); return }
    setEnviando(true)
    try {
      await enviarMensagem({
        vendedorId: destino === 'todos' ? null : Number(destino),
        titulo: titulo.trim(),
        corpo: corpo.trim(),
        autorNome: supervisor.nome || 'Supervisor',
      })
      setOk(true)
      setTitulo(''); setCorpo('')
      await carregar()
      setTimeout(() => setOk(false), 3000)
    } catch (err) {
      setErro('Não foi possível enviar: ' + err.message)
    } finally {
      setEnviando(false)
    }
  }

  async function handleDeletar(id) {
    if (!confirm('Apagar esta mensagem? Ela some também para o vendedor.')) return
    try {
      await deletarMensagem(id)
      setEnviadas((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      alert('Erro ao apagar: ' + err.message)
    }
  }

  const vendById = Object.fromEntries(vendedores.map((v) => [v.id, v]))

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-bold mb-1">Notificações</h2>
      <p className="text-sm text-slate-500 mb-4">Envie um recado para um vendedor ou para todos. Aparece na tela Notificações do app.</p>

      {ok && <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-medium">Mensagem enviada!</div>}

      <form onSubmit={handleEnviar} className="bg-white rounded-xl shadow p-4 space-y-3 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Para</label>
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="todos">Todos os vendedores</option>
            {vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Título (opcional)</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Reunião sexta"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Mensagem <span className="text-red-500">*</span></label>
          <textarea
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            rows={4}
            placeholder="Escreva o recado..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        {erro && <p className="text-xs text-red-600 bg-red-50 rounded p-2">{erro}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-slate-800 text-white py-2.5 rounded-lg font-medium text-sm active:bg-slate-900 disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </form>

      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Enviadas</h3>
      {enviadas.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhuma mensagem enviada ainda.</p>
      ) : (
        <div className="space-y-2">
          {enviadas.map((m) => {
            const dest = m.vendedor_id == null ? null : vendById[m.vendedor_id]
            return (
              <div key={m.id} className="bg-white rounded-xl shadow p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {m.vendedor_id == null ? (
                      <span className="text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Todos</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <VendedorAvatar id={m.vendedor_id} nome={dest?.nome} size={18} />
                        {primeiroNome(dest?.nome) || `#${m.vendedor_id}`}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">{new Date(m.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  {m.titulo && <p className="text-sm font-bold">{m.titulo}</p>}
                  <p className="text-sm text-slate-700 whitespace-pre-line">{m.corpo}</p>
                </div>
                <button onClick={() => handleDeletar(m.id)} className="text-slate-300 hover:text-red-500 text-lg px-1 shrink-0">&times;</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
