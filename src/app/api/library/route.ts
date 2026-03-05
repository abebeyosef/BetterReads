import { createClient } from "@/lib/supabase/server";
import { createActivityEvent } from "@/lib/activity";
import type { ReadingStatus } from "@/types/database";

/**
 * POST /api/library
 * Add a book to the user's library or update an existing entry.
 * Body: { book_id, status, rating?, date_started?, date_finished? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { book_id, status, rating, date_started, date_finished } = body as {
    book_id: string;
    status: ReadingStatus;
    rating?: number | null;
    date_started?: string | null;
    date_finished?: string | null;
  };

  if (!book_id || !status) {
    return Response.json({ error: "book_id and status are required" }, { status: 400 });
  }

  const validStatuses: ReadingStatus[] = ["want_to_read", "currently_reading", "read"];
  if (!validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status" }, { status: 400 });
  }

  if (rating !== undefined && rating !== null && (rating < 1 || rating > 5)) {
    return Response.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Snapshot existing status before upsert to detect meaningful transitions
  const { data: existing } = await db
    .from("user_books")
    .select("status")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle() as { data: { status: ReadingStatus } | null };

  const { data, error } = await db
    .from("user_books")
    .upsert(
      {
        user_id: user.id,
        book_id,
        status,
        rating: rating ?? null,
        date_started: date_started ?? null,
        date_finished: date_finished ?? null,
      },
      { onConflict: "user_id,book_id" }
    )
    .select("id, status, rating, date_started, date_finished")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Fire activity event on meaningful status transitions only
  const statusChanged = existing?.status !== status;
  if (statusChanged && (status === "currently_reading" || status === "read")) {
    const { data: book } = await db
      .from("books")
      .select("title, cover_url")
      .eq("id", book_id)
      .maybeSingle() as { data: { title: string; cover_url: string | null } | null };

    await createActivityEvent(db, {
      userId: user.id,
      eventType: status === "currently_reading" ? "started_reading" : "finished_reading",
      bookId: book_id,
      metadata: {
        book_title: book?.title ?? null,
        book_cover_url: book?.cover_url ?? null,
        ...(status === "read" ? { rating: rating ?? null } : {}),
      },
    });
  }

  return Response.json({ user_book: data });
}

/**
 * DELETE /api/library?book_id=<uuid>
 * Remove a book from the user's library.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const book_id = searchParams.get("book_id");
  if (!book_id) return Response.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("user_books")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", book_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
