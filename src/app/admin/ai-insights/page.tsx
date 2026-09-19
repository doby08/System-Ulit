"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, RefreshCw } from "lucide-react";

export default function AiInsightsPage() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [surveyId, setSurveyId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (id = surveyId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics/unstructured${id ? `?surveyId=${encodeURIComponent(id)}` : ""}`, { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to load insights");
      setData(json.data);
      const f = await fetch("/api/admin/analytics/facets", { credentials: "include" }).then((r) => r.json()).catch(() => null);
      if (f?.ok) setSurveys(f.data?.surveys ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

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
          <Select value={surveyId} onChange={(v) => { setSurveyId(v); load(v); }}
            options={[{ value: "", label: "All surveys" }, ...surveys.map((s: any) => ({ value: s.id, label: s.title }))]} placeholder="Survey" />
        </div>
        {data && <Badge variant="info">{data.count ?? 0} open-ended answers · {data.aiProvider ?? "engine"}</Badge>}
      </Card>
      {loading ? (
        <div className="space-y-3"><Skeleton className="h-32 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : error ? (
        <p className="text-rose-300 text-sm">{error}</p>
      ) : !data || !data.count ? (
        <Card className="p-10 text-center">
          <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium">No insights yet.</p>
          <p className="text-sm text-slate-400 mt-1">Collect open-ended responses first — insights appear automatically.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h2 className="font-semibold text-white mb-2">AI Summary</h2>
            <p className="text-sm text-slate-300 leading-6">{data.summary}</p>
            <p className="text-[11px] text-slate-500 mt-3">Sentiment: {data.sentiment} ({Math.round((data.sentimentScore ?? 0) * 100)}%)</p>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-white mb-3">Keywords &amp; Themes</h2>
            <div className="flex flex-wrap gap-2">
              {(data.keywords ?? []).slice(0, 20).map((k: any, i: number) => (
                <Badge key={i} variant={k.sentiment === "POSITIVE" ? "success" : k.sentiment === "NEGATIVE" ? "error" : "default"}>
                  {k.keyword} · {k.count}
                </Badge>
              ))}
            </div>
            {!!(data.themes ?? []).length && (
              <ul className="mt-4 space-y-1.5">
                {(data.themes ?? []).slice(0, 8).map((t: any, i: number) => (
                  <li key={i} className="text-sm text-slate-300">• {t.theme} <span className="text-slate-500">({t.count})</span></li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-white mb-2">Pain Points</h2>
            <ul className="space-y-1.5">{(data.painPoints ?? []).map((p: string, i: number) => (<li key={i} className="text-sm text-slate-300">• {p}</li>))}</ul>
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold text-white mb-2">Suggestions</h2>
            <ul className="space-y-1.5">{(data.suggestions ?? []).map((p: string, i: number) => (<li key={i} className="text-sm text-slate-300">• {p}</li>))}</ul>
          </Card>
        </div>
      )}
    </div>
  );
}
