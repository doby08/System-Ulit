"use client";

import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "input-field",
        "w-full bg-[rgb(var(--bg-base))] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 text-sm",
        "text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-y",
        "transition-all duration-200 focus:border-[var(--border-strong)] focus:ring-2 focus:ring-[rgba(99,102,241,0.25)]",
        className,
      )}
      {...props}
    />
  );
}
