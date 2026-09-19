/**
 * Built-in offline AI engine — deterministic, context-aware question generation.
 *
 * Used when OPENAI_API_KEY is not configured or the AI call fails. It is a real
 * generator (not a stub): it parses the prepared topic, selects frames by interview
 * method and mode, balances categories, assigns difficulty/relevance/options/Likert
 * scales, applies phrase-assisted translation and emits validated question objects.
 */
import {
  QUESTION_FRAMES,
  interpolate,
  parseTopic,
  toConversationalPrompt,
  type QuestionFrame,
} from "@/lib/ai/frames";
import { phraseTranslate } from "@/lib/ai/translate-dictionary";
import { likertLabels } from "@/lib/likert";
import type { GeneratedQuestion, QuestionOption } from "@/lib/types";
import { MAX_QUESTIONS_PER_SURVEY } from "@/lib/constants";
import { seededShuffle } from "@/lib/utils";

export type GenerateOptions = {
  topic: string;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  count: number;
  difficulty?: string | null;
  questionTypes?: string[] | null;
  seed?: string;
  customLikertLabels?: string[] | null;
};

const OPEN_TYPES = new Set(["LONG_TEXT", "SHORT_TEXT"]);
const CLOSED_TYPES = new Set([
  "LIKERT_5",
  "LIKERT_7",
  "RATING",
  "YES_NO",
  "MULTIPLE_CHOICE",
  "MULTI_SELECT",
]);

/** Relevance heuristic: method fit + interaction importance + difficulty ease. */
function relevanceFor(frame: QuestionFrame, interviewMethod: string, interviewMode: string) {
  let score = 62;
  if (frame.category === "Satisfaction") score += 18;
  if (frame.category === "Service Quality") score += 14;
  if (frame.category === "Improvement") score += 16;
  if (frame.tags.includes("core")) score += 8;
  if (interviewMethod === "STRUCTURED" && CLOSED_TYPES.has(frame.type)) score += 12;
  if (interviewMethod === "STRUCTURED" && OPEN_TYPES.has(frame.type)) score -= 12;
  if (interviewMethod === "UNSTRUCTURED" && OPEN_TYPES.has(frame.type)) score += 16;
  if (interviewMethod === "UNSTRUCTURED" && CLOSED_TYPES.has(frame.type)) score -= 8;
  if (interviewMethod === "SEMI_STRUCTURED" && CLOSED_TYPES.has(frame.type)) score += 6;
  if (interviewMode === "GROUP" && frame.type === "MULTI_SELECT") score += 4;
  if (interviewMode === "RANDOM" && frame.type === "LONG_TEXT") score -= 3;
  if (frame.difficulty === "EASY") score += 3;
  return Math.max(35, Math.min(99, score));
}

/** Ranks frames for the interview method, then round-robins by category for variety. */
function selectFrames(method: string, difficulty?: string | null) {
  const ranked = [...QUESTION_FRAMES].sort((a, b) => {
    const relDiff = relevanceFor(b, method, "INDIVIDUAL") - relevanceFor(a, method, "INDIVIDUAL");
    if (relDiff !== 0) return relDiff;
    if (difficulty && a.difficulty === difficulty) return -1;
    if (difficulty && b.difficulty === difficulty) return 1;
    return 0;
  });

  const byCategory = new Map<string, QuestionFrame[]>();
  for (const frame of ranked) {
    const list = byCategory.get(frame.category) ?? [];
    list.push(frame);
    byCategory.set(frame.category, list);
  }

  const ordered: QuestionFrame[] = [];
  const categories = [...byCategory.keys()];
  let index = 0;
  let added = true;
  while (added) {
    added = false;
    for (const category of categories) {
      const list = byCategory.get(category) ?? [];
      if (index < list.length) {
        ordered.push(list[index]);
        added = true;
      }
    }
    index += 1;
  }
  return ordered;
}

