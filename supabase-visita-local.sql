-- Onde foi a visita x para quem foi o trabalho.
-- Rodar no SQL Editor do Supabase do portal ANTES de publicar o app.
-- Idempotente. A view vw_visitas_detalhadas NAO muda: o app le o local direto de visitas.

-- 1) local da visita (nulo = na propriedade do cliente)
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS local_tipo text;
ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS local_nome text;
ALTER TABLE public.visitas DROP CONSTRAINT IF EXISTS visitas_local_tipo_check;
ALTER TABLE public.visitas ADD CONSTRAINT visitas_local_tipo_check
  CHECK (local_tipo IS NULL OR local_tipo IN ('propriedade','banco','cartorio','loja','demonstracao','outro'));

-- 2) parceiro (banco, cartorio...): fica fora da carteira de clientes
ALTER TABLE public."portal_nt_clientes_PRINCIPAL" ADD COLUMN IF NOT EXISTS tipo_cadastro text;
ALTER TABLE public."portal_nt_clientes_PRINCIPAL" DROP CONSTRAINT IF EXISTS principal_tipo_cadastro_check;
ALTER TABLE public."portal_nt_clientes_PRINCIPAL" ADD CONSTRAINT principal_tipo_cadastro_check
  CHECK (tipo_cadastro IS NULL OR tipo_cadastro IN ('cliente','parceiro'));

-- 3) agencias que ja foram criadas como cliente (Sicredi Taguai e as duas da Cresol)
UPDATE public."portal_nt_clientes_PRINCIPAL" SET tipo_cadastro = 'parceiro'
 WHERE id IN (248950, 248954, 248955);

-- 4) as visitas presenciais delas passam a ser "banco"
UPDATE public.visitas v SET local_tipo = 'banco', local_nome = p.nome_fantasia
  FROM public."portal_nt_clientes_PRINCIPAL" p
 WHERE p.id = v.propriedade_id AND p.tipo_cadastro = 'parceiro'
   AND v.tipo = 'presencial' AND v.local_tipo IS NULL;

-- 5) GPS de banco/cartorio nao pode sugerir vinculo com imovel rural (CAR)
CREATE OR REPLACE FUNCTION public.agro_sugerir_vinculos_por_visita(p_execucao_id bigint, p_accuracy_max numeric DEFAULT 150)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_n integer;
BEGIN
  WITH vis AS (
    SELECT v.id, v.propriedade_id, v.vendedor_id, v.tipo, v.data_visita::date AS dia, v.gps_accuracy,
           ST_SetSRID(ST_MakePoint(v.longitude::double precision, v.latitude::double precision), 4674) AS pt
      FROM public.visitas v
     WHERE v.deleted_at IS NULL
       AND v.tipo = 'presencial'
       AND COALESCE(v.local_tipo, 'propriedade') = 'propriedade'
       AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
       AND (v.gps_accuracy IS NULL OR v.gps_accuracy <= p_accuracy_max)
       AND COALESCE(v.retroativa, false) = false
       AND v.propriedade_id IS NOT NULL
  ),
  hit AS (
    SELECT c.cod_car, vis.propriedade_id::text AS cliente_ref, vis.id AS visita_id, vis.vendedor_id, vis.dia, vis.gps_accuracy
      FROM vis
      JOIN public.agro_car_imovel c
        ON c.status_car = 'AT' AND c.geom && vis.pt AND ST_Contains(c.geom, vis.pt)
  ),
  agg AS (
    SELECT h.cod_car, h.cliente_ref,
           count(*)::integer AS n_presenciais,
           min(h.dia) AS primeira_visita, max(h.dia) AS ultima_visita,
           avg(h.gps_accuracy)::numeric(8,1) AS gps_media,
           array_agg(DISTINCT h.visita_id ORDER BY h.visita_id) AS visita_ids,
           array_agg(DISTINCT COALESCE(vd.nome, 'vendedor ' || h.vendedor_id::text)) AS vendedores
      FROM hit h
      LEFT JOIN public.vendedores vd ON vd.id = h.vendedor_id
     GROUP BY h.cod_car, h.cliente_ref
  ),
  ctx AS (
    SELECT a.*,
           (SELECT count(DISTINCT a2.cliente_ref) FROM agg a2 WHERE a2.cod_car = a.cod_car)   AS clientes_no_car,
           (SELECT count(DISTINCT a3.cod_car)     FROM agg a3 WHERE a3.cliente_ref = a.cliente_ref) AS cars_do_cliente,
           p.id_omie, p.nome_fantasia, p.razao_social
      FROM agg a
      LEFT JOIN public."portal_nt_clientes_PRINCIPAL" p ON p.id::text = a.cliente_ref
  ),
  calc AS (
    SELECT c.*,
           (LEAST(c.n_presenciais, 3)
            + CASE WHEN c.gps_media IS NOT NULL AND c.gps_media <= 30 THEN 1 ELSE 0 END
            - CASE WHEN c.clientes_no_car > 1 THEN 1 ELSE 0 END
            - CASE WHEN c.cars_do_cliente > 3 THEN 0.5 ELSE 0 END)::numeric(6,2) AS score,
           concat_ws('; ',
             c.n_presenciais || ' visita(s) presencial(is) dentro do CAR',
             CASE WHEN c.gps_media IS NOT NULL THEN 'GPS médio ' || c.gps_media || ' m' END,
             CASE WHEN c.clientes_no_car > 1 THEN 'ATENÇÃO: este CAR recebeu visitas de ' || c.clientes_no_car || ' clientes' END,
             CASE WHEN c.cars_do_cliente > 3 THEN 'cliente aparece em ' || c.cars_do_cliente || ' CARs' END
           ) AS motivo
      FROM ctx c
  )
  INSERT INTO public.agro_car_vinculo_sugestao AS s
        (cod_car, cliente_ref, cliente_omie_id, cliente_nome, propriedade_nome, n_visitas, n_presenciais,
         primeira_visita, ultima_visita, vendedores, gps_accuracy_media, visita_ids, score, motivo, execucao_id, atualizado_em)
  SELECT cod_car, cliente_ref,
         COALESCE(id_omie::text, 'principal:' || cliente_ref),
         COALESCE(NULLIF(nome_fantasia, ''), NULLIF(razao_social, ''), 'cliente ' || cliente_ref),
         NULLIF(razao_social, ''),
         n_presenciais, n_presenciais, primeira_visita, ultima_visita, vendedores, gps_media, visita_ids, score, motivo,
         p_execucao_id, now()
    FROM calc
  ON CONFLICT (cod_car, cliente_ref) DO UPDATE
     SET n_visitas = EXCLUDED.n_visitas, n_presenciais = EXCLUDED.n_presenciais,
         primeira_visita = EXCLUDED.primeira_visita, ultima_visita = EXCLUDED.ultima_visita,
         vendedores = EXCLUDED.vendedores, gps_accuracy_media = EXCLUDED.gps_accuracy_media,
         visita_ids = EXCLUDED.visita_ids, score = EXCLUDED.score, motivo = EXCLUDED.motivo,
         cliente_nome = EXCLUDED.cliente_nome, propriedade_nome = EXCLUDED.propriedade_nome,
         execucao_id = EXCLUDED.execucao_id, atualizado_em = now()
   WHERE s.status = 'pendente';          -- o que já foi aceito/rejeitado não é reaberto

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

NOTIFY pgrst, 'reload schema';
