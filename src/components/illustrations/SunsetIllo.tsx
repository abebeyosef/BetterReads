export function SunsetIllo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 140"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className={className}
      preserveAspectRatio="xMidYMax meet"
    >
      {/* Sky horizon glow */}
      <ellipse cx="200" cy="105" rx="130" ry="28" fill="var(--illo-primary)" opacity="0.12" />

      {/* Sun half-circle at horizon */}
      <path d="M160 105 A40 40 0 0 1 240 105 Z" fill="var(--illo-primary)" opacity="0.35" />

      {/* Dune layers — back to front */}
      <path
        d="M0 140 Q60 100 130 118 Q200 136 270 112 Q340 88 400 110 L400 140 Z"
        fill="var(--illo-secondary)"
        opacity="0.18"
      />
      <path
        d="M0 140 Q50 110 120 128 Q190 146 260 124 Q330 102 400 120 L400 140 Z"
        fill="var(--illo-secondary)"
        opacity="0.25"
      />
      <path
        d="M0 140 Q40 120 100 132 Q170 144 240 130 Q310 116 400 128 L400 140 Z"
        fill="var(--illo-secondary)"
        opacity="0.4"
      />
      {/* Foreground dune */}
      <path
        d="M0 140 Q30 130 80 136 Q140 142 200 135 Q270 128 360 136 Q380 138 400 136 L400 140 Z"
        fill="var(--illo-secondary)"
        opacity="0.6"
      />

      {/* Dune grass — left side */}
      {/* Tall stalk 1 */}
      <path d="M30 136 Q28 115 25 95" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M25 95 Q20 80 15 70" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.65" strokeLinecap="round" />
      {/* Seed head */}
      <ellipse cx="14" cy="68" rx="3" ry="7" fill="var(--illo-leaf)" opacity="0.55" />
      {/* Side blades */}
      <path d="M25 95 Q15 88 8 82" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M20 108 Q10 100 4 92" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Stalk 2 */}
      <path d="M50 138 Q52 118 48 98" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M48 98 Q44 82 40 72" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
      <ellipse cx="39" cy="70" rx="2.5" ry="6" fill="var(--illo-leaf)" opacity="0.5" />
      <path d="M48 98 Q58 90 64 84" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Stalk 3 */}
      <path d="M15 138 Q12 122 18 108" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
      <ellipse cx="20" cy="105" rx="2" ry="5" fill="var(--illo-leaf)" opacity="0.45" transform="rotate(10 20 105)" />

      {/* Dune grass — right side */}
      {/* Tall stalk 1 */}
      <path d="M370 136 Q372 115 375 95" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M375 95 Q380 80 385 70" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.65" strokeLinecap="round" />
      <ellipse cx="386" cy="68" rx="3" ry="7" fill="var(--illo-leaf)" opacity="0.55" />
      <path d="M375 95 Q385 88 392 82" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.5" strokeLinecap="round" />
      <path d="M380 108 Q390 100 396 92" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Stalk 2 */}
      <path d="M350 138 Q348 118 352 98" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M352 98 Q356 82 360 72" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.6" strokeLinecap="round" />
      <ellipse cx="361" cy="70" rx="2.5" ry="6" fill="var(--illo-leaf)" opacity="0.5" />
      <path d="M352 98 Q342 90 336 84" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.45" strokeLinecap="round" />

      {/* Stalk 3 */}
      <path d="M385 138 Q388 122 382 108" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
      <ellipse cx="380" cy="105" rx="2" ry="5" fill="var(--illo-leaf)" opacity="0.45" transform="rotate(-10 380 105)" />
    </svg>
  );
}
