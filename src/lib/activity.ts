/**
 * Best-effort activity event writer.
 * Never throws — activity events must never break main user flows.
 */
export async function createActivityEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  {
    userId,
    eventType,
    bookId,
    metadata = {},
  }: {
    userId: string;
    eventType: string;
    bookId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await db.from("activity_events").insert({
      user_id: userId,
      event_type: eventType,
      book_id: bookId ?? null,
      metadata,
    });
  } catch {
    // Silently swallow — never surface to the user
  }
}
