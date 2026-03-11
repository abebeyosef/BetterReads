# BetterReads — Design Overhaul Brief

## Goal

Replace the current dark zinc theme with a warm, inviting light-mode design system.
The app should feel like a cosy independent bookshop crossed with a beach house library —
natural textures, organic warmth, nothing harsh or masculine.

Four named themes are available, user-selectable from Settings.
The default theme is **Driftwood**.

---

## 1. Theme System Architecture

### Storage
- Save selected theme name to `localStorage` key `betterreads-theme`
- Also write it to a `same-site` cookie called `betterreads-theme` (for SSR)
- On first load, if no preference exists, default to `driftwood`

### Application
- Set `data-theme="<name>"` on the `<html>` element (not `className="dark"`)
- Remove the existing `className="dark"` from `src/app/layout.tsx`
- Add an inline `<script>` in `<head>` to read the cookie/localStorage and apply `data-theme` before first paint (prevents FOUC)

### ThemeProvider
Create `src/components/theme-provider.tsx` — a client component that:
- Reads current theme from localStorage on mount
- Provides a `useTheme()` hook returning `{ theme, setTheme }`
- When `setTheme(name)` is called, updates `data-theme` on `<html>`, saves to localStorage, and updates the cookie
- Wraps children in a `ThemeContext`

Add `<ThemeProvider>` inside `<body>` in `src/app/layout.tsx`.

---

## 2. CSS Variables — Four Themes

Replace the content of `src/app/globals.css` **@layer base** block (keep the tailwind directives).
Use `[data-theme="..."]` selectors. All values are in shadcn HSL format (no `hsl()` wrapper).

```css
/* ── Default / Driftwood ─────────────────────────────── */
:root,
[data-theme="driftwood"] {
  --background:           30 52% 97%;
  --foreground:           20 50% 17%;
  --card:                 30 42% 90%;
  --card-foreground:      20 50% 17%;
  --popover:              30 52% 97%;
  --popover-foreground:   20 50% 17%;
  --primary:              30 43% 48%;
  --primary-foreground:   0 0% 100%;
  --secondary:            30 42% 90%;
  --secondary-foreground: 26 53% 24%;
  --muted:                30 53% 91%;
  --muted-foreground:     28 26% 47%;
  --accent:               30 53% 91%;
  --accent-foreground:    26 53% 24%;
  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border:               33 34% 80%;
  --input:                33 34% 80%;
  --ring:                 30 43% 48%;
  --radius:               0.6rem;

  /* Illustration accent colours used by SVG components */
  --illo-primary:   #b07d45;
  --illo-secondary: #5c3d1e;
  --illo-leaf:      #6a9450;
}

/* ── Sea Salt ─────────────────────────────────────────── */
[data-theme="seasalt"] {
  --background:           150 14% 97%;
  --foreground:           168 36% 15%;
  --card:                 155 21% 91%;
  --card-foreground:      168 36% 15%;
  --popover:              150 14% 97%;
  --popover-foreground:   168 36% 15%;
  --primary:              168 30% 42%;
  --primary-foreground:   0 0% 100%;
  --secondary:            155 21% 91%;
  --secondary-foreground: 163 34% 18%;
  --muted:                160 30% 89%;
  --muted-foreground:     165 21% 44%;
  --accent:               160 30% 89%;
  --accent-foreground:    163 34% 18%;
  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border:               162 19% 83%;
  --input:                162 19% 83%;
  --ring:                 168 30% 42%;
  --radius:               0.6rem;

  --illo-primary:   #4a8a7a;
  --illo-secondary: #1f4038;
  --illo-leaf:      #338050;
}

/* ── Warm Linen ───────────────────────────────────────── */
[data-theme="linen"] {
  --background:           40 33% 97%;
  --foreground:           28 28% 13%;
  --card:                 38 37% 91%;
  --card-foreground:      28 28% 13%;
  --popover:              40 33% 97%;
  --popover-foreground:   28 28% 13%;
  --primary:              38 19% 40%;
  --primary-foreground:   0 0% 100%;
  --secondary:            38 37% 91%;
  --secondary-foreground: 28 28% 13%;
  --muted:                38 33% 89%;
  --muted-foreground:     38 17% 46%;
  --accent:               38 33% 89%;
  --accent-foreground:    28 28% 13%;
  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border:               38 27% 80%;
  --input:                38 27% 80%;
  --ring:                 38 19% 40%;
  --radius:               0.6rem;

  --illo-primary:   #7a6e54;
  --illo-secondary: #2c2418;
  --illo-leaf:      #5a7040;
}

/* ── Golden Hour ──────────────────────────────────────── */
[data-theme="golden"] {
  --background:           35 67% 97%;
  --foreground:           20 54% 15%;
  --card:                 30 57% 92%;
  --card-foreground:      20 54% 15%;
  --popover:              35 67% 97%;
  --popover-foreground:   20 54% 15%;
  --primary:              28 61% 48%;
  --primary-foreground:   0 0% 100%;
  --secondary:            30 57% 92%;
  --secondary-foreground: 20 54% 15%;
  --muted:                33 80% 88%;
  --muted-foreground:     26 34% 44%;
  --accent:               33 80% 88%;
  --accent-foreground:    20 54% 15%;
  --destructive:          0 72% 51%;
  --destructive-foreground: 0 0% 100%;
  --border:               33 57% 81%;
  --input:                33 57% 81%;
  --ring:                 28 61% 48%;
  --radius:               0.6rem;

  --illo-primary:   #c47030;
  --illo-secondary: #3a2010;
  --illo-leaf:      #7a8040;
}
```

