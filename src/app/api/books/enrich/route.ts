import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  const q = author
    ? `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`
    : `intitle:${encodeURIComponent(title)}`;

  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${q}&maxResults=1&printType=books` +
    (apiKey ? `&key=${apiKey}` : "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const item: GoogleBooksItem | undefined = data.items?.[0];
    if (!item) return null;

    const v = item.volumeInfo;
    const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
    const cover_url = rawCover ? rawCover.replace(/^http:\/\//, "https://") : null;

    return {
      google_books_id: item.id,
      cover_url,
      description: v.description ?? null,
      page_count: v.pageCount ?? null,
      genres: v.categories ?? null,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  void request;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Get all book_ids in the user's library
  const { data: userBooks } = await db
    .from("user_books")
    .select("book_id")
    .eq("user_id", user.id) as { data: { book_id: string }[] | null };

  if (!userBooks || userBooks.length === 0) {
    return Response.json({ enriched: 0, skipped: 0, total: 0 });
  }

  const bookIds = userBooks.map((r) => r.book_id);

  // Fetch books with null cover_url
  const { data: booksToEnrich } = await db
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

  if (!booksToEnrich || booksToEnrich.length === 0) {
    return Response.json({ enriched: 0, skipped: 0, total: 0 });
  }

  const total = booksToEnrich.length;
  let enriched = 0;
  let skipped = 0;

  // Process in batches of 5
  const BATCH = 5;
  for (let i = 0; i < booksToEnrich.length; i += BATCH) {
    const batch = booksToEnrich.slice(i, i + BATCH);

    await Promise.all(
      batch.map(async (book) => {
        const author =
          book.book_authors?.[0]?.authors?.name ?? null;

        const result = await fetchGoogleBooksData(book.title, author);

        if (!result || (!result.cover_url && !result.description && !result.genres && !result.page_count)) {
          skipped++;
          return;
        }

        // Only update fields that have values (don't overwrite with nulls)
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (result.cover_url) updates.cover_url = result.cover_url;
        if (result.description) updates.description = result.description;
        if (result.genres) updates.genres = result.genres;
        if (result.page_count) updates.page_count = result.page_count;
        if (result.google_books_id) updates.google_books_id = result.google_books_id;

        const { error } = await db
          .from("books")
          .update(updates)
          .eq("id", book.id);

        if (error) {
          skipped++;
        } else {
          enriched++;
        }
      })
    );

    // Small delay between batches to avoid rate limits
    if (i + BATCH < booksToEnrich.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return Response.json({ enriched, skipped, total });
}
