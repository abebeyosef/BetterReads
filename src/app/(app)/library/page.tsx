import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ReadingStatus } from "@/types/database";
import { EnrichBooksButton } from "./enrich-button";
import { WavesIllo } from "@/components/illustrations/WavesIllo";
import { FernIllo } from "@/components/illustrations/FernIllo";

type SortOption = "recent" | "finished" | "rating" | "title";

type PageProps = {
  searchParams: Promise<{ status?: string; sort?: string }>;
};

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: "Want to read",
  currently_reading: "Reading",
  read: "Read",
};

const TABS: ReadingStatus[] = ["currently_reading", "want_to_read", "read"];

type LibraryEntry = {
  id: string;
  status: ReadingStatus;
  rating: number | null;
  date_started: string | null;
  date_finished: string | null;
  created_at: string;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    published_date: string | null;
    book_authors: { authors: { name: string } | null }[];
  };
};

export default async function LibraryPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { status: rawStatus, sort: rawSort } = await searchParams;
  const activeStatus: ReadingStatus =
    rawStatus === "want_to_read" || rawStatus === "read"
      ? rawStatus
      : "currently_reading";
  const sort: SortOption =
    rawSort === "finished" || rawSort === "rating" || rawSort === "title"
      ? rawSort
      : "recent";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: entries } = await db
    .from("user_books")
    .select(`
      id, status, rating, date_started, date_finished, created_at,
      books (
        id, title, cover_url, published_date,
        book_authors ( authors ( name ) )
      )
    `)
    .eq("user_id", user.id)
    .eq("status", activeStatus) as { data: LibraryEntry[] | null };

  const sorted = sortEntries(entries ?? [], sort);

  // Count per status for tab badges
  const { data: counts } = await db
    .from("user_books")
    .select("status")
    .eq("user_id", user.id) as { data: { status: ReadingStatus }[] | null };

  const countMap = {
    currently_reading: counts?.filter((r) => r.status === "currently_reading").length ?? 0,
    want_to_read: counts?.filter((r) => r.status === "want_to_read").length ?? 0,
    read: counts?.filter((r) => r.status === "read").length ?? 0,
  };

  // Count books in user's library missing a cover
  let nullCoverCount = 0;
  const { data: userBookIds } = await db
    .from("user_books")
    .select("book_id")
    .eq("user_id", user.id) as { data: { book_id: string }[] | null };

  if (userBookIds && userBookIds.length > 0) {
    const ids = userBookIds.map((r) => r.book_id);
    const { count } = await db
      .from("books")
      .select("id", { count: "exact", head: true })
      .in("id", ids)
      .is("cover_url", null) as { count: number | null };
    nullCoverCount = count ?? 0;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      {/* Hero banner with waves illustration */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border card-warm px-6 py-5">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Library</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {countMap.read + countMap.currently_reading + countMap.want_to_read} books total
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add books
          </Link>
        </div>
        <WavesIllo className="absolute bottom-0 left-0 w-full h-24 opacity-60" />
      </div>

      <EnrichBooksButton nullCoverCount={nullCoverCount} />

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((s) => (
          <Link
            key={s}
            href={`/library?status=${s}&sort=${sort}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeStatus === s
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {STATUS_LABELS[s]}
            <span className="ml-1.5 text-xs opacity-60">{countMap[s]}</span>
          </Link>
        ))}
      </div>

      {/* Sort controls */}
      {sorted.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Sort:</span>
          {(["recent", "rating", "title", ...(activeStatus === "read" ? ["finished"] : [])] as SortOption[]).map(
            (s) => (
              <Link
                key={s}
                href={`/library?status=${activeStatus}&sort=${s}`}
                className={`capitalize hover:text-foreground transition-colors ${
                  sort === s ? "text-foreground font-medium" : ""
                }`}
              >
                {s === "recent" ? "Recently added" : s === "finished" ? "Finish date" : s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            )
          )}
        </div>
      )}

      {/* Results */}
      {sorted.length === 0 ? (
        <EmptyState status={activeStatus} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sorted.map((entry) => (
            <BookCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function sortEntries(entries: LibraryEntry[], sort: SortOption): LibraryEntry[] {
  return [...entries].sort((a, b) => {
    if (sort === "title") {
      return (a.books?.title ?? "").localeCompare(b.books?.title ?? "");
    }
    if (sort === "rating") {
      return (b.rating ?? 0) - (a.rating ?? 0);
    }
    if (sort === "finished") {
      return (b.date_finished ?? "").localeCompare(a.date_finished ?? "");
    }
    // recent (default): by created_at desc
    return b.created_at.localeCompare(a.created_at);
  });
}

function BookCard({ entry }: { entry: LibraryEntry }) {
  const book = entry.books;
  if (!book) return null;

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
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center">
            <span className="text-xs text-muted-foreground line-clamp-4">
              {book.title}
            </span>
          </div>
        )}
        {entry.rating && (
          <div className="absolute bottom-1 right-1 rounded bg-background/80 backdrop-blur px-1.5 py-0.5 text-xs font-medium">
            {"★".repeat(entry.rating)}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{book.title}</p>
        {authors && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{authors}</p>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ status }: { status: ReadingStatus }) {
  const messages: Record<ReadingStatus, { text: string; cta: string; href: string }> = {
    currently_reading: { text: "Nothing in progress yet.", cta: "Find something to read", href: "/search" },
    want_to_read: { text: "Your reading list is empty.", cta: "Discover books", href: "/search" },
    read: { text: "No books marked as read yet.", cta: "Import from Goodreads", href: "/import" },
  };
  const { text, cta, href } = messages[status];
  return (
    <div className="py-12 text-center space-y-4">
      <FernIllo className="mx-auto w-40 h-32 opacity-70" />
      <p className="text-muted-foreground text-sm">{text}</p>
      <Link
        href={href}
        className="text-sm font-medium text-foreground underline underline-offset-4 hover:opacity-80"
      >
        {cta} →
      </Link>
    </div>
  );
}