---

## 3. Theme Selector in Settings

In `settings-form.tsx`, add a **"Appearance"** section above the Profile section.

It shows four clickable cards in a 2×2 grid (or horizontal row on wide screens).
Each card shows:
- A colour swatch strip (the six colour stops for that theme)
- The theme name
- A tick mark when selected

Wire it to `useTheme()` — clicking a card immediately applies the theme (live preview).
No save button needed for this section (instant apply + persisted to localStorage).

Theme names / labels:
- `driftwood` → "Driftwood"
- `seasalt` → "Sea Salt"
- `linen` → "Warm Linen"
- `golden` → "Golden Hour"

---

## 4. Decorative SVG Illustrations

Create reusable SVG illustration components in `src/components/illustrations/`.
These should use `var(--illo-primary)`, `var(--illo-secondary)`, and `var(--illo-leaf)` as fill/stroke
so they automatically recolour when the theme changes.

### Components to build:

#### `BookshelfIllo.tsx`
Horizontal bookshelf with varied-height book spines and a small potted plant.
Use subtle opacity (opacity-20 to opacity-25). Used on Dashboard hero.
Width: full container width, height ~120px.

#### `WavesIllo.tsx`
Three layered wave curves filling the bottom of a panel, with two seagrass stalks
on either side. Used on the Library page hero banner.
Width: full, height ~100px.

#### `FernIllo.tsx`
Two large botanical fern fronds with leaflets. Centred, slightly behind content.
Opacity ~20%. Used on empty states (e.g. empty library, empty lists).

#### `SunsetIllo.tsx`
Horizon sunset with rolling sand dune layers, tall dune grass with seed heads
on left and right edges. Used on the Login / Sign-up auth pages.
Width: full, height ~140px.

All illustrations should be `aria-hidden="true"` and `pointer-events: none`.
Keep them as pure SVG paths — no external images.

---

## 5. Page-by-page illustration placement

### Dashboard (`/dashboard`)
- Add `<BookshelfIllo />` in the hero welcome card, positioned absolutely at the right edge,
  behind the text content (z-index lower than text). Fade with a left-to-right gradient
  mask so it doesn't crowd the text.

### Library (`/library`)
- Add a hero banner at the top of the page (above the book grid) that contains:
  - Left: "My Library" heading + book count
  - Right (absolutely positioned, clipped): `<WavesIllo />`
  - Background: `bg-card`

