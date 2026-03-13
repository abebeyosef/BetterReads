import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [{ data: allTypes }, { data: userFlags }] = await Promise.all([
    db.from("content_warning_types").select("id, name, category").order("category").order("name"),
    db.from("user_comfort_flags").select("warning_type_id").eq("user_id", user.id),
  ]);

  return NextResponse.json({
    all_types: allTypes ?? [],
    flagged_ids: (userFlags ?? []).map((f: { warning_type_id: string }) => f.warning_type_id),
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { warning_type_id } = await req.json();
  if (!warning_type_id) return NextResponse.json({ error: "warning_type_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Check if already flagged → toggle
  const { data: existing } = await db
    .from("user_comfort_flags")
    .select("id")
    .eq("user_id", user.id)
    .eq("warning_type_id", warning_type_id)
    .maybeSingle();

  if (existing) {
    await db
      .from("user_comfort_flags")
      .delete()
      .eq("user_id", user.id)
      .eq("warning_type_id", warning_type_id);
    return NextResponse.json({ action: "removed" });
  } else {
    await db
      .from("user_comfort_flags")
      .insert({ user_id: user.id, warning_type_id });
    return NextResponse.json({ action: "added" });
  }
}
