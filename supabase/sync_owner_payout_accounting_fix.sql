-- ============================================================================
-- VSP PLATFORM FINANCIAL INTEGRITY & OWNER SETTLEMENT SYNC
-- ============================================================================
-- Fix: Ensure the stadium owner receives 100% of their pitch price.
-- The platform commission (2%) and payment gateway fees are paid by the player
-- on top during checkout and must NOT be deducted from the pitch owner's balance.
-- ============================================================================

-- 1. UPDATE get_owner_financial_summary
CREATE OR REPLACE FUNCTION public.get_owner_financial_summary(p_owner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_total_online_revenue NUMERIC := 0.0;
    v_total_gateway_fees NUMERIC := 0.0;
    v_total_vsp_commission NUMERIC := 0.0;
    v_net_online_earnings NUMERIC := 0.0;
    v_total_withdrawn NUMERIC := 0.0;
    v_pending_payouts NUMERIC := 0.0;
    v_available_balance NUMERIC := 0.0;
    v_cash_revenue NUMERIC := 0.0;
    v_accumulated_debt NUMERIC := 0.0;
    v_debt_limit NUMERIC := 500.0;
    v_is_debt_blocked BOOLEAN := false;
    v_total_completed_bookings INT := 0;
BEGIN
    -- Verification of identity & authorization
    IF v_caller_id IS NULL AND current_user NOT IN ('postgres', 'service_role') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF v_caller_id IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
        IF v_caller_id != p_owner_id AND COALESCE(v_caller_role, '') NOT IN ('admin', 'co_founder') AND current_user NOT IN ('postgres', 'service_role') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized access to financial records');
        END IF;
    END IF;

    -- Fetch owner debt status
    SELECT accumulated_cash_debt, debt_limit, is_debt_blocked
    INTO v_accumulated_debt, v_debt_limit, v_is_debt_blocked
    FROM public.users WHERE id = p_owner_id;

    -- 1. Online revenue: Pitch hourly rate is preserved 100% for the owner
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(deposit_paid, 0.0) > 0.0 AND COALESCE(deposit_paid, 0.0) < total_price THEN deposit_paid
                ELSE total_price
            END
        ), 0.0),
        COALESCE(SUM(COALESCE(gateway_fee, platform_fee, 0.0)), 0.0),
        COALESCE(SUM(COALESCE(vsp_commission, round(total_price * 0.02, 2))), 0.0),
        COUNT(*)
    INTO 
        v_total_online_revenue,
        v_total_gateway_fees,
        v_total_vsp_commission,
        v_total_completed_bookings
    FROM public.bookings
    WHERE owner_id = p_owner_id
      AND LOWER(COALESCE(payment_method, '')) != 'cash'
      AND (payment_status = 'paid' OR is_paid = true)
      AND status != 'cancelled';

    -- CRITICAL FIX: Owner earnings equal full online revenue without platform fee deduction
    v_net_online_earnings := v_total_online_revenue;

    -- 2. Withdrawn and pending payouts
    SELECT COALESCE(SUM(amount), 0.0)
    INTO v_total_withdrawn
    FROM public.payout_settlements
    WHERE owner_id = p_owner_id AND status = 'completed';

    SELECT COALESCE(SUM(amount), 0.0)
    INTO v_pending_payouts
    FROM public.payout_settlements
    WHERE owner_id = p_owner_id AND status IN ('pending', 'approved');

    -- 3. Available balance (taking cash debt liability into account)
    v_available_balance := GREATEST(0.0, v_net_online_earnings - v_total_withdrawn - v_pending_payouts - COALESCE(v_accumulated_debt, 0.0));

    -- 4. Cash revenue
    SELECT COALESCE(SUM(total_price), 0.0)
    INTO v_cash_revenue
    FROM public.bookings
    WHERE owner_id = p_owner_id
      AND LOWER(COALESCE(payment_method, '')) = 'cash'
      AND (payment_status = 'paid' OR is_paid = true)
      AND status != 'cancelled';

    RETURN jsonb_build_object(
        'success', true,
        'owner_id', p_owner_id,
        'total_online_revenue', ROUND(v_total_online_revenue, 2),
        'total_gateway_fees', ROUND(v_total_gateway_fees, 2),
        'total_vsp_commission', ROUND(v_total_vsp_commission, 2),
        'net_online_earnings', ROUND(v_net_online_earnings, 2),
        'total_withdrawn', ROUND(v_total_withdrawn, 2),
        'pending_payouts', ROUND(v_pending_payouts, 2),
        'available_balance', ROUND(v_available_balance, 2),
        'cash_revenue', ROUND(v_cash_revenue, 2),
        'accumulated_cash_debt', ROUND(COALESCE(v_accumulated_debt, 0.0), 2),
        'debt_limit', ROUND(COALESCE(v_debt_limit, 500.0), 2),
        'is_debt_blocked', COALESCE(v_is_debt_blocked, false),
        'completed_bookings_count', v_total_completed_bookings
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_owner_financial_summary(uuid) TO authenticated, service_role;

-- 2. UPDATE request_payout_atomic
CREATE OR REPLACE FUNCTION public.request_payout_atomic(
    p_owner_id uuid,
    p_amount numeric,
    p_payout_method text,
    p_destination_account text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_total_online_revenue NUMERIC := 0.0;
    v_net_online_earnings NUMERIC := 0.0;
    v_total_withdrawn NUMERIC := 0.0;
    v_pending_payouts NUMERIC := 0.0;
    v_accumulated_debt NUMERIC := 0.0;
    v_available_balance NUMERIC := 0.0;
    v_new_settlement_id UUID;
    v_pending_count INT := 0;
BEGIN
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
    END IF;

    IF v_caller_id != p_owner_id THEN
        SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
        IF COALESCE(v_caller_role, '') NOT IN ('admin', 'co_founder') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized to request payout');
        END IF;
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'المبلغ المطلوب يجب أن يكون أكبر من صفر.');
    END IF;

    SELECT COUNT(*) INTO v_pending_count
    FROM public.payout_settlements
    WHERE owner_id = p_owner_id AND status IN ('pending', 'approved');

    IF v_pending_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'لديك طلب تسوية قيد المراجعة بالفعل من قبل الإدارة.');
    END IF;

    SELECT COALESCE(accumulated_cash_debt, 0.0)
    INTO v_accumulated_debt
    FROM public.users WHERE id = p_owner_id;

    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN COALESCE(deposit_paid, 0.0) > 0.0 AND COALESCE(deposit_paid, 0.0) < total_price THEN deposit_paid
                ELSE total_price
            END
        ), 0.0)
    INTO 
        v_total_online_revenue
    FROM public.bookings
    WHERE owner_id = p_owner_id
      AND LOWER(COALESCE(payment_method, '')) != 'cash'
      AND (payment_status = 'paid' OR is_paid = true)
      AND status != 'cancelled';

    -- Net online earnings equal full online volume
    v_net_online_earnings := v_total_online_revenue;

    SELECT COALESCE(SUM(amount), 0.0)
    INTO v_total_withdrawn
    FROM public.payout_settlements
    WHERE owner_id = p_owner_id AND status = 'completed';

    SELECT COALESCE(SUM(amount), 0.0)
    INTO v_pending_payouts
    FROM public.payout_settlements
    WHERE owner_id = p_owner_id AND status IN ('pending', 'approved');

    v_available_balance := GREATEST(0.0, v_net_online_earnings - v_total_withdrawn - v_pending_payouts - v_accumulated_debt);

    IF p_amount > v_available_balance THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'المبلغ المطلوب (' || p_amount || ' ج.م) أكبر من رصيدك المتاح للسحب (' || v_available_balance || ' ج.م).'
        );
    END IF;

    INSERT INTO public.payout_settlements (
        owner_id, user_id, amount, method, destination_account, status, created_at, updated_at
    ) VALUES (
        p_owner_id, p_owner_id, p_amount, p_payout_method, p_destination_account, 'pending', NOW(), NOW()
    ) RETURNING id INTO v_new_settlement_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'تم تقديم طلب التسوية بنجاح وهو قيد مراجعة الإدارة.',
        'settlement_id', v_new_settlement_id,
        'amount', p_amount,
        'remaining_balance', v_available_balance - p_amount
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.request_payout_atomic(uuid, numeric, text, text) TO authenticated, service_role;
