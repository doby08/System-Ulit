/**
 * Analytics engine — every metric is computed from the central database.
 * Filters: survey, respondent group, interview method, interview mode,
 * language and date range.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { likertSummary } from "@/lib/likert";
import { average, round } from "@/lib/utils";
import { interviewMethodMeta, interviewModeMeta } from "@/lib/constants";
import type {
  AnalyticsFilters,
  DistributionPoint,
  TrendPoint,
} from "@/lib/types-analytics";

export function buildResponseWhere(filters: AnalyticsFilters): Prisma.ResponseWhereInput {
  const where: Prisma.ResponseWhereInput = {};
  if (filters.surveyId) where.surveyId = filters.surveyId;
  if (filters.language) where.language = filters.language;
  if (filters.interviewMethod || filters.interviewMode) {
    where.survey = {
      ...(filters.interviewMethod ? { interviewMethod: filters.interviewMethod } : {}),
      ...(filters.interviewMode ? { interviewMode: filters.interviewMode } : {}),
    };
  }
  if (filters.respondentGroup) {
    where.respondent = { respondentGroup: filters.respondentGroup };
  }
  if (filters.from || filters.to) {
    where.submittedAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  if (filters.includeOffline === false) where.source = "ONLINE";
  return where;
}

export async function getOverviewMetrics(filters: AnalyticsFilters = {}) {
  const responseWhere = buildResponseWhere(filters);

  const [
    totalSurveys,
    activeSurveys,
    closedOrPublished,
    draftSurveys,
    totalResponses,
    completedResponses,
    totalRespondents,
    likertRows,
    offlinePending,
    syncedResponses,
    failedSyncs,
    conflicts,
    lastSync,
    durations,
  ] = await Promise.all([
    prisma.survey.count(),
    prisma.survey.count({ where: { status: "PUBLISHED" } }),
    prisma.survey.count({ where: { status: { in: ["PUBLISHED", "CLOSED"] } } }),
    prisma.survey.count({ where: { status: "DRAFT" } }),
    prisma.response.count({ where: responseWhere }),
    prisma.response.count({ where: { ...responseWhere, status: "COMPLETE" } }),
    prisma.respondent.count(),
    prisma.likertResponse.findMany({
      where: filters.surveyId ? { surveyId: filters.surveyId } : {},
      select: { score: true, normalized: true },
    }),
    prisma.syncRecord.count({ where: { status: "PENDING" } }),
    prisma.syncRecord.count({ where: { status: "SYNCED" } }),
    prisma.syncRecord.count({ where: { status: "FAILED" } }),
    prisma.syncRecord.count({ where: { status: "CONFLICT" } }),
    prisma.syncRecord.findFirst({
      where: { status: "SYNCED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
    prisma.response.findMany({
      where: responseWhere,
      select: { durationSec: true },
      take: 5000,
    }),
  ]);

  const averageLikertScore = likertRows.length
    ? round(average(likertRows.map((r) => r.score)), 2)
    : 0;
  const satisfactionPercent = likertRows.length
    ? round(average(likertRows.map((row) => (row.normalized ?? 0) * 100)), 1)
    : 0;

  return {
    totalSurveys,
    activeSurveys,
    completedSurveys: closedOrPublished,
    draftSurveys,
    totalResponses,
    completedInterviews: completedResponses,
    completionRate: totalResponses ? round((completedResponses / totalResponses) * 100, 1) : 0,
    totalRespondents,
    averageLikertScore,
    averageSatisfactionPercent: satisfactionPercent,
    offlinePending,
    syncedResponses,
    failedSyncs,
    conflicts,
    lastSyncAt: lastSync?.updatedAt?.toISOString() ?? null,
    averageDurationSec: durations.length
      ? Math.round(average(durations.map((r) => r.durationSec)))
      : 0,
  };
}

export function toDistribution(
  entries: { label: string; value: number }[],
): DistributionPoint[] {
  const total = entries.reduce((acc, entry) => acc + entry.value, 0);
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.value,
    percentage: total ? round((entry.value / total) * 100, 1) : 0,
  }));
}

export function countBy<T>(items: T[], key: (item: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item) ?? "Unknown";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return counts;
}

export function methodDistribution(frequencies: Map<string, number>) {
  const known = ["STRUCTURED", "SEMI_STRUCTURED", "UNSTRUCTURED"];
  return toDistribution(
    known.map((value) => ({
      label: interviewMethodMeta(value).short,
      value: frequencies.get(value) ?? 0,
    })),
  );
}

export function modeDistribution(frequencies: Map<string, number>) {
  const known = ["INDIVIDUAL", "GROUP", "RANDOM"];
  return toDistribution(
    known.map((value) => ({
      label: interviewModeMeta(value).label,
      value: frequencies.get(value) ?? 0,
    })),
  );
}

/** Daily response trend (used by the line graph). */
export function buildTrend(
  rows: { submittedAt: Date; status: string }[],
  from?: string,
  to?: string,
): TrendPoint[] {
  const buckets = new Map<string, { responses: number; completed: number }>();
  for (const row of rows) {
    const day = new Date(row.submittedAt).toISOString().slice(0, 10);
    const bucket = buckets.get(day) ?? { responses: 0, completed: 0 };
    bucket.responses += 1;
    if (row.status === "COMPLETE") bucket.completed += 1;
    buckets.set(day, bucket);
  }
  if (!buckets.size) return [];

  const keys = [...buckets.keys()].sort();
  const start = from ? new Date(from) : new Date(keys[0]);
  const lastDate = new Date(keys[keys.length - 1]);
  const end = to ? new Date(to) : lastDate;
  const last = end > lastDate ? lastDate : end;

  const series: TrendPoint[] = [];
  const cursor = new Date(start.toISOString().slice(0, 10));
  let iterations = 0;
  while (cursor <= last && iterations < 400) {
    const day = cursor.toISOString().slice(0, 10);
    const bucket = buckets.get(day) ?? { responses: 0, completed: 0 };
    series.push({ date: day, responses: bucket.responses, completed: bucket.completed });
    cursor.setDate(cursor.getDate() + 1);
    iterations += 1;
  }
  return series;
}

