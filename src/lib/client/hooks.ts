/**
 * Client-side hooks: auth session, data fetching, and mutations.
 * Wraps the typed API client with React state management.
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { api, type ApiError, getErrorMessage } from "@/lib/client/api";
import type {
  SessionUser,
  PublicSurveyPayload,
  ResponseSubmitPayload,
  SubmitResult,
  SyncBatchResult,
  QuestionDraft,
  SurveySettings,
} from "@/lib/types";
import type {
  AnalyticsOverview,
  DashboardStats,
  DistributionPoint,
  QuestionAnalytics,
  ReportContent,
  TrendPoint,
} from "@/lib/types-analytics";

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });

  const checkSession = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api.get<{ user: SessionUser | null }>("/api/auth/session");
      setState({ user: data.user, loading: false, error: null });
    } catch (e) {
      setState({ user: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return { ...state, refetch: checkSession };
}

export async function login(
  username: string,
  password: string,
  remember = false,
): Promise<{ user: SessionUser } | ApiError> {
  try {
    const data = await api.post<{ user: SessionUser }>("/api/auth/login", { username, password, remember });
    return { user: data.user };
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) return e as ApiError;
    return { status: 500, message: String(e) } as ApiError;
  }
}

export async function logout(): Promise<void> {
  await api.post("/api/auth/logout");
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post("/api/auth/change-password", { oldPassword, newPassword });
}

export async function updateProfile(fullName: string, email: string | null): Promise<void> {
  await api.patch("/api/auth/profile", { fullName, email });
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Surveys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface SurveyListRecord {
  id: string;
  title: string;
  topic: string;
  description: string | null;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  status: string;
  version: number;
  questionCount: number;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
}

export interface SurveyDetailRecord extends SurveyListRecord {
  settings: SurveySettings;
  questions: QuestionDraft[];
}

export function useSurveys(params?: Record<string, string>) {
  const [data, setData] = useState<SurveyListRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const data = await api.get<{ items: SurveyListRecord[]; total: number; page: number; pageSize: number }>(
        `/api/admin/surveys${qs ? `?${qs}` : ""}`,
      );
      setData(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, total, refetch: fetch };
}

export async function createSurvey(payload: {
  title: string;
  topic: string;
  description?: string | null;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  expiresAt?: string | null;
  respondentGroup?: string | null;
  settings?: SurveySettings;
}): Promise<SurveyDetailRecord> {
  return api.post<SurveyDetailRecord>("/api/admin/surveys", payload);
}

export async function updateSurvey(id: string, payload: Partial<SurveyDetailRecord>): Promise<SurveyDetailRecord> {
  return api.patch<SurveyDetailRecord>(`/api/admin/surveys/${id}`, payload);
}

export async function publishSurvey(id: string): Promise<SurveyDetailRecord> {
  return api.post<SurveyDetailRecord>(`/api/admin/surveys/${id}/publish`, {});
}

export async function deleteSurvey(id: string): Promise<void> {
  await api.delete(`/api/admin/surveys/${id}`);
}

export async function duplicateSurvey(id: string): Promise<{ id: string }> {
  return api.post(`/api/admin/surveys/${id}/duplicate`, {});
}

export async function getSurveyDetail(id: string): Promise<any> {
  return api.get(`/api/admin/surveys/${id}`);
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export function useSurveyQuestions(surveyId: string) {
  const [data, setData] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!surveyId) return;
    setLoading(true);
    try {
      const result = await api.get<{ questions: QuestionDraft[] }>(`/api/admin/surveys/${surveyId}/questions`);
      setData(result.questions);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const saveQuestion = async (q: QuestionDraft) => {
    if (q.id) {
      await api.patch(`/api/admin/surveys/${surveyId}/questions/${q.id}`, q);
    } else {
      await api.post(`/api/admin/surveys/${surveyId}/questions`, q);
    }
    fetch();
  };

  const deleteQuestion = async (id: string) => {
    await api.delete(`/api/admin/surveys/${surveyId}/questions/${id}`);
    fetch();
  };

  const reorder = async (orderedIds: string[]) => {
    await api.put(`/api/admin/surveys/${surveyId}/questions/reorder`, { orderedIds });
    fetch();
  };

  return { data, loading, error, refetch: fetch, saveQuestion, deleteQuestion, reorder };
}

export async function generateQuestions(
  surveyId: string,
  params: { count: number; difficulty?: string; type?: string },
): Promise<{
  questions: QuestionDraft[];
  provider: string;
  saved: number;
  totalQuestions: number;
  skipped: number;
  limitReached: boolean;
  warnings?: string[];
}> {
  return api.post(`/api/admin/surveys/${surveyId}/questions/generate`, params);
}

export async function regenerateQuestion(
  surveyId: string,
  questionId: string,
): Promise<{ question: QuestionDraft }> {
  return api.post(`/api/admin/surveys/${surveyId}/questions/${questionId}`, {});
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ Question Bank â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export interface BankItem {
  id: string;
  question: string;
  originalText: string;
  type: string;
  category: string | null;
  tags: string[];
  difficulty: string | null;
  relevanceScore: number | null;
  interviewMethod: string | null;
  language: string;
  isFavorite: boolean;
  uses: number;
  createdAt: string;
  updatedAt: string;
}

export function useQuestionBank(params?: Record<string, string>) {
  const [data, setData] = useState<BankItem[] | null>(null);
  const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(params).toString();
      const result = await api.get<{ items: BankItem[]; total: number; page: number; pageSize: number }>(
        `/api/admin/bank${qs ? `?${qs}` : ""}`,
      );
      setData(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, total, refetch: fetch };
}

export async function importBankItem(question: {
  question: string;
  type: string;
  category?: string | null;
  tags?: string[];
  difficulty?: string | null;
  relevanceScore?: number | null;
  interviewMethod?: string | null;
  language?: string;
}): Promise<BankItem> {
  return api.post<BankItem>("/api/admin/bank/import", question);
}

export interface RespondentRecord {
  id: string;
  name?: string;
  code?: string;
  ageGroup?: string;
  gender?: string;
  location?: string;
  respondentGroup?: string;
  responseCount: number;
  lastSeen?: string;
}

/**
 * Generates and persists a report on the server.
 * NOTE: the endpoint is POST /api/admin/reports (the old "/generate" suffix did not exist
 * and caused every "Generate Report" click to fail with a 404).
 */
