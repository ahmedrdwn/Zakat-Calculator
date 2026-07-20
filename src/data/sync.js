import { effect, signal } from '@preact/signals';
import { supabase, supabaseEnabled } from './supabase.js';
import { accountsSig, lotsSig, transactionsSig, settingsSig } from '../state/store.js';

export const userSig = signal(null);            // Supabase user or null
export const syncStatusSig = signal('idle');    // 'idle' | 'pulling' | 'pushing' | 'synced' | 'error' | 'offline'
export const syncErrorSig = signal('');
export const syncErrorDetailSig = signal(null); // richer diagnostic { message, code, hint }
export const lastSyncedAtSig = signal(null);

// Household sharing —
//   syncTargetSig: user_id of the row we sync to. Equal to userSig.value.id
//     when the user has their own vault; different when they've joined
//     someone else's shared household.
//   sharedWithSig: emails currently in the target row's shared_with array
//     (surfaced in Settings so users can manage sharing).
export const syncTargetSig = signal(null);
export const sharedWithSig = signal([]);
export const targetOwnerSig = signal(null);      // owner user_id of the active row (for banner UX)

const TABLE = 'user_data';
let pushScheduled = false;
let installedAutoPush = false;

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
  } else if (/shared_with/i.test(msg) && (/column/i.test(msg) || /does not exist/i.test(msg))) {
    hint = 'عمود shared_with مفقود. شغّل ترحيل المشاركة من ملف SHARING_SETUP.md.';
  } else if (code === '42501' || /permission denied/i.test(msg) || /row-level security/i.test(msg) || /RLS/i.test(msg)) {
    hint = 'سياسة RLS تمنع الوصول. تأكد من تحديث السياسات لدعم المشاركة (راجع SHARING_SETUP.md).';
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
  console.error(`[sync:${where}]`, err, '→', detail);
}

function currentEmail() {
  return userSig.value?.email?.toLowerCase() || '';
}

// Pick which row this signed-in user should sync to:
//   1. If they have their own row → use it.
//   2. Else if they're shared into someone else's row → use the first match.
//   3. Else → their own uid (will insert on first push).
async function resolveSyncTarget() {
  const uid = userSig.value.id;
  const email = currentEmail();
  const filter = email
    ? `user_id.eq.${uid},shared_with.cs.{${email}}`
    : `user_id.eq.${uid}`;
  const { data, error } = await supabase
    .from(TABLE)
    .select('user_id, shared_with')
    .or(filter);
  if (error) throw error;
  const rows = data || [];
  const own = rows.find(r => r.user_id === uid);
  const chosen = own || rows[0] || null;
  syncTargetSig.value = chosen?.user_id || uid;
  targetOwnerSig.value = chosen?.user_id || uid;
  sharedWithSig.value = chosen?.shared_with || [];
}

// Pull whichever row is our sync target (own or joined household)
export async function pullFromCloud() {
  if (!supabaseEnabled || !userSig.value || !syncTargetSig.value) return;
  syncStatusSig.value = 'pulling';
  syncErrorSig.value = '';
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('accounts,lots,transactions,settings,updated_at,shared_with')
      .eq('user_id', syncTargetSig.value)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      if (Array.isArray(data.accounts)) accountsSig.value = data.accounts;
      if (Array.isArray(data.lots)) lotsSig.value = data.lots;
      if (Array.isArray(data.transactions)) transactionsSig.value = data.transactions;
      if (data.settings) settingsSig.value = { ...settingsSig.value, ...data.settings };
      if (Array.isArray(data.shared_with)) sharedWithSig.value = data.shared_with;
      lastSyncedAtSig.value = data.updated_at || new Date().toISOString();
    }
    syncStatusSig.value = 'synced';
  } catch (e) {
    reportError('pull', e);
  }
}

// Upsert the target row (own or the household one we've joined)
export async function pushToCloud() {
  if (!supabaseEnabled || !userSig.value || !syncTargetSig.value) return;
  syncStatusSig.value = 'pushing';
  syncErrorSig.value = '';
  try {
    const payload = {
      user_id: syncTargetSig.value,
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

export function installAutoPush() {
  if (installedAutoPush) return;
  installedAutoPush = true;
  effect(() => {
    accountsSig.value; lotsSig.value; transactionsSig.value; settingsSig.value;
    if (!userSig.value || !supabaseEnabled) return;
    if (pushScheduled) return;
    pushScheduled = true;
    setTimeout(() => { pushScheduled = false; pushToCloud(); }, 1500);
  });
}

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
    if (!next) {
      syncStatusSig.value = 'idle';
      syncTargetSig.value = null;
      targetOwnerSig.value = null;
      sharedWithSig.value = [];
    }
  });
}

async function firstSync() {
  if (!supabaseEnabled || !userSig.value) return;
  try {
    syncStatusSig.value = 'pulling';
    await resolveSyncTarget();
    // Was there an actual row for our target?
    const { data, error } = await supabase
      .from(TABLE).select('user_id,accounts,lots,transactions')
      .eq('user_id', syncTargetSig.value).maybeSingle();
    if (error) throw error;
    const serverEmpty = !data || (
      (data.accounts?.length || 0) === 0 &&
      (data.lots?.length || 0) === 0 &&
      (data.transactions?.length || 0) === 0
    );
    if (serverEmpty && syncTargetSig.value === userSig.value.id) {
      // Only push local data up when we own the target — never overwrite
      // a household we joined with an empty push.
      await pushToCloud();
    } else {
      await pullFromCloud();
    }
    installAutoPush();
  } catch (e) {
    reportError('firstSync', e);
  }
}

// ── Sharing management ──────────────────────────────────────────────
export async function addSharedEmail(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) throw new Error('أدخل البريد الإلكتروني');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('بريد إلكتروني غير صالح');
  if (!userSig.value || !syncTargetSig.value) throw new Error('يجب تسجيل الدخول أولاً');
  if ((sharedWithSig.value || []).includes(clean)) return sharedWithSig.value;
  const next = [...(sharedWithSig.value || []), clean];
  const { error } = await supabase
    .from(TABLE).update({ shared_with: next }).eq('user_id', syncTargetSig.value);
  if (error) throw error;
  sharedWithSig.value = next;
  return next;
}

export async function removeSharedEmail(email) {
  const next = (sharedWithSig.value || []).filter(e => e !== email);
  const { error } = await supabase
    .from(TABLE).update({ shared_with: next }).eq('user_id', syncTargetSig.value);
  if (error) throw error;
  sharedWithSig.value = next;
  return next;
}

export function isOwner() {
  return userSig.value?.id && syncTargetSig.value === userSig.value.id;
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
