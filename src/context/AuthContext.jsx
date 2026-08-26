import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

const COFOUNDER_EMAIL = 'mohamedsalh333555@gmail.com';

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
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        const isCoFounder = email === COFOUNDER_EMAIL || data.role === 'cofounder' || data.role === 'co_founder' || email === 'admin@vsp.com';
        setProfile({
          ...data,
          isCoFounder,
          isApprovedAdmin: isCoFounder || data.role === 'admin' || data.role === 'co_founder' || data.role === 'cofounder' || data.is_approved === true || email === 'admin@vsp.com' || email === COFOUNDER_EMAIL,
        });
      } else {
        // Fallback for co-founder
        const isCoFounder = email === COFOUNDER_EMAIL || email === 'admin@vsp.com';
        setProfile({
          id: userId,
          email,
          role: isCoFounder ? 'co_founder' : 'admin',
          isCoFounder,
          isApprovedAdmin: true,
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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    return data;
  };

  const register = async (name, phone, email, password) => {
    setLoading(true);
    const isCoFounder = email === COFOUNDER_EMAIL;
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setLoading(false);
      throw authError;
    }

    if (authData?.user) {
      await supabase.from('users').upsert({
        id: authData.user.id,
        name,
        phone,
        email,
        role: isCoFounder ? 'cofounder' : 'pending_admin',
        is_approved: isCoFounder,
        status: 'active',
      });
    }

    setLoading(false);
    return authData;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
