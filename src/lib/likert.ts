/**
 * Likert scale definitions + scoring helpers (client-safe, no server imports).
 * Supports 5-point and 7-point scales with custom labels, in five languages.
 */

export type LikertScaleSize = 5 | 7;

export const LIKERT_LABELS: Record<string, Record<LikertScaleSize, string[]>> = {
  en: {
    5: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    7: [
      "Strongly Disagree",
      "Disagree",
      "Somewhat Disagree",
      "Neutral",
      "Somewhat Agree",
      "Agree",
      "Strongly Agree",
    ],
  },
  tl: {
    5: [
      "Lubos na hindi ako sang-ayon",
      "Hindi ako sang-ayon",
      "Hindi sigurado",
      "Sang-ayon ako",
      "Lubos na sang-ayon ako",
    ],
    7: [
      "Lubos na hindi ako sang-ayon",
      "Hindi ako sang-ayon",
      "Medyo hindi ako sang-ayon",
      "Hindi sigurado",
      "Medyo sang-ayon ako",
      "Sang-ayon ako",
      "Lubos na sang-ayon ako",
    ],
  },
  ceb: {
    5: ["Dili Gyud Mouyon", "Dili Mouyon", "Neutral", "Mouyon", "Mouyon Gyud"],
    7: [
      "Dili Gyud Mouyon",
      "Dili Mouyon",
      "Medyo Dili Mouyon",
      "Neutral",
      "Medyo Mouyon",
      "Mouyon",
      "Mouyon Gyud",
    ],
  },
  hil: {
    5: ["Indi Gid Magpasugot", "Indi Magpasugot", "Neutral", "Nagapasugot", "Nagapasugot Gid"],
    7: [
      "Indi Gid Magpasugot",
      "Indi Magpasugot",
      "Medyo Indi Magpasugot",
      "Neutral",
      "Medyo Nagapasugot",
      "Nagapasugot",
      "Nagapasugot Gid",
    ],
  },
  ilo: {
    5: ["Saan laeng a di Kayat", "Di Kayat", "Neutral", "Kayat", "Kayat unay"],
    7: ["Saan laeng a di Kayat", "Di Kayat", "Medyo di Kayat", "Neutral", "Medyo Kayat", "Kayat", "Kayat unay"],
  },
};

export function likertLabels(scale: number, language = "en"): string[] {
  const size: LikertScaleSize = scale === 7 ? 7 : 5;
  const pack = LIKERT_LABELS[language] ?? LIKERT_LABELS.en;
  return pack[size];
}

/** 1-based score for an answer index, normalised to 0–1. */
export function likertScore(index: number, scale: number) {
  const size = scale === 7 ? 7 : 5;
  const clamped = Math.min(Math.max(index, 0), size - 1);
  return {
    score: clamped + 1,
    normalized: Number(((clamped + 1) / size).toFixed(4)),
    isPositive: clamped + 1 > size / 2,
  };
}

/** Resolves the score from a stored label (or numeric/original index). */
export function resolveLikertScore(
  value: string | number | null | undefined,
  scale: number,
  labels?: string[],
) {
  const size = scale === 7 ? 7 : 5;
  const list = labels?.length === size ? labels : likertLabels(scale);
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return likertScore(value - 1, size);
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && value.trim() !== "") return likertScore(asNumber - 1, size);
  const idx = list.findIndex((l) => l.toLowerCase() === String(value).trim().toLowerCase());
  if (idx >= 0) return likertScore(idx, size);
  return null;
}

export type LikertDistributionEntry = { label: string; count: number; percentage: number; score: number };

/** Distribution + average + percentage + category summary for a Likert question. */
export function likertSummary(scores: number[], scale: number, labels?: string[]) {
  const size = scale === 7 ? 7 : 5;
  const list = labels?.length === size ? labels : likertLabels(scale);
  const total = scores.length;
  const counts = new Array(size).fill(0) as number[];
  for (const s of scores) {
    const idx = Math.min(Math.max(Math.round(s) - 1, 0), size - 1);
    counts[idx] += 1;
  }
  const distribution: LikertDistributionEntry[] = counts.map((count, i) => ({
    label: list[i],
    count,
    percentage: total ? Number(((count / total) * 100).toFixed(1)) : 0,
    score: i + 1,
  }));
  const avgScore = total ? Number((scores.reduce((a, b) => a + b, 0) / total).toFixed(2)) : 0;
  const normalized = total ? Number(((avgScore / size) * 100).toFixed(1)) : 0;
  const positive = counts.slice(Math.ceil(size / 2)).reduce((a, b) => a + b, 0);
  const negative = counts.slice(0, Math.floor(size / 2)).reduce((a, b) => a + b, 0);
  const neutral = total - positive - negative;
  return {
    scale: size,
    total,
    labels: list,
    distribution,
    average: avgScore,
    normalizedPercent: normalized,
    positive: { count: positive, percentage: total ? Number(((positive / total) * 100).toFixed(1)) : 0 },
    neutral: { count: neutral, percentage: total ? Number(((neutral / total) * 100).toFixed(1)) : 0 },
    negative: { count: negative, percentage: total ? Number(((negative / total) * 100).toFixed(1)) : 0 },
    interpretation: interpretLikert(normalized, size),
  };
}

export function interpretLikert(normalizedPercent: number, scale: number) {
  if (!normalizedPercent) return "No data";
  const scaleHint = scale === 7 ? "7-point" : "5-point";
  if (normalizedPercent >= 85) return `Very high agreement (${scaleHint})`;
  if (normalizedPercent >= 70) return `High agreement (${scaleHint})`;
  if (normalizedPercent >= 55) return `Moderate agreement (${scaleHint})`;
  if (normalizedPercent >= 40) return `Mixed / neutral (${scaleHint})`;
  if (normalizedPercent >= 25) return `Low agreement (${scaleHint})`;
  return `Very low agreement (${scaleHint})`;
}