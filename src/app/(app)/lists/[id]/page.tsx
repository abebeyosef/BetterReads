import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/types/database";
import { ShareButton, RemoveBookButton, ListOwnerPanel } from "./list-client";

type PageProps = { params: Promise<{ id: string }> };

type ListBook = {
  position: number;
  book_id: string;
  books: {
    id: string;
    title: string;
    cover_url: string | null;
    published_date: string | null;
    book_authors: { authors: { name: string } | null }[];
  } | null;
};

type ListData = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  user_id: string;
  created_at: string;
  users: Pick<UserRow, "display_name" | "username"> | null;
};

export default async function ListDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: list } = await db
    .from("lists")
    .select("id, title, description, is_public, user_id, created_at, users ( display_name, username )")
    .eq("id", id)
    .maybeSingle() as { data: ListData | null };

  if (!list) notFound();
  if (!list.is_public && list.user_id !== user.id) notFound();

  const { data: listBooks } = await db
    .from("list_books")
    .select(`
      position, book_id,
      books ( id, title, cover_url, published_date, book_authors ( authors ( name ) ) )
    `)
    .eq("list_id", id)
    .order("position") as { data: ListBook[] | null };

  const isOwner = list.user_id === user.id;
  const books = listBooks ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{list.title}</h1>
              <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                {list.is_public ? "Public" : "Private"}
              </span>
            </div>
            {list.description && (
              <p className="text-sm text-muted-foreground">{list.description}</p>
            )}
            <p className="text-xs text-muted-foreground">
              by{" "}
              <Link href={`/users/${list.users?.username}`} className="hover:underline">
                {list.users?.display_name}
              </Link>
              {" · "}
              {books.length} {books.length === 1 ? "book" : "books"}
            </p>
          </div>

          <div className="flex flex-col gap-2 items-end">
            {list.is_public && <ShareButton listId={id} />}
            {isOwner && (
              <ListOwnerPanel
                listId={id}
                title={list.title}
                description={list.description}
                isPublic={list.is_public}
              />
            )}
          </div>
        </div>
      </div>

      {/* Book grid */}
      {books.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm text-muted-foreground">No books in this list yet.</p>
          {isOwner && (
            <p className="text-xs text-muted-foreground">
              Open any{" "}
              <Link href="/search" className="underline underline-offset-2 hover:opacity-80">
                book page
              </Link>{" "}
              and use &ldquo;Save to list&rdquo; to add books here.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((entry) => {
            const book = entry.books;
            if (!book) return null;
            const authors = book.book_authors
              ?.map((ba) => ba.authors?.name)
              .filter(Boolean)
              .join(", ");
            const year = book.published_date?.slice(0, 4);

            return (
              <div key={entry.book_id} className="group relative space-y-2">
                <Link href={`/books/${book.id}`}>
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
                      <div className="flex h-full w-full items-center justify-center p-3 text-center">
                        <span className="text-xs text-muted-foreground line-clamp-4">{book.title}</span>
                      </div>
                    )}
                  </div>
                </Link>
                <div>
                  <p className="text-sm font-medium leading-tight line-clamp-2">{book.title}</p>
                  {authors && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{authors}</p>}
                  {year && <p className="text-xs text-muted-foreground">{year}</p>}
                </div>
                {isOwner && <RemoveBookButton listId={id} bookId={entry.book_id} />}
              </div>
            );
          })}
        </div>
      )}

      <Link href="/lists" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        ← My lists
      </Link>
    </div>
  );
}