### Empty states
- When the library has 0 books: show `<FernIllo />` centred above the "Import from Goodreads" call to action.
- When a list is empty: same treatment.

### Auth pages (`/login`, `/signup`)
- Below the form card, add `<SunsetIllo />` as a decorative footer element.
- The auth page background should use `bg-background` (which will now be warm, not white).

---

## 6. Typography refinements

- Change the font in `src/app/layout.tsx` from `Inter` to `"Lora"` (serif) for headings +
  `"Inter"` for body. Import both from `next/font/google`.
- Apply `font-serif` class to `h1`, `h2`, `h3` elements across the app — or add a
  global CSS rule: `h1, h2, h3 { font-family: var(--font-lora), serif; }`
- Add CSS variable `--font-lora` via `variable: "--font-lora"` in the Lora font config.

---

## 7. AppNav visual update

The nav currently uses `bg-background/95 backdrop-blur`. That's fine — it will automatically
pick up the theme colours. Additionally:
- Make the logo ("BetterReads") use `font-serif` and slightly larger (text-xl)
- Add a subtle bottom border with `border-border/60`

---

## 8. Card & button refinements (global)

Add these utility overrides in globals.css:

```css
@layer components {
  /* Cards get a very subtle warm shadow instead of the default ring-based border */
  .card-warm {
    box-shadow: 0 2px 12px hsl(var(--foreground) / 0.06);
  }

  /* Primary buttons get slightly rounded corners matching --radius */
  .btn-warm {
    border-radius: var(--radius);
  }
}
```

Where shadcn `<Card>` components are used, add `card-warm` to their className.

---

## 9. Implementation order

1. `globals.css` — add all four theme variable blocks, remove `.dark` block
2. `src/app/layout.tsx` — remove `className="dark"`, add FOUC-prevention script, add ThemeProvider
3. `src/components/theme-provider.tsx` — ThemeProvider + useTheme hook
4. `src/components/illustrations/` — all four SVG components
5. Dashboard, Library, empty states — add illustrations
6. Auth pages — add SunsetIllo, warm background
7. `settings-form.tsx` — add Appearance / Theme selector section
8. AppNav — typography update
9. Test all four themes via the Settings selector; confirm no white flash on load

---

## Design tokens quick reference

| Role | Driftwood | Sea Salt | Warm Linen | Golden Hour |
|------|-----------|----------|------------|-------------|
| Background | #faf6f0 | #f7f9f8 | #faf8f4 | #fdf8f2 |
| Card | #ede0d0 | #e8f0ed | #f0ebe0 | #f5ece0 |
| Primary button | #b07d45 | #4a8a7a | #7a6e54 | #c47030 |
| Border | #d4c1a8 | #ccddd7 | #ddd4be | #e8d4b8 |
| Body text | #3d2415 | #1a3530 | #2c2418 | #3a2010 |
| Muted text | #9a7858 | #5a8878 | #8a7c62 | #9a6848 |

---

## Notes for Claude Code

- Do NOT reintroduce the `.dark` class or dark mode variables — these themes are all light-mode.
- The `ThemeProvider` must be a Client Component (`"use client"`) but `layout.tsx` can remain a Server Component — wrap only `{children}` in the provider inside the body tag.
- Cookie should be set with `document.cookie = \`betterreads-theme=\${name}; path=/; max-age=31536000; SameSite=Lax\``
- The FOUC-prevention script reads `document.cookie` for `betterreads-theme`, falls back to `localStorage.getItem('betterreads-theme')`, then falls back to `'driftwood'`, and sets `document.documentElement.setAttribute('data-theme', theme)`.
- SVG illustrations: keep path data concise, use `currentColor` where possible, ensure they scale gracefully with `viewBox` and `preserveAspectRatio="xMidYMid slice"` or `xMaxYMax meet` as appropriate.
- Update `PROGRESS.md` after completing all steps.
