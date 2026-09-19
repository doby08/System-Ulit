"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useReports } from "@/lib/client/hooks";
import { REPORT_TYPES, reportTypeMeta } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import { generateReport } from "@/lib/client/hooks";
import { useToast } from "@/components/ui/toast";

export default function ReportsPage() {
  const [surveyIdFilter, setSurveyIdFilter] = useState("");
  const { data: reports, loading, refetch } = useReports({ surveyId: surveyIdFilter });
  const { toast } = useToast();

  const handleGenerate = async () => {
    const surveyId = prompt("Enter Survey ID:");
    if (!surveyId) return;
    const type = (prompt("Report type (summary/detailed/comparative):") || "summary").toUpperCase();
    try {
      await generateReport(surveyId, type, {});
      toast({ title: "Report generated", type: "success" });
      refetch();
    } catch (e: any) {
      toast({ title: "Failed", message: e.message, type: "error" });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
        <button onClick={handleGenerate} className="btn-primary">
          <FileText className="w-4 h-4 mr-2" />
          Generate Report
        </button>
      </div>

      {!reports?.length ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No reports generated yet. Click "Generate Report" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const meta = reportTypeMeta(r.reportType);
            return (
              <Card key={r.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{r.surveyTitle}</h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{r.topic}</p>
                  </div>
                  <Badge variant="default">{meta.label}</Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>{formatDate(r.createdAt)}</span>
                  <span>{r.fileSizeBytes ? `${(r.fileSizeBytes / 1024).toFixed(0)} KB` : "—"}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => window.open(`/admin/reports/${r.id}`, "_blank")}
                    className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = `/api/admin/reports/${r.id}/download?format=pdf`;
                      link.download = `report-${r.id}.pdf`;
                      link.click();
                    }}
                    className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
