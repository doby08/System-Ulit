/**
 * Question generation orchestrator.
 * Tries OpenAI (server-side env key) with structured-JSON validation, and always
 * falls back to the built-in offline engine so the feature works without a key.
 */
import { z } from "zod";
import { aiModel, chatJson, resolveProvider } from "@/lib/ai/provider";
import {
  generateQuestionsOffline,
  generateSingleQuestionOffline,
  type GenerateOptions,
} from "@/lib/ai/local-engine";
import { MAX_QUESTIONS_PER_SURVEY, QUESTION_TYPE_VALUES, languageLabel } from "@/lib/constants";
import { parseTopic } from "@/lib/ai/frames";
import { SIMPLE_TAGALOG_STYLE_GUIDE, englishLeaks, looksLikeTaglish } from "@/lib/ai/tagalog";
import type { GeneratedQuestion, GeneratedQuestionSet, QuestionOption } from "@/lib/types";

const optionSchema = z.union([
  z.string(),
  z.object({
    label: z.string(),
    value: z.string().optional(),
    score: z.number().optional(),
  }),
]);

const aiResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(5).max(600),
        type: z.string().optional(),
        category: z.string().optional(),
        difficulty: z.string().optional(),
        tags: z.array(z.string()).max(8).optional(),
        options: z.array(optionSchema).max(12).optional(),
        relevanceScore: z.number().min(0).max(100).optional(),
        isRequired: z.boolean().optional(),
        helpText: z.string().max(400).optional(),
        likertScale: z.union([z.literal(5), z.literal(7)]).optional(),
      }),
    )
    .min(1)
    .max(MAX_QUESTIONS_PER_SURVEY),
});

type AiResponse = z.infer<typeof aiResponseSchema>;

