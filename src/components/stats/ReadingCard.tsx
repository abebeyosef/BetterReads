import Image from "next/image";

type ReadingCardData = {
  year: number;
  month: number | null;
  bookCount: number;
  pageCount: number;
  topGenre: string | null;
  topVibes: string[];
  avgRating: number | null;
  lovedBook: string | null;
  fastestRead: { title: string | null; days: number } | null;
  covers: string[];
};

export function ReadingCard({ data }: { data: ReadingCardData }) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const periodLabel = data.month ? `${monthNames[data.month - 1]} ${data.year}` : `${data.year}`;

  return (
    <div
      id="reading-card"
      className="w-[600px] rounded-2xl border border-border bg-card p-8 space-y-6 shadow-xl"
    >
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">BetterReads</p>
        <h2 className="text-xl font-bold">{periodLabel} Reading Card</h2>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold">{data.bookCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.bookCount === 1 ? "book" : "books"}</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{data.pageCount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">pages</p>
        </div>
        <div>
          <p className="text-3xl font-bold">{data.avgRating !== null ? `${data.avgRating.toFixed(1)}★` : "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">avg rating</p>
        </div>
      </div>

      {/* Covers row */}
      {data.covers.length > 0 && (
        <div className="flex gap-2 justify-center">
          {data.covers.map((url, i) => (
            <div key={i} className="relative h-20 w-12 overflow-hidden rounded-sm shadow-sm">
              <Image src={url} alt="" fill className="object-cover" sizes="48px" />
            </div>
          ))}
        </div>
      )}

      {/* Details */}
      <div className="space-y-1.5 text-sm">
        {data.topGenre && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Top genre</span>
            <span className="font-medium">{data.topGenre}</span>
          </div>
        )}
        {data.lovedBook && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Loved</span>
            <span className="font-medium line-clamp-1 max-w-[60%] text-right">{data.lovedBook}</span>
          </div>
        )}
        {data.fastestRead && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fastest read</span>
            <span className="font-medium">{data.fastestRead.days === 0 ? "Same day" : `${data.fastestRead.days}d`}</span>
          </div>
        )}
      </div>
    </div>
  );
}
