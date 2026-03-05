"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import type { ReadingStatus } from "@/types/database";

type ParsedRow = {
  title: string;
  author: string;
  isbn13: string | null;
  isbn10: string | null;
  rating: number | null;
  status: ReadingStatus;
  dateRead: string | null;
  dateAdded: string | null;
};

type ImportPreview = {
  total: number;
  read: number;
  currentlyReading: number;
  wantToRead: number;
  rows: ParsedRow[];
};

function parseIsbn(val: string): string | null {
  if (!val) return null;
  const cleaned = val.replace(/[="]/g, "").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  return val.trim().replace(/\//g, "-");
}

function mapStatus(shelf: string): ReadingStatus {
  if (shelf === "read") return "read";
  if (shelf === "currently-reading") return "currently_reading";
  return "want_to_read";
}

function parseGoodreadsCSV(file: File): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: ParsedRow[] = [];
        for (const raw of result.data as Record<string, string>[]) {
          const title = raw["Title"]?.trim();
          if (!title) continue;
          const ratingVal = parseInt(raw["My Rating"] || "0");
          rows.push({
            title,
            author: raw["Author"]?.trim() || "",
            isbn13: parseIsbn(raw["ISBN13"] || ""),
            isbn10: parseIsbn(raw["ISBN"] || ""),
            rating: ratingVal > 0 ? ratingVal : null,
            status: mapStatus(raw["Exclusive Shelf"] || "to-read"),
            dateRead: parseDate(raw["Date Read"] || ""),
            dateAdded: parseDate(raw["Date Added"] || ""),
          });
        }
        resolve({
          total: rows.length,
          read: rows.filter((r) => r.status === "read").length,
          currentlyReading: rows.filter((r) => r.status === "currently_reading").length,
          wantToRead: rows.filter((r) => r.status === "want_to_read").length,
          rows,
        });
      },
      error: reject,
    });
  });
}

const BATCH_SIZE = 25;

type Step = "instructions" | "upload" | "preview" | "importing" | "done";

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("instructions");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a CSV file from Goodreads.");
      return;
    }
    setError(null);
    try {
      const result = await parseGoodreadsCSV(file);
      if (result.total === 0) {
        setError("No books found. Is this a Goodreads export CSV?");
        return;
      }
      setPreview(result);
      setStep("preview");
    } catch {
      setError("Could not parse the file. Please make sure it's a valid Goodreads CSV export.");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  async function startImport() {
    if (!preview) return;
    setStep("importing");
    setTotal(preview.total);
    setProgress(0);
    setMatched(0);

    // Create import record
    const createRes = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ total: preview.total }),
    });
    if (!createRes.ok) {
      setError("Failed to start import. Please try again.");
      setStep("preview");
      return;
    }
    const { import_id } = await createRes.json();

    // Process in batches
    let totalMatched = 0;
    for (let i = 0; i < preview.rows.length; i += BATCH_SIZE) {
      const batch = preview.rows.slice(i, i + BATCH_SIZE);
      const res = await fetch(`/api/import/${import_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: batch }),
      });
      const batchMatched = res.ok ? (await res.json()).matched ?? 0 : 0;
      totalMatched += batchMatched;
      setMatched((m) => m + batchMatched);
      setProgress((p) => p + batch.length);
    }

    // Finalise
    await fetch(`/api/import/${import_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matched: totalMatched,
        unmatched: preview.total - totalMatched,
      }),
    });

    setStep("done");
    setTimeout(() => router.push("/library"), 2000);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Import from Goodreads</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bring your entire reading history over in minutes.
        </p>
      </div>

      {/* Step 1 — Instructions */}
      {step === "instructions" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold">Step 1 — Export your Goodreads library</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Go to your Goodreads account settings</li>
              <li>
                Click{" "}
                <span className="text-foreground font-medium">&ldquo;Import and Export&rdquo;</span>{" "}
                in the left sidebar
              </li>
              <li>
                Click{" "}
                <span className="text-foreground font-medium">&ldquo;Export Library&rdquo;</span>
              </li>
              <li>Wait ~1 minute for Goodreads to prepare the file</li>
              <li>Download the CSV file to your computer</li>
            </ol>
            <a
              href="https://www.goodreads.com/review/import"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Open Goodreads Export Page ↗
            </a>
          </div>
          <button
            onClick={() => setStep("upload")}
            className="w-full rounded-md border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
          >
            I have my file — continue →
          </button>
        </div>
      )}

      {/* Step 2 — File upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-16 text-center transition-colors ${
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground"
            }`}
          >
            <p className="text-sm font-medium">Drop your Goodreads CSV here</p>
            <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            onClick={() => setStep("instructions")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to instructions
          </button>
        </div>
      )}

      {/* Preview */}
      {step === "preview" && preview && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 space-y-5">
            <h2 className="font-semibold">Ready to import</h2>
            <p className="text-4xl font-bold">{preview.total}</p>
            <p className="text-sm text-muted-foreground -mt-3">books found</p>
            <div className="grid grid-cols-3 gap-4 pt-1">
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xl font-semibold">{preview.read}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Read</p>
              </div>
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xl font-semibold">{preview.currentlyReading}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Reading</p>
              </div>
              <div className="rounded-md bg-muted p-3 text-center">
                <p className="text-xl font-semibold">{preview.wantToRead}</p>
                <p className="text-xs text-muted-foreground mt-0.5">To read</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              All books will be imported. Ratings, dates, and reading status are preserved.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={startImport}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Import {preview.total} books
            </button>
            <button
              onClick={() => setStep("upload")}
              className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent transition-colors"
            >
              Choose different file
            </button>
          </div>
        </div>
      )}

      {/* Importing — progress */}
      {step === "importing" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold">Importing your library…</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{progress} of {total} books processed</span>
              <span>{total > 0 ? Math.round((progress / total) * 100) : 0}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
              />
            </div>
            {matched > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                {matched} matched to full book data so far
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            This may take a few minutes for large libraries. Keep this tab open.
          </p>
        </div>
      )}

      {/* Done */}
      {step === "done" && (
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-3">
          <p className="text-xl font-semibold">Import complete!</p>
          <p className="text-sm text-muted-foreground">
            {matched} of {total} books matched to full metadata.
          </p>
          <p className="text-xs text-muted-foreground">Redirecting to your library…</p>
        </div>
      )}
    </div>
  );
}
