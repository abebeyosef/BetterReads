"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { UserBookRow, ReadingStatus, ExtendedStatus, BookFormat, LabelRow } from "@/types/database";

const STATUS_LABELS: Record<ReadingStatus, string> = {
  want_to_read: "Up Next",
  currently_reading: "Reading Now",
  read: "Finished",
};

const EXTENDED_STATUS_LABELS: Record<ExtendedStatus, string> = {
  on_hold: "On Hold",
  left_behind: "Left Behind",
};

const STATUSES: ReadingStatus[] = ["want_to_read", "currently_reading", "read"];
const EXTENDED_STATUSES: ExtendedStatus[] = ["on_hold", "left_behind"];

const FORMATS: { value: BookFormat; label: string }[] = [
  { value: "print", label: "Print" },
  { value: "hardback", label: "Hardback" },
  { value: "ebook", label: "eBook" },
  { value: "audiobook", label: "Audiobook" },
  { value: "other", label: "Other" },
];

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

  // Form state
  const [rating, setRating] = useState<number | null>(initialUserBook?.rating ?? null);
  const [dateStarted, setDateStarted] = useState(initialUserBook?.date_started ?? "");
  const [dateFinished, setDateFinished] = useState(initialUserBook?.date_finished ?? "");
  const [format, setFormat] = useState<BookFormat | null>(initialUserBook?.format ?? null);
  const [extendedStatus, setExtendedStatus] = useState<ExtendedStatus | null>(
    initialUserBook?.extended_status ?? null
  );
  const [isOwned, setIsOwned] = useState(initialUserBook?.is_owned ?? false);
  const [isLoved, setIsLoved] = useState(initialUserBook?.is_loved ?? false);

  async function setStatus(status: ReadingStatus) {
    setSaving(true);
    // Auto-fill date_finished when marking as read
    const autoDateFinished =
      status === "read" && !dateFinished
        ? new Date().toISOString().slice(0, 10)
        : dateFinished || null;
    if (status === "read" && !dateFinished) {
      setDateFinished(autoDateFinished ?? "");
    }

    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        status,
        rating: userBook?.rating ?? null,
        date_started: userBook?.date_started ?? null,
        date_finished: autoDateFinished,
        extended_status: extendedStatus,
        is_owned: isOwned,
        is_loved: isLoved,
        format,
      }),
    });
    const data = await res.json();
    if (data.user_book) {
      setUserBook(data.user_book);
      setRating(data.user_book.rating);
      setDateStarted(data.user_book.date_started ?? "");
      setDateFinished(data.user_book.date_finished ?? "");
      setExtendedStatus(data.user_book.extended_status ?? null);
      setIsOwned(data.user_book.is_owned ?? false);
      setIsLoved(data.user_book.is_loved ?? false);
      setFormat(data.user_book.format ?? null);
    }
    setSaving(false);
    router.refresh();
  }

  async function toggleLoved() {
    if (!userBook) return;
    const next = !isLoved;
    setIsLoved(next);
    await fetch("/api/library", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: bookId, is_loved: next }),
    });
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
        extended_status: extendedStatus,
        is_owned: isOwned,
        is_loved: isLoved,
        format,
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
    setExtendedStatus(null);
    setIsOwned(false);
    setIsLoved(false);
    setFormat(null);
    setRemoving(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 pt-1">
      {/* Main status buttons */}
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

        {/* Loved button — only shown when in library */}
        {userBook && (
          <button
            onClick={toggleLoved}
            disabled={saving || removing}
            title={isLoved ? "Remove from loved" : "Mark as loved"}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
              isLoved
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {isLoved ? "♥ Loved" : "♡ Love"}
          </button>
        )}
      </div>

      {/* Extended statuses — shown when in library */}
      {userBook && (
        <div className="flex flex-wrap gap-2">
          {EXTENDED_STATUSES.map((s) => (
            <button
              key={s}
              onClick={async () => {
                const next = extendedStatus === s ? null : s;
                setExtendedStatus(next);
                await fetch("/api/library", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ book_id: bookId, extended_status: next }),
                });
              }}
              disabled={saving || removing}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                extendedStatus === s
                  ? "bg-secondary text-secondary-foreground border border-border"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-dashed border-border"
              }`}
            >
              {EXTENDED_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {/* Details panel */}
      {userBook && (
        <div className="space-y-2">
          <button
            onClick={() => setShowDetails((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDetails ? "Hide details ↑" : "Edit details ↓"}
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

              {/* Format picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Format
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {FORMATS.map((f) => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => setFormat(format === f.value ? null : f.value)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                        format === f.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Owned checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOwned}
                  onChange={(e) => setIsOwned(e.target.checked)}
                  className="rounded"
                />
                <span className="text-xs text-muted-foreground">On my shelf (I own this)</span>
              </label>

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

              {/* Labels */}
              <LabelPicker bookId={bookId} />

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

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    // Quarter increments: 0.25, 0.5, 0.75, 1.0
    const quarter = Math.ceil(pct * 4) / 4;
    setHovered(starIndex - 1 + quarter);
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>, starIndex: number) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const quarter = Math.ceil(pct * 4) / 4;
    const newVal = starIndex - 1 + quarter;
    onChange(value === newVal ? null : newVal);
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = Math.min(1, Math.max(0, display - (star - 1)));
        return (
          <StarButton
            key={star}
            filled={filled}
            onMouseMove={(e) => handleMouseMove(e, star)}
            onMouseLeave={() => setHovered(null)}
            onClick={(e) => handleClick(e, star)}
            ariaLabel={`Rate ${star} star${star > 1 ? "s" : ""}`}
          />
        );
      })}
      {value !== null && value > 0 && (
        <span className="ml-2 text-xs text-muted-foreground self-center">
          {value % 1 === 0 ? value : value.toFixed(2).replace(/0$/, "")}/5
        </span>
      )}
    </div>
  );
}

function StarButton({
  filled,
  onMouseMove,
  onMouseLeave,
  onClick,
  ariaLabel,
}: {
  filled: number; // 0 to 1
  onMouseMove: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: () => void;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const clipPercent = Math.round(filled * 100);

  return (
    <button
      ref={ref}
      type="button"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      aria-label={ariaLabel}
      className="relative text-xl leading-none w-7 h-7 transition-transform hover:scale-110"
    >
      {/* Base (empty) star */}
      <span className="text-muted absolute inset-0 flex items-center justify-center">★</span>
      {/* Filled star with clip */}
      <span
        className="text-yellow-400 absolute inset-0 flex items-center justify-center overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - clipPercent}% 0 0)` }}
      >
        ★
      </span>
    </button>
  );
}

