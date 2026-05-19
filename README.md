# Trackly

Internal issue and task tracker for a single organisation. Built with Next.js App Router, Supabase, and shadcn/ui.

## Prerequisites

- Node.js ≥ 24
- pnpm ≥ 10
- [Supabase CLI](https://supabase.com/docs/guides/cli) (for local database)

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env.local` and fill in values:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from Supabase → Settings → API Keys (publishable / anon)
   - `SUPABASE_SERVICE_ROLE_KEY` — **required for admin “Create user”**; use the **secret** key (`sb_secret_…`) or legacy **service_role** JWT from the same page. Do not use the publishable key here. Alias: `SUPABASE_SECRET_KEY`
   - `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
   - SMTP vars — optional; email notifications are skipped if unset
   - VAPID keys — optional; generate with `npx web-push generate-vapid-keys`

3. **Database**

   Apply the schema in `supabase/migrations/001_initial_schema.sql` via Supabase Dashboard SQL editor, or:

   ```bash
   supabase init   # if not already
   supabase db push
   ```

4. **First admin user**

   Create a user in Supabase Auth (Dashboard → Authentication → Users), then:

   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'you@company.com';
   ```

5. **Run dev server**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Features

- Email + password auth (no public signup)
- Admin: users, projects, member assignment
- Tickets per project with filters, markdown, labels, comments, activity log
- Email + browser push notifications (when configured)

## Project structure

```
src/
  app/           # Routes (login, projects, admin, settings)
  components/    # UI and feature components
  lib/           # Auth, tickets, email, notifications
  types/         # TypeScript domain types
  utils/supabase # Supabase clients (browser, server, admin)
supabase/
  migrations/    # SQL schema + RLS
```
