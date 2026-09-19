/**
 * Survey settings: defaults, Zod validation, (de)serialization, randomization rules
 * and question-option parsing. Client-safe (no Prisma).
 */
import { z } from "zod";
import { DEMOGRAPHIC_FIELDS } from "@/lib/constants";
import type { QuestionOption, SurveySettings } from "@/lib/types";

export function defaultDemographics() {
  return DEMOGRAPHIC_FIELDS.map((field) => ({
    key: field.key,
    label: field.label,
    enabled: Boolean(field.defaultEnabled),
    required: false,
  }));
}

export function defaultSurveySettings(
  interviewMethod = "STRUCTURED",
  interviewMode = "INDIVIDUAL",
): SurveySettings {
  return {
    demographics: defaultDemographics(),
    requireAuthentication: false,
    allowLanguageSwitch: true,
    anonymizeResponses: false,
    showProgressBar: true,
    allowOffline: true,
    autoSync: true,
    sessionRecordingEnabled: false,
    thankYouMessage:
      "Thank you for completing this interview. Your response has been securely recorded.",
    randomize: {
      enabled: interviewMode === "RANDOM",
      strategy: "SHUFFLE_ORDER",
      subsetSize: 10,
      setCount: 3,
    },
    likert: {
      defaultScale: 5,
      customLabels: null,
    },
    interviewSpecific: {
      allowFollowUps: interviewMethod !== "STRUCTURED",
      followUpsPerQuestion: 2,
      conversationStyle: interviewMethod === "UNSTRUCTURED" ? "FREE" : "GUIDED",
    },
  };
}

export const surveySettingsSchema = z.object({
  demographics: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        enabled: z.boolean(),
        required: z.boolean(),
      }),
    )
    .default([]),
  requireAuthentication: z.boolean().default(false),
  allowLanguageSwitch: z.boolean().default(true),
  anonymizeResponses: z.boolean().default(false),
  showProgressBar: z.boolean().default(true),
  allowOffline: z.boolean().default(true),
  autoSync: z.boolean().default(true),
  sessionRecordingEnabled: z.boolean().default(false),
  thankYouMessage: z.string().max(600).default("Thank you for completing this interview."),
  randomize: z
    .object({
      enabled: z.boolean().default(false),
      strategy: z
        .enum(["SHUFFLE_ORDER", "RANDOM_SUBSET", "RANDOM_SET_ASSIGNMENT"])
        .default("SHUFFLE_ORDER"),
      subsetSize: z.number().int().min(1).max(50).default(10),
      setCount: z.number().int().min(1).max(10).default(3),
    })
    .default({}),
  likert: z
    .object({
      defaultScale: z.union([z.literal(5), z.literal(7)]).default(5),
      customLabels: z.array(z.string()).nullable().default(null),
    })
    .default({}),
  interviewSpecific: z
    .object({
      allowFollowUps: z.boolean().default(false),
      followUpsPerQuestion: z.number().int().min(0).max(5).default(2),
      conversationStyle: z.enum(["GUIDED", "FREE"]).default("GUIDED"),
    })
    .default({}),
});

/** Parses raw settings (JSON string or object) and fills any missing keys with defaults. */
export function parseSurveySettings(
  raw: unknown,
  interviewMethod = "STRUCTURED",
  interviewMode = "INDIVIDUAL",
): SurveySettings {
  const defaults = defaultSurveySettings(interviewMethod, interviewMode);
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      value = null;
    }
  }
  const parsed = surveySettingsSchema.safeParse(value ?? {});
  if (!parsed.success) return defaults;
  const data = parsed.data;
  return {
    ...defaults,
    ...data,
    demographics: data.demographics.length ? data.demographics : defaults.demographics,
    randomize: { ...defaults.randomize, ...data.randomize },
    likert: { ...defaults.likert, ...data.likert },
    interviewSpecific: { ...defaults.interviewSpecific, ...data.interviewSpecific },
  };
}

export function serializeSurveySettings(settings: SurveySettings) {
  return JSON.stringify(settings);
}

export function parseQuestionOptions(raw: unknown): QuestionOption[] | null {
  if (!raw) return null;
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value)) return null;
  const options: QuestionOption[] = [];
  value.forEach((entry, index) => {
    if (typeof entry === "string") {
      const label = entry.trim();
      if (label) options.push({ label, value: label, score: index + 1 });
      return;
    }
    if (entry && typeof entry === "object") {
      const obj = entry as Record<string, unknown>;
      const label = String(obj.label ?? obj.value ?? "").trim();
      if (!label) return;
      options.push({
        label,
        value: String(obj.value ?? label),
        score: typeof obj.score === "number" ? obj.score : index + 1,
      });
    }
  });
  return options.length ? options : null;
}

export function serializeQuestionOptions(options?: QuestionOption[] | null) {
  if (!options || !options.length) return null;
  return JSON.stringify(options);
}

export function shouldAllowFollowUp(interviewMethod: string, settings: SurveySettings) {
  if (interviewMethod === "STRUCTURED") return false;
  return settings.interviewSpecific.allowFollowUps;
}

export function demographicEnabled(settings: SurveySettings, key: string) {
  return settings.demographics.find((d) => d.key === key)?.enabled ?? false;
}

export function demographicRequired(settings: SurveySettings, key: string) {
  const entry = settings.demographics.find((d) => d.key === key);
  return Boolean(entry?.enabled && entry.required);
}

export function enabledDemographics(settings: SurveySettings) {
  return settings.demographics.filter((d) => d.enabled);
}