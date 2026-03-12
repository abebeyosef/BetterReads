"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type ListItem = {
  id: string;
  title: string;
  is_public: boolean;
  has_book: boolean;
};

export function AddToListButton({ bookId }: { bookId: string }) {
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListItem[]>([]);
  const [fetchState, setFetchState] = useState<"idle" | "loading" | "done">("idle");
  const [toggling, setToggling] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (fetchState === "done") return; // already loaded
    setFetchState("loading");
    try {
      const res = await fetch(`/api/lists?book_id=${bookId}`);
      const data = await res.json();
      setLists(data.lists ?? []);
      setFetchState("done");
    } catch {
      setFetchState("done");
    }
  }

  async function toggleList(list: ListItem) {
    setToggling(list.id);
    try {
      if (list.has_book) {
        await fetch(`/api/lists/${list.id}/books?book_id=${bookId}`, { method: "DELETE" });
        setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, has_book: false } : l));
      } else {
        await fetch(`/api/lists/${list.id}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ book_id: bookId }),
        });
        setLists((prev) => prev.map((l) => l.id === list.id ? { ...l, has_book: true } : l));
      }
    } finally {
      setToggling(null);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="rounded-full px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        Save to list ▾
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-56 rounded-md border border-border bg-popover shadow-lg py-1 text-sm">
          {fetchState === "loading" && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
          )}

          {fetchState === "done" && lists.length === 0 && (
            <div className="px-3 py-3 space-y-2">
              <p className="text-xs text-muted-foreground">No Collections yet.</p>
              <Link
                href="/lists"
                className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
                onClick={() => setOpen(false)}
              >
                Create a list →
              </Link>
            </div>
          )}

          {fetchState === "done" && lists.length > 0 && (
            <>
              {lists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => toggleList(list)}
                  disabled={toggling === list.id}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent text-left disabled:opacity-50 transition-colors"
                >
                  <span className={`text-base leading-none flex-shrink-0 ${list.has_book ? "text-primary" : "text-muted-foreground"}`}>
                    {list.has_book ? "✓" : "○"}
                  </span>
                  <span className="truncate flex-1">{list.title}</span>
                  {!list.is_public && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">Private</span>
                  )}
                </button>
              ))}
              <div className="border-t border-border mt-1 pt-1">
                <Link
                  href="/lists"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  Manage lists →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
