"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Progress({ value, max = 100, className, ...props }: HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
}) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("relative h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden", className)} {...props}>
      <div
        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function ProgressCircle({ value, size = 24, className }: { value: number; size?: number; className?: string }) {
  const r = (size - 4) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - value / 100);
  return (
    <svg width={size} height={size} className={cn("transform -rotate-90", className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth={2} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#gradient)"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.5s ease" }}
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" className="text-indigo-500" stopColor="#6366F1" />
          <stop offset="100%" className="text-cyan-400" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
    </svg>
  );
}
