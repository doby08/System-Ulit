/**
 * Survey service — creation, editing, question management, versioning/publish,
 * translation storage and lifecycle operations. All mutations are audited.
 */
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/server/api";
import { logAudit } from "@/lib/server/auth";
import { parseSurveySettings, serializeQuestionOptions, serializeSurveySettings } from "@/lib/settings";
import {
  buildVersionSnapshot,
  mapQuestionToDraft,
  parseVersionSnapshot,
  type QuestionRecord,
} from "@/lib/server/questions";
import { translateBatch, translateSurveyFields } from "@/lib/ai/translate";
import { stringifyTags } from "@/lib/utils";
import { MAX_QUESTIONS_PER_SURVEY } from "@/lib/constants";
import { questionInputSchema } from "@/lib/server/validation";
import type { surveyCreateSchema, surveyUpdateSchema } from "@/lib/server/validation";
import type { SurveySettings } from "@/lib/types";

type SurveyCreateInput = z.infer<typeof surveyCreateSchema>;
type SurveyUpdateInput = z.infer<typeof surveyUpdateSchema>;
type QuestionInput = z.infer<typeof questionInputSchema>;

export type ActorMeta = { ip?: string | null; userAgent?: string | null };

type RawOption = { label: string; value?: string; score?: number };

/** Normalises validated option payloads into fully-populated QuestionOption objects. */
export function toQuestionOptions(options?: RawOption[] | null) {
  if (!options?.length) return null;
  return options.map((option, index) => ({
    label: option.label,
    value: option.value ?? option.label,
    score: typeof option.score === "number" ? option.score : index + 1,
  }));
}

function questionCreateData(
  input: QuestionInput,
  context: { surveyId: string; order: number; versionId?: string | null; createdById?: string | null },
) {
  const order = input.order ?? context.order;
  const type = input.type;
  return {
    surveyId: context.surveyId,
    versionId: context.versionId ?? null,
    order,
    code: input.code?.trim() || `Q${order}`,
    text: input.text.trim(),
    originalText: (input.originalText ?? input.text).trim(),
    helpText: input.helpText ?? null,
    type,
    category: input.category ?? null,
    tags: stringifyTags(input.tags),
    difficulty: input.difficulty ?? null,
    relevanceScore: input.relevanceScore ?? null,
    isRequired: input.isRequired ?? true,
    options: serializeQuestionOptions(toQuestionOptions(input.options)),
    likertScale: input.likertScale ?? (type === "LIKERT_5" ? 5 : type === "LIKERT_7" ? 7 : null),
    aiGenerated: input.aiGenerated ?? false,
    aiSource: input.aiSource ?? null,
    allowFollowUp: input.allowFollowUp ?? false,
    isCore: input.isCore ?? true,
    createdById: context.createdById ?? null,
  };
}

export async function getSurveyOr404(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { order: "asc" } },
      versions: { orderBy: { version: "desc" } },
      qrTokens: { orderBy: { createdAt: "desc" } },
      createdBy: { select: { id: true, fullName: true } },
      _count: { select: { responses: true, respondents: true, sessions: true, questions: true, qrTokens: true } },
    },
  });
  if (!survey) throw new ApiError("Survey not found.", 404, { code: "NOT_FOUND" });
  return survey;
}

