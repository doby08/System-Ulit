/**
 * Report content builder — assembles Summary / Detailed / Comparative reports
 * from live analytics and persists the generated report to the database.
 */
import { prisma } from "@/lib/prisma";
import { parseSurveySettings } from "@/lib/settings";
import { interviewMethodMeta, interviewModeMeta, languageLabel } from "@/lib/constants";
import { likertLabels } from "@/lib/likert";
import { analyzeOpenEnded } from "@/lib/ai/insights";
import {
  getOverviewMetrics,
  getQuestionAnalyticsDetail,
  getSurveyAnalytics,
} from "@/lib/server/analytics";
import type {
  AnalyticsFilters,
  ReportContent,
  ReportQuestionRow,
} from "@/lib/types-analytics";

export async function buildReportContent(params: {
  surveyId: string;
  reportType: "SUMMARY" | "DETAILED" | "COMPARATIVE";
  title?: string;
  generatedBy: string;
  filters?: AnalyticsFilters;
}): Promise<ReportContent> {

const survey = await prisma.survey.findUnique({
    where: { id: params.surveyId },
    include: {
      questions: { orderBy: { order: "asc" } },
      translations: true,
    },
  });
  if (!survey) throw new Error("Survey not found.");

  const filters: AnalyticsFilters = {
    ...(params.filters ?? {}),
    surveyId: params.surveyId,
  };

  const [analytics, questionDetail, overview] = await Promise.all([
    getSurveyAnalytics(filters),
    getQuestionAnalyticsDetail(filters, { includeText: params.reportType !== "SUMMARY" }),
    getOverviewMetrics(filters),
  ]);

  const settings = parseSurveySettings(
    survey.settings,
    survey.interviewMethod,
    survey.interviewMode,
  );

  const questions: ReportQuestionRow[] = questionDetail.map((detail) => ({
    code: detail.code,
    text: detail.text,
    type: detail.type,
    category: detail.category,
    answered: detail.answered,
    answerRate: detail.answerRate,
    likertAverage: detail.likert?.average ?? null,
    likertInterpretation: detail.likert?.interpretation ?? null,
    distribution: detail.distribution.length ? detail.distribution : undefined,
    sampleAnswers:
      params.reportType === "SUMMARY" ? undefined : detail.sampleAnswers.slice(0, 6),
    numericAverage: detail.numeric?.average ?? null,
  }));

let rawResponses: ReportContent["rawResponses"] = [];
  if (params.reportType !== "SUMMARY") {
    const responses = await prisma.response.findMany({
      where: {
        surveyId: params.surveyId,
        ...(filters.respondentGroup
          ? { respondent: { respondentGroup: filters.respondentGroup } }
          : {}),
        ...(filters.language ? { language: filters.language } : {}),
      },
      orderBy: { submittedAt: "desc" },
      take: params.reportType === "DETAILED" ? 200 : 60,
      include: {
        respondent: { select: { name: true, respondentCode: true, respondentGroup: true } },
        answers: {
          include: { question: { select: { code: true, text: true } } },
        },
      },
    });
    rawResponses = responses.map((response) => ({
      responseId: response.id,
      respondent:
        response.respondent?.name ?? response.respondent?.respondentCode ?? "Anonymous",
      group: response.respondent?.respondentGroup ?? null,
      submittedAt: response.submittedAt.toISOString(),
      source: response.source,
      status: response.status,
      answers: response.answers
        .map((answer) => ({
          code: answer.question?.code ?? "?",
          question: answer.question?.text ?? "Deleted question",
          answer:
            answer.valueText ??
            answer.valueOption ??
            answer.valueOptions ??
            (answer.valueNumber !== null ? String(answer.valueNumber) : "") ??
            (answer.valueBool === true ? "Yes" : answer.valueBool === false ? "No" : ""),
        }))
        .slice(0, survey.questions.length),
    }));
  }

  const openTexts: string[] = [];
  for (const row of questions) {
    for (const sample of row.sampleAnswers ?? []) openTexts.push(sample);
  }

  const insights = await analyzeOpenEnded({
    texts: openTexts.slice(0, 300),
    topic: survey.topic,
    stakeholder: survey.stakeholder,
    language: survey.language,
    questions: survey.questions.map((q) => q.text).slice(0, 20),
  });

let comparative: ReportContent["comparative"];
  if (params.reportType === "COMPARATIVE") {
    const byGroup = analytics.byGroup.slice(0, 8).map((entry) => ({
      label: entry.label,
      responses: entry.value,
      averageSatisfaction: overview.averageSatisfactionPercent,
      completionRate: overview.completionRate,
    }));
    comparative = byGroup.length
      ? byGroup
      : [
          {
            label: survey.title,
            responses: overview.totalResponses,
            averageSatisfaction: overview.averageSatisfactionPercent,
            completionRate: overview.completionRate,
          },
        ];
  }

  const typeName =
    params.reportType === "SUMMARY"
      ? "Summary"
      : params.reportType === "DETAILED"
        ? "Detailed"
        : "Comparative";
  const title = params.title ?? `${typeName} Report — ${survey.title}`;

  return {
    title,
    reportType: params.reportType,
    generatedAt: new Date().toISOString(),
    generatedBy: params.generatedBy,
    survey: {
      id: survey.id,
      title: survey.title,
      topic: survey.topic,
      description: survey.description,
      stakeholder: survey.stakeholder,
      interviewMethod: interviewMethodMeta(survey.interviewMethod).label,
      interviewMode: interviewModeMeta(survey.interviewMode).label,
      language: languageLabel(survey.language),
      version: survey.version,
      status: survey.status,
      createdAt: survey.createdAt.toISOString(),
      publishedAt: survey.publishedAt?.toISOString() ?? null,
    },
    filters,
    overview,
    trend: analytics.trend,
    demographics: analytics.byGroup,
    questions,
    sentiment: analytics.sentiment,
    keywords: insights.keywords.slice(0, 25),
    themes: insights.themes.slice(0, 10),
    painPoints: insights.painPoints,
    suggestions: insights.suggestions,
    concerns: insights.concerns,
    rawResponses,
    aiSummary: insights.summary,
    aiProvider: insights.aiProvider,
    ...(comparative ? { comparative } : {}),
    likertReference: {
      scale5: likertLabels(5, survey.language),
      scale7: likertLabels(7, survey.language),
      defaultScale: settings.likert.defaultScale,
    },
  } as ReportContent;
}

