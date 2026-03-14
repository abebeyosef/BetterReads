import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  q?: string;
  genre?: string;
  min_pages?: string;
  max_pages?: string;
  fiction?: string;
  owned?: string;
}>;

type Book = {
  id: string;
  title: string;
  cover_url: string | null;
  genres: string[] | null;
  page_count: number | null;
  description: string | null;
  book_authors: { authors: { name: string } | null }[];
};

const GENRE_OPTIONS = [
  "Fantasy", "Sci-Fi", "Literary Fiction", "Romance", "Mystery/Thriller",
  "Historical Fiction", "Horror", "Non-Fiction", "Biography", "Self-Help",
  "YA", "Short Stories",
];

export default async function FindPage({ searchParams }: { searchParams: SearchParams }) {
  const { q, genre, min_pages, max_pages, fiction, owned } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // If "owned" filter is on, get user's owned book IDs first
  let ownedBookIds: string[] | null = null;
  if (owned === "true" && user) {
    const { data: ownedRows } = await db
      .from("user_books")
      .select("book_id")
      .eq("user_id", user.id)
      .eq("is_owned", true) as { data: { book_id: string }[] | null };
    ownedBookIds = (ownedRows ?? []).map((r) => r.book_id);
  }

  let query = db
    .from("books")
    .select("id, title, cover_url, genres, page_count, description, book_authors(authors(name))")
    .limit(30);

  if (q) {
    query = query.ilike("title", `%${q}%`);
  }

  if (genre) {
    query = query.contains("genres", [genre]);
  }

  if (min_pages) {
    query = query.gte("page_count", parseInt(min_pages));
  }

  if (max_pages) {
    query = query.lte("page_count", parseInt(max_pages));
  }

  // Fiction / Non-Fiction filter
  if (fiction === "fiction") {
    query = query.contains("genres", ["Fiction"]);
  } else if (fiction === "nonfiction") {
    query = query.contains("genres", ["Nonfiction"]);
  }

  // Books I Own filter
  if (ownedBookIds !== null) {
    if (ownedBookIds.length === 0) {
      query = query.in("id", ["none"]); // no results
    } else {
      query = query.in("id", ownedBookIds);
    }
  }

  const { data: books } = await query as { data: Book[] | null };

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const all = { q, genre, min_pages, max_pages, fiction, owned, ...overrides };
    for (const [k, v] of Object.entries(all)) {
      if (v) params.set(k, v);
    }
    return `/discover/find?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Find Books</h1>
        <Link href="/discover" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Discover
        </Link>
      </div>

      {/* Filter bar */}
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        {/* Search */}
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by title..."
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {genre && <input type="hidden" name="genre" value={genre} />}
          {min_pages && <input type="hidden" name="min_pages" value={min_pages} />}
          {max_pages && <input type="hidden" name="max_pages" value={max_pages} />}
          {fiction && <input type="hidden" name="fiction" value={fiction} />}
          {owned && <input type="hidden" name="owned" value={owned} />}
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Search
          </button>
        </form>

        {/* Fiction / Non-Fiction toggle */}
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
          <span>Type:</span>
          {[
            { label: "All", value: undefined },
            { label: "Fiction", value: "fiction" },
            { label: "Non-fiction", value: "nonfiction" },
          ].map(({ label, value }) => (
            <Link
              key={label}
              href={buildUrl({ fiction: value })}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                fiction === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Genre filter pills */}
        <div className="flex flex-wrap gap-2">
          <Link
            href={buildUrl({ genre: undefined })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              !genre ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All genres
          </Link>
          {GENRE_OPTIONS.map((g) => (
            <Link
              key={g}
              href={buildUrl({ genre: genre === g ? undefined : g })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                genre === g ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g}
            </Link>
          ))}
        </div>

        {/* Page count filters */}
        <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
          <span>Length:</span>
          {[
            { label: "Any", min: undefined, max: undefined },
            { label: "Short (<200)", min: undefined, max: "200" },
            { label: "Medium (200–400)", min: "200", max: "400" },
            { label: "Long (400+)", min: "400", max: undefined },
          ].map(({ label, min, max }) => (
            <Link
              key={label}
              href={buildUrl({ min_pages: min, max_pages: max })}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                min_pages === min && max_pages === max
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Books I Own filter */}
        {user && (
          <div className="flex flex-wrap gap-2 items-center text-xs text-muted-foreground">
            <span>Shelf:</span>
            <Link
              href={buildUrl({ owned: owned === "true" ? undefined : "true" })}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                owned === "true"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Only books on my shelf
            </Link>
          </div>
        )}
      </div>

      {/* Results */}
      {books && books.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {books.map((book) => {
            const authors = book.book_authors
              ?.map((ba) => ba.authors?.name)
              .filter(Boolean)
              .join(", ");
            return (
              <Link key={book.id} href={`/books/${book.id}`} className="group space-y-2">
                <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
                  {book.cover_url ? (
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 17vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center">
                      <span className="text-xs text-muted-foreground line-clamp-4">{book.title}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{book.title}</p>
                  {authors && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{authors}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-muted-foreground text-sm">
            {q || genre || fiction || owned ? "No books match your filters." : "Use the filters above to find books."}
          </p>
        </div>
      )}
    </div>
  );
}
