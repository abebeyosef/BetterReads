-- ============================================================
-- BetterReads — Features Migration
-- Adds all Phase 6–9 tables, columns, and enums
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ============================================================
-- EXTEND EXISTING ENUMS & COLUMNS
-- ============================================================

-- Extend reading_status to include on_hold and left_behind (DNF)
-- We add these as an extended_status column rather than changing the enum
-- so the core status enum stays clean for filtering (want_to_read / currently_reading / read)
alter table public.user_books
  add column if not exists extended_status text
    check (extended_status in ('on_hold', 'left_behind'))
    default null,
  add column if not exists is_owned boolean not null default false,
  add column if not exists is_loved boolean not null default false,
  add column if not exists format text
    check (format in ('print', 'ebook', 'audiobook', 'hardback', 'other'))
    default 'print',
  add column if not exists dnf_page int default null;  -- page stopped at for Left Behind

-- Upgrade rating from integer to decimal to support quarter-stars (0.25 increments)
-- First drop the existing constraint, alter the column, re-add constraint
alter table public.user_books drop constraint if exists user_books_rating_check;
alter table public.user_books alter column rating type numeric(3,2);
alter table public.user_books
  add constraint user_books_rating_check check (rating >= 0.25 and rating <= 5.0);

-- Add onboarding flag to users
alter table public.users
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists streak_goal_type text check (streak_goal_type in ('pages', 'minutes')) default 'pages',
  add column if not exists streak_goal_value int default 1;

-- ============================================================
-- VIBES (community mood tags on books)
-- ============================================================

-- Fixed vocabulary of vibes (seeded below)
create table if not exists public.vibes (
  id   text primary key,  -- e.g. 'cosy', 'dark', 'funny'
  label text not null,
  emoji text not null
);

