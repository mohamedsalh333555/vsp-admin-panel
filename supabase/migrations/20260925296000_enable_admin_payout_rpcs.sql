-- Admin payout RPCs are safe for authenticated execution because each function
-- performs its own admin/co-founder authorization check. The admin web panel
-- uses the authenticated Supabase client (never a service_role key).
grant execute on function public.admin_record_payout_settlement_atomic(uuid,numeric,text,text) to authenticated;
grant execute on function public.approve_payout_settlement_atomic(uuid,text) to authenticated;
