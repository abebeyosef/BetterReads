import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/labels/book?book_id=<uuid>
 * Returns label IDs attached to the user's user_book entry for this book.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const book_id = searchParams.get("book_id");
  if (!book_id) return Response.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: ub } = await db
    .from("user_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle() as { data: { id: string } | null };

  if (!ub) return Response.json({ label_ids: [] });

  const { data } = await db
    .from("user_book_labels")
    .select("label_id")
    .eq("user_book_id", ub.id) as { data: { label_id: string }[] | null };

  return Response.json({ label_ids: data?.map((r) => r.label_id) ?? [] });
}

/**
 * PUT /api/labels/book
 * Replace the full set of labels for a user_book entry.
 * Body: { book_id, label_ids: string[] }
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { book_id, label_ids } = await request.json() as {
    book_id: string;
    label_ids: string[];
  };
  if (!book_id) return Response.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: ub } = await db
    .from("user_books")
    .select("id")
    .eq("user_id", user.id)
    .eq("book_id", book_id)
    .maybeSingle() as { data: { id: string } | null };

  if (!ub) return Response.json({ error: "Book not in library" }, { status: 404 });

  // Delete existing, then insert new
  await db.from("user_book_labels").delete().eq("user_book_id", ub.id);

  if (label_ids.length > 0) {
    await db.from("user_book_labels").insert(
      label_ids.map((lid) => ({ user_book_id: ub.id, label_id: lid }))
    );
  }

  return Response.json({ ok: true });
}
