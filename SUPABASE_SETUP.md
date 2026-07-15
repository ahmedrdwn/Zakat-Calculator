# Supabase setup — auth + cloud sync

This app uses Supabase for **email + Google sign-in** and to sync your ledger to the cloud so it survives clearing browser data and works across devices.

Follow these steps once, in your Supabase project.

## 1 · Grab your anon key and set env vars

**Supabase dashboard → Project Settings → API → Project API keys** — copy the `anon` `public` key (this is safe to expose in client code).

Then set these environment variables:

**In Vercel** (Project → Settings → Environment Variables — all environments):

```
VITE_SUPABASE_URL       = https://ikugcheascizcqmjssxm.supabase.co
VITE_SUPABASE_ANON_KEY  = <paste the anon public key>
```

**For local dev** — create `.env.local` in the project root with the same two keys. Restart `npm run dev`.

## 2 · Create the sync table

Open the Supabase SQL editor and run this once:

```sql
-- One row per user. Whole ledger stored as JSONB.
create table if not exists user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  accounts jsonb not null default '[]'::jsonb,
  lots jsonb not null default '[]'::jsonb,
  transactions jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-Level Security: each user can only touch their own row.
alter table user_data enable row level security;

create policy "own_row_read"    on user_data for select using (auth.uid() = user_id);
create policy "own_row_insert"  on user_data for insert with check (auth.uid() = user_id);
create policy "own_row_update"  on user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_row_delete"  on user_data for delete using (auth.uid() = user_id);
```

## 3 · Enable Google sign-in

**Google Cloud Console**

1. https://console.cloud.google.com/ → create (or pick) a project.
2. **APIs & Services → OAuth consent screen** — configure the app (external, add your email as test user).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorised JavaScript origins**: your Vercel URL(s), e.g. `https://your-app.vercel.app` and `http://localhost:5173` for local dev
   - **Authorised redirect URIs**:
     ```
     https://ikugcheascizcqmjssxm.supabase.co/auth/v1/callback
     ```
4. Copy the **Client ID** and **Client secret**.

**Supabase dashboard**

1. **Authentication → Providers → Google** — toggle Enable.
2. Paste the Client ID and Client secret. Save.

## 4 · (Optional) Configure email auth

Supabase enables email/password out of the box. To skip the email confirmation step during development: **Authentication → Providers → Email** — toggle off "Confirm email".

For production, keep confirmation on and configure SMTP under **Authentication → Emails**.

## 5 · How sync works

- **Not signed in** — everything stays in `localStorage`, exactly as before. Nothing leaves your browser.
- **Signed in** — data is stored under your `user_id` in the `user_data` table.
- **On first sign-in with a fresh account** — your local data is uploaded to your cloud row.
- **On sign-in when the cloud already has data** — the cloud version replaces local.
- **After sign-in** — every change auto-pushes to the cloud (debounced 1.5 s).
- **Manual controls** — the header menu has *"سحب من السحابة"* / *"رفع للسحابة"* buttons for explicit pull/push.
- **RLS guarantees** the server rejects any request for someone else's data.

## Security notes

- The `anon` key is designed to be public; combined with RLS it grants a client only rights to rows the signed-in user owns.
- Never paste the `service_role` key into client code or into `VITE_*` env vars — it bypasses RLS.
- Your data lives on Supabase's infra (Postgres). Back it up with the *"تنزيل نسخة"* button periodically all the same.