-- Community votes: one row per user+book+vibe
create table if not exists public.book_vibes (
  book_id  uuid references public.books(id) on delete cascade,
  vibe_id  text references public.vibes(id) on delete cascade,
  user_id  uuid references public.users(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (book_id, vibe_id, user_id)
);

-- ============================================================
-- TEMPO (community pacing votes on books)
-- ============================================================

create table if not exists public.book_tempo_votes (
  book_id  uuid references public.books(id) on delete cascade,
  user_id  uuid references public.users(id) on delete cascade,
  tempo    text not null check (tempo in ('slow_burn', 'steady', 'page_turner')),
  created_at timestamptz default now() not null,
  primary key (book_id, user_id)
);

-- ============================================================
-- CHARACTER VOTES & TOPIC TAGS (community metadata on books)
-- ============================================================

-- Community votes on character descriptors (one row per user+book)
create table if not exists public.book_character_votes (
  book_id        uuid references public.books(id) on delete cascade,
  user_id        uuid references public.users(id) on delete cascade,
  character_driven   boolean,
  plot_driven        boolean,
  strong_development boolean,
  loveable_cast      boolean,
  diverse_voices     boolean,
  flawed_protagonist boolean,
  created_at timestamptz default now() not null,
  primary key (book_id, user_id)
);

-- User-submitted topic/trope/theme tags on books
create table if not exists public.book_topic_tags (
  id       uuid primary key default uuid_generate_v4(),
  book_id  uuid references public.books(id) on delete cascade not null,
  user_id  uuid references public.users(id) on delete cascade not null,
  tag      text not null,
  created_at timestamptz default now() not null,
  unique (book_id, user_id, tag)
);

-- ============================================================
-- HEADS UP — Content Warnings
-- ============================================================

-- Fixed vocabulary of content warning categories (seeded below)
create table if not exists public.content_warning_types (
  id    text primary key,  -- e.g. 'sexual_content', 'violence', 'suicide'
  label text not null,
  category text not null   -- e.g. 'Mental Health', 'Violence', 'Sexual Content', 'Other'
);

-- Community-reported warnings per book
create table if not exists public.book_content_warnings (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid references public.books(id) on delete cascade not null,
  cw_type_id      text references public.content_warning_types(id) on delete cascade not null,
  severity        text not null check (severity in ('a_lot', 'some', 'briefly')),
  user_id         uuid references public.users(id) on delete cascade not null,
  is_author_confirmed boolean not null default false,
  created_at timestamptz default now() not null,
  unique (book_id, cw_type_id, user_id)
);

-- Per-user comfort flags (triggers ⚠️ icon on books that match)
create table if not exists public.user_comfort_flags (
  user_id    uuid references public.users(id) on delete cascade,
  cw_type_id text references public.content_warning_types(id) on delete cascade,
  primary key (user_id, cw_type_id)
);

-- ============================================================
-- CHECK-INS & MARGIN NOTES (reading progress + journal)
-- ============================================================

create table if not exists public.check_ins (
  id           uuid primary key default uuid_generate_v4(),
  user_book_id uuid references public.user_books(id) on delete cascade not null,
  user_id      uuid references public.users(id) on delete cascade not null,
  book_id      uuid references public.books(id) on delete cascade not null,
  -- Progress can be logged as page number, percentage, or minutes
  progress_type text not null check (progress_type in ('page', 'percent', 'minutes')),
  progress_value numeric(7,2) not null,  -- page number, 0-100, or minutes
  -- Optional rich-text margin note attached to this check-in
  margin_note  text,   -- markdown/plain text, stored as-is
  liked_quote  text,   -- optional quoted passage
  created_at timestamptz default now() not null,
  -- Allow backdating
  reading_date date not null default current_date
);

create index if not exists check_ins_user_book_idx on public.check_ins (user_book_id, reading_date desc);
create index if not exists check_ins_user_idx on public.check_ins (user_id, reading_date desc);

-- ============================================================
-- READING STREAK
-- ============================================================

create table if not exists public.reading_streaks (
  user_id        uuid primary key references public.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  updated_at timestamptz default now() not null
);

-- ============================================================
-- LABELS (custom user tags on library books)
-- ============================================================

create table if not exists public.labels (
  id      uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name    text not null,
  color   text not null default '#9b8c6e',  -- hex colour
  created_at timestamptz default now() not null,
  unique (user_id, name)
);

create table if not exists public.user_book_labels (
  user_book_id uuid references public.user_books(id) on delete cascade,
  label_id     uuid references public.labels(id) on delete cascade,
  primary key (user_book_id, label_id)
);

-- ============================================================
-- READING PREFERENCES (onboarding survey)
-- ============================================================

create table if not exists public.user_reading_preferences (
  user_id           uuid primary key references public.users(id) on delete cascade,
  preferred_vibes   text[] not null default '{}',
  preferred_tempos  text[] not null default '{}',
  preferred_lengths text[] not null default '{}',  -- 'short' (<200), 'medium' (200-400), 'long' (>400)
  preferred_genres  text[] not null default '{}',
  disliked_genres   text[] not null default '{}',
  updated_at timestamptz default now() not null
);

-- ============================================================
-- READING TOGETHER & OPEN READS (buddy reads + public readalongs)
-- ============================================================

create table if not exists public.shared_reads (
  id              uuid primary key default uuid_generate_v4(),
  book_id         uuid references public.books(id) on delete cascade not null,
  host_user_id    uuid references public.users(id) on delete cascade not null,
  type            text not null check (type in ('reading_together', 'open_read')),
  title           text,
  description     text,
  start_date      date,
  end_date        date,
  max_participants int default 15,  -- 15 for reading_together, 1000 for open_read
  is_public       boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.shared_read_participants (
  shared_read_id  uuid references public.shared_reads(id) on delete cascade,
  user_id         uuid references public.users(id) on delete cascade,
  current_page    int default 0,
  joined_at timestamptz default now() not null,
  primary key (shared_read_id, user_id)
);

-- Page Notes: spoiler-safe comments tied to a specific page
-- Only visible to participants who have reached or passed that page
create table if not exists public.page_notes (
  id              uuid primary key default uuid_generate_v4(),
  shared_read_id  uuid references public.shared_reads(id) on delete cascade not null,
  user_id         uuid references public.users(id) on delete cascade not null,
  page_number     int not null,
  note            text not null,
  created_at timestamptz default now() not null
);

create index if not exists page_notes_shared_read_idx on public.page_notes (shared_read_id, page_number);

-- ============================================================
-- READING CIRCLES (book clubs)
-- ============================================================

create table if not exists public.reading_circles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  host_user_id uuid references public.users(id) on delete cascade not null,
  avatar_url  text,
  is_public   boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create table if not exists public.circle_members (
  circle_id  uuid references public.reading_circles(id) on delete cascade,
  user_id    uuid references public.users(id) on delete cascade,
  role       text not null check (role in ('host', 'member')) default 'member',
  joined_at timestamptz default now() not null,
  primary key (circle_id, user_id)
);

create table if not exists public.circle_meetings (
  id           uuid primary key default uuid_generate_v4(),
  circle_id    uuid references public.reading_circles(id) on delete cascade not null,
  book_id      uuid references public.books(id) on delete set null,
  meeting_date timestamptz not null,
  agenda       text,
  notes        text,  -- post-meeting notes, editable by any member
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Discussion board per book within a circle meeting
create table if not exists public.circle_discussion_posts (
  id          uuid primary key default uuid_generate_v4(),
  meeting_id  uuid references public.circle_meetings(id) on delete cascade not null,
  user_id     uuid references public.users(id) on delete cascade not null,
  content     text not null,
  created_at timestamptz default now() not null
);

-- "What are we reading?" — voting polls
create table if not exists public.circle_polls (
  id          uuid primary key default uuid_generate_v4(),
  circle_id   uuid references public.reading_circles(id) on delete cascade not null,
  question    text not null default 'What should we read next?',
  created_by  uuid references public.users(id) on delete cascade not null,
  closes_at   timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.circle_poll_options (
  id        uuid primary key default uuid_generate_v4(),
  poll_id   uuid references public.circle_polls(id) on delete cascade not null,
  book_id   uuid references public.books(id) on delete cascade,  -- null if free-text option
  label     text not null  -- book title or free-text option
);

create table if not exists public.circle_poll_votes (
  poll_id   uuid references public.circle_polls(id) on delete cascade,
  user_id   uuid references public.users(id) on delete cascade,
  option_id uuid references public.circle_poll_options(id) on delete cascade not null,
  primary key (poll_id, user_id)  -- one vote per person per poll
);

-- ============================================================
-- READING QUESTS (challenges)
-- ============================================================

create table if not exists public.reading_quests (
  id           uuid primary key default uuid_generate_v4(),
  creator_id   uuid references public.users(id) on delete cascade not null,
  title        text not null,
  description  text,
  type         text not null check (type in ('book_list', 'mission')),
  -- For 'mission' quests: the criteria JSON
  -- e.g. { "genre": "Fiction", "min_books": 5, "vibe": "cosy" }
  mission_rules jsonb default '{}',
  start_date   date,
  end_date     date,
  is_public    boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Books in a 'book_list' quest
create table if not exists public.quest_books (
  quest_id   uuid references public.reading_quests(id) on delete cascade,
  book_id    uuid references public.books(id) on delete cascade,
  position   int not null default 0,
  primary key (quest_id, book_id)
);

create table if not exists public.quest_participants (
  quest_id          uuid references public.reading_quests(id) on delete cascade,
  user_id           uuid references public.users(id) on delete cascade,
  books_completed   int not null default 0,
  joined_at timestamptz default now() not null,
  primary key (quest_id, user_id)
);

-- Which books a participant has completed within a quest
create table if not exists public.quest_participant_books (
  quest_id    uuid references public.reading_quests(id) on delete cascade,
  user_id     uuid references public.users(id) on delete cascade,
  book_id     uuid references public.books(id) on delete cascade,
  completed_at timestamptz default now() not null,
  primary key (quest_id, user_id, book_id)
);

-- ============================================================
-- INDEXES for new tables
-- ============================================================

create index if not exists book_vibes_book_idx on public.book_vibes (book_id);
create index if not exists book_tempo_book_idx on public.book_tempo_votes (book_id);
create index if not exists book_topic_tags_book_idx on public.book_topic_tags (book_id);
create index if not exists book_cw_book_idx on public.book_content_warnings (book_id);
create index if not exists user_book_labels_book_idx on public.user_book_labels (user_book_id);
create index if not exists shared_reads_book_idx on public.shared_reads (book_id);
create index if not exists shared_reads_public_idx on public.shared_reads (is_public, type);
create index if not exists reading_circles_public_idx on public.reading_circles (is_public);
create index if not exists quest_public_idx on public.reading_quests (is_public, type);

-- ============================================================
-- ROW LEVEL SECURITY for new tables
-- ============================================================

alter table public.vibes enable row level security;
alter table public.book_vibes enable row level security;
alter table public.book_tempo_votes enable row level security;
alter table public.book_character_votes enable row level security;
alter table public.book_topic_tags enable row level security;
alter table public.content_warning_types enable row level security;
alter table public.book_content_warnings enable row level security;
alter table public.user_comfort_flags enable row level security;
alter table public.check_ins enable row level security;
alter table public.reading_streaks enable row level security;
alter table public.labels enable row level security;
alter table public.user_book_labels enable row level security;
alter table public.user_reading_preferences enable row level security;
alter table public.shared_reads enable row level security;
alter table public.shared_read_participants enable row level security;
alter table public.page_notes enable row level security;
alter table public.reading_circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.circle_meetings enable row level security;
alter table public.circle_discussion_posts enable row level security;
alter table public.circle_polls enable row level security;
alter table public.circle_poll_options enable row level security;
alter table public.circle_poll_votes enable row level security;
alter table public.reading_quests enable row level security;
alter table public.quest_books enable row level security;
alter table public.quest_participants enable row level security;
alter table public.quest_participant_books enable row level security;

-- Global read-only vocabulary tables
create policy "Vibes are publicly readable" on public.vibes for select using (auth.role() = 'authenticated');
create policy "CW types are publicly readable" on public.content_warning_types for select using (auth.role() = 'authenticated');

-- Community metadata on books: anyone authenticated can read and insert
create policy "Book vibes readable" on public.book_vibes for select using (auth.role() = 'authenticated');
create policy "Book vibes insertable" on public.book_vibes for insert with check (auth.uid() = user_id);
create policy "Book vibes deletable by owner" on public.book_vibes for delete using (auth.uid() = user_id);

create policy "Book tempo readable" on public.book_tempo_votes for select using (auth.role() = 'authenticated');
create policy "Book tempo insertable" on public.book_tempo_votes for all using (auth.uid() = user_id);

create policy "Book character votes readable" on public.book_character_votes for select using (auth.role() = 'authenticated');
create policy "Book character votes by owner" on public.book_character_votes for all using (auth.uid() = user_id);

create policy "Book topic tags readable" on public.book_topic_tags for select using (auth.role() = 'authenticated');
create policy "Book topic tags by owner" on public.book_topic_tags for all using (auth.uid() = user_id);

create policy "CW entries readable" on public.book_content_warnings for select using (auth.role() = 'authenticated');
create policy "CW entries by owner" on public.book_content_warnings for all using (auth.uid() = user_id);

create policy "Comfort flags own only" on public.user_comfort_flags for all using (auth.uid() = user_id);

create policy "Check-ins own only" on public.check_ins for all using (auth.uid() = user_id);

create policy "Streaks own only" on public.reading_streaks for all using (auth.uid() = user_id);

create policy "Labels own only" on public.labels for all using (auth.uid() = user_id);
create policy "User book labels own only" on public.user_book_labels for all using (
  exists (select 1 from public.user_books where id = user_book_id and user_id = auth.uid())
);

create policy "Preferences own only" on public.user_reading_preferences for all using (auth.uid() = user_id);

-- Shared reads: public ones visible to all; private only to participants
create policy "Public shared reads visible" on public.shared_reads for select using (
  auth.role() = 'authenticated' and (is_public = true or host_user_id = auth.uid() or
    exists (select 1 from public.shared_read_participants where shared_read_id = id and user_id = auth.uid()))
);
create policy "Host manages shared reads" on public.shared_reads for all using (auth.uid() = host_user_id);

create policy "Participants visible to members" on public.shared_read_participants for select using (
  exists (select 1 from public.shared_reads sr where sr.id = shared_read_id and
    (sr.is_public = true or sr.host_user_id = auth.uid() or
      exists (select 1 from public.shared_read_participants p2 where p2.shared_read_id = shared_read_id and p2.user_id = auth.uid())))
);
create policy "Users manage own participation" on public.shared_read_participants for all using (auth.uid() = user_id);

-- Page notes: visible only if you've reached that page
create policy "Page notes visible to those who reached that page" on public.page_notes for select using (
  exists (
    select 1 from public.shared_read_participants p
    where p.shared_read_id = page_notes.shared_read_id
      and p.user_id = auth.uid()
      and p.current_page >= page_notes.page_number
  )
);
create policy "Users manage own page notes" on public.page_notes for all using (auth.uid() = user_id);

-- Reading Circles
create policy "Public circles visible" on public.reading_circles for select using (
  auth.role() = 'authenticated' and (is_public = true or host_user_id = auth.uid() or
    exists (select 1 from public.circle_members where circle_id = id and user_id = auth.uid()))
);
create policy "Host manages circle" on public.reading_circles for all using (auth.uid() = host_user_id);

create policy "Circle members visible to circle members" on public.circle_members for select using (
  exists (select 1 from public.circle_members cm2 where cm2.circle_id = circle_id and cm2.user_id = auth.uid())
  or exists (select 1 from public.reading_circles rc where rc.id = circle_id and rc.is_public = true)
);
create policy "Users manage own membership" on public.circle_members for all using (auth.uid() = user_id);

create policy "Meetings visible to circle members" on public.circle_meetings for select using (
  exists (select 1 from public.circle_members where circle_id = circle_meetings.circle_id and user_id = auth.uid())
);
create policy "Members can manage meetings" on public.circle_meetings for all using (
  exists (select 1 from public.circle_members where circle_id = circle_meetings.circle_id and user_id = auth.uid())
);

create policy "Discussion visible to members" on public.circle_discussion_posts for select using (
  exists (select 1 from public.circle_members cm
    join public.circle_meetings mt on mt.circle_id = cm.circle_id
    where mt.id = meeting_id and cm.user_id = auth.uid())
);
create policy "Members can post to discussion" on public.circle_discussion_posts for all using (auth.uid() = user_id);

create policy "Polls visible to members" on public.circle_polls for select using (
  exists (select 1 from public.circle_members where circle_id = circle_polls.circle_id and user_id = auth.uid())
);
create policy "Members can create polls" on public.circle_polls for insert with check (
  auth.uid() = created_by and
  exists (select 1 from public.circle_members where circle_id = circle_polls.circle_id and user_id = auth.uid())
);
create policy "Poll options visible to members" on public.circle_poll_options for select using (
  exists (select 1 from public.circle_polls cp
    join public.circle_members cm on cm.circle_id = cp.circle_id
    where cp.id = poll_id and cm.user_id = auth.uid())
);
create policy "Poll options insertable by poll creator" on public.circle_poll_options for insert with check (
  exists (select 1 from public.circle_polls where id = poll_id and created_by = auth.uid())
);
create policy "Poll votes visible to members" on public.circle_poll_votes for select using (
  exists (select 1 from public.circle_polls cp
    join public.circle_members cm on cm.circle_id = cp.circle_id
    where cp.id = poll_id and cm.user_id = auth.uid())
);
create policy "Users manage own votes" on public.circle_poll_votes for all using (auth.uid() = user_id);

-- Reading Quests
create policy "Public quests visible" on public.reading_quests for select using (
  auth.role() = 'authenticated' and (is_public = true or creator_id = auth.uid() or
    exists (select 1 from public.quest_participants where quest_id = id and user_id = auth.uid()))
);
create policy "Creator manages quest" on public.reading_quests for all using (auth.uid() = creator_id);

create policy "Quest books visible" on public.quest_books for select using (
  exists (select 1 from public.reading_quests where id = quest_id and (is_public = true or creator_id = auth.uid()))
);
create policy "Creator manages quest books" on public.quest_books for all using (
  exists (select 1 from public.reading_quests where id = quest_id and creator_id = auth.uid())
);

create policy "Quest participants visible" on public.quest_participants for select using (
  exists (select 1 from public.reading_quests where id = quest_id and (is_public = true or creator_id = auth.uid()))
  or auth.uid() = user_id
);
create policy "Users manage own quest participation" on public.quest_participants for all using (auth.uid() = user_id);

create policy "Quest participant books own only" on public.quest_participant_books for all using (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS: updated_at for new tables
-- ============================================================

create trigger shared_reads_updated_at before update on public.shared_reads
  for each row execute function public.handle_updated_at();

create trigger reading_circles_updated_at before update on public.reading_circles
  for each row execute function public.handle_updated_at();

create trigger circle_meetings_updated_at before update on public.circle_meetings
  for each row execute function public.handle_updated_at();

create trigger reading_quests_updated_at before update on public.reading_quests
  for each row execute function public.handle_updated_at();

create trigger user_reading_preferences_updated_at before update on public.user_reading_preferences
  for each row execute function public.handle_updated_at();

-- ============================================================
-- SEED DATA: Vibes vocabulary
-- ============================================================

insert into public.vibes (id, label, emoji) values
  ('cosy',        'Cosy',        '🍵'),
  ('emotional',   'Emotional',   '💙'),
  ('adventurous', 'Adventurous', '🌍'),
  ('dark',        'Dark',        '🌑'),
  ('funny',       'Funny',       '😂'),
  ('hopeful',     'Hopeful',     '🌱'),
  ('mysterious',  'Mysterious',  '🔍'),
  ('reflective',  'Reflective',  '🪞'),
  ('tense',       'Tense',       '⚡'),
  ('whimsical',   'Whimsical',   '✨'),
  ('inspiring',   'Inspiring',   '🔥'),
  ('challenging', 'Challenging', '🧠'),
  ('uplifting',   'Uplifting',   '☀️'),
  ('romantic',    'Romantic',    '🌸'),
  ('gripping',    'Gripping',    '📖')
on conflict (id) do nothing;

-- ============================================================
-- SEED DATA: Content Warning types
-- ============================================================

insert into public.content_warning_types (id, label, category) values
  -- Mental Health
  ('suicide',           'Suicide / Self-harm',         'Mental Health'),
  ('eating_disorder',   'Eating Disorders',             'Mental Health'),
  ('addiction',         'Addiction / Substance Abuse',  'Mental Health'),
  ('mental_illness',    'Mental Illness',               'Mental Health'),
  ('trauma',            'Trauma / PTSD',                'Mental Health'),
  -- Violence
  ('violence',          'Violence',                     'Violence'),
  ('sexual_violence',   'Sexual Violence / Assault',    'Violence'),
  ('child_abuse',       'Child Abuse / Neglect',        'Violence'),
  ('domestic_abuse',    'Domestic Abuse',               'Violence'),
  ('war',               'War / Graphic Combat',         'Violence'),
  ('animal_cruelty',    'Animal Cruelty / Death',       'Violence'),
  -- Loss & Grief
  ('death',             'Death of a Character',         'Loss & Grief'),
  ('child_death',       'Death of a Child',             'Loss & Grief'),
  ('grief',             'Grief / Bereavement',          'Loss & Grief'),
  -- Sexual Content
  ('explicit_sex',      'Explicit Sexual Content',      'Sexual Content'),
  ('infidelity',        'Infidelity',                   'Sexual Content'),
  -- Discrimination
  ('racism',            'Racism / Racial Slurs',        'Discrimination'),
  ('homophobia',        'Homophobia / Transphobia',     'Discrimination'),
  ('ableism',           'Ableism',                      'Discrimination'),
  -- Other
  ('pregnancy_loss',    'Pregnancy / Infant Loss',      'Other'),
  ('cancer',            'Cancer / Serious Illness',     'Other'),
  ('religious_trauma',  'Religious Trauma / Cults',     'Other'),
  ('cliffhanger',       'Unresolved Cliffhanger',       'Other')
on conflict (id) do nothing;
