import { createClient } from '@supabase/supabase-js';

const VALID_PROJECT_URL = 'https://mktqkddbcddrxjxabdua.supabase.co';
const VALID_ANON_KEY = 'sb_publishable_ht3eLKZoEiQ49hh413Yfgw_E-S4k3-k';

// Sanitize env values: if an outdated/unregistered key from an old deployment is provided, fallback to the valid project key
const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const envServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const isInvalidAnonKey = !envAnonKey || envAnonKey.includes('sb_publishable_I6UoUL') || envAnonKey.length < 20;

export const SUPABASE_URL = (envUrl && envUrl.includes('supabase.co')) ? envUrl : VALID_PROJECT_URL;
export const SUPABASE_ANON_KEY = isInvalidAnonKey ? VALID_ANON_KEY : envAnonKey;
export const SUPABASE_SERVICE_KEY = envServiceKey && envServiceKey.startsWith('sb_secret_') ? envServiceKey : null;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Admin client with service role (falls back to client if no service key is set in environment)
export const supabaseAdmin = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;