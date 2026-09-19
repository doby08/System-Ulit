/**
 * Unstructured-response analytics.
 * Local statistical/lexicon analysis runs first (sentiment, keywords, themes, pain
 * points, suggestions, concerns); the AI layer — when a key is configured — refines
 * the narrative summary and distils cleaner themes/pain points/suggestions.
 */
import { z } from "zod";
import { analyzeCorpus, type CorpusAnalysis } from "@/lib/ai/corpus";
import { chatJson, resolveProvider } from "@/lib/ai/provider";
import { classifySentiment, scoreText, tokenize } from "@/lib/ai/lexicon";
import { languageLabel } from "@/lib/constants";

export type InsightOptions = {
  texts: string[];
  topic: string;
  stakeholder?: string;
  language?: string;
  questions?: string[];
};

export type InsightResult = CorpusAnalysis & { aiEnhanced: boolean; aiProvider: string };

const insightSchema = z.object({
  summary: z.string().max(1600).optional(),
  themes: z.array(z.object({ theme: z.string().max(80), count: z.number().optional() })).max(10).optional(),
  painPoints: z.array(z.string().max(300)).max(10).optional(),
  suggestions: z.array(z.string().max(300)).max(10).optional(),
  concerns: z.array(z.string().max(300)).max(8).optional(),
  keywords: z.array(z.string().max(60)).max(20).optional(),
});

function mergeUnique(primary: string[], secondary: string[], limit: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of [...primary, ...secondary]) {
    const clean = (value ?? "").replace(/\s+/g, " ").trim();
    if (clean.length < 5) continue;
    const key = clean.toLowerCase().slice(0, 70);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

/** Full unstructured analysis with AI refinement when available. */
export async function analyzeOpenEnded(options: InsightOptions): Promise<InsightResult> {
  const local = analyzeCorpus(options.texts);
  const provider = resolveProvider();

  if (provider !== "openai" || !options.texts.length) {
    return { ...local, aiEnhanced: false, aiProvider: "offline-engine" };
  }

  const result = await chatJson(
    {
      system: [
        "You are a qualitative research analyst summarising open-ended interview responses for decision makers.",
        "Tasks: 1) write a concise executive summary (max 130 words), 2) identify the dominant themes, 3) list concrete pain points, 4) list actionable suggestions, 5) list concerns respondents raised, 6) list frequently mentioned keywords.",
        "Base every statement ONLY on the supplied responses. Do not invent facts.",
        `Write the summary in ${languageLabel(options.language ?? "en")}.`,
        'Return STRICT JSON: {"summary":"string","themes":[{"theme":"string","count":number}],"painPoints":["string"],"suggestions":["string"],"concerns":["string"],"keywords":["string"]}',
      ].join("\n"),
      user: [
        `Research topic: ${options.topic}`,
        options.stakeholder ? `Respondent type: ${options.stakeholder}` : "",
        options.questions?.length ? `Questions asked:\n${options.questions.slice(0, 20).join("\n")}` : "",
        `Responses (${options.texts.length}):`,
        options.texts
          .slice(0, 120)
          .map((text, index) => `${index + 1}. ${text.slice(0, 700)}`)
          .join("\n"),
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.4,
      maxTokens: 1600,
    },
    insightSchema,
  );

  if (!result.ok) {
    return { ...local, aiEnhanced: false, aiProvider: "offline-engine" };
  }

  const data = result.data;
  const localThemes = new Map(local.themes.map((t) => [t.theme.toLowerCase(), t]));
  const themes = (data.themes ?? [])
    .map((entry) => ({
      theme: entry.theme.trim(),
      count: entry.count ?? localThemes.get(entry.theme.trim().toLowerCase())?.count ?? 1,
      mentions: localThemes.get(entry.theme.trim().toLowerCase())?.mentions ?? [],
    }))
    .filter((entry) => entry.theme.length > 2);

  return {
    ...local,
    summary: data.summary?.trim() || local.summary,
    themes: themes.length ? themes : local.themes,
    painPoints: mergeUnique(data.painPoints ?? [], local.painPoints, 10),
    suggestions: mergeUnique(data.suggestions ?? [], local.suggestions, 10),
    concerns: mergeUnique(data.concerns ?? [], local.concerns, 8),
    keywords: (data.keywords ?? []).length
      ? (data.keywords ?? []).map((k) => ({
          keyword: k.trim(),
          count: local.keywords.find((l) => l.keyword === k.trim().toLowerCase())?.count ?? 1,
          sentiment: local.keywords.find((l) => l.keyword === k.trim().toLowerCase())?.sentiment ?? "NEUTRAL",
        }))
      : local.keywords,
    aiEnhanced: true,
    aiProvider: "openai",
  };
}

/** Per-answer sentiment/keyword enrichment stored alongside each open-text answer. */
export function enrichAnswersWithSentiment(texts: string[]) {
  return texts.map((text) => {
    const { score } = scoreText(text);
    return {
      sentiment: classifySentiment(score),
      keywords: tokenize(text).slice(0, 8).join(", "),
    };
  });
}

/** Builds a short executive summary for analytics cards (AI or template-based). */
export async function buildExecutiveSummary(options: InsightOptions): Promise<string> {
  const insights = await analyzeOpenEnded(options);
  return insights.summary;
}