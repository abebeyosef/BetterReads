import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };
type Severity = "a_lot" | "some" | "briefly";

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Get all flags for this book
  const { data: flags, error } = await db
    .from("book_content_warnings")
    .select("warning_type_id, severity, user_id, content_warning_types(id, name, category)")
    .eq("book_id", bookId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get user's comfort flags
  let comfortFlagIds: Set<string> = new Set();
  if (user) {
    const { data: comfortFlags } = await db
      .from("user_comfort_flags")
      .select("warning_type_id")
      .eq("user_id", user.id);
    comfortFlagIds = new Set((comfortFlags ?? []).map((f: { warning_type_id: string }) => f.warning_type_id));
  }

  // Aggregate by warning_type_id
  const warningMap: Record<string, {
    type_id: string;
    name: string;
    category: string;
    a_lot: number;
    some: number;
    briefly: number;
    total: number;
    user_severity: string | null;
    is_comfort_flag: boolean;
  }> = {};

  for (const flag of flags ?? []) {
    const typeId = flag.warning_type_id;
    const typeName = flag.content_warning_types?.name ?? typeId;
    const typeCategory = flag.content_warning_types?.category ?? "Other";

    if (!warningMap[typeId]) {
      warningMap[typeId] = {
        type_id: typeId,
        name: typeName,
        category: typeCategory,
        a_lot: 0,
        some: 0,
        briefly: 0,
        total: 0,
        user_severity: null,
        is_comfort_flag: comfortFlagIds.has(typeId),
      };
    }

    const severity = flag.severity as Severity;
    if (severity in warningMap[typeId]) {
      warningMap[typeId][severity] += 1;
    }
    warningMap[typeId].total += 1;

    if (user && flag.user_id === user.id) {
      warningMap[typeId].user_severity = flag.severity;
    }
  }

  const warnings = Object.values(warningMap)
    .filter((w) => w.total > 0)
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ warnings });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { warning_type_id, severity } = await req.json();
  const validSeverities: Severity[] = ["a_lot", "some", "briefly"];
  if (!warning_type_id || !validSeverities.includes(severity)) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_content_warnings")
    .upsert(
      { book_id: bookId, user_id: user.id, warning_type_id, severity },
      { onConflict: "book_id,user_id,warning_type_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id: bookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const warningTypeId = searchParams.get("warning_type_id");
  if (!warningTypeId) return NextResponse.json({ error: "warning_type_id required" }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { error } = await db
    .from("book_content_warnings")
    .delete()
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .eq("warning_type_id", warningTypeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
