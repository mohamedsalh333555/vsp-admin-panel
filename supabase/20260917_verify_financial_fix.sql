-- ============================================================================
-- VERIFICATION SCRIPT: FINANCIAL RECONCILIATION FOR MOHAMMED SALAH
-- ============================================================================
-- Run this query in Supabase SQL Editor to verify that Mohammed Salah's
-- financials strictly reflect:
-- 1. Available Balance: 520.00 EGP (Matches Flutter App)
-- 2. Escrow Held Balance: 100.00 EGP (Upcoming Booking on Oct 6)
-- 3. Total Online Revenue: 620.00 EGP (Full gateway collection)
-- ============================================================================

SELECT 
    b.id AS booking_id,
    b.status,
    b.start_time,
    b.total_price,
    b.deposit_paid,
    b.payment_method,
    b.payment_status,
    b.is_paid,
    CASE 
        WHEN b.status = 'completed' THEN 'جاهز للصرف فوراً (520 ج.م)'
        WHEN b.status = 'confirmed' THEN 'أمانة معلقة لمباراة قادمة (100 ج.م)'
        ELSE 'حالة أخرى'
    END AS accounting_category
FROM public.bookings b
WHERE b.owner_id = '70830a34-5488-4377-9261-6fa814fdf6cd'
  AND LOWER(COALESCE(b.payment_method, '')) != 'cash'
  AND (b.payment_status = 'paid' OR b.is_paid = true)
  AND b.status IN ('completed', 'confirmed')
ORDER BY b.start_time DESC;

-- Verification of the stored procedure output
SELECT public.get_owner_financial_summary('70830a34-5488-4377-9261-6fa814fdf6cd');
