import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ReadingStatus } from "@/types/database";

type SearchParams = Promise<{ year?: string; label_id?: string }>;

type ReadBook = {
  rating: number | null;
  date_finished: string | null;
  date_started: string | null;
  format: string | null;
  books: {
    title: string;
    page_count: number | null;
    genres: string[] | null;
    book_authors: { authors: { name: string } | null }[];
  };
};

type LabelRow = { id: string; name: string };

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function StatsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year: rawYear, label_id } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = rawYear ? parseInt(rawYear) : currentYear;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch user's labels for the filter dropdown
  const { data: labels } = await db
    .from("labels")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name") as { data: LabelRow[] | null };

  // Build base query — optionally filtered by label
  let labeledIds: string[] | null = null;
  if (label_id) {
    const { data: labeledBooks } = await db
      .from("user_book_labels")
      .select("user_book_id")
      .eq("label_id", label_id)
      .eq("user_id", user.id) as { data: { user_book_id: string }[] | null };
    labeledIds = (labeledBooks ?? []).map((r) => r.user_book_id);
  }

  let booksQuery = db
    .from("user_books")
    .select("rating, date_finished, date_started, format, books(title, page_count, genres, book_authors(authors(name)))")
    .eq("user_id", user.id)
    .eq("status", "read");

  if (labeledIds !== null) {
    if (labeledIds.length === 0) {
      booksQuery = booksQuery.in("id", ["none"]);
    } else {
      booksQuery = booksQuery.in("id", labeledIds);
    }
  }

  const [
    { data: allBooks },
    { data: statusRows },
    { data: streak },
    { data: profile },
  ] = await Promise.all([
    booksQuery as Promise<{ data: ReadBook[] | null }>,
    db
      .from("user_books")
      .select("status, is_loved")
      .eq("user_id", user.id) as Promise<{ data: { status: ReadingStatus; is_loved: boolean }[] | null }>,
    db
      .from("reading_streaks")
      .select("current_streak, longest_streak")
      .eq("user_id", user.id)
      .maybeSingle() as Promise<{ data: { current_streak: number; longest_streak: number } | null }>,
    db
      .from("users")
      .select("reading_goal_year, reading_goal_count")
      .eq("id", user.id)
      .single() as Promise<{ data: { reading_goal_year: number | null; reading_goal_count: number | null } | null }>,
  ]);

  const books = allBooks ?? [];
  const yearBooks = books.filter((b) => {
    if (!b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === selectedYear;
  });

  // Summary stats (all-time — not filtered by label)
  const counts = {
    read: statusRows?.filter((r) => r.status === "read").length ?? 0,
    currently_reading: statusRows?.filter((r) => r.status === "currently_reading").length ?? 0,
    want_to_read: statusRows?.filter((r) => r.status === "want_to_read").length ?? 0,
    loved: statusRows?.filter((r) => r.is_loved).length ?? 0,
  };

  // Year goal
  const goalCount =
    profile?.reading_goal_year === selectedYear ? (profile?.reading_goal_count ?? null) : null;
  const goalProgress = goalCount ? Math.min(yearBooks.length / goalCount, 1) : null;

  // Best month
  const monthCounts = MONTH_NAMES.map((month, i) => ({
    month,
    count: yearBooks.filter((b) => {
      if (!b.date_finished) return false;
      return new Date(b.date_finished).getMonth() === i;
    }).length,
  }));
  const bestMonth = monthCounts.reduce((best, m) => (m.count > best.count ? m : best), monthCounts[0]);

  // Genre breakdown
  const genreMap: Record<string, number> = {};
  for (const b of yearBooks) {
    const genre = b.books?.genres?.[0];
    if (genre) genreMap[genre] = (genreMap[genre] ?? 0) + 1;
  }
  const genreBreakdown = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Format breakdown
  const formatMap: Record<string, number> = {};
  for (const b of yearBooks) {
    const fmt = b.format ?? "Unknown";
    formatMap[fmt] = (formatMap[fmt] ?? 0) + 1;
  }
  const formatBreakdown = Object.entries(formatMap)
    .map(([format, count]) => ({ format, count }))
    .sort((a, b) => b.count - a.count);

  // Rating distribution
  const rated = yearBooks.filter((b) => b.rating !== null);
  const avgRating = rated.length > 0
    ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
    : null;
  const maxRatingCount = Math.max(1, ...[1, 2, 3, 4, 5].map((r) => yearBooks.filter((b) => b.rating === r).length));

  // Author stats
  type AuthorStats = { count: number; totalRating: number; ratedCount: number };
  const authorMap: Record<string, AuthorStats> = {};
  for (const b of yearBooks) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authors = b.books?.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean) ?? [];
    for (const author of authors) {
      if (!authorMap[author]) authorMap[author] = { count: 0, totalRating: 0, ratedCount: 0 };
      authorMap[author].count += 1;
      if (b.rating !== null) {
        authorMap[author].totalRating += b.rating;
        authorMap[author].ratedCount += 1;
      }
    }
  }
  const topAuthors = Object.entries(authorMap)
    .map(([author, { count, totalRating, ratedCount }]) => ({
      author,
      count,
      avgRating: ratedCount > 0 ? totalRating / ratedCount : null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const highestRated = Object.entries(authorMap)
    .map(([author, { count, totalRating, ratedCount }]) => ({
      author,
      count,
      avgRating: ratedCount >= 2 ? totalRating / ratedCount : null,
    }))
    .filter((a) => a.avgRating !== null)
    .sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
    .slice(0, 5);

  // Year selector range
  const availableYears: number[] = [];
  for (const b of books) {
    if (b.date_finished) {
      const y = new Date(b.date_finished).getFullYear();
      if (!availableYears.includes(y)) availableYears.push(y);
    }
  }
  if (!availableYears.includes(currentYear)) availableYears.push(currentYear);
  availableYears.sort((a, b) => b - a);

  const selectedLabel = labels?.find((l) => l.id === label_id) ?? null;

  function buildUrl(overrides: { year?: number; label_id?: string | null }) {
    const p = new URLSearchParams();
    const y = overrides.year ?? selectedYear;
    const lid = "label_id" in overrides ? overrides.label_id : label_id;
    p.set("year", String(y));
    if (lid) p.set("label_id", lid);
    return `/stats?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Your Reading Story</h1>
        <div className="flex flex-wrap gap-2 items-center">
          {/* Year filter */}
          {availableYears.map((y) => (
            <Link
              key={y}
              href={buildUrl({ year: y })}
              className={`text-sm px-3 py-1 rounded-full transition-colors ${
                y === selectedYear
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* Label filter */}
      {labels && labels.length > 0 && (
        <form method="GET" action="/stats" className="flex items-center gap-2">
          <input type="hidden" name="year" value={String(selectedYear)} />
          <label htmlFor="label_id" className="text-xs text-muted-foreground">Filter by label:</label>
          <select
            id="label_id"
            name="label_id"
            defaultValue={label_id ?? ""}
            className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground focus:outline-none"
          >
            <option value="">All books</option>
            {labels.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <button type="submit" className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80 transition-colors">
            Filter
          </button>
          {selectedLabel && (
            <Link href={buildUrl({ label_id: null })} className="text-xs text-muted-foreground underline">
              Clear
            </Link>
          )}
        </form>
      )}

      {/* Summary stats */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">All time</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Finished" value={counts.read} />
          <StatCard label="Reading Now" value={counts.currently_reading} />
          <StatCard label="Up Next" value={counts.want_to_read} />
          <StatCard label="Loved" value={counts.loved} />
        </div>
      </section>

      {/* Year in Books */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedYear} in Books
          {selectedLabel && <span className="ml-2 normal-case font-normal opacity-70">({selectedLabel.name})</span>}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label={`Read in ${selectedYear}`} value={yearBooks.length} />
          {bestMonth && bestMonth.count > 0 && (
            <StatCard label="Best month" value={bestMonth.month} sub={`${bestMonth.count} books`} />
          )}
          {avgRating !== null && (
            <StatCard label="Avg rating" value={`${avgRating.toFixed(1)} ★`} />
          )}
        </div>

        {goalCount && goalProgress !== null && (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">Goal: {goalCount} books</span>
              <span className="font-medium">{yearBooks.length}/{goalCount}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${goalProgress * 100}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Genre breakdown */}
      {genreBreakdown.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you read</h2>
          <div className="space-y-2">
            {genreBreakdown.map(({ genre, count }) => {
              const pct = yearBooks.length > 0 ? Math.round((count / yearBooks.length) * 100) : 0;
              return (
                <div key={genre} className="flex items-center gap-3">
                  <span className="w-32 text-sm text-muted-foreground truncate">{genre}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Format breakdown */}
      {formatBreakdown.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</h2>
          <div className="flex flex-wrap gap-2">
            {formatBreakdown.map(({ format, count }) => (
              <span key={format} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                {format} <span className="font-medium text-foreground">{count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Rating distribution */}
      {rated.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How you rated</h2>
          {avgRating !== null && (
            <p className="text-lg font-bold">{avgRating.toFixed(1)} <span className="text-yellow-400">★</span> average</p>
          )}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((r) => {
              const count = yearBooks.filter((b) => b.rating === r).length;
              const pct = Math.round((count / maxRatingCount) * 100);
              return (
                <div key={r} className="flex items-center gap-3">
                  <span className="text-sm text-yellow-400 w-12">{"★".repeat(r)}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400/70 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reading streak */}
      {streak && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reading Streak</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Current" value={`${streak.current_streak} days`} />
            <StatCard label="Longest" value={`${streak.longest_streak} days`} />
          </div>
        </section>
      )}

      {/* Author stats */}
      {topAuthors.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Authors</h2>

          {/* Most read */}
          <div className="space-y-3">
            <h3 className="text-xs text-muted-foreground">Most read</h3>
            <div className="space-y-2">
              {topAuthors.map(({ author, count, avgRating: ar }, i) => {
                const pct = Math.round((count / (topAuthors[0].count || 1)) * 100);
                return (
                  <div key={author} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <Link href={`/search?q=${encodeURIComponent(author)}`} className="text-sm hover:underline">{author}</Link>
                        <span className="text-xs text-muted-foreground">{count} book{count === 1 ? "" : "s"}{ar !== null ? ` · ${ar.toFixed(1)}★` : ""}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Highest rated */}
          {highestRated.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs text-muted-foreground">Highest rated (min 2 books)</h3>
              <div className="space-y-1.5">
                {highestRated.map(({ author, avgRating: ar }, i) => (
                  <div key={author} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                      <Link href={`/search?q=${encodeURIComponent(author)}`} className="hover:underline">{author}</Link>
                    </div>
                    <span className="text-xs text-yellow-500 font-medium">{ar?.toFixed(1)} ★</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Nav to compare / reading card */}
      <div className="flex gap-4 text-sm text-muted-foreground border-t border-border pt-4">
        <Link href="/stats/compare" className="hover:text-foreground transition-colors">Reading Replay →</Link>
        <Link href="/stats/reading-card" className="hover:text-foreground transition-colors">Reading Card →</Link>
      </div>

      {yearBooks.length === 0 && (
        <div className="py-12 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            No books marked as finished in {selectedYear}.
          </p>
          <Link href="/search" className="text-sm font-medium underline underline-offset-4 hover:opacity-70">
            Find a book to read →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
