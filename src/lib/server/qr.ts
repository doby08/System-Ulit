/**
 * QR code service — secure public survey tokens + real QR image rendering
 * (PNG/SVG/DataURL). Tokens are opaque, URL-safe and never expose admin secrets.
 */
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/server/api";

export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Cryptographically strong, URL-safe public token (no PII, no sequence numbers). */
export function generatePublicToken(bytes = 18) {
  return randomBytes(bytes).toString("base64url");
}

export function publicSurveyPath(token: string) {
  return `/respond/${token}`;
}

export function publicSurveyUrl(token: string) {
  return `${appUrl()}${publicSurveyPath(token)}`;
}

export type QrRenderOptions = {
  width?: number;
  margin?: number;
  dark?: string;
  light?: string;
};

function renderOptions(options: QrRenderOptions = {}) {
  return {
    errorCorrectionLevel: "M" as const,
    margin: options.margin ?? 2,
    width: options.width ?? 480,
    color: {
      dark: options.dark ?? "#0B1224",
      light: options.light ?? "#FFFFFF",
    },
  };
}

export async function qrDataUrl(url: string, options?: QrRenderOptions) {
  return QRCode.toDataURL(url, renderOptions(options));
}

export async function qrSvg(url: string, options?: QrRenderOptions) {
  return QRCode.toString(url, { ...renderOptions(options), type: "svg" });
}

export async function qrPngBuffer(url: string, options?: QrRenderOptions) {
  return QRCode.toBuffer(url, { ...renderOptions(options), type: "png" });
}

/** True when the token string looks like one we generated. */
export function isValidTokenFormat(token: string) {
  return /^[A-Za-z0-9_-]{16,80}$/.test(token);
}

export type CreateQrTokenInput = {
  surveyId: string;
  createdById: string;
  label?: string | null;
  language?: string;
  expiresAt?: Date | null;
  versionId?: string | null;
  settings?: Record<string, unknown> | null;
};

export async function createQrToken(input: CreateQrTokenInput) {
  const survey = await prisma.survey.findUnique({
    where: { id: input.surveyId },
    select: { id: true, version: true, language: true, status: true },
  });
  if (!survey) throw new ApiError("Survey not found. Publish the survey before generating a QR code.", 404);

  const version = input.versionId
    ? await prisma.surveyVersion.findUnique({ where: { id: input.versionId }, select: { id: true, version: true } })
    : await prisma.surveyVersion.findFirst({
        where: { surveyId: survey.id },
        orderBy: { version: "desc" },
        select: { id: true, version: true },
      });

  return prisma.qRToken.create({
    data: {
      surveyId: survey.id,
      versionId: version?.id ?? null,
      token: generatePublicToken(),
      label: input.label ?? `QR v${version?.version ?? survey.version}`,
      language: input.language ?? survey.language,
      expiresAt: input.expiresAt ?? null,
      settings: input.settings ? JSON.stringify(input.settings) : null,
      createdById: input.createdById,
    },
  });
}

/** Resolves an active QR token with its survey + version (public entry point). */
export async function resolvePublicToken(token: string) {
  if (!isValidTokenFormat(token)) {
    throw new ApiError("This survey link is not valid.", 400, { code: "INVALID_TOKEN" });
  }
  const qr = await prisma.qRToken.findUnique({
    where: { token },
    include: {
      survey: {
        select: {
          id: true,
          title: true,
          topic: true,
          description: true,
          stakeholder: true,
          interviewMethod: true,
          interviewMode: true,
          language: true,
          status: true,
          version: true,
          expiresAt: true,
          settings: true,
          aiProvider: true,
          questionCount: true,
        },
      },
      version: { select: { id: true, version: true } },
    },
  });

  if (!qr) throw new ApiError("This survey link is not recognised.", 404, { code: "TOKEN_NOT_FOUND" });
  if (qr.status !== "ACTIVE") {
    throw new ApiError("This survey link has been disabled by the administrator.", 410, {
      code: "TOKEN_DISABLED",
    });
  }
  if (qr.expiresAt && qr.expiresAt.getTime() < Date.now()) {
    throw new ApiError("This survey link has expired.", 410, { code: "TOKEN_EXPIRED" });
  }
  if (qr.survey.expiresAt && qr.survey.expiresAt.getTime() < Date.now()) {
    throw new ApiError("This survey is no longer accepting responses.", 410, { code: "SURVEY_EXPIRED" });
  }
  if (qr.survey.status === "CLOSED" || qr.survey.status === "ARCHIVED") {
    throw new ApiError("This survey has been closed by the administrator.", 410, {
      code: "SURVEY_CLOSED",
    });
  }
  return qr;
}

/** Records a scan (idempotency not required — used for QR analytics). */
export async function recordScan(tokenId: string) {
  try {
    await prisma.qRToken.update({
      where: { id: tokenId },
      data: { scans: { increment: 1 }, lastScanAt: new Date() },
    });
  } catch (error) {
    console.warn("[qr] failed to record scan", error);
  }
}

export async function incrementQrResponses(tokenId: string) {
  await prisma.qRToken.update({
    where: { id: tokenId },
    data: { responses: { increment: 1 } },
  });
}

export async function incrementQrCompletions(tokenId: string) {
  await prisma.qRToken.update({
    where: { id: tokenId },
    data: { completions: { increment: 1 } },
  });
}