-- ============================================================
-- BetterReads — Migration 003: Additional Features (Phase 7–9 gaps)
-- Run AFTER 002_features.sql
-- ============================================================

-- ============================================================
-- SECTION 1: Multiple reading goal types
-- Replace the single reading_goal_count / reading_goal_year
-- columns on users with a proper goals table supporting
-- books, pages, and listening-hours goals per year.
-- ============================================================

CREATE TABLE IF NOT EXISTS reading_goals (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year         integer NOT NULL,
  goal_type    text NOT NULL CHECK (goal_type IN ('books', 'pages', 'listening_hours')),
  target       integer NOT NULL CHECK (target > 0),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year, goal_type)
);

CREATE INDEX IF NOT EXISTS reading_goals_user_id_idx ON reading_goals(user_id);

ALTER TABLE reading_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own goals"
  ON reading_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals"
  ON reading_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON reading_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON reading_goals FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE TRIGGER reading_goals_updated_at
  BEFORE UPDATE ON reading_goals
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


-- ============================================================
-- SECTION 2: Book discussion questions (question bank)
-- Community-sourced discussion questions per book,
-- used on book pages and in Reading Circle meetings.
-- ============================================================

CREATE TABLE IF NOT EXISTS book_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id     uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question    text NOT NULL,
  upvotes     integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_question_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES book_questions(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS book_questions_book_id_idx ON book_questions(book_id);
CREATE INDEX IF NOT EXISTS book_questions_upvotes_idx ON book_questions(book_id, upvotes DESC);

ALTER TABLE book_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_question_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions are publicly readable"
  ON book_questions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can post questions"
  ON book_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors can delete their questions"
  ON book_questions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Votes are publicly readable"
  ON book_question_votes FOR SELECT USING (true);

CREATE POLICY "Users can vote once per question"
  ON book_question_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unvote"
  ON book_question_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to keep upvotes count in sync
CREATE OR REPLACE FUNCTION update_question_upvotes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE book_questions SET upvotes = upvotes + 1 WHERE id = NEW.question_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE book_questions SET upvotes = GREATEST(upvotes - 1, 0) WHERE id = OLD.question_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER book_question_votes_upvotes
  AFTER INSERT OR DELETE ON book_question_votes
  FOR EACH ROW EXECUTE FUNCTION update_question_upvotes();


-- ============================================================
-- SECTION 3: Circle book history
-- Track books a Reading Circle has read together,
-- used for the Circle Leaderboard and group recommendations.
-- ============================================================

CREATE TABLE IF NOT EXISTS circle_book_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id    uuid NOT NULL REFERENCES reading_circles(id) ON DELETE CASCADE,
  book_id      uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  added_by     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at   date,
  finished_at  date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, book_id)
);

CREATE INDEX IF NOT EXISTS circle_book_history_circle_id_idx ON circle_book_history(circle_id);

ALTER TABLE circle_book_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view circle book history"
  ON circle_book_history FOR SELECT
  USING (is_circle_member(circle_id));

CREATE POLICY "Members can add to circle book history"
  ON circle_book_history FOR INSERT
  WITH CHECK (is_circle_member(circle_id) AND auth.uid() = added_by);

CREATE POLICY "Admins can remove from circle book history"
  ON circle_book_history FOR DELETE
  USING (is_circle_admin(circle_id));


-- ============================================================
-- SECTION 4: Similar readers
-- Store pre-computed or on-demand reader similarity scores.
-- Populated when a user opts in to "Find readers like me".
-- ============================================================

CREATE TABLE IF NOT EXISTS reader_similarity (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  similar_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score        numeric(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, similar_user_id)
);

CREATE INDEX IF NOT EXISTS reader_similarity_user_id_idx  ON reader_similarity(user_id, score DESC);

ALTER TABLE reader_similarity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own similarity scores"
  ON reader_similarity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can upsert similarity scores"
  ON reader_similarity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update similarity scores"
  ON reader_similarity FOR UPDATE
  USING (auth.uid() = user_id);


-- ============================================================
-- SECTION 5: Listening hours tracking
-- Track audiobook listening time per book (minutes).
-- Used for the "listening hours" reading goal.
-- ============================================================

ALTER TABLE user_books
  ADD COLUMN IF NOT EXISTS listening_minutes integer;


-- ============================================================
-- SECTION 6: Wrap-up snapshots (shareable reading stats)
-- Store generated monthly/annual wrap-up data so they can be
-- regenerated and shared without re-computing every time.
-- ============================================================

CREATE TABLE IF NOT EXISTS reading_wrapups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_type  text NOT NULL CHECK (period_type IN ('monthly', 'annual')),
  year         integer NOT NULL,
  month        integer CHECK (month IS NULL OR (month >= 1 AND month <= 12)),
  data         jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_type, year, month)
);

ALTER TABLE reading_wrapups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own wrap-ups"
  ON reading_wrapups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public wrap-ups readable by all authenticated users"
  ON reading_wrapups FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own wrap-ups"
  ON reading_wrapups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wrap-ups"
  ON reading_wrapups FOR UPDATE
  USING (auth.uid() = user_id);
