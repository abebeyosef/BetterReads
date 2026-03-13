import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Book = {
  id: string;
  title: string;
  cover_url: string | null;
  genres: string[] | null;
  page_count: number | null;
  book_authors: { authors: { name: string } | null }[];
};

function BookCard({ book }: { book: Book }) {
  const authors = book.book_authors
    ?.map((ba) => ba.authors?.name)
    .filter(Boolean)
    .join(", ");

  return (
    <Link href={`/books/${book.id}`} className="group space-y-2">
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
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
}

function Section({ title, books }: { title: string; books: Book[] }) {
  if (books.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}

export default async function DiscoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Get user's library book IDs (to exclude)
  const { data: userBookIds } = await db
    .from("user_books")
    .select("book_id")
    .eq("user_id", user.id) as { data: { book_id: string }[] | null };

  const excludeIds: string[] = (userBookIds ?? []).map((r) => r.book_id);

  // Get user preferences
  const { data: prefs } = await db
    .from("user_reading_preferences")
    .select("genres")
    .eq("user_id", user.id)
    .maybeSingle();

  const userGenres: string[] = prefs?.genres ?? [];

  // Fetch all sections in parallel
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: trendingRaw },
    { data: shortReadsRaw },
    { data: lastFinishedRaw },
  ] = await Promise.all([
    // Trending: most-added books in last 7 days
    db
      .from("user_books")
      .select("book_id")
      .gte("created_at", sevenDaysAgo) as Promise<{ data: { book_id: string }[] | null }>,

    // Short reads: page_count < 250
    db
      .from("books")
      .select("id, title, cover_url, genres, page_count, book_authors(authors(name))")
      .lt("page_count", 250)
      .not("page_count", "is", null)
      .limit(20) as Promise<{ data: Book[] | null }>,

    // Last finished book for "Because you loved X"
    db
      .from("user_books")
      .select("book_id, books(id, title, genres, cover_url, page_count, book_authors(authors(name)))")
      .eq("user_id", user.id)
      .eq("status", "read")
      .order("date_finished", { ascending: false })
      .limit(1) as Promise<{ data: { book_id: string; books: Book }[] | null }>,
  ]);

  // Build trending book IDs with counts
  const trendingCountMap: Record<string, number> = {};
  for (const row of trendingRaw ?? []) {
    trendingCountMap[row.book_id] = (trendingCountMap[row.book_id] ?? 0) + 1;
  }

  const trendingIds = Object.entries(trendingCountMap)
    .filter(([id]) => !excludeIds.includes(id))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id]) => id);

  // Fetch trending book details
  let trendingBooks: Book[] = [];
  if (trendingIds.length > 0) {
    const { data } = await db
      .from("books")
      .select("id, title, cover_url, genres, page_count, book_authors(authors(name))")
      .in("id", trendingIds) as { data: Book[] | null };
    trendingBooks = data ?? [];
  }

  // Short reads: exclude user's library
  const shortReads = (shortReadsRaw ?? [])
    .filter((b) => !excludeIds.includes(b.id))
    .slice(0, 6);

  // Made for you: books with matching genres
  let madeForYou: Book[] = [];
  if (userGenres.length > 0) {
    // Use overlap filter via containedBy/overlaps - use simple contains check
    const { data: genreBooks } = await db
      .from("books")
      .select("id, title, cover_url, genres, page_count, book_authors(authors(name))")
      .contains("genres", [userGenres[0]])  // filter by at least the first preferred genre
      .limit(30) as { data: Book[] | null };

    madeForYou = (genreBooks ?? [])
      .filter((b) => !excludeIds.includes(b.id))
      .slice(0, 6);
  }

  // Because you loved X
  const lastFinished = lastFinishedRaw?.[0]?.books ?? null;
  let becauseYouLoved: Book[] = [];
  const lastFinishedTitle = lastFinished?.title ?? null;

  if (lastFinished?.genres && lastFinished.genres.length > 0) {
    const { data: similar } = await db
      .from("books")
      .select("id, title, cover_url, genres, page_count, book_authors(authors(name))")
      .contains("genres", [lastFinished.genres[0]])
      .neq("id", lastFinished.id)
      .limit(20) as { data: Book[] | null };

    becauseYouLoved = (similar ?? [])
      .filter((b) => !excludeIds.includes(b.id))
      .slice(0, 4);
  }

  const hasPrefs = userGenres.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-10">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">What&apos;s Next?</h1>
        <Link
          href="/discover/find"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Filter books →
        </Link>
      </div>

      {!hasPrefs && (
        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Tell us what you like to get personalised recommendations.
          </p>
          <Link
            href="/onboarding"
            className="text-sm font-medium underline underline-offset-4 hover:opacity-70"
          >
            Set your reading preferences →
          </Link>
        </div>
      )}

      {hasPrefs && madeForYou.length > 0 && (
        <Section title="Made for You" books={madeForYou} />
      )}

      {lastFinishedTitle && becauseYouLoved.length > 0 && (
        <Section
          title={`Because you read ${lastFinishedTitle}`}
          books={becauseYouLoved}
        />
      )}

      {trendingBooks.length > 0 && (
        <Section title="Trending this week" books={trendingBooks} />
      )}

      {shortReads.length > 0 && (
        <Section title="Short reads (under 250 pages)" books={shortReads} />
      )}

      {madeForYou.length === 0 && trendingBooks.length === 0 && shortReads.length === 0 && (
        <div className="py-12 text-center space-y-3">
          <p className="text-muted-foreground text-sm">
            Not enough books in the database yet to show recommendations.
          </p>
          <Link href="/search" className="text-sm font-medium underline underline-offset-4 hover:opacity-70">
            Search for books to add →
          </Link>
        </div>
      )}
    </div>
  );
}
