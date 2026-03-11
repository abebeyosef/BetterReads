export function FernIllo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Left fern frond — main stem */}
      <path
        d="M100 155 Q85 130 70 100 Q55 70 45 40"
        stroke="var(--illo-leaf)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Left frond leaflets */}
      <path d="M92 138 Q78 132 72 120" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M85 122 Q68 114 62 100" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M78 106 Q60 96 56 82" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M72 90 Q55 78 52 64" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M66 74 Q52 60 50 46" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M58 58 Q47 44 46 32" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* Left leaflet tips (small ellipses) */}
      <ellipse cx="70" cy="119" rx="8" ry="4" fill="var(--illo-leaf)" opacity="0.3" transform="rotate(-40 70 119)" />
      <ellipse cx="60" cy="98" rx="8" ry="4" fill="var(--illo-leaf)" opacity="0.28" transform="rotate(-45 60 98)" />
      <ellipse cx="54" cy="78" rx="7" ry="3.5" fill="var(--illo-leaf)" opacity="0.26" transform="rotate(-48 54 78)" />
      <ellipse cx="49" cy="58" rx="6" ry="3" fill="var(--illo-leaf)" opacity="0.24" transform="rotate(-50 49 58)" />

      {/* Right fern frond — main stem */}
      <path
        d="M100 155 Q115 130 130 100 Q145 70 155 40"
        stroke="var(--illo-leaf)"
        strokeWidth="2.5"
        fill="none"
        opacity="0.5"
        strokeLinecap="round"
      />
      {/* Right frond leaflets */}
      <path d="M108 138 Q122 132 128 120" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M115 122 Q132 114 138 100" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.45" strokeLinecap="round" />
      <path d="M122 106 Q140 96 144 82" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M128 90 Q145 78 148 64" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M134 74 Q148 60 150 46" stroke="var(--illo-leaf)" strokeWidth="1.5" fill="none" opacity="0.35" strokeLinecap="round" />
      <path d="M142 58 Q153 44 154 32" stroke="var(--illo-leaf)" strokeWidth="1" fill="none" opacity="0.3" strokeLinecap="round" />
      {/* Right leaflet tips */}
      <ellipse cx="130" cy="119" rx="8" ry="4" fill="var(--illo-leaf)" opacity="0.3" transform="rotate(40 130 119)" />
      <ellipse cx="140" cy="98" rx="8" ry="4" fill="var(--illo-leaf)" opacity="0.28" transform="rotate(45 140 98)" />
      <ellipse cx="146" cy="78" rx="7" ry="3.5" fill="var(--illo-leaf)" opacity="0.26" transform="rotate(48 146 78)" />
      <ellipse cx="151" cy="58" rx="6" ry="3" fill="var(--illo-leaf)" opacity="0.24" transform="rotate(50 151 58)" />
    </svg>
  );
}
