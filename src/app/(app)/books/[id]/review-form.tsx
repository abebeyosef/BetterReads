"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bookId: string;
  initialText: string | null;
  hasInLibrary: boolean;
};

export function ReviewForm({ bookId, initialText, hasInLibrary }: Props) {
  const router = useRouter();
  const [text, setText] = useState(initialText ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(!initialText);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ book_id: bookId, text }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/reviews?book_id=${bookId}`, { method: "DELETE" });
    setText("");
    setEditing(true);
    setDeleting(false);
    router.refresh();
  }

  if (!hasInLibrary) {
    return (
      <p className="text-sm text-muted-foreground">
        Add this book to your library to write a review.
      </p>
    );
  }

  // Saved review — show with edit/delete options
  if (!editing && initialText) {
    return (
      <div className="space-y-3">
        <p className="text-sm leading-relaxed">{initialText}</p>
        <div className="flex gap-4">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What did you think of this book?"
        rows={4}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !text.trim()}
          className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving…" : initialText ? "Update review" : "Post review"}
        </button>
        {initialText && (
          <button
            type="button"
            onClick={() => { setText(initialText); setEditing(false); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
