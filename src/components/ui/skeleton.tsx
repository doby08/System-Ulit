"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton rounded-[var(--radius-card)] bg-[rgb(var(--bg-base))] bg-[length:700px_100%] bg-[position:-700px_0] animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}
