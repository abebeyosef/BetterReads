/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReadingCard } from "@/components/stats/ReadingCard";
import { ReadingCardDownload } from "./reading-card-download";

type SearchParams = Promise<{ year?: string; month?: string }>;

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default async function ReadingCardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { year: rawYear, month: rawMonth } = await searchParams;
  const currentYear = new Date().getFullYear();

  const year = rawYear ? parseInt(rawYear) : currentYear;
  const month = rawMonth ? parseInt(rawMonth) : null;

  const db = supabase as any;

  const { data: books } = await db
    .from("user_books")
    .select("rating, date_finished, date_started, books(id, title, cover_url, page_count, genres)")
    .eq("user_id", user.id)
    .eq("status", "read")
    .not("date_finished", "is", null) as { data: { rating: number | null; date_finished: string; date_started: string | null; books: { id: string; title: string; cover_url: string | null; page_count: number | null; genres: string[] | null } }[] | null };

  const filtered = (books ?? []).filter((b) => {
    const d = new Date(b.date_finished);
    if (d.getFullYear() !== year) return false;
    if (month !== null && (d.getMonth() + 1) !== month) return false;
    return true;
  });

  const bookCount = filtered.length;
  const pageCount = filtered.reduce((sum, b) => sum + (b.books?.page_count ?? 0), 0);
  const genreMap: Record<string, number> = {};
  for (const b of filtered) for (const g of b.books?.genres ?? []) genreMap[g] = (genreMap[g] ?? 0) + 1;
  const topGenre = Object.entries(genreMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const rated = filtered.filter((b) => b.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : null;
  const lovedBook = rated.length > 0
    ? rated.reduce((best, b) => (b.rating ?? 0) > (best.rating ?? 0) ? b : best).books?.title ?? null
    : null;
  const withDates = filtered
    .filter((b) => b.date_started)
    .map((b) => ({
      title: b.books?.title ?? "",
      days: Math.round((new Date(b.date_finished).getTime() - new Date(b.date_started!).getTime()) / 86400000),
    }))
    .filter((b) => b.days >= 0);
  const fastestRead = withDates.length > 0 ? withDates.reduce((min, b) => b.days < min.days ? b : min) : null;
  const covers = filtered.slice(0, 5).map((b) => b.books?.cover_url ?? null).filter(Boolean) as string[];

  const data = { year, month, bookCount, pageCount, topGenre, topVibes: [], avgRating, lovedBook, fastestRead, covers };

  // Period picker: generate year options
  const yearOptions: number[] = [];
  for (const b of books ?? []) {
    const y = new Date(b.date_finished).getFullYear();
    if (!yearOptions.includes(y)) yearOptions.push(y);
  }
  if (!yearOptions.includes(currentYear)) yearOptions.push(currentYear);
  yearOptions.sort((a, b) => b - a);

  function buildUrl(y: number, m: number | null) {
    const p = new URLSearchParams({ year: String(y) });
    if (m) p.set("month", String(m));
    return `/stats/reading-card?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Reading Card</h1>
        <Link href="/stats" className="text-sm text-muted-foreground hover:text-foreground">← Stats</Link>
      </div>

      {/* Period picker */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground">Year:</span>
        {yearOptions.map((y) => (
          <a
            key={y}
            href={buildUrl(y, month)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${y === year ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {y}
          </a>
        ))}
        <span className="text-xs text-muted-foreground ml-2">Month:</span>
        <a
          href={buildUrl(year, null)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${!month ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        >
          Full year
        </a>
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          return (
            <a
              key={m}
              href={buildUrl(year, m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${month === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              {name.slice(0, 3)}
            </a>
          );
        })}
      </div>

      {/* Card */}
      <ReadingCard data={data} />

      {/* Download button */}
      <ReadingCardDownload />
    </div>
  );
}
