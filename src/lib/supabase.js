import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!envUrl || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(envUrl)) {
  throw new Error('VITE_SUPABASE_URL is required and must be the official Supabase project URL.');
}
if (!envAnonKey || envAnonKey.length < 20) {
  throw new Error('VITE_SUPABASE_ANON_KEY is required.');
}

export const SUPABASE_URL = envUrl;
export const SUPABASE_ANON_KEY = envAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// The admin panel uses the authenticated admin session.
// No service_role secret is shipped to the browser.
export const supabaseAdmin = supabase;