function buildOptions(frame: QuestionFrame): QuestionOption[] | null {
  if (!frame.options?.length) return null;
  return frame.options.map((label, index) => ({ label, value: label, score: index + 1 }));
}
/** Generates up to MAX_QUESTIONS_PER_SURVEY context-aware questions offline. */
export function generateQuestionsOffline(options: GenerateOptions): GeneratedQuestion[] {
  const { topic, stakeholder, interviewMethod, interviewMode, language, difficulty, questionTypes, seed, customLikertLabels } =
    options;

  const count = Math.max(1, Math.min(MAX_QUESTIONS_PER_SURVEY, Math.round(options.count || 10)));
  const ctx = parseTopic(topic, stakeholder);
  let frames = selectFrames(interviewMethod, difficulty);

  if (questionTypes?.length) {
    const allowed = new Set(questionTypes);
    const preferred = frames.filter((frame) => allowed.has(frame.type));
    if (preferred.length >= Math.min(count, 5)) frames = preferred;
  }

  // Random interview mode + stable seed keeps generated sets distinct but reproducible.
  if (interviewMode === "RANDOM" && seed) {
    frames = seededShuffle(frames, seed);
  }

  const seen = new Set<string>();
  const questions: GeneratedQuestion[] = [];

  for (const frame of frames) {
    if (questions.length >= count) break;
    let text = interpolate(frame.text, ctx);
    let type = frame.type;

    // Unstructured interviews lean conversational: most closed frames become open prompts.
    if (interviewMethod === "UNSTRUCTURED" && CLOSED_TYPES.has(type)) {
      if (questions.length < Math.ceil(count * 0.75)) {
        text = toConversationalPrompt(text, ctx);
        type = "LONG_TEXT";
      }
    }

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const translated = language && language !== "en" ? phraseTranslate(text, language) : null;
    const finalText = translated?.text ?? text;

    const likertScale = type === "LIKERT_5" ? 5 : type === "LIKERT_7" ? 7 : null;
    const options =
      type === "YES_NO"
        ? [
            { label: "Yes", value: "Yes", score: 1 },
            { label: "No", value: "No", score: 0 },
          ]
        : buildOptions(frame);

    questions.push({
      text: finalText,
      originalText: text,
      type,
      category: frame.category,
      tags: frame.tags,
      difficulty: frame.difficulty,
      relevanceScore: relevanceFor(frame, interviewMethod, interviewMode),
      isRequired: true,
      options,
      likertScale,
      helpText:
        likertScale && customLikertLabels?.length === likertScale
          ? customLikertLabels.join(" · ")
          : likertScale
            ? likertLabels(likertScale, "en").join(" · ")
            : null,
      aiGenerated: true,
      aiSource: "offline-engine",
      allowFollowUp: interviewMethod !== "STRUCTURED" && !OPEN_TYPES.has(type),
      isCore: true,
    });
  }

  return questions.map((question, index) => ({ ...question, code: `Q${index + 1}`, order: index + 1 }));
}

/** Generates a single question that is different from the excluded set. */
export function generateSingleQuestionOffline(
  options: GenerateOptions & { exclude?: string[] },
): GeneratedQuestion | null {
  const exclude = new Set((options.exclude ?? []).map((t) => t.toLowerCase().trim()));
  const candidates = generateQuestionsOffline({ ...options, count: MAX_QUESTIONS_PER_SURVEY });
  return candidates.find((candidate) => !exclude.has(candidate.text.toLowerCase().trim())) ?? null;
}

/** Rewrites a question with a different frame in the same topic context. */
export function regenerateQuestionTextOffline(
  text: string,
  options: Omit<GenerateOptions, "count"> & { exclude?: string[] },
): string {
  const generated = generateSingleQuestionOffline({
    ...options,
    count: 1,
    exclude: [...(options.exclude ?? []), text],
  });
  return generated?.text ?? text;
}