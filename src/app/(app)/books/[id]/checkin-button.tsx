"use client";

import { useEffect, useState } from "react";

type Checkin = {
  id: string;
  page: number | null;
  percent: number | null;
  note: string | null;
  created_at: string;
  is_public: boolean;
};

type Props = {
  bookId: string;
  pageCount?: number | null;
};

export function CheckInButton({ bookId, pageCount }: Props) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState("");
  const [percent, setPercent] = useState("");
  const [note, setNote] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<Checkin[]>([]);

  useEffect(() => {
    loadCheckins();
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCheckins() {
    const res = await fetch(`/api/checkins?book_id=${bookId}`);
    const data = await res.json();
    setRecentCheckins((data.checkins ?? []).slice(0, 3));
  }

  async function handleSave() {
    if (!page && !percent) {
      setError("Enter a page number or percentage.");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        page: page ? parseInt(page) : null,
        percent: percent ? parseFloat(percent) : null,
        note: note || null,
        is_public: isPublic,
      }),
    });

    if (res.ok) {
      setPage("");
      setPercent("");
      setNote("");
      setIsPublic(false);
      setOpen(false);
      await loadCheckins();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }

    setSaving(false);
  }

  async function deleteCheckin(id: string) {
    await fetch(`/api/checkins/${id}`, { method: "DELETE" });
    await loadCheckins();
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
      >
        {open ? "Close" : "Log progress +"}
      </button>

      {open && (
        <div className="rounded-md border border-border bg-card p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Page</label>
              <input
                type="number"
                min="1"
                max={pageCount ?? undefined}
                value={page}
                onChange={(e) => { setPage(e.target.value); setPercent(""); }}
                placeholder={pageCount ? `of ${pageCount}` : "Page number"}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-end text-xs text-muted-foreground pb-2">or</div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium">Percent</label>
              <input
                type="number"
                min="0"
                max="100"
                value={percent}
                onChange={(e) => { setPercent(e.target.value); setPage(""); }}
                placeholder="0–100"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Note <span className="text-muted-foreground font-normal">(optional)</span></label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What are you thinking?"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            Share publicly
          </label>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save progress"}
          </button>
        </div>
      )}

      {recentCheckins.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent check-ins</p>
          {recentCheckins.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground">
                  {c.page ? `Page ${c.page}` : c.percent ? `${c.percent}%` : "Progress logged"}
                  {" · "}
                  {new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                {c.note && <p className="text-foreground/80 line-clamp-2">{c.note}</p>}
              </div>
              <button
                onClick={() => deleteCheckin(c.id)}
                className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
