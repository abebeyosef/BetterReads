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
import type { ReadingStatus } from "@/types/database";

type ReadBook = {
  rating: number | null;
  date_finished: string | null;
  date_started: string | null;
  books: { title: string; page_count: number | null; genres: string[] | null };
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // All read books for analytics
  const { data: readBooks } = await db
    .from("user_books")
    .select("rating, date_finished, date_started, books(title, page_count, genres)")
    .eq("user_id", user.id)
    .eq("status", "read") as { data: ReadBook[] | null };

  // Status counts
  const { data: statusRows } = await db
    .from("user_books")
    .select("status")
    .eq("user_id", user.id) as { data: { status: ReadingStatus }[] | null };

  const counts = {
    read: statusRows?.filter((r) => r.status === "read").length ?? 0,
    currently_reading: statusRows?.filter((r) => r.status === "currently_reading").length ?? 0,
    want_to_read: statusRows?.filter((r) => r.status === "want_to_read").length ?? 0,
  };

  // Currently reading with covers
  const { data: currentlyReading } = await db
    .from("user_books")
    .select("id, date_started, books(id, title, cover_url, book_authors(authors(name)))")
    .eq("user_id", user.id)
    .eq("status", "currently_reading")
    .order("created_at", { ascending: false })
    .limit(6) as { data: CurrentlyReadingEntry[] | null };

  const books = readBooks ?? [];
  const currentYear = new Date().getFullYear();

  // --- Compute analytics ---

  // Books by year
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

  // Books by month (current year)
  const booksByMonth = MONTH_NAMES.map((month, i) => ({
    month,
    count: books.filter((b) => {
      if (!b.date_finished) return false;
      const d = new Date(b.date_finished);
      return d.getFullYear() === currentYear && d.getMonth() === i;
    }).length,
  }));

  // Genre breakdown (top 8, first genre per book)
  const genreMap: Record<string, number> = {};
  for (const b of books) {
    const genre = b.books?.genres?.[0];
    if (genre) genreMap[genre] = (genreMap[genre] ?? 0) + 1;
  }
  const genreBreakdown = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Rating distribution
  const ratingDistribution = [1, 2, 3, 4, 5].map((r) => ({
    rating: r,
    label: "★".repeat(r),
    count: books.filter((b) => b.rating === r).length,
  }));

  // Average rating
  const rated = books.filter((b) => b.rating !== null);
  const avgRating =
    rated.length > 0
      ? rated.reduce((sum, b) => sum + (b.rating ?? 0), 0) / rated.length
      : null;

  // Total pages read
  const totalPages = books.reduce((sum, b) => sum + (b.books?.page_count ?? 0), 0);

  // Highlights
  const bestYear =
    booksByYear.length > 0
      ? booksByYear.reduce((best, y) => (y.count > best.count ? y : best))
      : null;

  const booksWithDuration = books
    .filter((b) => b.date_started && b.date_finished)
    .map((b) => ({
      title: b.books?.title ?? "",
      days: daysBetween(b.date_started!, b.date_finished!),
    }))
    .filter((b) => b.days >= 0);

  const fastestRead =
    booksWithDuration.length > 0
      ? booksWithDuration.reduce((min, b) => (b.days < min.days ? b : min))
      : null;

  const longestRead =
    booksWithDuration.length > 0
      ? booksWithDuration.reduce((max, b) => (b.days > max.days ? b : max))
      : null;

  const topGenre =
    genreBreakdown.length > 0 ? genreBreakdown[0] : null;

  const thisYearCount = booksByYear.find((y) => y.year === currentYear)?.count ?? 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 space-y-10">

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Books read" value={counts.read} />
        <StatCard label="Currently reading" value={counts.currently_reading} />
        <StatCard label="Want to read" value={counts.want_to_read} />
        <StatCard
          label="Average rating"
          value={avgRating !== null ? `${avgRating.toFixed(1)} ★` : "—"}
        />
      </div>

      {/* Currently reading */}
      {currentlyReading && currentlyReading.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Currently reading
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-1">
            {currentlyReading.map((entry) => {
              const book = entry.books;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const authors = book.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean).join(", ");
              return (
                <Link
                  key={entry.id}
                  href={`/books/${book.id}`}
                  className="flex-shrink-0 w-28 space-y-2 group"
                >
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
          <p className="text-muted-foreground text-sm">Your reading history will appear here.</p>
          <div className="flex justify-center gap-4 text-sm">
            <Link href="/search" className="font-medium underline underline-offset-4 hover:opacity-70">
              Search for books
            </Link>
            <Link href="/import" className="font-medium underline underline-offset-4 hover:opacity-70">
              Import from Goodreads
            </Link>
          </div>
        </div>
      )}

      {/* Charts — only show when there's data */}
      {books.length > 0 && (
        <>
          {/* Year + month charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Books read by year">
              <BooksPerYearChart data={booksByYear} />
            </ChartCard>
            <ChartCard title={`${currentYear} — by month`}>
              <BooksPerMonthChart data={booksByMonth} currentYear={currentYear} />
            </ChartCard>
          </div>

          {/* Genre + ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Genre breakdown">
              <GenreChart data={genreBreakdown} />
            </ChartCard>
            <ChartCard title="Rating distribution">
              <RatingChart data={ratingDistribution} />
            </ChartCard>
          </div>

          {/* Highlights */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Highlights
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {thisYearCount > 0 && (
                <HighlightCard label={`Read in ${currentYear}`} value={thisYearCount.toString()} />
              )}
              {bestYear && (
                <HighlightCard
                  label="Best year"
                  value={`${bestYear.year}`}
                  sub={`${bestYear.count} books`}
                />
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
                <HighlightCard
                  label="Longest read"
                  value={`${longestRead.days}d`}
                  sub={longestRead.title}
                />
              )}
              {topGenre && (
                <HighlightCard label="Top genre" value={topGenre.genre} sub={`${topGenre.count} books`} />
              )}
            </div>
          </section>
        </>
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
