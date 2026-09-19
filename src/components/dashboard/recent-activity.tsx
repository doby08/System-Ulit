"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, FileText } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export function RecentActivity({ responses, surveys }: { responses: any[]; surveys: any[] }) {
  const items = [...(responses ?? [])].slice(0, 5);
  return (
    <section className="rounded-3xl border border-[rgba(99,102,241,0.18)] bg-[#0A1030]/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2A4FE0]/25 text-[#7FB3FF]">
            <Activity className="h-4 w-4" />
          </span>
          Recent Activity
        </h2>
        <Link href="/admin/surveys" className="text-xs font-medium text-[#7FB3FF] hover:text-white">
          View All
        </Link>
      </div>
      {!items.length ? (
        <div className="flex flex-col items-center py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2A4FE0]/20 text-[#7FB3FF]">
            <FileText className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-semibold text-white">No activity yet.</p>
          <p className="mt-1 max-w-xs text-xs text-slate-400">
            Create your first interview/survey to get started.
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((r: any) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{r.surveyTitle}</p>
                <p className="truncate text-xs text-slate-400">{r.respondent} · {formatRelativeTime(r.submittedAt)}</p>
              </div>
              <Link href="/admin/respondents" className="flex items-center gap-1 text-xs text-[#7FB3FF] hover:text-white">
                Details <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!!surveys?.length && (
        <p className="mt-3 text-[11px] text-slate-500">
          Tracking {surveys.length} recent {surveys.length === 1 ? "survey" : "surveys"}.
        </p>
      )}
    </section>
  );
}
