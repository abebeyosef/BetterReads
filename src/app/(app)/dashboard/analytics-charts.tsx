"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export type AnalyticsData = {
  booksByYear: { year: number; count: number }[];
  booksByMonth: { month: string; count: number }[];
  genreBreakdown: { genre: string; count: number }[];
  ratingDistribution: { rating: number; label: string; count: number }[];
  currentYear: number;
};

const BAR_COLOR = "hsl(var(--primary))";
const BAR_MUTED = "hsl(var(--muted-foreground) / 0.4)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} {payload[0].value === 1 ? "book" : "books"}</p>
    </div>
  );
}

export function BooksPerYearChart({ data }: { data: AnalyticsData["booksByYear"] }) {
  if (data.length === 0) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="year" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={BAR_COLOR} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BooksPerMonthChart({
  data,
  currentYear,
}: {
  data: AnalyticsData["booksByMonth"];
  currentYear: number;
}) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyChart message={`No books finished in ${currentYear} yet.`} />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.count > 0 ? BAR_COLOR : BAR_MUTED} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GenreChart({ data }: { data: AnalyticsData["genreBreakdown"] }) {
  if (data.length === 0) return <EmptyChart message="No genre data available." />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
      >
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="genre"
          width={110}
          tick={{ fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]} fill={BAR_COLOR} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RatingChart({ data }: { data: AnalyticsData["ratingDistribution"] }) {
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) return <EmptyChart message="No ratings yet." />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
        <Bar dataKey="count" radius={[3, 3, 0, 0]} fill={BAR_COLOR} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ message = "Not enough data yet." }: { message?: string }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
