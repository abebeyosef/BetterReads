import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function updateStreak(db: ReturnType<typeof Object.create>, userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: streak } = await db
    .from("reading_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!streak) {
    await db.from("reading_streaks").insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
    });
    return;
  }

  if (streak.last_activity_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const newStreak = streak.last_activity_date === yesterday ? streak.current_streak + 1 : 1;
  const longestStreak = Math.max(newStreak, streak.longest_streak);

  await db.from("reading_streaks").update({
    current_streak: newStreak,
    longest_streak: longestStreak,
    last_activity_date: today,
  }).eq("user_id", userId);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get("book_id");

  if (bookId) {
    const { data: checkins, error } = await db
      .from("checkins")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ checkins: checkins ?? [] });
  }

  // Full history with book info
  const { data: checkins, error } = await db
    .from("checkins")
    .select("*, books(id, title, cover_url, book_authors(authors(name)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checkins: checkins ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { book_id, page, percent, note, is_public } = body;

  if (!book_id) return NextResponse.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: checkin, error } = await db
    .from("checkins")
    .insert({
      user_id: user.id,
      book_id,
      page: page ?? null,
      percent: percent ?? null,
      note: note ?? null,
      is_public: is_public ?? false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update reading streak
  await updateStreak(db, user.id);

  return NextResponse.json({ checkin });
}
