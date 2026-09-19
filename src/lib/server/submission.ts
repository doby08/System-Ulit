/**
 * Response submission + idempotent synchronization service.
 *
 * Guarantees:
 *  - every response carries a client-generated UUID (clientResponseId) → retries are safe
 *  - identical retries return DUPLICATE (nothing is written twice)
 *  - conflicting content under the same id is never silently overwritten → CONFLICT record
 *  - answers always link to survey, survey version, question, respondent and session
 */
import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveLikertScore } from "@/lib/likert";
import { parseSurveySettings } from "@/lib/settings";
import { classifySentiment, scoreText, tokenize } from "@/lib/ai/lexicon";
import { incrementQrCompletions, incrementQrResponses, resolvePublicToken } from "@/lib/server/qr";
import { parseVersionSnapshot, type QuestionRecord } from "@/lib/server/questions";
import type { AnswerPayload, ResponseSubmitPayload, SyncBatchResult, SubmitResult } from "@/lib/types";

export function generateCode(prefix: string, length = 6) {
  return `${prefix}-${randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length)
    .toUpperCase()}`;
}

export function computeContentHash(payload: ResponseSubmitPayload): string {
  const canonical = JSON.stringify({
    token: payload.token,
    answers: [...payload.answers]
      .sort((a, b) =>
        `${a.questionId}${a.parentQuestionId ?? ""}`.localeCompare(
          `${b.questionId}${b.parentQuestionId ?? ""}`,
        ),
      )
      .map((answer) => ({
        q: answer.questionId,
        t: answer.valueText ?? null,
        n: answer.valueNumber ?? null,
        o: answer.valueOption ?? null,
        os: (answer.valueOptions ?? []).slice().sort(),
        b: answer.valueBool ?? null,
        f: answer.isFollowUp ?? false,
        p: answer.parentQuestionId ?? null,
      })),
    respondent: payload.respondent ?? null,
    session: payload.session?.sessionCode ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 40);
}

export function normalizeAnswerValues(answer: AnswerPayload) {
  return {
    valueText: answer.valueText ? answer.valueText.toString().slice(0, 6000) : null,
    valueNumber:
      typeof answer.valueNumber === "number" && Number.isFinite(answer.valueNumber)
        ? answer.valueNumber
        : null,
    valueOption: answer.valueOption ? answer.valueOption.toString().slice(0, 400) : null,
    valueOptions: answer.valueOptions?.length
      ? answer.valueOptions.join(" | ").slice(0, 2000)
      : null,
    valueBool: typeof answer.valueBool === "boolean" ? answer.valueBool : null,
  };
}

/** Upserts the respondent record (keeps one central respondent registry). */
export async function resolveRespondent(
  tx: Prisma.TransactionClient,
  payload: ResponseSubmitPayload,
  surveyId: string,
) {
  const supplied = payload.respondent ?? {};
  const code = supplied.respondentCode?.trim() || generateCode("RSP");

  const existing = await tx.respondent.findUnique({ where: { respondentCode: code } });
  if (existing) {
    return tx.respondent.update({
      where: { id: existing.id },
      data: {
        name: supplied.name?.trim() || existing.name,
        ageGroup: supplied.ageGroup?.trim() || existing.ageGroup,
        gender: supplied.gender?.trim() || existing.gender,
        location: supplied.location?.trim() || existing.location,
        organization: supplied.organization?.trim() || existing.organization,
        email: supplied.email?.trim() || existing.email,
        phone: supplied.phone?.trim() || existing.phone,
        respondentGroup: supplied.respondentGroup?.trim() || existing.respondentGroup,
        language: supplied.language ?? payload.language ?? existing.language,
        device: supplied.device ?? payload.device ?? existing.device,
        surveyId: existing.surveyId ?? surveyId,
      },
      select: { id: true, respondentCode: true },
    });
  }

  return tx.respondent.create({
    data: {
      respondentCode: code,
      name: supplied.name?.trim() || null,
      ageGroup: supplied.ageGroup?.trim() || null,
      gender: supplied.gender?.trim() || null,
      location: supplied.location?.trim() || null,
      organization: supplied.organization?.trim() || null,
      email: supplied.email?.trim() || null,
      phone: supplied.phone?.trim() || null,
      respondentGroup: supplied.respondentGroup?.trim() || null,
      language: supplied.language ?? payload.language ?? null,
      device: supplied.device ?? payload.device ?? null,
      surveyId,
    },
    select: { id: true, respondentCode: true },
  });
}

/** Creates or resumes an interview session (individual, group or random mode). */
export async function resolveInterviewSession(
  tx: Prisma.TransactionClient,
  payload: ResponseSubmitPayload,
  context: { surveyId: string; versionId: string | null; mode: string; respondentId: string },
) {
  const sessionInput = payload.session ?? {};
  const code = sessionInput.sessionCode?.trim();

  let session = code
    ? await tx.interviewSession.findUnique({ where: { sessionCode: code } })
    : await tx.interviewSession.findFirst({
        where: {
          surveyId: context.surveyId,
          respondentId: context.respondentId,
          status: "IN_PROGRESS",
        },
        orderBy: { startedAt: "desc" },
      });

  if (!session) {
    session = await tx.interviewSession.create({
      data: {
        sessionCode: code || generateCode("SES"),
        surveyId: context.surveyId,
        versionId: context.versionId,
        respondentId: context.respondentId,
        mode: context.mode,
        groupName: sessionInput.groupName?.trim() || null,
        notes: sessionInput.notes?.trim() || null,
        status: sessionInput.status ?? "IN_PROGRESS",
        device: payload.device ?? null,
        networkState: payload.networkState ?? null,
        language: payload.language ?? null,
        completedAt: payload.status === "COMPLETE" ? new Date() : null,
      },
    });
  } else {
    session = await tx.interviewSession.update({
      where: { id: session.id },
      data: {
        groupName: sessionInput.groupName?.trim() || session.groupName,
        notes: sessionInput.notes?.trim() || session.notes,
        status: sessionInput.status ?? session.status,
        networkState: payload.networkState ?? session.networkState,
        device: payload.device ?? session.device,
        versionId: session.versionId ?? context.versionId,
        completedAt:
          (sessionInput.status === "COMPLETED" || sessionInput.status === "COMPLETE") &&
          !session.completedAt
            ? new Date()
            : session.completedAt,
      },
    });
  }

  // Group members (Group interview mode)
  const members = sessionInput.members ?? [];
  if (members.length) {
    await tx.groupMember.deleteMany({ where: { sessionId: session.id } });
    await tx.groupMember.createMany({
      data: members.map((member) => ({
        sessionId: session.id,
        surveyId: context.surveyId,
        name: member.name.slice(0, 160),
        role: member.role?.slice(0, 80) ?? null,
        answersCount: member.answersCount ?? 0,
      })),
    });
  }

  // Optional session recording metadata (captured only with explicit browser permission)
  const recording = sessionInput.recording;
  if (recording) {
    const common = {
      status: recording.status ?? "STOPPED",
      mimeType: recording.mimeType ?? null,
      durationSec: recording.durationSec ?? 0,
      sizeBytes: recording.sizeBytes ?? 0,
      storageRef: recording.storageRef ?? null,
    };
    await tx.sessionRecording.upsert({
      where: { sessionId: session.id },
      create: {
        sessionId: session.id,
        kind: recording.kind ?? "AUDIO",
        ...common,
        stoppedAt: new Date(),
      },
      update: { ...common, stoppedAt: new Date() },
    });
  }

  return session;
}

/** Loads the exact question set a token points at (version snapshot first). */
export async function resolveTokenQuestionSet(token: string) {
  const qr = await resolvePublicToken(token);
  let questions: QuestionRecord[] = [];
  let source: "VERSION" | "LIVE" = "LIVE";

  if (qr.versionId) {
    const version = await prisma.surveyVersion.findUnique({
      where: { id: qr.versionId },
      select: { snapshot: true },
    });
    const snapshot = parseVersionSnapshot(version?.snapshot ?? null);
    if (snapshot?.questions?.length) {
      questions = snapshot.questions;
      source = "VERSION";
    }
  }

  if (!questions.length) {
    const live = await prisma.surveyQuestion.findMany({
      where: { surveyId: qr.surveyId },
      orderBy: { order: "asc" },
    });
    questions = live as unknown as QuestionRecord[];
  }

  return {
    qr,
    questions,
    source,
    settings: parseSurveySettings(
      qr.survey.settings,
      qr.survey.interviewMethod,
      qr.survey.interviewMode,
    ),
  };
}

/** Sentiment/keyword enrichment for open-text answers (feeds AI analytics). */
export function enrichOpenText(text: string | null) {
  if (!text || text.trim().length < 3) {
    return { aiSentiment: null, aiKeywords: null, aiThemes: null };
  }
  const { score } = scoreText(text);
  const keywords = tokenize(text).slice(0, 8);
  return {
    aiSentiment: classifySentiment(score),
    aiKeywords: keywords.join(", ") || null,
    aiThemes: null,
  };
}

/** Converts a stored Likert answer into a LikertResponse row (score/percentage). */
export function buildLikertRow(params: {
  answerId: string;
  surveyId: string;
  questionId: string;
  respondentId: string;
  sessionId: string;
  type: string;
  likertScale: number | null;
  options: string | null;
  value: { valueOption: string | null; valueText: string | null; valueNumber: number | null };
}) {
  const scale = params.type === "LIKERT_7" ? 7 : 5;
  let labels: string[] | undefined;
  try {
    const raw = params.options ? JSON.parse(params.options) : null;
    if (Array.isArray(raw) && raw.length === scale) {
      labels = raw.map((entry) =>
        typeof entry === "string" ? entry : String((entry as { label?: unknown })?.label ?? ""),
      );
    }
  } catch {
    labels = undefined;
  }

  const raw =
    params.value.valueOption ??
    params.value.valueText ??
    (params.value.valueNumber !== null ? String(params.value.valueNumber) : null);
  const resolved = resolveLikertScore(raw, scale, labels);
  if (!resolved) return null;

  return {
    answerId: params.answerId,
    surveyId: params.surveyId,
    questionId: params.questionId,
    respondentId: params.respondentId,
    sessionId: params.sessionId,
    scale,
    score: resolved.score,
    label: raw ?? String(resolved.score),
    normalized: resolved.normalized,
    isPositive: resolved.isPositive,
  };
}

/**
 * Idempotency guard: returns a SubmitResult when the response already exists
 * (duplicate or conflict) and writes the corresponding sync record.
 */
export async function checkDuplicateOrConflict(
  payload: ResponseSubmitPayload,
  context: { surveyId: string; contentHash: string },
): Promise<SubmitResult | null> {
  const existing = await prisma.response.findUnique({
    where: { clientResponseId: payload.clientResponseId },
    include: { _count: { select: { answers: true } } },
  });
  if (!existing) return null;

  if (existing.contentHash === context.contentHash) {
    await prisma.syncRecord.create({
      data: {
        surveyId: context.surveyId,
        responseId: existing.id,
        clientResponseId: payload.clientResponseId,
        deviceId: payload.deviceId ?? payload.device ?? null,
        direction: "UP",
        status: "SYNCED",
        attempt: 1,
        message: "Duplicate submission ignored (idempotent synchronization).",
      },
    });
    return {
      clientResponseId: payload.clientResponseId,
      serverResponseId: existing.id,
      status: "DUPLICATE",
      answersSaved: existing._count.answers,
      message: "This response was already saved on the server — no duplicate was created.",
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.syncRecord.create({
      data: {
        surveyId: context.surveyId,
        responseId: existing.id,
        clientResponseId: payload.clientResponseId,
        deviceId: payload.deviceId ?? payload.device ?? null,
        direction: "UP",
        status: "CONFLICT",
        attempt: 1,
        message:
          "A different version of this response already exists on the server. No data was overwritten — administrator review required.",
        localSnapshot: JSON.stringify(payload).slice(0, 20000),
        serverSnapshot: JSON.stringify({
          contentHash: existing.contentHash,
          revision: existing.revision,
          submittedAt: existing.submittedAt.toISOString(),
          answers: existing._count.answers,
        }),
      },
    });
    await tx.response.update({ where: { id: existing.id }, data: { syncStatus: "CONFLICT" } });
  });

  return {
    clientResponseId: payload.clientResponseId,
    serverResponseId: existing.id,
    status: "CONFLICT",
    answersSaved: existing._count.answers,
    message:
      "A conflicting copy of this response already exists on the server. The server copy was preserved and the conflict was flagged for review.",
    conflictOf: existing.id,
  };
}

/** Persists a new response with all of its answers, Likert scores and links. */
export async function writeResponseCore(
  payload: ResponseSubmitPayload,
  context: {
    surveyId: string;
    qrId: string;
    versionId: string | null;
    interviewMode: string;
    defaultLanguage: string;
    questions: QuestionRecord[];
    contentHash: string;
  },
) {
  const questionMap = new Map(context.questions.map((question) => [question.id, question]));
  const validAnswers = payload.answers.filter((answer) => questionMap.has(answer.questionId));
  if (!validAnswers.length) {
    throw new Error("None of the submitted answers match the prepared questions for this survey.");
  }

  const totalQuestions = context.questions.length || validAnswers.length;
  const answeredCount = new Set(validAnswers.map((a) => a.questionId)).size;
  const completionRate = Number(((answeredCount / totalQuestions) * 100).toFixed(2));

  return prisma.$transaction(async (tx) => {
    const respondent = await resolveRespondent(tx, payload, context.surveyId);
    const session = await resolveInterviewSession(tx, payload, {
      surveyId: context.surveyId,
      versionId: context.versionId,
      mode: context.interviewMode,
      respondentId: respondent.id,
    });

    const response = await tx.response.create({
      data: {
        clientResponseId: payload.clientResponseId,
        surveyId: context.surveyId,
        versionId: context.versionId,
        sessionId: session.id,
        respondentId: respondent.id,
        qrTokenId: context.qrId,
        language: payload.language ?? context.defaultLanguage,
        status: payload.status ?? "COMPLETE",
        source: payload.source ?? "ONLINE",
        deviceId: payload.deviceId ?? null,
        device: payload.device ?? null,
        networkState: payload.networkState ?? "ONLINE",
        answersCount: answeredCount,
        totalQuestions,
        completionRate,
        durationSec: payload.durationSec ?? 0,
        revision: payload.revision ?? 1,
        contentHash: context.contentHash,
        syncStatus: "SYNCED",
        capturedAt: payload.capturedAt ? new Date(payload.capturedAt) : new Date(),
        submittedAt: new Date(),
        syncedAt: new Date(),
      },
    });

    for (const answer of validAnswers) {
      const question = questionMap.get(answer.questionId)!;
      const questionOptions = (question as unknown as { options: string | null }).options ?? null;
      const values = normalizeAnswerValues(answer);
      const enrichment = enrichOpenText(values.valueText);

      const created = await tx.answer.create({
        data: {
          responseId: response.id,
          questionId: question.id,
          surveyId: context.surveyId,
          respondentId: respondent.id,
          sessionId: session.id,
          ...values,
          isFollowUp: answer.isFollowUp ?? false,
          followUpSource: answer.isFollowUp ? answer.followUpPrompt ?? "AI" : null,
          aiSentiment: enrichment.aiSentiment,
          aiKeywords: enrichment.aiKeywords,
          aiThemes: enrichment.aiThemes,
          answeredAt: answer.answeredAt ? new Date(answer.answeredAt) : new Date(),
        },
      });

      if (question.type === "LIKERT_5" || question.type === "LIKERT_7") {
        const likert = buildLikertRow({
          answerId: created.id,
          surveyId: context.surveyId,
          questionId: question.id,
          respondentId: respondent.id,
          sessionId: session.id,
          type: question.type,
          likertScale: question.likertScale,
          options: questionOptions,
          value: values,
        });
        if (likert) await tx.likertResponse.create({ data: likert });
      }
    }

    await tx.syncRecord.create({
      data: {
        surveyId: context.surveyId,
        responseId: response.id,
        clientResponseId: payload.clientResponseId,
        deviceId: payload.deviceId ?? payload.device ?? null,
        direction: "UP",
        status: "SYNCED",
        attempt: payload.source === "OFFLINE_SYNC" ? 1 : 0,
        message:
          payload.source === "OFFLINE_SYNC"
            ? "Offline response synchronized successfully."
            : "Response submitted online.",
      },
    });

    return { response, sessionId: session.id, respondentId: respondent.id, answeredCount };
  });
}

/**
 * Saves one response — used by both the online submit endpoint and offline sync.
 * Idempotent and conflict-safe.
 */
export async function savePublicResponse(
  payload: ResponseSubmitPayload,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<SubmitResult> {
  void meta;
  const { qr, questions, settings } = await resolveTokenQuestionSet(payload.token);
  void settings;
  const surveyId = qr.surveyId;
  const versionId = qr.versionId ?? null;
  const contentHash = payload.contentHash ?? computeContentHash(payload);

  const duplicate = await checkDuplicateOrConflict(payload, { surveyId, contentHash });
  if (duplicate) return duplicate;

  const { response, answeredCount } = await writeResponseCore(payload, {
    surveyId,
    qrId: qr.id,
    versionId,
    interviewMode: qr.survey.interviewMode,
    defaultLanguage: qr.survey.language,
    questions,
    contentHash,
  });

  // Non-critical QR bookkeeping (outside the transaction)
  await incrementQrResponses(qr.id);
  if ((payload.status ?? "COMPLETE") === "COMPLETE") await incrementQrCompletions(qr.id);

  return {
    clientResponseId: payload.clientResponseId,
    serverResponseId: response.id,
    status: "CREATED",
    answersSaved: answeredCount,
    message:
      payload.source === "OFFLINE_SYNC"
        ? "Offline response synchronized to the central database."
        : "Response saved to the central database.",
  };
}

/** Syncs a queue of offline responses; each item is isolated so one failure cannot block others. */
export async function saveResponseBatch(
  payloads: ResponseSubmitPayload[],
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<SyncBatchResult> {
  const results: SubmitResult[] = [];
  let synced = 0;
  let duplicates = 0;
  let conflicts = 0;
  let failed = 0;

  for (const payload of payloads) {
    try {
      const result = await savePublicResponse({ ...payload, source: "OFFLINE_SYNC" }, meta);
      results.push(result);
      if (result.status === "CREATED" || result.status === "UPDATED") synced += 1;
      else if (result.status === "DUPLICATE") duplicates += 1;
      else conflicts += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Sync failed";
      results.push({
        clientResponseId: payload.clientResponseId,
        serverResponseId: "",
        status: "CONFLICT",
        answersSaved: 0,
        message,
      });
      try {
        await prisma.syncRecord.create({
          data: {
            clientResponseId: payload.clientResponseId,
            deviceId: payload.deviceId ?? null,
            direction: "UP",
            status: "FAILED",
            attempt: payload.revision ?? 1,
            message: message.slice(0, 900),
          },
        });
      } catch {
        // ignored — the client will retry and re-report
      }
    }
  }

  return {
    synced,
    duplicates,
    conflicts,
    failed,
    results,
    lastSyncAt: new Date().toISOString(),
  };
}