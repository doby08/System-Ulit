"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ComponentType } from "react";
import {
  Plus,
  QrCode,
  Library,
  BarChart3,
  FileText,
  RefreshCw,
  LayoutDashboard,
  HelpCircle,
} from "lucide-react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  Plus,
  QrCode,
  Library,
  BarChart3,
  FileText,
  RefreshCw,
  LayoutDashboard,
  HelpCircle,
};

export function QuickActionCard({
  action,
  delay = 0,
}: {
  action: { href: string; label: string; icon: string; accent: string };
  delay?: number;
}) {
  const Icon = iconMap[action.icon] ?? LayoutDashboard;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Link
        href={action.href}
        className={cn(
          "group flex items-center gap-3 rounded-2xl border border-[rgba(99,102,241,0.18)]",
          "bg-[#101838]/80 px-4 py-3.5 backdrop-blur",
          "transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(99,102,241,0.45)]",
          "hover:shadow-[0_16px_40px_-16px_rgba(59,107,246,0.65)]",
        )}
      >
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", action.accent)}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[13px] font-semibold text-slate-100">{action.label}</span>
      </Link>
    </motion.div>
  );
}

