import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoadFailed, setProfileLoadFailed] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const fetchUserProfile = async (userId) => {
    try {
      setProfileLoadFailed(false);
      setProfileError(null);
      const dbClient = supabaseAdmin || supabase;
      const { data, error } = await dbClient
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const defaultName = 'Admin';
      const defaultPosition = 'Admin';

      if (data) {
        const isCoFounder = data.role === 'cofounder' || data.role === 'co_founder';
        const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(data.role?.toLowerCase());
        // أمان تام: التحقق من أن الدور إداري فعلياً وأن الحساب غير محظور
        const isApprovedAdmin = !data.is_blocked && isAdminRole;

        // قراءة المنصب مباشرة من عمود position في الداتابيز، وتصحيح المنصب الافتراضي بدقة
        let livePosition = data.position?.trim();
        if (!livePosition || livePosition === 'CEO & COO') {
          livePosition = isCoFounder ? defaultPosition : (data.additional_data?.title || 'Admin');
        }

        setProfile({
          ...data,
          name: data.name?.trim() ? data.name : (data.email || 'Admin'),
          position: livePosition,
          isCoFounder,
          isApprovedAdmin,
        });
        setProfileLoadFailed(false);
        setProfileError(null);
      } else {
        // Missing profile in public.users: Fail-closed with unapproved guest state
        setProfile({
          id: userId,
          email: '',
          name: defaultName,
          position: defaultPosition,
          role: 'guest',
          is_blocked: false,
          isCoFounder: false,
          isApprovedAdmin: false,
        });
        setProfileLoadFailed(false);
        setProfileError(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfile(null);
      setProfileLoadFailed(true);
      setProfileError(err?.message || 'تعذر التحقق من صلاحيات الحساب الإداري');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
        setProfileLoadFailed(false);
        setProfileError(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const retryProfile = () => {
    if (user?.id) {
      setLoading(true);
      fetchUserProfile(user.id);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    setProfileLoadFailed(false);
    setProfileError(null);
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

    // فحص الصلاحية الإدارية فوراً لمنع تعليق الحسابات العادية
    try {
      const dbClient = supabaseAdmin || supabase;
      const { data: userData, error: profileErr } = await dbClient
        .from('users')
        .select('id, email, role, is_blocked, verification_status')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileErr) {
        throw profileErr;
      }

      if (!userData) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        throw new Error('لم يتم العثور على بيانات هذا المستخدم في النظام.');
      }

      if (userData.is_blocked) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        throw new Error('تم حظر أو إيقاف هذا الحساب الإداري. يرجى مراجعة إدارة المنظومة.');
      }

      const isCoFounder = userData.role === 'cofounder' || userData.role === 'co_founder';
      const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(userData.role?.toLowerCase());
      const isApprovedAdmin = !userData.is_blocked && isAdminRole;

      if (!isApprovedAdmin) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        throw new Error('عفواً، هذا الحساب ليس لديه صلاحيات إدارية. الدخول مخصص لمسؤولي المنظومة فقط، يرجى استخدام تطبيق الموبايل.');
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }

    setLoading(false);
    return data;
  };

  // رفع ملف الأفاتار إلى الـ Bucket profile-pictures وحفظ الرابط العام
  const updateAvatar = async (file) => {
    if (!user || !file) return { success: false };
    try {
      const dbClient = supabaseAdmin || supabase;
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/avatars/${fileName}`;

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
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Error signing out:', e);
    }
    setUser(null);
    setProfile(null);
    setProfileLoadFailed(false);
    setProfileError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      profileLoadFailed,
      profileError,
      retryProfile,
      login,
      logout,
      updateAvatar,
      fetchUserProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
