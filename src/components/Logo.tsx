export function UniversityLogo({
  className = "",
  src,
}: {
  className?: string;
  src?: string | null;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Bayelsa Medical University" className={className} />;
  }
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Bayelsa Medical University">
      <circle cx="32" cy="32" r="30" fill="#1f59e0" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M32 14 L40 20 V32 C40 40 36 45 32 48 C28 45 24 40 24 32 V20 Z"
        fill="#fff"
      />
      <path d="M28 32 h8 M32 28 v8" stroke="#1f59e0" strokeWidth="2" />
      <text x="32" y="58" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700">
        BMU
      </text>
    </svg>
  );
}

export function SugLogo({
  className = "",
  src,
}: {
  className?: string;
  src?: string | null;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Student Union Government" className={className} />;
  }
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Student Union Government">
      <rect x="6" y="6" width="52" height="52" rx="12" fill="#f97316" />
      <rect x="10" y="10" width="44" height="44" rx="9" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M32 18 l5 5 -5 4 -5 -4 z M22 30 h20 M22 30 v10 a10 10 0 0 0 20 0 V30"
        fill="none"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="34" r="4" fill="#fff" />
    </svg>
  );
}
