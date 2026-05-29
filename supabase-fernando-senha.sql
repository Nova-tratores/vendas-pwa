-- ============================================
-- Atualizar/definir senha do Fernando (2026-05-29)
-- Senha = fernando.novatratores@gmail.com (igual ao email)
-- ============================================
-- Pre-requisitos:
--   1. Extensao pgcrypto habilitada (Supabase ja vem com ela)
--   2. Usuario ja criado em Authentication > Users
--      Se RETURNING vier vazio, criar pelo dashboard:
--      https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/auth/users
--      (Add user > Create new user > marcar Auto Confirm) e rodar de novo.
--
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

UPDATE auth.users
SET
  encrypted_password = crypt('fernando.novatratores@gmail.com', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at         = now()
WHERE email = 'fernando.novatratores@gmail.com'
RETURNING id, email, email_confirmed_at, last_sign_in_at;

-- Verificacao
SELECT id, email, email_confirmed_at, last_sign_in_at
FROM auth.users
WHERE email = 'fernando.novatratores@gmail.com';