export type QuestionAggregateInput = {
  questionId: string;
  code: string;
  text: string;
  type: string;
  category: string | null;
  totalResponses: number;
  answers: {
    valueText: string | null;
    valueNumber: number | null;
    valueOption: string | null;
    valueOptions: string | null;
    valueBool: boolean | null;
    aiSentiment: string | null;
    aiKeywords: string | null;
  }[];
  likertScores: number[];
  likertScale: number;
};

export function buildQuestionAnalytics(input: QuestionAggregateInput) {
  const answered = input.answers.length;
  const skipped = Math.max(0, input.totalResponses - answered);

  const base = {
    questionId: input.questionId,
    code: input.code,
    text: input.text,
    type: input.type,
    category: input.category,
    answered,
    skipped,
    answerRate: input.totalResponses
      ? round((answered / input.totalResponses) * 100, 1)
      : 0,
    likert: null as null | {
      scale: number;
      average: number;
      normalizedPercent: number;
      interpretation: string;
      distribution: DistributionPoint[];
      positive: number;
      neutral: number;
      negative: number;
    },
    distribution: [] as DistributionPoint[],
    numeric: null as null | { average: number; min: number; max: number },
    textInsights: null as null | { samples: number },
    sampleAnswers: [] as string[],
  };

  if (input.type === "LIKERT_5" || input.type === "LIKERT_7") {
    const summary = likertSummary(input.likertScores, input.likertScale);
    base.likert = {
      scale: summary.scale,
      average: summary.average,
      normalizedPercent: summary.normalizedPercent,
      interpretation: summary.interpretation,
      distribution: summary.distribution.map((d) => ({
        label: d.label,
        value: d.count,
        percentage: d.percentage,
      })),
      positive: summary.positive.percentage,
      neutral: summary.neutral.percentage,
      negative: summary.negative.percentage,
    };
    base.distribution = base.likert.distribution;
    return base;
  }

  if (input.type === "RATING" || input.type === "NUMBER") {
    const numbers = input.answers
      .map((a) =>
        input.type === "RATING"
          ? Number(a.valueOption ?? a.valueText ?? a.valueNumber ?? Number.NaN)
          : Number(a.valueNumber ?? a.valueText ?? Number.NaN),
      )
      .filter((n) => Number.isFinite(n));
    if (numbers.length) {
      base.numeric = {
        average: round(average(numbers), 2),
        min: Math.min(...numbers),
        max: Math.max(...numbers),
      };
    }
    const counts = countBy(numbers, (n) => `${n}`);
    base.distribution = toDistribution(
      [...counts.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([label, value]) => ({ label, value })),
    );
    return base;
  }

  if (
    input.type === "YES_NO" ||
    input.type === "MULTIPLE_CHOICE" ||
    input.type === "MULTI_SELECT"
  ) {
    const values: string[] = [];
    for (const answer of input.answers) {
      if (answer.valueBool === true) values.push("Yes");
      else if (answer.valueBool === false) values.push("No");
      if (answer.valueOption) values.push(answer.valueOption);
      if (answer.valueOptions) {
        for (const piece of answer.valueOptions.split("|")) {
          const trimmed = piece.trim();
          if (trimmed) values.push(trimmed);
        }
      }
      if (input.type === "YES_NO") {
        const text = (answer.valueText ?? "").trim().toLowerCase();
        if (["yes", "y", "oo", "wen"].includes(text)) values.push("Yes");
        else if (["no", "n", "hindi", "saan", "haan"].includes(text)) values.push("No");
      }
    }
    const counts = countBy(values, (v) => v);
    base.distribution = toDistribution(
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value })),
    );
    return base;
  }

  const samples = input.answers
    .map((a) => (a.valueText ?? "").trim())
    .filter((t) => t.length > 0)
    .slice(0, 8);
  base.sampleAnswers = samples;
  if (samples.length) base.textInsights = { samples: answered };
  return base;
}