function normalizeType(raw?: string, likertScale?: number | null): string {
  const value = (raw ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (QUESTION_TYPE_VALUES.includes(value as (typeof QUESTION_TYPE_VALUES)[number])) return value;
  if (value.includes("LIKERT")) return likertScale === 7 ? "LIKERT_7" : "LIKERT_5";
  if (value.includes("RATING") || value.includes("SCALE") || value.includes("NPS")) return "RATING";
  if (value.includes("YES") || value.includes("BOOLEAN")) return "YES_NO";
  if (value.includes("MULTI") && value.includes("SELECT")) return "MULTI_SELECT";
  if (value.includes("CHOICE") || value.includes("OPTION")) return "MULTIPLE_CHOICE";
  if (value.includes("OPEN") || value.includes("ESSAY") || value.includes("LONG")) return "LONG_TEXT";
  if (value.includes("NUMBER") || value.includes("NUMERIC")) return "NUMBER";
  if (value.includes("DATE")) return "DATE";
  return "SHORT_TEXT";
}

function normalizeOptions(options?: (string | { label: string; value?: string; score?: number })[]) {
  if (!options?.length) return null;
  const normalized: QuestionOption[] = [];
  options.forEach((option, index) => {
    if (typeof option === "string") {
      const label = option.trim();
      if (label) normalized.push({ label, value: label, score: index + 1 });
      return;
    }
    const label = option.label?.trim();
    if (!label) return;
    normalized.push({
      label,
      value: option.value?.trim() || label,
      score: typeof option.score === "number" ? option.score : index + 1,
    });
  });
  return normalized.length ? normalized : null;
}

function normalizeDifficulty(raw?: string): "EASY" | "MEDIUM" | "HARD" {
  const value = (raw ?? "").toUpperCase();
  if (value.startsWith("E")) return "EASY";
  if (value.startsWith("H")) return "HARD";
  return "MEDIUM";
}

/** Converts a validated AI row into the internal question shape. */
function toGeneratedQuestion(
  row: AiResponse["questions"][number],
  index: number,
  language: string,
): GeneratedQuestion {
  const type = normalizeType(row.type, row.likertScale ?? null);
  const likertScale = type === "LIKERT_5" ? 5 : type === "LIKERT_7" ? 7 : null;
  return {
    text: row.text.trim(),
    originalText: language === "en" ? row.text.trim() : null,
    code: `Q${index + 1}`,
    order: index + 1,
    type,
    category: row.category?.trim() || "General",
    tags: (row.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8),
    difficulty: normalizeDifficulty(row.difficulty),
    relevanceScore: typeof row.relevanceScore === "number" ? Math.round(row.relevanceScore) : 85,
    isRequired: row.isRequired ?? true,
    options: type === "YES_NO" ? normalizeOptions(["Yes", "No"]) : normalizeOptions(row.options),
    likertScale,
    helpText: row.helpText?.trim() || null,
    aiGenerated: true,
    aiSource: "openai",
    allowFollowUp: false,
    isCore: true,
  };
}

/**
 * Taglish safety net for AI output.
 *
 * Even with explicit instructions the model occasionally returns partly-English Tagalog
 * ("Gaano ka satisfied sa services?"). Any generated question (or help text) that leaks
 * English words is replaced with the equivalent NATIVE Tagalog wording from the offline
 * engine, so a Tagalog survey can never be published with Taglish — the administrator
 * is told exactly which items were rewritten.
 */
function enforcePureTagalog(questions: GeneratedQuestion[], options: GenerateOptions) {
  if (options.language !== "tl" || !questions.length) return { questions, warnings: [] as string[] };

  const fallbacks = generateQuestionsOffline({
    ...options,
    count: MAX_QUESTIONS_PER_SURVEY,
  }).filter((candidate) => !looksLikeTaglish(candidate.text));
  const used = new Set<string>();
  const warnings: string[] = [];

  const pure = questions.map((question, index) => {
    const textLeaks = englishLeaks(question.text);
    if (!textLeaks.length) {
      if (question.helpText && looksLikeTaglish(question.helpText)) {
        warnings.push(
          `Question ${index + 1}: the Taglish help text was removed (${englishLeaks(question.helpText).join(", ")}).`,
        );
        return { ...question, helpText: null };
      }
      return question;
    }

    const fallback = fallbacks.find(
      (candidate) => candidate.type === question.type && !used.has(candidate.text),
    );
    if (!fallback) {
      warnings.push(
        `Question ${index + 1} still contains English words (${textLeaks.join(", ")}); please review it manually.`,
      );
      return question;
    }

    used.add(fallback.text);
    warnings.push(
      `Question ${index + 1} was Taglish (${textLeaks.join(", ")}) and was replaced with pure Tagalog wording.`,
    );
    return {
      ...question,
      text: fallback.text,
      options: fallback.options ?? question.options,
      likertScale: fallback.likertScale ?? question.likertScale,
      helpText: fallback.helpText ?? null,
    };
  });

  return { questions: pure, warnings };
}

function tagalogLanguageLine(language: string, label: string) {
  const base = `Write every question in ${label} (language code: ${language}). Translate meaning and intent naturally \u2014 never translate word-by-word \u2014 and keep organisational or proper nouns unchanged.`;
  if (language === "tl") {
    return `${base} The entire output must be monolingual Filipino: ${SIMPLE_TAGALOG_STYLE_GUIDE} This applies to the question text, the answer options, the Likert labels and the help text.`;
  }
  return base;
}

function methodGuidance(method: string) {
  if (method === "STRUCTURED") {
    return "The interview is STRUCTURED: use closed question types (LIKERT_5, LIKERT_7, RATING, YES_NO, MULTIPLE_CHOICE, MULTI_SELECT) with at most two SHORT_TEXT items. Questions must be fixed, neutral, non-leading and directly comparable across respondents.";
  }
  if (method === "SEMI_STRUCTURED") {
    return "The interview is SEMI-STRUCTURED: mix core closed questions (Likert/Rating/Yes-No/Choice) with a few open probes (SHORT_TEXT/LONG_TEXT) that invite elaboration and can be followed up by the interviewer.";
  }
  return "The interview is UNSTRUCTURED: write conversational, open-ended prompts (mostly LONG_TEXT) that encourage a narrative answer, while keeping 3-6 anchoring scale items so responses can still be quantified.";
}

function systemPrompt(options: GenerateOptions) {
  return [
    "You are a senior research instrument designer for a university/institutional survey platform.",
    "Produce survey/interview questions that are neutral, unambiguous, culturally appropriate and free of leading language.",
    "Return STRICT JSON only, matching this shape:",
    '{"questions":[{"text":"string","type":"LIKERT_5|LIKERT_7|RATING|YES_NO|MULTIPLE_CHOICE|MULTI_SELECT|SHORT_TEXT|LONG_TEXT|NUMBER|DATE","category":"string","difficulty":"EASY|MEDIUM|HARD","tags":["string"],"options":["string"],"relevanceScore":0-100,"isRequired":true,"helpText":"string","likertScale":5}]}',
    methodGuidance(options.interviewMethod),
    `Interview mode: ${options.interviewMode}.`,
    tagalogLanguageLine(options.language, languageLabel(options.language)),
    "Cover these dimensions where relevant: satisfaction, service quality, accessibility, communication, staff support, facilities, digital experience, process efficiency, awareness, trust, improvement and recommendation.",
    "Questions must be answerable by the stated stakeholder group and must reference the given topic explicitly.",
  ].join("\n");
}

function userPrompt(options: GenerateOptions) {
  const ctx = parseTopic(options.topic, options.stakeholder);
  return [
    `Topic: ${options.topic}`,
    `Core subject being evaluated: ${ctx.subject}`,
    `Stakeholder / respondent type: ${options.stakeholder}`,
    `Interview method: ${options.interviewMethod}`,
    `Interview mode: ${options.interviewMode}`,
    `Language: ${languageLabel(options.language)} (${options.language})`,
    options.difficulty ? `Preferred difficulty: ${options.difficulty}` : "",
    options.questionTypes?.length ? `Allowed question types: ${options.questionTypes.join(", ")}` : "",
    `Generate exactly ${Math.min(options.count, MAX_QUESTIONS_PER_SURVEY)} unique questions (never exceed ${MAX_QUESTIONS_PER_SURVEY}).`,
    "Do not include the topic name as a question. Do not number the questions in the text.",
  ]
    .filter(Boolean)
    .join("\n");
}

export type GenerateResult = GeneratedQuestionSet & { fallbackReason?: string };

/** Generates a validated question set, with automatic offline fallback. */
export async function generateQuestionSet(options: GenerateOptions): Promise<GenerateResult> {
  const count = Math.max(1, Math.min(MAX_QUESTIONS_PER_SURVEY, options.count));
  const provider = resolveProvider();

  if (provider === "openai") {
    const result = await chatJson(
      {
        system: systemPrompt({ ...options, count }),
        user: userPrompt({ ...options, count }),
        temperature: options.interviewMethod === "UNSTRUCTURED" ? 0.85 : 0.6,
        maxTokens: Math.min(6000, 160 * count + 400),
      },
      aiResponseSchema,
    );

    if (result.ok) {
      const seen = new Set<string>();
      const questions: GeneratedQuestion[] = [];
      for (const row of result.data.questions) {
        const key = row.text.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        questions.push(toGeneratedQuestion(row, questions.length, options.language));
        if (questions.length >= count) break;
      }
      const warnings: string[] = [];
      // Tagalog output is validated and repaired before it reaches the builder.
      const purity = enforcePureTagalog(questions, { ...options, count });
      warnings.push(...purity.warnings);
      questions.splice(0, questions.length, ...purity.questions);
      if (questions.length && questions.length < count) {
        warnings.push(
          `AI returned ${questions.length} of ${count} requested questions; the offline engine completed the set.`,
        );
        for (const candidate of generateQuestionsOffline({ ...options, count })) {
          if (questions.length >= count) break;
          if (seen.has(candidate.text.toLowerCase())) continue;
          seen.add(candidate.text.toLowerCase());
          questions.push(candidate);
        }
      }
      if (questions.length) {
        return {
          provider: "openai",
          model: result.model,
          topic: options.topic,
          language: options.language,
          interviewMethod: options.interviewMethod,
          questions: questions.map((q, i) => ({ ...q, code: `Q${i + 1}`, order: i + 1 })),
          warnings,
        };
      }
    }

    const failureReason = result.ok ? "AI returned no usable questions." : result.error;
    return {
      provider: "offline-engine",
      model: aiModel(),
      topic: options.topic,
      language: options.language,
      interviewMethod: options.interviewMethod,
      questions: generateQuestionsOffline({ ...options, count }),
      fallbackReason: failureReason,
      warnings: [
        `AI generation was unavailable (${failureReason}). The built-in offline question engine produced the questions instead.`,
      ],
    };
  }

  return {
    provider: "offline-engine",
    topic: options.topic,
    language: options.language,
    interviewMethod: options.interviewMethod,
    questions: generateQuestionsOffline({ ...options, count }),
    warnings: [
      "OPENAI_API_KEY is not configured — questions were produced by the built-in offline engine. Add a key to .env to enable live AI generation.",
    ],
  };
}

/** Regenerates a single question (used by the “Regenerate” action on a question row). */
export async function regenerateQuestion(
  options: GenerateOptions & { exclude: string[] },
): Promise<GeneratedQuestion | null> {
  const provider = resolveProvider();
  const exclude = new Set(options.exclude.map((t) => t.trim().toLowerCase()));

  if (provider === "openai") {
    const result = await chatJson(
      {
        system: systemPrompt({ ...options, count: 1 }),
        user: [
          userPrompt({ ...options, count: 1 }),
          "Generate exactly ONE alternative question that is clearly different from these existing questions:",
          options.exclude.slice(0, 40).map((t, i) => `${i + 1}. ${t}`).join("\n"),
        ].join("\n"),
        temperature: 0.9,
        maxTokens: 700,
      },
      aiResponseSchema,
    );
    if (result.ok) {
      const row = result.data.questions.find((q) => !exclude.has(q.text.trim().toLowerCase()));
      if (row) {
        const candidate = toGeneratedQuestion(row, 0, options.language);
        return enforcePureTagalog([candidate], { ...options, count: 1 }).questions[0] ?? candidate;
      }
    }
  }

  return generateSingleQuestionOffline({ ...options, count: 1 });
}