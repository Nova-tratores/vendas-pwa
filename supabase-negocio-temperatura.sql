-- Temperatura do negócio (termômetro) + temperatura anterior para calcular a
-- progressão (avançando / estagnado / recuando) a cada movimentação do negócio.
-- Rodar no SQL Editor do Supabase.

ALTER TABLE negocios ADD COLUMN IF NOT EXISTS temperatura text;
ALTER TABLE negocios ADD COLUMN IF NOT EXISTS temperatura_anterior text;
