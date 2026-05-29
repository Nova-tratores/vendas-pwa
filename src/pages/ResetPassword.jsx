import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/sync'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [confirma, setConfirma] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  // Token de recuperacao vem como hash fragment na URL; supabase-js detecta
  // automaticamente e dispara PASSWORD_RECOVERY. Antes desse evento, nao
  // tem sessao valida pra updateUser. Bloqueamos o submit ate confirmar.
  const [sessaoRecuperacao, setSessaoRecuperacao] = useState(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setSessaoRecuperacao(true)
      }
    })
    // Caso o evento ja tenha sido emitido antes do mount, conferir sessao atual
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessaoRecuperacao(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    if (senha.length < 6) {
      setErro('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (senha !== confirma) {
      setErro('As senhas não conferem.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) throw error
      setSucesso(true)
      // Sai da sessao de recuperacao pra forcar login normal com a nova senha
      await supabase.auth.signOut()
      setTimeout(() => navigate('/login'), 1800)
    } catch (err) {
      setErro(err.message || 'Não foi possível redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-800 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h1 className="text-2xl font-bold text-center text-blue-800 mb-1">
          Nova senha
        </h1>
        <p className="text-sm text-center text-slate-500 mb-6">Defina sua senha de acesso</p>

        {!sessaoRecuperacao && !sucesso && (
          <div className="bg-amber-50 text-amber-800 p-3 rounded-lg mb-4 text-sm">
            Aguardando confirmação do link... Se você não chegou aqui pelo email de recuperação, volte ao{' '}
            <button onClick={() => navigate('/login')} className="underline font-medium">login</button>.
          </div>
        )}

        {erro && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {erro}
          </div>
        )}

        {sucesso ? (
          <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
            Senha redefinida com sucesso. Redirecionando para o login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              placeholder="Nova senha"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
            />
            <input
              type="password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
              minLength={6}
              placeholder="Confirmar nova senha"
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !sessaoRecuperacao}
              className="w-full bg-blue-700 text-white py-2.5 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
