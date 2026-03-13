"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRES = [
  "Fantasy", "Sci-Fi", "Literary Fiction", "Romance", "Mystery/Thriller",
  "Historical Fiction", "Horror", "Non-Fiction", "Biography", "Self-Help",
  "Poetry", "Graphic Novel", "YA", "Children's", "Short Stories",
];

const TOPICS = [
  "Magic systems", "Found family", "Unreliable narrator", "Slow burn romance",
  "Anti-hero", "Political intrigue", "Coming of age", "Heist", "Time travel",
  "Mythology", "True crime", "Science", "Travel", "Food & cooking", "Art",
];

const PACES = ["Slow Burn", "Steady", "Page-Turner", "Mix it up"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [genres, setGenres] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [pace, setPace] = useState<string>("");
  const [saving, setSaving] = useState(false);

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function complete() {
    setSaving(true);
    await fetch("/api/settings/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres, topics, pace_preference: pace || null }),
    });
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Progress */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Welcome to Shelf</h1>
              <p className="text-muted-foreground mt-1">Let&apos;s personalise your reading feed. What genres do you enjoy?</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => toggle(genres, setGenres, g)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    genres.includes(g)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Next →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Topics you love</h2>
              <p className="text-muted-foreground mt-1">Select the themes that draw you in.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(topics, setTopics, t)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    topics.includes(t)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Your reading pace</h2>
              <p className="text-muted-foreground mt-1">Do you prefer slow and immersive, or can&apos;t-put-it-down?</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PACES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPace(pace === p ? "" : p)}
                  className={`rounded-lg px-4 py-3 text-sm font-medium text-left transition-colors ${
                    pace === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">You&apos;re all set.</h2>
              <p className="text-muted-foreground">
                Your library is ready. Start tracking books, discover what to read next, and see your reading stats grow.
              </p>
            </div>
            {genres.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5">
                {genres.map((g) => (
                  <span key={g} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{g}</span>
                ))}
              </div>
            )}
            <button
              onClick={complete}
              disabled={saving}
              className="rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Getting ready..." : "Go to my library →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
