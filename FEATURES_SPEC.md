# BetterReads — Features Specification (Phases 6–9)

> **For Claude Code.** This document is the authoritative build brief for all new features.
> Read `BRAND_LANGUAGE.md` before starting — all copy and naming comes from there.
> The database schema is already written in `supabase/migrations/002_features.sql` — run it before building any UI.
> Existing codebase patterns: Next.js 15 App Router, TypeScript, Tailwind CSS + shadcn/ui, Supabase SSR client.

---

## Quick Reference — New Routes

| Route | Description |
|---|---|
| `/library` | Extended statuses, labels, format filter |
| `/books/[id]` | Quarter-star rating, Vibes, Tempo, Heads Up, Check-ins, Collections |
| `/checkins` | Check-in feed / history |
| `/stats` | "Your Reading Story" — rich analytics |
| `/discover` | "What's Next?" recommendations + "Find a Book" advanced search |
| `/reading-together/[id]` | Buddy read / readalong room |
| `/circles` | Reading Circles index |
| `/circles/[id]` | Circle room (discussion, polls, meetings) |
| `/quests` | Reading Quests index + create |
| `/quests/[id]` | Quest detail + leaderboard |
| `/settings` | New tabs: Reading Preferences, Heads Up comfort zone, Notifications |

---

## Phase 6 — Quick Wins (Highest Impact, Lowest Effort)

### 6.1 Extended Library Statuses

**Schema:** `user_books.extended_status text` (already added by migration)
Values: `on_hold | left_behind | on_my_shelf | loved`
The core `status` enum (`want_to_read | currently_reading | read`) stays unchanged.
`loved` can be set on any book regardless of `status`.

**UI changes — `/books/[id]` library-actions.tsx:**

Add a second row of status buttons below the primary three (Up Next / Reading Now / Finished):

```
[On Hold]  [Left Behind]  [On My Shelf]
```

- "On Hold" and "Left Behind" are only shown when `status === 'currently_reading'` or there's an existing `extended_status`.
- "On My Shelf" is always visible (physical ownership tracker).
- Each button uses the same `rounded-full px-3 py-1 text-xs font-medium` pattern with `bg-muted` default and `bg-primary text-primary-foreground` when active.
- Clicking an active extended status clears it (sets to `null`).

**API:** `PATCH /api/library` — add `extended_status` to the accepted body alongside `status`. Update existing `POST /api/library` handler or create a dedicated PATCH route.

**Library page filtering (`/library/page.tsx`):**

Add a horizontal filter bar above the book grid:

```
[All]  [Finished]  [Reading Now]  [Up Next]  [On Hold]  [Left Behind]  [On My Shelf]
```

Pass as `?status=on_hold` query param. The server component reads `searchParams.status` and adjusts the Supabase query.

---

### 6.2 ❤ Loved

**Schema:** `user_books.is_loved boolean default false`

**UI:** Small heart icon button on the book card in the library grid AND on the book detail page alongside the status buttons. Toggle on click.

- Active state: filled heart `♥` in `text-rose-500`.
- Inactive state: outline heart `♡` in `text-muted-foreground`.

**Filter:** Add "Loved ❤" filter option to the library filter bar.

**API:** `PATCH /api/library` accepts `is_loved: boolean`.

---

### 6.3 Quarter-Star Ratings

**Schema:** `user_books.rating numeric(3,2)` (migration already altered this column)
Valid values: `0.25, 0.50, 0.75, 1.00, 1.25 … 5.00` (increments of 0.25)

**Component: `StarRating` in `library-actions.tsx`**

Replace the current integer star rating with a half-star or quarter-star picker:

- Render 5 full stars.
- On hover, detect position within each star: left half = `.5` increment, right half = full star (or split into quarters: left quarter = `.25`, left-mid = `.5`, right-mid = `.75`, right quarter = `1.0`).
- Display selected rating as `★ 3.75` text next to the stars.
- Use `onMouseMove` on each star `<button>` to detect `clientX` relative to the element's `getBoundingClientRect()`.

**Book cards and profile:** Display rating as `★ 3.75` (not just integer stars) wherever ratings are shown.

---

### 6.4 Book Format

**Schema:** `user_books.format text` — values: `physical | ebook | audiobook | arc`

**UI:** Small pill selector in the "Edit rating & dates" panel (same collapsible section in `library-actions.tsx`):

```
[Physical]  [eBook]  [Audiobook]  [ARC]
```

One can be selected at a time. Selecting the already-active format deselects it (sets to `null`).

**API:** Add `format` to `POST /api/library` body.

---

### 6.5 Labels (Custom Tags)

**Schema:** `labels` table + `user_book_labels` join table (already in migration).

**Component:** `<LabelPicker bookId={bookId} />` — a client component similar to `AddToListButton`.

- Renders as a "Label +" button on the book detail page.
- On click, opens a dropdown:
  - Lists existing user labels with checkboxes.
  - Input at the bottom to create a new label (press Enter to create + apply).
  - Each label shown as a coloured pill based on `labels.color` hex.
- Labels applied to a book appear as coloured pills in the book's library card.