export async function getSurveyAnalytics(filters: AnalyticsFilters = {}) {
  const where = buildResponseWhere(filters);
  const cap = filters.surveyId ? 20000 : 8000;

  const [responses, surveys] = await Promise.all([
    prisma.response.findMany({
      where,
      take: cap,
      orderBy: { submittedAt: "asc" },
      select: {
        id: true,
        surveyId: true,
        language: true,
        status: true,
        source: true,
        submittedAt: true,
        survey: {
          select: {
            id: true,
            title: true,
            topic: true,
            interviewMethod: true,
            interviewMode: true,
          },
        },
        respondent: { select: { respondentGroup: true } },
        answers: {
          select: {
            questionId: true,
            valueText: true,
            valueNumber: true,
            valueOption: true,
            valueOptions: true,
            valueBool: true,
            aiSentiment: true,
            aiKeywords: true,
          },
        },
      },
    }),
    prisma.survey.findMany({
      where: filters.surveyId ? { id: filters.surveyId } : {},
      select: {
        id: true,
        title: true,
        topic: true,
        stakeholder: true,
        interviewMethod: true,
        interviewMode: true,
        language: true,
        version: true,
      },
    }),
  ]);

  const overview = await getOverviewMetrics(filters);
  const trend = buildTrend(
    responses.map((r) => ({ submittedAt: r.submittedAt, status: r.status })),
    filters.from,
    filters.to,
  );

  const byMethod = methodDistribution(
    countBy(responses, (r) => r.survey?.interviewMethod ?? null),
  );
  const byMode = modeDistribution(countBy(responses, (r) => r.survey?.interviewMode ?? null));
  const byGroup = toDistribution(
    [...countBy(responses, (r) => r.respondent?.respondentGroup ?? null).entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value })),
  );
  const byLanguage = toDistribution(
    [...countBy(responses, (r) => r.language).entries()].map(([label, value]) => ({
      label,
      value,
    })),
  );
  const byDate = toDistribution(
    trend.slice(-14).map((point) => ({ label: point.date.slice(5), value: point.responses })),
  );

  const sentimentCounts = new Map<string, number>([
    ["Positive", 0],
    ["Neutral", 0],
    ["Negative", 0],
  ]);
  for (const response of responses) {
    for (const answer of response.answers) {
      const sentiment = (answer.aiSentiment ?? "").toUpperCase();
      if (sentiment === "POSITIVE") sentimentCounts.set("Positive", 1 + (sentimentCounts.get("Positive") ?? 0));
      else if (sentiment === "NEGATIVE") sentimentCounts.set("Negative", 1 + (sentimentCounts.get("Negative") ?? 0));
      else if (answer.valueText && answer.valueText.trim().length > 1)
        sentimentCounts.set("Neutral", 1 + (sentimentCounts.get("Neutral") ?? 0));
    }
  }
  const sentiment = toDistribution(
    [...sentimentCounts.entries()].map(([label, value]) => ({ label, value })),
  );

  const statusMix = toDistribution(
    [...countBy(responses, (r) => r.status).entries()].map(([label, value]) => ({
      label: label === "COMPLETE" ? "Completed" : "Partial",
      value,
    })),
  );

  return {
    overview,
    trend,
    byMethod,
    byMode,
    byGroup,
    byLanguage,
    byDate,
    sentiment,
    statusMix,
    questions: [] as ReturnType<typeof buildQuestionAnalytics>[],
    keywords: [] as { keyword: string; count: number; sentiment: string }[],
    surveys: surveys.map((s) => ({ id: s.id, title: s.title })),
  };
}

