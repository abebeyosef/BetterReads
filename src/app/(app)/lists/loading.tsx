export default function ListsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 rounded bg-muted" />
        <div className="h-9 w-28 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-1">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="aspect-square rounded bg-muted" />
              ))}
            </div>
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
