import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { construirAlertas, getMensagens, marcarLido } from '../lib/notificacoes'

const URG_CLS = {
  alta: 'border-l-red-500',
  media: 'border-l-amber-400',
  baixa: 'border-l-slate-300',
}

export default function Notificacoes() {
  const navigate = useNavigate()
  const vendedor = JSON.parse(localStorage.getItem('vendedor') || '{}')
  const [alertas, setAlertas] = useState([])
  const [mensagens, setMensagens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([construirAlertas(), getMensagens(vendedor.id)]).then(([a, m]) => {
      if (!alive) return
      setAlertas(a)
      setMensagens(m)
      setLoading(false)
      marcarLido() // abriu a tela: zera o badge de mensagens
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pb-4">
      <button onClick={() => navigate(-1)} className="text-blue-700 text-sm inline-block mb-2">← Voltar</button>
      <h2 className="text-xl font-bold mb-4">Notificações</h2>

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-8">Carregando...</p>
      ) : (
        <>
          {/* Mensagens do supervisor */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Mensagens</h3>
          {mensagens.length === 0 ? (
            <p className="text-sm text-slate-400 mb-5">Nenhuma mensagem.</p>
          ) : (
            <div className="space-y-2 mb-6">
              {mensagens.map((m) => (
                <div key={m.id} className="bg-white rounded-xl shadow p-3 border-l-4 border-l-blue-500">
                  {m.titulo && <p className="text-sm font-bold">{m.titulo}</p>}
                  <p className="text-sm text-slate-700 whitespace-pre-line">{m.corpo}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {m.vendedor_id == null ? 'Para todos' : 'Para você'} · {new Date(m.created_at).toLocaleString('pt-BR')}
                    {m.created_by ? ` · ${m.created_by}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Alertas automáticos */}
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Avisos</h3>
          {alertas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-slate-400 text-sm">Tudo em dia, nenhum aviso.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(destinoAlerta(a.tipo))}
                  className={`w-full text-left bg-white rounded-xl shadow p-3 border-l-4 ${URG_CLS[a.urgencia] || URG_CLS.baixa} active:bg-slate-50`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl">{a.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.titulo}</p>
                      <p className="text-xs text-slate-500">{a.detalhe}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function destinoAlerta(tipo) {
  if (tipo === 'negocio') return '/negocios'
  if (tipo === 'contato') return '/agenda'
  return '/visitas'
}
