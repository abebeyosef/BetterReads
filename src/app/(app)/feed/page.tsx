import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type EventMetadata = {
  book_title?: string;
  book_cover_url?: string;
  rating?: number | null;
  review_text?: string;
};

type FeedEvent = {
  id: string;
  event_type: string;
  created_at: string;
  metadata: EventMetadata;
  book_id: string | null;
  users: {
    display_name: string;
    username: string;
    avatar_url: string | null;
  } | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

const EVENT_LABELS: Record<string, string> = {
  started_reading: "started reading",
  finished_reading: "finished reading",
  reviewed: "reviewed",
  rated: "rated",
  added_to_library: "added to library",
};

export default async function FeedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: events } = await db
    .from("activity_events")
    .select(`
      id, event_type, created_at, metadata, book_id,
      users ( display_name, username, avatar_url )
    `)
    .order("created_at", { ascending: false })
    .limit(50) as { data: FeedEvent[] | null };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Activity</h1>

      {(!events || events.length === 0) ? (
        <div className="py-20 text-center space-y-3">
          <p className="text-muted-foreground text-sm">No activity yet.</p>
          <p className="text-xs text-muted-foreground">
            Events appear here when you or other users start reading, finish a book, or write a review.
          </p>
          <Link
            href="/search"
            className="text-sm font-medium underline underline-offset-4 hover:opacity-80"
          >
            Find something to read →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: FeedEvent }) {
  const actor = event.users;
  if (!actor) return null;

  const meta = event.metadata;
  const profileHref = `/users/${actor.username}`;

  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3">
      {/* Avatar */}
      <Link href={profileHref} className="flex-shrink-0">
        <div className="relative h-9 w-9 overflow-hidden rounded-full bg-muted">
          {actor.avatar_url ? (
            <Image
              src={actor.avatar_url}
              alt={actor.display_name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-medium text-muted-foreground">
              {getInitials(actor.display_name)}
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-sm leading-snug">
          <Link href={profileHref} className="font-semibold hover:underline">
            {actor.display_name}
          </Link>
          {" "}
          <span className="text-muted-foreground">
            {EVENT_LABELS[event.event_type] ?? event.event_type}
          </span>
          {meta.book_title && event.book_id && (
            <>
              {" "}
              <Link href={`/books/${event.book_id}`} className="font-medium hover:underline">
                {meta.book_title}
              </Link>
            </>
          )}
        </p>

        {/* Rating stars for finished_reading */}
        {event.event_type === "finished_reading" && meta.rating && (
          <p className="text-yellow-400 text-sm leading-none">
            {"★".repeat(meta.rating)}
            <span className="text-muted ml-1">{"★".repeat(5 - meta.rating)}</span>
          </p>
        )}

        {/* Review excerpt */}
        {event.event_type === "reviewed" && meta.review_text && (
          <p className="text-sm text-muted-foreground italic line-clamp-2">
            &ldquo;{meta.review_text}&rdquo;
          </p>
        )}

        <p className="text-xs text-muted-foreground">{timeAgo(event.created_at)}</p>
      </div>

      {/* Book cover thumbnail */}
      {meta.book_cover_url && event.book_id && (
        <Link href={`/books/${event.book_id}`} className="flex-shrink-0">
          <div className="relative h-14 w-9 overflow-hidden rounded bg-muted">
            <Image
              src={meta.book_cover_url}
              alt={meta.book_title ?? ""}
              fill
              className="object-cover"
              sizes="36px"
            />
          </div>
        </Link>
      )}
    </div>
  );
}
