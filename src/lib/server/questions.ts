/**
 * Question-level helpers shared by admin and public flows: DTO mapping, Likert
 * configuration, randomization (Admin-prepared questions only) and version snapshots.
 */
import { likertLabels } from "@/lib/likert";
import { likertScaleFor, QUESTION_TYPE_VALUES } from "@/lib/constants";
import { parseQuestionOptions } from "@/lib/settings";
import { seededShuffle, safeJsonParse } from "@/lib/utils";
import type { PublicQuestion, QuestionDraft, SurveySettings } from "@/lib/types";

export type QuestionRecord = {
  id: string;
  surveyId: string;
  bankItemId: string | null;
  createdById: string | null;
  versionId: string | null;
  order: number;
  code: string | null;
  text: string;
  originalText: string | null;
  helpText: string | null;
  type: string;
  category: string | null;
  tags: string | null;
  difficulty: string | null;
  relevanceScore: number | null;
  isRequired: boolean;
  options: string | null;
  likertScale: number | null;
  aiGenerated: boolean;
  aiSource: string | null;
  allowFollowUp: boolean;
  isCore: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Admin DTO (includes everything the survey builder UI needs). */
export function mapQuestionToDraft(question: QuestionRecord): QuestionDraft & { id: string } {
  return {
    id: question.id,
    code: question.code ?? undefined,
    text: question.text,
    originalText: question.originalText,
    helpText: question.helpText,
    type: question.type,
    category: question.category,
    tags: question.tags ? question.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    difficulty: question.difficulty,
    relevanceScore: question.relevanceScore,
    isRequired: question.isRequired,
    options: parseQuestionOptions(question.options),
    likertScale: question.likertScale,
    aiGenerated: question.aiGenerated,
    aiSource: question.aiSource,
    allowFollowUp: question.allowFollowUp,
    isCore: question.isCore,
    order: question.order,
  };
}

export function resolveLikertLabelsFor(
  question: { type: string; likertScale: number | null; options: string | null },
  language: string,
  settings: SurveySettings,
): string[] | null {
  if (question.type !== "LIKERT_5" && question.type !== "LIKERT_7") return null;
  const scale = likertScaleFor(question.type, question.likertScale);
  const custom = parseQuestionOptions(question.options);
  if (custom?.length === scale) return custom.map((o) => o.label);
  const settingsLabels = settings.likert.customLabels;
  if (settingsLabels?.length === scale) return settingsLabels;
  return likertLabels(scale, language);
}

/** Public DTO — never exposes admin/internal fields. */
export function mapQuestionToPublic(
  question: QuestionRecord,
  options: {
    language: string;
    settings: SurveySettings;
    translations?: Record<string, string>;
    allowFollowUp: boolean;
  },
): PublicQuestion {
  const effectiveText = options.translations?.[options.language] ?? question.text;
  const labels = resolveLikertLabelsFor(question, options.language, options.settings);
  const optionList = labels
    ? labels.map((label, index) => ({ label, value: label, score: index + 1 }))
    : question.type === "RATING"
      ? [1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: String(n), score: n }))
      : parseQuestionOptions(question.options);

  return {
    id: question.id,
    code: question.code ?? `Q${question.order}`,
    order: question.order,
    text: effectiveText,
    helpText: question.helpText,
    type: question.type,
    category: question.category,
    isRequired: question.isRequired,
    options: optionList,
    likertScale:
      question.likertScale ?? (question.type === "LIKERT_5" ? 5 : question.type === "LIKERT_7" ? 7 : null),
    likertLabels: labels,
    allowFollowUp: options.allowFollowUp && question.allowFollowUp,
    isFollowUpEnabled: options.allowFollowUp,
    translations: options.translations ?? {},
  };
}

/**
 * Applies the administrator's randomization configuration.
 * IMPORTANT: only the prepared question set is used — never new/unrelated questions.
 */
export function applyRandomization(
  questions: PublicQuestion[],
  settings: SurveySettings,
  seed: string,
): { questions: PublicQuestion[]; strategy: string } {
  const config = settings.randomize;
  if (!config.enabled) return { questions, strategy: "NONE" };

  if (config.strategy === "SHUFFLE_ORDER") {
    return { questions: seededShuffle(questions, seed), strategy: "SHUFFLE_ORDER" };
  }

  if (config.strategy === "RANDOM_SUBSET") {
    const size = Math.max(1, Math.min(questions.length, config.subsetSize));
    const shuffled = seededShuffle(questions, seed);
    return {
      questions: shuffled.slice(0, size).sort((a, b) => a.order - b.order),
      strategy: `RANDOM_SUBSET(${size})`,
    };
  }

  // RANDOM_SET_ASSIGNMENT: split the prepared set into N balanced variants and
  // deterministically assign this respondent to one of them using the seed.
  const setCount = Math.max(1, Math.min(10, config.setCount));
  const shuffled = seededShuffle(questions, `${seed}-sets`);
  const buckets: PublicQuestion[][] = Array.from({ length: setCount }, () => []);
  shuffled.forEach((question, index) => {
    buckets[index % setCount].push(question);
  });
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003;
  const assigned = buckets[hash % setCount].slice().sort((a, b) => a.order - b.order);
  return { questions: assigned, strategy: `RANDOM_SET_ASSIGNMENT(set ${(hash % setCount) + 1}/${setCount})` };
}

export type VersionSnapshot = {
  questions: QuestionRecord[];
  capturedAt: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  topic: string;
  title: string;
  description: string;
  stakeholder: string;
  settings: string | null;
};

/** Builds the immutable snapshot stored when a survey version is published. */
export function buildVersionSnapshot(
  survey: {
    title: string;
    description: string;
    stakeholder: string;
    topic: string;
    interviewMethod: string;
    interviewMode: string;
    language: string;
    settings: string | null;
  },
  questions: QuestionRecord[],
): VersionSnapshot {
  return {
    title: survey.title,
    description: survey.description,
    stakeholder: survey.stakeholder,
    topic: survey.topic,
    interviewMethod: survey.interviewMethod,
    interviewMode: survey.interviewMode,
    language: survey.language,
    settings: survey.settings,
    capturedAt: new Date().toISOString(),
    questions: questions.map((q) => ({ ...q })),
  };
}

export function parseVersionSnapshot(snapshot: string | null): VersionSnapshot | null {
  const parsed = safeJsonParse<VersionSnapshot | null>(snapshot, null);
  if (!parsed || !Array.isArray(parsed.questions)) return null;
  return parsed;
}

/** Restores question records from a stored version snapshot. */
export function questionsFromSnapshot(snapshot: VersionSnapshot): QuestionRecord[] {
  return snapshot.questions.map((q) => ({ ...q }));
}

export function isKnownQuestionType(type: string) {
  return (QUESTION_TYPE_VALUES as readonly string[]).includes(type);
}