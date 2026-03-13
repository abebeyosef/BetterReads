import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
type TempoType = "slow_burn" | "steady" | "page_turner";

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: votes, error } = await db
    .from("book_tempo_votes")
    .select("tempo, user_id")
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const counts = { slow_burn: 0, steady: 0, page_turner: 0 };
  let userVote: string | null = null;

  for (const vote of votes ?? []) {
    if (vote.tempo in counts) {
      counts[vote.tempo as TempoType] += 1;
    }
    if (user && vote.user_id === user.id) {
      userVote = vote.tempo;
    }
  }

  const total = counts.slow_burn + counts.steady + counts.page_turner;

  return NextResponse.json({
    slow_burn: counts.slow_burn,
    steady: counts.steady,
    page_turner: counts.page_turner,
    user_vote: userVote,
    total,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tempo } = await req.json();
  const valid: TempoType[] = ["slow_burn", "steady", "page_turner"];
  if (!valid.includes(tempo)) {
    return NextResponse.json({ error: "Invalid tempo" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_tempo_votes")
    .upsert(
      { book_id: bookId, user_id: user.id, tempo },
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
    .from("book_tempo_votes")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
