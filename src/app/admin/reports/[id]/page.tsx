"use client";

import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportDetail, reportDownloadUrl } from "@/lib/client/hooks";
import { WaterLineChart } from "@/components/charts/water-line-chart";
import { formatDate } from "@/lib/utils";
import { INTERVIEW_METHODS, INTERVIEW_MODES, languageLabel } from "@/lib/constants";
import {
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Users,
  Calendar,
  Globe,
} from "lucide-react";

const SENTIMENT_COLOR: Record<string, string> = {
  Positive: "#34d399",
  Negative: "#f87171",
  Neutral: "#94a3b8",
};

const SENTIMENT_VARIANT: Record<string, "success" | "error" | "default"> = {
  Positive: "success",
  Negative: "error",
  Neutral: "default",
};

export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const { report, content, loading, error } = useReportDetail(params?.id ?? "");

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-rose-300">{error ?? "Report not found."}</p>
        <a href="/admin/reports" className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to reports
        </a>
      </div>
    );
  }

  const overview = content?.overview;


  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1100px] mx-auto animate-in-fade">
      <a href="/admin/reports" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="w-4 h-4" /> Back to reports
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">{report.surveyTitle}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {report.title} · generated {formatDate(report.generatedAt)}
            {report.createdByName ? ` by ${report.createdByName}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{report.reportTypeLabel}</Badge>
          <Badge variant={report.status === "READY" ? "success" : "warning"}>{report.status}</Badge>
          {report.surveyVersion !== null && <Badge variant="default">v{report.surveyVersion}</Badge>}
        </div>
            </div>

      {content?.survey && (
        <Card className="p-5">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-300" /> Interview &amp; QR Details
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Badge variant="default">
                  {INTERVIEW_METHODS.find((m) => m.value === content.survey.interviewMethod)?.label ??
                    content.survey.interviewMethod}
                </Badge>
                <span className="text-xs text-slate-500">Interview Method</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Badge variant="outline">
                  {INTERVIEW_MODES.find((m) => m.value === content.survey.interviewMode)?.label ??
                    content.survey.interviewMode}
                </Badge>
                <span className="text-xs text-slate-500">Interview Mode</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Globe className="w-4 h-4 text-slate-500" />
                <span>{languageLabel(content.survey.language)}</span>
                <span className="text-xs text-slate-500">Language</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>{content.survey.stakeholder}</span>
                <span className="text-xs text-slate-500">Stakeholder</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Badge variant="info">Version {content.survey.version}</Badge>
                <span className="text-xs text-slate-500">Survey Version</span>
              </div>
                            {content.filters.interviewMethod && (
                <div className="text-xs text-slate-400 mt-1">
                  Method filter: {INTERVIEW_METHODS.find((m) => m.value === content.filters.interviewMethod)?.label ?? content.filters.interviewMethod}
                </div>
              )}
              {content.filters.interviewMode && (
                <div className="text-xs text-slate-400">
                  Mode filter: {INTERVIEW_MODES.find((m) => m.value === content.filters.interviewMode)?.label ?? content.filters.interviewMode}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-sm font-semibold text-white mb-3">Download</p>
        <div className="flex flex-wrap gap-2">
          <a href={reportDownloadUrl(report.id, "pdf")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <FileText className="w-4 h-4" /> PDF
          </a>
          <a href={reportDownloadUrl(report.id, "word")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <FileText className="w-4 h-4" /> Word
          </a>
          <a href={reportDownloadUrl(report.id, "excel")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </a>
          <a href={reportDownloadUrl(report.id, "csv")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <Download className="w-4 h-4" /> CSV
          </a>
          <a href={reportDownloadUrl(report.id, "json")} className="btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm">
            <FileJson className="w-4 h-4" /> JSON
          </a>
        </div>
      </Card>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Responses", value: overview.totalResponses },
            { label: "Completed", value: overview.completedInterviews },
            { label: "Completion", value: `${overview.completionRate}%` },
            { label: "Satisfaction", value: `${overview.averageSatisfactionPercent}%` },
            { label: "Avg Likert", value: overview.averageLikertScore },
            { label: "Respondents", value: overview.totalRespondents },
            { label: "Avg duration", value: `${overview.averageDurationSec}s` },
            { label: "Pending sync", value: overview.offlinePending },
          ].map((item) => (
            <Card key={item.label} className="p-4 text-center">
              <p className="text-xl font-bold text-white">{item.value}</p>
              <p className="text-xs text-slate-400 mt-1">{item.label}</p>
            </Card>
          ))}
        </div>
      )}

      {content && (
        <>
          <Card className="p-5">
            <p className="text-sm font-semibold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-cyan-300" /> AI summary
              <span className="text-[11px] font-normal text-slate-500">({content.aiProvider})</span>
            </p>
            <p className="text-sm leading-6 text-slate-300">{content.aiSummary}</p>
          </Card>

          {!!content.trend?.length && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-white mb-1">Response flow</p>
              <p className="text-xs text-slate-400 mb-3">Responses and completed interviews over time.</p>
              <WaterLineChart
                data={content.trend.map((point) => ({
                  ...point,
                  date: new Date(point.date).toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
                }))}
                height={260}
              />
            </Card>
          )}

          {!!content.sentiment?.length && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-white mb-3">Sentiment</p>
              <div className="flex flex-wrap gap-2">
                {content.sentiment.map((entry, index) => (
                  <Badge key={index} variant={SENTIMENT_VARIANT[entry.label] ?? "default"}>
                    {entry.label}: {entry.value} ({entry.percentage}%)
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/5">
                {content.sentiment.map((entry, index) => (
                  <span key={index} style={{ width: `${entry.percentage}%`, background: SENTIMENT_COLOR[entry.label] ?? "#94a3b8" }} />
                ))}
              </div>
            </Card>
          )}

          {!!content.questions?.length && (
            <Card className="p-5">
              <p className="text-sm font-semibold text-white mb-3">Question analysis</p>
              <div className="space-y-3">
                {content.questions.map((question) => (
                  <div key={question.code} className="rounded-xl border border-[var(--border-subtle)] p-4">
                    <p className="text-sm text-slate-200">
                      <span className="text-slate-500 mr-2">{question.code}</span>
                      {question.text}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {question.type}
                      {question.category ? ` · ${question.category}` : ""} · {question.answered} answered · {question.answerRate}% answer rate
                      {question.likertAverage !== null && question.likertAverage !== undefined ? ` · Likert average ${question.likertAverage}` : ""}
                      {question.likertInterpretation ? ` — ${question.likertInterpretation}` : ""}
                    </p>
                    {!!question.distribution?.length && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {question.distribution.map((entry, index) => (
                          <span key={index} className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] text-slate-300">
                            {entry.label}: {entry.value} ({entry.percentage}%)
                          </span>
                        ))}
                      </div>
                    )}
                    {!!question.sampleAnswers?.length && (
                      <ul className="mt-2 space-y-1">
                        {question.sampleAnswers.map((sample, index) => (
                          <li key={index} className="text-xs text-slate-400">“{sample}”</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {!!content.rawResponses?.length && (
            <Card className="p-5">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-white">
                  Responses included in this report ({content.rawResponses.length})
                </summary>
                <div className="mt-3 space-y-3">
                  {content.rawResponses.slice(0, 25).map((response) => (
                    <div key={response.responseId} className="rounded-xl border border-[var(--border-subtle)] p-4">
                      <p className="text-xs text-slate-300">
                        <span className="font-semibold text-white">{response.respondent}</span>
                        {response.group ? ` · ${response.group}` : ""} · {formatDate(response.submittedAt)} · {response.source} · {response.status}
                      </p>
                      <ul className="mt-2 space-y-1">
                        {response.answers.map((answer, index) => (
                          <li key={index} className="text-xs text-slate-400">
                            <span className="text-slate-500 mr-1">{answer.code}</span>
                            {answer.answer}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </details>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
