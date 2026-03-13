import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
type VoteType = "plot_driven" | "character_driven";

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: votes, error } = await db
    .from("book_character_votes")
    .select("vote_type, user_id")
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = { plot_driven: 0, character_driven: 0 };
  let userVote: string | null = null;

  for (const vote of votes ?? []) {
    if (vote.vote_type in counts) {
      counts[vote.vote_type as VoteType] += 1;
    }
    if (user && vote.user_id === user.id) {
      userVote = vote.vote_type;
    }
  }

  const total = counts.plot_driven + counts.character_driven;

  return NextResponse.json({
    plot_driven: counts.plot_driven,
    character_driven: counts.character_driven,
    user_vote: userVote,
    total,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { vote_type } = await req.json();
  const valid: VoteType[] = ["plot_driven", "character_driven"];
  if (!valid.includes(vote_type)) {
    return NextResponse.json({ error: "Invalid vote_type" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_character_votes")
    .upsert(
      { book_id: bookId, user_id: user.id, vote_type },
      { onConflict: "book_id,user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_character_votes")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
