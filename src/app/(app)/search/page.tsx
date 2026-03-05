"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";
import type { BookSearchResult } from "@/types/books";

function SearchInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    initialQ.length >= 2 ? "loading" : "idle"
  );
  const [cachingId, setCachingId] = useState<string | null>(null);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    const mine = ++seq.current;

    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (mine !== seq.current) return;
      setResults(data.results ?? []);
      setStatus("done");
    } catch {
      if (mine !== seq.current) return;
      setStatus("error");
    }
  }, []);

  // Auto-run search if a ?q= param was passed (e.g. from a recommendation link)
  useEffect(() => {
    if (initialQ.length >= 2) {
      runSearch(initialQ);
    }
    // Only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(q), 300);
  }

  async function handleBookClick(book: BookSearchResult) {
    const key = book.google_books_id ?? book.isbn_13 ?? book.title;
    setCachingId(key);

    try {
      const res = await fetch("/api/books/cache", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(book),
      });
      const data = await res.json();
      if (data.book_id) {
        router.push(`/books/${data.book_id}`);
      }
    } finally {
      setCachingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Search for a book, author, or ISBN…"
          className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {status === "loading" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-destructive text-center py-8">
          Something went wrong. Please try again.
        </p>
      )}

      {status === "done" && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No books found for &ldquo;{query}&rdquo;
        </p>
      )}

      {status === "done" && results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((book) => {
            const key = book.google_books_id ?? book.isbn_13 ?? book.title;
            return (
              <BookCard
                key={key}
                book={book}
                loading={cachingId === key}
                onClick={() => handleBookClick(book)}
              />
            );
          })}
        </div>
      )}

      {status === "idle" && (
        <p className="text-sm text-muted-foreground text-center py-16">
          Start typing to search millions of books
        </p>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-11 w-full rounded-lg bg-muted animate-pulse" />
      </div>
    }>
      <SearchInner />
    </Suspense>
  );
}

function BookCard({ book, loading, onClick }: { book: BookSearchResult; loading: boolean; onClick: () => void }) {
  const year = book.published_date?.slice(0, 4);
  return (
    <button onClick={onClick} disabled={loading} className="group text-left space-y-2 disabled:opacity-60">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center">
            <span className="text-xs text-muted-foreground line-clamp-4">{book.title}</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{book.title}</p>
        {book.authors.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{book.authors.join(", ")}</p>
        )}
        {year && <p className="text-xs text-muted-foreground">{year}</p>}
      </div>
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="aspect-[2/3] w-full rounded-md bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}
