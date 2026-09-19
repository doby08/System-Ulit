"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { INTERVIEW_METHODS, INTERVIEW_MODES, LANGUAGES } from "@/lib/constants";
import { useAnalytics } from "@/lib/client/hooks";
import { Filter, Download } from "lucide-react";

const CHART_COLORS = ["#3b6bf6", "#6366f1", "#a855f7", "#22d3ee", "#34d399", "#fbbf24", "#f87171"];

export default function AnalyticsPage() {
  const [draft, setDraft] = useState({
    surveyId: "",
    respondentGroup: "",
    interviewMethod: "",
    interviewMode: "",
    language: "",
    from: "",
    to: "",
  });
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { data, loading, refetch } = useAnalytics(filters);

  const overview = (data as any)?.overview;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-slate-400">Real response analytics — Likert, sentiment, and trends.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch}><Download className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Input placeholder="Survey ID" value={draft.surveyId} onChange={(e) => setDraft({ ...draft, surveyId: e.target.value })} />
          <Select
            value={draft.interviewMethod}
            onChange={(v) => setDraft({ ...draft, interviewMethod: v })}
            options={[{ value: "", label: "All Methods" }, ...INTERVIEW_METHODS.map((m) => ({ value: m.value, label: m.label }))]}
            placeholder="Interview Method"
          />
          <Select
            value={draft.interviewMode}
            onChange={(v) => setDraft({ ...draft, interviewMode: v })}
            options={[{ value: "", label: "All Modes" }, ...INTERVIEW_MODES.map((m) => ({ value: m.value, label: m.label }))]}
            placeholder="Interview Mode"
          />
          <Select
            value={draft.language}
            onChange={(v) => setDraft({ ...draft, language: v })}
            options={[{ value: "", label: "All Languages" }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label }))]}
            placeholder="Language"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <Input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          <Input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          <Button variant="gradient" onClick={() => setFilters(Object.fromEntries(Object.entries(draft).filter(([_, v]) => v)))}>Apply Filters</Button>
          <Button variant="ghost" onClick={() => { setDraft({ surveyId: "", respondentGroup: "", interviewMethod: "", interviewMode: "", language: "", from: "", to: "" }); setFilters({}); }}>Clear</Button>
        </div>
      </Card>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !overview || overview.totalResponses === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-slate-200 font-medium">No analytics yet.</p>
          <p className="text-sm text-slate-400 mt-1">Publish a survey and collect responses to see charts here.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Responses", value: overview.totalResponses },
            { label: "Completed", value: overview.completedInterviews },
            { label: "Avg Likert", value: overview.averageLikertScore },
            { label: "Satisfaction", value: `${overview.averageSatisfactionPercent}%` },
            { label: "Completion", value: `${overview.completionRate}%` },
            { label: "Respondents", value: overview.totalRespondents },
            { label: "Pending Sync", value: overview.offlinePending },
            { label: "Avg Duration", value: `${overview.averageDurationSec}s` },
          ].map((c) => (
            <Card key={c.label} className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{c.value}</p>
              <p className="text-xs text-slate-400 mt-1">{c.label}</p>
            </Card>
          ))}
          {!!(data as any)?.sentiment?.length && (
            <Card className="p-4 col-span-2 lg:col-span-4">
              <p className="text-sm font-semibold text-white mb-3">Sentiment</p>
              <div className="flex flex-wrap gap-2">
                {(data as any).sentiment.map((s: any, i: number) => (
                  <Badge key={i} variant={s.label === "Positive" ? "success" : s.label === "Negative" ? "error" : "default"}>
                    {s.label}: {s.value} ({s.percentage}%)
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
                {(data as any).sentiment.map((s: any, i: number) => (
                  <span key={i} style={{ width: `${s.percentage}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      </div>
  );
}
