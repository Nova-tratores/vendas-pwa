// Cria (ou detecta) o auth user do vendedor de teste e imprime o auth_uid.
// Uso: node scripts/criar-vendedor-teste.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// lê .env manualmente (sem dotenv)
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n').filter(Boolean).filter((l) => !l.startsWith('#'))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)
const EMAIL = 'vendedor.teste@novatratores.com.br'
const SENHA = 'novatratores'

// 1. Já existe e a senha bate?
const signIn = await supabase.auth.signInWithPassword({ email: EMAIL, password: SENHA })
if (signIn.data?.user) {
  console.log('JA_EXISTE auth_uid=' + signIn.data.user.id)
  process.exit(0)
}
console.log('signIn falhou:', signIn.error?.message)

// 2. Tenta criar
const signUp = await supabase.auth.signUp({ email: EMAIL, password: SENHA })
if (signUp.error) {
  console.log('SIGNUP_ERRO:', signUp.error.message)
  process.exit(1)
}
console.log('SIGNUP_OK auth_uid=' + signUp.data.user?.id)
console.log('session_presente=' + !!signUp.data.session)
console.log('email_confirmado=' + !!signUp.data.user?.email_confirmed_at)
