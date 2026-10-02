-- Migration: Harden Actor is_blocked check on all sensitive Admin RPCs

-- 1. admin_set_admin_role_atomic
CREATE OR REPLACE FUNCTION public.admin_set_admin_role_atomic(
  p_user_id uuid,
  p_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_is_blocked boolean;
  v_target RECORD;
  v_new_role text := lower(trim(coalesce(p_role, '')));
  v_now timestamptz := timezone('utc', now());
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF v_actor_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller not authenticated');
    END IF;
    SELECT role, coalesce(is_blocked, false) INTO v_actor_role, v_actor_is_blocked FROM public.users WHERE id = v_actor_id;
    IF v_actor_is_blocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Actor account is blocked');
    END IF;
    IF COALESCE(v_actor_role, '') NOT IN ('co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Only system founders may change administrative roles');
    END IF;
  ELSE
    v_actor_role := 'service_role';
  END IF;

  IF v_new_role NOT IN ('admin', 'player', 'owner') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid role: allowed roles are admin, player, owner');
  END IF;

  SELECT id, role, email INTO v_target FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  IF v_target.role IN ('co_founder', 'cofounder', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot modify protected founder accounts');
  END IF;

  IF v_actor_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot change your own role');
  END IF;

  UPDATE public.users SET role = v_new_role, is_blocked = false, updated_at = v_now WHERE id = p_user_id;

  INSERT INTO public.system_audit_logs(
    action, table_name, record_id, old_data, new_data, changed_by, changed_by_role, created_at
  ) VALUES (
    'admin_role_change', 'users', p_user_id,
    jsonb_build_object('role', v_target.role, 'email', v_target.email),
    jsonb_build_object('role', v_new_role),
    v_actor_id, v_actor_role, v_now
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'new_role', v_new_role, 'server_time', v_now);
END;
$$;

-- 2. admin_resolve_dispute_atomic
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute_atomic(
  p_booking_id uuid,
  p_final_outcome text,
  p_home_score integer DEFAULT NULL::integer,
  p_away_score integer DEFAULT NULL::integer,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_actor_id uuid := auth.uid();
  v_actor_role TEXT;
  v_actor_is_blocked boolean;
  v_now timestamptz := timezone('utc', now());
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF v_actor_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT role, coalesce(is_blocked, false) INTO v_actor_role, v_actor_is_blocked FROM public.users WHERE id = v_actor_id;
    IF v_actor_is_blocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Actor account is blocked');
    END IF;
    IF COALESCE(v_actor_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin authorization required');
    END IF;
  ELSE
    v_actor_role := 'service_role';
  END IF;

  IF p_final_outcome NOT IN ('home_win', 'away_win', 'draw', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OUTCOME', 'message', 'النتيجة غير صالحة. المقبول: home_win, away_win, draw, cancelled');
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'الحجز غير موجود.');
  END IF;

  UPDATE public.bookings
  SET status = CASE WHEN p_final_outcome = 'cancelled' THEN 'cancelled' ELSE 'completed' END,
      final_outcome = p_final_outcome,
      match_result_status = 'confirmed',
      pending_outcome = NULL,
      requires_admin_intervention = false,
      home_team_score = COALESCE(p_home_score, home_team_score),
      away_team_score = COALESCE(p_away_score, away_team_score),
      host_score = COALESCE(p_home_score, host_score),
      away_score = COALESCE(p_away_score, away_score),
      dispute_notes = COALESCE(p_notes, dispute_notes),
      cancelled_at = CASE WHEN p_final_outcome = 'cancelled' THEN v_now ELSE cancelled_at END,
      cancellation_reason = CASE WHEN p_final_outcome = 'cancelled' THEN COALESCE('ملغي بقرار فض النزاع: ' || COALESCE(p_notes, ''), 'ملغي بقرار إدارة المنظومة') ELSE cancellation_reason END,
      updated_at = v_now
  WHERE id = p_booking_id;

  IF v_booking.player_team_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, type, created_at)
    SELECT captain_id, 'تم فض نزاع المباراة من إدارة VSP ⚖️', 'تم اعتماد النتيجة النهائية: ' || p_final_outcome, 'result_confirmation', v_now
    FROM public.teams WHERE id = v_booking.player_team_id;
  END IF;

  IF v_booking.opponent_team_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, body, type, created_at)
    SELECT captain_id, 'تم فض نزاع المباراة من إدارة VSP ⚖️', 'تم اعتماد النتيجة النهائية: ' || p_final_outcome, 'result_confirmation', v_now
    FROM public.teams WHERE id = v_booking.opponent_team_id;
  END IF;

  INSERT INTO public.system_audit_logs(
    action, table_name, record_id, old_data, new_data, changed_by, changed_by_role, created_at
  ) VALUES (
    'admin_resolve_dispute', 'bookings', p_booking_id,
    jsonb_build_object('status', v_booking.status, 'final_outcome', v_booking.final_outcome),
    jsonb_build_object('final_outcome', p_final_outcome, 'home_score', p_home_score, 'away_score', p_away_score, 'notes', p_notes),
    v_actor_id, v_actor_role, v_now
  );

  RETURN jsonb_build_object('success', true, 'outcome', p_final_outcome, 'server_time', v_now);
END;
$$;

-- 3. admin_resolve_report_atomic
CREATE OR REPLACE FUNCTION public.admin_resolve_report_atomic(
  p_report_id uuid,
  p_status text,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_is_blocked boolean;
  v_now timestamptz := timezone('utc', now());
  v_report record;
  v_status text := lower(trim(coalesce(p_status, '')));
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF v_caller_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT role, coalesce(is_blocked, false) INTO v_caller_role, v_caller_is_blocked FROM public.users WHERE id = v_caller_id;
    IF v_caller_is_blocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Actor account is blocked');
    END IF;
    IF coalesce(v_caller_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
    END IF;
  ELSE
    v_caller_role := 'service_role';
  END IF;

  IF v_status NOT IN ('pending', 'under_review', 'resolved', 'dismissed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid report status');
  END IF;

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id FOR UPDATE;
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
    'admin_resolve_report', 'reports', p_report_id,
    jsonb_build_object('status', v_report.status),
    jsonb_build_object('status', v_status, 'notes', p_notes),
    v_caller_id, v_caller_role, v_now
  );

  RETURN jsonb_build_object('success', true, 'report_id', p_report_id, 'status', v_status, 'server_time', v_now);
END;
$$;

-- 4. admin_send_broadcast_notification_atomic
CREATE OR REPLACE FUNCTION public.admin_send_broadcast_notification_atomic(
  p_title text,
  p_body text,
  p_target_audience text DEFAULT 'all'::text,
  p_type text DEFAULT 'announcement'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_is_blocked boolean;
  v_now timestamptz := timezone('utc', now());
  v_count int := 0;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' THEN
    IF v_actor_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
    SELECT role, coalesce(is_blocked, false) INTO v_actor_role, v_actor_is_blocked FROM public.users WHERE id = v_actor_id;
    IF v_actor_is_blocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Actor account is blocked');
    END IF;
    IF COALESCE(v_actor_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;
  ELSE
    v_actor_role := 'service_role';
  END IF;

  IF nullif(trim(coalesce(p_title, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification title is required');
  END IF;
  IF nullif(trim(coalesce(p_body, '')), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Notification body is required');
  END IF;
  IF p_target_audience NOT IN ('all', 'players', 'owners') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid target audience');
  END IF;

  INSERT INTO public.notifications(user_id, title, body, message, type, is_read, created_at)
  SELECT u.id, p_title, p_body, p_body, p_type, false, v_now
  FROM public.users u
  WHERE COALESCE(u.is_blocked, false) = false
    AND CASE
      WHEN p_target_audience = 'players' THEN u.role IN ('player') OR u.role IS NULL
      WHEN p_target_audience = 'owners' THEN u.role = 'owner'
      ELSE true
    END;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  INSERT INTO public.system_audit_logs(
    action, table_name, record_id, new_data, changed_by, changed_by_role, created_at
  ) VALUES (
    'admin_broadcast_notification', 'notifications', v_actor_id,
    jsonb_build_object('title', p_title, 'target_audience', p_target_audience, 'sent_count', v_count),
    v_actor_id, v_actor_role, v_now
  );

  RETURN jsonb_build_object('success', true, 'sent_count', v_count, 'target_audience', p_target_audience, 'server_time', v_now);
END;
$$;

-- 5. admin_cancel_booking_atomic
CREATE OR REPLACE FUNCTION public.admin_cancel_booking_atomic(
  p_booking_id uuid,
  p_reason text DEFAULT 'Cancelled by Admin'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_role text;
  v_is_blocked boolean;
  v_result jsonb;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    IF v_actor_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;
    SELECT role, coalesce(is_blocked, false) INTO v_role, v_is_blocked FROM public.users WHERE id = v_actor_id;
    IF v_is_blocked THEN
      RETURN jsonb_build_object('success', false, 'error', 'Actor account is blocked');
    END IF;
    IF coalesce(v_role, '') NOT IN ('admin', 'co_founder', 'cofounder', 'super_admin') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
    END IF;
  END IF;

  v_result := public.cancel_booking_with_refund_atomic(
    p_booking_id,
    coalesce(nullif(trim(p_reason), ''), 'Cancelled by Admin'),
    v_actor_id
  );
  RETURN v_result;
END;
$$;

-- 6. Explicit ACL lockdown against anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.admin_set_admin_role_atomic(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute_atomic(uuid, text, integer, integer, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report_atomic(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_send_broadcast_notification_atomic(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_booking_atomic(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_set_admin_role_atomic(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_dispute_atomic(uuid, text, integer, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report_atomic(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_send_broadcast_notification_atomic(text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_booking_atomic(uuid, text) TO authenticated, service_role;
