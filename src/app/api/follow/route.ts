import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/follow
 * Body: { following_id }
 * Follows a user.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { following_id } = await request.json();
  if (!following_id) return Response.json({ error: "following_id required" }, { status: 400 });
  if (following_id === user.id) return Response.json({ error: "Cannot follow yourself" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("follows")
    .upsert(
      { follower_id: user.id, following_id },
      { onConflict: "follower_id,following_id", ignoreDuplicates: true }
    );

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

/**
 * DELETE /api/follow?following_id=<uuid>
 * Unfollows a user.
 */
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const following_id = searchParams.get("following_id");
  if (!following_id) return Response.json({ error: "following_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", following_id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
