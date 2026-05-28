-- ============================================
-- Cadastro inicial dos 5 vendedores (2026-05-28)
-- ============================================
-- Pre-requisito: supabase-vendedores.sql ja rodou (tabela vendedores existe).
--
-- Apos rodar este script, criar os Users correspondentes em
-- Authentication > Users (mesmo email). O auth_uid sera vinculado
-- automaticamente no primeiro login (Login.jsx faz o link via email).
-- ============================================

-- 1. Adiciona coluna de matricula (codigo interno de funcionario)
ALTER TABLE vendedores
  ADD COLUMN IF NOT EXISTS codigo int UNIQUE;

-- 2. INSERTs (idempotentes via ON CONFLICT no email)
INSERT INTO vendedores (nome, email, telefone, codigo) VALUES
  ('JOAQUIM FERNANDO LEME', 'fernando.novatratores@gmail.com',    '14 99745-5617', 101),
  ('PEDRO FAVARO',          'pedroofavaro@gmail.com',             '14 99700-4763', 201),
  ('DOUGRAS BOMFIM',        'dougrasmogrs9@gmail.com',            '14 99609-3534', 301),
  ('LEONARDO ABRANTES',     'leonardo.novatratores@gmail.com',    '14 99654-6673', 401),
  ('LUCAS ENZ',             'lucas.enz@consorciomahindra.com.br', '14 99733-1426', 501)
ON CONFLICT (email) DO UPDATE
  SET nome     = EXCLUDED.nome,
      telefone = EXCLUDED.telefone,
      codigo   = EXCLUDED.codigo;

-- 3. Verificar
SELECT id, codigo, nome, email, telefone, ativo, auth_uid FROM vendedores ORDER BY codigo;
