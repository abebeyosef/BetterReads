import { createClient } from "@/lib/supabase/server";

function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields
    .map((f) => {
      if (f === null || f === undefined) return "";
      const str = String(f);
      // Escape quotes and wrap in quotes if needed
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
    .join(",");
}

/**
 * GET /api/export
 * Download the user's full library as a CSV file.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  type ExportRow = {
    status: string;
    extended_status: string | null;
    is_loved: boolean;
    is_owned: boolean;
    format: string | null;
    rating: number | null;
    date_started: string | null;
    date_finished: string | null;
    created_at: string;
    books: {
      title: string;
      subtitle: string | null;
      published_date: string | null;
      page_count: number | null;
      isbn_13: string | null;
      isbn_10: string | null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      book_authors: { authors: { name: string } | null }[];
    } | null;
  };

  const { data, error } = await db
    .from("user_books")
    .select(`
      status,
      extended_status,
      is_loved,
      is_owned,
      format,
      rating,
      date_started,
      date_finished,
      created_at,
      books (
        title,
        subtitle,
        published_date,
        page_count,
        isbn_13,
        isbn_10,
        book_authors ( authors ( name ) )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as { data: ExportRow[] | null; error: { message: string } | null };

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const STATUS_LABELS: Record<string, string> = {
    want_to_read: "Up Next",
    currently_reading: "Reading Now",
    read: "Finished",
  };

  const EXTENDED_LABELS: Record<string, string> = {
    on_hold: "On Hold",
    left_behind: "Left Behind",
  };

  const header = csvRow([
    "Title",
    "Subtitle",
    "Author(s)",
    "Status",
    "Extended Status",
    "Rating",
    "Format",
    "Loved",
    "Owned",
    "Date Started",
    "Date Finished",
    "Published Year",
    "Page Count",
    "ISBN-13",
    "ISBN-10",
    "Date Added",
  ]);

  const rows = (data ?? []).map((entry) => {
    const book = entry.books;
    const authors =
      book?.book_authors
        ?.map((ba) => ba.authors?.name)
        .filter(Boolean)
        .join("; ") ?? "";

    return csvRow([
      book?.title,
      book?.subtitle,
      authors,
      STATUS_LABELS[entry.status] ?? entry.status,
      entry.extended_status ? EXTENDED_LABELS[entry.extended_status] ?? entry.extended_status : "",
      entry.rating,
      entry.format ?? "",
      entry.is_loved ? "Yes" : "No",
      entry.is_owned ? "Yes" : "No",
      entry.date_started ?? "",
      entry.date_finished ?? "",
      book?.published_date?.slice(0, 4) ?? "",
      book?.page_count,
      book?.isbn_13 ?? "",
      book?.isbn_10 ?? "",
      entry.created_at.slice(0, 10),
    ]);
  });

  const csv = [header, ...rows].join("\n");
  const filename = `betterreads-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
