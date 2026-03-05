# Shelf — Progress Log

This file is the single source of truth for what has been built, what decisions were made, and what comes next. It must be updated after every task. See README.md for full logging instructions.

---

## Current Status

**Active phase:** Phase 3 — Social Layer
**Last updated:** 2026-03-05
**Last worked on by:** Claude (Sonnet 4.6)
**Next task:** Phase 3 Steps 5–6 — Book Lists + UI Polish

---

## Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| Phase 1 | Core Loop + Import | ✅ Complete |
| Phase 2 | Analytics + Recommendations + Goal | ✅ Complete |
| Phase 3 | Social Layer | 🔄 In progress |
| Phase 4 | Polish + Scale | ⬜ Not started |

---

## Phase 3 — Social Layer 🔄 In progress

### Steps 1–4 — Activity Events, Feed, Public Profiles, Follow System ✅ Complete (2026-03-05)

**What was built:**

- **`src/lib/activity.ts`** — `createActivityEvent(db, {...})` helper. Best-effort (never throws) — activity events must not break main user flows.
- **`/api/library` (POST updated)** — Checks existing `user_book` status before upsert. Fires `started_reading` when status transitions to `currently_reading`, `finished_reading` when transitions to `read`. Denormalized metadata includes `book_title`, `book_cover_url`, and `rating` (for finished). Does **not** fire on `want_to_read` to avoid noise.
- **`/api/reviews` (POST updated)** — Checks for existing review before upsert. Fires `reviewed` only on new reviews (not edits). Metadata includes `book_title`, `book_cover_url`, `review_text` (truncated to 200 chars).
- **`/api/follow`** — `POST` to follow, `DELETE ?following_id=` to unfollow. Uses upsert with `ignoreDuplicates` to handle double-clicks. RLS enforces own-only writes.
- **`/feed`** — Server component, platform-wide activity feed, last 50 events. Each card: actor avatar (linked to `/users/[username]`), action text, book title (linked to `/books/[id]`), rating stars (for `finished_reading`), review excerpt (for `reviewed`), book cover thumbnail, relative timestamp. Empty state links to Search.
- **`/users/[username]`** — Public profile page. Parallel fetches: stats, follower count, following count, isFollowing check, last 6 reads (cover grid), last 3 reviews. Own profile shows "Edit profile"; others show `FollowButton`. `FollowButton` is a client component with optimistic toggle state.
- **`/profile`** — Now redirects to `/users/[username]` (own profile).
- **`app-nav.tsx`** — Added "Feed" nav link.

**Key decisions:**
- Activity events fire only on `currently_reading` and `read` transitions (not `want_to_read`) to keep the feed signal-to-noise ratio high.
- Import-time `user_books` upserts (in `/api/import/[id]`) do **not** generate activity events — historical imports would flood the feed with hundreds of events. Events are for real-time interactions only.
- Metadata is denormalized (book title, cover URL) at write time per the architecture plan, so the feed never needs a `books` join.
- Follow counts use `{ count: "exact", head: true }` — no row data fetched, just the count, to keep the profile query fast.
- Public profile fetches 6 data sources in one `Promise.all` to minimise server response time.

**Remaining in Phase 3:**
- Step 5: Book lists (create, edit, share)
- Step 6: UI polish pass (responsive, loading states, empty states)

---

## Bug Fix — Enrich route query encoding (2026-03-05) ✅ Complete

**Problem:** `fetchGoogleBooksData` in `/api/books/enrich` was building the Google Books URL by manually concatenating `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`. `encodeURIComponent` encodes `:` as `%3A`, which corrupts the `intitle:` and `inauthor:` field operators — any book title containing a colon (e.g. "The Everything Store: Jeff Bezos and the Age of Amazon") returned 0 results.

**Fix:** Dropped the field operators entirely. Now builds a plain `"title author"` query and passes it to `URLSearchParams`, which handles all percent-encoding correctly as a single `q` parameter value. Also added `console.log` of the constructed URL (API key redacted as `***`) and the HTTP response status so failures are visible in Vercel function logs.

**Files changed:** `src/app/api/books/enrich/route.ts`

---

## Bug Fix Batch (2026-03-05) ✅ Complete

### Bug 1 — Enrich route timeout on Vercel
**Problem:** `POST /api/books/enrich` processed all null-cover books in one call, timing out on large libraries (Vercel serverless limit is 10s on Hobby plan).
**Fix:** Added `?limit=N` query param (default 15, max 50). Each call now processes at most 15 books. Batch size reduced from 5 → 3, delay between batches increased from 200ms → 500ms. Response now includes `remaining` count. `EnrichBooksButton` shows a "Continue enriching" button when `remaining > 0`, allowing the user to step through the full library in chunks.

