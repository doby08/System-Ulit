"use client";

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

export function Tooltip({ content, children, align = "top" }: {
  content: string;
  children: React.ReactNode;
  align?: "top" | "bottom" | "left" | "right";
}) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShow(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  return (
    <div
      className="relative inline-block cursor-help"
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className={cn(
            "absolute z-50 px-2.5 py-1.5 text-xs text-[var(--text-primary)] bg-[rgb(var(--bg-elevated))] border border-[var(--border-subtle)] rounded-lg shadow-lg pointer-events-none whitespace-nowrap max-w-xs",
            align === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
            align === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
            align === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
            align === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
}
