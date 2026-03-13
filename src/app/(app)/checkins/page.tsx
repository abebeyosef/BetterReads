import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Checkin = {
  id: string;
  book_id: string;
  page: number | null;
  percent: number | null;
  note: string | null;
  is_public: boolean;
  created_at: string;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    book_authors: { authors: { name: string } | null }[];
  };
};

export default async function CheckinsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: checkins } = await db
    .from("checkins")
    .select("*, books(id, title, cover_url, book_authors(authors(name)))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50) as { data: Checkin[] | null };

  // Group by book
  const bookMap: Record<string, { book: Checkin["books"]; checkins: Checkin[] }> = {};
  for (const c of checkins ?? []) {
    if (!c.books) continue;
    const bid = c.book_id;
    if (!bookMap[bid]) {
      bookMap[bid] = { book: c.books, checkins: [] };
    }
    bookMap[bid].checkins.push(c);
  }

  const groups = Object.values(bookMap);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Check-ins</h1>
        <p className="text-sm text-muted-foreground mt-1">Your reading progress log</p>
      </div>

      {groups.length === 0 ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-muted-foreground text-sm">No check-ins yet. Log your progress while reading a book.</p>
          <Link href="/library?status=currently_reading" className="text-sm font-medium underline underline-offset-4 hover:opacity-70">
            View what you&apos;re reading →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ book, checkins: bookCheckins }) => {
            const authors = book.book_authors
              ?.map((ba) => ba.authors?.name)
              .filter(Boolean)
              .join(", ");

            return (
              <div key={book.id} className="space-y-3">
                {/* Book header */}
                <Link href={`/books/${book.id}`} className="flex items-center gap-3 group">
                  <div className="relative h-14 w-9 flex-shrink-0 overflow-hidden rounded bg-muted">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-1">
                        <span className="text-xs text-muted-foreground text-center leading-tight line-clamp-3">{book.title}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium group-hover:underline">{book.title}</p>
                    {authors && <p className="text-xs text-muted-foreground">{authors}</p>}
                  </div>
                </Link>

                {/* Check-ins for this book */}
                <div className="space-y-2 pl-12">
                  {bookCheckins.map((c) => (
                    <div key={c.id} className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">
                        {c.page ? `Page ${c.page}` : c.percent ? `${c.percent}%` : "Progress logged"}
                        {" — "}
                        {new Date(c.created_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {c.is_public && <span className="ml-1 opacity-60">· public</span>}
                      </p>
                      {c.note && (
                        <p className="text-sm text-foreground/80">{c.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
