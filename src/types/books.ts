/**
 * Normalized shape returned by the /api/books/search route.
 * Produced from either Google Books or Open Library raw API responses.
 */
export type BookSearchResult = {
  google_books_id: string | null;
  open_library_id: string | null;
  title: string;
  subtitle: string | null;
  authors: string[];
  cover_url: string | null;
  description: string | null;
  page_count: number | null;
  published_date: string | null;
  language: string | null;
  isbn_10: string | null;
  isbn_13: string | null;
  genres: string[] | null;
};
