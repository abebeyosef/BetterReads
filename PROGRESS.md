# Shelf — Progress Log

This file is the single source of truth for what has been built, what decisions were made, and what comes next. It must be updated after every task. See README.md for full logging instructions.

---

## Current Status

**Active phase:** Phase 1 — Core Loop + Import
**Last updated:** 2026-03-04
**Last worked on by:** Project setup (Cowork/Claude)
**Next task:** Phase 1, Step 3 — Auth (email/password + Google OAuth)

---

## Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Core Loop + Import | 🟡 In progress |
| Phase 2 | Social Layer | ⬜ Not started |
| Phase 3 | Discovery + Analytics | ⬜ Not started |
| Phase 4 | Polish + Scale | ⬜ Not started |

---

## Phase 1 — Core Loop + Import

### Step 1 — Project Scaffolding ✅ Complete (2026-03-04)

**What was done:**
- Created full Next.js 15.2.6 project with TypeScript, Tailwind CSS, App Router, and `src/` directory layout
- Configured `tailwind.config.ts` with full shadcn/ui CSS variable system (zinc base, dark mode default)
- Configured `postcss.config.mjs` with autoprefixer
- Created `components.json` for shadcn/ui CLI compatibility
- Created `next.config.ts` with image remote patterns for Google Books and Open Library
- Created `tsconfig.json` with `@/*` path alias pointing to `src/`
- Created `.eslintrc.json`, `.gitignore`, `.npmrc` (legacy-peer-deps=true)
- Created `src/app/layout.tsx` (Inter font, dark mode), `src/app/page.tsx` (placeholder), `src/app/globals.css` (shadcn CSS variables)
- Created `src/lib/utils.ts` with `cn()` helper
- Created `src/lib/supabase/client.ts` and `src/lib/supabase/server.ts` (Supabase SSR helpers)
- Created `src/types/database.ts` (placeholder — regenerate after schema is live)
- Created folder stubs: `src/components/ui/`, `src/hooks/`, `src/app/api/books/`
- Set up GitHub repo: `abebeyosef/BetterReads`
- Deployed to Vercel (connected to GitHub, auto-deploys on push to `main`)

**Key decisions:**
- Used Next.js 15.2.6 specifically (earlier 15.x versions had CVE-2025-66478, a critical RCE vulnerability — do not downgrade)
- `legacy-peer-deps=true` in `.npmrc` required because Next.js 15.0.3 was built against React 19 RC but npm resolves React 19 stable — this flag avoids a peer dependency conflict
- Dark mode enabled by default via `class` strategy in Tailwind and `<html className="dark">` in layout
- All Radix UI primitives pre-installed in `package.json` to avoid install-time friction later

**Known issues / debt:**
- `src/types/database.ts` is a placeholder with empty types. Once the Supabase schema is live and confirmed, regenerate with: `npx supabase gen types typescript --project-id fzbqvopmlizieegapixf > src/types/database.ts`
- No shadcn/ui components have been added yet (the CLI couldn't run during setup) — use `npx shadcn@latest add <component>` as needed during development

---

### Step 2 — Database Schema ✅ Complete (2026-03-04)

**What was done:**
- Wrote and ran `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor
- Supabase project: `fzbqvopmlizieegapixf` (URL: `https://fzbqvopmlizieegapixf.supabase.co`)

**Schema includes:**
- Enums: `reading_status`, `event_type`, `import_source`, `import_status`, `import_row_status`, `match_method`
- Tables: `users`, `books`, `authors`, `book_authors`, `user_books`, `reviews`, `activity_events`, `follows`, `notifications`, `lists`, `list_books`, `imports`, `import_rows`
- Indexes on all common query patterns
- RLS enabled on all tables with appropriate policies
- Trigger: `handle_updated_at()` — auto-updates `updated_at` on all relevant tables
- Trigger: `handle_new_user()` — auto-creates a `public.users` row when a new `auth.users` record is inserted (fires on sign-up)

**Key decisions:**
- `books` table is global and shared — one canonical record per book across all users. User-specific data (status, rating, dates) lives in `user_books`
- `activity_events` is append-only and denormalised — `metadata` JSONB column stores a snapshot of relevant data at event time to avoid expensive joins in the feed
- Cover images are never stored — `cover_url` is always an external URL from Google Books or Open Library
- RLS policies use `auth.role() = 'authenticated'` for reads on global tables (books, authors) and `auth.uid() = user_id` for writes on user-owned tables

**Known issues / debt:**
- Google OAuth not yet enabled in Supabase — must be done manually in Supabase Dashboard > Authentication > Providers before auth step is complete
- The `GOOGLE_BOOKS_API_KEY` environment variable is not yet set in `.env.local` or Vercel — add before building book search feature

---

### Step 3 — Auth ⬜ Not started

**What needs to be built:**
- Sign-in page (`/login`) — email/password + Google OAuth button
- Sign-up page (`/signup`) — email/password form, username field (stored in `raw_user_meta_data` so the `handle_new_user` trigger picks it up)
- Auth callback route (`/auth/callback`) — handles OAuth redirect and PKCE code exchange
- Middleware (`middleware.ts` at project root) — redirects unauthenticated users away from protected routes, redirects authenticated users away from auth pages
- Protected route group: `src/app/(app)/` — all main app pages live here
- Auth route group: `src/app/(auth)/` — login and signup pages live here

**Notes for next session:**
- The `handle_new_user()` trigger expects `raw_user_meta_data` to contain `username`, `full_name`/`name`, and `avatar_url`. Make sure sign-up passes `username` in the metadata options when calling `supabase.auth.signUp()`
- For Google OAuth, the redirect URL to register in Google Cloud Console and Supabase will be: `https://fzbqvopmlizieegapixf.supabase.co/auth/v1/callback`
- Middleware should protect everything under `/(app)` and redirect to `/login`

---

### Step 4 — User Profiles ⬜ Not started

Depends on: Step 3 (Auth)

---

### Step 5 — Book Search ⬜ Not started

Depends on: Step 3 (Auth)

**Note:** Requires `GOOGLE_BOOKS_API_KEY` to be set in `.env.local` and Vercel environment variables.

---

### Step 6 — Library Management ⬜ Not started

Depends on: Steps 3, 5

---

### Step 7 — Goodreads Import ⬜ Not started

Depends on: Steps 3, 5, 6

---

### Step 8 — Book Detail Page ⬜ Not started

Depends on: Steps 3, 5

---

### Step 9 — Reviews ⬜ Not started

Depends on: Steps 3, 8

---

## Environment & Infrastructure

| Item | Value / Status |
|------|---------------|
| Supabase project ID | `fzbqvopmlizieegapixf` |
| Supabase URL | `https://fzbqvopmlizieegapixf.supabase.co` |
| GitHub repo | `abebeyosef/BetterReads` |
| Vercel project | `better-reads` |
| Vercel env vars set | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Google Books API key | ⬜ Not yet added |
| Google OAuth in Supabase | ⬜ Not yet enabled |

---

## Ongoing Notes & Decisions

- **Next.js version must stay at 15.2.6 or higher** — do not use any earlier 15.x version due to CVE-2025-66478
- **Never run `npm audit fix --force`** — this can silently downgrade packages to vulnerable versions
- **`node_modules` is gitignored** — always run `npm install` in a fresh clone before `npm run dev`