### Bug 2 — Import creates duplicate books on re-import
**Problem:** `createMinimalBook` in `src/app/api/import/[id]/route.ts` only checked `isbn_13` before inserting. Books without ISBNs (common in Goodreads exports) were inserted as new rows on every re-import, creating duplicates.
**Fix:** Added a title+author deduplication check using `ilike("title", ...)` + a scan of `book_authors` before any insert. Falls back to title-only check when no author is present. The `ilike` ensures case-insensitive matching (e.g. "The Great Gatsby" vs "the great gatsby").

### Bug 3 — No way to clear library before re-importing
**Problem:** Users who imported with errors had no way to start fresh without manually removing books.
**Fix:** New `DELETE /api/library/clear` route removes all `user_books` rows for the authenticated user (guarded by a `confirm: "clear-library"` token in the body to prevent accidental calls). Added a "Danger Zone" section to `src/app/(app)/settings/settings-form.tsx` with a two-step confirmation UI (first click shows confirm/cancel, second click fires the request).

---

## Book Enrichment (Hotfix) ✅ Complete (2026-03-05)

**Context:** Many books imported via Goodreads CSV had `null cover_url` and `null description` because the import's title+author Google Books lookup failed to match them.

**What was built:**
- `src/app/api/books/enrich/route.ts` — Auth-protected `POST` route. Finds all books in the user's library with `cover_url IS NULL`, queries Google Books using `intitle:{title}+inauthor:{author}` for each one, and updates `cover_url`, `description`, `genres`, `page_count`, and `google_books_id` on the `books` table. Processes in batches of 5 with a 200ms delay between batches to stay within Google Books rate limits.
- `src/app/(app)/library/enrich-button.tsx` — Client component. Renders an amber dismissible banner on the library page showing how many books are missing covers. "Fix covers" button triggers the enrich API, shows a spinner while running, then shows the result count and calls `router.refresh()` to update the page.
- `src/app/(app)/library/page.tsx` — Now queries `books` for `cover_url IS NULL` on the user's library book IDs, passes the count to `EnrichBooksButton`. Banner only visible when `nullCoverCount > 0`.

**Key decisions:**
- Only updates fields that have non-null values from Google Books — won't overwrite existing data with nulls.
- Banner is dismissible even if there are uncovered books — user may not care.
- Batch size of 5 with 200ms delay is conservative; Google Books API allows ~1000 req/day on the free tier.

---

## Phase 2 — Analytics + Recommendations + Goal

### Step 1 — Analytics Dashboard ✅ Complete (2026-03-05)

**What was built:**
- `src/app/(app)/dashboard/page.tsx` — Full server-rendered analytics dashboard replacing the placeholder. Fetches: all read books (rating, dates, genres, page_count), status counts, currently reading entries with covers. Computes all analytics server-side and passes serialisable data to chart components.
- `src/app/(app)/dashboard/analytics-charts.tsx` — Client component (Recharts). Four chart components: `BooksPerYearChart` (bar), `BooksPerMonthChart` (bar, all 12 months of current year, greyed-out bars for empty months), `GenreChart` (horizontal bar, top 8), `RatingChart` (bar, ★ to ★★★★★).

**Dashboard layout:**
- Stats row: Books read / Currently reading / Want to read / Average rating
- Currently reading strip (cover cards, horizontal scroll)
- Empty state with CTAs to Search or Import (shown when no data at all)
- Books read by year + this year by month (side by side)
- Genre breakdown + Rating distribution (side by side)
- Highlights row: read this year, best year, total pages, fastest read, longest read, top genre

**Key decisions:**
- All analytics computed server-side in JS — avoids complex SQL aggregates and is readable/maintainable. Fine at expected scale.
- Genre uses only the first element of the `genres` array per book (Google Books categories can be very specific; the first is usually the best label).
- Monthly chart always shows all 12 months of the current year with muted bars for zero-read months — gives a sense of pace rather than hiding empty months.
- Fastest/longest read uses `date_finished - date_started` in days; books with 0-day difference are shown as "Same day" in the highlights.
- Empty state shown when user has 0 read books AND 0 currently reading — links to Search and Import to drive the key actions.
- Recharts `ResponsiveContainer` makes all charts fluid-width responsive.

**Known issues / debt:**
- Dashboard bundle is ~100kB (Recharts is large). Acceptable for now; could be code-split further.
- Genre data depends on Google Books categories which are inconsistent (e.g. "Fiction / Science Fiction" vs "Science Fiction"). No normalisation applied yet.
- No reading goal UI yet — coming in Phase 2 Step 3.
- No recommendations yet — coming in Phase 2 Step 4.

