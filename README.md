# Trackly

Internal issue and task tracker for a single organisation. Projects, tickets, comments, and notifications — with admin-managed users and no public signup.

## Tech stack

| Layer              | Choice                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Framework          | [Next.js](https://nextjs.org/) 16 (App Router)                                                                  |
| UI                 | [React](https://react.dev/) 19, [Tailwind CSS](https://tailwindcss.com/) 4, [shadcn/ui](https://ui.shadcn.com/) |
| Data & auth        | [Supabase](https://supabase.com/) (Postgres, Auth, RLS)                                                         |
| Forms & validation | React Hook Form, Zod                                                                                            |
| Data fetching      | TanStack Query                                                                                                  |
| Notifications      | Nodemailer (email), Web Push API (browser)                                                                      |

## Prerequisites

- Node.js ≥ 24
- pnpm ≥ 10
- [Supabase CLI](https://supabase.com/docs/guides/cli) (recommended for local database)

## Quick start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable                                                             | Required | Description                                                                                                   |
| -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                           | Yes      | Supabase project URL                                                                                          |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`                               | Yes      | Publishable / anon key (Settings → API Keys)                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY`                                          | Yes\*    | Secret key for admin “Create user” (`sb_secret_…` or legacy `service_role` JWT). Alias: `SUPABASE_SECRET_KEY` |
| `NEXT_PUBLIC_APP_URL`                                                | Yes      | App origin, e.g. `http://localhost:3000`                                                                      |
| `SMTP_*`                                                             | No       | Email notifications are skipped if unset                                                                      |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | No       | Browser push; generate with `npx web-push generate-vapid-keys`                                                |

\*Required only if you use admin user creation. Never expose the service role key to the client.

### 3. Database

**Local (Supabase CLI)**

```bash
supabase start
supabase db reset   # runs migrations in supabase/migrations/ and seed.sql
```

Studio: [http://127.0.0.1:54323](http://127.0.0.1:54323)

**Hosted Supabase**

Apply migrations via Dashboard SQL editor or:

```bash
supabase link
supabase db push
```

Migrations:

- `001_initial_schema.sql` — tables, enums, RLS, triggers
- `002_ticket_dates.sql` — optional start/due dates on tickets

See `supabase/seed.sql` for local seed notes and optional demo data.

### 4. First admin user

1. Create a user in Supabase Auth (Dashboard → Authentication → Users, or Studio locally).
2. Promote to admin (profile row is created by `on_auth_user_created`):

```sql
UPDATE public.profiles
SET role = 'admin', name = 'Your Name'
WHERE email = 'you@company.com';
```

### 5. Run the app

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                             | Description              |
| ----------------------------------- | ------------------------ |
| `pnpm dev`                          | Start development server |
| `pnpm build`                        | Production build         |
| `pnpm start`                        | Run production server    |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                   |
| `pnpm format` / `pnpm format:check` | Prettier                 |

## Features

### Authentication

- Email + password sign-in (no public registration)
- Forgot / reset password flows
- Session handling via Supabase SSR middleware

### Roles

| Role         | Capabilities                                                        |
| ------------ | ------------------------------------------------------------------- |
| **Admin**    | Manage users and projects, assign members, full ticket access       |
| **QA**       | Create tickets, update tickets across projects they belong to       |
| **Engineer** | View and update tickets on assigned projects; cannot create tickets |

### Projects & tickets

- Per-project ticket list with status filters and search
- Ticket IDs from project slug, e.g. `TRACKLY-DEMO-001`
- Types: bug, feature, task, improvement
- Status workflow: Backlog → To Do → In Progress → In Review → Testing → Done
- Priorities: low, medium, high, critical
- Markdown description (inline edit on ticket detail)
- Labels, comments, and activity log
- Optional start and due dates

### Dashboard

- Cross-project stats and status breakdown for the signed-in user

### Notifications

- In-app notification bell
- Email on assign, status change, comments (when SMTP is configured)
- Browser push (when VAPID keys are configured and user opts in)

### Admin

- Create / edit / deactivate users (service role required for auth user creation)
- Create / edit / archive projects and assign members

### Settings

- Profile name, password change, push notification toggle

## Project structure

```
src/
  app/              # Routes (login, dashboard, projects, admin, settings)
  components/       # UI primitives (shadcn) and feature components
  contexts/         # React context (e.g. current project)
  lib/              # Auth, tickets, projects, email, push, notifications
  types/            # TypeScript domain types
  utils/supabase/   # Browser, server, admin, and middleware clients
public/
  sw.js             # Service worker for web push
supabase/
  migrations/       # SQL schema and RLS policies
  seed.sql          # Local dev seed notes
```

## Main routes

| Path                              | Description                 |
| --------------------------------- | --------------------------- |
| `/login`                          | Sign in                     |
| `/dashboard`                      | Personal overview           |
| `/projects`                       | Project list                |
| `/projects/[slug]`                | Project tickets             |
| `/projects/[slug]/tickets/[n]`    | Ticket detail               |
| `/admin`                          | Admin home                  |
| `/admin/users`, `/admin/projects` | User and project management |
| `/settings`                       | Account settings            |

## License

Private / unlicensed — internal use only.
