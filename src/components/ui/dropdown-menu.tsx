"use client";

import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface DropdownItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  shortcut?: string;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function DropdownMenu({ trigger, items, align = "right", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const position = align === "right" ? "right-0" : "left-0";

  return (
    <div className={cn("relative inline-block", className)} ref={ref}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div className={cn("absolute z-50 mt-2 w-56 bg-[rgb(var(--bg-card))] border border-[var(--border-subtle)] rounded-xl shadow-[var(--shadow-glow)]", position)}>
          <div className="py-1">
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                  "hover:bg-[var(--bg-hover)]",
                  item.variant === "danger" && "text-rose-400 hover:bg-rose-500/10",
                  item.disabled && "opacity-50 cursor-not-allowed",
                )}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.shortcut && <span className="ml-auto text-xs text-[var(--text-muted)]">{item.shortcut}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