export async function generateAndSaveReport(params: {
  surveyId: string;
  reportType: "SUMMARY" | "DETAILED" | "COMPARATIVE";
  title?: string;
  generatedBy: string;
  createdById: string;
  filters?: AnalyticsFilters;
}) {
  const content = await buildReportContent({
    surveyId: params.surveyId,
    reportType: params.reportType,
    title: params.title,
    generatedBy: params.generatedBy,
    filters: params.filters,
  });

  const summaryText = [
    `${content.overview.totalResponses} responses`,
    `${content.overview.completionRate}% completion`,
    `${content.overview.averageSatisfactionPercent}% satisfaction`,
  ].join(" · ");

  const saved = await prisma.report.create({
    data: {
      surveyId: params.surveyId,
      surveyVersion: content.survey.version,
      reportType: params.reportType,
      title: content.title,
      status: "READY",
      filters: params.filters ? JSON.stringify(params.filters) : null,
      content: JSON.stringify(content),
      summary: `${summaryText}. ${content.aiSummary.slice(0, 400)}`,
      createdById: params.createdById,
    },
    include: {
      survey: { select: { id: true, title: true, topic: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  return { report: saved, content: { ...content, reportId: saved.id } };
}

export function parseReportContent(raw: string | null): ReportContent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReportContent;
    if (!parsed || !parsed.survey || !Array.isArray(parsed.questions)) return null;
    return parsed;
  } catch {
    return null;
  }
}