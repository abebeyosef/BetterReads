import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  BooksPerYearChart,
  BooksPerMonthChart,
  GenreChart,
  RatingChart,
} from "./analytics-charts";
import { BookshelfIllo } from "@/components/illustrations/BookshelfIllo";
import type { ReadingStatus, UserRow } from "@/types/database";

type ReadBook = {
  rating: number | null;
  date_finished: string | null;
  date_started: string | null;
  books: {
    title: string;
    page_count: number | null;
    genres: string[] | null;
    book_authors: { authors: { name: string } | null }[];
  };
};

type CurrentlyReadingEntry = {
  id: string;
  date_started: string | null;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    book_authors: { authors: { name: string } | null }[];
  };
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

// ── Recency gap engine ────────────────────────────────────────────────────────
// For each genre in the user's read history, compute how many months have
// passed since they last finished a book in that genre.

type RecencyGap = { genre: string; monthsAgo: number; lastTitle: string };

function computeRecencyGaps(books: ReadBook[]): RecencyGap[] {
  const genreMap: Record<string, { lastDate: Date; lastTitle: string }> = {};

  for (const b of books) {
    if (!b.date_finished || !b.books?.genres?.length) continue;
    const genre = b.books.genres[0];
    const date = new Date(b.date_finished);
    if (!genreMap[genre] || date > genreMap[genre].lastDate) {
      genreMap[genre] = { lastDate: date, lastTitle: b.books.title };
    }
  }

  const now = new Date();
  return Object.entries(genreMap)
    .map(([genre, { lastDate, lastTitle }]) => ({
      genre,
      monthsAgo: Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30)),
      lastTitle,
    }))
    .filter((g) => g.monthsAgo >= 2)
    .sort((a, b) => b.monthsAgo - a.monthsAgo)
    .slice(0, 3);
}

// ── Author affinity ───────────────────────────────────────────────────────────
// Find authors the user consistently rates highly (avg >= 4 stars).

type AuthorRec = { author: string; avgRating: number; bookCount: number };

