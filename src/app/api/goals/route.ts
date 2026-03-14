/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString();
  const db = supabase as any;

  const { data, error } = await db
    .from("reading_goals")
    .select("id, goal_type, target")
    .eq("user_id", user.id)
    .eq("year", parseInt(year)) as { data: { id: string; goal_type: string; target: number }[] | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data ?? [] });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { year: number; goals: { goal_type: string; target: number }[] };
  const { year, goals } = body;
  if (!year || !Array.isArray(goals)) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const db = supabase as any;

  // Delete existing goals for this year, then insert new ones
  await db.from("reading_goals").delete().eq("user_id", user.id).eq("year", year);

  const toInsert = goals
    .filter((g) => g.target > 0)
    .map((g) => ({ user_id: user.id, year, goal_type: g.goal_type, target: g.target }));

  if (toInsert.length > 0) {
    const { error } = await db.from("reading_goals").insert(toInsert);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