**Pages:**
- `GET /api/labels` — returns user's labels, optionally filtered by `book_id` to show which are applied.
- `POST /api/labels` — creates a new label `{ name, color }`. Assign a random colour from a warm palette if none provided.
- `POST /api/labels/[id]/books` — applies label to a book `{ book_id }`.
- `DELETE /api/labels/[id]/books?book_id=` — removes label from book.

**Library page:** Add label filter chips below the status filter bar.

---

### 6.6 Public / Private Collections

**Schema:** `lists.is_public boolean` — already exists.

**UI change:** On the Create List form (`create-list-form.tsx`) and on the list detail page edit form, add a toggle:

```
[🔒 Private]  [🌐 Public]
```

Default: Private. Public collections are visible on the user's public profile at `/users/[username]`.

**Public profile page (`/users/[username]/page.tsx`):** Add a "Collections" tab/section showing `lists` where `is_public = true`, rendered as `ListCard` components.

---

### 6.7 Backdate Reading Dates

Already supported by the date pickers in `library-actions.tsx`. No schema change needed.

**Enhancement:** When a user sets `status = 'read'` for the first time, automatically pre-fill `date_finished` with today's date (if not already set). Do this client-side in the `setStatus` function in `library-actions.tsx`.

---

### 6.8 Data Export

**Route:** `GET /api/export` — streams a CSV of the user's full library.

Columns: `title, author, isbn, status, extended_status, rating, date_started, date_finished, format, is_loved, date_added`

Join `user_books` → `books` for title/author/isbn.

**UI:** In Settings page, add an "Export Data" section (above Danger Zone):

```
Your Reading Data
Export a CSV of your entire library, ratings, and reading dates.
[Download CSV]
```

The button triggers a `window.location.href = '/api/export'` which streams the CSV with `Content-Disposition: attachment; filename="betterreads-export.csv"`.

---

## Phase 7 — Core Enrichment

### 7.1 Vibes System

**What it is:** Community-sourced mood/vibe tags on books. Users vote on which Vibes apply to a book. The book detail page shows a "Vibe Cloud" — all vibes ranked by vote count.

**Schema:** `vibes`, `book_vibes` tables (already in migration). Seed data: 15 vibes already seeded.

**Vibes vocabulary** (from `BRAND_LANGUAGE.md`):
Cosy · Romantic · Gripping · Dark · Hopeful · Funny · Emotional · Dreamy · Thought-provoking · Adventurous · Tense · Heartbreaking · Uplifting · Whimsical · Eerie

**Component: `<VibeCloud bookId={bookId} userId={userId} />`**

Place on the book detail page below the synopsis, before "Heads Up".

Layout:
```
Vibes  [What's the vibe of this book?]

  Cosy (142)   Romantic (89)   Gripping (67)
  Dark (44)   Emotional (41)   ...

  [+ Add your vibes]
```

- All vibes with ≥ 1 vote are shown as pills, sorted by vote count descending.
- Vibes the current user has voted for are highlighted (`bg-primary text-primary-foreground`).
- Clicking a highlighted vibe removes the user's vote; clicking an unhighlighted vibe adds it.
- "[+ Add your vibes]" expands a panel showing ALL 15 vibes as toggles.
- Max 5 vibes per user per book (enforce client-side and server-side).

**API:**
- `GET /api/books/[id]/vibes` — returns `{ vibes: { id, name, count, user_voted }[] }`
- `POST /api/books/[id]/vibes` — body `{ vibe_id }` — adds user's vote
- `DELETE /api/books/[id]/vibes?vibe_id=` — removes user's vote

---

### 7.2 Tempo

**What it is:** Community rating of how fast-paced a book feels. Three options: Slow Burn · Steady · Page-Turner.

**Schema:** `book_tempo_votes` table (already in migration).

**Component: `<TempoPicker bookId={bookId} />`**

Place on book detail page, same row as Vibes heading or just below it.

```
Tempo   [Slow Burn]  [Steady]  [Page-Turner]
Community says: Page-Turner (68%)
```

- The three pills show the community distribution (counts / percentages) once ≥ 3 votes exist; otherwise show "Be one of the first to vote."
- The user's current vote is highlighted. Clicking the active pill deselects (deletes vote).
- One vote per user per book.

**API:**
- `GET /api/books/[id]/tempo` — returns `{ slow_burn: n, steady: n, page_turner: n, user_vote: string|null }`
- `POST /api/books/[id]/tempo` — body `{ tempo: 'slow_burn'|'steady'|'page_turner' }` — upserts
- `DELETE /api/books/[id]/tempo` — removes user's vote

---

### 7.3 Plot-Driven / Character-Driven

**Schema:** `book_character_votes` table (already in migration). Column `vote_type: 'plot_driven'|'character_driven'`.

**Component:** Same treatment as Tempo but binary:

```
What drives it?  [Plot-Driven]  [Character-Driven]
Community says: Character-Driven (72%)
```

Place on book detail page directly below Tempo.

---

### 7.4 Heads Up (Content Warnings)

**What it is:** Community-sourced content warnings so readers can make informed choices. Three display tiers: "A lot" / "Some" / "Briefly mentioned". Users can flag warnings and hide them behind a reveal.

