"use client";

import { useEffect, useState } from "react";

type Note = {
  id: string;
  page: number | null;
  note: string;
  created_at: string;
};

type Props = {
  bookId: string;
};

export function MarginNotes({ bookId }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [newPage, setNewPage] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [bookId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadNotes() {
    const res = await fetch(`/api/checkins?book_id=${bookId}`);
    const data = await res.json();
    // Notes = check-ins with a non-null note
    const allCheckins: Array<{ id: string; page: number | null; percent: number | null; note: string | null; created_at: string }> = data.checkins ?? [];
    setNotes(
      allCheckins
        .filter((c) => c.note)
        .map((c) => ({ id: c.id, page: c.page, note: c.note!, created_at: c.created_at }))
    );
    setLoading(false);
  }

  async function saveNote() {
    if (!newNote.trim()) return;
    setSaving(true);

    const res = await fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        page: newPage ? parseInt(newPage) : null,
        note: newNote.trim(),
        is_public: false,
      }),
    });

    if (res.ok) {
      setNewPage("");
      setNewNote("");
      setFormOpen(false);
      await loadNotes();
    }

    setSaving(false);
  }

  async function deleteNote(id: string) {
    await fetch(`/api/checkins/${id}`, { method: "DELETE" });
    await loadNotes();
  }

  if (loading) return null;

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        Margin Notes
        <span className="text-xs font-normal normal-case opacity-60">
          {expanded ? "▾ hide" : `▸ ${notes.length > 0 ? `${notes.length} note${notes.length === 1 ? "" : "s"}` : "none yet"}`}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 rounded-md border border-border bg-card/50 p-4">
          {notes.length === 0 ? (
            <p className="text-xs text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">
                      {note.page ? `Page ${note.page} · ` : ""}
                      {new Date(note.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-foreground/80">{note.note}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors text-xs flex-shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setFormOpen((o) => !o)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {formOpen ? "Close" : "+ New note"}
          </button>

          {formOpen && (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Page <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="number"
                  min="1"
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  placeholder="Page number"
                  className="w-28 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Note</label>
                <textarea
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Your thought..."
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <button
                onClick={saveNote}
                disabled={saving || !newNote.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save note"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
