/**
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
  addGeneratedQuestions,
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


type QuestionContext = Context;
type BankContext = Context;
type RespondentContext = Context;
type ResponseContext = Context;
type ReportContext = Context;
type QrContext = Context;
type SyncContext = Context;










/** GET /api/admin/dashboard — live operational statistics + recent activity. */
export async function GET() {
  try {
    await requireAdminApi();
    const { getDashboardStats } = await import("@/lib/server/analytics");
    return ok(await getDashboardStats());
  } catch (error) {
    return fail(error);
  }
}

/** GET /api/admin/surveys — paginated survey list with search + filters. */
export async function GET_LIST(request: NextRequest) {
  const user = await requireAdminApi();
  void user;
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = (url.searchParams.get("search") ?? "").trim();
  const status = url.searchParams.get("status") ?? undefined;
  const method = url.searchParams.get("method") ?? undefined;
  const mode = url.searchParams.get("mode") ?? undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(method ? { interviewMethod: method } : {}),
    ...(mode ? { interviewMode: mode } : {}),
    ...(search
      ? isPostgres()
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { topic: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {
            OR: [{ title: { contains: search } }, { topic: { contains: search } }],
          }
      : {}),
  };

  const [total, surveys] = await Promise.all([
    prisma.survey.count({ where }),
    prisma.survey.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        createdBy: { select: { id: true, fullName: true } },
        _count: {
          select: { responses: true, respondents: true, questions: true, qrTokens: true, sessions: true },
        },
      },
    }),
  ]);

  return ok({ items: surveys.map(mapSurveySummary), total, page, pageSize });
}

