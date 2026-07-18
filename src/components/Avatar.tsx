import { UniversityLogo } from "./Logo";

function initials(first: string, last: string) {
  return `${(first[0] || "").toUpperCase()}${(last[0] || "").toUpperCase()}`;
}

const palette = [
  "bg-brand-600",
  "bg-accent-500",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-rose-600",
  "bg-cyan-700",
];

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function Avatar({
  first,
  last,
  src,
  size = 64,
  className = "",
}: {
  first: string;
  last: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${first} ${last}`}
        style={dim}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }
  const seed = `${first}-${last}`;
  return (
    <div
      style={dim}
      className={`flex items-center justify-center rounded-full font-bold text-white ${colorFor(
        seed
      )} ${className}`}
    >
      <span style={{ fontSize: size * 0.36 }}>{initials(first, last)}</span>
    </div>
  );
}

export function DeanPhoto({
  className = "",
  src,
  name = "Dean",
}: {
  className?: string;
  src?: string | null;
  name?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        className={`object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-accent-100 ${className}`}
    >
      <UniversityLogo className="h-1/2 w-1/2 opacity-70" />
    </div>
  );
}
