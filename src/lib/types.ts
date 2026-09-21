/**
 * Shared TypeScript contracts used by both server routes and client components.
 */

export type QuestionOption = { label: string; value: string; score?: number };

export type RandomizationStrategy = "SHUFFLE_ORDER" | "RANDOM_SUBSET" | "RANDOM_SET_ASSIGNMENT";

export type SurveySettings = {
  demographics: { key: string; label: string; enabled: boolean; required: boolean }[];
  requireAuthentication: boolean;
  allowLanguageSwitch: boolean;
  anonymizeResponses: boolean;
  showProgressBar: boolean;
  allowOffline: boolean;
  autoSync: boolean;
  sessionRecordingEnabled: boolean;
  thankYouMessage: string;
  randomize: {
    enabled: boolean;
    strategy: RandomizationStrategy;
    subsetSize: number;
    setCount: number;
  };
  likert: {
    defaultScale: 5 | 7;
    customLabels: string[] | null;
  };
  interviewSpecific: {
    allowFollowUps: boolean;
    followUpsPerQuestion: number;
    conversationStyle: "GUIDED" | "FREE";
  };
};

export type QuestionDraft = {
  id?: string;
  code?: string;
  text: string;
  originalText?: string | null;
  helpText?: string | null;
  type: string;
  category?: string | null;
  tags?: string[];
  difficulty?: string | null;
  relevanceScore?: number | null;
  isRequired?: boolean;
  options?: QuestionOption[] | null;
  likertScale?: number | null;
  aiGenerated?: boolean;
  aiSource?: string | null;
  allowFollowUp?: boolean;
  isCore?: boolean;
  order?: number;
};

export type GeneratedQuestion = QuestionDraft & { text: string; type: string };

export type GeneratedQuestionSet = {
  provider: "openai" | "offline-engine";
  model?: string;
  topic: string;
  language: string;
  interviewMethod: string;
  questions: GeneratedQuestion[];
  warnings?: string[];
  followUp?: string;
};

export type PublicQuestion = {
  id: string;
  code: string;
  order: number;
  text: string;
  helpText: string | null;
  type: string;
  category: string | null;
  isRequired: boolean;
  options: QuestionOption[] | null;
  likertScale: number | null;
  likertLabels: string[] | null;
  allowFollowUp: boolean;
  isFollowUpEnabled: boolean;
  translations: Record<string, string>;
};

export type PublicSurveyPayload = {
  token: string;
  surveyId: string;
  versionId: string | null;
  version: number;
  title: string;
  topic: string;
  description: string;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  availableLanguages: string[];
  status: string;
  expiresAt: string | null;
  qrStatus: string;
  settings: SurveySettings;
  questions: PublicQuestion[];
  totalQuestions: number;
  requireAuthentication: boolean;
  thankYouMessage: string;
  aiProvider: string;
  serverTime: string;
};

export type AnswerPayload = {
  questionId: string;
  valueText?: string | null;
  valueNumber?: number | null;
  valueOption?: string | null;
  valueOptions?: string[] | null;
  valueBool?: boolean | null;
  isFollowUp?: boolean;
  parentQuestionId?: string | null;
  followUpPrompt?: string | null;
  answeredAt?: string | null;
};

export type RespondentPayload = {
  name?: string | null;
  respondentCode?: string | null;
  ageGroup?: string | null;
  gender?: string | null;
  location?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  respondentGroup?: string | null;
  language?: string | null;
  device?: string | null;
};

export type SessionPayload = {
  sessionCode?: string | null;
  groupName?: string | null;
  notes?: string | null;
  members?: { name: string; role?: string | null; answersCount?: number }[];
  status?: string | null;
  networkState?: string | null;
  recording?: {
    kind?: string;
    status?: string;
    mimeType?: string;
    durationSec?: number;
    sizeBytes?: number;
    storageRef?: string | null;
  } | null;
};

export type ResponseSubmitPayload = {
  clientResponseId: string;
  token: string;
  language?: string;
  deviceId?: string | null;
  device?: string | null;
  networkState?: string | null;
  source?: "ONLINE" | "OFFLINE_SYNC";
  capturedAt?: string | null;
  durationSec?: number;
  status?: "COMPLETE" | "PARTIAL";
  respondent?: RespondentPayload | null;
  session?: SessionPayload | null;
  answers: AnswerPayload[];
  contentHash?: string | null;
  revision?: number;
};

export type SubmitResult = {
  clientResponseId: string;
  serverResponseId: string;
  status: "CREATED" | "DUPLICATE" | "CONFLICT" | "UPDATED" | "PENDING" | "FAILED";
  answersSaved: number;
  message: string;
  conflictOf?: string | null;
};

export type SyncBatchResult = {
  synced: number;
  duplicates: number;
  conflicts: number;
  failed: number;
  results: SubmitResult[];
  lastSyncAt: string;
};

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
  avatarColor: string | null;
  organization: string | null;
  lastLoginAt: string | null;
};

export type ApiErrorBody = {
  error: string;
  code?: string;
  details?: unknown;
  retryable?: boolean;
};

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = { ok: false } & ApiErrorBody;

export type OfflineQueueRecord = {
  id: string;
  token: string;
  surveyId: string;
  versionId: string | null;
  version: number;
  surveyTitle: string;
  topic: string;
  questionIds: string[];
  questions: PublicQuestion[];
  answers: AnswerPayload[];
  respondent: RespondentPayload | null;
  session: SessionPayload | null;
  language: string;
  deviceId: string;
  device: string;
  networkState: string;
  capturedAt: string;
  submittedAt: string;
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED" | "CONFLICT";
  attempts: number;
  lastError: string | null;
  syncedAt: string | null;
  serverResponseId: string | null;
  revision: number;
  conflictNote: string | null;
};