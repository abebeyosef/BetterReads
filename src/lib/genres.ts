// Google Books returns verbose category strings like:
//   "Fiction / Science Fiction"
//   "Juvenile Fiction / Adventure & Adventurers"
//   "Computers / Programming Languages / JavaScript"
//
// This normalizer takes the most specific segment (last after "/"),
// strips common noise prefixes ("Juvenile", "Young Adult"), deduplicates,
// and filters out bare catch-all labels that are too vague to be useful.

const NOISE_PREFIXES = ["Juvenile ", "Young Adult ", "Comics & Graphic Novels / "];

const TOO_VAGUE = new Set([
  "Fiction",
  "Nonfiction",
  "Non-fiction",
  "General",
  "Miscellaneous",
  "Literary Collections",
]);

export function normalizeGenres(raw: string[] | null | undefined): string[] | null {
  if (!raw || raw.length === 0) return null;

  const seen = new Set<string>();
  const result: string[] = [];

  for (const category of raw) {
    // Take the most specific segment (last part after " / ")
    const segments = category.split(" / ").map((s) => s.trim());
    let label = segments[segments.length - 1];

    // Strip noise prefixes
    for (const prefix of NOISE_PREFIXES) {
      if (label.startsWith(prefix)) {
        label = label.slice(prefix.length);
        break;
      }
    }

    label = label.trim();

    if (!label || TOO_VAGUE.has(label) || seen.has(label)) continue;
    seen.add(label);
    result.push(label);
  }

  return result.length > 0 ? result : null;
}
