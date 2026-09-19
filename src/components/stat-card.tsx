"use client";

import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  accent?: string;
  tone?: "blue" | "purple" | "teal" | "violet" | "rose";
}

const TONES: Record<string, string> = {
  blue: "border-[#3B6BF6]/25 bg-gradient-to-br from-[#16245c]/80 to-[#0C1330]/90",
  purple: "border-[#8B5CF6]/25 bg-gradient-to-br from-[#2A1B5E]/80 to-[#120F33]/90",
  teal: "border-[#14B8A6]/25 bg-gradient-to-br from-[#0B3B3B]/80 to-[#081A2A]/90",
  violet: "border-[#A855F7]/25 bg-gradient-to-br from-[#2E1B55]/80 to-[#141131]/90",
  rose: "border-[#FB7185]/25 bg-gradient-to-br from-[#4A1730]/80 to-[#1A0F24]/90",
};

export function StatCard({ title, value, icon, subtitle, accent, tone = "blue" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "stat-card rounded-2xl border p-4 backdrop-blur transition-all",
        TONES[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-slate-300 font-medium truncate">{title}</p>
          <p className="text-[26px] leading-8 font-bold text-white mt-1">{typeof value === "number" ? formatNumber(value) : value}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={cn("p-2 rounded-xl bg-white/10 border border-white/10", accent)}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

