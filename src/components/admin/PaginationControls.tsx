import Link from "next/link";

/**
 * Server-side pagination control. `base` is the current query string (without
 * the leading "?") with all page params removed; the control appends/updates
 * the given `param` to produce prev/next links.
 */
export function PaginationControls({
  page,
  totalPages,
  param,
  base,
}: {
  page: number;
  totalPages: number;
  param: string;
  base: string;
}) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const sp = new URLSearchParams(base);
    if (p <= 1) sp.delete(param);
    else sp.set(param, String(p));
    const q = sp.toString();
    return q ? `?${q}` : "";
  }

  return (
    <div className="mt-4 flex items-center justify-between">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn-outline">
          ← Prev
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-slate-500">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn-outline">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}