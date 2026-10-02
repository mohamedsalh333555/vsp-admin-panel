-- Migration: Harden admin_update_championship_status_atomic with state guards
CREATE OR REPLACE FUNCTION public.admin_update_championship_status_atomic(
  p_championship_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_role text;
  v_now timestamptz := timezone('utc', now());
  v_status text := lower(trim(coalesce(p_status, '')));
  v_champ record;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT role INTO v_role FROM public.users WHERE id = v_caller_id;
    IF coalesce(v_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
  ELSE
    v_role := 'service_role';
  END IF;

  IF v_status NOT IN ('draft', 'open', 'ongoing', 'completed', 'cancelled', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid championship status: ' || v_status);
  END IF;

  SELECT * INTO v_champ
  FROM public.championships
  WHERE id = p_championship_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Championship not found');
  END IF;

  -- Protect terminal states
  IF v_champ.status = 'cancelled' AND v_status <> 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transition out of cancelled status');
  END IF;

  IF v_champ.status = 'completed' AND v_status <> 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot transition out of completed status');
  END IF;

  -- If status is identical, return success directly
  IF v_champ.status = v_status THEN
    RETURN jsonb_build_object('success', true, 'championship_id', p_championship_id, 'status', v_status, 'message', 'Already in requested status');
  END IF;

  -- If cancelling, invoke cancel_championship_atomic logic to ensure refunds queue if any
  IF v_status = 'cancelled' THEN
    RETURN public.cancel_championship_atomic(p_championship_id);
  END IF;

  -- Apply status transition
  UPDATE public.championships
  SET status = v_status,
      is_approved = CASE WHEN v_status IN ('open', 'ongoing', 'completed') THEN true ELSE is_approved END,
      updated_at = v_now
  WHERE id = p_championship_id;

  -- Audit log
  INSERT INTO public.system_audit_logs(
    action, table_name, record_id, old_data, new_data, changed_by, changed_by_role, created_at
  ) VALUES (
    'admin_update_championship_status',
    'championships',
    p_championship_id,
    jsonb_build_object('status', v_champ.status, 'is_approved', v_champ.is_approved),
    jsonb_build_object('status', v_status),
    v_caller_id,
    v_role,
    v_now
  );

  RETURN jsonb_build_object(
    'success', true,
    'championship_id', p_championship_id,
    'previous_status', v_champ.status,
    'status', v_status,
    'server_time', v_now
  );
END;
$$;
