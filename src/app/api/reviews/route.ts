import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { book_id, text } = await request.json();
  if (!book_id || !text?.trim()) {
    return NextResponse.json({ error: "book_id and text are required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Get user_book_id if it exists (nullable FK)
  const { data: userBook } = await db
    .from("user_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle();

  const { data, error } = await db
    .from("reviews")
    .upsert(
      {
        user_id: user.id,
        book_id,
        user_book_id: userBook?.id ?? null,
        text: text.trim(),
      },
      { onConflict: "user_id,book_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ review: data });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const book_id = searchParams.get("book_id");
  if (!book_id) return NextResponse.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { error } = await db
    .from("reviews")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", book_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
