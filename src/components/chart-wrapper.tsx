"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ChartContainer({
  children,
  className,
  title,
  description,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className={cn("card p-6", className)}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          {description && <p className="text-sm text-[var(--text-secondary)] mt-1">{description}</p>}
        </div>
      )}
      <div className="h-[280px] w-full">{children}</div>
    </div>
  );
}
