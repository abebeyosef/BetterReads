import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/library/clear
 * Removes ALL user_books entries for the authenticated user.
 * Requires a confirmation token in the body to prevent accidental calls.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "clear-library") {
    return Response.json({ error: "Missing confirmation token" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("user_books")
    .delete()
    .eq("user_id", user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
