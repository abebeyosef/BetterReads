"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// ── Share button — copies the public URL ──────────────────────────────────────

export function ShareButton({ listId }: { listId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/lists/${listId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
    >
      {copied ? "Copied!" : "Share link"}
    </button>
  );
}

// ── Remove a single book from the list ───────────────────────────────────────

export function RemoveBookButton({ listId, bookId }: { listId: string; bookId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      await fetch(`/api/lists/${listId}/books?book_id=${bookId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      title="Remove from list"
      className="absolute top-1 right-1 z-10 rounded bg-background/80 backdrop-blur px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
    >
      ✕
    </button>
  );
}

// ── Owner panel: edit metadata + delete list ──────────────────────────────────

export function ListOwnerPanel({
  listId,
  title: initialTitle,
  description: initialDescription,
  isPublic: initialIsPublic,
}: {
  listId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"closed" | "edit" | "confirmDelete">("closed");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: description || null, is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setPanel("closed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await fetch(`/api/lists/${listId}`, { method: "DELETE" });
      router.push("/lists");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Trigger buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setPanel(panel === "edit" ? "closed" : "edit")}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => setPanel(panel === "confirmDelete" ? "closed" : "confirmDelete")}
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Edit form */}
      {panel === "edit" && (
        <form
          onSubmit={handleSave}
          className="rounded-lg border border-border bg-card p-4 space-y-3 text-sm"
        >
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Title</label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Public</span>
          </label>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setPanel("closed")}
              className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Delete confirmation */}
      {panel === "confirmDelete" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3 text-sm">
          <p className="font-medium text-destructive">Delete this list?</p>
          <p className="text-xs text-muted-foreground">The books themselves won&apos;t be deleted, only this list.</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              onClick={() => setPanel("closed")}
              className="rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
