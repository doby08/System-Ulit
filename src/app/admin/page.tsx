"use client";

import { useDashboard } from "@/lib/client/hooks";
import { StatCard } from "@/components/stat-card";
import { DashboardHero } from "@/components/dashboard/hero";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AiInsightCard } from "@/components/dashboard/ai-insight-card";
import { SystemInfoCarousel } from "@/components/dashboard/system-info";
import { PromoBanner } from "@/components/dashboard/promo-banner";
import {
  ClipboardList,
  Users,
  CheckCircle,
  Star,
  Heart,
} from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useDashboard();

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-5">
        <Skeleton className="h-52 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-center text-rose-300 py-12">{error}</p>
        <div className="text-center">
          <button onClick={refetch} className="text-sm text-indigo-300 hover:text-indigo-200">Retry</button>
        </div>
      </div>
    );
  }

  const d = data!;

  const stats = [
    { title: "Total Surveys / Interviews", value: d.totalSurveys, subtitle: `+${d.activeSurveys} active`, icon: <ClipboardList className="w-5 h-5 text-white" />, tone: "blue" as const },
    { title: "Total Respondents", value: d.totalRespondents, subtitle: d.totalRespondents ? "Registered respondents" : "No new responses", icon: <Users className="w-5 h-5 text-white" />, tone: "violet" as const },
    { title: "Completed Sessions", value: d.completedInterviews, subtitle: d.completedInterviews ? `${d.completionRate}% completion` : "No recent activity", icon: <CheckCircle className="w-5 h-5 text-white" />, tone: "teal" as const },
    { title: "Avg Likert Score", value: Number(d.averageLikertScore ?? 0).toFixed(2), subtitle: d.averageLikertScore ? "Across rated questions" : "No data yet", icon: <Star className="w-5 h-5 text-white" />, tone: "purple" as const },
    { title: "Avg Satisfaction", value: `${Number(d.averageSatisfactionPercent ?? 0).toFixed(2)}`, subtitle: d.averageSatisfactionPercent ? "Normalized satisfaction" : "No data yet", icon: <Heart className="w-5 h-5 text-white" />, tone: "rose" as const },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 space-y-5 max-w-[1400px] mx-auto">
      <DashboardHero />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <StatCard {...s} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <RecentActivity responses={d.recentResponses ?? []} surveys={d.recentSurveys ?? []} />
        <div className="space-y-5">
          <QuickActions />
          <AiInsightCard dashboard={d} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <SystemInfoCarousel />
        <PromoBanner />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Last sync: {d.lastSyncAt ? formatRelativeTime(d.lastSyncAt) : "never"}{d.offlinePending > 0 ? ` · ${d.offlinePending} pending` : ""}</span>
        <button onClick={refetch} className="text-indigo-300 hover:text-indigo-200">
          Refresh
        </button>
      </div>
      </motion.div>
  );
}

