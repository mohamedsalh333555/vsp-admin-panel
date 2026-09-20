import { createClient } from '@supabase/supabase-js';

const DEFAULT_PROJECT_URL = 'https://mktqkddbcddrxjxabdua.supabase.co';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = (envUrl && envUrl.includes('supabase.co')) ? envUrl : DEFAULT_PROJECT_URL;
export const SUPABASE_ANON_KEY = envAnonKey || '';

if (!SUPABASE_ANON_KEY && typeof window !== 'undefined') {
  console.error('⚠️ [VSP Admin] Missing VITE_SUPABASE_ANON_KEY in environment variables.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Admin client strictly uses the authenticated admin user's session with RLS and SECURITY DEFINER RPCs (no service_role key exposed on client)
export const supabaseAdmin = supabase;