---

### Steps 2–5 — Recency Gap, Reading Goal, Recommendations, Home Dashboard ✅ Complete (2026-03-05)

**What was built:**
- `src/app/(app)/settings/settings-form.tsx` — Added reading goal section: number input for target book count (current year auto-set). Clear button to remove goal. Saves `reading_goal_year` and `reading_goal_count` to the `users` table alongside other profile fields.
- `src/app/(app)/dashboard/page.tsx` — Expanded with three new sections:
  - **Reading goal progress bar**: fetches profile goal, computes `thisYearCount / goalCount`, renders a progress bar with "X books to go" or "Goal complete!" message. Shows a "Set a reading goal" nudge link if no goal is set and the user has read books.
  - **Recency gap engine**: for each genre in the user's read history, finds the most recent finish date. Flags genres not read in 2+ months, sorted by longest gap. Shown as recommendation cards linking to `/search?q=<genre>`.
  - **Author affinity**: finds authors the user has rated 4+ stars, computes average rating per author, shows top 3 as recommendation cards linking to `/search?q=<author>`.
  - All four data fetches (read books, status counts, currently reading, profile) now run in parallel via `Promise.all`.
- `src/app/(app)/search/page.tsx` — Split into `SearchInner` (uses `useSearchParams`) + `SearchPage` (Suspense wrapper). Added `useEffect` on mount to auto-run search if a `?q=` param is present — enables recommendation cards to link directly into a pre-populated search.

**Key decisions:**
- Recency gap threshold is 2+ months (not 1) to avoid noise — a gap of 1 month isn't unusual. Adjust if needed.
- Author affinity only surfaces authors with at least 1 book rated 4+ stars. Low bar intentional — even one loved book is a valid signal.
- Recommendation cards link to `/search?q=<genre or author>` — uses the existing search infrastructure rather than building a separate recommendations engine.
- Reading goal is always for the current calendar year. If a user has a goal from a previous year, it's ignored (not shown on dashboard) until they update it in settings.
- `Promise.all` for dashboard fetches reduces server response time.

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

### Step 5 — Book Search ✅ Complete (2026-03-04)

**What was built:**
- `src/types/books.ts` — `BookSearchResult` type: normalized shape shared between the search API route and client components.
- `src/app/api/books/search/route.ts` — GET `/api/books/search?q=...`. Queries Google Books API server-side (key never exposed to client). Falls back to Open Library if Google Books returns 0 results. Caches identical queries for 60 s via `next: { revalidate: 60 }`. Returns `{ results: BookSearchResult[] }`.
- `src/app/api/books/cache/route.ts` — POST `/api/books/cache`. Accepts a `BookSearchResult` body. Checks for existing book by `google_books_id` or `isbn_13`; inserts if new. Upserts authors by name (manual SELECT-then-INSERT to avoid duplicates, since `authors.name` has no unique DB constraint). Links via `book_authors`. Returns `{ book_id: string }`.
- `src/app/(app)/search/page.tsx` — Client component search page. Debounced input (300 ms). Shows skeleton cards while loading, results grid (2–5 columns responsive), empty state, and error state. Clicking a card calls `/api/books/cache`, then navigates to `/books/[id]`.
- `src/app/(app)/books/[id]/page.tsx` — Initial book detail page (cover, title, authors, year, page count, language, description). Library action panel added in Step 6.
- `src/components/app-nav.tsx` — Added "Search" nav link.

