export function BookshelfIllo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className={className}
      preserveAspectRatio="xMidYMax meet"
    >
      {/* Shelf plank */}
      <rect x="0" y="100" width="400" height="8" rx="2" fill="var(--illo-secondary)" opacity="0.35" />

      {/* Book spines — varied heights and widths */}
      {/* Book 1 */}
      <rect x="12" y="58" width="18" height="42" rx="2" fill="var(--illo-primary)" opacity="0.7" />
      <rect x="14" y="62" width="2" height="34" rx="1" fill="var(--illo-secondary)" opacity="0.3" />

      {/* Book 2 */}
      <rect x="32" y="70" width="14" height="30" rx="2" fill="var(--illo-leaf)" opacity="0.6" />

      {/* Book 3 */}
      <rect x="48" y="50" width="20" height="50" rx="2" fill="var(--illo-secondary)" opacity="0.45" />
      <rect x="50" y="55" width="2" height="40" rx="1" fill="var(--illo-primary)" opacity="0.25" />

      {/* Book 4 — leaning slightly (simulated with a parallelogram-like shape) */}
      <rect x="70" y="62" width="15" height="38" rx="2" fill="var(--illo-primary)" opacity="0.55" />

      {/* Book 5 */}
      <rect x="87" y="55" width="22" height="45" rx="2" fill="var(--illo-leaf)" opacity="0.5" />
      <rect x="89" y="60" width="2" height="36" rx="1" fill="var(--illo-secondary)" opacity="0.2" />

      {/* Book 6 */}
      <rect x="111" y="68" width="13" height="32" rx="2" fill="var(--illo-secondary)" opacity="0.6" />

      {/* Book 7 */}
      <rect x="126" y="42" width="24" height="58" rx="2" fill="var(--illo-primary)" opacity="0.65" />
      <rect x="128" y="48" width="2" height="46" rx="1" fill="var(--illo-secondary)" opacity="0.2" />

      {/* Book 8 */}
      <rect x="152" y="60" width="16" height="40" rx="2" fill="var(--illo-leaf)" opacity="0.55" />

      {/* Book 9 */}
      <rect x="170" y="72" width="12" height="28" rx="2" fill="var(--illo-primary)" opacity="0.5" />

      {/* Book 10 */}
      <rect x="184" y="56" width="19" height="44" rx="2" fill="var(--illo-secondary)" opacity="0.5" />

      {/* Book 11 */}
      <rect x="205" y="48" width="21" height="52" rx="2" fill="var(--illo-primary)" opacity="0.6" />
      <rect x="207" y="54" width="2" height="42" rx="1" fill="var(--illo-leaf)" opacity="0.2" />

      {/* Gap — bookend */}
      <rect x="228" y="70" width="6" height="38" rx="1" fill="var(--illo-secondary)" opacity="0.3" />

      {/* Book 12 */}
      <rect x="236" y="62" width="17" height="38" rx="2" fill="var(--illo-leaf)" opacity="0.65" />

      {/* Book 13 */}
      <rect x="255" y="52" width="20" height="48" rx="2" fill="var(--illo-primary)" opacity="0.55" />

      {/* Book 14 */}
      <rect x="277" y="66" width="14" height="34" rx="2" fill="var(--illo-secondary)" opacity="0.5" />

      {/* Small potted plant */}
      {/* Pot */}
      <path d="M305 100 L299 80 H317 L311 100 Z" fill="var(--illo-primary)" opacity="0.6" />
      <rect x="298" y="78" width="20" height="4" rx="1" fill="var(--illo-secondary)" opacity="0.4" />
      {/* Soil */}
      <ellipse cx="308" cy="79" rx="9" ry="3" fill="var(--illo-secondary)" opacity="0.35" />
      {/* Stems */}
      <path d="M308 79 Q302 60 295 52" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M308 79 Q310 58 318 48" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.7" />
      <path d="M308 79 Q308 62 308 52" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Leaves */}
      <ellipse cx="294" cy="50" rx="7" ry="4" fill="var(--illo-leaf)" opacity="0.65" transform="rotate(-30 294 50)" />
      <ellipse cx="319" cy="46" rx="7" ry="4" fill="var(--illo-leaf)" opacity="0.65" transform="rotate(25 319 46)" />
      <ellipse cx="308" cy="50" rx="6" ry="3.5" fill="var(--illo-leaf)" opacity="0.6" />
    </svg>
  );
}
