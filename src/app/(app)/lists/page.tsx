import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CreateListForm } from "./create-list-form";

type ListEntry = {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  list_books: { books: { cover_url: string | null } | null }[];
};

export default async function ListsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: lists } = await (supabase as any)
    .from("lists")
    .select("id, title, description, is_public, created_at, list_books ( books ( cover_url ) )")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false }) as { data: ListEntry[] | null };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">My Lists</h1>

      <CreateListForm />

      {!lists || lists.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No lists yet. Create one above to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => <ListCard key={list.id} list={list} />)}
        </div>
      )}
    </div>
  );
}

function ListCard({ list }: { list: ListEntry }) {
  const covers = list.list_books
    ?.map((lb) => lb.books?.cover_url)
    .filter((url): url is string => !!url)
    .slice(0, 4);
  const bookCount = list.list_books?.length ?? 0;

  return (
    <Link
      href={`/lists/${list.id}`}
      className="group rounded-lg border border-border bg-card p-4 space-y-3 hover:border-foreground/30 transition-colors"
    >
      {/* Cover mosaic */}
      <div className={`grid gap-1 h-16 overflow-hidden rounded ${covers.length > 1 ? "grid-cols-4" : "grid-cols-1"}`}>
        {covers.length > 0 ? (
          <>
            {covers.map((url, i) => (
              <div key={i} className="relative overflow-hidden rounded bg-muted">
                <Image src={url} alt="" fill className="object-cover" sizes="60px" />
              </div>
            ))}
            {covers.length < 4 &&
              Array.from({ length: 4 - covers.length }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded bg-muted" />
              ))}
          </>
        ) : (
          <div className="h-full rounded bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground">No books yet</span>
          </div>
        )}
      </div>

      <div>
        <p className="font-medium text-sm group-hover:underline">{list.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {bookCount} {bookCount === 1 ? "book" : "books"} · {list.is_public ? "Public" : "Private"}
        </p>
        {list.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{list.description}</p>
        )}
      </div>
    </Link>
  );
}
