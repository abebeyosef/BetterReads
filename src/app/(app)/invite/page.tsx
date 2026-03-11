"use client";

import { useState } from "react";

export default function InvitePage() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const url = `${window.location.origin}/signup`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Invite a friend</h1>
        <p className="text-sm text-muted-foreground">
          Share BetterReads with friends. Anyone with the link can sign up and start tracking their reading.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invite link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={typeof window !== "undefined" ? `${window.location.origin}/signup` : ""}
            className="flex-1 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground select-all"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            className="flex-shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Anyone with this link can create a free account. They&apos;ll be able to import their Goodreads library and start tracking right away.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Share via</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent("Join me on BetterReads — track your reading, see what friends are reading, and import your Goodreads library. Sign up here: " + (typeof window !== "undefined" ? window.location.origin : "") + "/signup")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            WhatsApp
          </a>
          <a
            href={`mailto:?subject=${encodeURIComponent("Join me on BetterReads")}&body=${encodeURIComponent("Hey! I've been using BetterReads to track my reading — it's like Goodreads but actually good. You can import your Goodreads library in minutes.\n\nSign up here: " + (typeof window !== "undefined" ? window.location.origin : "") + "/signup")}`}
            className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            Email
          </a>
        </div>
      </div>
    </div>
  );
}
