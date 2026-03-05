"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EnrichBooksButton({ nullCoverCount }: { nullCoverCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<{ enriched: number; skipped: number; total: number } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || nullCoverCount === 0) return null;

  async function handleEnrich() {
    setState("loading");
    try {
      const res = await fetch("/api/books/enrich", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm">
      <div className="flex-1">
        {state === "idle" && (
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-medium">{nullCoverCount} book{nullCoverCount === 1 ? "" : "s"}</span>{" "}
            {nullCoverCount === 1 ? "is" : "are"} missing covers and details. Fix them automatically?
          </p>
        )}
        {state === "loading" && (
          <p className="text-amber-800 dark:text-amber-300">
            Fetching covers from Google Books&hellip;
          </p>
        )}
        {state === "done" && result && (
          <p className="text-green-700 dark:text-green-400">
            Done! Updated <span className="font-medium">{result.enriched}</span> of{" "}
            <span className="font-medium">{result.total}</span> books.
            {result.skipped > 0 && ` (${result.skipped} not found)`}
          </p>
        )}
        {state === "error" && (
          <p className="text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {(state === "idle" || state === "error") && (
          <button
            onClick={handleEnrich}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Fix covers
          </button>
        )}
        {state === "loading" && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 dark:text-amber-400 text-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
