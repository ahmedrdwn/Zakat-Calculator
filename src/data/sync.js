import { effect, signal } from '@preact/signals';
import { supabase, supabaseEnabled } from './supabase.js';
import { accountsSig, lotsSig, transactionsSig, settingsSig } from '../state/store.js';

export const userSig = signal(null);            // Supabase user or null
export const syncStatusSig = signal('idle');    // 'idle' | 'pulling' | 'pushing' | 'synced' | 'error' | 'offline'
export const syncErrorSig = signal('');
export const syncErrorDetailSig = signal(null); // richer diagnostic { message, code, hint }
export const lastSyncedAtSig = signal(null);

const TABLE = 'user_data';
let pushScheduled = false;
let installedAutoPush = false;

// Decode common Postgres/PostgREST errors into an actionable Arabic hint.
function explainError(err) {
  const code = err?.code || '';
  const msg = err?.message || String(err);
  let hint = null;
  const looksLikeMissingTable =
    code === '42P01' ||
    code === 'PGRST205' ||
    /relation .* does not exist/i.test(msg) ||
    /Could not find the table/i.test(msg) ||
    /schema cache/i.test(msg) ||
    (/user_data/i.test(msg) && /(not|couldn't|could not).*(exist|find)/i.test(msg));
  if (looksLikeMissingTable) {
    hint = 'جدول user_data غير موجود في مشروع Supabase. شغّل سكربت الإعداد من ملف SUPABASE_SETUP.md لإنشائه.';
  } else if (code === '42501' || /permission denied/i.test(msg) || /row-level security/i.test(msg) || /RLS/i.test(msg)) {
    hint = 'سياسة RLS تمنع الوصول. تأكد من تفعيل RLS وإضافة السياسات الأربع (own_row_read/insert/update/delete) في Supabase.';
  } else if (code === 'PGRST301' || /JWT/i.test(msg)) {
    hint = 'انتهت صلاحية جلسة الدخول. سجّل الخروج ثم الدخول من جديد.';
  } else if (/Failed to fetch/i.test(msg) || /NetworkError/i.test(msg)) {
    hint = 'تعذّر الاتصال بخوادم Supabase. تحقّق من اتصال الإنترنت وحاول مرة أخرى.';
  }
  return { message: msg, code, hint };
}

function reportError(where, err) {
  const detail = explainError(err);
  syncStatusSig.value = 'error';
  syncErrorSig.value = detail.hint ? `${detail.hint} (${detail.message})` : detail.message;
  syncErrorDetailSig.value = { where, ...detail, raw: err };
  // eslint-disable-next-line no-console
  console.error(`[sync:${where}]`, err, '→', detail);
}

// Pull the user's row and replace local state
export async function pullFromCloud() {
  if (!supabaseEnabled || !userSig.value) return;
  syncStatusSig.value = 'pulling';
  syncErrorSig.value = '';
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('accounts,lots,transactions,settings,updated_at')
      .eq('user_id', userSig.value.id)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      if (Array.isArray(data.accounts)) accountsSig.value = data.accounts;
      if (Array.isArray(data.lots)) lotsSig.value = data.lots;
      if (Array.isArray(data.transactions)) transactionsSig.value = data.transactions;
      if (data.settings) settingsSig.value = { ...settingsSig.value, ...data.settings };
      lastSyncedAtSig.value = data.updated_at || new Date().toISOString();
    }
    syncStatusSig.value = 'synced';
  } catch (e) {
    reportError('pull', e);
  }
}

// Upsert the user's row with local state
export async function pushToCloud() {
  if (!supabaseEnabled || !userSig.value) return;
  syncStatusSig.value = 'pushing';
  syncErrorSig.value = '';
  try {
    const payload = {
      user_id: userSig.value.id,
      accounts: accountsSig.value,
      lots: lotsSig.value,
      transactions: transactionsSig.value,
      settings: settingsSig.value,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    lastSyncedAtSig.value = payload.updated_at;
    syncStatusSig.value = 'synced';
  } catch (e) {
    reportError('push', e);
  }
}

// Debounced auto-push whenever local state changes AND user is signed in
export function installAutoPush() {
  if (installedAutoPush) return;
  installedAutoPush = true;
  effect(() => {
    // Track all four signals so any change triggers the effect
    accountsSig.value; lotsSig.value; transactionsSig.value; settingsSig.value;
    if (!userSig.value || !supabaseEnabled) return;
    if (pushScheduled) return;
    pushScheduled = true;
    setTimeout(() => { pushScheduled = false; pushToCloud(); }, 1500);
  });
}

// Bootstraps auth listener + initial pull on session restore
export function initSupabaseAuth() {
  if (!supabaseEnabled) return;
  supabase.auth.getSession().then(({ data }) => {
    userSig.value = data.session?.user || null;
    if (userSig.value) firstSync();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    const prev = userSig.value;
    const next = session?.user || null;
    userSig.value = next;
    if (next && !prev) firstSync();
    if (!next) syncStatusSig.value = 'idle';
  });
}

// On sign-in: if server row is empty, push local; else pull server
async function firstSync() {
  if (!supabaseEnabled || !userSig.value) return;
  try {
    syncStatusSig.value = 'pulling';
    const { data, error } = await supabase
      .from(TABLE).select('user_id,accounts,lots,transactions')
      .eq('user_id', userSig.value.id).maybeSingle();
    if (error) throw error;
    const serverEmpty = !data || (
      (data.accounts?.length || 0) === 0 &&
      (data.lots?.length || 0) === 0 &&
      (data.transactions?.length || 0) === 0
    );
    if (serverEmpty) await pushToCloud();
    else await pullFromCloud();
    installAutoPush();
  } catch (e) {
    reportError('firstSync', e);
  }
}

export async function signInWithEmail(email, password) {
  if (!supabaseEnabled) throw new Error('لم يتم إعداد Supabase — يرجى مراجعة الإعدادات.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signUpWithEmail(email, password) {
  if (!supabaseEnabled) throw new Error('لم يتم إعداد Supabase.');
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signInWithGoogle() {
  if (!supabaseEnabled) throw new Error('لم يتم إعداد Supabase.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  if (!supabaseEnabled) return;
  await supabase.auth.signOut();
}
