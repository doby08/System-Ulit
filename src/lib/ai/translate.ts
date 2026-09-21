/**
 * Context-aware translation service.
 * OpenAI path = full meaning-preserving translation (never word-by-word).
 * Offline path = phrase + domain-word dictionary (see translate-dictionary.ts), so
 * multilingual surveys keep working without an API key.
 */
import { z } from "zod";
import { chatJson, resolveProvider } from "@/lib/ai/provider";
import { PHRASE_RULES, phraseTranslate } from "@/lib/ai/translate-dictionary";
import { languageLabel } from "@/lib/constants";
import { SIMPLE_TAGALOG_STYLE_GUIDE } from "@/lib/ai/tagalog";

export type TranslationProvider = "openai" | "offline-engine";

export type TranslateResult = {
  text: string;
  provider: TranslationProvider;
  note: string;
};

export const TRANSLATION_LANGUAGE_CODES = ["en", "tl", "ceb", "hil", "ilo"] as const;

export function isTranslationSupported(language: string) {
  return language === "en" || language in PHRASE_RULES;
}

const batchSchema = z.object({
  translations: z.array(z.string().min(1)).min(1),
});

function translationSystemPrompt(targetLanguage: string, context: string) {
  return [
    "You are a professional survey translator and localization specialist for institutional research.",
    `Translate the supplied survey text into ${languageLabel(targetLanguage)} (language code: ${targetLanguage}).`,
    "Requirements: preserve the exact meaning, tone and intent; do NOT translate word-by-word; use natural phrasing a native respondent would understand; keep Likert answer choices semantically ordered; keep organisational names, acronyms and proper nouns unchanged; keep any '{...}' placeholders untouched.",
    targetLanguage === "tl" ? `${SIMPLE_TAGALOG_STYLE_GUIDE} Never leave an English word in the translation (proper nouns excepted).` : "",
    context ? `Context: ${context}` : "",
    'Return STRICT JSON: {"translations":["translated string 1","translated string 2"]} — the array MUST have exactly the same length and order as the input array.',
  ]
    .filter(Boolean)
    .join("\n");
}

/** Translates a list of strings (one AI call; per-item dictionary fallback). */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  context = "",
): Promise<{ translations: string[]; provider: TranslationProvider; warnings: string[] }> {
  const safeTexts = texts.map((t) => (t ?? "").trim());
  if (!safeTexts.length) return { translations: [], provider: "offline-engine", warnings: [] };
  if (!targetLanguage || targetLanguage === "en") {
    return { translations: safeTexts, provider: "offline-engine", warnings: [] };
  }

  const provider = resolveProvider();
  if (provider === "openai") {
    const result = await chatJson(
      {
        system: translationSystemPrompt(targetLanguage, context),
        user: JSON.stringify({ texts: safeTexts }),
        temperature: 0.3,
        maxTokens: Math.min(4000, 220 * safeTexts.length + 200),
      },
      batchSchema,
    );
    if (result.ok && result.data.translations.length === safeTexts.length) {
      return { translations: result.data.translations.map((t) => t.trim()), provider: "openai", warnings: [] };
    }
    return {
      translations: safeTexts.map((text) => phraseTranslate(text, targetLanguage).text),
      provider: "offline-engine",
      warnings: [
        `AI translation was unavailable (${
          result.ok ? "mismatched response length" : result.error
        }). Phrase-assisted offline translation was applied instead.`,
      ],
    };
  }

  return {
    translations: safeTexts.map((text) => phraseTranslate(text, targetLanguage).text),
    provider: "offline-engine",
    warnings: [
      "OPENAI_API_KEY is not configured — phrase-assisted offline translation was applied. Configure a key for full context-aware translation.",
    ],
  };
}

/** Convenience wrapper for a single string. */
export async function translateText(
  text: string,
  targetLanguage: string,
  context = "",
): Promise<TranslateResult> {
  const { translations, provider, warnings } = await translateBatch([text], targetLanguage, context);
  return {
    text: translations[0] ?? text,
    provider,
    note: warnings[0] ?? (provider === "openai" ? "Translated by AI (context-aware)." : "Phrase-assisted translation."),
  };
}

/** Translates the survey-level fields (title, topic, description). */
export async function translateSurveyFields(
  fields: { title: string; topic: string; description: string },
  targetLanguage: string,
): Promise<{
  title: string;
  topic: string;
  description: string;
  provider: TranslationProvider;
  warnings: string[];
}> {
  const { translations, provider, warnings } = await translateBatch(
    [fields.title, fields.topic, fields.description],
    targetLanguage,
    "Institutional survey metadata (title, topic, description).",
  );
  return {
    title: translations[0] ?? fields.title,
    topic: translations[1] ?? fields.topic,
    description: translations[2] ?? fields.description,
    provider,
    warnings,
  };
}