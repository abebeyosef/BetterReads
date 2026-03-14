/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{ period_a?: string; period_b?: string }>;

function computeStatsForBooks(
  books: { rating: number | null; date_finished: string | null; books: { page_count: number | null; genres: string[] | null } }[],
  year: number
) {
  const yearBooks = books.filter((b) => b.date_finished && new Date(b.date_finished).getFullYear() === year);
  const pageCount = yearBooks.reduce((s, b) => s + (b.books?.page_count ?? 0), 0);
  const rated = yearBooks.filter((b) => b.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : null;
  const genreMap: Record<string, number> = {};
  for (const b of yearBooks) {
    const g = b.books?.genres?.[0];
    if (g) genreMap[g] = (genreMap[g] ?? 0) + 1;
  }
  const topGenres = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { bookCount: yearBooks.length, pageCount, avgRating, topGenres };
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { period_a: rawA, period_b: rawB } = await searchParams;
  const currentYear = new Date().getFullYear();

  const periodA = rawA ? parseInt(rawA) : currentYear;
  const periodB = rawB ? parseInt(rawB) : currentYear - 1;

  const db = supabase as any;

  const { data: books } = await db
    .from("user_books")
    .select("rating, date_finished, books(page_count, genres)")
    .eq("user_id", user.id)
    .eq("status", "read") as { data: { rating: number | null; date_finished: string | null; books: { page_count: number | null; genres: string[] | null } }[] | null };

  const statsA = computeStatsForBooks(books ?? [], periodA);
  const statsB = computeStatsForBooks(books ?? [], periodB);

  // Available years
  const years: number[] = [];
  for (const b of books ?? []) {
    if (b.date_finished) {
      const y = new Date(b.date_finished).getFullYear();
      if (!years.includes(y)) years.push(y);
    }
  }
  if (!years.includes(currentYear)) years.push(currentYear);
  years.sort((a, b) => b - a);

  function buildUrl(a: number, b: number) {
    return `/stats/compare?period_a=${a}&period_b=${b}`;
  }

  const allGenres = Array.from(new Set([...statsA.topGenres.map((g) => g[0]), ...statsB.topGenres.map((g) => g[0])]));
  const maxGenreCount = Math.max(1, ...statsA.topGenres.map((g) => g[1]), ...statsB.topGenres.map((g) => g[1]));

  const summaryRows = [
    { label: "Books read", a: String(statsA.bookCount), b: String(statsB.bookCount) },
    { label: "Pages", a: statsA.pageCount.toLocaleString(), b: statsB.pageCount.toLocaleString() },
    { label: "Avg rating", a: statsA.avgRating !== null ? `${statsA.avgRating.toFixed(1)} ★` : "—", b: statsB.avgRating !== null ? `${statsB.avgRating.toFixed(1)} ★` : "—" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Reading Replay</h1>
        <Link href="/stats" className="text-sm text-muted-foreground hover:text-foreground">← Stats</Link>
      </div>

      {/* Period pickers */}
      <div className="flex items-start gap-6 flex-wrap">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Period A</p>
          <div className="flex gap-1 flex-wrap">
            {years.map((y) => (
              <a
                key={y}
                href={buildUrl(y, periodB)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${y === periodA ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {y}
              </a>
            ))}
          </div>
        </div>
        <span className="text-muted-foreground font-bold pt-5">vs</span>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Period B</p>
          <div className="flex gap-1 flex-wrap">
            {years.map((y) => (
              <a
                key={y}
                href={buildUrl(periodA, y)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${y === periodB ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {y}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Summary comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div></div>
        <div className="text-center text-sm font-semibold text-primary">{periodA}</div>
        <div className="text-center text-sm font-semibold text-muted-foreground">{periodB}</div>

        {summaryRows.map(({ label, a, b }) => (
          <>
            <div key={`label-${label}`} className="text-sm text-muted-foreground self-center">{label}</div>
            <div key={`a-${label}`} className="text-center font-bold">{a}</div>
            <div key={`b-${label}`} className="text-center font-bold">{b}</div>
          </>
        ))}
      </div>

      {/* Genre comparison */}
      {allGenres.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Genres</h2>
          <div className="space-y-3">
            {allGenres.map((genre) => {
              const countA = statsA.topGenres.find((g) => g[0] === genre)?.[1] ?? 0;
              const countB = statsB.topGenres.find((g) => g[0] === genre)?.[1] ?? 0;
              return (
                <div key={genre} className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{genre}</span>
                    <span>{countA} vs {countB}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs font-medium">{periodA}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${(countA / maxGenreCount) * 100}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 text-right text-xs font-medium">{periodB}</span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted-foreground rounded-full" style={{ width: `${(countB / maxGenreCount) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {statsA.bookCount === 0 && statsB.bookCount === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No finished books found for these periods.</p>
      )}
    </div>
  );
}
