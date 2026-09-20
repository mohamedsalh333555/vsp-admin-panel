import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';

const AuthContext = createContext();

const COFOUNDER_EMAILS = [
  'mohamedsalh333555@gmail.com',
  'admin@vsp.com',
  'coo@vsp.com',
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
      const defaultPosition = 'CEO & COO';

      if (data) {
        const isCoFounder = isCoFounderEmail || data.role === 'cofounder' || data.role === 'co_founder';
        const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(data.role?.toLowerCase());
        // أمان تام: التحقق من أن الدور إداري فعلياً وأن الحساب غير محظور
        const isApprovedAdmin = !data.is_blocked && (isCoFounder || (isAdminRole && data.verification_status === 'approved'));

        // قراءة المنصب مباشرة من عمود position في الداتابيز أولاً وبشكل ديناميكي 100%
        const livePosition = data.position?.trim() 
          ? data.position 
          : (data.additional_data?.title || (isCoFounder ? defaultPosition : 'Admin'));

        setProfile({
          ...data,
          name: data.name?.trim() ? data.name : (isCoFounderEmail ? defaultName : (data.email || 'Admin')),
          position: livePosition,
          isCoFounder,
          isApprovedAdmin,
        });
      } else {
        setProfile({
          id: userId,
          email: normalizedEmail,
          name: defaultName,
          position: isCoFounderEmail ? defaultPosition : 'Admin',
          role: isCoFounderEmail ? 'co_founder' : 'guest',
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

    // فحص الصلاحية الإدارية فوراً لمنع تعليق الحسابات العادية
    try {
      const isCoFounderEmail = COFOUNDER_EMAILS.includes(normalizedEmail);
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role, is_blocked, verification_status')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userData?.is_blocked) {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        throw new Error('تم حظر أو إيقاف هذا الحساب الإداري. يرجى مراجعة إدارة المنظومة.');
      }

      const isCoFounder = isCoFounderEmail || userData?.role === 'cofounder' || userData?.role === 'co_founder';
      const isAdminRole = ['admin', 'super_admin', 'cofounder', 'co_founder'].includes(userData?.role?.toLowerCase());
      const isApprovedAdmin = isCoFounder || (isAdminRole && userData?.verification_status === 'approved');

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

    return data;
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
    <AuthContext.Provider value={{ user, profile, loading, login, logout, updateAvatar, fetchUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);