"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UserBookRow, ReadingStatus } from "@/types/database";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: "Want to read",
  currently_reading: "Currently reading",
  read: "Read",
};

const STATUSES: ReadingStatus[] = ["want_to_read", "currently_reading", "read"];

type Props = {
  bookId: string;
  initialUserBook: UserBookRow | null;
};

export function LibraryActions({ bookId, initialUserBook }: Props) {
  const router = useRouter();
  const [userBook, setUserBook] = useState<UserBookRow | null>(initialUserBook);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Local form state for rating and dates
  const [rating, setRating] = useState<number | null>(initialUserBook?.rating ?? null);
  const [dateStarted, setDateStarted] = useState(initialUserBook?.date_started ?? "");
  const [dateFinished, setDateFinished] = useState(initialUserBook?.date_finished ?? "");

  async function setStatus(status: ReadingStatus) {
    setSaving(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        status,
        rating: userBook?.rating ?? null,
        date_started: userBook?.date_started ?? null,
        date_finished: userBook?.date_finished ?? null,
      }),
    });
    const data = await res.json();
    if (data.user_book) {
      setUserBook(data.user_book);
      setRating(data.user_book.rating);
      setDateStarted(data.user_book.date_started ?? "");
      setDateFinished(data.user_book.date_finished ?? "");
    }
    setSaving(false);
    router.refresh(); // Re-render profile stats
  }

  async function saveDetails() {
    if (!userBook) return;
    setSaving(true);
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        status: userBook.status,
        rating: rating ?? null,
        date_started: dateStarted || null,
        date_finished: dateFinished || null,
      }),
    });
    const data = await res.json();
    if (data.user_book) {
      setUserBook(data.user_book);
    }
    setSaving(false);
    router.refresh();
  }

  async function removeFromLibrary() {
    setRemoving(true);
    await fetch(`/api/library?book_id=${bookId}`, { method: "DELETE" });
    setUserBook(null);
    setRating(null);
    setDateStarted("");
    setDateFinished("");
    setShowDetails(false);
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Status buttons */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            disabled={saving || removing}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              userBook?.status === s
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Details panel (rating + dates) */}
      {userBook && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? "Hide details ↑" : "Edit rating & dates ↓"}
          </button>

          {showDetails && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              {/* Star rating */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Your rating
                </p>
                <StarRating value={rating} onChange={setRating} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Started
                  </label>
                  <input
                    type="date"
                    value={dateStarted}
                    onChange={(e) => setDateStarted(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Finished
                  </label>
                  <input
                    type="date"
                    value={dateFinished}
                    onChange={(e) => setDateFinished(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={saveDetails}
                  disabled={saving}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={removeFromLibrary}
                  disabled={removing || saving}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                >
                  {removing ? "Removing…" : "Remove from library"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(value === star ? null : star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          className="text-xl leading-none transition-colors"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <span className={display >= star ? "text-yellow-400" : "text-muted"}>
            ★
          </span>
        </button>
      ))}
      {value && (
        <span className="ml-2 text-xs text-muted-foreground self-center">
          {value}/5
        </span>
      )}
    </div>
  );
}
