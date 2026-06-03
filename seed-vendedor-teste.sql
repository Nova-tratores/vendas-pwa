-- ============================================
-- SEED: vendedor de teste "modelo" + dados fictícios em Carlópolis-PR (2026-06-03)
--
-- Cria o vendedor vinculado ao auth user vendedor.teste@novatratores.com.br
-- (auth_uid já criado via signUp) e popula clientes, propriedades (com GPS na
-- área rural de Carlópolis), negócios (vários status, atualizados recentemente)
-- e visitas recentes — simulando um vendedor que está atualizando bem.
--
-- Idempotente: apaga os dados de teste anteriores desse vendedor e recria.
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

DO $$
DECLARE
  v_vend bigint;
  c1 bigint; c2 bigint; c3 bigint; c4 bigint; c5 bigint; c6 bigint;
  p1 bigint; p2 bigint; p3 bigint; p4 bigint; p5 bigint; p6 bigint;
  n1 bigint; n3 bigint; n5 bigint;
BEGIN
  -- 1. Vendedor (vincula ao auth user já criado)
  INSERT INTO vendedores (auth_uid, nome, email, telefone, ativo)
  VALUES ('a62f1488-8c4c-48a9-b8cf-7a016f574af2', 'HENRI (TESTE)',
          'vendedor.teste@novatratores.com.br', '(43) 99999-0000', true)
  ON CONFLICT (email) DO UPDATE
    SET auth_uid = EXCLUDED.auth_uid, nome = EXCLUDED.nome, ativo = true
  RETURNING id INTO v_vend;

  -- Limpa dados de teste anteriores deste vendedor (re-run limpo)
  DELETE FROM visitas  WHERE vendedor_id = v_vend;
  DELETE FROM negocios WHERE vendedor_id = v_vend;
  DELETE FROM "Clientes" WHERE cliente_dono_id IN (SELECT id FROM clientes_vendas WHERE vendedor_id = v_vend);
  DELETE FROM clientes_vendas WHERE vendedor_id = v_vend;
  DELETE FROM audit_logs_vendas WHERE vendedor_id = v_vend AND acao = 'login';

  -- 2. Clientes (produtores rurais de Carlópolis)
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'João Aparecido Ribeiro', '(43) 99811-2201') RETURNING id INTO c1;
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'Sebastião Munhoz',       '(43) 99744-3380') RETURNING id INTO c2;
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'Marli Tonin',            '(43) 99622-7715') RETURNING id INTO c3;
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'Antônio Carlos Prado',   '(43) 99933-0102') RETURNING id INTO c4;
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'Devair Lopes',           '(43) 99855-4490') RETURNING id INTO c5;
  INSERT INTO clientes_vendas (vendedor_id, nome, telefone) VALUES (v_vend, 'Rosana Beraldo',         '(43) 99700-8866') RETURNING id INTO c6;

  -- 3. Propriedades (1 por cliente) — GPS espalhado na zona rural de Carlópolis (~ -23.42, -49.72)
  -- id_omie é NOT NULL; usamos faixa fictícia 9900000xx (fora do range dos reais).
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000001, c1, 'Sítio Santa Rita', 'João Aparecido Ribeiro', 'Carlópolis', 'PR', -23.3985, -49.7452, -23.3985, -49.7452, 28, ARRAY['Goiaba','Maracujá']) RETURNING id INTO p1;
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000002, c2, 'Fazenda Boa Esperança', 'Sebastião Munhoz', 'Carlópolis', 'PR', -23.4521, -49.7008, -23.4521, -49.7008, 140, ARRAY['Soja','Milho']) RETURNING id INTO p2;
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000003, c3, 'Sítio das Goiabas', 'Marli Tonin', 'Carlópolis', 'PR', -23.4703, -49.7601, -23.4703, -49.7601, 16, ARRAY['Goiaba']) RETURNING id INTO p3;
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000004, c4, 'Fazenda Três Irmãos', 'Antônio Carlos Prado', 'Carlópolis', 'PR', -23.4102, -49.6905, -23.4102, -49.6905, 220, ARRAY['Pecuária','Milho']) RETURNING id INTO p4;
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000005, c5, 'Sítio Recanto Verde', 'Devair Lopes', 'Carlópolis', 'PR', -23.4358, -49.7309, -23.4358, -49.7309, 22, ARRAY['Goiaba','Tomate']) RETURNING id INTO p5;
  INSERT INTO "Clientes" (id_omie, cliente_dono_id, nome_fantasia, razao_social, cidade, estado, latitude, longitude, lat, lng, area_hectares, culturas)
    VALUES (990000006, c6, 'Fazenda Santa Luzia', 'Rosana Beraldo', 'Carlópolis', 'PR', -23.3881, -49.7123, -23.3881, -49.7123, 95, ARRAY['Soja','Café']) RETURNING id INTO p6;

  -- 4. Negócios (funil variado; updated_at recente = "atualizando bem")
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, data_fechamento_prevista, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c1, p1, 'em_negociacao', 285000, (now() + interval '7 days')::date, 'Trator Mahindra 6075 — negociando entrada', 'synced', now() - interval '20 days', now() - interval '1 day') RETURNING id INTO n1;
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, data_fechamento_prevista, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c2, p2, 'proposta_enviada', 410000, (now() + interval '15 days')::date, 'Mahindra 7095 cabinado — proposta enviada por e-mail', 'synced', now() - interval '12 days', now() - interval '2 days');
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, data_fechamento_prevista, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c3, p3, 'fechado_ganho', 210000, (now() - interval '3 days')::date, 'Mahindra 5050 — fechado! Entrega agendada', 'synced', now() - interval '25 days', now() - interval '3 days') RETURNING id INTO n3;
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c4, p4, 'prospect', 38000, 'Interesse em carregador frontal pra pecuária', 'synced', now() - interval '5 days', now() - interval '4 hours');
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, data_fechamento_prevista, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c5, p5, 'em_negociacao', 265000, (now() + interval '10 days')::date, 'Mahindra 6065 — avaliando usado na troca', 'synced', now() - interval '9 days', now() - interval '2 days') RETURNING id INTO n5;
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, motivo_perda, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c6, p6, 'fechado_perdido', 92000, '{"categoria":"preco","detalhes":"Comprou de concorrente"}', 'Pulverizador — perdido por preço', 'synced', now() - interval '30 days', now() - interval '8 days');
  INSERT INTO negocios (vendedor_id, cliente_id, propriedade_id, status, valor, notas, status_sync, created_at, updated_at)
    VALUES (v_vend, c1, p1, 'prospect', 24000, 'Implemento — plantadeira, primeiro contato', 'synced', now() - interval '2 days', now() - interval '6 hours');

  -- 5. Visitas recentes (GPS na propriedade; tipos variados)
  INSERT INTO visitas (vendedor_id, propriedade_id, negocio_id, tipo, data_visita, latitude, longitude, gps_accuracy, resumo, proximos_passos, data_proximo_contato, status_sync, created_at) VALUES
    (v_vend, p1, n1,   'presencial', now() - interval '1 day',  -23.3985, -49.7452, 6.5, 'Demonstração do 6075 no sítio. Cliente animado.', 'Levar proposta formal', (now() + interval '3 days')::date, 'synced', now() - interval '1 day'),
    (v_vend, p2, NULL, 'presencial', now() - interval '2 days', -23.4521, -49.7008, 8.0, 'Visita técnica, avaliou área de plantio do 7095.', 'Aguardar retorno da proposta', (now() + interval '5 days')::date, 'synced', now() - interval '2 days'),
    (v_vend, p3, n3,   'presencial', now() - interval '3 days', -23.4703, -49.7601, 5.2, 'Assinatura do contrato do 5050. Fechado!', 'Agendar entrega', NULL, 'synced', now() - interval '3 days'),
    (v_vend, p5, n5,   'presencial', now() - interval '3 days', -23.4358, -49.7309, 7.1, 'Avaliação do trator usado pra troca.', 'Calcular valor da troca', (now() + interval '2 days')::date, 'synced', now() - interval '3 days'),
    (v_vend, p4, NULL, 'telefonema', now() - interval '4 days', NULL, NULL, NULL, 'Ligação sobre carregador frontal.', 'Visitar fazenda', (now() + interval '6 days')::date, 'synced', now() - interval '4 days'),
    (v_vend, p1, NULL, 'mensagem',   now() - interval '5 days', NULL, NULL, NULL, 'WhatsApp com fotos do 6075.', NULL, NULL, 'synced', now() - interval '5 days'),
    (v_vend, p6, NULL, 'presencial', now() - interval '6 days', -23.3881, -49.7123, 9.3, 'Apresentou pulverizador. Cliente achou caro.', 'Reavaliar condição', NULL, 'synced', now() - interval '6 days'),
    (v_vend, p2, NULL, 'email',      now() - interval '7 days', NULL, NULL, NULL, 'Enviou proposta detalhada do 7095.', 'Follow-up em 1 semana', (now() + interval '1 day')::date, 'synced', now() - interval '7 days'),
    (v_vend, p4, NULL, 'presencial', now() - interval '8 days', -23.4102, -49.6905, 6.8, 'Primeira visita à Fazenda Três Irmãos.', 'Mapear necessidades', NULL, 'synced', now() - interval '8 days'),
    (v_vend, p5, NULL, 'presencial', now() - interval '10 days', -23.4358, -49.7309, 7.7, 'Tour pela área de goiaba e tomate.', 'Propor 6065', (now() + interval '4 days')::date, 'synced', now() - interval '10 days'),
    (v_vend, p3, NULL, 'telefonema', now() - interval '12 days', NULL, NULL, NULL, 'Negociação final do 5050 por telefone.', 'Marcar assinatura', NULL, 'synced', now() - interval '12 days'),
    (v_vend, p6, NULL, 'presencial', now() - interval '13 days', -23.3881, -49.7123, 8.9, 'Visita inicial à Fazenda Santa Luzia.', 'Levantar demanda de pulverização', NULL, 'synced', now() - interval '13 days');

  -- 6. Logins recentes (alimenta o "último acesso" do supervisor)
  INSERT INTO audit_logs_vendas (acao, entidade, vendedor_id, vendedor_nome, data_hora) VALUES
    ('login', 'sessao', v_vend, 'HENRI (TESTE)', now() - interval '3 hours'),
    ('login', 'sessao', v_vend, 'HENRI (TESTE)', now() - interval '1 day'),
    ('login', 'sessao', v_vend, 'HENRI (TESTE)', now() - interval '2 days'),
    ('login', 'sessao', v_vend, 'HENRI (TESTE)', now() - interval '4 days');

  RAISE NOTICE 'Seed OK. vendedor_id=%, 6 clientes, 6 propriedades, 7 negocios, 12 visitas.', v_vend;
END $$;
