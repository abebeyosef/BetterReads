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

  // Google Books returns http:// thumbnail URLs — upgrade to https://
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
    `?q=${encodeURIComponent(query)}&maxResults=20&printType=books` +
    (apiKey ? `&key=${apiKey}` : "");

  const res = await fetch(url, {
    next: { revalidate: 60 }, // Cache identical queries for 60 s
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map(parseGoogleBook);
}

// ── Open Library (fallback) ───────────────────────────────────────────────────

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
    description: null, // OL search endpoint doesn't return description
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
    `?q=${encodeURIComponent(query)}&limit=20&fields=key,title,subtitle,author_name,first_publish_year,language,isbn,subject,cover_i`;

  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.docs ?? []).map(parseOpenLibraryDoc);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return Response.json({ results: [] });
  }

  const results = await searchGoogleBooks(q);

  if (results.length > 0) {
    return Response.json({ results });
  }

  // Google Books returned nothing — try Open Library
  const fallback = await searchOpenLibrary(q);
  return Response.json({ results: fallback });
}