**Key decisions:**
- The search route requires **no auth** technically (it's just querying the Google Books API), but it's protected by middleware (all `/search` URLs require a session). This is fine since we don't want anonymous searches.
- Google Books thumbnail URLs are `http://` — these are upgraded to `https://` before returning. Next.js Image will reject `http://` URLs.
- The cache route uses `(supabase as any)` for all DB operations — same type workaround as settings, pending proper CLI-generated types.
- `maybeSingle()` is used for duplicate checks instead of `single()` to avoid a 406 error when no row is found.
- `book_authors` insert uses `.upsert({ onConflict: "book_id,author_id", ignoreDuplicates: true })` — supabase-js v2 does not have a chained `.onConflict().ignoreDuplicates()` method; upsert is the correct API.

**Note:** Requires `GOOGLE_BOOKS_API_KEY` in `.env.local` and Vercel. Without it, requests still work (Google Books allows ~1000 unauthenticated queries/day) but will be rate-limited sooner.

**Bugs fixed post-completion (review pass):**
- `book_authors` conflict handling was using non-existent supabase-js v2 API (silent runtime failure) → fixed to `.upsert({ ignoreDuplicates: true })`
- `/auth/callback` `next` param was unvalidated (open redirect) → now validated to be a relative path only
- Search page had a race condition where slow responses could overwrite faster newer ones → fixed with a sequence counter

---

### Step 6 — Library Management ✅ Complete (2026-03-04)

**What was built:**
- `src/app/api/library/route.ts` — POST (upsert status/rating/dates) and DELETE (remove from library). Server validates status enum and rating range before touching DB.
- `src/app/(app)/books/[id]/library-actions.tsx` — Client component on the book detail page. Status pill buttons (want to read / currently reading / read) update immediately. Expandable "Edit rating & dates" panel with interactive 5-star rating (click same star to clear) and date inputs. "Remove from library" in the same panel. Calls `router.refresh()` after each mutation to keep profile stats and library counts fresh.
- `src/app/(app)/books/[id]/page.tsx` — Updated to fetch the user's existing `user_books` row and pass it as `initialUserBook` prop to `LibraryActions`. Added genre chips. Removed "coming soon" placeholder.
- `src/app/(app)/library/page.tsx` — Full library view. Status tabs (Reading / Want to read / Read) with counts. Sort options (recently added / rating / title / finish date). Responsive 2–5 column book grid with cover images, title, author, and star rating badge overlay. Designed empty states per status with CTAs linking to search.
- `src/components/app-nav.tsx` — Added "Library" nav link.

**Key decisions:**
- Library mutations go through `/api/library` (server route) rather than calling Supabase directly from the client, keeping the DB write pattern consistent with the rest of the app.
- The POST handler uses `upsert` with `onConflict: "user_id,book_id"` so adding a book and updating it go through the same endpoint — no need for separate insert vs update logic.
- Status tabs and sort are URL search params (`?status=read&sort=rating`) so the page is bookmarkable and the browser back button works correctly.
- Star rating: clicking the currently selected star clears the rating (sets to null) — same UX as Letterboxd.
- `router.refresh()` after mutations re-fetches the server-rendered library page and profile stats without a full page reload.

---

### Step 7 — Goodreads Import ✅ Complete (2026-03-05)

**What was built:**
- `src/app/(app)/import/page.tsx` — Full client-side import UI. Two-step flow: (1) instructions card with direct link to Goodreads export page, (2) drag-and-drop/click CSV file zone. Parses CSV instantly with papaparse and shows a preview ("Found X books — Y read, Z to-read, W currently reading"). Sends rows to the API in batches of 25 and shows a live progress bar. On completion, redirects to `/library`.
- `src/app/api/import/route.ts` — POST: creates an `imports` record and returns `import_id`. Sets initial status to `processing`.
- `src/app/api/import/[id]/route.ts` — POST: processes a batch of rows (5 concurrent per batch). For each row: (1) check local DB by isbn_13, (2) search Google Books by ISBN, (3) search Google Books by title+author, (4) create minimal book from CSV data if all else fails. Upserts `user_books` with status/rating/dates and inserts an `import_rows` record. PATCH: finalises the import record with matched/unmatched counts and `completed_at`.
- `src/components/app-nav.tsx` — Added "Import" link in the user dropdown menu.

**Key decisions:**
- CSV parsing is done entirely client-side (papaparse) so the preview is instant — no server round-trip needed for the parse step.
- Goodreads ISBN format includes `="..."` wrapper — stripped before matching.
- Matching priority: local DB by isbn_13 → Google Books by ISBN → Google Books by title+author → minimal book record from CSV data. This "never block" strategy means all books are imported; unmatched ones just have less metadata.
- Rows processed 5 at a time concurrently within each batch to balance speed vs. API rate limits.
- `user_books` upsert uses `onConflict: "user_id,book_id"` — re-importing updates existing records (status, rating, dates) rather than duplicating them.
- Unmatched books are still added to `user_books` with whatever CSV data exists; they appear in the library and can be manually searched/re-linked later.
- Batching to `/api/import/[id]` keeps each API request under Vercel's serverless timeout limit (10–30s depending on plan).

**Known issues / debt:**
- No "review unmatched books" UI yet — the build plan mentions a small "X unmatched books" link in the library, but this is not built. For now, unmatched books just appear in the library with their CSV title/author.
- Re-importing does not merge reviews or notes from Goodreads (the CSV `My Review` field is parsed but not used — reviews must be re-written natively).
- Google Books API quota: heavy importers (500+ books, all new) use ~500 API calls. Free tier allows 1000/day. If multiple users import simultaneously, quota could be hit. Add a `GOOGLE_BOOKS_API_KEY` with higher quota if needed.
- Import progress redirects to `/library` on completion. Once the analytics dashboard is built (Phase 2), redirect should go there instead for the "wow moment" described in the spec.

---

### Steps 8 + 9 — Book Detail Page & Reviews ✅ Complete (2026-03-05)

Built together as they are tightly coupled. Depends on: Steps 3, 5, 6.

**What was built:**
- `src/app/(app)/books/[id]/page.tsx` — Updated with: average platform rating (computed from all user ratings), community reviews section with user avatars/names/dates, "Your review" section (shows form or saved review), back link changed from `/search` to `/library`.
- `src/app/(app)/books/[id]/review-form.tsx` — Client component for writing/editing reviews. States: write mode (textarea + submit), saved mode (review text + Edit/Delete buttons), locked mode (not in library → prompt to add book first). POST to `/api/reviews` on submit, DELETE on remove. Calls `router.refresh()` after mutations.
- `src/app/api/reviews/route.ts` — POST: upserts review (one per user per book) using `onConflict: "user_id,book_id"`. Looks up `user_book_id` to populate the FK (nullable). Returns `{ review }`. DELETE: removes by `user_id` + `book_id`. Returns `{ ok: true }`.

**Key decisions:**
- Average rating is computed server-side by fetching all non-null ratings for the book and averaging in JS. Supabase JS doesn't support aggregate functions directly in select; this approach is simple and correct for early scale.
- Reviews require the book to be in the user's library (`hasInLibrary` prop). This matches the build plan ("Write a text review for any book in the user's library") and ensures ratings and reviews are tied to meaningful reading activity.
- Community reviews show all reviews including the current user's own — the "Your review" section above is the editing surface, the community list is the read-only view.
- Used a plain `<img>` tag (not Next.js `<Image>`) for review avatar thumbnails to avoid needing to whitelist every possible Supabase project URL in `next.config.ts`. The avatar URLs are already trusted (user-uploaded to our own Supabase Storage bucket).
- Back link changed from `/search` to `/library` — more useful since users typically arrive from their library.

**Known issues / debt:**
- Average rating is computed with a full table scan on `user_books` filtered by `book_id`. This is fine at low scale but could be optimised with a materialised view or cached column if the platform grows.
- No pagination on community reviews — all reviews for a book are fetched and rendered. Fine for now given the expected user count.
- The `<img>` tag for avatars in reviews bypasses Next.js image optimisation. Acceptable for small avatar thumbnails.

---

## Environment & Infrastructure

| Item | Value / Status |
|------|---------------|
| Supabase project ID | `fzbqvopmlizieegapixf` |
| Supabase URL | `https://fzbqvopmlizieegapixf.supabase.co` |
| GitHub repo | `abebeyosef/BetterReads` |
| Vercel project | `better-reads` |
| Vercel env vars set | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Google Books API key | ✅ Added (local + Vercel) — validated working |
| Google OAuth in Supabase | ⬜ Not yet enabled |

---

## Future Development Notes

### Search — needs a proper research pass before further work
The current search implementation (Google Books + Open Library, parallel, relevance+popularity blended ranking) is functional but not yet great. Before investing more time in search ranking, do a proper research pass on how best-in-class book/content search works. Specifically investigate:
- **Fuzzy matching** — handling typos, alternate spellings, accented characters (e.g. "Panza de burro" vs "Dogs of Summer")
- **Tokenisation and stemming** — matching "running" to "run", ignoring stop words ("the", "of", "a")
- **Field-weighted scoring** — title match should outweigh description match; exact author match should boost score
- **Typesense or Algolia** — dedicated search engines that handle all of the above out of the box. Consider indexing the local `books` table in one of these once the book catalogue grows. Typesense has a generous free tier and is self-hostable.
- **Google Books `intitle:` / `inauthor:` query operators** — using structured query syntax may improve relevance from the API itself before we even re-rank
- **User intent signals** — if the query looks like an ISBN, skip full-text search entirely and go straight to ISBN lookup

This is a deliberate future task, not something to patch incrementally. Research first, then implement properly.

---

## Ongoing Notes & Decisions

- **Next.js version must stay at 15.2.6 or higher** — do not use any earlier 15.x version due to CVE-2025-66478
- **Never run `npm audit fix --force`** — this can silently downgrade packages to vulnerable versions
- **`node_modules` is gitignored** — always run `npm install` in a fresh clone before `npm run dev`