/** POST /api/admin/surveys — create a draft survey (optionally publish). */
export async function POST_CREATE(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, surveyCreateSchema);
  const survey = await createSurvey(user.id, body, {
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  await logAudit({
    action: "SURVEY_API_CREATED",
    entity: "Survey",
    entityId: survey.id,
    actorId: user.id,
    actorName: user.username,
    details: { title: survey.title },
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok(mapSurveySummary({ ...survey, questionCount: survey.questions?.length ?? 0 }), {
    status: 201,
  });
}











/** GET /api/admin/surveys/[id] — full survey detail incl. questions, versions, QR tokens. */
export async function GET_DETAIL(_request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  void user;
  const { id } = await params;
  const survey = await getSurveyOr404(id);
  return ok({
    ...mapSurveySummary({
      ...survey,
      questionCount: survey.questions.length,
      _count: survey._count,
    }),
    questions: survey.questions,
    versions: survey.versions,
    qrTokens: survey.qrTokens.map((token) => ({
      id: token.id,
      token: token.token,
      label: token.label,
      status: token.status,
      scans: token.scans,
      responses: token.responses,
      completions: token.completions,
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt?.toISOString() ?? null,
    })),
    settingsParsed: survey.settings,
  });
}

/** PATCH /api/admin/surveys/[id] — update survey + prepared questions. */
export async function PATCH_UPDATE(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const body = await readJson(request, surveyUpdateSchema);
  const updated = await updateSurvey(user.id, id, body as never, {
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok(mapSurveySummary({ ...updated, questionCount: updated.questions?.length ?? 0 }));
}

/** DELETE /api/admin/surveys/[id] — deletes (or force-deletes) a survey. */
export async function DELETE_SURVEY(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const force = new URL(request.url).searchParams.get("force") === "true";
  const result = await deleteSurvey(user.id, id, {
    force,
    meta: { ip: getIp(request), userAgent: getUserAgent(request) },
  });
  return ok(result);
}

/** POST /api/admin/surveys/[id]/publish — freezes a version and publishes. */
export async function POST_PUBLISH(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  enforceRateLimit(`publish:${user.id}`, 20, 60_000, "Too many publish requests. Please slow down.");
  const payload = await readJson(
    request,
    z.object({ changeNote: z.string().max(300).optional() }),
  );
  const changeNote: string | null = payload.changeNote?.trim() ?? null;
  const { survey, version } = await publishSurvey(user.id, id, {
    changeNote,
    meta: { ip: getIp(request), userAgent: getUserAgent(request) },
  });
  return ok({
    survey: mapSurveySummary({
      ...survey,
      questionCount: survey.questions.length,
      _count: survey._count,
    }),
    version: {
      id: version.id,
      version: version.version,
      publishedAt: version.publishedAt?.toISOString() ?? null,
    },
  });
}

/** POST /api/admin/surveys/[id]/status — lifecycle transitions. */
export async function POST_STATUS(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const body = await readJson(
    request,
    z.object({
      status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]),
    }),
  );
  const updated = await setSurveyStatus(user.id, id, body.status, {
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok({ id: updated.id, status: updated.status });
}

/** POST /api/admin/surveys/[id]/duplicate — clones a survey as a draft. */
export async function POST_DUPLICATE(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const copy = await duplicateSurvey(user.id, id, {
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok({ id: copy.id, title: copy.title }, { status: 201 });
}











/** GET /api/admin/surveys/[id]/questions — prepared questions for the builder. */
export async function GET_QUESTIONS(_request: NextRequest, { params }: Context) {
  await requireAdminApi();
  const { id } = await params;
  const survey = await getSurveyOr404(id);
  return ok({
    questions: survey.questions.map((question) => mapQuestionToDraft(question)),
    count: survey.questions.length,
  });
}

/** POST /api/admin/surveys/[id]/questions — add one manual question. */
export async function POST_QUESTION(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const body = await readJson(request, questionInputSchema);
  const question = await addQuestion(user.id, id, body as never);
  return ok(mapQuestionToDraft(question), { status: 201 });
}

/** PUT /api/admin/surveys/[id]/questions/reorder — persist builder order. */
export async function PUT_REORDER(request: NextRequest, { params }: Context) {
  await requireAdminApi();
  const { id } = await params;
  const body = await readJson(request, questionReorderSchema);
  const questions = await reorderQuestions(id, body.order);
  return ok({ questions: questions.map((question) => mapQuestionToDraft(question)) });
}

/** POST /api/admin/surveys/[id]/questions/regenerate — one replacement question. */
export async function POST_REGENERATE(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  enforceRateLimit(
    `ai-regen:${user.id}`,
    20,
    60_000,
    "AI regeneration is rate-limited. Please wait a moment.",
  );
  const body = await readJson(request, regenerateQuestionSchema);
  const survey = await getSurveyOr404(id);
  const exclude = [...(body.exclude ?? []), ...(body.text ? [body.text] : [])];
  const replacement = await regenerateQuestion({
    topic: survey.topic,
    stakeholder: survey.stakeholder,
    interviewMethod: survey.interviewMethod,
    interviewMode: survey.interviewMode,
    language: survey.language,
    count: 1,
    difficulty: body.difficulty ?? null,
    exclude,
  });
  if (!replacement) {
    return ok({ question: null, message: "No alternative question could be generated." });
  }
  return ok({ question: replacement });
}


/** PATCH /api/admin/surveys/[id]/questions/[questionId] — edit one question. */
export async function PATCH_QUESTION(request: NextRequest, { params }: QuestionContext) {
  await requireAdminApi();
  const { questionId } = await params;
  const body = await readJson(request, questionInputSchema.partial());
  const updated = await updateQuestion("", questionId, body as never);
  return ok(mapQuestionToDraft(updated));
}

/** DELETE /api/admin/surveys/[id]/questions/[questionId] — delete one question. */
export async function DELETE_QUESTION(_request: NextRequest, { params }: QuestionContext) {
  await requireAdminApi();
  const { questionId } = await params;
  return ok(await deleteQuestion(questionId));
}

/** POST /api/admin/surveys/[id]/questions/[questionId]/duplicate — clone. */
export async function POST_DUPLICATE_QUESTION(_request: NextRequest, { params }: QuestionContext) {
  const user = await requireAdminApi();
  const { questionId } = await params;
  const created = await duplicateQuestion(user.id, questionId);
  return ok(mapQuestionToDraft(created), { status: 201 });
}









/** POST /api/admin/surveys/[id]/generate — bulk AI generation into the builder. */
export async function POST_BULK_GENERATE(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  enforceRateLimit(
    `ai-generate:${user.id}`,
    10,
    60_000,
    "AI generation is rate-limited. Please wait a moment before generating again.",
  );
  const body = await readJson(
    request,
    z.object({
      count: z.number().int().min(1).max(MAX_QUESTIONS_PER_SURVEY),
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().nullable(),
      questionTypes: z.array(z.string()).max(10).optional(),
      seed: z.string().max(120).optional(),
    }),
  );
  const survey = await getSurveyOr404(id);
  const result = await generateQuestionSet({
    topic: survey.topic,
    stakeholder: survey.stakeholder,
    interviewMethod: survey.interviewMethod,
    interviewMode: survey.interviewMode,
    language: survey.language,
    count: body.count,
    difficulty: body.difficulty ?? null,
    questionTypes: body.questionTypes ?? null,
    seed: body.seed ?? `${survey.id}:${Date.now()}`,
  });

  try {
    await prisma.questionBankItem.createMany({
      data: result.questions.map((question) => ({
        text: question.text,
        category: question.category ?? "General",
        type: question.type,
        tags: question.tags?.join(",") ?? null,
        difficulty: question.difficulty,
        relevanceScore: question.relevanceScore,
        interviewMethod: survey.interviewMethod,
        language: survey.language,
        stakeholder: survey.stakeholder,
        options: question.options ? JSON.stringify(question.options) : null,
        likertScale: question.likertScale,
        aiGenerated: true,
        createdById: user.id,
      })),
    });
  } catch {
    // bank persistence is a convenience — generation results still return
  }

  // Persist the generated set INTO the survey so it can be reviewed, published
  // and turned into QR codes. Generation alone used to leave the survey empty.
  const persisted = await addGeneratedQuestions(user.id, id, result.questions, {
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });

  return ok({
    provider: result.provider,
    model: result.model ?? null,
    questions: persisted.created.map((question) =>
      mapQuestionToDraft(question as unknown as QuestionRecord),
    ),
    saved: persisted.created.length,
    totalQuestions: persisted.total,
    skipped: persisted.skipped,
    limitReached: persisted.limitReached,
    warnings: result.warnings ?? [],
    fallbackReason: result.fallbackReason ?? null,
  });
}








/** GET /api/admin/bank — searchable, filterable question bank. */
export async function GET_BANK(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = (url.searchParams.get("search") ?? "").trim();
  const category = url.searchParams.get("category") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const difficulty = url.searchParams.get("difficulty") ?? undefined;
  const method = url.searchParams.get("method") ?? undefined;
  const language = url.searchParams.get("language") ?? undefined;
  const favorite = url.searchParams.get("favorite");
  const archived = url.searchParams.get("archived") ?? "false";

  const where = {
    ...(archived === "true"
      ? { isArchived: true }
      : archived === "false"
        ? { isArchived: false }
        : {}),
    ...(category ? { category } : {}),
    ...(type ? { type } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(method ? { interviewMethod: method } : {}),
    ...(language ? { language } : {}),
    ...(favorite === "true" ? { isFavorite: true } : {}),
    ...(search
      ? isPostgres()
        ? { text: { contains: search, mode: "insensitive" as const } }
        : { text: { contains: search } }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.questionBankItem.count({ where }),
    prisma.questionBankItem.findMany({
      where,
      orderBy: [{ isFavorite: "desc" }, { usageCount: "desc" }, { updatedAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok({ items: items.map(mapBankItemRecord), total, page, pageSize });
}

/** POST /api/admin/bank — add a question to the bank. */
export async function POST_BANK(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, bankItemSchema);
  const item = await prisma.questionBankItem.create({
    data: {
      text: body.text.trim(),
      category: body.category ?? null,
      type: body.type,
      tags: stringifyTags(body.tags),
      difficulty: body.difficulty ?? null,
      relevanceScore: body.relevanceScore ?? null,
      interviewMethod: body.interviewMethod ?? null,
      language: body.language,
      stakeholder: body.stakeholder ?? null,
      options: body.options ? JSON.stringify(body.options) : null,
      likertScale: body.likertScale ?? null,
      isFavorite: body.isFavorite ?? false,
      isArchived: body.isArchived ?? false,
      createdById: user.id,
    },
  });
  return ok(mapBankItemRecord(item), { status: 201 });
}











/** PATCH /api/admin/bank/[bankId] — edit, favourite, archive. */
export async function PATCH_BANK(request: NextRequest, { params }: BankContext) {
  await requireAdminApi();
  const { bankId } = await params;
  const body = await readJson(request, bankItemUpdateSchema);
  const item = await prisma.questionBankItem.update({
    where: { id: bankId },
    data: {
      ...(body.text !== undefined ? { text: body.text.trim() } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.tags !== undefined ? { tags: stringifyTags(body.tags) } : {}),
      ...(body.difficulty !== undefined ? { difficulty: body.difficulty } : {}),
      ...(body.relevanceScore !== undefined ? { relevanceScore: body.relevanceScore } : {}),
      ...(body.interviewMethod !== undefined ? { interviewMethod: body.interviewMethod } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.stakeholder !== undefined ? { stakeholder: body.stakeholder } : {}),
      ...(body.options !== undefined
        ? { options: body.options ? JSON.stringify(body.options) : null }
        : {}),
      ...(body.likertScale !== undefined ? { likertScale: body.likertScale } : {}),
      ...(body.isFavorite !== undefined ? { isFavorite: body.isFavorite } : {}),
      ...(body.isArchived !== undefined ? { isArchived: body.isArchived } : {}),
    },
  });
  return ok(mapBankItemRecord(item));
}

/** DELETE /api/admin/bank/[bankId] — remove a bank item. */
export async function DELETE_BANK(_request: NextRequest, { params }: BankContext) {
  await requireAdminApi();
  const { bankId } = await params;
  await prisma.questionBankItem.delete({ where: { id: bankId } });
  return ok({ deleted: true });
}

/** POST /api/admin/bank/import — copy bank items into a survey. */
export async function POST_BANK_IMPORT(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, bankImportSchema);
  const survey = await prisma.survey.findUnique({
    where: { id: body.surveyId },
    include: { questions: { select: { id: true } } },
  });
  if (!survey) return ok({ imported: 0, message: "Survey not found." });
  const items = await prisma.questionBankItem.findMany({ where: { id: { in: body.ids } } });
  const base = survey.questions.length;
  await prisma.surveyQuestion.createMany({
    data: items.map((item, index) => ({
      surveyId: body.surveyId,
      order: base + index + 1,
      code: `Q${base + index + 1}`,
      text: item.text,
      originalText: item.text,
      type: item.type,
      category: item.category,
      tags: item.tags,
      difficulty: item.difficulty,
      relevanceScore: item.relevanceScore,
      isRequired: true,
      options: item.options,
      likertScale: item.likertScale,
      aiGenerated: item.aiGenerated,
      bankItemId: item.id,
      allowFollowUp: false,
      isCore: true,
      createdById: user.id,
    })),
  });
  await prisma.questionBankItem.updateMany({
    where: { id: { in: body.ids } },
    data: { usageCount: { increment: 1 } },
  });
  await prisma.survey.update({
    where: { id: body.surveyId },
    data: { questionCount: base + items.length },
  });
  return ok({ imported: items.length });
}

/** GET /api/admin/bank/tags — taxonomy + facet counts. */
export async function GET_TAGS() {
  await requireAdminApi();
  const [tags, categories, types] = await Promise.all([
    prisma.questionTag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { links: true } } },
    }),
    prisma.questionBankItem.groupBy({ by: ["category"], _count: { _all: true } }),
    prisma.questionBankItem.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  return ok({
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      links: tag._count.links,
    })),
    categories: categories
      .filter((c) => c.category)
      .map((c) => ({ category: c.category, count: c._count._all })),
    types: types.map((t) => ({ type: t.type, count: t._count._all })),
  });
}

/** POST /api/admin/bank/tags — create a taxonomy tag. */
export async function POST_TAG(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, tagSchema);
  const tag = await prisma.questionTag.upsert({
    where: { name: body.name.trim() },
    create: { name: body.name.trim(), color: body.color ?? "#6366F1" },
    update: { color: body.color ?? "#6366F1" },
  });
  await logAudit({
    action: "TAG_CREATED",
    entity: "QuestionTag",
    entityId: tag.id,
    actorId: user.id,
    actorName: user.username,
    details: { name: tag.name },
  });
  return ok({ id: tag.id, name: tag.name, color: tag.color }, { status: 201 });
}










/** GET /api/admin/respondents — directory with search, group + survey filters. */
export async function GET_RESPONDENTS(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const search = (url.searchParams.get("search") ?? "").trim();
  const group = url.searchParams.get("group") ?? undefined;
  const surveyId = url.searchParams.get("surveyId") ?? undefined;

  const where = {
    ...(group ? { respondentGroup: group } : {}),
    ...(surveyId ? { surveyId } : {}),
    ...(search
      ? {
          OR: isPostgres()
            ? [
                { name: { contains: search, mode: "insensitive" as const } },
                { respondentCode: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
              ]
            : [
                { name: { contains: search } },
                { respondentCode: { contains: search } },
                { email: { contains: search } },
              ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    prisma.respondent.count({ where }),
    prisma.respondent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        survey: { select: { id: true, title: true } },
        _count: { select: { responses: true, sessions: true } },
      },
    }),
  ]);
  return ok({ items: items.map(mapRespondentRecord), total, page, pageSize });
}

/** POST /api/admin/respondents — manually register a respondent. */
export async function POST_RESPONDENT(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, respondentSchema);
  const existing = body.respondentCode
    ? await prisma.respondent.findUnique({ where: { respondentCode: body.respondentCode } })
    : null;
  if (existing) {
    const withRelations = await prisma.respondent.findUnique({
      where: { id: existing.id },
      include: {
        survey: { select: { id: true, title: true } },
        _count: { select: { responses: true, sessions: true } },
      },
    });
    return ok(mapRespondentRecord(withRelations!));
  }
  const created = await prisma.respondent.create({
    data: {
      respondentCode:
        body.respondentCode ??
        `RSP-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 90 + 10)}`,
      name: body.name,
      ageGroup: body.ageGroup,
      gender: body.gender,
      location: body.location,
      organization: body.organization,
      email: body.email === "" ? null : (body.email ?? null),
      phone: body.phone,
      respondentGroup: body.respondentGroup,
      language: body.language,
      device: body.device,
      notes: body.notes,
      surveyId: body.surveyId,
      demographics: body.demographics ? JSON.stringify(body.demographics) : null,
      createdById: user.id,
    },
    include: {
      survey: { select: { id: true, title: true } },
      _count: { select: { responses: true, sessions: true } },
    },
  });
  await logAudit({
    action: "RESPONDENT_CREATED",
    entity: "Respondent",
    entityId: created.id,
    actorId: user.id,
    actorName: user.username,
    details: { code: created.respondentCode },
  });
  return ok(mapRespondentRecord(created), { status: 201 });
}










/** GET /api/admin/respondents/[respondentId] — profile + responses + sessions. */
export async function GET_RESPONDENT(_request: NextRequest, { params }: RespondentContext) {
  await requireAdminApi();
  const { respondentId } = await params;
  const record = await prisma.respondent.findUnique({
    where: { id: respondentId },
    include: {
      survey: { select: { id: true, title: true } },
      responses: {
        orderBy: { submittedAt: "desc" },
        take: 30,
        include: {
          survey: { select: { id: true, title: true, interviewMethod: true, interviewMode: true } },
          session: { select: { id: true, sessionCode: true, groupName: true, mode: true } },
        },
      },
      sessions: {
        orderBy: { startedAt: "desc" },
        take: 20,
        select: {
          id: true,
          sessionCode: true,
          surveyId: true,
          groupName: true,
          status: true,
          startedAt: true,
        },
      },
      _count: { select: { responses: true, sessions: true } },
    },
  });
  if (!record) return ok({ respondent: null });
  return ok({
    respondent: mapRespondentRecord(record),
    responses: record.responses.map((response) =>
      mapResponseSummary({
        ...response,
        respondentId: record.id,
        respondent: {
          id: record.id,
          name: record.name,
          respondentCode: record.respondentCode,
          respondentGroup: record.respondentGroup,
        },
      }),
    ),
    sessions: record.sessions,
  });
}

/** PATCH /api/admin/respondents/[respondentId] — update profile fields. */
export async function PATCH_RESPONDENT(request: NextRequest, { params }: RespondentContext) {
  const user = await requireAdminApi();
  const { respondentId } = await params;
  const body = await readJson(request, respondentSchema.partial());
  const updated = await prisma.respondent.update({
    where: { id: respondentId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.ageGroup !== undefined ? { ageGroup: body.ageGroup } : {}),
      ...(body.gender !== undefined ? { gender: body.gender } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.organization !== undefined ? { organization: body.organization } : {}),
      ...(body.email !== undefined ? { email: body.email === "" ? null : body.email } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.respondentGroup !== undefined ? { respondentGroup: body.respondentGroup } : {}),
      ...(body.language !== undefined ? { language: body.language } : {}),
      ...(body.device !== undefined ? { device: body.device } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.surveyId !== undefined ? { surveyId: body.surveyId } : {}),
      ...(body.demographics !== undefined
        ? { demographics: body.demographics ? JSON.stringify(body.demographics) : null }
        : {}),
    },
    include: {
      survey: { select: { id: true, title: true } },
      _count: { select: { responses: true, sessions: true } },
    },
  });
  await logAudit({
    action: "RESPONDENT_UPDATED",
    entity: "Respondent",
    entityId: respondentId,
    actorId: user.id,
    actorName: user.username,
    details: body,
  });
  return ok(mapRespondentRecord(updated));
}

/** DELETE /api/admin/respondents/[respondentId] — remove a respondent record. */
export async function DELETE_RESPONDENT(_request: NextRequest, { params }: RespondentContext) {
  const user = await requireAdminApi();
  const { respondentId } = await params;
  await prisma.respondent.delete({ where: { id: respondentId } });
  await logAudit({
    action: "RESPONDENT_DELETED",
    entity: "Respondent",
    entityId: respondentId,
    actorId: user.id,
    actorName: user.username,
    severity: "WARNING",
    details: null,
  });
  return ok({ deleted: true });
}








/** GET /api/admin/responses — response list with survey/group/method/source filters. */
export async function GET_RESPONSES(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const surveyId = url.searchParams.get("surveyId") ?? undefined;
  const group = url.searchParams.get("group") ?? undefined;
  const method = url.searchParams.get("method") ?? undefined;
  const source = url.searchParams.get("source") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const search = (url.searchParams.get("search") ?? "").trim();

  const where = {
    ...(surveyId ? { surveyId } : {}),
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
    ...(method ? { survey: { interviewMethod: method } } : {}),
    ...(group ? { respondent: { respondentGroup: group } } : {}),
    ...(search ? { clientResponseId: { contains: search } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.response.count({ where }),
    prisma.response.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        survey: { select: { id: true, title: true, interviewMethod: true, interviewMode: true } },
        respondent: {
          select: { id: true, name: true, respondentCode: true, respondentGroup: true },
        },
        session: { select: { id: true, sessionCode: true, groupName: true, mode: true } },
      },
    }),
  ]);
  return ok({ items: items.map(mapResponseSummary), total, page, pageSize });
}


/** GET /api/admin/responses/[responseId] — full detail with every answer. */
export async function GET_RESPONSE(_request: NextRequest, { params }: ResponseContext) {
  await requireAdminApi();
  const { responseId } = await params;
  const record = await prisma.response.findUnique({
    where: { id: responseId },
    include: {
      survey: { select: { id: true, title: true, interviewMethod: true, interviewMode: true } },
      respondent: true,
      session: {
        select: { id: true, sessionCode: true, groupName: true, mode: true, notes: true },
      },
      answers: {
        include: {
          question: { select: { id: true, code: true, text: true, type: true, category: true } },
          likert: true,
        },
        orderBy: { createdAt: "asc" },
      },
      syncRecords: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!record) return ok({ response: null });
  return ok({
    response: mapResponseSummary({
      ...record,
      respondent: record.respondent
        ? {
            id: record.respondent.id,
            name: record.respondent.name,
            respondentCode: record.respondent.respondentCode,
            respondentGroup: record.respondent.respondentGroup,
          }
        : null,
    }),
    respondent: record.respondent,
    answers: record.answers,
    syncRecords: record.syncRecords,
  });
}

/** GET /api/admin/sessions — interview sessions incl. group sessions. */
export async function GET_SESSIONS(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const surveyId = url.searchParams.get("surveyId") ?? undefined;
  const mode = url.searchParams.get("mode") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const where = {
    ...(surveyId ? { surveyId } : {}),
    ...(mode ? { mode } : {}),
    ...(status ? { status } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.interviewSession.count({ where }),
    prisma.interviewSession.findMany({
      where,
      orderBy: { startedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        survey: { select: { id: true, title: true } },
        respondent: { select: { id: true, name: true, respondentCode: true } },
        members: true,
        recording: true,
        _count: { select: { responses: true, members: true } },
      },
    }),
  ]);
  return ok({ items: items.map(mapSessionRecord), total, page, pageSize });
}










/** GET /api/admin/qr — all QR tokens with survey context. */
export async function GET_QR(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const surveyId = url.searchParams.get("surveyId") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const tokens = await prisma.qRToken.findMany({
    where: {
      ...(surveyId ? { surveyId } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      survey: { select: { id: true, title: true, topic: true, status: true } },
      version: { select: { version: true } },
    },
  });
  return ok({ items: tokens.map((token) => mapQrTokenRecord(token)) });
}

/** POST /api/admin/qr — mint a QR token for a survey (Publish & Generate QR Code). */
export async function POST_QR(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, qrCreateSchema);
  const token = await createQrToken({
    surveyId: body.surveyId,
    createdById: user.id,
    label: body.label,
    language: body.language,
    expiresAt: body.expiresAt,
    versionId: body.versionId,
    settings: body.settings,
  });
  await logAudit({
    action: "QR_CREATED",
    entity: "QRToken",
    entityId: token.id,
    actorId: user.id,
    actorName: user.username,
    details: { surveyId: body.surveyId },
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  const url = publicSurveyUrl(token.token);
  const dataUrl = await qrDataUrl(url);
  return ok(
    {
      ...(await fullQr(token.id)),
      dataUrl,
      publicUrl: url,
    },
    { status: 201 },
  );
}

async function fullQr(id: string) {
  const token = await prisma.qRToken.findUnique({
    where: { id },
    include: {
      survey: { select: { id: true, title: true, topic: true, status: true } },
      version: { select: { version: true } },
    },
  });
  return mapQrTokenRecord(token!);
}


/** GET /api/admin/qr/[qrId] — token detail incl. a fresh QR image. */
export async function GET_QR_DETAIL(_request: NextRequest, { params }: QrContext) {
  await requireAdminApi();
  const { qrId } = await params;
  const token = await prisma.qRToken.findUnique({
    where: { id: qrId },
    include: {
      survey: { select: { id: true, title: true, topic: true, status: true } },
      version: { select: { version: true } },
    },
  });
  if (!token) return ok({ qr: null });
  const url = publicSurveyUrl(token.token);
  return ok({
    qr: mapQrTokenRecord(token),
    publicUrl: url,
    dataUrl: await qrDataUrl(url),
    svg: await qrSvg(url),
  });
}

/** PATCH /api/admin/qr/[qrId] — disable/enable/expire/rotate/relable. */
export async function PATCH_QR(request: NextRequest, { params }: QrContext) {
  const user = await requireAdminApi();
  const { qrId } = await params;
  const body = await readJson(request, qrUpdateSchema);

  const data: Record<string, unknown> = {};
  if (body.status) {
    data.status = body.status;
    if (body.status === "DISABLED") data.disabledAt = new Date();
  }
  if (body.label !== undefined) data.label = body.label;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt;
  if (body.regenerate || body.rotateToken) {
    data.token = generatePublicToken();
    data.scans = 0;
    data.responses = 0;
    data.completions = 0;
    data.lastScanAt = null;
    data.disabledAt = null;
    data.status = "ACTIVE";
  }

  const updated = await prisma.qRToken.update({ where: { id: qrId }, data });
  await logAudit({
    action: body.regenerate || body.rotateToken ? "QR_REGENERATED" : "QR_UPDATED",
    entity: "QRToken",
    entityId: qrId,
    actorId: user.id,
    actorName: user.username,
    details: body,
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });

  const url = publicSurveyUrl(updated.token);
  return ok({
    qr: await fullQr(updated.id),
    publicUrl: url,
    dataUrl: await qrDataUrl(url),
  });
}

/** DELETE /api/admin/qr/[qrId] — delete a token. */
export async function DELETE_QR(request: NextRequest, { params }: QrContext) {
  const user = await requireAdminApi();
  const { qrId } = await params;
  await prisma.qRToken.delete({ where: { id: qrId } });
  await logAudit({
    action: "QR_DELETED",
    entity: "QRToken",
    entityId: qrId,
    actorId: user.id,
    actorName: user.username,
    severity: "WARNING",
    details: null,
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok({ deleted: true });
}










/** GET /api/admin/analytics — filtered analytics payload (all charts + cards). */
export async function GET_ANALYTICS(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const filters = analyticsFilterQuerySchema.parse({
    surveyId: url.searchParams.get("surveyId") ?? undefined,
    respondentGroup: url.searchParams.get("respondentGroup") ?? undefined,
    interviewMethod: url.searchParams.get("method") ?? undefined,
    interviewMode: url.searchParams.get("mode") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    includeOffline: url.searchParams.get("includeOffline") ?? undefined,
  });

  const [base, questions] = await Promise.all([
    getSurveyAnalytics(filters),
    getQuestionAnalyticsDetail(filters, { includeText: true }),
  ]);

  return ok({
    ...base,
    questions,
    filters,
    generatedAt: new Date().toISOString(),
  });
}

/** GET /api/admin/analytics/unstructured — AI text analytics for open responses. */
export async function GET_UNSTRUCTURED(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const filters = analyticsFilterQuerySchema.parse({
    surveyId: url.searchParams.get("surveyId") ?? undefined,
    respondentGroup: url.searchParams.get("respondentGroup") ?? undefined,
    interviewMethod: url.searchParams.get("method") ?? undefined,
    interviewMode: url.searchParams.get("mode") ?? undefined,
    language: url.searchParams.get("language") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  const answers = await prisma.answer.findMany({
    where: {
      ...(filters.surveyId ? { surveyId: filters.surveyId } : {}),
      valueText: { not: null },
    },
    select: { valueText: true },
    take: 1500,
  });
  const texts = answers.map((a) => a.valueText ?? "").filter((t) => t.trim().length > 2);

  const survey = filters.surveyId
    ? await prisma.survey.findUnique({
        where: { id: filters.surveyId },
        select: { topic: true, stakeholder: true, language: true },
      })
    : null;

  const insights = await analyzeOpenEnded({
    texts,
    topic: survey?.topic ?? "Survey responses",
    stakeholder: survey?.stakeholder,
    language: survey?.language ?? filters.language ?? "en",
  });

  return ok({ ...insights, aiEnhanced: insights.aiEnhanced, count: texts.length });
}

/** GET /api/admin/analytics/facets — filter dropdown options. */
export async function GET_FACETS() {
  await requireAdminApi();
  const [surveys, groups, languages] = await Promise.all([
    prisma.survey.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, interviewMethod: true, interviewMode: true },
      take: 300,
    }),
    prisma.respondent.groupBy({ by: ["respondentGroup"], _count: { _all: true } }),
    prisma.response.groupBy({ by: ["language"], _count: { _all: true } }),
  ]);
  return ok({
    surveys,
    groups: groups.filter((g) => g.respondentGroup).map((g) => g.respondentGroup as string),
    languages: languages.map((l) => l.language),
  });
}









/** GET /api/admin/reports — saved reports list. */
export async function GET_REPORTS(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const surveyId = url.searchParams.get("surveyId") ?? undefined;
  const reportType = url.searchParams.get("reportType") ?? undefined;

  const where = {
    ...(surveyId ? { surveyId } : {}),
    ...(reportType ? { reportType } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        survey: { select: { id: true, title: true, topic: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);
  return ok({ items: items.map(mapReportRecord), total, page, pageSize });
}

/** POST /api/admin/reports — generate + persist a new report. */
export async function POST_REPORT(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, reportCreateSchema);
  const { report, content } = await generateAndSaveReport({
    surveyId: body.surveyId,
    reportType: body.reportType,
    title: body.title,
    generatedBy: user.fullName || user.username,
    createdById: user.id,
    filters: body.filters,
  });
  await logAudit({
    action: "REPORT_GENERATED",
    entity: "Report",
    entityId: report.id,
    actorId: user.id,
    actorName: user.username,
    details: { surveyId: body.surveyId, reportType: body.reportType },
    ip: getIp(request),
    userAgent: getUserAgent(request),
  });
  return ok({ report: mapReportRecord(report), content }, { status: 201 });
}


/** GET /api/admin/reports/[reportId] — saved report content (for preview/export). */
export async function GET_REPORT(_request: NextRequest, { params }: ReportContext) {
  await requireAdminApi();
  const { reportId } = await params;
  const record = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      survey: { select: { id: true, title: true, topic: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!record) return ok({ report: null, content: null });
  return ok({ report: mapReportRecord(record), content: parseReportContent(record.content) });
}

/** DELETE /api/admin/reports/[reportId] — remove a saved report. */
export async function DELETE_REPORT(_request: NextRequest, { params }: ReportContext) {
  const user = await requireAdminApi();
  const { reportId } = await params;
  await prisma.report.delete({ where: { id: reportId } });
  await logAudit({
    action: "REPORT_DELETED",
    entity: "Report",
    entityId: reportId,
    actorId: user.id,
    actorName: user.username,
    details: null,
  });
  return ok({ deleted: true });
}

/** POST /api/admin/reports/[reportId]/regenerate — rebuild from current data. */
export async function POST_REGENERATE_REPORT(_request: NextRequest, { params }: ReportContext) {
  const user = await requireAdminApi();
  const { reportId } = await params;
  const existing = await prisma.report.findUnique({ where: { id: reportId } });
  if (!existing) return ok({ report: null });
  const filters = existing.filters ? JSON.parse(existing.filters) : undefined;
  const { report, content } = await generateAndSaveReport({
    surveyId: existing.surveyId,
    reportType: existing.reportType as "SUMMARY" | "DETAILED" | "COMPARATIVE",
    title: existing.title,
    generatedBy: user.fullName || user.username,
    createdById: user.id,
    filters,
  });
  await prisma.report.delete({ where: { id: reportId } });
  await logAudit({
    action: "REPORT_REGENERATED",
    entity: "Report",
    entityId: report.id,
    actorId: user.id,
    actorName: user.username,
    details: { previousReportId: reportId },
  });
  return ok({ report: mapReportRecord(report), content });
}










/** GET /api/admin/sync — sync health, records and conflict queue. */
export async function GET_SYNC(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const status = url.searchParams.get("status") ?? undefined;
  const only = url.searchParams.get("only") ?? undefined;

  const where = {
    ...(status ? { status } : {}),
    ...(only === "conflicts" ? { status: "CONFLICT" } : {}),
    ...(only === "failed" ? { status: "FAILED" } : {}),
    ...(only === "pending" ? { status: "PENDING" } : {}),
  };

  const [records, counts, lastSync] = await Promise.all([
    prisma.syncRecord.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        survey: { select: { id: true, title: true } },
        response: { select: { id: true, submittedAt: true, source: true, answersCount: true } },
      },
    }),
    prisma.syncRecord.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.syncRecord.findFirst({
      where: { status: "SYNCED" },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const summary = {
    pending: counts.find((c) => c.status === "PENDING")?._count._all ?? 0,
    synced: counts.find((c) => c.status === "SYNCED")?._count._all ?? 0,
    failed: counts.find((c) => c.status === "FAILED")?._count._all ?? 0,
    conflicts: counts.find((c) => c.status === "CONFLICT")?._count._all ?? 0,
    lastSyncAt: lastSync?.updatedAt?.toISOString() ?? null,
  };

  return ok({ items: records.map(mapSyncRecordEntry), summary, page, pageSize });
}


/** POST /api/admin/sync/[syncId]/resolve — resolve a sync conflict. */
export async function POST_RESOLVE(request: NextRequest, { params }: SyncContext) {
  const user = await requireAdminApi();
  const { syncId } = await params;
  const body = await readJson(request, syncResolveSchema);

  const record = await prisma.syncRecord.findUnique({
    where: { id: syncId },
    include: { response: true },
  });
  if (!record) return ok({ resolved: false, message: "Sync record not found." });

  let responseUpdate: Record<string, unknown> = {};
  if (body.action === "ACCEPT_LOCAL" && body.localSnapshot) {
    responseUpdate = { syncStatus: "SYNCED", revision: { increment: 1 }, syncedAt: new Date() };
  } else if (body.action === "ACCEPT_SERVER") {
    responseUpdate = { syncStatus: "SYNCED", syncedAt: new Date() };
  }

  if (record.responseId && Object.keys(responseUpdate).length) {
    await prisma.response.update({
      where: { id: record.responseId },
      data: responseUpdate,
    });
  }

  const updated = await prisma.syncRecord.update({
    where: { id: syncId },
    data: {
      status: "SYNCED",
      resolution: body.action,
      resolvedAt: new Date(),
      message:
        body.action === "ACCEPT_LOCAL"
          ? "Conflict resolved: local (device) copy accepted as authoritative."
          : body.action === "ACCEPT_SERVER"
            ? "Conflict resolved: server copy retained."
            : "Conflict dismissed (no changes applied).",
      actorId: user.id,
    },
  });

  await logAudit({
    action: "SYNC_CONFLICT_RESOLVED",
    entity: "SyncRecord",
    entityId: syncId,
    actorId: user.id,
    actorName: user.username,
    details: { action: body.action, responseId: record.responseId },
  });

  return ok({
    resolved: true,
    record: mapSyncRecordEntry({ ...updated, survey: null, response: null }),
  });
}









/** GET /api/admin/audit — audit trail. */
export async function GET_AUDIT(request: NextRequest) {
  await requireAdminApi();
  const url = new URL(request.url);
  const { page, pageSize } = paginationSchema.parse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  const action = url.searchParams.get("action") ?? undefined;
  const entity = url.searchParams.get("entity") ?? undefined;
  const severity = url.searchParams.get("severity") ?? undefined;

  const where = {
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
    ...(severity ? { severity } : {}),
  };
  const [total, items] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok({ items: items.map(mapAuditEntry), total, page, pageSize });
}

/** GET /api/admin/settings — app settings + AI provider status. */
export async function GET_APP_SETTINGS() {
  await requireAdminApi();
  const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  const adminCount = await prisma.user.count();
  const hasKey = Boolean(process.env.OPENAI_API_KEY);
  return ok({
    settings: settings.map((s) => ({
      key: s.key,
      value: s.value,
      updatedAt: s.updatedAt.toISOString(),
    })),
    ai: {
      provider: hasKey ? "openai" : "offline-engine",
      model: process.env.AI_MODEL ?? "gpt-4o-mini",
      keyConfigured: hasKey,
      translationSupport: hasKey ? "full" : "phrase-assisted",
    },
    database: {
      provider: (process.env.DATABASE_URL ?? "").startsWith("postgres")
        ? "postgresql"
        : "sqlite",
    },
    adminCount,
  });
}

/** PATCH /api/admin/settings — upsert app settings (audited). */
export async function PATCH_APP_SETTINGS(request: NextRequest) {
  const user = await requireAdminApi();
  const body = await readJson(request, appSettingsSchema);
  for (const entry of body.settings) {
    await prisma.appSetting.upsert({
      where: { key: entry.key },
      create: { key: entry.key, value: entry.value, updatedById: user.id },
      update: { value: entry.value, updatedById: user.id },
    });
  }
  await logAudit({
    action: "SETTINGS_UPDATED",
    entity: "AppSetting",
    entityId: null,
    actorId: user.id,
    actorName: user.username,
    details: body,
  });
  const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
  return ok({ settings: settings.map((s) => ({ key: s.key, value: s.value })) });
}











/**
 * GET /api/public/survey/[token] — prepared survey for respondents.
 * Exposes only public fields; no admin credentials or internal database data.
 */
export async function GET_SURVEY(request: NextRequest, { params }: Context) {
  try {
    const { token } = await params;
    enforceRateLimit(
      `survey:${getIp(request)}`,
      120,
      60_000,
      "Too many requests. Please slow down.",
    );
    const payload = await buildPublicSurveyPayload(token);
    return ok(payload);
  } catch (error) {
    return fail(error);
  }
}

/**
 * POST /api/public/survey/[token] — offline cache check for the PWA.
 * Returns a compact flag set so the SW can decide cache freshness.
 */
export async function HEAD_SURVEY(request: NextRequest, { params }: Context) {
  try {
    const { token } = await params;
    const qr = await resolvePublicToken(token);
    let questionCount = 0;
    if (qr.versionId) {
      const version = await prisma.surveyVersion.findUnique({
        where: { id: qr.versionId },
        select: { snapshot: true },
      });
      const snapshot = parseVersionSnapshot(version?.snapshot ?? null);
      questionCount = snapshot?.questions?.length ?? 0;
    }
    if (!questionCount) {
      questionCount = await prisma.surveyQuestion.count({ where: { surveyId: qr.surveyId } });
    }
    return ok({
      available: true,
      surveyId: qr.surveyId,
      version: qr.version?.version ?? qr.survey.version,
      questionCount,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return ok({ available: false, code: error.code ?? "UNAVAILABLE" });
    }
    return fail(error);
  }
}







/**
 * POST /api/public/submit — one online (or replayed offline) response.
 * Idempotent via clientResponseId; conflict-safe by content hash.
 */
export async function POST_SUBMIT(request: NextRequest) {
  try {
    const ip = getIp(request);
    enforceRateLimit(
      `submit:${ip}`,
      60,
      60_000,
      "Too many submissions from this device. Please wait a moment.",
    );
    const body = await readJson(request, responseSubmitSchema);
    const result = await savePublicResponse(body, {
      ip,
      userAgent: getUserAgent(request),
    });
    return ok(result, { status: result.status === "CREATED" ? 201 : 200 });
  } catch (error) {
    return fail(error);
  }
}

/**
 * POST /api/public/sync — batch synchronization of queued offline responses.
 * Each item is processed independently; duplicates and conflicts are reported.
 */
export async function POST_SYNC(request: NextRequest) {
  try {
    const ip = getIp(request);
    enforceRateLimit(
      `sync:${ip}`,
      30,
      60_000,
      "Too many sync attempts. Please wait a moment.",
    );
    const body = await readJson(request, syncBatchSchema);
    const result = await saveResponseBatch(body.responses, {
      ip,
      userAgent: getUserAgent(request),
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}







/**
 * POST /api/public/follow-up — Semi-Structured / Unstructured follow-up probe.
 * Generates a context-aware question from the respondent's actual answer.
 */
export async function POST_FOLLOW_UP(request: NextRequest) {
  try {
    enforceRateLimit(
      `followup:${getIp(request)}`,
      40,
      60_000,
      "Too many follow-up requests. Please wait a moment.",
    );
    const body = await readJson(request, publicFollowUpSchema);
    const qr = await resolvePublicToken(body.token);

    const question = await prisma.surveyQuestion.findFirst({
      where: { id: body.questionId, surveyId: qr.surveyId },
      select: { id: true, text: true },
    });
    if (!question) {
      throw new ApiError("That question does not belong to this survey.", 400, {
        code: "QUESTION_MISMATCH",
      });
    }

    const result = await generateFollowUp({
      topic: qr.survey.topic,
      stakeholder: qr.survey.stakeholder,
      question: question.text,
      answer: body.answer,
      interviewMethod: qr.survey.interviewMethod,
      language: body.language ?? qr.survey.language,
      askedFollowUps: body.askedFollowUps ?? [],
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}









const bodySchema = z.object({
  token: z.string().min(8).max(120),
  language: z.string().min(2).max(12),
  surveyId: z.string().min(4).optional(),
});

/**
 * GET /api/public/translate?token=...&language=tl — translations for the
 * prepared question set (responses stay linked to the original question IDs).
 */
export async function GET_PUBLIC_TRANSLATIONS(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token") ?? "";
    const language = url.searchParams.get("language") ?? "en";
    if (token.length < 8) throw new ApiError("A valid survey token is required.", 400);
    if (!language || language.length < 2) throw new ApiError("A target language is required.", 400);

    const qr = await resolvePublicToken(token);
    const questions = await prisma.surveyQuestion.findMany({
      where: { surveyId: qr.surveyId },
      orderBy: { order: "asc" },
      select: { id: true, text: true },
    });

    const stored = await loadQuestionTranslations(questions.map((q) => q.id));

    // Ensure translations exist for the requested language (AI or offline engine).
    const missing = questions.filter((q) => !stored[q.id]?.[language]);
    if (missing.length) {
      const { translations, warnings } = await translateBatch(
        missing.map((q) => q.text),
        language,
        `Survey topic: ${qr.survey.topic}. Stakeholder: ${qr.survey.stakeholder}. Keep meaning and Likert ordering intact.`,
      );
      void warnings;
      for (let index = 0; index < missing.length; index++) {
        const question = missing[index];
        const text = translations[index] ?? question.text;
        const existing = await prisma.questionTranslation.findFirst({
          where: { questionId: question.id, language },
          select: { id: true },
        });
        if (existing) {
          await prisma.questionTranslation.update({ where: { id: existing.id }, data: { text } });
        } else {
          await prisma.questionTranslation.create({
            data: { questionId: question.id, language, text, source: 'AUTO' },
          });
        }
      }
      missing.forEach((question, index) => {
        stored[question.id] = stored[question.id] ?? {};
        stored[question.id][language] = translations[index] ?? question.text;
      });
    }

    const surveyFields = await translateSurveyFields(
      {
        title: qr.survey.title,
        topic: qr.survey.topic,
        description: qr.survey.description,
      },
      language,
    );

    return ok({
      language,
      survey: surveyFields,
      questions: stored,
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * POST /api/public/translate — on-demand translation of an arbitrary string
 * (used for dynamically generated AI follow-up questions).
 */
export async function POST_PUBLIC_TRANSLATE(request: NextRequest) {
  try {
    const body = await readJson(
      request,
      z.object({
        token: z.string().min(8).max(120),
        language: z.string().min(2).max(12),
        texts: z.array(z.string().min(1).max(600)).min(1).max(20),
      }),
    );
    enforceRateLimit(`translate:${getIp(request)}`, 60, 60_000, "Too many translation requests.");
    await resolvePublicToken(body.token);
    const { translations, provider, warnings } = await translateBatch(
      body.texts,
      body.language,
      "Interview follow-up question.",
    );
    return ok({ translations, provider, warnings });
  } catch (error) {
    return fail(error);
  }
}









/** POST /api/admin/surveys/[id]/translations — generate + store translations. */
export async function POST_TRANSLATIONS(request: NextRequest, { params }: Context) {
  const user = await requireAdminApi();
  const { id } = await params;
  const body = await readJson(request, translateSurveySchema);
  const result = await saveTranslations(id, body.languages, {
    includeQuestions: body.includeQuestions !== false,
  });
  return ok({
    ...result,
    actor: user.username,
  });
}

/** GET /api/admin/surveys/[id]/translations — current stored translations. */
export async function GET_TRANSLATIONS(_request: NextRequest, { params }: Context) {
  await requireAdminApi();
  const { id } = await params;
  const [surveyTranslations, questionTranslations] = await Promise.all([
    prisma.surveyTranslation.findMany({ where: { surveyId: id } }),
    prisma.questionTranslation.findMany({
      where: { question: { surveyId: id } },
      select: { questionId: true, language: true, text: true, source: true },
    }),
  ]);
  return ok({ surveyTranslations, questionTranslations });
}