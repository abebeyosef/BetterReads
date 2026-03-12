# TheStoryGraph Feature Map for BetterReads

A complete breakdown of every TheStoryGraph feature, how it works,
and what it would take to build it in BetterReads.

Complexity key: 🟢 Easy  🟡 Medium  🔴 Hard  ⭐ Premium/monetisable

---

## 1. Library & Book Status

### Current BetterReads status: Partially built (Read, Currently Reading, Want to Read)

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Paused** | A fourth shelf status. Paused books are collapsed under Currently Reading. Paused periods excluded from average reading-time stats. Can backdate the pause, add a private journal note about why. | 🟢 |
| **Did Not Finish (DNF)** | Built-in status (not a custom shelf). Tracks pages read at point of abandonment. Appears in a separate filterable view on the profile. | 🟢 |
| **Owned books** | One-click "Owned" flag on any book. Separate from reading status — you can own an unread book, a read book, etc. Used for stats comparison (TBR vs Owned). | 🟢 |
| **Favourites shelf** | A dedicated "Favourites" shelf, separate from ratings. Add from book page or a search bar. Displayed prominently on profile. | 🟢 |
| **Not a book** | Flag for articles, essays, other non-book content. Excluded from book-count stats but can appear in reading log. | 🟡 |

---

## 2. Rating, Review & Book Metadata

### Current BetterReads status: Basic star rating + review

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Quarter-star ratings** | Rating slider supports 0.25 increments (0.25 → 5.0). Stored as decimal. | 🟢 |
| **Mood tags** | Multi-select from a fixed vocabulary: adventurous, challenging, dark, emotional, funny, hopeful, informative, inspiring, lighthearted, mysterious, reflective, relaxing, sad, tense, uplifting, whimsical. User votes on which moods apply to a book; aggregate shown as a pie chart on the book page. | 🟡 |
| **Pacing tags** | User votes: slow / medium / fast. Aggregate shown on book page. | 🟢 |
| **Plot-driven vs character-driven** | Binary toggle the reader votes on after finishing. | 🟢 |
| **Character descriptors** | Checkboxes: strong character development / loveable characters / diverse cast / flawed main character. Community-voted, shown on book page. | 🟡 |
| **Themes, tropes & topics** | Free-text tags plus a curated vocabulary. Users add after reading. Searchable/filterable. | 🟡 |
| **Content warnings** | Three-tier system: graphic / moderate / minor. Community-submitted + author-approved (two separate sections). Users can set personal flags in preferences — book pages show a ⚠️ icon if they match. | 🔴 |
| **Multiple formats** | Separate editions per book: print / ebook / audiobook / hardback. Progress tracked per format. Audiobook: track by time (auto-converts to pages). | 🔴 |
| **Add missing books/editions** | Users can submit new books or new editions directly to the shared database. Moderation queue. | 🔴 |

---

## 3. Progress Tracking

### Current BetterReads status: Date started/finished only

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Page-by-page progress updates** | Log current page or % complete at any time. Each update is timestamped. Shown as a timeline on the book page. | 🟡 |
| **Progress notes / reading journal** | Each progress update can have a private rich-text note (formatting + links). Notes can contain quotes, reflections, content warnings to remember. Aggregated into a private "reading journal" view showing all notes across all books. | 🟡 |
| **Audiobook time tracking** | Log by minutes/hours instead of pages. Platform converts to page-equivalent for stats. | 🟡 |
| **Backdate progress & dates** | Any progress update or start/finish date can be set to a past date. | 🟢 |
| **Reading streak** | Opt-in daily streak counter. Default: 1 page per day. Customisable: pages required, minutes required, interval (daily up to weekly). Resets to 0 if the goal isn't met. Shown on dashboard. | 🟡 |

---

## 4. Statistics & Analytics

