import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PageProps = { params: Promise<{ id: string }> };

export default async function BookDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: book } = await (supabase as any)
    .from("books")
    .select(`*, book_authors(authors(name))`)
    .eq("id", id)
    .single();

  if (!book) notFound();

  const authors: string[] =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    book.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean) ?? [];

  const year = book.published_date?.slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
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

        {/* Info */}
        <div className="space-y-3 flex-1 min-w-0">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{book.title}</h1>
            {book.subtitle && (
              <p className="text-base text-muted-foreground mt-1">
                {book.subtitle}
              </p>
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

          {/* Library management coming in Step 6 */}
          <div className="pt-2">
            <p className="text-xs text-muted-foreground bg-muted inline-flex rounded px-2 py-1">
              Library actions coming soon
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="mt-8 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About this book
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">
            {book.description}
          </p>
        </div>
      )}

      <div className="mt-8">
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
