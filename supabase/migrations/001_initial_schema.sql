-- ============================================================
-- Shelf — Initial Database Schema
-- Run this in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type reading_status as enum ('want_to_read', 'currently_reading', 'read');
create type event_type as enum ('started_reading', 'finished_reading', 'reviewed', 'rated', 'added_to_library', 'created_list');
create type import_source as enum ('goodreads');
create type import_status as enum ('pending', 'processing', 'completed', 'failed');
create type import_row_status as enum ('pending', 'matched', 'unmatched', 'skipped');
create type match_method as enum ('isbn', 'title_author', 'manual');

-- ============================================================
-- TABLES
-- ============================================================

-- Users (extends Supabase auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  reading_goal_year int,
  reading_goal_count int,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Books (global, shared across all users)
create table public.books (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  description text,
  cover_url text, -- external URL only, never stored locally
  page_count int,
  published_date text,
  language text,
  isbn_10 text,
  isbn_13 text,
  google_books_id text unique,
  open_library_id text unique,
  genres text[],
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Authors
create table public.authors (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now() not null
);

-- Book ↔ Author join table
create table public.book_authors (
  book_id uuid references public.books(id) on delete cascade,
  author_id uuid references public.authors(id) on delete cascade,
  primary key (book_id, author_id)
);

-- User's personal book entries (status, dates, rating)
create table public.user_books (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status reading_status not null,
  rating smallint check (rating >= 1 and rating <= 5),
  date_started date,
  date_finished date,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, book_id)
);

-- Reviews
create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  user_book_id uuid references public.user_books(id) on delete set null,
  text text not null,
  is_private boolean default false not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  unique (user_id, book_id)
);

-- Activity feed events (append-only, denormalised)
create table public.activity_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  event_type event_type not null,
  book_id uuid references public.books(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz default now() not null
);

-- Follows
create table public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- Notifications
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid references public.users(id) on delete cascade not null,
  event_id uuid references public.activity_events(id) on delete cascade,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

-- Book Lists
create table public.lists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  is_public boolean default true not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- List ↔ Book join table
create table public.list_books (
  list_id uuid references public.lists(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  position int not null default 0,
  primary key (list_id, book_id)
);

-- Goodreads Import tracking
create table public.imports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  source import_source not null,
  status import_status default 'pending' not null,
  total_rows int,
  matched_rows int,
  unmatched_rows int,
  created_at timestamptz default now() not null,
  completed_at timestamptz
);

-- Individual rows from an import
create table public.import_rows (
  id uuid primary key default uuid_generate_v4(),
  import_id uuid references public.imports(id) on delete cascade not null,
  raw_data jsonb not null,
  matched_book_id uuid references public.books(id) on delete set null,
  match_method match_method,
  match_confidence float,
  status import_row_status default 'pending' not null
);

-- ============================================================
-- INDEXES
-- ============================================================

create index on public.user_books (user_id, status);
create index on public.user_books (user_id, date_finished);
create index on public.activity_events (created_at desc);
create index on public.activity_events (user_id, created_at desc);
create index on public.books (google_books_id);
create index on public.books (isbn_13);
create index on public.reviews (book_id, created_at desc);
create index on public.notifications (recipient_id, is_read);
create index on public.follows (following_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all user-facing tables
alter table public.users enable row level security;
alter table public.user_books enable row level security;
alter table public.reviews enable row level security;
alter table public.activity_events enable row level security;
alter table public.follows enable row level security;
alter table public.notifications enable row level security;
alter table public.lists enable row level security;
alter table public.list_books enable row level security;
alter table public.imports enable row level security;
alter table public.import_rows enable row level security;

-- Books and authors are global (readable by all authenticated users)
alter table public.books enable row level security;
alter table public.authors enable row level security;
alter table public.book_authors enable row level security;

-- books: anyone authenticated can read; inserts handled server-side
create policy "Books are publicly readable" on public.books for select using (auth.role() = 'authenticated');
create policy "Server can insert books" on public.books for insert with check (auth.role() = 'authenticated');

-- authors: readable by all
create policy "Authors are publicly readable" on public.authors for select using (auth.role() = 'authenticated');
create policy "Server can insert authors" on public.authors for insert with check (auth.role() = 'authenticated');

-- book_authors: readable by all
create policy "Book authors are publicly readable" on public.book_authors for select using (auth.role() = 'authenticated');
create policy "Server can insert book_authors" on public.book_authors for insert with check (auth.role() = 'authenticated');

-- users: own row only for writes; public profiles readable
create policy "Users can view all profiles" on public.users for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.users for insert with check (auth.uid() = id);

-- user_books: own data only
create policy "Users can manage own books" on public.user_books for all using (auth.uid() = user_id);

-- reviews: own writes, all reads (unless private)
create policy "Public reviews are viewable" on public.reviews for select using (auth.role() = 'authenticated' and (is_private = false or auth.uid() = user_id));
create policy "Users can manage own reviews" on public.reviews for all using (auth.uid() = user_id);

-- activity_events: readable by all authenticated; own inserts
create policy "Activity events are publicly readable" on public.activity_events for select using (auth.role() = 'authenticated');
create policy "Users can insert own events" on public.activity_events for insert with check (auth.uid() = user_id);

-- follows: readable by all; own writes
create policy "Follows are publicly readable" on public.follows for select using (auth.role() = 'authenticated');
create policy "Users can manage own follows" on public.follows for all using (auth.uid() = follower_id);

-- notifications: own only
create policy "Users can view own notifications" on public.notifications for select using (auth.uid() = recipient_id);
create policy "Users can update own notifications" on public.notifications for update using (auth.uid() = recipient_id);

-- lists: public lists readable by all; own writes
create policy "Public lists are viewable" on public.lists for select using (auth.role() = 'authenticated' and (is_public = true or auth.uid() = user_id));
create policy "Users can manage own lists" on public.lists for all using (auth.uid() = user_id);

-- list_books: follows list visibility
create policy "List books follow list visibility" on public.list_books for select using (
  exists (select 1 from public.lists where id = list_id and (is_public = true or user_id = auth.uid()))
);
create policy "List owners can manage list books" on public.list_books for all using (
  exists (select 1 from public.lists where id = list_id and user_id = auth.uid())
);

-- imports: own only
create policy "Users can manage own imports" on public.imports for all using (auth.uid() = user_id);
create policy "Users can manage own import rows" on public.import_rows for all using (
  exists (select 1 from public.imports where id = import_id and user_id = auth.uid())
);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users for each row execute function public.handle_updated_at();
create trigger books_updated_at before update on public.books for each row execute function public.handle_updated_at();
create trigger user_books_updated_at before update on public.user_books for each row execute function public.handle_updated_at();
create trigger reviews_updated_at before update on public.reviews for each row execute function public.handle_updated_at();
create trigger lists_updated_at before update on public.lists for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-create user profile on sign-up
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
