-- ============================================
-- Operação (Showroom) sempre preenchida (2026-07-07)
--
-- Problema: o seed de categoria_aplicacao (supabase-catalogo-aplicacao.sql)
-- rodou uma única vez. Máquina nova criada no admin fica com a coluna NULL
-- e SOME do eixo "Por operação" do Showroom.
--
-- Solução: trigger BEFORE INSERT/UPDATE que resolve pela família do Omie
-- (resolve_categoria_familia) sempre que a coluna vier NULL. Escolha manual
-- do admin (valor não-nulo, novo select "Operação (Showroom)") NUNCA é
-- sobrescrita. Ficha sem cruzamento Omie cai em 'a_classificar' (aparece na
-- porta "A classificar" para curadoria, em vez de sumir).
--
-- Roda DEPOIS de supabase-catalogo-aplicacao.sql (já aplicado). Idempotente.
-- Rodar em: https://supabase.com/dashboard/project/citrhumdkfivdzbmayde/sql/new
-- ============================================

-- 1. Trigger: resolve automático quando a coluna vem NULL --------------------
create or replace function trg_catalogo_produtos_categoria_aplicacao()
returns trigger
language plpgsql
as $$
begin
  if new.categoria_aplicacao is null then
    -- sem família do Omie o resolver devolve 'a_classificar':
    -- toda máquina aparece em alguma porta do Showroom.
    new.categoria_aplicacao := resolve_categoria_familia(new.filtro_supabase -> 'familia_nome' ->> 0);
  end if;
  return new;
end $$;

drop trigger if exists catalogo_produtos_categoria_aplicacao on catalogo_produtos;
create trigger catalogo_produtos_categoria_aplicacao
  before insert or update on catalogo_produtos
  for each row execute function trg_catalogo_produtos_categoria_aplicacao();

-- 2. Backfill: fichas criadas depois do seed (hoje ficam NULL e somem) -------
update catalogo_produtos cp
set categoria_aplicacao = resolve_categoria_familia(cp.filtro_supabase -> 'familia_nome' ->> 0)
where cp.categoria_aplicacao is null;

-- 3. Conferência: não deve restar '(nulo)' -----------------------------------
-- select coalesce(categoria_aplicacao,'(nulo)') cat, count(*)
-- from catalogo_produtos group by 1 order by 2 desc;
