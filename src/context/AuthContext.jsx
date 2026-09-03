import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

const AuthContext = createContext();

const COFOUNDER_EMAILS = [
  'mohamedsalh333555@gmail.com',
  'admin@vsp.com',
  'hana.ramadan@vsp.com',
  'ceo@vsp.com',
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id, session.user.email);
      } else {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId, email) => {
    try {
      const normalizedEmail = (email || '').toLowerCase().trim();
      const isCoFounderEmail = COFOUNDER_EMAILS.includes(normalizedEmail);

      const dbClient = supabaseAdmin || supabase;
      const { data, error } = await dbClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const defaultName = normalizedEmail.includes('hana') ? 'Hana Ramadan' : 'Mohamed Saleh';
      const defaultPosition = normalizedEmail.includes('hana') ? 'CEO' : 'COO';

      if (data) {
        const isCoFounder = isCoFounderEmail || data.role === 'cofounder' || data.role === 'co_founder';
        const isApprovedAdmin = isCoFounder || data.role === 'admin' || data.role === 'super_admin' || data.verification_status === 'approved';
        
        setProfile({
          ...data,
          // الحفاظ على الاسم الحقيقي من قاعدة البيانات إن وجد، واستخدام الافتراضي فقط إذا كان الحقل فارغاً
          name: data.name?.trim() ? data.name : defaultName,
          position: data.position || (isCoFounder ? defaultPosition : 'Admin'),
          isCoFounder,
          isApprovedAdmin,
        });
      } else {
        setProfile({
          id: userId,
          email: normalizedEmail,
          name: defaultName,
          position: isCoFounderEmail ? defaultPosition : 'Admin',
          role: isCoFounderEmail ? 'cofounder' : 'admin',
          isCoFounder: isCoFounderEmail,
          isApprovedAdmin: isCoFounderEmail,
        });
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    const normalizedEmail = (email || '').toLowerCase().trim();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
    if (error) {
      setLoading(false);
      if (error.message === 'Invalid login credentials') {
        throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('يرجى تأكيد البريد الإلكتروني أو مراجعة إدارة المنظومة');
      }
      throw error;
    }
    return data;
  };

  const register = async (name, phone, email, password) => {
    setLoading(true);
    const normalizedEmail = (email || '').toLowerCase().trim();
    const isCoFounder = COFOUNDER_EMAILS.includes(normalizedEmail);

    let authUser = null;

    // 1. Try creating confirmed user directly with admin service (instant activation)
    try {
      if (supabaseAdmin?.auth?.admin) {
        const { data: adminCreated, error: adminErr } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: { name, phone },
        });

        if (!adminErr && adminCreated?.user) {
          authUser = adminCreated.user;
        }
      }
    } catch (e) {
      console.warn('Admin createUser fallback to signUp:', e);
    }

    // 2. Fallback to standard signUp
    if (!authUser) {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name, phone },
        },
      });

      if (authError) {
        setLoading(false);
        if (authError.message.includes('already registered')) {
          throw new Error('هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول مباشرة');
        }
        throw authError;
      }
      authUser = authData?.user;
    }

    // 3. Upsert user record in database using actual schema
    if (authUser) {
      const dbClient = supabaseAdmin || supabase;
      await dbClient.from('users').upsert({
        id: authUser.id,
        name: name.trim(),
        phone: phone.trim(),
        email: normalizedEmail,
        role: isCoFounder ? 'cofounder' : 'admin',
        verification_status: isCoFounder ? 'approved' : 'pending',
        is_identity_verified: isCoFounder,
        is_blocked: false,
        updated_at: new Date().toISOString(),
      });

      // Auto sign-in
      try {
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      } catch (_) {}
    }

    setLoading(false);
    return authUser;
  };

  // رفع ملف الأفاتار إلى الـ Bucket profile-pictures وحفظ الرابط العام
  const updateAvatar = async (file) => {
    if (!user || !file) return { success: false };
    try {
      const dbClient = supabaseAdmin || supabase;
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await dbClient.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = dbClient.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      await dbClient.from('users').update({
        profile_image_url: publicUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);

      setProfile((prev) => ({
        ...prev,
        profile_image_url: publicUrl,
      }));

      return { success: true, url: publicUrl };
    } catch (err) {
      console.error('Error updating avatar:', err);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, updateAvatar, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
