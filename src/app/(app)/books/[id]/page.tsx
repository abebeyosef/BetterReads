import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LibraryActions } from "./library-actions";
import type { UserBookRow } from "@/types/database";

type PageProps = { params: Promise<{ id: string }> };

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: book } = await db
    .from("books")
    .select(`*, book_authors(authors(name))`)
    .eq("id", id)
    .single();

  if (!book) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authors: string[] = book.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean) ?? [];
  const year = book.published_date?.slice(0, 4);

  // Fetch the user's existing library entry for this book (if any)
  let userBook: UserBookRow | null = null;
  if (user) {
    const { data } = await db
      .from("user_books")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", id)
      .maybeSingle() as { data: UserBookRow | null };
    userBook = data;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-10">
      {/* Hero */}
      <div className="flex gap-8">
        {/* Cover */}
        <div className="flex-shrink-0">
          <div className="relative h-56 w-36 overflow-hidden rounded-md bg-muted shadow-lg">
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={book.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
                {book.title}
              </div>
            )}
          </div>
        </div>

        {/* Info + actions */}
        <div className="space-y-3 flex-1 min-w-0">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{book.title}</h1>
            {book.subtitle && (
              <p className="text-base text-muted-foreground mt-1">{book.subtitle}</p>
            )}
          </div>

          {authors.length > 0 && (
            <p className="text-sm text-muted-foreground">
              by {authors.join(", ")}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            {book.page_count && <span>{book.page_count} pages</span>}
            {book.language && <span className="uppercase">{book.language}</span>}
          </div>

          {book.genres && book.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {book.genres.slice(0, 4).map((g: string) => (
                <span
                  key={g}
                  className="text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-0.5"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Library action panel */}
          <LibraryActions bookId={id} initialUserBook={userBook} />
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About this book
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            {book.description}
          </p>
        </div>
      )}

      <div>
        <Link
          href="/search"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to search
        </Link>
      </div>
    </div>
  );
}
