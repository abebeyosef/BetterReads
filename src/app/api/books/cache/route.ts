import { createClient } from "@/lib/supabase/server";
import type { BookSearchResult } from "@/types/books";

/**
 * POST /api/books/cache
 * Body: BookSearchResult
 *
 * Checks if the book already exists in the local DB (by google_books_id or isbn_13).
 * If not, inserts it (plus authors + book_authors).
 * Returns { book_id: string } — the canonical local UUID for this book.
 */
export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const book: BookSearchResult = await request.json();

  if (!book.title) {
    return Response.json({ error: "Invalid book data" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // ── Check for existing record ─────────────────────────────────────────────
  if (book.google_books_id) {
    const { data: existing } = await db
      .from("books")
      .select("id")
      .eq("google_books_id", book.google_books_id)
      .maybeSingle();

    if (existing) return Response.json({ book_id: existing.id });
  }

  if (!book.google_books_id && book.isbn_13) {
    const { data: existing } = await db
      .from("books")
      .select("id")
      .eq("isbn_13", book.isbn_13)
      .maybeSingle();

    if (existing) return Response.json({ book_id: existing.id });
  }

  // ── Insert book ───────────────────────────────────────────────────────────
  const { data: inserted, error: insertError } = await db
    .from("books")
    .insert({
      title: book.title,
      subtitle: book.subtitle,
      description: book.description,
      cover_url: book.cover_url,
      page_count: book.page_count,
      published_date: book.published_date,
      language: book.language,
      isbn_10: book.isbn_10,
      isbn_13: book.isbn_13,
      google_books_id: book.google_books_id,
      open_library_id: book.open_library_id,
      genres: book.genres,
    })
    .select("id")
    .single();

  if (insertError) {
    // Race condition: another request inserted the same book between our check and insert
    if (insertError.code === "23505" && book.google_books_id) {
      const { data: existing } = await db
        .from("books")
        .select("id")
        .eq("google_books_id", book.google_books_id)
        .single();
      if (existing) return Response.json({ book_id: existing.id });
    }
    return Response.json({ error: insertError.message }, { status: 500 });
  }

  const bookId: string = inserted.id;

  // ── Insert authors ────────────────────────────────────────────────────────
  for (const authorName of book.authors) {
    if (!authorName.trim()) continue;

    // Check if author already exists (by name — not unique-constrained in DB,
    // so we do a manual lookup to avoid duplicates)
    const { data: existingAuthor } = await db
      .from("authors")
      .select("id")
      .eq("name", authorName.trim())
      .maybeSingle();

    let authorId: string;

    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const { data: newAuthor, error: authorError } = await db
        .from("authors")
        .insert({ name: authorName.trim() })
        .select("id")
        .single();

      if (authorError || !newAuthor) continue;
      authorId = newAuthor.id;
    }

    // Link book ↔ author — upsert with ignoreDuplicates handles the PK conflict
    await db
      .from("book_authors")
      .upsert(
        { book_id: bookId, author_id: authorId },
        { onConflict: "book_id,author_id", ignoreDuplicates: true }
      );
  }

  return Response.json({ book_id: bookId });
}
