# Household sharing — one-time Supabase setup

Add family sharing (spouse, parent, partner…) on top of the existing sync layer. Two people can sign in with different Google accounts and edit **the same ledger** — all changes appear on both devices within a second or two.

## What it does

- One person (the **owner**) creates a household by adding their spouse's email in Settings → **المشاركة العائلية**.
- The spouse signs in with that email (Google or email/password).
- Both now read and write to the same row in Supabase — same accounts, same lots, same transactions, same zakat.
- Either person can remove the sharing at any time (owner can revoke, guest can just leave).

## One-time SQL migration

If you already ran `SUPABASE_SETUP.md` (that's what created `user_data`), you need this **additive migration** to enable sharing. If you haven't, run `SUPABASE_SETUP.md` first, then this.

**Supabase Dashboard → SQL Editor → New query → paste → run:**

```sql
-- 1. Add the shared_with column (idempotent)
alter table user_data
  add column if not exists shared_with text[] not null default '{}';

-- 2. Replace the read/update RLS policies so anyone whose signed-in email
--    is in shared_with also has access to that row.
drop policy if exists own_row_read   on user_data;
drop policy if exists own_row_update on user_data;

create policy "read_own_or_shared" on user_data
  for select using (
    auth.uid() = user_id
    or lower(auth.jwt() ->> 'email') = ANY(shared_with)
  );

create policy "update_own_or_shared" on user_data
  for update using (
    auth.uid() = user_id
    or lower(auth.jwt() ->> 'email') = ANY(shared_with)
  ) with check (
    auth.uid() = user_id
    or lower(auth.jwt() ->> 'email') = ANY(shared_with)
  );

-- 3. Insert / delete stay owner-only.
--    (The original own_row_insert and own_row_delete policies still apply.)
```

## How the app behaves

- **Sign-in resolves your "sync target"**: your own row if you have one, otherwise a row where someone has added your email to `shared_with`.
- **Auto-push** targets that row — so a guest editing the ledger writes to the owner's row, and vice-versa.
- **Header badge** stays the same (**✓ محفوظ سحابياً**); the Sharing card in Settings shows whether you're the **owner** or a **guest**, plus the list of everyone with access.

## Security notes

- The email match is exact (case-insensitive). You must sign in with the same email the owner added — otherwise you get your own empty ledger.
- The anon key + RLS combination is safe: nobody can read your data without both being signed in **and** being on your invite list.
- Removing an email from `shared_with` cuts off access immediately on the next sync.

## Troubleshooting

- If sync starts failing with *"عمود shared_with مفقود"* after upgrade, you skipped the migration above.
- If your spouse signs in and sees an empty ledger, double-check that (1) the email in Settings is exactly the one they signed in with, and (2) you saved (the row should show up under "المشاركون في هذا السجل").
