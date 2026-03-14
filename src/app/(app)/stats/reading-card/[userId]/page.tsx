/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReadingCard } from "@/components/stats/ReadingCard";

type PageProps = { params: Promise<{ userId: string }>; searchParams: Promise<{ year?: string; month?: string }> };

export default async function PublicReadingCardPage({ params, searchParams }: PageProps) {
  const { userId } = await params;
  const { year: rawYear, month: rawMonth } = await searchParams;

  const supabase = await createClient();
  const db = supabase as any;

  const { data: profile } = await db
    .from("users")
    .select("display_name, username")
    .eq("id", userId)
    .single() as { data: { display_name: string; username: string } | null };
  if (!profile) notFound();

  const year = rawYear ? parseInt(rawYear) : new Date().getFullYear();
  const month = rawMonth ? parseInt(rawMonth) : null;

  const { data: books } = await db
    .from("user_books")
    .select("rating, date_finished, date_started, books(cover_url, page_count, genres, title)")
    .eq("user_id", userId)
    .eq("status", "read")
    .not("date_finished", "is", null) as { data: { rating: number | null; date_finished: string; date_started: string | null; books: { cover_url: string | null; page_count: number | null; genres: string[] | null; title: string } }[] | null };

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <p className="text-sm text-muted-foreground">
        {profile.display_name}&apos;s Reading Card
      </p>
      <ReadingCard data={data} />
    </div>
  );
}
