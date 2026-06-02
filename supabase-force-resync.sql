-- ============================================
-- Force sync: supervisor sinaliza que vendedores devem refazer pull (2026-06-02)
--
-- Quando supervisor edita catalogo_overrides ou cria nova categoria/marca,
-- vendedores logados ainda veem os dados antigos por causa de cache. O admin
-- bota um "carimbo" no vendedor (timestamp) e o app do vendedor, ao abrir,
-- compara com lastForceSync local. Se for mais recente, limpa o IDB e refaz
-- pull from scratch.
--
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

ALTER TABLE vendedores
  ADD COLUMN IF NOT EXISTS force_resync_at timestamptz;

-- RPC pra o admin disparar facilmente. Atualiza TODOS os vendedores ativos
-- (ou um especifico se passar vendedor_id). Retorna quantos foram marcados.
CREATE OR REPLACE FUNCTION force_resync_vendedores(vendedor_id_param bigint DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER  -- roda como dono pra bypass do RLS de vendedores (que so deixa
                  -- o proprio vendedor atualizar seu registro). Validacao manual
                  -- abaixo garante que so supervisor consegue chamar.
SET search_path = public
AS $$
DECLARE
  afetados int;
BEGIN
  -- Apenas supervisor pode chamar
  IF NOT EXISTS (SELECT 1 FROM supervisores WHERE auth_uid = auth.uid()) THEN
    RAISE EXCEPTION 'Apenas supervisores podem forcar resync';
  END IF;

  IF vendedor_id_param IS NOT NULL THEN
    UPDATE vendedores
      SET force_resync_at = now(), updated_at = now()
      WHERE id = vendedor_id_param;
  ELSE
    UPDATE vendedores
      SET force_resync_at = now(), updated_at = now()
      WHERE ativo = true;
  END IF;

  GET DIAGNOSTICS afetados = ROW_COUNT;
  RETURN afetados;
END;
$$;

-- Permite chamar via REST: POST /rest/v1/rpc/force_resync_vendedores
GRANT EXECUTE ON FUNCTION force_resync_vendedores(bigint) TO authenticated, anon;
