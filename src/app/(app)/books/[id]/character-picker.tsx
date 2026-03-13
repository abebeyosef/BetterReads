"use client";

import { useEffect, useState } from "react";

type VoteType = "plot_driven" | "character_driven";

type CharacterData = {
  plot_driven: number;
  character_driven: number;
  user_vote: VoteType | null;
  total: number;
};

const OPTIONS: { value: VoteType; label: string }[] = [
  { value: "plot_driven", label: "Plot-Driven" },
  { value: "character_driven", label: "Character-Driven" },
];

type Props = {
  bookId: string;
  userId: string | null;
};

export function CharacterPicker({ bookId, userId }: Props) {
  const [data, setData] = useState<CharacterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/character`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  async function handleVote(voteType: VoteType) {
    if (!userId || submitting) return;
    setSubmitting(true);

    const isOwnVote = data?.user_vote === voteType;

    if (isOwnVote) {
      const res = await fetch(`/api/books/${bookId}/character`, { method: "DELETE" });
      if (res.ok) {
        const refreshed = await fetch(`/api/books/${bookId}/character`).then((r) => r.json());
        setData(refreshed);
      }
    } else {
      const res = await fetch(`/api/books/${bookId}/character`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote_type: voteType }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/books/${bookId}/character`).then((r) => r.json());
        setData(refreshed);
      }
    }

    setSubmitting(false);
  }

  if (loading) return null;

  const showDistribution = (data?.total ?? 0) >= 3;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Story Focus
      </h2>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ value, label }) => {
          const isVoted = data?.user_vote === value;
          const count = data?.[value] ?? 0;
          const pct = showDistribution && data?.total
            ? Math.round((count / data.total) * 100)
            : null;

          return (
            <button
              key={value}
              onClick={() => handleVote(value)}
              disabled={!userId || submitting}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                isVoted
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {label}
              {showDistribution && pct !== null && (
                <span className="ml-1 opacity-70">{pct}%</span>
              )}
            </button>
          );
        })}
      </div>
      {showDistribution && data && data.total > 0 && (
        <div className="flex gap-0 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary opacity-70 rounded-l-full"
            style={{ width: `${(data.plot_driven / data.total) * 100}%` }}
          />
          <div
            className="h-full bg-primary opacity-40 rounded-r-full"
            style={{ width: `${(data.character_driven / data.total) * 100}%` }}
          />
        </div>
      )}
      {!userId && (
        <p className="text-xs text-muted-foreground">Sign in to vote.</p>
      )}
    </div>
  );
}
