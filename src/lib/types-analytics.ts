/**
 * Analytics, reporting and dashboard contracts.
 */

export type AnalyticsFilters = {
  surveyId?: string;
  respondentGroup?: string;
  interviewMethod?: string;
  interviewMode?: string;
  language?: string;
  from?: string;
  to?: string;
  includeOffline?: boolean;
};

export type TrendPoint = { date: string; responses: number; completed: number };

export type DistributionPoint = { label: string; value: number; percentage: number; color?: string };

export type TextInsights = {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  sentimentScore: number;
  keywords: string[];
  themes: string[];
  painPoints: string[];
  suggestions: string[];
  summary: string;
  provider: string;
};

export type QuestionAnalytics = {
  questionId: string;
  code: string;
  text: string;
  type: string;
  category: string | null;
  answered: number;
  skipped: number;
  answerRate: number;
  likert?: {
    scale: number;
    average: number;
    normalizedPercent: number;
    interpretation: string;
    distribution: DistributionPoint[];
    positive: number;
    neutral: number;
    negative: number;
  } | null;
  distribution?: DistributionPoint[];
  numeric?: { average: number; min: number; max: number } | null;
  textInsights?: TextInsights | null;
  sampleAnswers?: string[];
};

export type AnalyticsOverview = {
  totalSurveys: number;
  activeSurveys: number;
  completedSurveys: number;
  draftSurveys: number;
  totalResponses: number;
  completedInterviews: number;
  completionRate: number;
  totalRespondents: number;
  averageLikertScore: number;
  averageSatisfactionPercent: number;
  offlinePending: number;
  syncedResponses: number;
  failedSyncs: number;
  conflicts: number;
  lastSyncAt: string | null;
  averageDurationSec: number;
};

export type AnalyticsResult = {
  overview: AnalyticsOverview;
  trend: TrendPoint[];
  byMethod: DistributionPoint[];
  byMode: DistributionPoint[];
  byGroup: DistributionPoint[];
  byLanguage: DistributionPoint[];
  byDate: DistributionPoint[];
  sentiment: DistributionPoint[];
  statusMix: DistributionPoint[];
  questions: QuestionAnalytics[];
  keywords: { keyword: string; count: number; sentiment: string }[];
  themes: { theme: string; count: number; mentions: string[] }[];
  painPoints: string[];
  suggestions: string[];
  concerns: string[];
  positiveFeedback: string[];
  negativeFeedback: string[];
  aiSummary: string;
  aiProvider: string;
  filters: AnalyticsFilters;
  generatedAt: string;
};

export type ReportQuestionRow = {
  code: string;
  text: string;
  type: string;
  category: string | null;
  answered: number;
  answerRate: number;
  likertAverage?: number | null;
  likertInterpretation?: string | null;
  distribution?: DistributionPoint[];
  sampleAnswers?: string[];
  numericAverage?: number | null;
};

export type ReportContent = {
  reportId?: string;
  title: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  survey: {
    id: string;
    title: string;
    topic: string;
    description: string;
    stakeholder: string;
    interviewMethod: string;
    interviewMode: string;
    language: string;
    version: number;
    status: string;
    createdAt: string;
    publishedAt: string | null;
  };
  filters: AnalyticsFilters;
  overview: AnalyticsOverview;
  trend: TrendPoint[];
  demographics: DistributionPoint[];
  questions: ReportQuestionRow[];
  sentiment: DistributionPoint[];
  keywords: { keyword: string; count: number; sentiment: string }[];
  themes: { theme: string; count: number; mentions: string[] }[];
  painPoints: string[];
  suggestions: string[];
  concerns: string[];
  rawResponses: {
    responseId: string;
    respondent: string;
    group: string | null;
    submittedAt: string;
    source: string;
    status: string;
    answers: { code: string; question: string; answer: string }[];
  }[];
  aiSummary: string;
  aiProvider: string;
  comparative?: { label: string; responses: number; averageSatisfaction: number; completionRate: number }[];
};

export type QRCodeSummary = {
  id: string;
  token: string;
  surveyId: string;
  surveyTitle: string;
  topic: string;
  label: string | null;
  status: string;
  scans: number;
  responses: number;
  completions: number;
  createdAt: string;
  expiresAt: string | null;
  lastScanAt: string | null;
  publicUrl: string;
  version: number | null;
};

export type DashboardStats = AnalyticsOverview & {
  trend?: { date: string; responses: number }[];
  statusMix?: { label: string; value: number }[];
  recentSurveys: {
    id: string;
    title: string;
    topic: string;
    status: string;
    interviewMethod: string;
    interviewMode: string;
    responses: number;
    questionCount: number;
    updatedAt: string;
  }[];
  recentResponses: {
    id: string;
    surveyTitle: string;
    respondent: string;
    source: string;
    submittedAt: string;
    status: string;
  }[];
  syncHealth: {
    pending: number;
    syncing: number;
    failed: number;
    conflicts: number;
    synced: number;
    lastSyncAt: string | null;
  };
  topKeywords: { keyword: string; count: number }[];
};