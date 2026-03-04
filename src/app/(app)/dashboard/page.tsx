import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Shelf</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </header>

      <main className="px-6 py-12 max-w-2xl mx-auto text-center space-y-4">
        <h2 className="text-2xl font-semibold">You&apos;re in!</h2>
        <p className="text-muted-foreground">
          Signed in as <strong>{user.email}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          Dashboard coming in Step 4+ — this is your placeholder landing page.
        </p>
      </main>
    </div>
  );
}
