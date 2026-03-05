import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/lists/[id]/books
 * Body: { book_id }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const { book_id } = await request.json();
  if (!book_id) return Response.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify ownership
  const { data: list } = await db
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  if (!list) return Response.json({ error: "List not found" }, { status: 404 });

  // Use current count as position so each add appends to the end
  const { count } = await db
    .from("list_books")
    .select("book_id", { count: "exact", head: true })
    .eq("list_id", listId) as { count: number | null };

  const { error } = await db
    .from("list_books")
    .upsert(
      { list_id: listId, book_id, position: (count ?? 0) + 1 },
      { onConflict: "list_id,book_id", ignoreDuplicates: true }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

/**
 * DELETE /api/lists/[id]/books?book_id=<uuid>
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: listId } = await params;
  const { searchParams } = new URL(request.url);
  const book_id = searchParams.get("book_id");
  if (!book_id) return Response.json({ error: "book_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Verify ownership
  const { data: list } = await db
    .from("lists")
    .select("id")
    .eq("id", listId)
    .eq("user_id", user.id)
    .maybeSingle() as { data: { id: string } | null };

  if (!list) return Response.json({ error: "List not found" }, { status: 404 });

  const { error } = await db
    .from("list_books")
    .delete()
    .eq("list_id", listId)
    .eq("book_id", book_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
