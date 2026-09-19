"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Users, Clock } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

export default function SessionsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (s = status) => {
    setLoading(true);
    setError(null);
    try {
      const qs = s ? `?status=${encodeURIComponent(s)}` : "";
      const res = await fetch(`/api/admin/sessions${qs}`, { credentials: "include" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to load sessions");
      const list = json.data?.items ?? [];
      setItems(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(status); }, [status]);

  const filtered = items.filter((s: any) =>
    !search.trim() || `${s.surveyTitle ?? ""} ${s.respondentName ?? ""} ${s.sessionCode ?? ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-in-fade max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Active Sessions</h1>
          <p className="text-sm text-slate-400">Live and recent interview sessions from every survey.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input placeholder="Search session, survey, respondent" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["", "IN_PROGRESS", "COMPLETE", "ABANDONED"].map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${status === s ? "bg-[#3B6BF6] text-white border-[#3B6BF6]" : "text-slate-300 border-white/10 hover:bg-white/5"}`}
            >
              {s === "" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-rose-300 text-sm">{error}</p>}
      <Card className="overflow-hidden">
        {!filtered.length ? (
          <div className="text-center py-14">
            <Clock className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-200 font-medium">No sessions yet.</p>
            <p className="text-sm text-slate-400 mt-1">Publish a survey and share its QR code to start a session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Session</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Survey</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Respondent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Started</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s: any) => (
                  <tr key={s.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{s.sessionCode ?? String(s.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-200">{s.surveyTitle ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-400"><span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{s.respondentName ?? "Anonymous"}</span></td>
                    <td className="px-4 py-3"><Badge variant={s.status === "COMPLETE" ? "success" : s.status === "IN_PROGRESS" ? "info" : "outline"}>{s.status}</Badge></td>
                    <td className="px-4 py-3 text-slate-400">{s.startedAt ? formatDateTime(s.startedAt) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
