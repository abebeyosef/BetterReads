import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Full analytics dashboard coming in Phase 2.
  // For now show a simple placeholder.
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 text-center space-y-3">
      <h2 className="text-2xl font-semibold">Welcome to Shelf</h2>
      <p className="text-muted-foreground text-sm">
        Your reading dashboard is coming soon. For now, head to your profile or
        settings to get set up.
      </p>
    </div>
  );
}
