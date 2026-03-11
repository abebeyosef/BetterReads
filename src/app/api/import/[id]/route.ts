import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ReadingStatus } from "@/types/database";
import { normalizeGenres } from "@/lib/genres";

type ParsedRow = {
  title: string;
  author: string;
  isbn13: string | null;
  isbn10: string | null;
  rating: number | null;
  status: ReadingStatus;
  dateRead: string | null;
  dateAdded: string | null;
};

async function fetchGoogleBook(query: string, apiKey: string) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0] ?? null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeGoogleBook(item: any) {
  const info = item.volumeInfo ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ids: any[] = info.industryIdentifiers ?? [];
  const isbn13 = ids.find((id) => id.type === "ISBN_13")?.identifier ?? null;
  const isbn10 = ids.find((id) => id.type === "ISBN_10")?.identifier ?? null;
  let cover: string | null =
    info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null;
  if (cover) cover = cover.replace("http://", "https://");
  return {
    google_books_id: item.id as string,
    title: (info.title ?? "") as string,
    subtitle: (info.subtitle ?? null) as string | null,
    description: (info.description ?? null) as string | null,
    cover_url: cover,
    page_count: (info.pageCount ?? null) as number | null,
    published_date: (info.publishedDate ?? null) as string | null,
    language: (info.language ?? null) as string | null,
    isbn_10: isbn10 as string | null,
    isbn_13: isbn13 as string | null,
    genres: normalizeGenres(info.categories) as string[] | null,
    authors: (info.authors ?? []) as string[],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cacheBook(supabase: any, book: ReturnType<typeof normalizeGoogleBook>): Promise<string | null> {
  // Check if already cached
  let bookId: string | null = null;
  if (book.google_books_id) {
    const { data } = await supabase.from("books").select("id").eq("google_books_id", book.google_books_id).maybeSingle();
    if (data) bookId = data.id;
  }
  if (!bookId && book.isbn_13) {
    const { data } = await supabase.from("books").select("id").eq("isbn_13", book.isbn_13).maybeSingle();
    if (data) bookId = data.id;
  }

  if (!bookId) {
    const { data, error } = await supabase
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
        genres: book.genres,
      })
      .select("id")
      .single();

    if (error) {
      // Race condition — another request inserted first
      if (error.code === "23505" && book.google_books_id) {
        const { data: retry } = await supabase.from("books").select("id").eq("google_books_id", book.google_books_id).maybeSingle();
        if (retry) bookId = retry.id;
      }
    } else {
      bookId = data.id;
    }
  }

  if (!bookId) return null;

  // Upsert authors
  for (const name of book.authors) {
    let authorId: string | null = null;
    const { data: existing } = await supabase.from("authors").select("id").eq("name", name).maybeSingle();
    if (existing) {
      authorId = existing.id;
    } else {
      const { data: newAuthor } = await supabase.from("authors").insert({ name }).select("id").single();
      if (newAuthor) authorId = newAuthor.id;
    }
    if (authorId) {
      await supabase.from("book_authors").upsert(
        { book_id: bookId, author_id: authorId },
        { onConflict: "book_id,author_id", ignoreDuplicates: true }
      );
    }
  }

  return bookId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createMinimalBook(supabase: any, row: ParsedRow): Promise<string | null> {
  // Check by ISBN first to avoid duplicates
  if (row.isbn13) {
    const { data } = await supabase.from("books").select("id").eq("isbn_13", row.isbn13).maybeSingle();
    if (data) return data.id;
  }

  // Check by title + author to prevent duplicates on re-import (no ISBN available)
  if (row.title && row.author) {
    const { data: byTitle } = await supabase
      .from("books")
      .select("id, book_authors ( authors ( name ) )")
      .ilike("title", row.title.trim())
      .limit(10) as {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { id: string; book_authors: { authors: { name: string } | null }[] }[] | null;
    };

    if (byTitle && byTitle.length > 0) {
      const authorNorm = row.author.toLowerCase().trim();
      const match = byTitle.find((b) =>
        b.book_authors?.some(
          (ba) => ba.authors?.name?.toLowerCase()?.trim() === authorNorm
        )
      );
      if (match) return match.id;
    }
  } else if (row.title && !row.author) {
    // No author — match on title alone to avoid obvious duplicates
    const { data } = await supabase
      .from("books")
      .select("id")
      .ilike("title", row.title.trim())
      .maybeSingle();
    if (data) return data.id;
  }

  const { data, error } = await supabase
    .from("books")
    .insert({ title: row.title, isbn_13: row.isbn13, isbn_10: row.isbn10 })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505" && row.isbn13) {
      const { data: retry } = await supabase.from("books").select("id").eq("isbn_13", row.isbn13).maybeSingle();
      return retry?.id ?? null;
    }
    return null;
  }

  const bookId = data.id;
  if (row.author) {
    let authorId: string | null = null;
    const { data: existing } = await supabase.from("authors").select("id").eq("name", row.author).maybeSingle();
    if (existing) {
      authorId = existing.id;
    } else {
      const { data: newAuthor } = await supabase.from("authors").insert({ name: row.author }).select("id").single();
      if (newAuthor) authorId = newAuthor.id;
    }
    if (authorId) {
      await supabase.from("book_authors").upsert(
        { book_id: bookId, author_id: authorId },
        { onConflict: "book_id,author_id", ignoreDuplicates: true }
      );
    }
  }
  return bookId;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processRow(supabase: any, userId: string, importId: string, row: ParsedRow, apiKey: string): Promise<{ matched: boolean }> {
  let bookId: string | null = null;
  let matched = false;
  let matchMethod: string | null = null;

  // 1. Check local DB by isbn_13
  if (row.isbn13) {
    const { data } = await supabase.from("books").select("id").eq("isbn_13", row.isbn13).maybeSingle();
    if (data) { bookId = data.id; matched = true; matchMethod = "isbn"; }
  }

  // 2. Search Google Books by ISBN
  if (!bookId && apiKey && (row.isbn13 || row.isbn10)) {
    const isbn = row.isbn13 || row.isbn10;
    const item = await fetchGoogleBook(`isbn:${isbn}`, apiKey);
    if (item) {
      const normalized = normalizeGoogleBook(item);
      bookId = await cacheBook(supabase, normalized);
      if (bookId) { matched = true; matchMethod = "isbn"; }
    }
  }

  // 3. Search Google Books by title + author
  if (!bookId && apiKey && row.title) {
    const query = row.author ? `${row.title} ${row.author}` : row.title;
    const item = await fetchGoogleBook(query, apiKey);
    if (item) {
      const normalized = normalizeGoogleBook(item);
      bookId = await cacheBook(supabase, normalized);
      if (bookId) { matched = true; matchMethod = "title_author"; }
    }
  }

  // 4. Fall back to minimal book from CSV data
  if (!bookId) {
    bookId = await createMinimalBook(supabase, row);
  }

  if (!bookId) {
    await supabase.from("import_rows").insert({
      import_id: importId,
      raw_data: row,
      status: "unmatched",
    });
    return { matched: false };
  }

  // Upsert user_books
  await supabase.from("user_books").upsert(
    {
      user_id: userId,
      book_id: bookId,
      status: row.status,
      rating: row.rating,
      date_started: row.dateRead ? (row.dateAdded ?? null) : null,
      date_finished: row.dateRead ?? row.dateAdded,
    },
    { onConflict: "user_id,book_id" }
  );

  await supabase.from("import_rows").insert({
    import_id: importId,
    raw_data: row,
    matched_book_id: bookId,
    match_method: matchMethod,
    status: matched ? "matched" : "unmatched",
  });

  return { matched };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: importId } = await params;
  const { rows } = (await request.json()) as { rows: ParsedRow[] };
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  let matched = 0;

  // Process 5 rows concurrently
  const CONCURRENT = 5;
  for (let i = 0; i < rows.length; i += CONCURRENT) {
    const chunk = rows.slice(i, i + CONCURRENT);
    const results = await Promise.all(
      chunk.map((row) => processRow(db, user.id, importId, row, apiKey))
    );
    matched += results.filter((r) => r.matched).length;
  }

  return NextResponse.json({ processed: rows.length, matched });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: importId } = await params;
  const { matched, unmatched } = await request.json();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  await db
    .from("imports")
    .update({
      status: "completed",
      matched_rows: matched,
      unmatched_rows: unmatched,
      completed_at: new Date().toISOString(),
    })
    .eq("id", importId)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
