# Shelf — Progress Log

This file is the single source of truth for what has been built, what decisions were made, and what comes next. It must be updated after every task. See README.md for full logging instructions.

---

## Current Status

**Active phase:** Phase 1 — Core Loop + Import
**Last updated:** 2026-03-04
**Last worked on by:** Claude (Sonnet 4.6)
**Next task:** Phase 1, Step 5 — Book Search

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

### Step 3 — Auth ✅ Complete (2026-03-04)

**What was built:**
- `middleware.ts` (project root) — Supabase SSR middleware that:
  - Refreshes the session on every request (required for SSR auth)
  - Redirects authenticated users away from `/login` and `/signup` → `/dashboard`
  - Redirects unauthenticated users away from protected paths (`/dashboard`, `/library`, `/profile`, `/search`, `/import`, `/lists`, `/settings`) → `/login?next=<path>`
- `src/app/auth/callback/route.ts` — GET route handler for OAuth PKCE code exchange and email confirmation redirects. On success redirects to `next` param (default `/dashboard`). On failure redirects to `/login?error=auth_callback_failed`.
- `src/app/(auth)/layout.tsx` — centered full-screen layout wrapper for auth pages
- `src/app/(auth)/login/page.tsx` — email/password sign-in form + Google OAuth button. Reads `?error=auth_callback_failed` query param to show error banner. Preserves `?next=` redirect param through Google OAuth flow.
- `src/app/(auth)/signup/page.tsx` — sign-up form with username, full name (optional), email, password. Client-side username validation (regex + length). After successful signup, shows "check your email" confirmation screen. Google OAuth button also present.
- `src/app/(app)/layout.tsx` — server-side auth safety net (redirects to `/login` if no session — middleware handles this first, but this is belt-and-suspenders)
- `src/app/(app)/dashboard/page.tsx` — placeholder dashboard. Shows signed-in email and a sign-out button (server action). Will be replaced in later steps.

**Key decisions:**
- Auth pages use plain Tailwind CSS with shadcn CSS variables — no shadcn component primitives needed. This avoids the shadcn CLI requirement and keeps the code readable.
- Both login and signup share the same Google OAuth handler. For sign-up via Google, the `handle_new_user` trigger will create the `public.users` row using whatever name/avatar_url Google provides, but `username` will be null (the trigger sets it to the email prefix as fallback). Users can set their username in profile settings later.
- The `eslint-disable @typescript-eslint/no-explicit-any` comment is used in two cookie `setAll` handlers because the `ResponseCookies.set()` and `ReadonlyRequestCookies.set()` options types don't perfectly match the `@supabase/ssr` `CookieOptions` type — using `any` is the official Supabase workaround for this mismatch.
- Password minimum length is 8 characters, enforced client-side. Supabase enforces the same minimum server-side by default.

**Known issues / debt:**
- Google OAuth in Supabase still needs to be enabled manually in the Supabase Dashboard > Authentication > Providers (noted in Step 2 but still pending)
- After Google OAuth sign-up, username will be null in `public.users` until the user sets it. The `handle_new_user` trigger sets it to the email prefix as a fallback — check the trigger logic if this causes issues.
- The placeholder dashboard will be replaced in Step 4 (User Profiles) and beyond.

---

### Step 4 — User Profiles ✅ Complete (2026-03-04)

**What was built:**
- `src/types/database.ts` — Full hand-written TypeScript types for all 13 tables + all enums, matching `001_initial_schema.sql`. Also exports convenience types: `UserRow`, `BookRow`, `UserBookRow`, `ReviewRow`, `ActivityEventRow`.
- `next.config.ts` — Added `fzbqvopmlizieegapixf.supabase.co` to allowed image domains (for Supabase Storage avatars).
- `src/components/app-nav.tsx` — Sticky top nav bar (client component). Shows "Shelf" logo + user avatar with Radix UI dropdown menu (Profile, Settings, Sign out). Accepts `UserRow` profile prop from the server layout.
- `src/app/(app)/layout.tsx` — Updated to fetch `public.users` profile after auth check, render `<AppNav profile={profile} />`, and handle the edge case where the `handle_new_user` trigger may have failed (signs user out → redirects to `/login?error=profile_missing`).
- `src/app/(app)/profile/page.tsx` — Own profile page. Shows avatar (with initials fallback), display_name, @username, member since date, bio, reading stats (read / currently reading / want to read counts), and "Edit profile" button linking to `/settings`.
- `src/app/(app)/settings/page.tsx` — Settings page shell (server component, fetches profile, renders `SettingsForm`).
- `src/app/(app)/settings/settings-form.tsx` — Client component form. Sections: avatar upload (file picker → validates image type + 5MB limit → uploads to Supabase Storage `avatars` bucket → updates `avatar_url`) and profile fields (display_name, username, bio). Shows success/error feedback inline. Calls `router.refresh()` after save to re-render server components with new data.
- `src/app/(app)/dashboard/page.tsx` — Simplified placeholder (old sign-out header removed; nav now comes from layout).

**Key decisions:**
- Nav is a client component (needs `useRouter` for sign out) but receives profile data as a prop from the server layout — avoids redundant client-side fetch.
- Profile and settings pages use explicit `as { data: UserRow | null }` type casts on Supabase queries, and `(supabase as any)` for the `.update()` call, because the hand-written `Database` type doesn't include the `Relationships` and `CompositeTypes` fields that `@supabase/ssr` 0.5.x expects for full type inference. This will be resolved when `npx supabase gen types` is run against the live project.
- Avatar upload uses `upsert: true` so re-uploading overwrites the previous file at the same path (`${userId}/avatar.${ext}`). A `?t=timestamp` cache-buster is appended to the public URL so browsers fetch the new image immediately.
- `router.refresh()` is called after a successful save to revalidate the server layout and nav (which shows the avatar).

**Manual setup required before avatar upload works:**
1. In Supabase Dashboard → Storage → Create bucket named `avatars` (set to **Public**)
2. Run this SQL in the Supabase SQL Editor to add storage RLS policies:
```sql
-- Allow authenticated users to upload/update their own avatar
create policy "Users can upload own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can update own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to read avatars (bucket is public, but belt-and-suspenders)
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');
```

**Known issues / debt:**
- The `(supabase as any)` cast in `settings-form.tsx` is a workaround for the hand-written type incompatibility. Regenerate types with the Supabase CLI to fix properly.
- Public profile pages (viewing other users' profiles) are **not** built yet — that's Phase 3 (social layer). `/profile` only shows the signed-in user's own profile.

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
