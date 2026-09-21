"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw, AlertCircle, Quote, Waves } from "lucide-react";
import { LANGUAGES } from "@/lib/constants";

type SentimentKey = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

type InsightData = {
  count: number;
  totalTexts?: number;
  summary: string;
  sentiment: { label: string; count: number; percentage: number }[];
  keywords: { keyword: string; count: number; sentiment: string }[];
  themes: { theme: string; count: number; mentions?: string[] }[];
  painPoints: string[];
  suggestions: string[];
  concerns: string[];
  positiveFeedback: string[];
  negativeFeedback: string[];
  aiEnhanced: boolean;
  aiProvider: string;
  surveyTitle?: string | null;
  surveyTopic?: string | null;
  sources?: { questionId: string; code: string; text: string; count: number }[];
  storedSentiment?: Record<SentimentKey, number>;
};

const SENTIMENT_META: Record<string, { color: string; label: string }> = {
  POSITIVE: { color: "#34d399", label: "Positive" },
  NEUTRAL: { color: "#94a3b8", label: "Neutral" },
  NEGATIVE: { color: "#f87171", label: "Negative" },
};

export default function AiInsightsPage() {
  const [surveys, setSurveys] = useState<{ id: string; title: string }[]>([]);
  const [surveyId, setSurveyId] = useState("");
  const [language, setLanguage] = useState("");
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextSurveyId = surveyId, nextLanguage = language) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextSurveyId) params.set("surveyId", nextSurveyId);
      if (nextLanguage) params.set("language", nextLanguage);
      const res = await fetch(`/api/admin/analytics/unstructured${params.size ? `?${params}` : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Failed to load insights");
      setData(json.data as InsightData);

      if (!surveys.length) {
        const facets = await fetch("/api/admin/analytics/facets", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null);
        if (facets?.ok) {
          setSurveys(
            (facets.data?.surveys ?? []).map((s: { id: string; title: string }) => ({ id: s.id, title: s.title })),
          );
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load insights");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [language, surveyId, surveys.length]);

  useEffect(() => {
    load("", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load surveys for the dropdown when component mounts
  useEffect(() => {
    if (!surveys.length) {
      fetch("/api/admin/analytics/facets", { credentials: "include" })
        .then((r) => r.json())
        .then((facets) => {
          if (facets?.ok && facets.data?.surveys) {
            setSurveys(
              facets.data.surveys.map((s: { id: string; title: string }) => ({
                id: s.id,
                title: s.title,
              })),
            );
          }
        })
        .catch(() => {
          // Silently fail - surveys list is not critical
        });
    }
  }, []);


  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="w-6 h-6 text-cyan-300" /> AI Insights</h1>
          <p className="text-sm text-slate-400">Sentiment, keywords, themes, and AI summary from open-ended answers.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>
      <Card className="p-4 flex flex-wrap gap-3 items-end">
        <div className="min-w-[240px] flex-1 max-w-sm">
          <Select
            value={surveyId}
            onChange={(v) => { setSurveyId(v); load(v, language); }}
            options={[{ value: "", label: "All surveys" }, ...surveys.map((s) => ({ value: s.id, label: s.title }))]}
            placeholder="All surveys"
          />
        </div>
        <div className="min-w-[200px] flex-1 max-w-xs">
          <Select
            value={language}
            onChange={(v) => { setLanguage(v); load(surveyId, v); }}
            options={[{ value: "", label: "All languages" }, ...LANGUAGES.map((l) => ({ value: l.code, label: l.label }))]}
            placeholder="All languages"
          />
        </div>
        {data && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">{data.count} open-ended answers</Badge>
            <Badge variant={data.aiEnhanced ? "success" : "default"}>
              {data.aiEnhanced ? `AI: ${data.aiProvider}` : "Offline analysis engine"}
            </Badge>
          </div>
        )}
      </Card>

      {loading ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : error ? (
        <Card className="p-6">
          <p className="flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="w-4 h-4" /> {error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => load()}>Try again</Button>
        </Card>
      ) : !data || !data.count ? (
        <Card className="p-10 text-center">
          <Waves className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium">No insights yet.</p>
          <p className="text-sm text-slate-400 mt-1">Collect open-ended responses first — insights appear automatically.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Summary + sentiment breakdown */}
          <Card className="p-5">
            <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" /> AI summary
              {data.surveyTitle && <span className="text-xs font-normal text-slate-500">· {data.surveyTitle}</span>}
            </h2>
            <p className="text-sm text-slate-300 leading-6">{data.summary}</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(data.sentiment ?? []).map((entry) => {
                const meta = SENTIMENT_META[entry.label] ?? { color: "#94a3b8", label: entry.label };
                return (
                  <div key={entry.label} className="rounded-xl border border-[var(--border-subtle)] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-slate-300">
                        <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                      </span>
                      <span className="text-slate-400">{entry.count} · {entry.percentage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${Math.min(100, entry.percentage)}%`, background: meta.color }} />
                    </div>
                    {data.storedSentiment && (
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        stored at submission: {data.storedSentiment[entry.label as SentimentKey] ?? 0}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Keywords & themes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="font-semibold text-white mb-3">Keywords</h2>
              <div className="flex flex-wrap gap-2">
                {(data.keywords ?? []).slice(0, 24).map((keyword, index) => (
                  <Badge key={index} variant={keyword.sentiment === "POSITIVE" ? "success" : keyword.sentiment === "NEGATIVE" ? "error" : "default"}>
                    {keyword.keyword} · {keyword.count}
                  </Badge>
                ))}
                {!(data.keywords ?? []).length && <p className="text-sm text-slate-500">No recurring keywords yet.</p>}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold text-white mb-3">Themes</h2>
              <ul className="space-y-2">
                {(data.themes ?? []).slice(0, 8).map((theme, index) => (
                  <li key={index} className="rounded-xl border border-[var(--border-subtle)] p-3">
                    <div className="flex items-center justify-between text-sm text-slate-200">
                      <span>{theme.theme}</span>
                      <span className="text-xs text-slate-500">{theme.count} mentions</span>
                    </div>
                    {!!theme.mentions?.length && <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">“{theme.mentions[0]}”</p>}
                  </li>
                ))}
                {!(data.themes ?? []).length && <p className="text-sm text-slate-500">No dominant themes detected yet.</p>}
              </ul>
            </Card>
          </div>

          {/* Actionable lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { title: "Pain points", items: data.painPoints ?? [] },
              { title: "Suggestions", items: data.suggestions ?? [] },
              { title: "Concerns", items: data.concerns ?? [] },
            ].map((block) => (
              <Card key={block.title} className="p-5">
                <h2 className="font-semibold text-white mb-2">{block.title}</h2>
                {block.items.length ? (
                  <ul className="space-y-1.5">
                    {block.items.map((item, index) => (
                      <li key={index} className="text-sm text-slate-300 leading-6">• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">Nothing detected in this selection.</p>
                )}
              </Card>
            ))}
          </div>

          {/* Verbatim feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h2 className="font-semibold text-white mb-3">What respondents appreciated</h2>
              <ul className="space-y-2">
                {(data.positiveFeedback ?? []).slice(0, 5).map((quote, index) => (
                  <li key={index} className="flex gap-2 text-sm text-slate-300 leading-6">
                    <Quote className="w-3.5 h-3.5 mt-1 shrink-0 text-emerald-400" /> {quote}
                  </li>
                ))}
                {!(data.positiveFeedback ?? []).length && <p className="text-sm text-slate-500">No positive statements detected.</p>}
              </ul>
            </Card>

            <Card className="p-5">
              <h2 className="font-semibold text-white mb-3">What needs attention</h2>
              <ul className="space-y-2">
                {(data.negativeFeedback ?? []).slice(0, 5).map((quote, index) => (
                  <li key={index} className="flex gap-2 text-sm text-slate-300 leading-6">
                    <Quote className="w-3.5 h-3.5 mt-1 shrink-0 text-rose-400" /> {quote}
                  </li>
                ))}
                {!(data.negativeFeedback ?? []).length && <p className="text-sm text-slate-500">No critical statements detected.</p>}
              </ul>
            </Card>
          </div>

          {/* Coverage per question */}
          {!!data.sources?.length && (
            <Card className="p-5">
              <h2 className="font-semibold text-white mb-3">Where the feedback comes from</h2>
              <ul className="space-y-2.5">
                {data.sources.map((source) => {
                  const max = data.sources?.[0]?.count || 1;
                  return (
                    <li key={source.questionId}>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span className="truncate"><span className="text-slate-500 mr-2">{source.code}</span>{source.text}</span>
                        <span className="ml-2 shrink-0 text-slate-400">{source.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#3B6BF6] to-[#22D3EE]"
                          style={{ width: `${Math.max(6, Math.round((source.count / max) * 100))}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
