import { readFileSync, writeFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');

const header = `/**
 * Central API handler registry.
 * Thin route files under src/app/api delegate to these typed handlers so that
 * auth, validation and error handling stay uniform across every endpoint.
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, isPostgres } from '@/lib/prisma';
import {
  ApiError,
  enforceRateLimit,
  fail,
  getIp,
  getUserAgent,
  ok,
  readJson,
  requireAdminApi,
} from '@/lib/server/api';
import { logAudit, toSessionUser } from '@/lib/server/auth';
import {
  mapAuditEntry,
  mapBankItemRecord,
  mapQrTokenRecord,
  mapReportRecord,
  mapRespondentRecord,
  mapResponseSummary,
  mapSessionRecord,
  mapSurveySummary,
  mapSyncRecordEntry,
  type SurveyListRecord,
} from '@/lib/server/serializers';
import {
  createQrToken,
  generatePublicToken,
  publicSurveyUrl,
  qrDataUrl,
  qrSvg,
  resolvePublicToken,
} from '@/lib/server/qr';
import {
  addQuestion,
  deleteQuestion,
  duplicateQuestion,
  duplicateSurvey,
  createSurvey,
  deleteSurvey,
  getSurveyOr404,
  publishSurvey,
  reorderQuestions,
  saveTranslations,
  setSurveyStatus,
  updateQuestion,
  updateSurvey,
  loadQuestionTranslations,
  loadSurveyTranslations,
} from '@/lib/server/surveys';
import { generateQuestionSet, regenerateQuestion } from '@/lib/ai/questions';
import { analyzeOpenEnded } from '@/lib/ai/insights';
import { translateBatch, translateSurveyFields } from '@/lib/ai/translate';
import { generateFollowUp } from '@/lib/ai/follow-up';
import {
  getOverviewMetrics,
  getQuestionAnalyticsDetail,
  getSurveyAnalytics,
} from '@/lib/server/analytics';
import {
  buildReportContent,
  generateAndSaveReport,
  parseReportContent,
} from '@/lib/server/reports';
import { buildPublicSurveyPayload } from '@/lib/server/public-survey';
import {
  savePublicResponse,
  saveResponseBatch,
  computeContentHash,
} from '@/lib/server/submission';
import {
  mapQuestionToDraft,
  parseVersionSnapshot,
  questionsFromSnapshot,
} from '@/lib/server/questions';
import {
  appSettingsSchema,
  bankItemSchema,
  bankItemUpdateSchema,
  paginationSchema,
  profileUpdateSchema,
  qrCreateSchema,
  qrUpdateSchema,
  questionInputSchema,
  questionReorderSchema,
  regenerateQuestionSchema,
  respondentSchema,
  surveyCreateSchema,
  surveyUpdateSchema,
  tagSchema,
  translateSurveySchema,
} from '@/lib/server/validation';
import {
  analyticsFilterQuerySchema,
  publicFollowUpSchema,
  responseSubmitSchema,
  syncBatchSchema,
  syncResolveSchema,
  bankImportSchema,
  reportCreateSchema,
} from '@/lib/server/validation-public';
import { MAX_QUESTIONS_PER_SURVEY } from '@/lib/constants';
import { stringifyTags } from '@/lib/utils';
import type { QuestionRecord } from '@/lib/server/questions';
import type { ResponseSubmitPayload, SubmitResult, SyncBatchResult } from '@/lib/types';
import type { AnalyticsFilters } from '@/lib/types-analytics';

type Context = { params: Promise<Record<string, string>> };
`;

const stripImports = (text) => text.replace(/^import[\s\S]*?from\s*["'][^"']+["'];\s*$/gm, '');
const stripContexts = (text) => text.replace(/^type \w+ = \{ params: Promise<\{[^}]*\}> \};\s*$/gm, '');
const stripReexports = (text) => text.replace(/^export \s*\{[^}]*\};\s*$/gm, '');

const contextAliases = `
type QuestionContext = Context;
type BankContext = Context;
type RespondentContext = Context;
type ResponseContext = Context;
type ReportContext = Context;
type QrContext = Context;
type SyncContext = Context;
`;

const parts = [
  '_parts/api_s1.txt','_parts/api_s2.txt','_parts/api_s3.txt','_parts/api_s4.txt',
  '_parts/api_b1.txt','_parts/api_b2.txt','_parts/api_r1.txt','_parts/api_r2.txt',
  '_parts/api_r3.txt','_parts/api_q1.txt','_parts/api_n1.txt','_parts/api_o1.txt',
  '_parts/api_y1.txt','_parts/api_y2.txt','_parts/api_p1.txt','_parts/api_p2.txt',
  '_parts/api_p3.txt','_parts/api_p4.txt','_parts/api_t1.txt',
]
  .map((p) => stripReexports(stripContexts(stripImports(read(p)))))
  .join('\n\n');

writeFileSync('src/lib/server/handlers.ts', header + '\n' + contextAliases + '\n' + parts, 'utf8');
console.log('[concat] handlers.ts written');
