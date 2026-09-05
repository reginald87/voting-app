"use client";

import { useCallback, useEffect, useState } from "react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  imgClassName?: string;
  buttonClassName?: string;
}

export function ZoomableImage({
  src,
  alt,
  imgClassName,
  buttonClassName,
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View larger image${alt ? ` of ${alt}` : ""}`}
        title="Click to enlarge"
        className={`inline-block cursor-zoom-in border-0 bg-transparent p-0 ${buttonClassName ?? ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          <div
            className="max-h-full max-w-5xl overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] w-auto rounded-xl object-contain shadow-2xl"
            />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white transition hover:bg-white/25"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}