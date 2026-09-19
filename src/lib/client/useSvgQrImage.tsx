/**
 * React component for QR code image with loading fallback.
 * (Extracted from hooks.ts — JSX requires .tsx file.)
 */
import { useState, useEffect } from "react";

export function useSvgQrImage(url: string, className?: string) {
  const [img, setImg] = useState<boolean>(false);
  useEffect(() => {
    setImg(false);
    const t = setTimeout(() => setImg(true), 0);
    return () => clearTimeout(t);
  }, [url]);
  return (
    <div className={className ?? "inline-block"}>
      <img src={url} alt="QR" hidden={!img} />
      {!img && (
        <svg
          className="h-16 w-16 text-[var(--text-muted)] animate-pulse"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0a9 9 0 100 18 9 9 0 000-18z" />
        </svg>
      )}
    </div>
  );
}
