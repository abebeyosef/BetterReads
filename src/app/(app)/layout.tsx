import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import type { UserRow } from "@/types/database";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = (await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()) as { data: UserRow | null };

  if (!profile) {
    // Trigger failed to create profile row — sign out and redirect
    await supabase.auth.signOut();
    redirect("/login?error=profile_missing");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNav profile={profile} />
      <main>{children}</main>
    </div>
  );
}
