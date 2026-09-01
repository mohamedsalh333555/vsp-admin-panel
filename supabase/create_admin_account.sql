-- ==============================================================================
-- VSP PLATFORM - CREATE / RESET ADMIN & CO-FOUNDER ACCOUNT (FIXED)
-- ==============================================================================

-- 1. تحديث القيود على الأدوار للسماح بـ cofounder و admin
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
CHECK (role IN ('player', 'owner', 'admin', 'cofounder', 'co_founder', 'super_admin', 'pending_admin'));

-- 2. إنشاء وتفعيل حساب المشرف / المؤسس
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'mohamedsalh333555@gmail.com';
  v_password TEXT := 'Admin@123456'; -- كلمة المرور
BEGIN
  -- التأكد من وجود المستخدم في auth.users أو إنشاؤه
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"محمد صلاح"}'::jsonb,
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
  ELSE
    -- إذا كان المستخدم موجوداً، يتم تعيين كلمة المرور وتأكيد الإيميل فوراً
    UPDATE auth.users
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- إضافته وتفعيله في جدول users بصلاحية admin
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    verification_status,
    is_identity_verified,
    is_blocked,
    created_at,
    updated_at
  ) VALUES (
    v_user_id,
    v_email,
    'محمد صلاح',
    'admin',
    'approved',
    true,
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    verification_status = 'approved',
    is_identity_verified = true,
    is_blocked = false,
    updated_at = now();

END $$;
