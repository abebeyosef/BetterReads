"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LIMIT = 15;

export function EnrichBooksButton({ nullCoverCount }: { nullCoverCount: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [enriched, setEnriched] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [remaining, setRemaining] = useState(nullCoverCount);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || nullCoverCount === 0) return null;

  async function handleEnrich() {
    setState("loading");
    try {
      const res = await fetch(`/api/books/enrich?limit=${LIMIT}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");

      setEnriched((prev) => prev + (data.enriched ?? 0));
      setSkipped((prev) => prev + (data.skipped ?? 0));
      setRemaining(data.remaining ?? 0);
      setState("done");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const processed = enriched + skipped;

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 text-sm">
      <div className="flex-1">
        {state === "idle" && (
          <p className="text-amber-800 dark:text-amber-300">
            <span className="font-medium">{remaining} book{remaining === 1 ? "" : "s"}</span>{" "}
            {remaining === 1 ? "is" : "are"} missing covers and details. Fix them automatically?
          </p>
        )}
        {state === "loading" && (
          <p className="text-amber-800 dark:text-amber-300">
            Fetching covers from Google Books&hellip;
          </p>
        )}
        {state === "done" && (
          <p className={remaining > 0 ? "text-amber-800 dark:text-amber-300" : "text-green-700 dark:text-green-400"}>
            {processed > 0 && (
              <>
                Updated <span className="font-medium">{enriched}</span> book{enriched !== 1 ? "s" : ""}.
                {skipped > 0 && ` (${skipped} not found)`}
                {" "}
              </>
            )}
            {remaining > 0
              ? <><span className="font-medium">{remaining}</span> more remaining.</>
              : "All done!"}
          </p>
        )}
        {state === "error" && (
          <p className="text-destructive">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {state === "loading" && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
        )}
        {(state === "idle" || state === "error") && (
          <button
            onClick={handleEnrich}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Fix covers
          </button>
        )}
        {state === "done" && remaining > 0 && (
          <button
            onClick={handleEnrich}
            className="rounded-md bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            Continue enriching
          </button>
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
