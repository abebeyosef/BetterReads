# Build Plan: Modern Social Book Tracking Platform

## Project Overview

A modern, social book-tracking web application — a "Goodreads, but better" — inspired by Letterboxd's clean design and social-first approach. The platform lets users search for books, log reading activity with dates and ratings, write reviews, see reading analytics and trends, get personalised recommendations, and follow friends' reading activity. It starts as a personal tool for two users but is architected to scale to hundreds or thousands. The primary differentiators are a modern UI, meaningful reading analytics, and a frictionless Goodreads import that delivers instant value.

**Name:** BetterReads

---

## Goals (MoSCoW)

### Must Have (MVP)
- Users can sign up, log in, and manage a profile
- Users can search for any book (via external APIs) and add it to their library
- Users can track reading status (want to read / currently reading / read) with dates
- Users can rate and review books
- Users can import their Goodreads export and immediately see their library populated
- Users can view personal reading analytics (books per year, genre breakdown, time-to-read)
- The app is mobile-responsive from day one
- Book metadata is cached locally on first interaction (search externally, cache internally)

### Should Have (MVP+)
- Users can see a feed of all platform activity (simplified social — no follow-scoping yet)
- User profile pages showing reading history and reviews
- Rules-based recommendations ("you haven't read sci-fi in 4 months", "continue this series")
- Reading goal system ("read 24 books this year") with progress tracking
- Basic book detail pages with community reviews

### Could Have (Post-MVP)
- Follow system with scoped activity feeds
- Notification system
- User-created and shareable book lists
- Trending books section
- "Where to buy" affiliate links on book pages

