import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/lists?book_id=<optional>
 * Returns the user's lists. If book_id is provided, each list includes has_book boolean.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const bookId = request.nextUrl.searchParams.get("book_id");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: lists, error } = await db
    .from("lists")
    .select("id, title, is_public")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any[] | null;
    error: unknown;
  };

  if (error) return Response.json({ error: "Failed to fetch lists" }, { status: 500 });
  if (!lists) return Response.json({ lists: [] });

  if (!bookId) return Response.json({ lists });

  // Determine which lists already contain this book
  const { data: listBooks } = await db
    .from("list_books")
    .select("list_id")
    .eq("book_id", bookId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .in("list_id", lists.map((l: any) => l.id)) as { data: { list_id: string }[] | null };

  const listIdsWithBook = new Set((listBooks ?? []).map((lb) => lb.list_id));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return Response.json({ lists: lists.map((l: any) => ({ ...l, has_book: listIdsWithBook.has(l.id) })) });
}

/**
 * POST /api/lists
 * Body: { title, description?, is_public? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description, is_public } = await request.json();
  if (!title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("lists")
    .insert({
      user_id: user.id,
      title: title.trim(),
      description: description?.trim() || null,
      is_public: is_public ?? true,
    })
    .select("*")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ list: data }, { status: 201 });
}
