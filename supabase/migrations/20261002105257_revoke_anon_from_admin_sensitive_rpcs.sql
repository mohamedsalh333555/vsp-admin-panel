-- Migration: Revoke anon from admin sensitive RPCs
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute_atomic(uuid, text, integer, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_send_broadcast_notification_atomic(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report_atomic(uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute_atomic(uuid, text, integer, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_send_broadcast_notification_atomic(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report_atomic(uuid, text, text) TO authenticated, service_role;
