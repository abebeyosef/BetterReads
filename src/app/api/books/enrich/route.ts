import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeGenres } from "@/lib/genres";

type GoogleBooksItem = {
  id: string;
  volumeInfo: {
    title?: string;
    description?: string;
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    categories?: string[];
  };
};

async function fetchGoogleBooksData(
  title: string,
  author: string | null
): Promise<{
  google_books_id: string | null;
  cover_url: string | null;
  description: string | null;
  page_count: number | null;
  genres: string[] | null;
} | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  // Plain "title author" query — no intitle:/inauthor: operators.
  // Operators require the colon to be unencoded, but encodeURIComponent encodes
  // colons as %3A, which breaks queries for titles like "The Everything Store: Jeff Bezos…".
  // URLSearchParams handles all encoding correctly as a single q value.
  const q = [title, author].filter(Boolean).join(" ");
  const params = new URLSearchParams({ q, maxResults: "1", printType: "books" });
  if (apiKey) params.set("key", apiKey);
  const url = `https://www.googleapis.com/books/v1/volumes?${params}`;

  // Log the URL with the API key redacted so we can debug in Vercel logs
  console.log(`[enrich] GET ${url.replace(apiKey ?? "NOKEY", "***")}`);

  try {
    const res = await fetch(url, { cache: "no-store" });
    console.log(`[enrich] status=${res.status} title="${title}"`);
    if (!res.ok) return null;
    const data = await res.json();
    const item: GoogleBooksItem | undefined = data.items?.[0];
    if (!item) {
      console.log(`[enrich] no results for "${title}"`);
      return null;
    }

    const v = item.volumeInfo;
    const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
    const cover_url = rawCover ? rawCover.replace(/^http:\/\//, "https://") : null;

    return {
      google_books_id: item.id,
      cover_url,
      description: v.description ?? null,
      page_count: v.pageCount ?? null,
      genres: normalizeGenres(v.categories),
    };
  } catch (err) {
    console.error(`[enrich] fetch error for "${title}":`, err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // How many books to process in this call (default 15 to stay well within timeout)
  const limit = Math.min(
    parseInt(request.nextUrl.searchParams.get("limit") ?? "15"),
    50
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Get all book_ids in the user's library
  const { data: userBooks } = await db
    .from("user_books")
    .select("book_id")
    .eq("user_id", user.id) as { data: { book_id: string }[] | null };

  if (!userBooks || userBooks.length === 0) {
    return Response.json({ enriched: 0, skipped: 0, total: 0, remaining: 0 });
  }

  const bookIds = userBooks.map((r) => r.book_id);

  // Fetch books with null cover_url
  const { data: allBooksToEnrich } = await db
    .from("books")
    .select(`
      id, title,
      book_authors ( authors ( name ) )
    `)
    .in("id", bookIds)
    .is("cover_url", null) as {
    data: {
      id: string;
      title: string;
      book_authors: { authors: { name: string } | null }[];
    }[] | null;
  };

  if (!allBooksToEnrich || allBooksToEnrich.length === 0) {
    return Response.json({ enriched: 0, skipped: 0, total: 0, remaining: 0 });
  }

  // Only process up to `limit` books; return how many are left for the next call
  const booksToEnrich = allBooksToEnrich.slice(0, limit);
  const remaining = allBooksToEnrich.length - booksToEnrich.length;

  let enriched = 0;
  let skipped = 0;

  // Process in batches of 3 with a 500ms delay between batches
  const BATCH = 3;
  for (let i = 0; i < booksToEnrich.length; i += BATCH) {
    const batch = booksToEnrich.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (book) => {
        const author = book.book_authors?.[0]?.authors?.name ?? null;
        const result = await fetchGoogleBooksData(book.title, author);

        if (!result || (!result.cover_url && !result.description && !result.genres && !result.page_count)) {
          skipped++;
          return;
        }

        // Only update fields that have values — don't overwrite with nulls
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (result.cover_url) updates.cover_url = result.cover_url;
        if (result.description) updates.description = result.description;
        if (result.genres) updates.genres = result.genres;
        if (result.page_count) updates.page_count = result.page_count;
        if (result.google_books_id) updates.google_books_id = result.google_books_id;

        const { error } = await db.from("books").update(updates).eq("id", book.id);

        if (error) {
          skipped++;
        } else {
          enriched++;
        }
      })
    );

    // 500ms delay between batches to avoid hitting rate limits
    if (i + BATCH < booksToEnrich.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return Response.json({ enriched, skipped, total: booksToEnrich.length, remaining });
}
