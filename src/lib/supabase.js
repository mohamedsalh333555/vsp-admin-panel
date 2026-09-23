import { createClient } from '@supabase/supabase-js';

const DEFAULT_PROJECT_URL = 'https://mktqkddbcddrxjxabdua.supabase.co';
const VERIFIED_ANON_KEY = 'sb_publishable_ht3eLKZoEiQ49hh413Yfgw_E-S4k3-k';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const SUPABASE_URL = (envUrl && envUrl.includes('supabase.co')) ? envUrl : DEFAULT_PROJECT_URL;
// تجنب المفتاح المعطوب أو غير المسجل المسجل في Vercel واستخدام المفتاح الفعّال فوراً
export const SUPABASE_ANON_KEY = (envAnonKey && envAnonKey.length > 20 && !envAnonKey.includes('I6UoUL32GmnFZcXQ5ioasA')) 
  ? envAnonKey 
  : VERIFIED_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Admin client strictly uses the authenticated admin user's session with RLS and SECURITY DEFINER RPCs (no service_role key exposed on client)
export const supabaseAdmin = supabase;