### Current BetterReads status: Books per year, basic genre/rating charts

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Mood breakdown chart** | Pie chart showing distribution of mood tags across read books. | 🟢 |
| **Pace breakdown chart** | Bar/pie chart: slow / medium / fast split. | 🟢 |
| **Format breakdown chart** | How many books read as print / ebook / audiobook. | 🟢 |
| **Average rating by book type** | Average rating split by fiction/nonfiction, genre, format. | 🟡 |
| **Pages read over time** | Total pages and/or minutes read per month/year. | 🟡 |
| **Reading time stats** | Average days per book, average reading speed (pages/day), longest streak. | 🟡 |
| **Filter stats by time period** | Custom date range picker to scope any stat to a specific window. | 🟡 |
| **Filter stats by fiction/nonfiction** | Toggle to split any stat by fiction vs nonfiction. | 🟢 |
| **Filter stats by custom tag** | Scope any stat to books with a specific tag (e.g. "re-reads"). | 🟡 |
| **Compare two segments** ⭐ | Side-by-side comparison: any two time periods, TBR vs Owned, two genres, etc. | 🔴 |
| **Custom charts** ⭐ | User-created pie or bar chart. Choose data source (custom tag, genre, length range), customise colours and labels. | 🔴 |

---

## 5. Recommendations & Discovery

### Current BetterReads status: Basic genre suggestions (Phase 2)

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Onboarding preferences survey** | One-time survey on sign-up: select preferred moods (from 18 options), paces (5 options), and length preferences. Feeds the recommendation model. | 🟡 |
| **Personalised "bookstore"** | A /discover or /for-you page with curated shelves: Based on Your Recent Reads / Genre Picks / What Similar Readers Loved / Out of Your Comfort Zone / Mood-specific shelves. | 🔴 |
| **"Pick for me" feature** | One-click recommendation from your TBR based on your current mood. User selects mood; app picks the best-matching unread book from their list. | 🟡 |
| **Advanced search** | Filter books by: genre, mood, pace, length (page range), themes/tropes, content warning presence/absence, fiction/nonfiction, format available. Multiple filters combined. | 🔴 |
| **"Similar to this book"** | On any book page, a "Readers also enjoyed" / "Similar books" section. Based on mood/pace/genre overlap. | 🟡 |
| **Personalised AI summary** | For recommended books: a short AI-generated personalised explanation of why the book was suggested based on your history. | 🔴 |

---

## 6. Reading Goals & Challenges

### Current BetterReads status: Annual reading goal (count of books)

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Community reading challenges** | Public challenges created by any user. Two types: (1) Book challenge — a set list of specific books; (2) Number challenge — read N books matching certain criteria (e.g. "5 books with diverse casts"). Anyone can join. Progress tracked per participant. | 🔴 |
| **Create your own challenge** | Host creates a challenge, sets rules (book list or criteria), sets a time window. Other users can join and their progress is tracked against the challenge. | 🔴 |
| **Challenge leaderboard / progress view** | Participants can see each other's progress within the challenge. | 🟡 |

---

## 7. Social Features

### Current BetterReads status: Follow system + activity feed (Phase 3)

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Buddy reads** | 2–15 people agree to read the same book together. Participants leave comments tied to specific page numbers. Comments from readers ahead of you are hidden (spoiler protection) until you reach that page. Optional end date. | 🔴 |
| **Readalongs** | Like a buddy read but public, up to 1,000 participants. Set start/end dates. Comments are still page-locked (spoiler-safe). Anyone can join from the Community page. Filterable by mood/pace/genre. | 🔴 |
| **Book clubs** | Groups with: member management, a schedule of meetings, voting polls for book picks, buddy reads/readalongs created within the club context, meeting agenda builder, question bank for discussion, progress-vs-meeting-date tracking for members, in-app meeting reminders. | 🔴 |
| **Page-specific live reactions** | While reading, add a reaction or comment at a specific page. Other readers see it only when they reach that page. Creates a sense of "reading together" even asynchronously. | 🔴 |
| **Public profiles** | Each user has a profile showing: currently reading, recent reads, stats summary, favourite books, reviews, lists. Follows/followers count. | 🟡 |
| **Friend activity feed** | Feed of what people you follow are reading, finishing, reviewing, and rating. Already partially built. | 🟡 |

---

## 8. Custom Lists & Organisation

