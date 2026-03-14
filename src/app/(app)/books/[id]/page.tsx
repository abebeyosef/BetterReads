import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LibraryActions } from "./library-actions";
import { ReviewForm } from "./review-form";
import { AddToListButton } from "./add-to-list";
import { VibeCloud } from "./vibe-cloud";
import { TempoPicker } from "./tempo-picker";
import { CharacterPicker } from "./character-picker";
import { HeadsUp } from "./heads-up";
import { CheckInButton } from "./checkin-button";
import { MarginNotes } from "./margin-notes";
import { DiscussionQuestions } from "./discussion-questions";
import type { UserBookRow } from "@/types/database";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: book } = await db
    .from("books")
    .select("title, subtitle, description, cover_url, book_authors(authors(name))")
    .eq("id", id)
    .single();

  if (!book) return { title: "Book not found — BetterReads" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const authors: string[] = book.book_authors?.map((ba: any) => ba.authors?.name).filter(Boolean) ?? [];
  const title = authors.length > 0 ? `${book.title} by ${authors.join(", ")}` : book.title;
  const description = book.description?.slice(0, 160) ?? `Track and review ${book.title} on BetterReads.`;

  return {
    title: `${title} — BetterReads`,
    description,
    openGraph: {
      title,
      description,
      ...(book.cover_url ? { images: [{ url: book.cover_url, width: 128, height: 192 }] } : {}),
    },
  };
}

type Review = {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  users: { display_name: string; username: string; avatar_url: string | null };
};

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

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

  // Fetch all user ratings for this book → compute average
  const { data: ratings } = await db
    .from("user_books")
    .select("rating")
    .eq("book_id", id)
    .not("rating", "is", null) as { data: { rating: number }[] | null };

  const ratingCount = ratings?.length ?? 0;
  const avgRating = ratingCount > 0
    ? ratings!.reduce((sum, r) => sum + r.rating, 0) / ratingCount
    : null;

  // Fetch the user's existing library entry
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

  // Fetch all reviews for this book
  const { data: reviews } = await db
    .from("reviews")
    .select("id, text, created_at, user_id, users(display_name, username, avatar_url)")
    .eq("book_id", id)
    .order("created_at", { ascending: false }) as { data: Review[] | null };

  const userReview = reviews?.find((r) => r.user_id === user?.id) ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-12">
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
            <p className="text-sm text-muted-foreground">by {authors.join(", ")}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {year && <span>{year}</span>}
            {book.page_count && <span>{book.page_count} pages</span>}
            {book.language && <span className="uppercase">{book.language}</span>}
            {avgRating !== null && (
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                {avgRating.toFixed(1)}
                <span className="opacity-60">({ratingCount} {ratingCount === 1 ? "rating" : "ratings"})</span>
              </span>
            )}
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

          <LibraryActions bookId={id} initialUserBook={userBook} />
          {user && <AddToListButton bookId={id} />}
        </div>
      </div>

      {/* Description */}
      {book.description && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            About this book
          </h2>
          <p className="text-sm leading-relaxed text-foreground/80">{book.description}</p>
        </div>
      )}

      {/* Community metadata */}
      <div className="space-y-6">
        <VibeCloud bookId={id} userId={user?.id ?? null} />
        <TempoPicker bookId={id} userId={user?.id ?? null} />
        <CharacterPicker bookId={id} userId={user?.id ?? null} />
        <HeadsUp bookId={id} userId={user?.id ?? null} />
        <DiscussionQuestions bookId={id} userId={user?.id ?? null} />
      </div>

      {/* Check-in button (currently reading) */}
      {userBook?.status === "currently_reading" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Progress
          </h2>
          <CheckInButton bookId={id} pageCount={book.page_count} />
        </div>
      )}

      {/* Margin notes (any book in library) */}
      {userBook && (
        <MarginNotes bookId={id} />
      )}

      {/* Your review */}
      {user && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Your review
          </h2>
          <ReviewForm
            bookId={id}
            initialText={userReview?.text ?? null}
            hasInLibrary={!!userBook}
          />
        </div>
      )}

      {/* Community reviews */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Community reviews
          {reviews && reviews.length > 0 && (
            <span className="ml-2 font-normal normal-case opacity-60">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          )}
        </h2>

        {!reviews || reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-medium">
                    {review.users?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={review.users.avatar_url}
                        alt={review.users.display_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground">
                        {getInitials(review.users?.display_name ?? "?")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{review.users?.display_name}</span>
                    <span className="text-xs text-muted-foreground">@{review.users?.username}</span>
                    <span className="text-xs text-muted-foreground opacity-60">
                      {new Date(review.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80 pl-9">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Link
          href="/library"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to library
        </Link>
      </div>
    </div>
  );
}