function computeTopAuthors(books: ReadBook[]): AuthorRec[] {
  const authorMap: Record<string, { total: number; count: number }> = {};

  for (const b of books) {
    if (!b.rating || b.rating < 4) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const authors = b.books?.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean) ?? [];
    for (const author of authors) {
      if (!authorMap[author]) authorMap[author] = { total: 0, count: 0 };
      authorMap[author].total += b.rating;
      authorMap[author].count += 1;
    }
  }

  return Object.entries(authorMap)
    .map(([author, { total, count }]) => ({
      author,
      avgRating: total / count,
      bookCount: count,
    }))
    .filter((a) => a.bookCount >= 1)
    .sort((a, b) => b.avgRating - a.avgRating || b.bookCount - a.bookCount)
    .slice(0, 3);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Fetch in parallel
  const [
    { data: readBooks },
    { data: statusRows },
    { data: currentlyReading },
    { data: profile },
  ] = await Promise.all([
    db
      .from("user_books")
      .select("rating, date_finished, date_started, books(title, page_count, genres, book_authors(authors(name)))")
      .eq("user_id", user.id)
      .eq("status", "read") as Promise<{ data: ReadBook[] | null }>,
    db
      .from("user_books")
      .select("status")
      .eq("user_id", user.id) as Promise<{ data: { status: ReadingStatus }[] | null }>,
    db
      .from("user_books")
      .select("id, date_started, books(id, title, cover_url, book_authors(authors(name)))")
      .eq("user_id", user.id)
      .eq("status", "currently_reading")
      .order("created_at", { ascending: false })
      .limit(6) as Promise<{ data: CurrentlyReadingEntry[] | null }>,
    db
      .from("users")
      .select("reading_goal_year, reading_goal_count")
      .eq("id", user.id)
      .single() as Promise<{ data: Pick<UserRow, "reading_goal_year" | "reading_goal_count"> | null }>,
  ]);

  const books = readBooks ?? [];
  const currentYear = new Date().getFullYear();

  const counts = {
    read: statusRows?.filter((r) => r.status === "read").length ?? 0,
    currently_reading: statusRows?.filter((r) => r.status === "currently_reading").length ?? 0,
    want_to_read: statusRows?.filter((r) => r.status === "want_to_read").length ?? 0,
  };

  // ── Analytics ──────────────────────────────────────────────────────────────

  const yearMap: Record<number, number> = {};
  for (const b of books) {
    if (b.date_finished) {
      const y = new Date(b.date_finished).getFullYear();
      yearMap[y] = (yearMap[y] ?? 0) + 1;
    }
  }
  const booksByYear = Object.entries(yearMap)
    .map(([y, count]) => ({ year: parseInt(y), count }))
    .sort((a, b) => a.year - b.year);

  const booksByMonth = MONTH_NAMES.map((month, i) => ({
    month,
    count: books.filter((b) => {
      if (!b.date_finished) return false;
      const d = new Date(b.date_finished);
      return d.getFullYear() === currentYear && d.getMonth() === i;
    }).length,
  }));

  const genreMap: Record<string, number> = {};
  for (const b of books) {
    const genre = b.books?.genres?.[0];
    if (genre) genreMap[genre] = (genreMap[genre] ?? 0) + 1;
  }
  const genreBreakdown = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    label: "★".repeat(r),
    count: books.filter((b) => b.rating === r).length,
  }));

  const rated = books.filter((b) => b.rating !== null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
      : null;

  const totalPages = books.reduce((sum, b) => sum + (b.books?.page_count ?? 0), 0);
  const thisYearCount = booksByYear.find((y) => y.year === currentYear)?.count ?? 0;
  const bestYear = booksByYear.length > 0
    ? booksByYear.reduce((best, y) => (y.count > best.count ? y : best))
    : null;

  const booksWithDuration = books
    .filter((b) => b.date_started && b.date_finished)
    .map((b) => ({ title: b.books?.title ?? "", days: daysBetween(b.date_started!, b.date_finished!) }))
    .filter((b) => b.days >= 0);

  const fastestRead = booksWithDuration.length > 0
    ? booksWithDuration.reduce((min, b) => (b.days < min.days ? b : min))
    : null;
  const longestRead = booksWithDuration.length > 0
    ? booksWithDuration.reduce((max, b) => (b.days > max.days ? b : max))
    : null;
  const topGenre = genreBreakdown.length > 0 ? genreBreakdown[0] : null;

  // ── Reading goal ───────────────────────────────────────────────────────────
  const goalCount =
    profile?.reading_goal_year === currentYear ? (profile?.reading_goal_count ?? null) : null;
  const goalProgress = goalCount ? Math.min(thisYearCount / goalCount, 1) : null;

  // ── Recommendations ────────────────────────────────────────────────────────
  const recencyGaps = computeRecencyGaps(books);
  const topAuthors = computeTopAuthors(books);
  const hasRecommendations = recencyGaps.length > 0 || topAuthors.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">

      {/* Hero welcome card with bookshelf illustration */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border card-warm px-6 py-5">
        <div className="relative z-10 max-w-[55%]">
          <h1 className="text-2xl font-bold">Your reading life</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track what you read, discover what to read next.
          </p>
        </div>
        {/* Illustration — fades left to right so it doesn't crowd text */}
        <div
          className="absolute inset-y-0 right-0 w-[55%]"
          style={{ maskImage: "linear-gradient(to right, transparent 0%, black 40%)" }}
        >
          <BookshelfIllo className="h-full w-full" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Finished" value={counts.read} />
        <StatCard label="Reading Now" value={counts.currently_reading} />
        <StatCard label="Up Next" value={counts.want_to_read} />
        <StatCard
          label="Average rating"
          value={avgRating !== null ? `${avgRating.toFixed(1)} ★` : "—"}
        />
      </div>

      {/* Reading goal */}
      {goalCount && goalProgress !== null && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Year in Books — {currentYear}
            </h2>
            <span className="text-sm text-muted-foreground">
              {thisYearCount} / {goalCount} books
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700"
              style={{ width: `${goalProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {goalProgress >= 1
              ? "Goal complete! You can update your target in settings."
              : `${goalCount - thisYearCount} book${goalCount - thisYearCount === 1 ? "" : "s"} to go.`}
          </p>
        </section>
      )}

      {/* Currently reading */}
      {currentlyReading && currentlyReading.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Reading Now
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {currentlyReading.map((entry) => {
              const book = entry.books;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const authors = book.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean).join(", ");
              return (
                <Link key={entry.id} href={`/books/${book.id}`} className="flex-shrink-0 w-28 space-y-2 group">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="112px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-2 text-center">
                        <span className="text-xs text-muted-foreground line-clamp-4">{book.title}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium leading-tight line-clamp-2">{book.title}</p>
                    {authors && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{authors}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* No data state */}
      {books.length === 0 && counts.currently_reading === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center space-y-3">
          <p className="text-muted-foreground text-sm">Your reading story starts here. Add your first book to get going.</p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="/search" className="font-medium underline underline-offset-4 hover:opacity-70">
              Find a book
            </Link>
            <Link href="/import" className="font-medium underline underline-offset-4 hover:opacity-70">
              Import from Goodreads
            </Link>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {hasRecommendations && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Made for You
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recencyGaps.map((gap) => (
              <Link
                key={gap.genre}
                href={`/search?q=${encodeURIComponent(gap.genre)}`}
                className="group rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors space-y-1"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Genre gap · {gap.monthsAgo} month{gap.monthsAgo === 1 ? "" : "s"} ago
                </p>
                <p className="text-sm font-medium group-hover:text-foreground">
                  You haven&apos;t read {gap.genre} in a while
                </p>
                <p className="text-xs text-muted-foreground">
                  Last read: {gap.lastTitle}
                </p>
              </Link>
            ))}
            {topAuthors.map((rec) => (
              <Link
                key={rec.author}
                href={`/search?q=${encodeURIComponent(rec.author)}`}
                className="group rounded-lg border border-border bg-card p-4 hover:bg-accent transition-colors space-y-1"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Author you love · avg {rec.avgRating.toFixed(1)} ★
                </p>
                <p className="text-sm font-medium group-hover:text-foreground">
                  Read more from {rec.author}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rec.bookCount} book{rec.bookCount === 1 ? "" : "s"} rated 4+ stars
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Charts */}
      {books.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Year in Books">
              <BooksPerYearChart data={booksByYear} />
            </ChartCard>
            <ChartCard title={`${currentYear} — by month`}>
              <BooksPerMonthChart data={booksByMonth} currentYear={currentYear} />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="What you read">
              <GenreChart data={genreBreakdown} />
            </ChartCard>
            <ChartCard title="How you rated them">
              <RatingChart data={ratingDistribution} />
            </ChartCard>
          </div>

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Your Reading Story
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {thisYearCount > 0 && (
                <HighlightCard label={`Read in ${currentYear}`} value={thisYearCount.toString()} />
              )}
              {bestYear && (
                <HighlightCard label="Best year" value={`${bestYear.year}`} sub={`${bestYear.count} books`} />
              )}
              {totalPages > 0 && (
                <HighlightCard label="Pages read" value={totalPages.toLocaleString()} />
              )}
              {fastestRead && (
                <HighlightCard
                  label="Fastest read"
                  value={fastestRead.days === 0 ? "Same day" : `${fastestRead.days}d`}
                  sub={fastestRead.title}
                />
              )}
              {longestRead && longestRead.days > 0 && (
                <HighlightCard label="Longest read" value={`${longestRead.days}d`} sub={longestRead.title} />
              )}
              {topGenre && (
                <HighlightCard label="Top genre" value={topGenre.genre} sub={`${topGenre.count} books`} />
              )}
            </div>
          </section>
        </>
      )}

      {!goalCount && books.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          <Link href="/settings" className="underline underline-offset-4 hover:opacity-70">
            Set a reading goal for {currentYear}
          </Link>
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function HighlightCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground line-clamp-2">{sub}</p>}
    </div>
  );
}