### Current BetterReads status: Basic lists (Phase 3)

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Public/private lists** | Toggle any list between public (visible on profile, shareable via link) and private. | 🟢 |
| **Custom tags** | Add freeform tags to any book in your library. Tags are personal (not shared). Used for filtering, stats, and custom challenges. Examples: "re-read", "owned", "signed copy", "book club pick". | 🟡 |
| **Filter/search TBR by tag** | On the To-Read page, filter and search by custom tags, genre, mood, pace. | 🟡 |
| **Share lists publicly** | Lists get a public shareable URL. Visitors can see the books and add them to their own library. | 🟢 |

---

## 9. Import / Export

### Current BetterReads status: Goodreads CSV import built

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Barcode scanner** | Mobile camera scans a book's barcode (ISBN) and instantly adds it to the library as Owned. | 🔴 (mobile only) |
| **Import from Goodreads** | Already built. Custom Goodreads shelves map to BetterReads custom tags. | ✅ Done |
| **Export data** | Export your full library as CSV or JSON. GDPR compliance. | 🟡 |

---

## 10. Premium / Monetisation (StoryGraph Plus model)

StoryGraph charges ~$50/year for Plus. These are the features behind the paywall:

| Feature | Notes |
|---------|-------|
| **Custom charts** | User-created pie/bar charts with custom colours |
| **Stats segment comparison** | Compare any two library subsets side by side |
| **Extra stats filters** | Custom time periods, fiction/nonfiction split, tags, mood, genre |
| **Roadmap voting** | Vote and comment on upcoming features |
| **Priority support** | Support tickets handled first |
| **30-day free trial** | No payment details required |

---

## 11. Notifications & Reminders

| Feature | How it works on StoryGraph | Complexity |
|---------|---------------------------|------------|
| **Book club meeting reminders** | In-app notification when a book club meeting is approaching. | 🟡 |
| **Reading streak reminder** | Optional daily reminder to log reading progress. | 🟡 |
| **Challenge deadline reminder** | Notification when a reading challenge end date is approaching. | 🟡 |

---

## Suggested build order for BetterReads

### Phase 6 — Quick wins (all 🟢)
- Paused book status
- DNF status
- Owned flag
- Favourites shelf
- Quarter-star ratings
- Pacing tags (slow/medium/fast)
- Plot-driven vs character-driven flag
- Public/private lists toggle
- Export data (CSV)
- Backdate progress & dates

### Phase 7 — Core enrichment (🟡)
- Page-by-page progress tracking
- Private reading journal notes (per progress update)
- Reading streak with customisation
- Mood tags on books (multi-select, aggregated display)
- Character descriptor votes
- Themes/tropes/topics tags
- Stats: mood breakdown, pace breakdown, format breakdown
- Stats: filter by time period, fiction/nonfiction, tag
- Onboarding preferences survey
- "Pick for me" from TBR
- "Similar books" on book page
- Custom tags on library books
- Filter/search TBR by tag
- Public profiles polish
- Notifications (streak, club meetings)

### Phase 8 — Social depth (🔴)
- Content warnings system (community + author-approved + personal flags)
- Buddy reads with page-locked comments
- Readalongs (public, up to 1000 participants)
- Book clubs (full feature set)
- Community reading challenges (create + join)
- Advanced search with multi-filter

### Phase 9 — Advanced (🔴 + ⭐)
- Personalised bookstore / For You page with ML recommendations
- Multiple editions / formats per book
- Custom charts (Premium)
- Stats comparison (Premium)
- AI-generated personalised book summaries (Premium)
- Barcode scanner (mobile app required)
- Add missing books/editions workflow

---

## Notes

- TheStoryGraph has ~4 million users and ~$50/year premium tier
- Their key differentiators vs Goodreads: mood/pace metadata, content warnings,
  better stats, reading journal, spoiler-safe social reading, and no Amazon ownership
- BetterReads can match 80% of features within Phases 6–8
- The barcode scanner requires a native mobile app (React Native or Capacitor wrapper)
- The ML recommendation engine (Phase 9) can be approximated with rule-based
  collaborative filtering initially, then upgraded to a proper model later
