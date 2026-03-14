/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; questionId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { questionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabase as any;

  // Check if already voted
  const { data: existing } = await db
    .from("book_question_votes")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  if (existing) {
    // Remove vote
    const { error } = await db
      .from("book_question_votes")
      .delete()
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ voted: false });
  } else {
    // Add vote
    const { error } = await db
      .from("book_question_votes")
      .insert({ question_id: questionId, user_id: user.id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ voted: true });
  }
}