### Won't Have (This Version)
- Real-time chat or DMs
- Book clubs / group features
- Edition/format tracking (audiobook vs ebook vs print)
- ML-based recommendations
- Content moderation tooling (design for it, don't build it)
- Premium subscription tier
- Mobile native app

---

## Architecture & Tech Stack

### Frontend: Next.js 14+ (App Router) on Vercel
Next.js gives us SSR for book pages (good for SEO if the platform grows), client-side interactivity for dashboards, and API routes for server-side logic. Vercel provides zero-config deployment, preview branches, and generous free tier. Use the App Router with Server Components by default, Client Components only where interactivity is needed.

### Backend / Database / Auth: Supabase
Supabase provides managed Postgres, built-in auth (email + Google OAuth), Row-Level Security for multi-user data isolation, Edge Functions for server-side logic, and storage for user avatars. The free tier supports 500MB database and 1GB storage — sufficient for early scale. All tables should include `user_id` foreign keys and RLS policies from day one.

### Styling: Tailwind CSS + shadcn/ui
Tailwind for utility-first styling. shadcn/ui for accessible, customisable component primitives (dialogs, dropdowns, cards, etc.). This avoids the overhead of a heavy component library while maintaining design consistency. Dark mode support from the start (Letterboxd-inspired aesthetic).

### Book Data: Google Books API (primary) + Open Library (fallback)
Google Books provides more consistent metadata, better cover images, and broader coverage. Open Library is free and community-driven but has variable data quality. Strategy: search Google Books first, fall back to Open Library, cache all results in local database.

**Critical: Do NOT store cover images locally.** Link to external cover URLs from Google Books / Open Library. Only store user-uploaded avatars in Supabase Storage.

### Charts: Recharts
Lightweight, React-native charting library. Good for the analytics dashboard. Already works well with Next.js.

### Key Architectural Decisions

1. **Multi-tenant from day one.** Every user-facing table has a `user_id` column. RLS policies enforce data isolation. This is non-negotiable even for two users — retrofitting it later is painful.

2. **Activity events are append-only and denormalised.** The `activity_events` table stores pre-rendered event data (actor name, book title, action type) rather than requiring joins at read time. This avoids the performance cliff that comes with a normalised activity feed at scale.

3. **Book metadata is global, user data is per-user.** The `books` table is shared across all users. The `user_books` table (status, dates, rating) is per-user. Reviews reference both. This separation is critical.

4. **External API calls go through server-side routes.** Never call Google Books or Open Library directly from the client. Use Next.js API routes or Supabase Edge Functions to proxy requests, handle rate limiting, and cache results.

5. **Goodreads import is a first-class feature, not an afterthought.** The import pipeline should be robust, handle edge cases gracefully, and deliver the "instant insights" moment that makes new users feel the platform's value immediately.

---

## Data Model

### Core Tables

```
users
  id (uuid, PK, from Supabase auth)
  username (text, unique)
  display_name (text)
  avatar_url (text, nullable)
  bio (text, nullable)
  reading_goal_year (int, nullable — e.g. 24)
  reading_goal_count (int, nullable — target books)
  created_at (timestamptz)
  updated_at (timestamptz)

books
  id (uuid, PK)
  title (text, not null)
  subtitle (text, nullable)
  description (text, nullable)
  cover_url (text, nullable — external URL, never stored locally)
  page_count (int, nullable)
  published_date (text, nullable)
  language (text, nullable)
  isbn_10 (text, nullable)
  isbn_13 (text, nullable)
  google_books_id (text, nullable, unique)
  open_library_id (text, nullable, unique)
  genres (text[], nullable — best-effort from API data)
  created_at (timestamptz)
  updated_at (timestamptz)

authors
  id (uuid, PK)
  name (text, not null)
  created_at (timestamptz)

book_authors
  book_id (uuid, FK → books)
  author_id (uuid, FK → authors)
  PRIMARY KEY (book_id, author_id)

user_books
  id (uuid, PK)
  user_id (uuid, FK → users)
  book_id (uuid, FK → books)
  status (enum: 'want_to_read', 'currently_reading', 'read')
  rating (smallint, nullable, 1–5)
  date_started (date, nullable)
  date_finished (date, nullable)
  created_at (timestamptz)
  updated_at (timestamptz)
  UNIQUE (user_id, book_id)

reviews
  id (uuid, PK)
  user_id (uuid, FK → users)
  book_id (uuid, FK → books)
  user_book_id (uuid, FK → user_books)
  text (text, not null)
  created_at (timestamptz)
  updated_at (timestamptz)
  UNIQUE (user_id, book_id)

activity_events
  id (uuid, PK)
  user_id (uuid, FK → users — the actor)
  event_type (enum: 'started_reading', 'finished_reading', 'reviewed', 'rated', 'added_to_library', 'created_list')
  book_id (uuid, FK → books, nullable)
  metadata (jsonb — denormalised snapshot: book title, cover_url, rating, etc.)
  created_at (timestamptz)

follows
  follower_id (uuid, FK → users)
  following_id (uuid, FK → users)
  created_at (timestamptz)
  PRIMARY KEY (follower_id, following_id)

notifications
  id (uuid, PK)
  recipient_id (uuid, FK → users)
  event_id (uuid, FK → activity_events)
  is_read (boolean, default false)
  created_at (timestamptz)

lists
  id (uuid, PK)
  user_id (uuid, FK → users)
  title (text, not null)
  description (text, nullable)
  is_public (boolean, default true)
  created_at (timestamptz)
  updated_at (timestamptz)

list_books
  list_id (uuid, FK → lists)
  book_id (uuid, FK → books)
  position (int)
  PRIMARY KEY (list_id, book_id)
```

### Import Tables

```
imports
  id (uuid, PK)
  user_id (uuid, FK → users)
  source (enum: 'goodreads')
  status (enum: 'pending', 'processing', 'completed', 'failed')
  total_rows (int, nullable)
  matched_rows (int, nullable)
  unmatched_rows (int, nullable)
  created_at (timestamptz)
  completed_at (timestamptz, nullable)

import_rows
  id (uuid, PK)
  import_id (uuid, FK → imports)
  raw_data (jsonb — the original CSV row)
  matched_book_id (uuid, FK → books, nullable)
  match_method (enum: 'isbn', 'title_author', 'manual', nullable)
  match_confidence (float, nullable)
  status (enum: 'pending', 'matched', 'unmatched', 'skipped')
```

### Indexes to Create

- `user_books(user_id, status)` — library filtering
- `user_books(user_id, date_finished)` — analytics queries
- `activity_events(created_at DESC)` — feed ordering
- `activity_events(user_id, created_at DESC)` — user-specific feed
- `books(google_books_id)` — dedup on import
- `books(isbn_13)` — dedup on import
- `reviews(book_id, created_at DESC)` — book page reviews

---

## Feature List

### MVP Features (Phase 1–2)

**Authentication & Profiles**
- Email/password and Google OAuth sign-up/sign-in via Supabase Auth
- User profile page: username, display name, avatar, bio
- Profile editing
- Acceptance: user can sign up, sign in, and see their profile

**Book Search & Caching**
- Search bar queries Google Books API (via server-side route)
- Results display: cover, title, author, publication year
- Clicking a result caches the book in the local `books` table if not already present
- Fallback to Open Library if Google Books returns no results
- Acceptance: user can search for any mainstream book and find it; cached books load instantly on repeat searches

**Library Management**
- Add books with status: want to read / currently reading / read
- Update status (e.g., move from "currently reading" to "read")
- Set date started, date finished, rating (1–5 stars)
- Library view with tabs for each status
- Sort by: recently added, recently finished, highest rated, title
- Filter by genre/author (where data exists)
- Acceptance: user's library accurately reflects their reading status and history

**Reviews**
- Write a text review for any book in the user's library
- Edit or delete own reviews
- Reviews display on the book detail page
- Acceptance: review is saved, appears on book page, and can be edited

**Book Detail Page**
- Hero section: cover, title, author(s), description, average platform rating
- User actions: add to library, update status, rate, write review
- Community reviews section (all platform reviews for this book)
- Acceptance: page loads with correct metadata, shows reviews, and all actions work

**Goodreads Import (designed to feel one-click)**
- User clicks "Import from Goodreads" → clean modal with two steps:
  - Step 1: Direct link to Goodreads export page (goodreads.com/review/import) with short plain-English instruction ("Click the link, click Export Library, wait ~1 minute for the file")
  - Step 2: Drag-and-drop zone (or file picker) for the downloaded CSV
- On file drop, parse instantly and show inline preview: "Found 347 books — 289 read, 42 to-read, 16 currently reading"
- Single "Import" button to confirm
- Match books by ISBN first, then title+author fuzzy match
- Unmatched books silently imported with raw metadata (no blocking "resolve" screen — user can fix later via a small "X unmatched books" link in their library)
- Progress animation during import
- On completion, redirect straight to analytics dashboard with full history visualised — this is the "wow" moment
- Acceptance: entire flow from clicking "Import" to seeing analytics takes under 2 minutes; no step requires the user to make decisions beyond confirming the preview
- Future enhancement: browser extension that automates the Goodreads export step (post-MVP)

**Reading Analytics Dashboard**
- Books read per month and per year (bar/line chart)
- Average rating over time
- Genre breakdown (pie/bar chart, where genre data exists)
- Time-to-read per book (finish date minus start date)
- Average time-to-read by genre
- Fiction vs non-fiction split (best-effort classification)
- Personal highlights: longest read, fastest read, highest-rated streak
- "Recency gap" insights: "It's been X months since you read [genre]"
- Acceptance: dashboard displays accurate charts from user's reading data; works correctly with imported Goodreads data

**Reading Goal**
- Set a yearly reading goal (e.g., "Read 24 books in 2025")
- Progress bar on home dashboard
- Goal completion tracking
- Acceptance: user sets goal, progress updates as books are marked "read"

### Post-MVP Features (Phase 3–4)

**Simplified Social Feed**
- Platform-wide activity feed showing all users' reading events (no follow-scoping)
- Events: started reading, finished reading, reviewed a book
- Like/react to activity events
- Acceptance: feed shows recent activity from all users, ordered by recency

**User Profiles (Public)**
- View another user's profile: their library, reviews, stats summary
- Follow/unfollow button (data stored, but feed not yet scoped by follows)
- Acceptance: can navigate to any user's profile and see their reading activity

**Rules-Based Recommendations**
- "You haven't read [genre] in X months" (from recency gap data)
- "Continue a series you started" (if series data available)
- "More from authors you rate highly"
- "Books your friends rated 4+ stars" (once social exists)
- Acceptance: recommendations section shows personalised suggestions with clear reasoning

**Book Lists**
- Create named lists with descriptions (e.g., "Best Sci-Fi 2024", "Holiday TBR")
- Add/remove/reorder books in lists
- Public/private toggle
- Share list via URL
- Acceptance: lists can be created, edited, shared, and viewed by others

### Out of Scope (Designed Around, Not Built)

- Follow-scoped feeds and notification system
- Trending/popular books section
- Chat/DMs between users
- Book clubs and groups
- Edition/format tracking
- ML-powered recommendations
- Affiliate link monetization module
- Premium subscription features
- Content moderation tools (but include `flagged` boolean on reviews table)
- Mobile native apps

---

## Build Sequence

### Phase 1: Core Loop + Import (Weeks 1–3)
**Goal:** Two users can sign up, import their Goodreads data, browse their library, and see analytics.

1. **Project scaffolding** — Next.js app, Supabase project, Tailwind + shadcn/ui setup, environment config, deploy pipeline to Vercel
2. **Database schema** — Create all core tables, RLS policies, indexes
3. **Auth** — Email/password + Google OAuth via Supabase Auth, session management, protected routes
4. **User profiles** — Create/edit profile, avatar upload
5. **Book search** — Server-side API route to Google Books, results display, cache-on-click to local DB
6. **Library management** — Add/remove books, status tracking, date fields, rating
7. **Goodreads import** — two-step modal (link to Goodreads export + drag-and-drop CSV), instant parse/preview, non-blocking match strategy, redirect to analytics on completion
8. **Book detail page** — Metadata display, user actions, basic layout
9. **Reviews** — Write, edit, delete reviews; display on book pages

**Milestone check:** Can you and your girlfriend both sign up, import Goodreads data, and see your full libraries with correct statuses, dates, and ratings?

### Phase 2: Analytics + Recommendations + Goal (Weeks 4–5)
**Goal:** The "aha moment" — imported data becomes insights.

1. **Analytics dashboard** — All chart views, computed from `user_books` data
2. **Recency gap engine** — Query logic for "time since last read in genre X"
3. **Reading goal** — Set goal, track progress, display on home
4. **Rules-based recommendations** — Surface recency gaps, author affinity, genre suggestions
5. **Home dashboard** — Currently reading card, quick stats row, reading goal progress, recommendations preview

**Milestone check:** After import, does the analytics dashboard feel genuinely insightful? Are recommendations useful? Does the home screen make you want to open the app?

### Phase 3: Social + Lists (Weeks 6–8)
**Goal:** The platform feels alive with more than one user.

1. **Activity events** — Generate events on status changes, reviews, ratings
2. **Activity feed** — Platform-wide feed on home page and social tab
3. **Public profile pages** — View other users' libraries and reviews
4. **Follow system** — Follow/unfollow, followers/following counts
5. **Book lists** — Create, edit, share, browse
6. **UI polish pass** — Responsive refinement, loading states, error handling, empty states

**Milestone check:** Does browsing your girlfriend's profile and seeing her activity feel like Letterboxd? Do empty states (no data, no followers) look good rather than broken?

### Phase 4: Polish + Hardening (Week 9+)
**Goal:** Production-ready for sharing with friends.

1. **Error handling** — Graceful fallbacks for missing covers, failed API calls, import edge cases
2. **Performance** — Optimise analytics queries, add database indexes if needed, lazy load images
3. **SEO basics** — Meta tags on book pages, Open Graph for shared links
4. **Invite flow** — Simple way to invite friends (even just a shareable link)
5. **Data quality** — Handle duplicate books, missing genres, inconsistent author names

---

## Constraints & Assumptions

### Constraints
- **Solo developer** (or pair with AI coding tools) — scope must stay tight
- **Zero budget initially** — must stay within Supabase free tier (500MB DB, 1GB storage, 50k monthly auth users) and Vercel free tier
- **Google Books API quota** — 1,000 requests/day on free tier. Caching is essential. Consider applying for higher quota if needed.
- **No cover image storage** — link to external URLs only to stay within storage limits
- **Goodreads export format** — CSV format is not formally documented and could change. Build parser defensively.

### Assumptions to Validate Early
1. **Google Books API provides sufficient metadata** — test with a variety of books (obscure titles, non-English, self-published) before committing. If coverage is poor, Open Library may need to be primary.
2. **Goodreads CSV export includes dates and ratings** — verify the actual export format with a real export before building the parser. Also confirm the direct export URL (goodreads.com/review/import) still works and hasn't moved.
3. **Genre data is available** — both Google Books and Open Library have inconsistent genre/category data. The analytics dashboard's genre features depend on this. Test early and have a fallback (e.g., let users tag genres manually).
4. **Supabase free tier is sufficient** — monitor database size as imported libraries grow. A heavy Goodreads user might have 500+ books; at ~1KB per book row, this is fine, but activity events will grow faster.
5. **Two users is a valid test for social features** — social features may feel empty or broken with only two users. Plan for good empty states and consider inviting 3–5 friends before evaluating whether social is working.

---

## Open Questions

1. **Book deduplication strategy** — When two users import the same book from Goodreads, how do we ensure they reference the same `books` row? Match on ISBN first, then Google Books ID? What if the ISBNs differ (different editions)?

2. **Genre taxonomy** — Do we use Google Books categories as-is, map them to a simplified taxonomy (e.g., "Fiction > Sci-Fi"), or let users self-tag? This decision affects the entire analytics and recommendations layer.

3. **Review visibility** — Are all reviews public by default? Can users make reviews private (visible only to them)? This affects the book detail page and social feed.

4. **Activity feed granularity** — Does every status change generate a feed event, or only "meaningful" ones (started reading, finished reading, reviewed)? Too many events = noisy feed. Too few = dead feed.

5. **Handling re-reads** — Can a user log the same book as "read" multiple times? The current `user_books` schema has a unique constraint on `(user_id, book_id)`. If re-reads are supported, this needs to become a one-to-many relationship.

6. **Data portability** — Should users be able to export their data from your platform? Good practice and builds trust, but needs to be designed.

7. **Auth provider expansion** — Start with Google + email. When (if ever) to add Apple sign-in? Relevant if mobile becomes a priority.

---

## Design Direction Notes (for UI Implementation)

- **Dark mode by default**, with light mode toggle (Letterboxd-inspired)
- **Cover images are the primary visual element** — grid layouts, large covers on detail pages
- **Minimal chrome** — clean sans-serif typography, generous whitespace, subtle borders
- **Mobile-first responsive design** — bottom navigation on mobile, side navigation on desktop
- **Loading skeletons** everywhere — the app should never show blank screens while data loads
- **Empty states are designed, not ignored** — "No books yet? Search for your first one" with a clear CTA
- **Micro-interactions** — star ratings should feel tactile, status changes should animate, feed items should fade in
