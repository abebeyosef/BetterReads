"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { UserRow } from "@/types/database";
import { useTheme, type ThemeName } from "@/components/theme-provider";

const THEMES: {
  name: ThemeName;
  label: string;
  swatches: string[];
}[] = [
  {
    name: "driftwood",
    label: "Driftwood",
    swatches: ["#faf6f0", "#ede0d0", "#b07d45", "#d4c1a8", "#3d2415", "#9a7858"],
  },
  {
    name: "seasalt",
    label: "Sea Salt",
    swatches: ["#f7f9f8", "#e8f0ed", "#4a8a7a", "#ccddd7", "#1a3530", "#5a8878"],
  },
  {
    name: "linen",
    label: "Warm Linen",
    swatches: ["#faf8f4", "#f0ebe0", "#7a6e54", "#ddd4be", "#2c2418", "#8a7c62"],
  },
  {
    name: "golden",
    label: "Golden Hour",
    swatches: ["#fdf8f2", "#f5ece0", "#c47030", "#e8d4b8", "#3a2010", "#9a6848"],
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SettingsForm({
  profile,
  userId,
}: {
  profile: UserRow;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentYear = new Date().getFullYear();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile.avatar_url
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [readingGoal, setReadingGoal] = useState<string>(
    profile.reading_goal_year === currentYear && profile.reading_goal_count
      ? String(profile.reading_goal_count)
      : ""
  );
  const [pagesGoal, setPagesGoal] = useState<string>("");
  const [listeningGoal, setListeningGoal] = useState<string>("");
  const [goalsSaving, setGoalsSaving] = useState(false);
  const [goalsSaved, setGoalsSaved] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [clearStep, setClearStep] = useState<"idle" | "confirm" | "clearing" | "cleared">("idle");
  const [clearError, setClearError] = useState<string | null>(null);

  const { theme, setTheme } = useTheme();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
      return;
    }

    setError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      setError(
        "Username must be 3–30 characters: letters, numbers, or underscores only."
      );
      return;
    }
    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    setSaving(true);

    let avatarUrl = profile.avatar_url;

    // Upload new avatar if one was selected
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, give a clear message
        if (uploadError.message.includes("Bucket not found")) {
          setError(
            'Avatar upload failed: the "avatars" storage bucket has not been created yet. See Settings setup notes.'
          );
        } else {
          setError(`Avatar upload failed: ${uploadError.message}`);
        }
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);
      // Append cache-busting param so the browser fetches the new image
      avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    }

    // Update profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("users")
      .update({
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        reading_goal_year: readingGoal ? currentYear : null,
        reading_goal_count: readingGoal ? parseInt(readingGoal) : null,
      })
      .eq("id", userId);

    if (updateError) {
      if (updateError.message.includes("unique") || updateError.code === "23505") {
        setError("That username is already taken. Please choose another.");
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);
    setAvatarFile(null);
    router.refresh();
  }

  async function handleSaveGoals() {
    setGoalsSaving(true);
    setGoalsSaved(false);
    const goals = [
      { goal_type: "books", target: parseInt(readingGoal) || 0 },
      { goal_type: "pages", target: parseInt(pagesGoal) || 0 },
      { goal_type: "listening_hours", target: parseInt(listeningGoal) || 0 },
    ].filter((g) => g.target > 0);

    await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: currentYear, goals }),
    });
    setGoalsSaving(false);
    setGoalsSaved(true);
  }

  async function handleClearLibrary() {
    setClearStep("clearing");
    setClearError(null);
    try {
      const res = await fetch("/api/library/clear", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "clear-library" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setClearStep("cleared");
      router.refresh();
    } catch (e) {
      setClearError(e instanceof Error ? e.message : "Something went wrong.");
      setClearStep("confirm");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">

      {/* How It Looks */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          How It Looks
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {THEMES.map((t) => {
            const isSelected = theme === t.name;
            return (
              <button
                key={t.name}
                type="button"
                onClick={() => setTheme(t.name)}
                className={`rounded-lg border-2 p-3 text-left space-y-2 transition-colors ${
                  isSelected
                    ? "border-primary"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                {/* Colour swatches */}
                <div className="flex gap-1">
                  {t.swatches.map((colour) => (
                    <span
                      key={colour}
                      className="flex-1 h-4 rounded-sm"
                      style={{ backgroundColor: colour }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{t.label}</span>
                  {isSelected && (
                    <span className="text-xs text-primary font-bold">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">Changes apply instantly.</p>
      </section>

      {/* Avatar */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Avatar
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt="Avatar preview"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-muted-foreground">
                {getInitials(displayName || "?")}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Change avatar
            </button>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, GIF, WEBP · Max 5 MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </section>

      {/* Profile fields */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Profile
        </h2>

        <div className="space-y-1">
          <label htmlFor="displayName" className="text-sm font-medium">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
            <span className="pl-3 text-sm text-muted-foreground">@</span>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="flex-1 bg-transparent px-2 py-2 text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder="username"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Letters, numbers, underscores · 3–30 characters
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="A little about yourself…"
          />
        </div>
      </section>

      {/* Reading goals */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Year in Books — {currentYear}
        </h2>
        <div className="space-y-3">
          {[
            { id: "readingGoal", label: "Books finished", unit: "books", value: readingGoal, set: setReadingGoal, placeholder: "e.g. 24" },
            { id: "pagesGoal", label: "Pages read", unit: "pages", value: pagesGoal, set: setPagesGoal, placeholder: "e.g. 10000" },
            { id: "listeningGoal", label: "Listening hours", unit: "hours", value: listeningGoal, set: setListeningGoal, placeholder: "e.g. 30" },
          ].map(({ id, label, unit, value, set, placeholder }) => (
            <div key={id} className="flex items-center gap-3">
              <label htmlFor={id} className="text-sm font-medium w-36 shrink-0">{label}</label>
              <input
                id={id}
                type="number"
                min="1"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder={placeholder}
                className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-sm text-muted-foreground">{unit}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveGoals}
            disabled={goalsSaving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {goalsSaving ? "Saving…" : "Save goals"}
          </button>
          {goalsSaved && <span className="text-xs text-green-600">Goals saved.</span>}
        </div>
        <p className="text-xs text-muted-foreground">Leave blank to skip that goal type.</p>
      </section>

      {/* Feedback */}
      {error && (
        <div className="rounded-md bg-destructive/15 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-500/15 border border-green-500/30 px-4 py-3 text-sm text-green-700">
          Profile saved successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>

      {/* What I Like to Read */}
      <ReadingPreferencesSection />

      {/* Your Reading Data */}
      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your Reading Data
        </h2>
        <div className="rounded-md border border-border bg-card px-4 py-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            Export a CSV of your entire library, ratings, and reading dates.
          </p>
          <button
            type="button"
            onClick={() => { window.location.href = "/api/export"; }}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            Download CSV
          </button>
        </div>
      </section>

      {/* Danger zone */}
      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-destructive">
          Danger zone
        </h2>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium">Clear library</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently removes all books from your library. The books themselves are not deleted, only your reading history and statuses. Use this to re-import cleanly.
            </p>
          </div>

          {clearStep === "idle" && (
            <button
              type="button"
              onClick={() => setClearStep("confirm")}
              className="rounded-md border border-destructive/50 px-3 py-1.5 text-sm text-destructive font-medium hover:bg-destructive/10 transition-colors"
            >
              Clear library…
            </button>
          )}

          {clearStep === "confirm" && (
            <div className="space-y-2">
              <p className="text-sm text-destructive font-medium">
                Are you sure? This cannot be undone.
              </p>
              {clearError && (
                <p className="text-xs text-destructive">{clearError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearLibrary}
                  className="rounded-md bg-destructive px-3 py-1.5 text-sm text-white font-medium hover:opacity-90 transition-opacity"
                >
                  Yes, clear everything
                </button>
                <button
                  type="button"
                  onClick={() => { setClearStep("idle"); setClearError(null); }}
                  className="rounded-md border border-input px-3 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {clearStep === "clearing" && (
            <p className="text-sm text-muted-foreground">Clearing library&hellip;</p>
          )}

          {clearStep === "cleared" && (
            <p className="text-sm text-green-700">
              Library cleared. You can now re-import.
            </p>
          )}
        </div>
      </section>
    </form>
  );
}

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

function ReadingPreferencesSection() {
  const [genres, setGenres] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [pace, setPace] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    fetch("/api/settings/preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) {
          setGenres(d.preferences.genres ?? []);
          setTopics(d.preferences.topics ?? []);
          setPace(d.preferences.pace_preference ?? "");
        }
        setLoaded(true);
      });
  }, []);

  function toggle(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function savePreferences() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genres, topics, pace_preference: pace || null }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!loaded) return null;

  return (
    <section className="space-y-4 border-t border-border pt-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        What I Like to Read
      </h2>

      <div className="space-y-3">
        <label className="text-sm font-medium">Genres</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggle(genres, setGenres, g)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                genres.includes(g)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Topics</label>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(topics, setTopics, t)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                topics.includes(t)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Pace preference</label>
        <div className="flex flex-wrap gap-2">
          {PACES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPace(pace === p ? "" : p)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                pace === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {saved && (
        <p className="text-xs text-green-700">Preferences saved.</p>
      )}

      <button
        type="button"
        onClick={savePreferences}
        disabled={saving}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </section>
  );
}
