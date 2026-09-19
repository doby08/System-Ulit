/**
 * Database to API DTO serializers (keeps Prisma shapes out of the client bundle
 * and guarantees sensitive fields are never leaked).
 */
import { reportTypeMeta, surveyStatusMeta } from "@/lib/constants";
import { parseSurveySettings } from "@/lib/settings";
import { publicSurveyUrl } from "@/lib/server/qr";
import type { QRCodeSummary } from "@/lib/types-analytics";

type DateLike = Date | string | null | undefined;

const iso = (value: DateLike) => (value ? new Date(value).toISOString() : null);

export type SurveyListRecord = {
  id: string;
  title: string;
  topic: string;
  description: string;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  status: string;
  version: number;
  questionCount: number;
  respondentGroup: string | null;
  location: string | null;
  targetRespondents: number | null;
  settings: string | null;
  aiProvider: string | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: { id: string; fullName: string } | null;
  _count?: {
    responses?: number;
    respondents?: number;
    questions?: number;
    qrTokens?: number;
    sessions?: number;
  };
};

export function mapSurveySummary(survey: SurveyListRecord) {
  return {
    id: survey.id,
    title: survey.title,
    topic: survey.topic,
    description: survey.description,
    stakeholder: survey.stakeholder,
    interviewMethod: survey.interviewMethod,
    interviewMode: survey.interviewMode,
    language: survey.language,
    status: survey.status,
    statusLabel: surveyStatusMeta(survey.status).label,
    version: survey.version,
    questionCount: survey.questionCount || survey._count?.questions || 0,
    respondentGroup: survey.respondentGroup,
    location: survey.location,
    targetRespondents: survey.targetRespondents,
    aiProvider: survey.aiProvider,
    startsAt: iso(survey.startsAt),
    expiresAt: iso(survey.expiresAt),
    publishedAt: iso(survey.publishedAt),
    createdAt: iso(survey.createdAt),
    updatedAt: iso(survey.updatedAt),
    author: survey.createdBy?.fullName ?? null,
    responseCount: survey._count?.responses ?? 0,
    respondentCount: survey._count?.respondents ?? 0,
    sessionCount: survey._count?.sessions ?? 0,
    qrCount: survey._count?.qrTokens ?? 0,
  };
}

export type SurveySummaryDTO = ReturnType<typeof mapSurveySummary>;

