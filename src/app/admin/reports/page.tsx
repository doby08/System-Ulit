"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  useSurveys,
  useReports,
  generateReport,
  deleteReport,
  regenerateReport,
  reportDownloadUrl,
  type ReportRecord,
} from "@/lib/client/hooks";
import { getErrorMessage } from "@/lib/client/api";
import { REPORT_TYPES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { INTERVIEW_METHODS, INTERVIEW_MODES } from "@/lib/constants";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [surveyIdFilter, setSurveyIdFilter] = useState("");
  const { data: surveys } = useSurveys();
  const { data: reports, loading, error, refetch } = useReports({ surveyId: surveyIdFilter });

  const [open, setOpen] = useState(false);
  const [surveyId, setSurveyId] = useState("");
  const [reportType, setReportType] = useState<"SUMMARY" | "DETAILED" | "COMPARATIVE">("SUMMARY");
  const [title, setTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!surveyId) {
      toast({ title: "Select a survey first", message: "Choose which survey the report should cover.", type: "warning" });
      return;
    }
    setGenerating(true);
    try {
      const result = await generateReport({
        surveyId,
        reportType,
        title: title.trim() || undefined,
      });
      toast({
        title: "Report generated",
        message: `${result.report.reportTypeLabel} for “${result.report.surveyTitle}” is ready.`,
        type: "success",
      });
      setOpen(false);
      setSurveyId("");
      setTitle("");
      await refetch();
      router.push(`/admin/reports/${result.report.id}`);
    } catch (e) {
      toast({ title: "Could not generate the report", message: getErrorMessage(e), type: "error" });
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async (report: ReportRecord) => {
    setBusyId(report.id);
    try {
      await regenerateReport(report.id);
      toast({ title: "Report regenerated", message: `“${report.title}” now reflects the latest responses.`, type: "success" });
      await refetch();
    } catch (e) {
      toast({ title: "Regeneration failed", message: getErrorMessage(e), type: "error" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (report: ReportRecord) => {
    setBusyId(report.id);
    try {
      await deleteReport(report.id);
      toast({ title: "Report deleted", type: "success" });
      await refetch();
    } catch (e) {
      toast({ title: "Could not delete the report", message: getErrorMessage(e), type: "error" });
    } finally {
      setBusyId(null);
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

  const surveyOptions = [
    { value: "", label: "Select a survey…", disabled: true },
    ...(surveys ?? []).map((s) => ({ value: s.id, label: `${s.title} (${s.questionCount} questions)` })),
  ];

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto animate-in-fade">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-cyan-300" /> Reports
          </h1>
          <p className="text-sm text-slate-400">Generate and export PDF, Word, Excel or CSV reports from live response data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={refetch}><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
          <Button variant="gradient" size="sm" onClick={() => setOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Generate Report
          </Button>
        </div>
      </div>

      {error && (
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm text-rose-300"><AlertCircle className="w-4 h-4" /> {error}</p>
        </Card>
      )}

      {!reports?.length ? (
        <Card className="p-12 text-center">
          <FileText className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-200 font-medium">No reports generated yet.</p>
          <p className="text-sm text-slate-400 mt-1">Click “Generate Report” to build one from your collected responses.</p>
          <Button variant="gradient" className="mt-4" onClick={() => setOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Generate Report
          </Button>
        </Card>
      ) : (
        <>
          <div className="max-w-xs">
            <Select
              value={surveyIdFilter}
              onChange={setSurveyIdFilter}
              options={[
                { value: "", label: "All surveys" },
                ...(surveys ?? []).map((s) => ({ value: s.id, label: s.title })),
              ]}
              placeholder="Filter by survey"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                busy={busyId === report.id}
                onRegenerate={() => handleRegenerate(report)}
                onDelete={() => handleDelete(report)}
              />
            ))}
          </div>
        </>
      )}

      {/* Generate report modal */}
      <Modal
        open={open}
        onClose={() => !generating && setOpen(false)}
        title="Generate a report"
        description="Pick the survey and the report type — the report is built from live response data."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={generating}>Cancel</Button>
            <Button variant="gradient" onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate</>}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Survey</p>
            <Select value={surveyId} onChange={setSurveyId} options={surveyOptions} placeholder="Select a survey…" />
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Report type</p>
            <div className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setReportType(type.value)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    reportType === type.value
                      ? "border-cyan-300/50 bg-cyan-400/10"
                      : "border-[var(--border-subtle)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{type.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Custom title (optional)</p>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q1 Student Services Summary" />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ReportCard({
  report,
  busy,
  onRegenerate,
  onDelete,
}: {
  report: ReportRecord;
  busy: boolean;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{report.surveyTitle}</h3>
          <p className="text-sm text-slate-400 mt-0.5 truncate">{report.surveyTopic ?? report.title}</p>
        </div>
        <Badge variant="info">{report.reportTypeLabel}</Badge>
      </div>

      {report.summary && <p className="mt-3 text-xs leading-5 text-slate-400 line-clamp-3">{report.summary}</p>}

      {/* Survey context: method / mode / stakeholder + live response count */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {report.surveyInterviewMethod && (
          <Badge variant="default">
            {INTERVIEW_METHODS.find((m) => m.value === report.surveyInterviewMethod)?.short ?? report.surveyInterviewMethod}
          </Badge>
        )}
        {report.surveyInterviewMode && (
          <Badge variant="outline">
            {INTERVIEW_MODES.find((m) => m.value === report.surveyInterviewMode)?.label ?? report.surveyInterviewMode}
          </Badge>
        )}
        {typeof report.responseCount === "number" && (
          <Badge variant="info">{report.responseCount} responses</Badge>
        )}
      </div>
      {report.surveyStakeholder && (
        <p className="mt-1.5 text-[11px] text-slate-500 truncate" title={report.surveyStakeholder}>
          {report.surveyStakeholder}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{formatDate(report.generatedAt)}</span>
        <span className="ml-2 truncate" title={report.createdByName ?? undefined}>
          {typeof report.responseCount === "number"
            ? `${report.responseCount} respondent${report.responseCount === 1 ? "" : "s"}`
            : (report.createdByName ?? "System")}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-3">
        <button
          onClick={() => window.open(`/admin/reports/${report.id}`, "_blank")}
          className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3" /> View
        </button>
        <a href={reportDownloadUrl(report.id, "pdf")} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
          <Download className="w-3 h-3" /> PDF
        </a>
        <a href={reportDownloadUrl(report.id, "excel")} className="text-xs text-indigo-300 hover:text-indigo-200 flex items-center gap-1">
          <Download className="w-3 h-3" /> Excel
        </a>
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="ml-auto text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Regenerate
        </button>
        <button
          onClick={onDelete}
          disabled={busy}
          className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 disabled:opacity-50"
        >
          <Trash2 className="w-3 h-3" /> Delete
        </button>
      </div>
    </Card>
  );
}


