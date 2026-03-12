import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/labels
 * Returns all labels for the current user.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("labels")
    .select("id, name, color, created_at")
    .eq("user_id", user.id)
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ labels: data ?? [] });
}

/**
 * POST /api/labels
 * Create a new label.
 * Body: { name, color? }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await request.json() as { name: string; color?: string };
  if (!name?.trim()) return Response.json({ error: "name required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("labels")
    .insert({ user_id: user.id, name: name.trim(), color: color ?? "#a8856e" })
    .select("id, name, color, created_at")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ label: data }, { status: 201 });
}

/**
 * DELETE /api/labels?id=<uuid>
 * Delete a label (and all user_book_labels rows via CASCADE).
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("labels")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
