/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = parseInt(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString());
  const month = req.nextUrl.searchParams.get("month") ? parseInt(req.nextUrl.searchParams.get("month")!) : null;

  const db = supabase as any;

  const { data: books } = await db
    .from("user_books")
    .select("rating, date_finished, date_started, format, books(id, title, cover_url, page_count, genres, book_authors(authors(name)))")
    .eq("user_id", user.id)
    .eq("status", "read")
    .not("date_finished", "is", null) as { data: { rating: number | null; date_finished: string; date_started: string | null; format: string | null; books: { id: string; title: string; cover_url: string | null; page_count: number | null; genres: string[] | null; book_authors: { authors: { name: string } | null }[] } }[] | null };

  const filtered = (books ?? []).filter((b) => {
    const d = new Date(b.date_finished);
    if (d.getFullYear() !== year) return false;
    if (month !== null && (d.getMonth() + 1) !== month) return false;
    return true;
  });

  const bookCount = filtered.length;
  const pageCount = filtered.reduce((sum, b) => sum + (b.books?.page_count ?? 0), 0);

  // Top genres
  const genreMap: Record<string, number> = {};
  for (const b of filtered) {
    for (const g of b.books?.genres ?? []) genreMap[g] = (genreMap[g] ?? 0) + 1;
  }
  const topGenre = Object.entries(genreMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const topVibes: string[] = [];

  // Avg rating
  const rated = filtered.filter((b) => b.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : null;

  // Loved book (highest rated)
  const lovedBook = rated.length > 0
    ? rated.reduce((best, b) => (b.rating ?? 0) > (best.rating ?? 0) ? b : best).books?.title
    : null;

  // Fastest read
  const withDates = filtered
    .filter((b) => b.date_started)
    .map((b) => ({
      title: b.books?.title,
      days: Math.round((new Date(b.date_finished).getTime() - new Date(b.date_started!).getTime()) / 86400000),
    }))
    .filter((b) => b.days >= 0);
  const fastestRead = withDates.length > 0 ? withDates.reduce((min, b) => b.days < min.days ? b : min) : null;

  // Cover URLs for display (up to 5)
  const covers = filtered.slice(0, 5).map((b) => b.books?.cover_url ?? null).filter(Boolean);

  return NextResponse.json({
    year,
    month,
    bookCount,
    pageCount,
    topGenre,
    topVibes,
    avgRating,
    lovedBook,
    fastestRead,
    covers,
  });
}
