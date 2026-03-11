export function WavesIllo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className={className}
      preserveAspectRatio="xMidYMax slice"
    >
      {/* Back wave */}
      <path
        d="M0 70 Q50 50 100 68 Q150 86 200 66 Q250 46 300 64 Q350 82 400 62 L400 100 L0 100 Z"
        fill="var(--illo-primary)"
        opacity="0.15"
      />
      {/* Middle wave */}
      <path
        d="M0 78 Q60 60 120 76 Q180 92 240 74 Q300 56 360 76 Q380 82 400 78 L400 100 L0 100 Z"
        fill="var(--illo-primary)"
        opacity="0.22"
      />
      {/* Front wave */}
      <path
        d="M0 88 Q70 72 140 88 Q210 104 280 86 Q340 70 400 88 L400 100 L0 100 Z"
        fill="var(--illo-primary)"
        opacity="0.32"
      />

      {/* Seagrass left */}
      <path d="M18 100 Q14 78 20 62" stroke="var(--illo-leaf)" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M20 62 Q26 48 18 36" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      <path d="M28 100 Q32 80 26 64" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M26 64 Q20 50 28 38" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M10 100 Q6 82 12 68" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />

      {/* Seagrass right */}
      <path d="M382 100 Q386 78 380 62" stroke="var(--illo-leaf)" strokeWidth="2.5" fill="none" opacity="0.7" strokeLinecap="round" />
      <path d="M380 62 Q374 48 382 36" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.65" strokeLinecap="round" />
      <path d="M372 100 Q368 80 374 64" stroke="var(--illo-leaf)" strokeWidth="2" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M374 64 Q380 50 372 38" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.55" strokeLinecap="round" />
      <path d="M390 100 Q394 82 388 68" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}
