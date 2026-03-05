"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { createClient } from "@/lib/supabase/client";
import type { UserRow } from "@/types/database";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppNav({ profile }: { profile: UserRow }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        {/* Logo + nav links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold tracking-tight">
            Shelf
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/feed" className="hover:text-foreground transition-colors">
              Feed
            </Link>
            <Link href="/library" className="hover:text-foreground transition-colors">
              Library
            </Link>
            <Link href="/search" className="hover:text-foreground transition-colors">
              Search
            </Link>
          </nav>
        </div>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <AvatarPrimitive.Root className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-medium">
                <AvatarPrimitive.Image
                  src={profile.avatar_url ?? undefined}
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                />
                <AvatarPrimitive.Fallback className="text-muted-foreground text-xs">
                  {getInitials(profile.display_name)}
                </AvatarPrimitive.Fallback>
              </AvatarPrimitive.Root>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[160px] rounded-md border border-border bg-popover p-1 text-sm shadow-md"
            >
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                @{profile.username}
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <Link
                  href="/profile"
                  className="flex cursor-pointer items-center rounded px-2 py-1.5 outline-none hover:bg-accent"
                >
                  Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/settings"
                  className="flex cursor-pointer items-center rounded px-2 py-1.5 outline-none hover:bg-accent"
                >
                  Settings
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  href="/import"
                  className="flex cursor-pointer items-center rounded px-2 py-1.5 outline-none hover:bg-accent"
                >
                  Import from Goodreads
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={handleSignOut}
                className="flex cursor-pointer items-center rounded px-2 py-1.5 text-destructive outline-none hover:bg-accent"
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
