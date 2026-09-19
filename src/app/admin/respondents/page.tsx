"use client";

import { useRespondents } from "@/lib/client/hooks";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { AGE_GROUPS, GENDER_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function RespondentsPage() {
  const [search, setSearch] = useState("");
  const { data: respondents, loading } = useRespondents({ search });

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Respondents</h1>
        <Badge variant="info">{respondents?.length ?? 0} respondents</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <Input
          placeholder="Search respondents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {!respondents?.length ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No respondents found.
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[rgba(99,102,241,0.05)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Respondent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Age Group</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Gender</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Group</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)] uppercase">Responses</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)] uppercase">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {respondents.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-hover)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-xs">
                          {r.name?.[0]?.toUpperCase() ?? r.code?.slice(-4)?.toUpperCase() ?? <Users className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{r.name || `R-${r.code?.slice(-4)}`}</p>
                          <p className="text-xs text-[var(--text-muted)]">{r.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.ageGroup || "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.gender || "—"}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.location || "—"}</td>
                    <td className="px-4 py-3">
                      {r.respondentGroup ? <Badge variant="outline">{r.respondentGroup}</Badge> : <span className="text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-primary)]">{r.responseCount}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{r.lastSeen ? new Date(r.lastSeen).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
