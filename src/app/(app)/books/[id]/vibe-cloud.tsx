"use client";

import { useEffect, useState } from "react";

const VIBE_NAMES = [
  "Cosy", "Romantic", "Gripping", "Dark", "Hopeful", "Funny",
  "Emotional", "Dreamy", "Thought-provoking", "Adventurous", "Tense",
  "Heartbreaking", "Uplifting", "Whimsical", "Eerie",
];

type Vibe = {
  id: string;
  name: string;
  count: number;
  user_voted: boolean;
};

type Props = {
  bookId: string;
  userId: string | null;
};

export function VibeCloud({ bookId, userId }: Props) {
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/books/${bookId}/vibes`)
      .then((r) => r.json())
      .then((d) => {
        setVibes(d.vibes ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  async function toggleVibe(vibeName: string) {
    if (!userId) return;
    setSubmitting(vibeName);

    // Find existing vibe entry from the server data or create a temp id
    const existing = vibes.find((v) => v.name === vibeName);
    const hasVoted = existing?.user_voted ?? false;

    if (hasVoted && existing) {
      const res = await fetch(`/api/books/${bookId}/vibes?vibe_id=${existing.id}`, { method: "DELETE" });
      if (res.ok) {
        setVibes((prev) =>
          prev
            .map((v) => v.id === existing.id ? { ...v, count: v.count - 1, user_voted: false } : v)
            .filter((v) => v.count > 0)
        );
      }
    } else {
      // POST — need the vibe_id from vibes table; use name as lookup key
      // For new votes we send the name and let the server look up the id
      // Actually we need the real vibe_id. Let's POST with name and handle server-side.
      // We'll use name as vibe_id for now since vibes table may use name as id or we get the id back
      const res = await fetch(`/api/books/${bookId}/vibes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vibe_name: vibeName }),
      });
      if (res.ok) {
        // Refresh vibes after adding
        const refreshed = await fetch(`/api/books/${bookId}/vibes`).then((r) => r.json());
        setVibes(refreshed.vibes ?? []);
      }
    }

    setSubmitting(null);
  }

  // Vibes with at least 1 vote, sorted by count desc
  const visibleVibes = vibes.filter((v) => v.count > 0);
  // All vibe names for the panel
  const userVotedNames = new Set(vibes.filter((v) => v.user_voted).map((v) => v.name));
  const userVoteCount = userVotedNames.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Vibes
        </h2>
        {userId && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? "Close" : "+ Add your vibes"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading vibes...</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {visibleVibes.map((vibe) => (
            <button
              key={vibe.id}
              onClick={() => toggleVibe(vibe.name)}
              disabled={submitting === vibe.name || (!vibe.user_voted && userVoteCount >= 5 && !!userId)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                vibe.user_voted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {vibe.name}
              <span className="ml-1 opacity-70">{vibe.count}</span>
            </button>
          ))}
          {visibleVibes.length === 0 && !expanded && (
            <p className="text-xs text-muted-foreground">No vibes yet. Be the first to tag this book.</p>
          )}
        </div>
      )}

      {/* Expanded panel: all vibe names */}
      {expanded && (
        <div className="rounded-md border border-border bg-card p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Select up to 5 vibes that describe this book.
            {userVoteCount > 0 && ` You've selected ${userVoteCount}/5.`}
          </p>
          <div className="flex flex-wrap gap-2">
            {VIBE_NAMES.map((name) => {
              const voted = userVotedNames.has(name);
              const canVote = voted || userVoteCount < 5;
              return (
                <button
                  key={name}
                  onClick={() => toggleVibe(name)}
                  disabled={submitting === name || !canVote}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                    voted
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