const PRESET_COLORS = [
  "#e57373", "#f06292", "#ba68c8", "#7986cb",
  "#4fc3f7", "#4db6ac", "#81c784", "#ffb74d",
  "#a8856e", "#90a4ae",
];

function LabelPicker({ bookId }: { bookId: string }) {
  const [allLabels, setAllLabels] = useState<LabelRow[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[8]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    const [labelsRes, selectedRes] = await Promise.all([
      fetch("/api/labels").then((r) => r.json()),
      fetch(`/api/labels/book?book_id=${bookId}`).then((r) => r.json()),
    ]);
    setAllLabels(labelsRes.labels ?? []);
    setSelectedIds(selectedRes.label_ids ?? []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  async function toggleLabel(labelId: string) {
    const next = selectedIds.includes(labelId)
      ? selectedIds.filter((id) => id !== labelId)
      : [...selectedIds, labelId];
    setSelectedIds(next);
    await fetch("/api/labels/book", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: bookId, label_ids: next }),
    });
  }

  async function createLabel() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/labels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    const data = await res.json();
    if (data.label) {
      setAllLabels((prev) => [...prev, data.label].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
    }
    setCreating(false);
  }

  async function deleteLabel(labelId: string) {
    await fetch(`/api/labels?id=${labelId}`, { method: "DELETE" });
    setAllLabels((prev) => prev.filter((l) => l.id !== labelId));
    setSelectedIds((prev) => prev.filter((id) => id !== labelId));
  }

  if (loading) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labels</p>

      {/* Existing labels */}
      {allLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allLabels.map((label) => {
            const selected = selectedIds.includes(label.id);
            return (
              <div key={label.id} className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => toggleLabel(label.id)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border ${
                    selected ? "opacity-100" : "opacity-50"
                  }`}
                  style={{
                    backgroundColor: selected ? label.color + "33" : "transparent",
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteLabel(label.id)}
                  className="text-muted-foreground hover:text-destructive text-xs leading-none"
                  title="Delete label"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create new label */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createLabel()}
          placeholder="New label…"
          className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              className={`w-4 h-4 rounded-full transition-transform ${newColor === c ? "scale-125 ring-1 ring-offset-1 ring-foreground/30" : ""}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={createLabel}
          disabled={creating || !newName.trim()}
          className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
