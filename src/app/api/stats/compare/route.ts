/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function computeStatsForBooks(
  books: { rating: number | null; date_finished: string | null; books: { page_count: number | null; genres: string[] | null } }[],
  year: number
) {
  const yearBooks = books.filter((b) => {
    if (!b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === year;
  });
  const pageCount = yearBooks.reduce((s, b) => s + (b.books?.page_count ?? 0), 0);
  const rated = yearBooks.filter((b) => b.rating !== null);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + (b.rating ?? 0), 0) / rated.length : null;
  const genreMap: Record<string, number> = {};
  for (const b of yearBooks) {
    const g = b.books?.genres?.[0];
    if (g) genreMap[g] = (genreMap[g] ?? 0) + 1;
  }
  const topGenre = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  return { bookCount: yearBooks.length, pageCount, avgRating, topGenre };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const periodA = parseInt(params.get("period_a") ?? "0");
  const periodB = params.get("period_b") ? parseInt(params.get("period_b")!) : null;
  const compareUser = params.get("compare_user");

  if (!periodA) return NextResponse.json({ error: "period_a required" }, { status: 400 });

  const db = supabase as any;

  const { data: myBooks } = await db
    .from("user_books")
    .select("rating, date_finished, books(page_count, genres)")
    .eq("user_id", user.id)
    .eq("status", "read") as { data: { rating: number | null; date_finished: string | null; books: { page_count: number | null; genres: string[] | null } }[] | null };

  const statsA = computeStatsForBooks(myBooks ?? [], periodA);

  let statsB = null;
  let labelB = periodB ? String(periodB) : null;

  if (periodB) {
    statsB = computeStatsForBooks(myBooks ?? [], periodB);
  } else if (compareUser) {
    // Check mutual follow
    const [{ data: iFollow }, { data: theyFollow }] = await Promise.all([
      db.from("follows").select("id").eq("follower_id", user.id).eq("following_id", compareUser).maybeSingle() as Promise<{ data: { id: string } | null }>,
      db.from("follows").select("id").eq("follower_id", compareUser).eq("following_id", user.id).maybeSingle() as Promise<{ data: { id: string } | null }>,
    ]);

    if (!iFollow || !theyFollow) {
      return NextResponse.json({ error: "Mutual follow required" }, { status: 403 });
    }

    const { data: theirProfile } = await db.from("users").select("display_name").eq("id", compareUser).single() as { data: { display_name: string } | null };
    labelB = theirProfile?.display_name ?? "Them";

    const { data: theirBooks } = await db
      .from("user_books")
      .select("rating, date_finished, books(page_count, genres)")
      .eq("user_id", compareUser)
      .eq("status", "read") as { data: { rating: number | null; date_finished: string | null; books: { page_count: number | null; genres: string[] | null } }[] | null };

    statsB = computeStatsForBooks(theirBooks ?? [], periodA);
  }

  return NextResponse.json({
    periodA,
    periodB: periodB ?? compareUser ?? null,
    labelA: String(periodA),
    labelB,
    statsA,
    statsB,
  });
}