export async function generateReport(payload: {
  surveyId: string;
  reportType: "SUMMARY" | "DETAILED" | "COMPARATIVE";
  title?: string;
  filters?: Record<string, unknown>;
}): Promise<GeneratedReport> {
  return api.post<GeneratedReport>("/api/admin/reports", {
    surveyId: payload.surveyId,
    reportType: payload.reportType,
    title: payload.title,
    filters: payload.filters,
  });
}

/** Rebuilds an existing report from the latest response data. */
export async function regenerateReport(id: string): Promise<GeneratedReport> {
  return api.post<GeneratedReport>(`/api/admin/reports/${id}/regenerate`);
}

/** Deletes a saved report. */
export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/api/admin/reports/${id}`);
}

/** Direct download URL for a saved report export. */
export function reportDownloadUrl(
  id: string,
  format: ReportExportFormat = "pdf",
  inline = false,
): string {
  const params = new URLSearchParams({ format });
  if (inline) params.set("disposition", "inline");
  return `/api/admin/reports/${id}/download?${params.toString()}`;
}

export function useReports(filters?: { surveyId?: string; reportType?: string }) {
  const [data, setData] = useState<ReportRecord[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(
        Object.entries(filters ?? {}).filter(([, value]) => Boolean(value)) as [string, string][],
      ).toString();
      const result = await api.get<{ items: ReportRecord[]; total: number }>(
        `/api/admin/reports${qs ? `?${qs}` : ""}`,
      );
      setData(result.items ?? []);
    } catch (e) {
      setError(getErrorMessage(e));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters ?? {})]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

/** Loads one saved report together with its stored content. */
export function useReportDetail(id: string) {
  const [report, setReport] = useState<ReportRecord | null>(null);
  const [content, setContent] = useState<ReportContent | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<{ report: ReportRecord | null; content: ReportContent | null }>(
        `/api/admin/reports/${id}`,
      );
      setReport(result.report);
      setContent(result.content);
      if (!result.report) setError("Report not found.");
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);
  return { report, content, loading, error, refetch: fetch };
}

export type ReportExportFormat = "pdf" | "word" | "excel" | "csv" | "json";

/** Mirrors `mapReportRecord` on the server (the previous field names did not exist). */
export interface ReportRecord {
  id: string;
  surveyId: string;
  surveyTitle: string;
  surveyTopic: string | null;
  surveyVersion: number | null;
  reportType: string;
  reportTypeLabel: string;
  title: string;
  status: string;
  summary: string | null;
  createdByName: string | null;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Response of POST /api/admin/reports and the regenerate endpoint. */
export interface GeneratedReport {
  report: ReportRecord;
  content: ReportContent;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<DashboardStats>("/api/admin/dashboard");
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export interface RespondentSummary {
  id: string;
  name?: string;
  code?: string;
  ageGroup?: string;
  gender?: string;
  location?: string;
  respondentGroup?: string;
  responseCount: number;
  lastSeen?: string;
}

export function useRespondents(params?: Record<string, string>) {
  const [data, setData] = useState<RespondentSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(params ?? {}).toString();
      const result = await api.get<{ items: RespondentSummary[] }>(
        `/api/admin/respondents${qs ? `?${qs}` : ""}`
      );
      setData(result.items);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}


export { useSvgQrImage } from "./useSvgQrImage";

/** Server payload of GET /api/admin/analytics (matches getSurveyAnalytics + question detail). */
export interface AnalyticsResult {
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
  surveys: { id: string; title: string }[];
}

/**
 * Analytics query filters.
 * NOTE: the API expects `method` / `mode` (not interviewMethod/interviewMode) — sending the
 * old key names silently ignored the filter.
 */
export interface AnalyticsFilters {
  surveyId?: string;
  respondentGroup?: string;
  method?: string;
  mode?: string;
  language?: string;
  from?: string;
  to?: string;
  includeOffline?: string;
}

export function useAnalytics(filters: AnalyticsFilters) {
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => Boolean(value)) as [string, string][],
      ).toString();
      const result = await api.get<AnalyticsResult>(`/api/admin/analytics${qs ? `?${qs}` : ""}`);
      setData(result);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, refetch: fetch };
}

export interface QRCodeSummary {
  id: string;
  token: string;
  surveyId: string;
  surveyTitle: string;
  topic: string;
  label?: string | null;
  publicUrl: string;
  qrImageUrl?: string | null;
  dataUrl?: string;
  status: string;
  surveyStatus?: string;
  version?: number | null;
  scans: number;
  responses: number;
  completions: number;
  createdAt: string;
  expiresAt?: string | null;
  lastScannedAt?: string | null;
}

export function useQRTokens() {
  const [data, setData] = useState<QRCodeSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{ items: QRCodeSummary[] }>(`/api/admin/qr`);
      setData(result.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

export interface SyncRecord {
  id: string;
  token: string;
  status: string;
  submittedAt: string;
  syncedAt?: string | null;
}

export function useSyncRecords() {
  const [data, setData] = useState<SyncRecord[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<{ items: SyncRecord[] }>(`/api/admin/sync`);
      setData(result.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useResponseDetail(id: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await api.get(`/api/admin/responses/${id}`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}

export function useReport(id: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!id);

  const fetch = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const result = await api.get(`/api/admin/reports/${id}`);
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, refetch: fetch };
}
/* ────────────────────────── QR code operations ────────────────────────── */

export async function createQrCode(payload: {
  surveyId: string;
  label?: string | null;
  language?: string;
  expiresAt?: string | null;
  versionId?: string | null;
}): Promise<QRCodeSummary> {
  return api.post<QRCodeSummary>(`/api/admin/qr`, payload);
}

export async function updateQrCode(
  id: string,
  payload: {
    status?: "ACTIVE" | "DISABLED";
    label?: string | null;
    expiresAt?: string | null;
    regenerate?: boolean;
    rotateToken?: boolean;
  },
): Promise<{ qr: QRCodeSummary }> {
  return api.patch<{ qr: QRCodeSummary }>(`/api/admin/qr/${id}`, payload);
}

export async function deleteQrCode(id: string): Promise<void> {
  await api.delete(`/api/admin/qr/${id}`);
}

/** Fetches one QR token with a freshly rendered QR image (data URL + SVG). */
export async function getQrCodeDetail(
  id: string,
): Promise<{ qr: QRCodeSummary | null; publicUrl?: string; dataUrl?: string; svg?: string }> {
  return api.get<{ qr: QRCodeSummary | null; publicUrl?: string; dataUrl?: string; svg?: string }>(
    `/api/admin/qr/${id}`,
  );
}

/* ─────────────────────── Public / respondent flow ─────────────────────── */

/** Loads the prepared survey behind a QR token (public, unauthenticated). */
export async function fetchPublicSurvey(token: string): Promise<PublicSurveyPayload> {
  return api.get<PublicSurveyPayload>(`/api/public/survey/${encodeURIComponent(token)}`);
}

/** Submits one completed response for a QR token. */
export async function submitPublicResponse(
  payload: ResponseSubmitPayload,
): Promise<SubmitResult> {
  return api.post<SubmitResult>(`/api/public/submit`, payload);
}

/** Requests an AI follow-up probe for Semi-Structured / Unstructured interviews. */
export async function requestPublicFollowUp(payload: {
  token: string;
  questionId: string;
  questionText: string;
  answer: string;
  language?: string;
  askedFollowUps?: string[];
}): Promise<{ question: string; provider?: string }> {
  return api.post<{ question: string; provider?: string }>(`/api/public/follow-up`, payload);
}


