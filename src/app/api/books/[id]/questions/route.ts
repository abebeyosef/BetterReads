/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const db = supabase as any;

  const { data, error } = await db
    .from("book_questions")
    .select("id, question, upvotes, user_id, book_question_votes(user_id)")
    .eq("book_id", bookId)
    .order("upvotes", { ascending: false }) as { data: { id: string; question: string; upvotes: number; user_id: string; book_question_votes: { user_id: string }[] }[] | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const questions = (data ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    upvotes: q.upvotes,
    user_id: q.user_id,
    user_voted: user ? q.book_question_votes.some((v) => v.user_id === user.id) : false,
  }));

  return NextResponse.json({ questions });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question } = await req.json() as { question: string };
  if (!question?.trim()) return NextResponse.json({ error: "Question required" }, { status: 400 });

  const db = supabase as any;
  const { error } = await db.from("book_questions").insert({
    book_id: bookId,
    user_id: user.id,
    question: question.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
