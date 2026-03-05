import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { UserRow, ReadingStatus } from "@/types/database";
import { FollowButton } from "./follow-button";

type PageProps = { params: Promise<{ username: string }> };

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (!currentUser) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Look up the profile by username
  const { data: profile } = await db
    .from("users")
    .select("*")
    .eq("username", username)
    .maybeSingle() as { data: UserRow | null };

  if (!profile) notFound();

  const isOwnProfile = profile.id === currentUser.id;

  // Fetch stats, follower counts, recent reads, and follow state in parallel
  const [
    { data: statsRows },
    { data: followersRows },
    { data: followingRows },
    { data: isFollowingRow },
    { data: recentReads },
    { data: recentReviews },
  ] = await Promise.all([
    db
      .from("user_books")
      .select("status")
      .eq("user_id", profile.id) as Promise<{ data: { status: ReadingStatus }[] | null }>,
    db
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id) as Promise<{ data: null; count: number | null }>,
    db
      .from("follows")
      .select("following_id", { count: "exact", head: true })
      .eq("follower_id", profile.id) as Promise<{ data: null; count: number | null }>,
    isOwnProfile
      ? Promise.resolve({ data: null })
      : db
          .from("follows")
          .select("follower_id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id)
          .maybeSingle() as Promise<{ data: { follower_id: string } | null }>,
    db
      .from("user_books")
      .select(`
        book_id,
        books ( id, title, cover_url )
      `)
      .eq("user_id", profile.id)
      .eq("status", "read")
      .order("date_finished", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6) as Promise<{
      data: { book_id: string; books: { id: string; title: string; cover_url: string | null } | null }[] | null;
    }>,
    db
      .from("reviews")
      .select(`
        id, text, created_at,
        books ( id, title, cover_url )
      `)
      .eq("user_id", profile.id)
      .eq("is_private", false)
      .order("created_at", { ascending: false })
      .limit(3) as Promise<{
      data: {
        id: string;
        text: string;
        created_at: string;
        books: { id: string; title: string; cover_url: string | null } | null;
      }[] | null;
    }>,
  ]);

  const counts = {
    read: statsRows?.filter((b) => b.status === "read").length ?? 0,
    currently_reading: statsRows?.filter((b) => b.status === "currently_reading").length ?? 0,
    want_to_read: statsRows?.filter((b) => b.status === "want_to_read").length ?? 0,
  };

  const followerCount = (followersRows as unknown as { count: number | null })?.count ?? 0;
  const followingCount = (followingRows as unknown as { count: number | null })?.count ?? 0;
  const isFollowing = !!isFollowingRow;

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-10">
      {/* Header */}
      <div className="flex items-start gap-6">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-muted">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
              {getInitials(profile.display_name)}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
            {isOwnProfile ? (
              <Link
                href="/settings"
                className="flex-shrink-0 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Edit profile
              </Link>
            ) : (
              <FollowButton followingId={profile.id} initialIsFollowing={isFollowing} />
            )}
          </div>

          {/* Follower counts */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{followerCount}</span> followers</span>
            <span><span className="font-semibold text-foreground">{followingCount}</span> following</span>
            <span className="text-xs">Member since {memberSince}</span>
          </div>

          {profile.bio && (
            <p className="text-sm text-foreground/80 leading-relaxed">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Reading stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Read" value={counts.read} />
        <StatCard label="Reading" value={counts.currently_reading} />
        <StatCard label="Want to read" value={counts.want_to_read} />
      </div>

      {/* Recent reads */}
      {recentReads && recentReads.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recently read
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {recentReads.map((entry) => {
              const book = entry.books;
              if (!book) return null;
              return (
                <Link key={entry.book_id} href={`/books/${book.id}`} className="group">
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded bg-muted">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        sizes="(max-width: 640px) 33vw, 17vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-1 text-center">
                        <span className="text-[10px] text-muted-foreground line-clamp-3">{book.title}</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent reviews */}
      {recentReviews && recentReviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent reviews
          </h2>
          <div className="space-y-3">
            {recentReviews.map((review) => {
              const book = review.books;
              if (!book) return null;
              return (
                <div key={review.id} className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <Link href={`/books/${book.id}`} className="text-sm font-medium hover:underline">
                    {book.title}
                  </Link>
                  <p className="text-sm text-muted-foreground line-clamp-3">{review.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state */}
      {counts.read === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm text-muted-foreground">No books read yet.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