export function mapRespondentRecord(record: {
  id: string;
  respondentCode: string;
  name: string | null;
  ageGroup: string | null;
  gender: string | null;
  location: string | null;
  organization: string | null;
  email: string | null;
  phone: string | null;
  respondentGroup: string | null;
  language: string | null;
  device: string | null;
  notes: string | null;
  surveyId: string | null;
  createdAt: Date;
  updatedAt: Date;
  survey?: { id: string; title: string } | null;
  _count?: { responses?: number; sessions?: number };
}) {
  return {
    id: record.id,
    respondentCode: record.respondentCode,
    name: record.name,
    ageGroup: record.ageGroup,
    gender: record.gender,
    location: record.location,
    organization: record.organization,
    email: record.email,
    phone: record.phone,
    respondentGroup: record.respondentGroup,
    language: record.language,
    device: record.device,
    notes: record.notes,
    surveyId: record.surveyId,
    surveyTitle: record.survey?.title ?? null,
    responseCount: record._count?.responses ?? 0,
    sessionCount: record._count?.sessions ?? 0,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

export type RespondentDTO = ReturnType<typeof mapRespondentRecord>;

export function mapResponseSummary(record: {
  id: string;
  clientResponseId: string;
  surveyId: string;
  sessionId: string | null;
  respondentId: string | null;
  language: string;
  status: string;
  source: string;
  syncStatus: string;
  answersCount: number;
  totalQuestions: number;
  completionRate: number;
  durationSec: number;
  device: string | null;
  networkState: string | null;
  revision: number;
  submittedAt: Date;
  syncedAt: Date | null;
  createdAt: Date;
  survey?: { id: string; title: string; interviewMethod: string; interviewMode: string } | null;
  respondent?: {
    id: string;
    name: string | null;
    respondentCode: string;
    respondentGroup: string | null;
  } | null;
  session?: { id: string; sessionCode: string; groupName: string | null; mode: string } | null;
}) {
  return {
    id: record.id,
    clientResponseId: record.clientResponseId,
    surveyId: record.surveyId,
    surveyTitle: record.survey?.title ?? "Deleted survey",
    interviewMethod: record.survey?.interviewMethod ?? null,
    interviewMode: record.survey?.interviewMode ?? null,
    respondentId: record.respondentId,
    respondentName:
      record.respondent?.name ?? record.respondent?.respondentCode ?? "Anonymous respondent",
    respondentGroup: record.respondent?.respondentGroup ?? null,
    sessionCode: record.session?.sessionCode ?? null,
    groupName: record.session?.groupName ?? null,
    language: record.language,
    status: record.status,
    source: record.source,
    syncStatus: record.syncStatus,
    answersCount: record.answersCount,
    totalQuestions: record.totalQuestions,
    completionRate: record.completionRate,
    durationSec: record.durationSec,
    device: record.device,
    networkState: record.networkState,
    revision: record.revision,
    submittedAt: iso(record.submittedAt),
    syncedAt: iso(record.syncedAt),
    createdAt: iso(record.createdAt),
  };
}

export type ResponseSummaryDTO = ReturnType<typeof mapResponseSummary>;

export function mapQrTokenRecord(
  record: {
    id: string;
    token: string;
    surveyId: string;
    label: string | null;
    status: string;
    scans: number;
    responses: number;
    completions: number;
    language: string;
    expiresAt: Date | null;
    lastScanAt: Date | null;
    createdAt: Date;
    survey: { id: string; title: string; topic: string; status: string };
    version?: { version: number } | null;
  },
  options: { includeImage?: boolean; dataUrl?: string; svg?: string } = {},
): QRCodeSummary & { surveyStatus: string; dataUrl?: string; svg?: string } {
  return {
    id: record.id,
    token: record.token,
    surveyId: record.surveyId,
    surveyTitle: record.survey.title,
    topic: record.survey.topic,
    label: record.label,
    status: record.status,
    scans: record.scans,
    responses: record.responses,
    completions: record.completions,
    createdAt: iso(record.createdAt) ?? new Date().toISOString(),
    expiresAt: iso(record.expiresAt),
    lastScanAt: iso(record.lastScanAt),
    publicUrl: publicSurveyUrl(record.token),
    version: record.version?.version ?? null,
    surveyStatus: record.survey.status,
    ...(options.includeImage ? { dataUrl: options.dataUrl, svg: options.svg } : {}),
  };
}

export type QrTokenDTO = ReturnType<typeof mapQrTokenRecord>;

export function mapReportRecord(record: {
  id: string;
  surveyId: string;
  surveyVersion: number | null;
  reportType: string;
  title: string;
  status: string;
  filters: string | null;
  summary: string | null;
  createdById: string;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  survey?: { id: string; title: string; topic: string } | null;
  createdBy?: { id: string; fullName: string } | null;
}) {
  return {
    id: record.id,
    surveyId: record.surveyId,
    surveyTitle: record.survey?.title ?? "Deleted survey",
    surveyTopic: record.survey?.topic ?? null,
    surveyVersion: record.surveyVersion,
    reportType: record.reportType,
    reportTypeLabel: reportTypeMeta(record.reportType).label,
    title: record.title,
    status: record.status,
    filters: record.filters,
    summary: record.summary,
    createdById: record.createdById,
    createdByName: record.createdBy?.fullName ?? null,
    generatedAt: iso(record.generatedAt),
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

export type ReportDTO = ReturnType<typeof mapReportRecord>;

export function mapSyncRecordEntry(record: {
  id: string;
  surveyId: string | null;
  responseId: string | null;
  clientResponseId: string | null;
  deviceId: string | null;
  direction: string;
  status: string;
  attempt: number;
  message: string | null;
  resolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  survey?: { id: string; title: string } | null;
  response?: { id: string; submittedAt: Date; source: string; answersCount: number } | null;
}) {
  return {
    id: record.id,
    surveyId: record.surveyId,
    surveyTitle: record.survey?.title ?? null,
    responseId: record.responseId,
    clientResponseId: record.clientResponseId,
    deviceId: record.deviceId,
    direction: record.direction,
    status: record.status,
    attempt: record.attempt,
    message: record.message,
    resolution: record.resolution,
    resolvedAt: iso(record.resolvedAt),
    responseSubmittedAt: iso(record.response?.submittedAt),
    responseSource: record.response?.source ?? null,
    answersCount: record.response?.answersCount ?? 0,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

export type SyncRecordDTO = ReturnType<typeof mapSyncRecordEntry>;

export function mapSessionRecord(record: {
  id: string;
  sessionCode: string;
  surveyId: string;
  versionId: string | null;
  respondentId: string | null;
  mode: string;
  groupName: string | null;
  status: string;
  notes: string | null;
  device: string | null;
  networkState: string | null;
  language: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  survey?: { id: string; title: string } | null;
  respondent?: { id: string; name: string | null; respondentCode: string } | null;
  _count?: { responses?: number; members?: number };
  members?: { id: string; name: string; role: string | null; answersCount: number; joinedAt: Date }[];
  recording?: {
    id: string;
    status: string;
    durationSec: number;
    sizeBytes: number;
    mimeType: string | null;
  } | null;
}) {
  return {
    id: record.id,
    sessionCode: record.sessionCode,
    surveyId: record.surveyId,
    surveyTitle: record.survey?.title ?? null,
    respondentId: record.respondentId,
    respondentName: record.respondent?.name ?? record.respondent?.respondentCode ?? null,
    mode: record.mode,
    groupName: record.groupName,
    status: record.status,
    notes: record.notes,
    device: record.device,
    networkState: record.networkState,
    language: record.language,
    startedAt: iso(record.startedAt),
    completedAt: iso(record.completedAt),
    responseCount: record._count?.responses ?? 0,
    memberCount: record.members?.length ?? record._count?.members ?? 0,
    members: (record.members ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      answersCount: member.answersCount,
      joinedAt: iso(member.joinedAt),
    })),
    recording: record.recording
      ? {
          status: record.recording.status,
          durationSec: record.recording.durationSec,
          sizeBytes: record.recording.sizeBytes,
          mimeType: record.recording.mimeType,
        }
      : null,
    createdAt: iso(record.createdAt),
  };
}

export type SessionDTO = ReturnType<typeof mapSessionRecord>;

export function mapBankItemRecord(record: {
  id: string;
  text: string;
  category: string | null;
  type: string;
  tags: string | null;
  difficulty: string | null;
  relevanceScore: number | null;
  interviewMethod: string | null;
  language: string;
  stakeholder: string | null;
  options: string | null;
  likertScale: number | null;
  usageCount: number;
  isFavorite: boolean;
  isArchived: boolean;
  aiGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    text: record.text,
    category: record.category,
    type: record.type,
    tags: record.tags ? record.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    difficulty: record.difficulty,
    relevanceScore: record.relevanceScore,
    interviewMethod: record.interviewMethod,
    language: record.language,
    stakeholder: record.stakeholder,
    options: record.options,
    likertScale: record.likertScale,
    usageCount: record.usageCount,
    isFavorite: record.isFavorite,
    isArchived: record.isArchived,
    aiGenerated: record.aiGenerated,
    createdAt: iso(record.createdAt),
    updatedAt: iso(record.updatedAt),
  };
}

export type BankItemDTO = ReturnType<typeof mapBankItemRecord>;

export function mapAuditEntry(record: {
  id: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string | null;
  severity: string;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    actorName: record.actorName,
    action: record.action,
    entity: record.entity,
    entityId: record.entityId,
    severity: record.severity,
    details: record.details,
    ip: record.ip,
    userAgent: record.userAgent,
    createdAt: iso(record.createdAt),
  };
}

export type AuditEntryDTO = ReturnType<typeof mapAuditEntry>;

export function parseSurveySettingsSafe(raw: string | null, method?: string, mode?: string) {
  return parseSurveySettings(raw, method, mode);
}