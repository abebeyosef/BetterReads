import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { UserRow, ReadingStatus } from "@/types/database";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: UserRow | null };

  if (!profile) redirect("/login?error=profile_missing");

  const { data: stats } = (await supabase
    .from("user_books")
    .select("status")
    .eq("user_id", user.id)) as { data: { status: ReadingStatus }[] | null };

  const counts = {
    read: stats?.filter((b) => b.status === "read").length ?? 0,
    currently_reading:
      stats?.filter((b) => b.status === "currently_reading").length ?? 0,
    want_to_read:
      stats?.filter((b) => b.status === "want_to_read").length ?? 0,
  };

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      {/* Avatar + name */}
      <div className="flex items-center gap-6">
        <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full bg-muted">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
              {getInitials(profile.display_name)}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <p className="text-xs text-muted-foreground">
            Member since {memberSince}
          </p>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-foreground/80 leading-relaxed">
          {profile.bio}
        </p>
      )}

      {/* Reading stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Read" value={counts.read} />
        <StatCard label="Reading" value={counts.currently_reading} />
        <StatCard label="Want to read" value={counts.want_to_read} />
      </div>

      {/* Edit button */}
      <div>
        <Link
          href="/settings"
          className="inline-flex rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Edit profile
        </Link>
      </div>
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