**Schema:** `content_warning_types`, `book_content_warnings`, `user_comfort_flags` (all in migration).

**Seed data (23 types):** already seeded in migration. Categories include: Death of loved one, Suicide, Self-harm, Abuse, Violence, Sexual assault, Racism, Homophobia, Addiction, Animal harm, Child harm, Eating disorders, Mental health crisis, War, Torture, Infidelity, Pregnancy/miscarriage, Grief, Illness, Trauma, Hate crime, Domestic violence, Descriptions of food.

**Component: `<HeadsUp bookId={bookId} userId={userId} />`**

Place on book detail page below Vibes/Tempo section, above any reviews.

Default state (collapsed):
```
Heads Up  ▸  [reveal]
```

Expanded:
```
Heads Up  ▴

A lot:          Death of loved one · Violence
Some:           Grief · Illness
Briefly:        Infidelity

[Flag a warning +]
```

- Warnings from `user_comfort_flags` (user's personal sensitivity list) are marked with a 🔔 icon.
- "[Flag a warning +]" opens a bottom-sheet or dropdown with all 23 warning types grouped by category; user selects severity (A lot / Some / Briefly).
- Users can update their flag if they already flagged; their flag counts as one vote in the aggregated display.

**"My Reading Comfort Zone" (Settings):**

A new settings section (below "Year in Books Goal"):

```
My Reading Comfort Zone

Let BetterReads know which topics you'd prefer a heads-up about, and we'll highlight them on book pages.

[grid of all 23 warning types with toggle on/off]
```

When a warning type is toggled ON, it stores in `user_comfort_flags`. No severity threshold — just a personal "alert me to this" flag.

**API:**
- `GET /api/books/[id]/heads-up` — returns aggregated warnings with tier counts + user's flags
- `POST /api/books/[id]/heads-up` — body `{ warning_type_id, severity }` — upserts user's flag
- `DELETE /api/books/[id]/heads-up?warning_type_id=` — removes user's flag
- `GET /api/settings/comfort-zone` — returns user's flagged warning type IDs
- `POST /api/settings/comfort-zone` — toggles a warning type on/off

---

### 7.5 Check-ins (Reading Progress)

**What it is:** Users log progress updates as they read, with optional notes. Can be page number or percentage. Feed visible on their profile and (optionally) to people they read with.

**Schema:** `check_ins` table (already in migration). Columns: `user_id, book_id, page, percent, note, is_public`.

**Component: `<CheckInButton bookId={bookId} />`**

Place on book detail page when `status === 'currently_reading'`.

Button: "Log progress +" — opens a small modal/panel:

```
Log Progress

Pages:    [____]    or    [____] %
Note (optional):
[..........................................................]

[x] Share this update (visible to reading partners)

[Save check-in]
```

**Check-in feed (`/checkins`):**

A page showing the user's own check-in history across all books, most recent first.

Each check-in card:
```
[Cover] The Name of the Wind   ·  2 days ago
        Page 214 (43%) — "This chapter is incredible, can't put it down"
```

**On book detail page:** Show a mini timeline of the user's check-ins for this book within the details panel (below the dates section).

**API:**
- `POST /api/checkins` — body `{ book_id, page?, percent?, note?, is_public }`
- `GET /api/checkins?book_id=` — returns user's check-ins for a book
- `GET /api/checkins` — returns user's full check-in history (paginated)
- `DELETE /api/checkins/[id]`

---

### 7.6 Margin Notes (Reading Journal)

**What it is:** Private reading journal entries attached to a specific book. Free-form text, optionally tagged with a page number. Separate from Check-ins (which are progress logs); Margin Notes are personal reflections.

**Schema:** Uses `check_ins` table with `note` non-null and a separate `is_margin_note boolean` column? Actually: add `is_journal_entry boolean default false` to `check_ins` table — OR — use the existing `note` field but distinguish via `page IS NULL AND percent IS NULL`.

**Better approach:** The migration already includes the `check_ins` table with both page-tracking and note fields. For Margin Notes, create entries with `page` optional, `is_public = false`, and a non-empty `note`. The UI distinguishes them by whether page/percent was provided.

**Component: `<MarginNotes bookId={bookId} />`**

Tab or section in the book details panel labelled "Margin Notes":

```
Margin Notes

[+ New note]

──────────────────────────────
p. 87 · March 10
"The way she describes the fog — reminded me of childhood
 holidays in Scotland. Pure magic."
[edit] [delete]

──────────────────────────────
p. 42 · March 6
"Plot twist I did NOT see coming."
[edit] [delete]
```

**API:** Reuses the Check-ins API. `GET /api/checkins?book_id=&notes_only=true` returns entries with non-null notes.

---

### 7.7 Reading Streak

**What it is:** Consecutive days with at least one check-in logged. Shown as a streak counter on the dashboard.

**Schema:** `reading_streaks` table (already in migration). Columns: `user_id, current_streak, longest_streak, last_activity_date, streak_goal_type, streak_goal_value`.

**Trigger logic (server-side):** After any `check_in` insert, call a Supabase Edge Function (or server action) to update `reading_streaks`:

```
if last_activity_date == today: no change (already counted)
if last_activity_date == yesterday: current_streak++, last_activity_date = today
else: current_streak = 1, last_activity_date = today
if current_streak > longest_streak: longest_streak = current_streak
```

**Dashboard widget:**

```
🔥 Reading Streak

  [47]
  days

Longest ever: 63 days
```

Place in the dashboard stats section, as an additional stat card.

**API:**
- `GET /api/streak` — returns `{ current_streak, longest_streak, last_activity_date }`
- Updated automatically on every check-in insert.

---

### 7.8 Reading Preferences Survey

**What it is:** An onboarding survey (and Settings section) where users specify their favourite genres, topics, and authors. Used for "What's Next?" recommendations.

**Schema:** `user_reading_preferences` table (already in migration). Columns: `user_id, genres text[], topics text[], authors text[], pace_preference text, preferred_formats text[]`.

**Route: `/onboarding`**

Shown automatically after first sign-up (`users.onboarding_completed = false`). Multi-step form:

**Step 1: Favourite Genres**
```
What do you love to read?  (pick as many as you like)

[Fantasy]  [Sci-Fi]  [Literary Fiction]  [Romance]  [Mystery / Thriller]
[Historical Fiction]  [Horror]  [Non-Fiction]  [Biography]  [Self-Help]
[Poetry]  [Graphic Novel]  [YA]  [Children's]  [Short Stories]
```

**Step 2: Topics you enjoy**
```
Any particular topics?  (optional)

[Magic systems]  [Found family]  [Unreliable narrator]  [Slow burn romance]
[Anti-hero]  [Political intrigue]  [Coming of age]  [Heist]  [Time travel]
[Mythology]  [True crime]  [Science]  [Travel]  [Food & cooking]  [Art]
```

**Step 3: Pace preference**
```
How do you like your books?

[Slow Burn — I love to savour]
[Steady — a comfortable pace]
[Page-Turner — I want to sprint]
[Mix it up — surprise me]
```

**Step 4: Done**
```
You're all set 🎉
BetterReads will now tailor your "What's Next?" recommendations.

[Go to my dashboard →]
```

On submit: save to `user_reading_preferences`, set `users.onboarding_completed = true`.

**Settings section ("What I Like to Read"):** Shows the same form, pre-populated, so users can update their preferences any time.

---

### 7.9 "What's Next?" Recommendations

**Route: `/discover`**

**What it is:** A recommendations page drawing on the user's preferences, reading history, and community data.

**Page structure:**

```
What's Next?                          [Find a Book ↗]

──── Made for You ────────────────────────────────────
[Book grid of 6 recommendations based on genres/topics in user_reading_preferences]

──── Because you loved {last finished book} ──────────
[Book grid of 4 similar books]

──── Trending this week ──────────────────────────────
[Book grid of 6 books with most adds in last 7 days]

──── Popular in {top genre} ──────────────────────────
[Book grid]

──── Short reads ─────────────────────────────────────
[Books under ~250 pages]
```

**"Made for You" algorithm (simple v1):**
1. Get user's `genres` from `user_reading_preferences`.
2. Query `books` where `genres && user_genres` (Postgres array overlap).
3. Exclude books already in `user_books` for this user.
4. Sort by `(SELECT count(*) FROM user_books WHERE book_id = books.id)` descending (popularity).
5. Return top 6.

**"Because you loved X" algorithm:**
1. Get user's last `read` book.
2. Find books that share ≥ 2 genres AND have high average rating.
3. Exclude user's existing library.

**API:**
- `GET /api/discover` — returns `{ made_for_you: Book[], because_of: { book: Book, similar: Book[] }, trending: Book[], popular_in_genre: Book[], short_reads: Book[] }`
- Results cached per user for 1 hour (use `unstable_cache` or `revalidatePath` after library changes).

---

### 7.10 Advanced "Find a Book" Search

**Route: `/discover/find`** (or modal on `/discover`)

**Filters:**
- Genre (multi-select)
- Vibes (multi-select from the 15 vibes)
- Tempo (Slow Burn / Steady / Page-Turner)
- Page count: [Under 150] [150–300] [300–500] [500+] [I don't mind]
- Format: Physical / eBook / Audiobook
- Rating threshold: [★ 3+] [★ 3.5+] [★ 4+] [★ 4.5+]
- Moods / Topics (from the topics tags seed data)
- Already in my library: [Hide] [Show]

**UI:** Two-column layout on desktop — filter panel on left, results grid on right. On mobile: filters behind a "Filters" button in a bottom sheet.

**API: `GET /api/search?q=&genre=&vibe=&tempo=&min_pages=&max_pages=&min_rating=&exclude_library=`**

Extend the existing search to accept these query params, building a dynamic Supabase query.

---

### 7.11 Your Reading Story (Stats)

**Route: `/stats`** (currently accessible via Dashboard but deserves its own full page)

**Page structure:**

```
Your Reading Story             [2026 ▾]   [All time ▾]

┌─────────────────────────────────────────────────────┐
│  Finished  │  Reading Now  │  Up Next  │  Loved ❤   │
│    127     │       3       │    24     │    42       │
└─────────────────────────────────────────────────────┘

── Year in Books ─────────────────────────────────────
  Goal: 24 books  ░░░░░░░░░░░░░░░░░ 18/24 (75%)
  Average per month: 2.4
  Best month: March (5 books)

── What you read ─────────────────────────────────────
  Genres breakdown — horizontal bar chart
  Vibes breakdown — coloured pill counts
  Page count histogram
  Formats pie: Physical 60% · eBook 25% · Audiobook 15%

── How you rated them ────────────────────────────────
  Rating distribution bar chart (0.5-star buckets)
  Average rating: 3.8 ★

── How fast you read ─────────────────────────────────
  Average reading time per book (where dates recorded)
  Fastest: "{Book title}" — 2 days
  Longest: "{Book title}" — 47 days

── Reading streak ────────────────────────────────────
  Current: 🔥 12 days
  Longest ever: 63 days
  Activity heatmap (GitHub-style, last 12 months)

── Authors ───────────────────────────────────────────
  Most read authors (top 10)
  New-to-me authors this year: 14
```

**Data source:** All computed server-side in the page component from Supabase queries. No separate API needed — use the page's `async` server component to run the queries.

**Charts:** Use `recharts` (already available). All charts use theme colours via Tailwind CSS variables.

---

## Phase 8 — Social Depth

### 8.1 Reading Together (Buddy Reads)

**What it is:** Two or more friends read the same book together and share Check-ins and Page Notes (spoiler-safe comments, visible only to readers who've reached that page).

**Schema:** `shared_reads`, `shared_read_participants`, `page_notes` (all in migration).

**Creating a buddy read:**

On the book detail page, add a "Read together +" button (shown alongside the status buttons).

Flow:
1. User clicks "Read together +".
2. Modal opens: "Invite someone to read with you"
   - Input: username or email
   - Set start date (optional)
   - Toggle: "Open Read" (anyone can join via link) or "Private" (invite only)
3. Creates a `shared_reads` row with `book_id` and the inviter as a participant.
4. Sends an invite (stored in DB; notification shown on recipient's dashboard).

**Route: `/reading-together/[id]`**

```
Reading Together: The Name of the Wind
──────────────────────────────────────
Reading with:  @aisha  @marcus  @you

Progress
  @you      ░░░░░░░░░░░░ p.214 (43%)
  @aisha    ░░░░░░░░     p.187 (37%)
  @marcus   ░░░░░░░░░░░░░░ p.259 (52%)

──── Check-in Feed ───────────────────
  @marcus  ·  p.259  ·  2h ago
  "THAT ENDING THOUGH 😭"   [spoiler: shows only if you're past p.259]

  @you  ·  p.214  ·  1d ago
  "The sympathy lecture is beautiful"

  @aisha  ·  p.187  ·  1d ago
  "Loving the lore so far"

  [+ Log my progress]

──── Page Notes ──────────────────────
  @marcus left a note at p.244  [🔒 Read to p.244 to see this]
  @you left a note at p.198     [Click to expand]

  [+ Add a page note]
```

**Page Notes:** Stored in `page_notes` table. A note at page X is only shown to participants who have a check-in at page ≥ X. This prevents spoilers.

**API:**
- `POST /api/reading-together` — creates a shared read `{ book_id, invitees, start_date, is_open_read }`
- `GET /api/reading-together/[id]` — returns room data with participants + check-ins
- `POST /api/reading-together/[id]/checkin` — posts a check-in visible to the group
- `POST /api/reading-together/[id]/page-notes` — creates a page note `{ page, note }`
- `GET /api/reading-together/[id]/page-notes?my_page=` — returns notes visible to the caller at their current page

**Dashboard widget:** "Reading with others" section showing active buddy reads.

---

### 8.2 Open Reads (Readalongs)

**What it is:** A public version of a buddy read — any user can join. Organised by the creator who sets milestones (read to page X by date Y).

**Schema:** `shared_reads` where `is_open_read = true`. Uses the same `shared_read_participants` and `page_notes` tables. Add `shared_read_milestones` if milestones are needed (add to a future migration if needed — Phase 8.2 can be simplified to just open-join buddy reads without milestones for v1).

**Creating an Open Read:**

Same flow as buddy read but with "Open Read (anyone can join)" toggle ON. Generates a shareable link `/reading-together/[id]?join=true`.

**Open Reads discovery:** Add a section on `/discover` called "Join a Read-Along" showing active Open Reads with available spots.

---

### 8.3 Reading Circles (Book Clubs)

**What it is:** Named groups of 2–50 people who read and discuss books together, with polls, scheduled meetings, and threaded discussion.

**Schema:** `reading_circles`, `circle_members`, `circle_meetings`, `circle_discussion_posts`, `circle_polls`, `circle_poll_options`, `circle_poll_votes` (all in migration).

**Route: `/circles`**

```
Reading Circles

[+ Create a Circle]

My Circles
┌────────────────────────────────────┐
│ 📚 The Sunday Page-Turners        │
│ 8 members · Currently: Piranesi   │
│ [Enter →]                          │
└────────────────────────────────────┘

Discover Circles  [Browse public circles]
```

**Route: `/circles/new`**

Form:
```
Circle name:  [____________________]
Description:  [____________________]
Privacy:      [🔒 Private]  [🌐 Public]
[Create Circle]
```

**Route: `/circles/[id]`**

Three-tab layout: **Discussion** · **Polls** · **Meetings**

**Discussion tab:**
```
Currently reading: Piranesi by Susanna Clarke  [Change]

──────────────────────────────────────────────
@aisha  ·  3h ago
"The world building in this is absolutely stunning.
 I'm completely lost in it."

  @marcus  ·  2h ago
  "@aisha same! The way the statues are described..."

  @you  ·  1h ago
  "Has anyone noticed the mirrors? I have a theory..."

[Reply ...]

──────────────────────────────────────────────
[+ New post]
```

Posts support nested replies (1 level deep). No character limit.

**Polls tab:**
```
Active Polls

──────────────────────────────────────────────
What should we read next?
                                       Votes
  ○ The Bear and the Nightingale       12
  ● Jonathan Strange & Mr Norrell       9   ← you voted
  ○ The House in the Cerulean Sea       7
  ○ Piranesi                            4
                                 32 total

Ends in 3 days  [Close poll early]

──────────────────────────────────────────────
[+ Create a poll]
```

**Meetings tab:**
```
Upcoming Meetings

──────────────────────────────────────────────
Virtual Catch-up
March 15, 7:00 PM
Meeting link: zoom.us/j/...
Reading to: Chapter 12

[RSVP: Going · Maybe · Can't make it]
Attending: @aisha @marcus @priya (+2)

──────────────────────────────────────────────
[+ Schedule a meeting]
```

Meeting form: title, date/time, optional link, optional "read to page X" milestone.

**API:**
- `GET /api/circles` — user's circles
- `POST /api/circles` — create circle
- `GET /api/circles/[id]` — circle detail
- `PATCH /api/circles/[id]` — update current book, settings
- `POST /api/circles/[id]/members` — invite member by username
- `DELETE /api/circles/[id]/members/[userId]` — remove member / leave
- `GET /api/circles/[id]/posts` — discussion posts (paginated)
- `POST /api/circles/[id]/posts` — create post `{ content, parent_id? }`
- `DELETE /api/circles/[id]/posts/[postId]` — delete post (author or admin)
- `POST /api/circles/[id]/polls` — create poll `{ question, options[], ends_at }`
- `POST /api/circles/[id]/polls/[pollId]/vote` — cast/change vote `{ option_id }`
- `PATCH /api/circles/[id]/polls/[pollId]` — close poll (admin)
- `GET /api/circles/[id]/meetings` — list meetings
- `POST /api/circles/[id]/meetings` — schedule meeting
- `PATCH /api/circles/[id]/meetings/[meetingId]/rsvp` — set RSVP `{ status: 'going'|'maybe'|'no' }`

---

### 8.4 Reading Quests (Challenges)

**What it is:** Themed reading challenges with a list of books to complete. Users join quests and track progress. Quests can be public (join-able by anyone) or private (for a circle).

**Schema:** `reading_quests`, `quest_books`, `quest_participants`, `quest_participant_books` (all in migration).

**Route: `/quests`**

```
Reading Quests

[+ Create a Quest]

Active Quests

┌───────────────────────────────────────────────────┐
│ 🏆 Around the World in 12 Books                  │
│ Read a book set in 12 different countries         │
│ 847 participants  ·  Ends Dec 31                  │
│ Your progress: 3/12  ░░░░░░░░░░░░░░░ 25%          │
│                                               [→]  │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ 📚 The Classics Shelf                            │
│ Read 10 books published before 1950              │
│ 312 participants  ·  No end date                  │
│ Not joined yet                       [Join Quest]  │
└───────────────────────────────────────────────────┘
```

**Route: `/quests/new`**

Form:
```
Quest name:     [____________________]
Description:    [____________________]
End date:       [____] (optional)
Privacy:        [🌐 Public]  [🔒 Circle only]

Books for this quest:
  [+ Add book]  (search existing book catalogue)

[Create Quest]
```

**Route: `/quests/[id]`**

```
Around the World in 12 Books
847 participants  ·  Ends Dec 31

Your progress: 3 / 12 books
░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%

Books
  ✓ The Kite Runner          Afghanistan   [marked complete]
  ✓ Things Fall Apart        Nigeria       [marked complete]
  ✓ The Shadow of the Wind   Spain         [marked complete]
  ○ The God of Small Things  India         [mark complete]
  ○ Norwegian Wood           Japan         [mark complete]
  ... (7 more)

Leaderboard
  1. @bookworm_sarah    11/12 ████████████
  2. @readingwithkai    10/12 ███████████
  3. @you                3/12 ████
  ... 844 more
```

**API:**
- `GET /api/quests` — public quests + user's joined quests
- `POST /api/quests` — create quest
- `GET /api/quests/[id]` — quest detail with books and user's progress
- `POST /api/quests/[id]/join` — join quest
- `POST /api/quests/[id]/progress` — mark a quest book complete `{ quest_book_id }`
- `GET /api/quests/[id]/leaderboard` — returns top N participants ranked by completion

---

## Phase 9 — Advanced Features

### 9.1 Add Missing Books

**What it is:** If a user searches for a book and it's not in the BetterReads database, they can submit it manually. Submitted books get a status of `pending` until reviewed (or auto-approved if all required fields are provided).

**Schema:** Add `status text default 'active'` to `books` table, and `submitted_by uuid references users(id)` for attribution. Add a migration `003_add_missing_books.sql`.

**UI:** On the search results page (when no results found):

```
Can't find your book?

[+ Add it to BetterReads]
```

**Route: `/books/new`**

Form:
```
Title*:          [____________________]
Author(s)*:      [____________________ +add]
ISBN:            [____________________]
Published:       [____________________]
Pages:           [____]
Description:     [________________________]
Cover image URL: [____________________]
Genre:           [multi-select]

[Submit Book]
```

On submit:
1. Insert into `books` table with `status = 'active'` (auto-approve for now).
2. Immediately redirect to `/books/[newId]` so the user can add it to their library.

**API:** `POST /api/books` — creates a new book record. Validates required fields. Returns `{ book_id }`.

---

### 9.2 "Similar Books" on Book Detail Page

**What it is:** A "You might also like" section at the bottom of every book detail page, showing 6 similar books.

**Algorithm:**
1. Find books sharing ≥ 2 genres with this book.
2. Sort by average rating descending.
3. Exclude the current book and any book already in the user's library.
4. Limit 6.

**Component: `<SimilarBooks bookId={bookId} userId={userId} />`**

```
You Might Also Like

[Horizontal scroll of book covers with title/author beneath]
```

Server component — fetch in the book detail page's async component. No separate API needed.

---

### 9.3 Notifications

**What it is:** In-app notifications for social events: circle invites, buddy read invites, quest completions, etc.

**Schema:** Add `notifications` table in a future migration `003_notifications.sql`:
```sql
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null, -- 'circle_invite' | 'buddy_read_invite' | 'quest_complete' | 'new_member'
  title text not null,
  body text,
  link text, -- relative URL to navigate to
  read_at timestamptz,
  created_at timestamptz not null default now()
);
```

**UI:** Bell icon in the AppNav (`<AppNavNotifications />`). Shows unread count badge. On click, opens a dropdown list of recent notifications.

**API:**
- `GET /api/notifications` — returns latest 20 notifications + unread count
- `PATCH /api/notifications/[id]/read` — marks a notification as read
- `POST /api/notifications/read-all` — marks all as read

---

### 9.4 Reading Preferences — "What to Tell Me"

**Settings section: "What to Tell Me"**

Controls what recommendations and prompts BetterReads surfaces:

```
What to Tell Me

[x] Show "What's Next?" recommendations
[x] Remind me about books On Hold after 30 days
[x] Show trending books in my favourite genres
[ ] Show popular books outside my usual genres  (discover something new)
[x] Notify me when someone joins my Reading Quest
[x] Notify me of new posts in my Reading Circles
```

Store as JSONB column `notification_preferences` on `users` table, added in migration `003`.

---

## Implementation Notes for Claude Code

### New TypeScript Types (add to `src/types/database.ts`)

```typescript
// Extended user_books columns
export type UserBookRow = {
  // ... existing fields ...
  extended_status: 'on_hold' | 'left_behind' | 'on_my_shelf' | 'loved' | null;
  is_loved: boolean;
  is_owned: boolean;
  format: 'physical' | 'ebook' | 'audiobook' | 'arc' | null;
  dnf_page: number | null;
  // rating changes from number to number (but now supports decimals — no TS change needed)
};

export type Vibe = {
  id: string;
  name: string;
  slug: string;
};

export type BookVibe = {
  id: string;
  book_id: string;
  vibe_id: string;
  user_id: string;
  created_at: string;
};

export type ContentWarningType = {
  id: string;
  name: string;
  category: string | null;
  slug: string;
};

export type BookContentWarning = {
  id: string;
  book_id: string;
  warning_type_id: string;
  severity: 'a_lot' | 'some' | 'briefly';
  user_id: string;
  created_at: string;
};

export type CheckIn = {
  id: string;
  user_id: string;
  book_id: string;
  page: number | null;
  percent: number | null;
  note: string | null;
  is_public: boolean;
  created_at: string;
};

export type Label = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type ReadingCircle = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_by: string;
  current_book_id: string | null;
  created_at: string;
};

export type CircleMember = {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
};

export type ReadingQuest = {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  is_public: boolean;
  ends_at: string | null;
  created_at: string;
};

export type SharedRead = {
  id: string;
  book_id: string;
  created_by: string;
  is_open_read: boolean;
  start_date: string | null;
  created_at: string;
};

export type PageNote = {
  id: string;
  shared_read_id: string;
  user_id: string;
  page: number;
  note: string;
  created_at: string;
};
```

### File & Folder Structure for New Features

```
src/
  app/
    (app)/
      stats/
        page.tsx                    — Your Reading Story
      discover/
        page.tsx                    — What's Next? + Find a Book
        find/
          page.tsx                  — Advanced search
      checkins/
        page.tsx                    — Check-in history feed
      circles/
        page.tsx                    — Circles index
        new/
          page.tsx                  — Create circle form
        [id]/
          page.tsx                  — Circle room (tabs)
          discussion-tab.tsx
          polls-tab.tsx
          meetings-tab.tsx
      quests/
        page.tsx                    — Quests index
        new/
          page.tsx                  — Create quest form
        [id]/
          page.tsx                  — Quest detail
      reading-together/
        [id]/
          page.tsx                  — Buddy read room
      books/
        new/
          page.tsx                  — Add missing book form
      onboarding/
        page.tsx                    — Reading preferences survey
    api/
      books/
        [id]/
          vibes/
            route.ts
          tempo/
            route.ts
          heads-up/
            route.ts
      checkins/
        route.ts
        [id]/
          route.ts
      labels/
        route.ts
        [id]/
          books/
            route.ts
      reading-together/
        route.ts
        [id]/
          route.ts
          checkin/
            route.ts
          page-notes/
            route.ts
      circles/
        route.ts
        [id]/
          route.ts
          members/
            route.ts
          posts/
            route.ts
            [postId]/
              route.ts
          polls/
            route.ts
            [pollId]/
              vote/
                route.ts
          meetings/
            route.ts
            [meetingId]/
              rsvp/
                route.ts
      quests/
        route.ts
        [id]/
          route.ts
          join/
            route.ts
          progress/
            route.ts
          leaderboard/
            route.ts
      discover/
        route.ts
      streak/
        route.ts
      export/
        route.ts
      settings/
        comfort-zone/
          route.ts
  components/
    vibes/
      VibeCloud.tsx
      VibePicker.tsx
    checkins/
      CheckInButton.tsx
      CheckInFeed.tsx
    labels/
      LabelPicker.tsx
    heads-up/
      HeadsUp.tsx
      ComfortZoneSettings.tsx
    stats/
      ReadingHeatmap.tsx
      GenreChart.tsx
      RatingChart.tsx
    reading-together/
      BuddyReadCard.tsx
      PageNoteFeed.tsx
    circles/
      CircleCard.tsx
      PollCard.tsx
      MeetingCard.tsx
    quests/
      QuestCard.tsx
      QuestProgress.tsx
```

### Build Order Within Each Phase

Build features in this order to minimise blockers:

**Phase 6:**
1. Extended statuses + Loved (library-actions.tsx changes) — 30 min
2. Quarter-star rating component — 1h
3. Format picker — 30 min
4. Labels (picker + API) — 2h
5. Public/private collections + profile display — 1h
6. Data export API — 30 min
7. Backdate auto-fill — 15 min

**Phase 7:**
1. Vibes (API + VibeCloud component) — 2h
2. Tempo + Plot/Character pickers — 1h
3. Heads Up (component + settings) — 3h
4. Check-ins (modal + feed) — 2h
5. Margin Notes (reuse check-in API) — 1h
6. Reading Streak (update logic + dashboard widget) — 1.5h
7. Reading Preferences / Onboarding survey — 2h
8. Discover page ("What's Next?") — 2.5h
9. Advanced Find a Book search filters — 2h
10. Your Reading Story stats page — 3h

**Phase 8:**
1. Reading Together (buddy reads, core flow) — 4h
2. Page Notes (spoiler-safe) — 2h
3. Open Reads (public join link) — 1h
4. Reading Circles (full feature) — 6h
5. Reading Quests (full feature) — 4h

**Phase 9:**
1. Add Missing Books form + API — 2h
2. Similar Books component — 1h
3. Notifications system — 3h
4. "What to Tell Me" settings — 1h

---

## Naming Conventions (from BRAND_LANGUAGE.md)

Always use these names in UI copy, never their StoryGraph equivalents:

| Feature | BetterReads name | NOT |
|---|---|---|
| Mood tags | Vibes | Moods |
| Progress log | Check-in | Update |
| Journal entry | Margin Note | Review / Journal |
| Content warnings | Heads Up | Trigger warnings |
| Severity: lots | A lot | Major |
| Severity: mild | Briefly mentioned | Minor |
| Buddy read | Reading Together | Buddy read |
| Public buddy read | Open Read | Read-along |
| Book club | Reading Circle | Book club |
| Challenge | Reading Quest | Challenge / Reading challenge |
| Recommendations | What's Next? | For You / Recommendations |
| Advanced search | Find a Book | Search |
| Book pace | Tempo | Pace |
| Fast pace | Page-Turner | Fast-paced |
| Reading habit tracker | Reading Streak | Streak |
| Reading log | Your Reading Story | Stats |
| Personal genre tags | Labels | Tags |
| Want to read | Up Next | Want to Read |
| Currently reading | Reading Now | Currently Reading |
| DNF / abandoned | Left Behind | DNF |
| On hold | On Hold | Paused |
| Physical ownership | On My Shelf | Owned |

---

*End of FEATURES_SPEC.md — Phases 6–9 fully specified.*
*Schema: `supabase/migrations/002_features.sql`*
*Brand language: `BRAND_LANGUAGE.md`*
*Design system: `DESIGN_BRIEF.md`*
