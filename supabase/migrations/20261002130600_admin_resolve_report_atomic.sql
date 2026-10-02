-- Migration: Create admin_resolve_report_atomic
CREATE OR REPLACE FUNCTION public.admin_resolve_report_atomic(
  p_report_id uuid,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_now timestamptz := timezone('utc', now());
  v_report record;
  v_status text := lower(trim(coalesce(p_status, '')));
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
    IF coalesce(v_caller_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
  ELSE
    v_caller_role := 'service_role';
  END IF;

  IF v_status NOT IN ('pending', 'under_review', 'resolved', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report status');
  END IF;

  SELECT * INTO v_report
  FROM public.reports
  WHERE id = p_report_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;

  UPDATE public.reports
  SET status = v_status,
      details = CASE 
        WHEN p_notes IS NOT NULL AND trim(p_notes) <> '' 
        THEN coalesce(details, '') || E'\n[إجراء الإدارة: ' || trim(p_notes) || ']'
        ELSE details
      END
  WHERE id = p_report_id;

  INSERT INTO public.system_audit_logs(
    action, table_name, record_id, old_data, new_data, changed_by, changed_by_role, created_at
  ) VALUES (
    'admin_resolve_report',
    'reports',
    p_report_id,
    jsonb_build_object('status', v_report.status),
    jsonb_build_object('status', v_status, 'notes', p_notes),
    v_caller_id,
    v_caller_role,
    v_now
  );

  RETURN jsonb_build_object('success', true, 'report_id', p_report_id, 'status', v_status, 'server_time', v_now);
END;
$$;