export async function getQuestionAnalyticsDetail(
  filters: AnalyticsFilters = {},
  options: { includeText?: boolean } = {},
) {
  const where = buildResponseWhere(filters);

  const questions = await prisma.surveyQuestion.findMany({
    where: filters.surveyId ? { surveyId: filters.surveyId } : {},
    orderBy: [{ surveyId: "asc" }, { order: "asc" }],
    take: 400,
  });

  const totalResponses = filters.surveyId
    ? await prisma.response.count({ where })
    : 0;

  const responseIdsForScale = filters.surveyId
    ? (
        await prisma.response.findMany({
          where,
          select: { id: true },
          take: 20000,
        })
      ).map((r) => r.id)
    : [];

  const likertRows = filters.surveyId
    ? await prisma.likertResponse.findMany({
        where: { surveyId: filters.surveyId },
        select: { questionId: true, score: true },
        take: 20000,
      })
    : [];

  const likertByQuestion = new Map<string, number[]>();
  for (const row of likertRows) {
    const list = likertByQuestion.get(row.questionId) ?? [];
    list.push(row.score);
    likertByQuestion.set(row.questionId, list);
  }

  const answerScope: { questionId: string }[] =
    questions.length && filters.surveyId
      ? questions.map((q) => ({ questionId: q.id }))
      : [];

  const answersByQuestion = new Map<string, QuestionAggregateInput["answers"]>();
  if (answerScope.length) {
    const responseIdSet = new Set(responseIdsForScale);
    const answers = await prisma.answer.findMany({
      where: {
        questionId: { in: questions.map((q) => q.id) },
        responseId: responseIdSet.size ? { in: [...responseIdSet] } : undefined,
      },
      select: {
        questionId: true,
        valueText: options.includeText === false ? undefined : true,
        valueNumber: true,
        valueOption: true,
        valueOptions: true,
        valueBool: true,
        aiSentiment: true,
        aiKeywords: true,
      },
      take: 20000,
    });
    for (const answer of answers) {
      const list = answersByQuestion.get(answer.questionId) ?? [];
      list.push(answer);
      answersByQuestion.set(answer.questionId, list);
    }
  }

  return questions.map((question) =>
    buildQuestionAnalytics({
      questionId: question.id,
      code: question.code ?? `Q${question.order}`,
      text: question.text,
      type: question.type,
      category: question.category,
      totalResponses,
      answers: answersByQuestion.get(question.id) ?? [],
      likertScores: likertByQuestion.get(question.id) ?? [],
      likertScale: question.likertScale ?? 5,
    }),
  );
}

export async function getDashboardStats() {
  const overview = await getOverviewMetrics({});
  const [recentSurveys, recentResponses, keywords, recentSync] = await Promise.all([
    prisma.survey.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: {
        _count: { select: { responses: true, questions: true } },
      },
    }),
    prisma.response.findMany({
      orderBy: { submittedAt: "desc" },
      take: 8,
      include: {
        survey: { select: { title: true } },
        respondent: { select: { name: true, respondentCode: true } },
      },
    }),
    prisma.answer.findMany({
      where: { aiKeywords: { not: null } },
      select: { aiKeywords: true },
      take: 400,
    }),
    prisma.syncRecord.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true, status: true },
    }),
  ]);

  const keywordCounts = new Map<string, number>();
  for (const row of keywords) {
    for (const piece of (row.aiKeywords ?? "").split(",")) {
      const keyword = piece.trim().toLowerCase();
      if (keyword.length > 2) keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
  }
  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  return {
    ...overview,
    recentSurveys: recentSurveys.map((survey) => ({
      id: survey.id,
      title: survey.title,
      topic: survey.topic,
      status: survey.status,
      interviewMethod: survey.interviewMethod,
      interviewMode: survey.interviewMode,
      responses: survey._count.responses,
      questionCount: survey._count.questions,
      updatedAt: survey.updatedAt.toISOString(),
    })),
    recentResponses: recentResponses.map((response) => ({
      id: response.id,
      surveyTitle: response.survey?.title ?? "Deleted survey",
      respondent:
        response.respondent?.name ?? response.respondent?.respondentCode ?? "Anonymous",
      source: response.source,
      submittedAt: response.submittedAt.toISOString(),
      status: response.status,
    })),
    syncHealth: {
      pending: overview.offlinePending,
      syncing: 0,
      failed: overview.failedSyncs,
      conflicts: overview.conflicts,
      synced: overview.syncedResponses,
      lastSyncAt: recentSync?.updatedAt?.toISOString() ?? overview.lastSyncAt,
    },
    topKeywords,
  };
}