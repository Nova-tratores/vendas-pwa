// Kit comum das telas da Inteligência de Vendas no app.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { MODO_EXEMPLO } from '../../lib/iv/fonte'

/** Carrega uma função de lib/iv/fonte.js: { dados, carregando, erro, recarregar }. */
export function useDados(carregar, deps = []) {
  const [estado, setEstado] = useState({ dados: null, carregando: true, erro: null })
  const recarregar = useCallback(() => {
    setEstado((e) => ({ ...e, carregando: true, erro: null }))
    Promise.resolve(carregar())
      .then((dados) => setEstado({ dados, carregando: false, erro: null }))
      .catch((erro) => setEstado({ dados: null, carregando: false, erro }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { recarregar() }, [recarregar])
  return { ...estado, recarregar }
}

/** Título da tela + selo "dados de exemplo" enquanto a fonte não é o Portal. */
export function CabecalhoIV({ titulo, subtitulo, direita }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 leading-tight">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500 mt-0.5">{subtitulo}</p>}
        {MODO_EXEMPLO && (
          <span className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
            <FlaskConical size={12} aria-hidden="true" /> Dados de exemplo
          </span>
        )}
      </div>
      {direita}
    </div>
  )
}

/** Esqueleto animado enquanto carrega. */
export function CarregandoIV({ linhas = 4 }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: linhas }).map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-slate-100 animate-pulse" />
      ))}
    </div>
  )
}

export function ErroIV({ erro, onTentar }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      Não foi possível carregar: {String(erro?.message || erro)}
      {onTentar && (
        <button onClick={onTentar} className="ml-2 inline-flex items-center gap-1 font-semibold underline">
          <RefreshCw size={14} aria-hidden="true" /> Tentar de novo
        </button>
      )}
    </div>
  )
}

/** Abre a ficha 360 do cliente (mesma ficha para todas as telas). */
export function useAbrirCliente() {
  const navigate = useNavigate()
  return (clienteId) => navigate(`/inteligencia/cliente/${encodeURIComponent(clienteId)}`)
}
