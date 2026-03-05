import { type NextRequest } from "next/server";
import type { BookSearchResult } from "@/types/books";

// ── Google Books ──────────────────────────────────────────────────────────────

type GoogleBooksItem = {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    publishedDate?: string;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
    categories?: string[];
  };
};

function parseGoogleBook(item: GoogleBooksItem): BookSearchResult {
  const v = item.volumeInfo;
  const ids = v.industryIdentifiers ?? [];
  const rawCover = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null;
  const cover_url = rawCover ? rawCover.replace(/^http:\/\//, "https://") : null;

  return {
    google_books_id: item.id,
    open_library_id: null,
    title: v.title ?? "Untitled",
    subtitle: v.subtitle ?? null,
    authors: v.authors ?? [],
    cover_url,
    description: v.description ?? null,
    page_count: v.pageCount ?? null,
    published_date: v.publishedDate ?? null,
    language: v.language ?? null,
    isbn_10: ids.find((x) => x.type === "ISBN_10")?.identifier ?? null,
    isbn_13: ids.find((x) => x.type === "ISBN_13")?.identifier ?? null,
    genres: v.categories ?? null,
  };
}

async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url =
    `https://www.googleapis.com/books/v1/volumes` +
    `?q=${encodeURIComponent(query)}&maxResults=40&printType=books` +
    (apiKey ? `&key=${apiKey}` : "");

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []).map(parseGoogleBook);
  } catch {
    return [];
  }
}

// ── Open Library ──────────────────────────────────────────────────────────────

type OLDoc = {
  key: string;
  title?: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  language?: string[];
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
};

function parseOpenLibraryDoc(doc: OLDoc): BookSearchResult {
  const isbns = doc.isbn ?? [];
  const isbn13 = isbns.find((i) => i.length === 13) ?? null;
  const isbn10 = isbns.find((i) => i.length === 10) ?? null;
  const cover_url = doc.cover_i
    ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
    : null;

  return {
    google_books_id: null,
    open_library_id: doc.key.replace("/works/", ""),
    title: doc.title ?? "Untitled",
    subtitle: doc.subtitle ?? null,
    authors: doc.author_name ?? [],
    cover_url,
    description: null,
    page_count: null,
    published_date: doc.first_publish_year?.toString() ?? null,
    language: doc.language?.[0] ?? null,
    isbn_10: isbn10,
    isbn_13: isbn13,
    genres: doc.subject?.slice(0, 5) ?? null,
  };
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  const url =
    `https://openlibrary.org/search.json` +
    `?q=${encodeURIComponent(query)}&limit=20` +
    `&fields=key,title,subtitle,author_name,first_publish_year,language,isbn,subject,cover_i`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs ?? []).map(parseOpenLibraryDoc);
  } catch {
    return [];
  }
}

// ── Merge + deduplicate ───────────────────────────────────────────────────────

function mergeResults(
  google: BookSearchResult[],
  openLibrary: BookSearchResult[]
): BookSearchResult[] {
  const seenIsbn13 = new Set(google.map((b) => b.isbn_13).filter(Boolean));
  const seenTitles = new Set(
    google.map((b) => `${b.title.toLowerCase()}|${b.authors[0]?.toLowerCase() ?? ""}`)
  );

  const extras = openLibrary.filter((b) => {
    if (b.isbn_13 && seenIsbn13.has(b.isbn_13)) return false;
    const key = `${b.title.toLowerCase()}|${b.authors[0]?.toLowerCase() ?? ""}`;
    if (seenTitles.has(key)) return false;
    return true;
  });

  return [...google, ...extras];
}

// ── Relevance + popularity ranking ───────────────────────────────────────────
// Scoring: relevance (0–100) dominates, popularity (0–20) is the tiebreaker.
// The merged array preserves Google's original order, which is popularity-based,
// so the position index is a reliable popularity proxy.

function relevanceScore(result: BookSearchResult, query: string): number {
  const q = query.toLowerCase().trim();
  const title = result.title.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);

  if (title === q) return 100;
  if (title.startsWith(q)) return 90;
  if (title.includes(q)) return 80;

  const matched = words.filter((w) => title.includes(w)).length;
  return Math.round((matched / words.length) * 60);
}

function rankResults(results: BookSearchResult[], query: string): BookSearchResult[] {
  const total = results.length;
  return [...results]
    .map((r, i) => {
      // Popularity: earlier in Google's results = higher score (max 20)
      const popularity = Math.round(((total - i) / total) * 20);
      return { r, score: relevanceScore(r, query) + popularity };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ r }) => r);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  // Run both sources in parallel — no cache so results are always fresh
  const [googleResults, olResults] = await Promise.all([
    searchGoogleBooks(q),
    searchOpenLibrary(q),
  ]);

  const merged = mergeResults(googleResults, olResults);
  const results = rankResults(merged, q);
  return Response.json({ results });
}
