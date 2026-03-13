"use client";

import { useEffect, useState } from "react";

type TempoType = "slow_burn" | "steady" | "page_turner";

type TempoData = {
  slow_burn: number;
  steady: number;
  page_turner: number;
  user_vote: TempoType | null;
  total: number;
};

const TEMPO_OPTIONS: { value: TempoType; label: string }[] = [
  { value: "slow_burn", label: "Slow Burn" },
  { value: "steady", label: "Steady" },
  { value: "page_turner", label: "Page-Turner" },
];

type Props = {
  bookId: string;
  userId: string | null;
};

export function TempoPicker({ bookId, userId }: Props) {
  const [data, setData] = useState<TempoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/tempo`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  async function handleVote(tempo: TempoType) {
    if (!userId || submitting) return;
    setSubmitting(true);

    const isOwnVote = data?.user_vote === tempo;

    if (isOwnVote) {
      const res = await fetch(`/api/books/${bookId}/tempo`, { method: "DELETE" });
      if (res.ok) {
        const refreshed = await fetch(`/api/books/${bookId}/tempo`).then((r) => r.json());
        setData(refreshed);
      }
    } else {
      const res = await fetch(`/api/books/${bookId}/tempo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempo }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/books/${bookId}/tempo`).then((r) => r.json());
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
        Pace
      </h2>
      <div className="flex flex-wrap gap-2">
        {TEMPO_OPTIONS.map(({ value, label }) => {
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
      {showDistribution && data && (
        <div className="flex gap-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
          {TEMPO_OPTIONS.map(({ value }) => {
            const pct = data.total > 0 ? (data[value] / data.total) * 100 : 0;
            return (
              <div
                key={value}
                className="h-full bg-primary opacity-60 first:rounded-l-full last:rounded-r-full"
                style={{ width: `${pct}%` }}
              />
            );
          })}
        </div>
      )}
      {!userId && (
        <p className="text-xs text-muted-foreground">Sign in to vote on pace.</p>
      )}
    </div>
  );
}