/** Creates a survey (optionally with its prepared questions) as a draft. */
export async function createSurvey(userId: string, input: SurveyCreateInput, meta: ActorMeta = {}) {
  const settings = parseSurveySettings(input.settings ?? {}, input.interviewMethod, input.interviewMode);
  const questions = (input.questions ?? []).slice(0, MAX_QUESTIONS_PER_SURVEY);

  const survey = await prisma.survey.create({
    data: {
      title: input.title.trim(),
      topic: input.topic.trim(),
      description: input.description?.trim() ?? "",
      stakeholder: input.stakeholder.trim(),
      interviewMethod: input.interviewMethod,
      interviewMode: input.interviewMode,
      language: input.language,
      respondentGroup: input.respondentGroup ?? null,
      location: input.location ?? null,
      startsAt: input.startsAt ?? null,
      expiresAt: input.expiresAt ?? null,
      targetRespondents: input.targetRespondents ?? null,
      settings: serializeSurveySettings(settings),
      aiProvider: input.aiProvider ?? null,
      status: "DRAFT",
      version: 1,
      questionCount: questions.length,
      createdById: userId,
      questions: {
        create: questions.map((question, index) => {
          const { surveyId: _parentSupplied, ...data } = questionCreateData(question, {
            surveyId: "nested",
            order: index + 1,
            createdById: userId,
          });
          return data;
        }),
      },
    },
    include: { questions: { orderBy: { order: "asc" } }, createdBy: { select: { id: true, fullName: true } } },
  });

  await logAudit({
    action: "SURVEY_CREATED",
    entity: "Survey",
    entityId: survey.id,
    actorId: userId,
    details: { title: survey.title, method: survey.interviewMethod, mode: survey.interviewMode },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  if (input.publish) {
    await publishSurvey(userId, survey.id, { meta });
    return getSurveyOr404(survey.id);
  }
  return survey;
}

/**
 * Updates survey metadata and, when provided, replaces the prepared question set.
 * Editing an already-published survey bumps the version so running sessions stay intact.
 */
export async function updateSurvey(
  userId: string,
  surveyId: string,
  input: SurveyUpdateInput,
  meta: ActorMeta = {},
) {
  const existing = await getSurveyOr404(surveyId);

  const mergedMethod = input.interviewMethod ?? existing.interviewMethod;
  const mergedMode = input.interviewMode ?? existing.interviewMode;
  const settings = input.settings
    ? parseSurveySettings(
        { ...parseSurveySettings(existing.settings, mergedMethod, mergedMode), ...input.settings },
        mergedMethod,
        mergedMode,
      )
    : parseSurveySettings(existing.settings, mergedMethod, mergedMode);

  const questionsProvided = Array.isArray(input.questions);
  const wasPublished = existing.status === "PUBLISHED" || existing.publishedAt !== null;
  const shouldVersion = questionsProvided && wasPublished;
  const nextVersion = shouldVersion ? existing.version + 1 : existing.version;

  const updated = await prisma.$transaction(async (tx) => {
    if (questionsProvided) {
      const incoming = (input.questions ?? []).slice(0, MAX_QUESTIONS_PER_SURVEY);
      const incomingIds = incoming.map((q) => q.id).filter((id): id is string => Boolean(id));
      const existingVersionId = existing.questions[0]?.versionId ?? null;

      // Remove questions the admin deleted (answers cascade only for unreferenced rows).
      await tx.surveyQuestion.deleteMany({
        where: { surveyId, ...(incomingIds.length ? { id: { notIn: incomingIds } } : {}) },
      });

      for (let index = 0; index < incoming.length; index++) {
        const question = incoming[index];
        const order = index + 1;
        const data = questionCreateData(question, { surveyId, order, createdById: userId });
        if (question.id) {
          await tx.surveyQuestion.update({
            where: { id: question.id },
            data: { ...data, order, code: question.code?.trim() || `Q${order}` },
          });
        } else {
          await tx.surveyQuestion.create({
            data: {
              ...data,
              order,
              code: question.code?.trim() || `Q${order}`,
              versionId: shouldVersion ? null : existingVersionId,
            },
          });
        }
      }
    }

    return tx.survey.update({
      where: { id: surveyId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.topic !== undefined ? { topic: input.topic.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.stakeholder !== undefined ? { stakeholder: input.stakeholder.trim() } : {}),
        ...(input.interviewMethod !== undefined ? { interviewMethod: input.interviewMethod } : {}),
        ...(input.interviewMode !== undefined ? { interviewMode: input.interviewMode } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
        ...(input.respondentGroup !== undefined ? { respondentGroup: input.respondentGroup } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.startsAt !== undefined ? { startsAt: input.startsAt } : {}),
        ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
        ...(input.targetRespondents !== undefined
          ? { targetRespondents: input.targetRespondents }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.aiProvider !== undefined ? { aiProvider: input.aiProvider } : {}),
        settings: serializeSurveySettings(settings),
        ...(questionsProvided
          ? {
              questionCount: incomingCount(input.questions),
              version: nextVersion,
              ...(input.status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
            }
          : {}),
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        versions: { orderBy: { version: "desc" } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { responses: true, respondents: true, sessions: true, questions: true, qrTokens: true } },
      },
    });
  });

  await logAudit({
    action: "SURVEY_UPDATED",
    entity: "Survey",
    entityId: surveyId,
    actorId: userId,
    details: {
      questionsProvided,
      versioned: shouldVersion,
      version: updated.version,
      note: input.changeNote ?? null,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return updated;
}

function incomingCount(questions: QuestionInput[] | undefined) {
  return (questions ?? []).slice(0, MAX_QUESTIONS_PER_SURVEY).length;
}

/**
 * Publishes a survey: freezes the current question set as an immutable version,
 * stamps every question with that version id and returns the created version.
 * Existing respondents/sessions keep the version they started with.
 */
export async function publishSurvey(
  userId: string,
  surveyId: string,
  options: { meta?: ActorMeta; changeNote?: string | null; forceNewVersion?: boolean } = {},
) {
  const survey = await getSurveyOr404(surveyId);
  if (!survey.questions.length) {
    throw new ApiError("Add at least one question before publishing this survey.", 400, {
      code: "NO_QUESTIONS",
    });
  }
  if (survey.questions.length > MAX_QUESTIONS_PER_SURVEY) {
    throw new ApiError(
      `A survey can contain a maximum of ${MAX_QUESTIONS_PER_SURVEY} questions.`,
      400,
      { code: "TOO_MANY_QUESTIONS" },
    );
  }

  const alreadyPublished = survey.publishedAt !== null;
  const versionNumber =
    options.forceNewVersion || alreadyPublished ? survey.version + 1 : Math.max(1, survey.version);

  const result = await prisma.$transaction(async (tx) => {
    const snapshot = buildVersionSnapshot(
      {
        title: survey.title,
        description: survey.description,
        stakeholder: survey.stakeholder,
        topic: survey.topic,
        interviewMethod: survey.interviewMethod,
        interviewMode: survey.interviewMode,
        language: survey.language,
        settings: survey.settings,
      },
      survey.questions as unknown as QuestionRecord[],
    );

    const version = await tx.surveyVersion.create({
      data: {
        surveyId,
        version: versionNumber,
        title: survey.title,
        topic: survey.topic,
        description: survey.description,
        stakeholder: survey.stakeholder,
        interviewMethod: survey.interviewMethod,
        interviewMode: survey.interviewMode,
        language: survey.language,
        settings: survey.settings,
        snapshot: JSON.stringify(snapshot),
        changeNote:
          options.changeNote ?? (alreadyPublished ? "Question set updated" : "Initial publication"),
        publishedAt: new Date(),
        createdById: userId,
      },
    });

    await tx.surveyQuestion.updateMany({ where: { surveyId }, data: { versionId: version.id } });

    const updatedSurvey = await tx.survey.update({
      where: { id: surveyId },
      data: {
        status: "PUBLISHED",
        publishedAt: survey.publishedAt ?? new Date(),
        version: versionNumber,
        questionCount: survey.questions.length,
      },
      include: {
        questions: { orderBy: { order: "asc" } },
        versions: { orderBy: { version: "desc" } },
        qrTokens: { orderBy: { createdAt: "desc" } },
        createdBy: { select: { id: true, fullName: true } },
        _count: {
          select: { responses: true, respondents: true, sessions: true, questions: true, qrTokens: true },
        },
      },
    });

    return { survey: updatedSurvey, version };
  });

  await logAudit({
    action: "SURVEY_PUBLISHED",
    entity: "Survey",
    entityId: surveyId,
    actorId: userId,
    details: { version: versionNumber, questions: survey.questions.length },
    ip: options.meta?.ip,
    userAgent: options.meta?.userAgent,
  });

  return result;
}

/* -------------------------------------------------------------------------- */
/* Question-level operations (used by the builder UI)                          */
/* -------------------------------------------------------------------------- */
export async function addQuestion(userId: string, surveyId: string, input: QuestionInput) {
  await getSurveyOr404(surveyId);
  const count = await prisma.surveyQuestion.count({ where: { surveyId } });
  if (count >= MAX_QUESTIONS_PER_SURVEY) {
    throw new ApiError(`Maximum of ${MAX_QUESTIONS_PER_SURVEY} questions per survey reached.`, 400, {
      code: "TOO_MANY_QUESTIONS",
    });
  }
  const question = await prisma.surveyQuestion.create({
    data: questionCreateData(input, { surveyId, order: count + 1, createdById: userId }),
  });
  await prisma.survey.update({ where: { id: surveyId }, data: { questionCount: count + 1 } });
  return question;
}

/**
 * Persists an AI-generated question set INTO the survey (the builder's
 * "Generate Questions" action).
 *
 * Previously generation only returned questions to the client (and mirrored them
 * into the question bank), so a survey stayed empty, publishing was rejected with
 * NO_QUESTIONS and QR codes could not be published. This appends the generated
 * questions as real survey questions, respecting the per-survey maximum.
 *
 * Each row is re-validated through the shared question schema; invalid rows are
 * skipped (and reported) instead of failing the whole batch.
 */
export async function addGeneratedQuestions(
  userId: string,
  surveyId: string,
  questions: unknown[],
  meta: ActorMeta = {},
) {
  await getSurveyOr404(surveyId);
  const existing = await prisma.surveyQuestion.count({ where: { surveyId } });
  const remaining = Math.max(0, MAX_QUESTIONS_PER_SURVEY - existing);

  const valid: QuestionInput[] = [];
  for (const raw of questions.slice(0, remaining)) {
    const parsed = questionInputSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
  }

  if (!valid.length) {
    return {
      created: [] as Awaited<ReturnType<typeof prisma.surveyQuestion.create>>[],
      total: existing,
      skipped: questions.length,
      limitReached: remaining === 0,
    };
  }

  const created = await prisma.$transaction(
    valid.map((input, index) =>
      prisma.surveyQuestion.create({
        data: questionCreateData(input, {
          surveyId,
          order: existing + index + 1,
          createdById: userId,
        }),
      }),
    ),
  );

  await prisma.survey.update({
    where: { id: surveyId },
    data: { questionCount: existing + created.length },
  });

  await logAudit({
    action: "QUESTIONS_GENERATED",
    entity: "Survey",
    entityId: surveyId,
    actorId: userId,
    details: {
      created: created.length,
      skipped: questions.length - created.length,
      total: existing + created.length,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return {
    created,
    total: existing + created.length,
    skipped: questions.length - created.length,
    limitReached: remaining === 0,
  };
}

export async function updateQuestion(
  userId: string,
  questionId: string,
  input: Partial<QuestionInput>,
) {
  const existing = await prisma.surveyQuestion.findUnique({ where: { id: questionId } });
  if (!existing) throw new ApiError("Question not found.", 404, { code: "NOT_FOUND" });

  return prisma.surveyQuestion.update({
    where: { id: questionId },
    data: {
      ...(input.text !== undefined ? { text: input.text.trim() } : {}),
      ...(input.originalText !== undefined ? { originalText: input.originalText } : {}),
      ...(input.helpText !== undefined ? { helpText: input.helpText } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.tags !== undefined ? { tags: stringifyTags(input.tags) } : {}),
      ...(input.difficulty !== undefined ? { difficulty: input.difficulty } : {}),
      ...(input.relevanceScore !== undefined ? { relevanceScore: input.relevanceScore } : {}),
      ...(input.isRequired !== undefined ? { isRequired: input.isRequired } : {}),
      ...(input.options !== undefined
        ? { options: serializeQuestionOptions(toQuestionOptions(input.options)) }
        : {}),
      ...(input.likertScale !== undefined ? { likertScale: input.likertScale } : {}),
      ...(input.allowFollowUp !== undefined ? { allowFollowUp: input.allowFollowUp } : {}),
      ...(input.isCore !== undefined ? { isCore: input.isCore } : {}),
      ...(input.order !== undefined ? { order: input.order } : {}),
      ...(input.aiGenerated !== undefined ? { aiGenerated: input.aiGenerated } : {}),
      ...(input.aiSource !== undefined ? { aiSource: input.aiSource } : {}),
    },
  });
}

export async function deleteQuestion(questionId: string) {
  const existing = await prisma.surveyQuestion.findUnique({
    where: { id: questionId },
    include: { _count: { select: { answers: true } } },
  });
  if (!existing) throw new ApiError("Question not found.", 404, { code: "NOT_FOUND" });
  if (existing._count.answers > 0) {
    throw new ApiError(
      "This question already has recorded answers and cannot be deleted. Publish a new version instead.",
      409,
      { code: "QUESTION_HAS_ANSWERS" },
    );
  }
  await prisma.surveyQuestion.delete({ where: { id: questionId } });
  const remaining = await prisma.surveyQuestion.findMany({
    where: { surveyId: existing.surveyId },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await prisma.$transaction(
    remaining.map((question, index) =>
      prisma.surveyQuestion.update({
        where: { id: question.id },
        data: { order: index + 1, code: `Q${index + 1}` },
      }),
    ),
  );
  await prisma.survey.update({
    where: { id: existing.surveyId },
    data: { questionCount: remaining.length },
  });
  return { deleted: true, remaining: remaining.length };
}

export async function reorderQuestions(surveyId: string, order: { id: string; order: number }[]) {
  await prisma.$transaction(
    order.map((entry) =>
      prisma.surveyQuestion.update({ where: { id: entry.id }, data: { order: entry.order } }),
    ),
  );
  return prisma.surveyQuestion.findMany({ where: { surveyId }, orderBy: { order: "asc" } });
}

export async function duplicateQuestion(userId: string, questionId: string) {
  const existing = await prisma.surveyQuestion.findUnique({ where: { id: questionId } });
  if (!existing) throw new ApiError("Question not found.", 404, { code: "NOT_FOUND" });
  const count = await prisma.surveyQuestion.count({ where: { surveyId: existing.surveyId } });
  if (count >= MAX_QUESTIONS_PER_SURVEY) {
    throw new ApiError(`Maximum of ${MAX_QUESTIONS_PER_SURVEY} questions per survey reached.`, 400, {
      code: "TOO_MANY_QUESTIONS",
    });
  }
  const created = await prisma.surveyQuestion.create({
    data: {
      surveyId: existing.surveyId,
      versionId: existing.versionId,
      bankItemId: existing.bankItemId,
      order: count + 1,
      code: `Q${count + 1}`,
      text: existing.text,
      originalText: existing.originalText,
      helpText: existing.helpText,
      type: existing.type,
      category: existing.category,
      tags: existing.tags,
      difficulty: existing.difficulty,
      relevanceScore: existing.relevanceScore,
      isRequired: existing.isRequired,
      options: existing.options,
      likertScale: existing.likertScale,
      aiGenerated: existing.aiGenerated,
      aiSource: existing.aiSource,
      allowFollowUp: existing.allowFollowUp,
      isCore: existing.isCore,
      createdById: userId,
    },
  });
  await prisma.survey.update({
    where: { id: existing.surveyId },
    data: { questionCount: count + 1 },
  });
  return created;
}

/* -------------------------------------------------------------------------- */
/* Lifecycle operations                                                        */
/* -------------------------------------------------------------------------- */
export async function setSurveyStatus(
  userId: string,
  surveyId: string,
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED",
  meta: ActorMeta = {},
) {
  const survey = await getSurveyOr404(surveyId);
  const data: Record<string, unknown> = { status };
  if (status === "ARCHIVED") data.archivedAt = new Date();
  if (status === "PUBLISHED" && !survey.publishedAt) data.publishedAt = new Date();

  const updated = await prisma.survey.update({ where: { id: surveyId }, data });
  await logAudit({
    action: `SURVEY_${status}`,
    entity: "Survey",
    entityId: surveyId,
    actorId: userId,
    details: { from: survey.status, to: status },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return updated;
}

export async function deleteSurvey(
  userId: string,
  surveyId: string,
  options: { force?: boolean; meta?: ActorMeta } = {},
) {
  const survey = await getSurveyOr404(surveyId);
  const responseCount = survey._count.responses;
  if (responseCount > 0 && !options.force) {
    throw new ApiError(
      `This survey already has ${responseCount} recorded response(s). Archive it instead, or confirm permanent deletion.`,
      409,
      { code: "SURVEY_HAS_RESPONSES", details: { responseCount } },
    );
  }
  await prisma.survey.delete({ where: { id: surveyId } });
  await logAudit({
    action: "SURVEY_DELETED",
    entity: "Survey",
    entityId: surveyId,
    actorId: userId,
    severity: "WARNING",
    details: { title: survey.title, responses: responseCount, forced: Boolean(options.force) },
    ip: options.meta?.ip,
    userAgent: options.meta?.userAgent,
  });
  return { deleted: true };
}

export async function duplicateSurvey(userId: string, surveyId: string, meta: ActorMeta = {}) {
  const survey = await getSurveyOr404(surveyId);
  const copy = await prisma.survey.create({
    data: {
      title: `${survey.title} (Copy)`,
      topic: survey.topic,
      description: survey.description,
      stakeholder: survey.stakeholder,
      interviewMethod: survey.interviewMethod,
      interviewMode: survey.interviewMode,
      language: survey.language,
      respondentGroup: survey.respondentGroup,
      location: survey.location,
      expiresAt: survey.expiresAt,
      targetRespondents: survey.targetRespondents,
      settings: survey.settings,
      aiProvider: survey.aiProvider,
      status: "DRAFT",
      version: 1,
      questionCount: survey.questions.length,
      createdById: userId,
      questions: {
        create: survey.questions.map((question, index) => ({
          order: index + 1,
          code: `Q${index + 1}`,
          text: question.text,
          originalText: question.originalText,
          helpText: question.helpText,
          type: question.type,
          category: question.category,
          tags: question.tags,
          difficulty: question.difficulty,
          relevanceScore: question.relevanceScore,
          isRequired: question.isRequired,
          options: question.options,
          likertScale: question.likertScale,
          aiGenerated: question.aiGenerated,
          aiSource: question.aiSource,
          allowFollowUp: question.allowFollowUp,
          isCore: question.isCore,
          createdById: userId,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  await logAudit({
    action: "SURVEY_DUPLICATED",
    entity: "Survey",
    entityId: copy.id,
    actorId: userId,
    details: { sourceSurveyId: surveyId, title: copy.title },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return copy;
}

/* -------------------------------------------------------------------------- */
/* Multilingual persistence                                                    */
/* -------------------------------------------------------------------------- */
export async function saveTranslations(
  surveyId: string,
  languages: string[],
  options: { includeQuestions?: boolean } = {},
) {
  const survey = await getSurveyOr404(surveyId);
  const results: {
    language: string;
    provider: string;
    warnings: string[];
    questionTranslations: number;
  }[] = [];

  for (const language of languages) {
    if (!language || language === "en") continue;

    const fields = await translateSurveyFields(
      { title: survey.title, topic: survey.topic, description: survey.description },
      language,
    );

    const questionTranslations: { questionId: string; text: string }[] = [];
    let warnings = [...fields.warnings];
    let provider: string = fields.provider;

    if (options.includeQuestions !== false && survey.questions.length) {
      const {
        translations,
        provider: questionProvider,
        warnings: questionWarnings,
      } = await translateBatch(
        survey.questions.map((q) => q.text),
        language,
        `Survey topic: ${survey.topic}. Stakeholder: ${survey.stakeholder}. Keep meaning and Likert ordering intact.`,
      );
      warnings = warnings.concat(questionWarnings);
      provider = questionProvider;
      survey.questions.forEach((question, index) => {
        const text = translations[index];
        if (text) questionTranslations.push({ questionId: question.id, text });
      });

      for (const entry of questionTranslations) {
        const existing = await prisma.questionTranslation.findFirst({
          where: { questionId: entry.questionId, language },
          select: { id: true },
        });
        if (existing) {
          await prisma.questionTranslation.update({
            where: { id: existing.id },
            data: { text: entry.text, source: provider === "openai" ? "AI" : "OFFLINE_ENGINE" },
          });
        } else {
          await prisma.questionTranslation.create({
            data: {
              questionId: entry.questionId,
              language,
              text: entry.text,
              source: provider === "openai" ? "AI" : "OFFLINE_ENGINE",
            },
          });
        }
      }
    }

    await prisma.surveyTranslation.upsert({
      where: { surveyId_language: { surveyId, language } },
      create: {
        surveyId,
        language,
        title: fields.title,
        topic: fields.topic,
        description: fields.description,
        source: provider === "openai" ? "AI" : "OFFLINE_ENGINE",
      },
      update: {
        title: fields.title,
        topic: fields.topic,
        description: fields.description,
        source: provider === "openai" ? "AI" : "OFFLINE_ENGINE",
      },
    });

    results.push({
      language,
      provider,
      warnings,
      questionTranslations: questionTranslations.length,
    });
  }

  return { languages: results };
}

/** Loads question translations keyed by question id → language → text. */
export async function loadQuestionTranslations(questionIds: string[]) {
  if (!questionIds.length) return {} as Record<string, Record<string, string>>;
  const rows = await prisma.questionTranslation.findMany({
    where: { questionId: { in: questionIds } },
    select: { questionId: true, language: true, text: true },
  });
  const map: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    if (!row.questionId) continue;
    map[row.questionId] = map[row.questionId] ?? {};
    map[row.questionId][row.language] = row.text;
  }
  return map;
}

/** Loads survey-level translations keyed by language. */
export async function loadSurveyTranslations(surveyId: string) {
  const rows = await prisma.surveyTranslation.findMany({ where: { surveyId } });
  const map: Record<string, { title: string; topic: string; description: string }> = {};
  for (const row of rows) {
    map[row.language] = { title: row.title, topic: row.topic, description: row.description };
  }
  return map;
}