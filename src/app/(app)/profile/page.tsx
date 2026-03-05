import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/types/database";

// /profile redirects to the user's public profile at /users/[username]
export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("users")
    .select("username")
    .eq("id", user.id)
    .single()) as { data: Pick<UserRow, "username"> | null };

  if (!profile) redirect("/login?error=profile_missing");

  redirect(`/users/${profile.username}`);
}
