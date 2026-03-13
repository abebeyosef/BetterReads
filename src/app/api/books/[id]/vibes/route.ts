import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: votes, error } = await db
    .from("book_vibes")
    .select("vibe_id, user_id, vibes(id, name)")
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const vibeMap: Record<string, { id: string; name: string; count: number; userVoted: boolean }> = {};
  for (const vote of votes ?? []) {
    const vibeId = vote.vibe_id;
    const vibeName = vote.vibes?.name ?? vibeId;
    if (!vibeMap[vibeId]) {
      vibeMap[vibeId] = { id: vibeId, name: vibeName, count: 0, userVoted: false };
    }
    vibeMap[vibeId].count += 1;
    if (user && vote.user_id === user.id) {
      vibeMap[vibeId].userVoted = true;
    }
  }

  const vibes = Object.values(vibeMap)
    .sort((a, b) => b.count - a.count)
    .map(({ id, name, count, userVoted }) => ({
      id,
      name,
      count,
      user_voted: userVoted,
    }));

  return NextResponse.json({ vibes });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  let vibeId = body.vibe_id as string | undefined;

  // If vibe_name provided, look up or create the vibe
  if (!vibeId && body.vibe_name) {
    const { data: existing } = await db
      .from("vibes")
      .select("id")
      .eq("name", body.vibe_name)
      .maybeSingle();

    if (existing) {
      vibeId = existing.id;
    } else {
      // Create the vibe
      const { data: created } = await db
        .from("vibes")
        .insert({ name: body.vibe_name })
        .select("id")
        .single();
      vibeId = created?.id;
    }
  }

  if (!vibeId) return NextResponse.json({ error: "vibe_id or vibe_name required" }, { status: 400 });

  // Check max 5 vibes per user per book
  const { count } = await db
    .from("book_vibes")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId)
    .eq("user_id", user.id) as { count: number | null };

  if ((count ?? 0) >= 5) {
    return NextResponse.json({ error: "Max 5 vibes per book" }, { status: 400 });
  }

  // Check not already voted for this vibe
  const { data: existingVote } = await db
    .from("book_vibes")
    .select("id")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .eq("vibe_id", vibeId)
    .maybeSingle();

  if (existingVote) {
    return NextResponse.json({ ok: true, already: true });
  }

  const { error } = await db
    .from("book_vibes")
    .insert({ user_id: user.id, book_id: bookId, vibe_id: vibeId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vibeId = searchParams.get("vibe_id");
  if (!vibeId) return NextResponse.json({ error: "vibe_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_vibes")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .eq("vibe_id", vibeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
