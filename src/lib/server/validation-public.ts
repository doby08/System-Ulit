/**
 * Public (respondent-facing) input validation. These schemas guard the unauthenticated
 * submission + sync endpoints, so limits are conservative and duplicate-safe.
 */
import { z } from "zod";

export const answerPayloadSchema = z.object({
  questionId: z.string().min(4).max(60),
  valueText: z.string().max(6000).optional().nullable(),
  valueNumber: z.number().finite().optional().nullable(),
  valueOption: z.string().max(400).optional().nullable(),
  valueOptions: z.array(z.string().max(400)).max(24).optional().nullable(),
  valueBool: z.boolean().optional().nullable(),
  isFollowUp: z.boolean().optional(),
  parentQuestionId: z.string().max(60).optional().nullable(),
  followUpPrompt: z.string().max(600).optional().nullable(),
  answeredAt: z.string().max(40).optional().nullable(),
});

export const respondentPayloadSchema = z.object({
  name: z.string().max(160).optional().nullable(),
  respondentCode: z.string().max(60).optional().nullable(),
  ageGroup: z.string().max(40).optional().nullable(),
  gender: z.string().max(40).optional().nullable(),
  location: z.string().max(160).optional().nullable(),
  organization: z.string().max(160).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  respondentGroup: z.string().max(120).optional().nullable(),
  language: z.string().max(12).optional().nullable(),
  device: z.string().max(60).optional().nullable(),
});

export const sessionPayloadSchema = z.object({
  sessionCode: z.string().max(60).optional().nullable(),
  groupName: z.string().max(160).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  members: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        role: z.string().max(80).optional().nullable(),
        answersCount: z.number().int().min(0).max(1000).optional(),
      }),
    )
    .max(60)
    .optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "ABANDONED"]).optional().nullable(),
  networkState: z.string().max(30).optional().nullable(),
  recording: z
    .object({
      kind: z.string().max(30).optional(),
      status: z.string().max(30).optional(),
      mimeType: z.string().max(80).optional(),
      durationSec: z.number().int().min(0).max(60 * 60 * 8).optional(),
      sizeBytes: z.number().int().min(0).max(600 * 1024 * 1024).optional(),
      storageRef: z.string().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const responseSubmitSchema = z.object({
  clientResponseId: z.string().min(8).max(80),
  token: z.string().min(8).max(120),
  language: z.string().max(12).optional(),
  deviceId: z.string().max(80).optional().nullable(),
  device: z.string().max(60).optional().nullable(),
  networkState: z.string().max(30).optional().nullable(),
  source: z.enum(["ONLINE", "OFFLINE_SYNC"]).optional(),
  capturedAt: z.string().max(40).optional().nullable(),
  durationSec: z.number().int().min(0).max(60 * 60 * 12).optional(),
  status: z.enum(["COMPLETE", "PARTIAL"]).optional(),
  respondent: respondentPayloadSchema.optional().nullable(),
  session: sessionPayloadSchema.optional().nullable(),
  answers: z.array(answerPayloadSchema).min(1).max(400),
  contentHash: z.string().max(80).optional().nullable(),
  revision: z.number().int().min(1).max(100).optional(),
});

export const syncBatchSchema = z.object({
  responses: z.array(responseSubmitSchema).min(1).max(25),
  deviceId: z.string().max(80).optional().nullable(),
});

export const publicFollowUpSchema = z.object({
  token: z.string().min(8).max(120),
  questionId: z.string().min(4).max(60),
  questionText: z.string().min(3).max(1000),
  answer: z.string().min(1).max(4000),
  language: z.string().max(12).optional(),
  askedFollowUps: z.array(z.string().max(600)).max(10).optional(),
});

export const scanEventSchema = z.object({
  token: z.string().min(8).max(120),
  device: z.string().max(60).optional().nullable(),
});

export const analyticsFilterQuerySchema = z.object({
  surveyId: z.string().max(60).optional(),
  respondentGroup: z.string().max(120).optional(),
  interviewMethod: z.string().max(40).optional(),
  interviewMode: z.string().max(40).optional(),
  language: z.string().max(12).optional(),
  from: z.string().max(40).optional(),
  to: z.string().max(40).optional(),
  includeOffline: z
    .union([z.literal("true"), z.literal("false"), z.literal("1"), z.literal("0")])
    .optional()
    .transform((value) => value === "true" || value === "1"),
});

export const reportCreateSchema = z.object({
  surveyId: z.string().min(4).max(60),
  reportType: z.enum(["SUMMARY", "DETAILED", "COMPARATIVE"]).default("SUMMARY"),
  title: z.string().max(200).optional(),
  filters: z
    .object({
      respondentGroup: z.string().max(120).optional(),
      interviewMethod: z.string().max(40).optional(),
      interviewMode: z.string().max(40).optional(),
      language: z.string().max(12).optional(),
      from: z.string().max(40).optional(),
      to: z.string().max(40).optional(),
    })
    .optional(),
});

export const syncResolveSchema = z.object({
  action: z.enum(["ACCEPT_SERVER", "ACCEPT_LOCAL", "DISMISS"]),
  note: z.string().max(600).optional(),
  localSnapshot: z.string().max(20000).optional(),
});

export const bankImportSchema = z.object({
  ids: z.array(z.string().min(4)).min(1).max(50),
  surveyId: z.string().min(4),
});