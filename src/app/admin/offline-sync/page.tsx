"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";
import { RefreshCw, CheckCircle, XCircle, Wifi, WifiOff, Clock } from "lucide-react";
import { useSyncRecords } from "@/lib/client/hooks";
import { cn } from "@/lib/utils";

export default function OfflineSyncPage() {
  const { data: records, loading, refetch } = useSyncRecords();

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Offline Data &amp; Sync</h1>
          <p className="text-sm text-slate-400">Offline queue, sync health, and conflicts.</p>
        </div>
        <Button variant="ghost" onClick={refetch}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <WifiOff className="w-6 h-6 mx-auto text-rose-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{records?.filter((r: any) => r.status === "PENDING").length ?? 0}</p>
          <p className="text-xs text-[var(--text-secondary)]">Pending Sync</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="w-6 h-6 mx-auto text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{records?.filter((r: any) => r.status === "SYNCING").length ?? 0}</p>
          <p className="text-xs text-[var(--text-secondary)]">Syncing</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{records?.filter((r: any) => r.status === "SYNCED").length ?? 0}</p>
          <p className="text-xs text-[var(--text-secondary)]">Synced</p>
        </Card>
        <Card className="p-4 text-center">
          <XCircle className="w-6 h-6 mx-auto text-rose-400 mb-2" />
          <p className="text-2xl font-bold text-[var(--text-primary)]">{records?.filter((r: any) => r.status === "FAILED" || r.status === "CONFLICT").length ?? 0}</p>
          <p className="text-xs text-[var(--text-secondary)]">Failed / Conflict</p>
        </Card>
      </div>

      <Card>
        <Table>
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Token</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Submitted</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-secondary)]">Synced</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--text-secondary)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!records?.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-secondary)]">
                  No sync records found.
                </td>
              </tr>
            ) : (
              records.map((r: any) => (
                <tr key={r.id} className="border-b border-[var(--border-subtle)]">
                  <td className="px-4 py-3 text-sm">{r.token?.slice(0, 12)}…</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "SYNCED" ? "success" : r.status === "PENDING" ? "warning" : r.status === "FAILED" ? "error" : "default"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{r.submittedAt}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{r.syncedAt || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "CONFLICT" && (
                      <Button size="sm" variant="secondary">Resolve</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
