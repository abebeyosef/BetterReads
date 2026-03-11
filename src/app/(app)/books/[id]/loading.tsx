export default function BookDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-12 animate-pulse">
      <div className="flex gap-8">
        <div className="flex-shrink-0 h-56 w-36 rounded-md bg-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-7 w-3/4 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-6 w-16 rounded-full bg-muted" />
            ))}
          </div>
          <div className="h-8 w-32 rounded-md bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="space-y-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-3.5 w-full rounded bg-muted" />
          ))}
          <div className="h-3.5 w-2/3 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
