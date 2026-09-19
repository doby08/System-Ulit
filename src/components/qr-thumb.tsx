"use client";

import { useEffect, useState } from "react";
import { getQrCodeDetail } from "@/lib/client/hooks";
import { QrCode } from "lucide-react";

/**
 * Renders a real QR image for one admin QR token.
 *
 * The PNG is produced server-side by the bundled `qrcode` library (see
 * `src/lib/server/qr.ts`) — no third-party QR image service is contacted, so the
 * code works fully offline and never leaks the public URL to another host.
 */
export function QrThumb({
  id,
  size = 176,
  className,
  onLoaded,
}: {
  id: string;
  size?: number;
  className?: string;
  onLoaded?: (dataUrl: string) => void;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setDataUrl(null);
    setFailed(false);
    getQrCodeDetail(id)
      .then((result) => {
        if (!active) return;
        if (result?.dataUrl) {
          setDataUrl(result.dataUrl);
          onLoaded?.(result.dataUrl);
        } else {
          setFailed(true);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // `onLoaded` is intentionally omitted: callers pass an inline callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (failed) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]"
        style={{ width: size, height: size }}
      >
        <QrCode className="w-8 h-8" />
        <span className="text-[11px]">QR unavailable</span>
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-lg bg-black/20"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt="Survey QR code"
      width={size}
      height={size}
      className={className ?? "rounded-lg"}
      style={{ width: size, height: size }}
    />
  );
}