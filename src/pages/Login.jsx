import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/sync'
import { clearAll } from '../lib/db'

/**
 * Garante isolamento: se vendedor diferente loga no mesmo celular, limpa IDB
 * antes de qualquer pull pra nao misturar dados.
 */
async function clearIfDifferentVendedor(novoId) {
  const cache = JSON.parse(localStorage.getItem('vendedor') || 'null')
  if (cache && cache.id !== novoId) {
    try { await clearAll() } catch (e) { console.error('[Login] clearAll:', e) }
  }
}

/**
 * Registra o acesso do vendedor em audit_logs_vendas (acao='login').
 * Best-effort: nunca bloqueia o login. O supervisor usa isso pro "último acesso".
 */
async function registrarAcesso(vendedorId, vendedorNome) {
  try {
    await supabase.from('audit_logs_vendas').insert({
      acao: 'login',
      entidade: 'sessao',
      vendedor_id: vendedorId,
      vendedor_nome: vendedorNome || '',
      data_hora: new Date().toISOString(),
    })
  } catch (e) {
    console.warn('[Login] registrarAcesso falhou:', e)
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Estado do fluxo "Esqueci minha senha"
  const [mostrarReset, setMostrarReset] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  async function enviarReset(e) {
    e.preventDefault()
    setResetMsg('')
    if (!email) {
      setResetMsg('Digite seu email no campo acima primeiro.')
      return
    }
    setResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setResetMsg('Email de recuperação enviado. Confira sua caixa de entrada.')
    } catch (err) {
      setResetMsg(`Erro: ${err.message || 'não foi possível enviar'}`)
    } finally {
      setResetLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    try {
      // 1. Autenticar com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      if (authError) throw new Error('Email ou senha inválidos')

      // 2. Buscar dados do vendedor na tabela vendedores
      const { data: vendedor, error: vendError } = await supabase
        .from('vendedores')
        .select('*')
        .eq('auth_uid', authData.user.id)
        .eq('ativo', true)
        .single()

      if (vendError || !vendedor) {
        // Fallback: tentar buscar por email
        const { data: vendByEmail } = await supabase
          .from('vendedores')
          .select('*')
          .eq('email', email)
          .eq('ativo', true)
          .single()

        if (vendByEmail) {
          // Vincular auth_uid automaticamente no primeiro login
          await supabase
            .from('vendedores')
            .update({ auth_uid: authData.user.id })
            .eq('id', vendByEmail.id)

          await clearIfDifferentVendedor(vendByEmail.id)
          localStorage.setItem('vendedor', JSON.stringify({
            id: vendByEmail.id,
            nome: vendByEmail.nome,
            email: email,
          }))
          await registrarAcesso(vendByEmail.id, vendByEmail.nome)
          navigate('/')
          return
        }

        await supabase.auth.signOut()
        throw new Error('Usuário não está cadastrado como vendedor')
      }

      // 3. Salvar dados do vendedor no localStorage
      await clearIfDifferentVendedor(vendedor.id)
      localStorage.setItem('vendedor', JSON.stringify({
        id: vendedor.id,
        nome: vendedor.nome,
        email: email,
      }))
      await registrarAcesso(vendedor.id, vendedor.nome)

      navigate('/')
    } catch (err) {
      setErro(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-800 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-center text-blue-800 mb-1">
          Vendas App
        </h1>
        <p className="text-sm text-center text-slate-500 mb-6">Entrar como vendedor</p>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            placeholder="Senha"
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        {/* Esqueci minha senha */}
        <div className="mt-3 text-center">
          {!mostrarReset ? (
            <button
              type="button"
              onClick={() => { setMostrarReset(true); setResetMsg('') }}
              className="text-sm text-blue-700 active:text-blue-900"
            >
              Esqueci minha senha
            </button>
          ) : (
            <form onSubmit={enviarReset} className="bg-slate-50 rounded-lg p-3 text-left animate-slide-up">
              <p className="text-xs text-slate-600 mb-2">
                Digite seu email no campo acima e clique abaixo. Vamos te enviar um link pra criar uma nova senha.
              </p>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 bg-blue-700 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {resetLoading ? 'Enviando...' : 'Enviar link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMostrarReset(false); setResetMsg('') }}
                  className="flex-1 bg-slate-200 text-slate-700 py-2 rounded-lg text-sm"
                >
                  Cancelar
                </button>
              </div>
              {resetMsg && (
                <p className={`text-xs mt-2 ${resetMsg.startsWith('Erro') ? 'text-red-600' : 'text-green-700'}`}>
                  {resetMsg}
                </p>
              )}
            </form>
          )}
        </div>

      </div>
    </div>
  )
}
