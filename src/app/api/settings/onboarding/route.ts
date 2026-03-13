import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { genres, topics, pace_preference } = await req.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const [{ error: prefError }, { error: userError }] = await Promise.all([
    db
      .from("user_reading_preferences")
      .upsert(
        {
          user_id: user.id,
          genres: genres ?? [],
          topics: topics ?? [],
          pace_preference: pace_preference ?? null,
          preferred_formats: [],
        },
        { onConflict: "user_id" }
      ),
    db
      .from("users")
      .update({ onboarding_completed: true })
      .eq("id", user.id),
  ]);

  if (prefError || userError) {
    return NextResponse.json({ error: prefError?.message ?? userError?.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
