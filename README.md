# Shelf

A modern, social book-tracking web app — Goodreads but better, inspired by Letterboxd.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), TypeScript
- **Styling:** Tailwind CSS + shadcn/ui (zinc base, dark mode default)
- **Backend/DB/Auth:** Supabase (Postgres + Auth + RLS + Storage)
- **Book Data:** Google Books API (primary) + Open Library (fallback)
- **Charts:** Recharts
- **Deployment:** Vercel

---

## ⚠️ IMPORTANT INSTRUCTIONS FOR CLAUDE CODE — READ BEFORE DOING ANYTHING ELSE

This project may be worked on across multiple separate sessions, potentially by different Claude Code instances. To ensure continuity, you **must** maintain a detailed progress log at all times.

### Mandatory logging rules

1. **Before starting any work**, read [`PROGRESS.md`](./PROGRESS.md) in full to understand what has already been done, any decisions that were made, and any known issues or blockers.

2. **After completing each task or sub-task**, immediately update `PROGRESS.md` with:
   - Mark the task as complete (with date)
   - What you built and the key files created or modified
   - Why you made any non-obvious decisions (e.g. why you chose one approach over another)
   - Any known limitations, shortcuts taken, or technical debt introduced
   - Anything a future Claude Code session must know before continuing

3. **If you are interrupted or stop mid-task**, update `PROGRESS.md` before stopping, noting exactly where you got to and what the next step is.

4. **Never assume the next session will have context from this one.** Write notes as if explaining to someone who has never seen this codebase.

5. **Commit `PROGRESS.md` with every git commit** — it should always be up to date in the repo.

The progress log is at [`PROGRESS.md`](./PROGRESS.md). If it does not exist, create it immediately before starting work.

---

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

See [`PROGRESS.md`](./PROGRESS.md) for the live status of every task.

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
