/** Builds the public respondent payload for one QR token (no secrets attached). */
import { prisma } from "@/lib/prisma";
import { parseSurveySettings } from "@/lib/settings";
import { shouldAllowFollowUp } from "@/lib/settings";
import { parseVersionSnapshot, questionsFromSnapshot, mapQuestionToPublic } from "@/lib/server/questions";
import { recordScan, resolvePublicToken } from "@/lib/server/qr";
import { loadQuestionTranslations, loadSurveyTranslations } from "@/lib/server/surveys";
import { resolveProvider } from "@/lib/ai/provider";
import type { PublicSurveyPayload } from "@/lib/types";

export async function buildPublicSurveyPayload(
  token: string,
  options: { trackScan?: boolean } = {},
): Promise<PublicSurveyPayload> {
  const qr = await resolvePublicToken(token);
  const surveyRecord = qr.survey;

  let questions = await prisma.surveyQuestion.findMany({
    where: { surveyId: qr.surveyId },
    orderBy: { order: "asc" },
  });
  if (qr.versionId) {
    const version = await prisma.surveyVersion.findUnique({
      where: { id: qr.versionId },
      select: { snapshot: true },
    });
    const snapshot = parseVersionSnapshot(version?.snapshot ?? null);
    if (snapshot?.questions?.length) {
      questions = questionsFromSnapshot(snapshot);
    }
  }

  const settings = parseSurveySettings(
    surveyRecord.settings,
    surveyRecord.interviewMethod,
    surveyRecord.interviewMode,
  );

  const translationsByQuestion = await loadQuestionTranslations(questions.map((q) => q.id));
  const surveyTranslations = await loadSurveyTranslations(surveyRecord.id);

  const allowFollowUp = shouldAllowFollowUp(surveyRecord.interviewMethod, settings);
  const publicQuestions = questions.map((question, index) =>
    mapQuestionToPublic(question, {
      language: surveyRecord.language,
      settings,
      translations: translationsByQuestion[question.id],
      allowFollowUp,
    }),
  );
  void options;

  if (options.trackScan !== false) await recordScan(qr.id);

  const availableLanguages = Array.from(
    new Set([surveyRecord.language, ...Object.keys(surveyTranslations)]),
  );

  return {
    token,
    surveyId: surveyRecord.id,
    versionId: qr.versionId,
    version: qr.version?.version ?? surveyRecord.version,
    title: surveyTranslations[surveyRecord.language]?.title ?? surveyRecord.title,
    topic: surveyTranslations[surveyRecord.language]?.topic ?? surveyRecord.topic,
    description:
      surveyTranslations[surveyRecord.language]?.description ?? surveyRecord.description,
    stakeholder: surveyRecord.stakeholder,
    interviewMethod: surveyRecord.interviewMethod,
    interviewMode: surveyRecord.interviewMode,
    language: surveyRecord.language,
    availableLanguages,
    status: surveyRecord.status,
    expiresAt: surveyRecord.expiresAt?.toISOString() ?? null,
    qrStatus: qr.status,
    settings,
    questions: publicQuestions.map((q, index) => ({ ...q, order: index + 1 })),
    totalQuestions: publicQuestions.length,
    requireAuthentication: settings.requireAuthentication,
    thankYouMessage: settings.thankYouMessage,
    aiProvider: resolveProvider(),
    serverTime: new Date().toISOString(),
  };
}