import { createClient } from '@supabase/supabase-js';

const VALID_PROJECT_URL = 'https://mktqkddbcddrxjxabdua.supabase.co';
const VALID_ANON_KEY = 'sb_publishable_ht3eLKZoEiQ49hh413Yfgw_E-S4k3-k';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isInvalidAnonKey = !envAnonKey || envAnonKey.includes('sb_publishable_I6UoUL') || envAnonKey.length < 20;

export const SUPABASE_URL = (envUrl && envUrl.includes('supabase.co')) ? envUrl : VALID_PROJECT_URL;
export const SUPABASE_ANON_KEY = isInvalidAnonKey ? VALID_ANON_KEY : envAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Admin client strictly uses the authenticated admin user's session with RLS (no service_role key)
export const supabaseAdmin = supabase;
