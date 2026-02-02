-- =============================================================================
-- Patch 013: Signed amounts
-- Todas as transações agora usam sinal natural:
--   negativo = saída de dinheiro, positivo = entrada
-- Fórmula de saldo: opening_balance + sum(amount) — sem CASE, sem JOIN
-- =============================================================================

-- 1) Migrar expenses manuais: flipar pra negativo
UPDATE transactions t SET amount = -abs(t.amount)
FROM categories c
WHERE t.category_id = c.id
  AND c.category_type = 'expense'
  AND t.amount > 0
  AND coalesce(t.source, 'manual') NOT IN ('transfer', 'adjustment', 'ofx');

-- 2) Recriar account_balance() simplificada
CREATE OR REPLACE FUNCTION public.account_balance(account_uuid uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(a.opening_balance, 0) +
    coalesce((
      SELECT sum(t.amount)
      FROM public.transactions t
      WHERE t.account_id = a.id
    ), 0)
  FROM public.accounts a
  WHERE a.id = account_uuid;
$$;

-- 3) Recriar account_balance_at() simplificada
CREATE OR REPLACE FUNCTION public.account_balance_at(account_uuid uuid, at_date date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(a.opening_balance, 0) +
    coalesce((
      SELECT sum(t.amount)
      FROM public.transactions t
      WHERE t.account_id = a.id
        AND t.posted_at <= at_date
    ), 0)
  FROM public.accounts a
  WHERE a.id = account_uuid;
$$;

GRANT EXECUTE ON FUNCTION public.account_balance_at(uuid, date) TO anon, authenticated, service_role;
