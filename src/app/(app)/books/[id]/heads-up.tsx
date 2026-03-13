"use client";

import { useEffect, useState } from "react";

type Warning = {
  type_id: string;
  name: string;
  category: string;
  a_lot: number;
  some: number;
  briefly: number;
  total: number;
  user_severity: string | null;
  is_comfort_flag: boolean;
};

type ContentWarningType = {
  id: string;
  name: string;
  category: string;
};

type Severity = "a_lot" | "some" | "briefly";

const SEVERITY_LABELS: Record<Severity, string> = {
  a_lot: "A lot",
  some: "Some",
  briefly: "Briefly",
};

type Props = {
  bookId: string;
  userId: string | null;
};

export function HeadsUp({ bookId, userId }: Props) {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [allTypes, setAllTypes] = useState<ContentWarningType[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [flagPanelOpen, setFlagPanelOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity>("some");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/books/${bookId}/heads-up`)
      .then((r) => r.json())
      .then((d) => {
        setWarnings(d.warnings ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookId]);

  useEffect(() => {
    if (flagPanelOpen && allTypes.length === 0) {
      fetch("/api/settings/comfort-zone")
        .then((r) => r.json())
        .then((d) => setAllTypes(d.all_types ?? []));
    }
  }, [flagPanelOpen, allTypes.length]);

  async function submitFlag() {
    if (!userId || !selectedType || submitting) return;
    setSubmitting(true);

    const res = await fetch(`/api/books/${bookId}/heads-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warning_type_id: selectedType, severity: selectedSeverity }),
    });

    if (res.ok) {
      const refreshed = await fetch(`/api/books/${bookId}/heads-up`).then((r) => r.json());
      setWarnings(refreshed.warnings ?? []);
      setFlagPanelOpen(false);
      setSelectedType(null);
    }

    setSubmitting(false);
  }

  async function removeFlag(typeId: string) {
    if (!userId) return;
    const res = await fetch(`/api/books/${bookId}/heads-up?warning_type_id=${typeId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      const refreshed = await fetch(`/api/books/${bookId}/heads-up`).then((r) => r.json());
      setWarnings(refreshed.warnings ?? []);
    }
  }

  if (loading) return null;

  // Group warnings by severity tier
  const aLot = warnings.filter((w) => w.a_lot >= w.some && w.a_lot >= w.briefly && w.a_lot > 0);
  const some = warnings.filter((w) => !aLot.includes(w) && w.some >= w.briefly && w.some > 0);
  const briefly = warnings.filter((w) => !aLot.includes(w) && !some.includes(w) && w.briefly > 0);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
      >
        Heads Up
        <span className="text-xs font-normal normal-case opacity-60">
          {expanded ? "▾ hide" : "▸ " + (warnings.length > 0 ? `${warnings.length} flag${warnings.length === 1 ? "" : "s"}` : "reveal")}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 rounded-md border border-border bg-card/50 p-4">
          {warnings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No content warnings flagged yet.</p>
          ) : (
            <div className="space-y-3">
              {aLot.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-destructive uppercase tracking-wide">A lot</p>
                  <div className="flex flex-wrap gap-2">
                    {aLot.map((w) => (
                      <WarningPill key={w.type_id} warning={w} userId={userId} onRemove={removeFlag} />
                    ))}
                  </div>
                </div>
              )}
              {some.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-orange-600 uppercase tracking-wide">Some</p>
                  <div className="flex flex-wrap gap-2">
                    {some.map((w) => (
                      <WarningPill key={w.type_id} warning={w} userId={userId} onRemove={removeFlag} />
                    ))}
                  </div>
                </div>
              )}
              {briefly.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Briefly</p>
                  <div className="flex flex-wrap gap-2">
                    {briefly.map((w) => (
                      <WarningPill key={w.type_id} warning={w} userId={userId} onRemove={removeFlag} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {userId && (
            <button
              onClick={() => setFlagPanelOpen((o) => !o)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {flagPanelOpen ? "Close" : "Flag a warning +"}
            </button>
          )}

          {flagPanelOpen && (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Warning type</label>
                <select
                  value={selectedType ?? ""}
                  onChange={(e) => setSelectedType(e.target.value || null)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a warning...</option>
                  {allTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">How much?</label>
                <div className="flex gap-2">
                  {(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSeverity(s)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        selectedSeverity === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {SEVERITY_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={submitFlag}
                disabled={!selectedType || submitting}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {submitting ? "Flagging..." : "Submit flag"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WarningPill({
  warning,
  userId,
  onRemove,
}: {
  warning: Warning;
  userId: string | null;
  onRemove: (typeId: string) => void;
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
      warning.is_comfort_flag ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-muted text-muted-foreground"
    }`}>
      {warning.is_comfort_flag && <span title="In your comfort flags">🔔</span>}
      {warning.name}
      <span className="opacity-60">({warning.total})</span>
      {userId && warning.user_severity && (
        <button
          onClick={() => onRemove(warning.type_id)}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          title="Remove your flag"
        >
          ×
        </button>
      )}
    </span>
  );
}
