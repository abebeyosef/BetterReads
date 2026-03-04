# Shelf

A modern, social book-tracking web app — Goodreads but better, inspired by Letterboxd.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (zinc base, dark mode default)
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS + Storage)
- **Book Data:** Google Books API (primary) + Open Library (fallback)
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.local.example .env.local
# Fill in your Supabase URL, anon key, and Google Books API key
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the migration: `supabase/migrations/001_initial_schema.sql`
3. Enable Google OAuth in Authentication > Providers
4. Copy your project URL and anon key into `.env.local`

### 4. Run the dev server

```bash
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/                # Server-side API routes (book search, import, etc.)
│   ├── (auth)/             # Auth pages (login, signup)
│   ├── (app)/              # Protected app pages (library, analytics, etc.)
│   └── layout.tsx
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   └── ...                 # Feature components
├── lib/
│   ├── supabase/           # Supabase client helpers (client.ts + server.ts)
│   └── utils.ts            # cn() and other utilities
├── hooks/                  # React hooks
└── types/
    └── database.ts         # Supabase-generated DB types (regenerate after schema changes)
supabase/
└── migrations/
    └── 001_initial_schema.sql   # Full DB schema with RLS policies
```

## Build Plan

See [`build-plan.md`](./build-plan.md) for the full project spec, data model, feature list, and 4-phase build sequence.

**Current phase:** Phase 1 — Core Loop + Import (Weeks 1–3)

### Phase 1 checklist
- [ ] Project scaffolding ✅ (done)
- [ ] Database schema ✅ (done — run `supabase/migrations/001_initial_schema.sql`)
- [ ] Auth — email/password + Google OAuth
- [ ] User profiles — create/edit, avatar upload
- [ ] Book search — server-side Google Books API route, cache on click
- [ ] Library management — add/remove, status, dates, ratings
- [ ] Goodreads import — two-step modal, CSV parse, non-blocking match
- [ ] Book detail page
- [ ] Reviews — write, edit, delete

## Key Architectural Rules

1. **Every user table has `user_id` + RLS policies** — enforced from day one.
2. **Never store cover images** — link to external URLs from Google Books / Open Library only.
3. **All external API calls go through server-side routes** — never call Google Books from the client.
4. **Books table is global; user_books is per-user** — this separation is critical.
5. **Activity events are append-only and denormalised** — store a metadata snapshot, avoid joins at read time.

## Regenerating TypeScript Types

After schema changes:

```bash
npx supabase gen types typescript --project-id your-project-ref > src/types/database.ts
```
