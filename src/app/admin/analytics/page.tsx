"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { INTERVIEW_METHODS, INTERVIEW_MODES, LANGUAGES } from "@/lib/constants";
import { useAnalytics, type AnalyticsFilters } from "@/lib/client/hooks";
import { WaterLineChart } from "@/components/charts/water-line-chart";
import { AlertCircle, Filter, RefreshCw, Waves } from "lucide-react";

const EMPTY_DRAFT: AnalyticsFilters = {
  surveyId: "",
  respondentGroup: "",
  method: "",
  mode: "",
  language: "",
  from: "",
  to: "",
};

function compactDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: "#34d399",
  Negative: "#f87171",
  Neutral: "#94a3b8",
};

export default function AnalyticsPage() {
  const [draft, setDraft] = useState<AnalyticsFilters>(EMPTY_DRAFT);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const { data, loading, error, refetch } = useAnalytics(filters);

  const overview = data?.overview;
  const surveyOptions = [
    { value: "", label: "All surveys" },
    ...(data?.surveys ?? []).map((s) => ({ value: s.id, label: s.title })),
  ];

  const applyFilters = () =>
    setFilters(Object.fromEntries(Object.entries(draft).filter(([, value]) => Boolean(value))) as AnalyticsFilters);

  const clearFilters = () => {
    setDraft(EMPTY_DRAFT);
    setFilters({});
  };

  const trend = (data?.trend ?? []).map((point) => ({ ...point, date: compactDate(point.date) }));

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Waves className="w-6 h-6 text-cyan-300" /> Analytics
          </h1>
          <p className="text-sm text-slate-400">Real response analytics — response flow, sentiment, and per-question results.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            value={draft.surveyId}
            onChange={(v) => setDraft({ ...draft, surveyId: v })}
            options={surveyOptions}
            placeholder="All surveys"
          />
          <Select
            value={draft.method}
            onChange={(v) => setDraft({ ...draft, method: v })}
            options={[{ value: "", label: "All Methods" }, ...INTERVIEW_METHODS.map((m) => ({ value: m.value, label: m.label }))]}
            placeholder="Interview Method"
          />
          <Select
            value={draft.mode}
            onChange={(v) => setDraft({ ...draft, mode: v })}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input type="date" value={draft.from ?? ""} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
          <Input type="date" value={draft.to ?? ""} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
          <Button variant="gradient" onClick={applyFilters}>Apply Filters</Button>
        </div>
        <div className="mt-2">
          <Button variant="ghost" size="sm" onClick={clearFilters}>Clear All</Button>
        </div>
      </Card>

      {error ? (
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="w-4 h-4" /> {error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>Try again</Button>
        </Card>
      ) : loading ? (
        <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : !overview || overview.totalResponses === 0 ? (
        <Card className="p-10 text-center">
          <Waves className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium">No analytics yet.</p>
          <p className="text-sm text-slate-400 mt-1">Publish a survey and collect responses to see charts here.</p>
        </Card>
      ) : (
        <>
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
          </div>

          {/* Water line graph — response flow over time */}
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-sm font-semibold text-white">Response flow</p>
                <p className="text-xs text-slate-400">Responses and completed interviews over time.</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-cyan-400" /> Responses</span>
                <span className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-indigo-400" /> Completed</span>
              </div>
            </div>
            <WaterLineChart data={trend} height={300} />
          </Card>

          {/* Sentiment */}
          {!!data?.sentiment?.length && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-white mb-3">Sentiment</p>
              <div className="flex flex-wrap gap-2">
                {data.sentiment.map((s, i) => (
                  <Badge key={i} variant={s.label === "Positive" ? "success" : s.label === "Negative" ? "error" : "default"}>
                    {s.label}: {s.value} ({s.percentage}%)
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
                {data.sentiment.map((s, i) => (
                  <span key={i} style={{ width: `${s.percentage}%`, background: SENTIMENT_COLOR[s.label] ?? "#94a3b8" }} />
                ))}
              </div>
            </Card>
          )}

          {/* Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { title: "By interview method", rows: data?.byMethod ?? [] },
              { title: "By interview mode", rows: data?.byMode ?? [] },
              { title: "By respondent group", rows: data?.byGroup ?? [] },
            ].map((block) => (
              <Card key={block.title} className="p-5">
                <p className="text-sm font-semibold text-white mb-3">{block.title}</p>
                {block.rows.length ? (
                  <ul className="space-y-2.5">
                    {block.rows.map((row, index) => (
                      <li key={index}>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="truncate">{row.label}</span>
                          <span className="ml-2 shrink-0 text-slate-400">{row.value} · {row.percentage}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-[#3B6BF6] to-[#22D3EE]"
                            style={{ width: `${Math.min(100, row.percentage)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500">No data for this filter yet.</p>
                )}
              </Card>
            ))}
          </div>

          {/* Question results */}
          {!!data?.questions?.length && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-white mb-3">Question results</p>
              <div className="space-y-3">
                {data.questions.slice(0, 25).map((question) => (
                  <div key={question.questionId} className="rounded-xl border border-[var(--border-subtle)] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm text-slate-200">
                        <span className="text-slate-500 mr-2">{question.code}</span>
                        {question.text}
                      </p>
                      <Badge variant="default">{question.type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {question.answered} answered · {question.answerRate}% answer rate
                      {question.likert ? ` · Likert average ${question.likert.average} — ${question.likert.interpretation}` : ""}
                      {question.numeric ? ` · average ${question.numeric.average}` : ""}
                    </p>
                    {!!question.distribution?.length && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {question.distribution.slice(0, 8).map((entry, index) => (
                          <span key={index} className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-slate-300">
                            {entry.label}: {entry.value} ({entry.percentage}%)
                          </span>
                        ))}
                      </div>
                    )}
                    {!!question.sampleAnswers?.length && (
                      <ul className="mt-2 space-y-1">
                        {question.sampleAnswers.slice(0, 3).map((sample, index) => (
                          <li key={index} className="text-xs text-slate-400">“{sample}”</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
      </div>
  );
}
