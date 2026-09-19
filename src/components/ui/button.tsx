"use client";

import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gradient";
  size?: "sm" | "md" | "lg" | "icon";
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--bg-base))] disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary: "text-white shadow-lg hover:shadow-xl transform hover:translate-y-[-1px]",
    secondary: cn("text-[var(--text-primary)] border border-[var(--border-subtle)]"),
    ghost: cn("hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"),
    danger: cn("text-white"),
    gradient: "text-white",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
    icon: "w-10 h-10 p-0",
  };

  const variantClasses = {
    primary: "btn-primary",
    gradient: "btn-primary",
    secondary: "btn-secondary",
    ghost: cn("hover:bg-[var(--bg-hover)]"),
    danger: cn("bg-red-600 hover:bg-red-500"),
  };

  return (
    <button
      className={cn(base, variantClasses[variant], sizes[size], className)}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      {props.children}
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
}
