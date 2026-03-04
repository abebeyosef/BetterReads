import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import type { UserRow } from "@/types/database";

export default async function SettingsPage() {
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile and account
        </p>
      </div>

      <SettingsForm profile={profile} userId={user.id} />
    </div>
  );
}
