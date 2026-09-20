/**
 * Admin-side input validation schemas (Zod). Every mutating API route validates
 * its payload here before touching the database.
 */
import { z } from "zod";
import { surveySettingsSchema } from "@/lib/settings";
import { INTERVIEW_METHOD_VALUES, INTERVIEW_MODE_VALUES, QUESTION_TYPE_VALUES } from "@/lib/constants";

export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === undefined || value === null || value.trim() === "" ? null : value.trim()));

export const optionalDate = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

/* ------------------------------- Questions -------------------------------- */
export const questionOptionInput = z.object({
  label: z.string().min(1).max(300),
  value: z.string().max(300).optional(),
  score: z.number().optional(),
});

export const questionInputSchema = z.object({
  id: z.string().optional(),
  code: z.string().max(16).optional().nullable(),
  text: z.string().min(3).max(1000),
  originalText: optionalText(1000),
  helpText: optionalText(500),
  type: z.enum(QUESTION_TYPE_VALUES as [string, ...string[]]),
  category: optionalText(80),
  tags: z.array(z.string().max(40)).max(12).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().nullable(),
  relevanceScore: z.number().int().min(0).max(100).optional().nullable(),
  isRequired: z.boolean().optional(),
  options: z.array(questionOptionInput).max(24).optional().nullable(),
  likertScale: z.union([z.literal(5), z.literal(7)]).optional().nullable(),
  aiGenerated: z.boolean().optional(),
  aiSource: optionalText(60),
  allowFollowUp: z.boolean().optional(),
  isCore: z.boolean().optional(),
  order: z.number().int().min(1).max(200).optional(),
});

export const questionReorderSchema = z.object({
  order: z
    .array(z.object({ id: z.string().min(4), order: z.number().int().min(1).max(200) }))
    .min(1)
    .max(60),
});

/* -------------------------------- Surveys --------------------------------- */
export const surveyCreateSchema = z.object({
  title: z.string().min(3).max(200),
  topic: z.string().min(3).max(400),
  description: z.string().max(3000).default(""),
  stakeholder: z.string().min(2).max(160),
  interviewMethod: z.enum(INTERVIEW_METHOD_VALUES as [string, ...string[]]),
  interviewMode: z.enum(INTERVIEW_MODE_VALUES as [string, ...string[]]),
  language: z.string().min(2).max(12).default("en"),
  respondentGroup: optionalText(160),
  location: optionalText(200),
  startsAt: optionalDate,
  expiresAt: optionalDate,
  targetRespondents: z.number().int().min(0).max(1_000_000).optional().nullable(),
  settings: surveySettingsSchema.partial().optional(),
  questions: z.array(questionInputSchema).max(50).optional(),
  aiProvider: optionalText(40),
  publish: z.boolean().optional(),
});

export const surveyUpdateSchema = surveyCreateSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"]).optional(),
  questions: z.array(questionInputSchema).max(50).optional(),
  changeNote: optionalText(300),
});

/* ------------------------------ Question bank ------------------------------ */
export const bankItemSchema = z.object({
  text: z.string().min(3).max(1000),
  category: optionalText(80),
  type: z.enum(QUESTION_TYPE_VALUES as [string, ...string[]]),
  tags: z.array(z.string().max(40)).max(12).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().nullable(),
  relevanceScore: z.number().int().min(0).max(100).optional().nullable(),
  interviewMethod: z.enum(INTERVIEW_METHOD_VALUES as [string, ...string[]]).optional().nullable(),
  language: z.string().min(2).max(12).default("en"),
  stakeholder: optionalText(160),
  options: z.array(questionOptionInput).max(24).optional().nullable(),
  likertScale: z.union([z.literal(5), z.literal(7)]).optional().nullable(),
  isFavorite: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const bankItemUpdateSchema = bankItemSchema.partial();

/* ---------------------------------- QR ------------------------------------ */
export const qrCreateSchema = z.object({
  surveyId: z.string().min(4),
  label: optionalText(120),
  language: z.string().min(2).max(12).optional(),
  expiresAt: optionalDate,
  versionId: z.string().optional().nullable(),
  settings: z
    .object({
      requireAuthentication: z.boolean().optional(),
      allowOffline: z.boolean().optional(),
    })
    .optional()
    .nullable(),
});

export const qrUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "DISABLED", "EXPIRED"]).optional(),
  label: optionalText(120),
  expiresAt: optionalDate,
  regenerate: z.boolean().optional(),
  rotateToken: z.boolean().optional(),
});

/* ------------------------------ Respondents ------------------------------- */
export const respondentSchema = z.object({
  name: optionalText(160),
  respondentCode: optionalText(60),
  ageGroup: optionalText(40),
  gender: optionalText(40),
  location: optionalText(160),
  organization: optionalText(160),
  email: z.union([z.string().email().max(200), z.literal(""), z.null()]).optional(),
  phone: optionalText(40),
  respondentGroup: optionalText(120),
  language: optionalText(12),
  device: optionalText(60),
  notes: optionalText(1000),
  surveyId: optionalText(60),
  demographics: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
});

/* --------------------------------- Tags ----------------------------------- */
export const tagSchema = z.object({
  name: z.string().min(2).max(60),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value such as #6366F1")
    .optional(),
});

/* ------------------------------- Translation ------------------------------- */
export const translateSurveySchema = z.object({
  languages: z.array(z.string().min(2).max(12)).min(1).max(5),
  includeQuestions: z.boolean().optional(),
  save: z.boolean().optional(),
});

export const regenerateQuestionSchema = z.object({
  questionId: z.string().min(4).optional(),
  text: z.string().min(3).max(1000).optional(),
  exclude: z.array(z.string().max(1000)).max(50).optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional().nullable(),
});

/* --------------------------------- Auth ----------------------------------- */
export const loginSchema = z.object({
  username: z.string().min(2).max(60),
  password: z.string().min(4).max(200),
  remember: z.boolean().optional(),
});

export const registerSchema = z.object({
  username: z.string().min(3).max(60),
  password: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
  fullName: z.string().min(2).max(160),
  email: z.union([z.string().email().max(200), z.literal("")]).optional(),
  organization: z.string().max(160).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(4).max(200),
  newPassword: z.string().min(8).max(200),
  confirmPassword: z.string().min(8).max(200),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(160).optional(),
  email: z.union([z.string().email().max(200), z.literal(""), z.null()]).optional(),
  phone: optionalText(40),
  organization: optionalText(160),
  avatarColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
});

export const appSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().min(2).max(60),
        value: z.string().max(2000),
      }),
    )
    .max(40),
});