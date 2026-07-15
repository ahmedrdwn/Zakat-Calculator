import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = !!(url && anon);

// Diagnostic — visible in the browser console so we can debug missing env vars
// without leaking key material (only booleans + lengths).
if (typeof window !== 'undefined') {
  const info = {
    supabaseEnabled,
    hasUrl: !!url,
    urlLength: (url || '').length,
    urlHostGuess: url ? String(url).replace(/^https?:\/\//, '').split('.')[0] : null,
    hasAnonKey: !!anon,
    anonKeyLength: (anon || '').length,
  };
  // eslint-disable-next-line no-console
  console.log('[personal-bank] supabase config:', info);
  if (!supabaseEnabled) {
    // eslint-disable-next-line no-console
    console.warn('[personal-bank] Supabase disabled — VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY were not present at build time. Check Vercel Environment Variables for the Production scope, then redeploy.');
  }
}

export const supabase = supabaseEnabled
  ? createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
