export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-pulse">
      <div className="h-6 w-40 rounded bg-muted" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-muted" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-md bg-muted" />
        ))}
      </div>
    </div>
  );
}
