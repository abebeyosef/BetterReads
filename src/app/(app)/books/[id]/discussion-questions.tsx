"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  question: string;
  upvotes: number;
  user_id: string;
  user_voted: boolean;
};

type Props = {
  bookId: string;
  userId: string | null;
};

export function DiscussionQuestions({ bookId, userId }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [newQ, setNewQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/questions`)
      .then((r) => r.json())
      .then((d) => { setQuestions(d.questions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [bookId]);

  async function vote(q: Question) {
    if (!userId) return;
    // Optimistic update
    setQuestions((prev) =>
      prev.map((item) =>
        item.id === q.id
          ? { ...item, upvotes: item.user_voted ? item.upvotes - 1 : item.upvotes + 1, user_voted: !item.user_voted }
          : item
      ).sort((a, b) => b.upvotes - a.upvotes)
    );
    await fetch(`/api/books/${bookId}/questions/${q.id}/vote`, { method: "POST" });
  }

  async function submit() {
    if (!newQ.trim() || submitting) return;
    setSubmitting(true);
    const res = await fetch(`/api/books/${bookId}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: newQ.trim() }),
    });
    if (res.ok) {
      // Refresh
      const d = await fetch(`/api/books/${bookId}/questions`).then((r) => r.json());
      setQuestions(d.questions ?? []);
      setNewQ("");
      setShowForm(false);
    }
    setSubmitting(false);
  }

  async function deleteQ(id: string) {
    await fetch(`/api/books/${bookId}/questions/${id}`, { method: "DELETE" });
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  const visible = expanded ? questions : questions.slice(0, 5);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Discussion Questions
          {questions.length > 0 && (
            <span className="ml-2 font-normal normal-case opacity-60">{questions.length}</span>
          )}
        </h2>
        {userId && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showForm ? "Cancel" : "+ Add a question"}
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : (
        <div className="space-y-2">
          {visible.map((q) => (
            <div key={q.id} className="flex items-start gap-3 group">
              <button
                onClick={() => vote(q)}
                disabled={!userId}
                className={`flex flex-col items-center gap-0.5 rounded p-1 text-xs transition-colors ${
                  q.user_voted
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground disabled:opacity-40"
                }`}
              >
                <span>▲</span>
                <span className="font-medium">{q.upvotes}</span>
              </button>
              <p className="flex-1 text-sm leading-relaxed">{q.question}</p>
              {userId === q.user_id && (
                <button
                  onClick={() => deleteQ(q.id)}
                  className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-all"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {questions.length === 0 && (
            <p className="text-xs text-muted-foreground">No questions yet. Start the discussion.</p>
          )}
        </div>
      )}

      {questions.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Show less" : `Show all ${questions.length} questions`}
        </button>
      )}

      {showForm && (
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <textarea
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Type your discussion question..."
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowForm(false); setNewQ(""); }}
              className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting || !newQ.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {submitting ? "Posting..." : "Post question"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
