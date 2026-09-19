"use client";

import { Zap } from "lucide-react";
import { QUICK_ACTIONS } from "@/lib/constants";
import { QuickActionCard } from "@/components/quick-action-card";

export function QuickActions() {
  return (
    <section className="rounded-3xl border border-[rgba(99,102,241,0.18)] bg-[#0A1030]/70 p-5 backdrop-blur">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
        <Zap className="h-4 w-4 text-amber-300" /> Quick Actions
      </h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_ACTIONS.map((action, i) => (
          <QuickActionCard key={action.label} action={action} delay={i * 0.03} />
        ))}
      </div>
    </section>
  );
}
