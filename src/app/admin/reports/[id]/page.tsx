"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { reportTypeMeta } from "@/lib/constants";

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/admin/reports/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setReport(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!report) {
    return <div className="p-6 text-center text-[var(--text-secondary)]">Report not found</div>;
  }

  const meta = reportTypeMeta(report.reportType);

  return (
    <div className="p-6 space-y-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{report.surveyTitle}</h1>
        <Badge variant="info">{meta.label}</Badge>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Report Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">Created</span>
            <span className="text-[var(--text-primary)]">{formatDate(report.createdAt)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)]">Status</span>
            <span className="text-[var(--text-primary)]">{report.reportStatus}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-[var(--text-secondary)]">Version at generation</span>
            <span className="text-[var(--text-primary)]">v{report.versionAtGeneration ?? "N/A"}</span>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <a href={`/api/admin/reports/${report.id}/download?format=pdf`} className="btn-primary">
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </a>
          <a href={`/api/admin/reports/${report.id}/download?format=word`} className="btn-secondary">
            <Download className="w-4 h-4 mr-2" /> Word
          </a>
          <a href={`/api/admin/reports/${report.id}/download?format=excel`} className="btn-secondary">
            <Download className="w-4 h-4 mr-2" /> Excel
          </a>
        </div>
      </Card>
    </div>
  );
}
