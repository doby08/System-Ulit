import {
  CONCERN_CUES,
  PAIN_CUES,
  SUGGESTION_CUES,
  classifySentiment,
  containsCue,
  dedupeStrings,
  detectThemes,
  extractPhrases,
  scoreText,
  splitSentences,
} from "@/lib/ai/lexicon";

export type CorpusAnalysis = {
  totalTexts: number;
  sentiment: { label: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; count: number; percentage: number }[];
  keywords: { keyword: string; count: number; sentiment: string }[];
  themes: { theme: string; count: number; mentions: string[] }[];
  painPoints: string[];
  suggestions: string[];
  concerns: string[];
  positiveFeedback: string[];
  negativeFeedback: string[];
  summary: string;
  provider: string;
};

/**
 * Offline corpus analysis: sentiment distribution, keyword insights, themes,
 * pain points, suggestions, concerns, representative feedback and an AI-style summary.
 */
export function analyzeCorpus(texts: string[]): CorpusAnalysis {
  const cleanTexts = texts.map((t) => (t ?? "").trim()).filter((t) => t.length > 1);
  const sentences = cleanTexts.flatMap((text) => splitSentences(text));
  const scoredSentences = sentences.map((sentence) => ({
    sentence,
    ...scoreText(sentence),
  }));

  const positiveCount = scoredSentences.filter((s) => classifySentiment(s.score) === "POSITIVE").length;
  const negativeCount = scoredSentences.filter((s) => classifySentiment(s.score) === "NEGATIVE").length;
  const neutralCount = Math.max(0, scoredSentences.length - positiveCount - negativeCount);
  const total = scoredSentences.length || 1;

  const phrases = extractPhrases(cleanTexts, 24);
  const keywords = phrases.map(({ phrase, count }) => {
    const related = scoredSentences.filter((s) => s.sentence.toLowerCase().includes(phrase));
    const avgScore = related.length ? related.reduce((acc, s) => acc + s.score, 0) / related.length : 0;
    return { keyword: phrase, count, sentiment: classifySentiment(avgScore) };
  });

  const themeMap = new Map<string, { count: number; mentions: string[] }>();
  for (const sentence of sentences) {
    for (const theme of detectThemes(sentence)) {
      const entry = themeMap.get(theme) ?? { count: 0, mentions: [] };
      entry.count += 1;
      if (entry.mentions.length < 4) entry.mentions.push(sentence.slice(0, 200));
      themeMap.set(theme, entry);
    }
  }

  const painPoints = dedupeStrings(
    scoredSentences
      .filter((s) => s.score < 0 || containsCue(s.sentence, PAIN_CUES))
      .map((s) => s.sentence),
    8,
  );
  const suggestions = dedupeStrings(
    scoredSentences
      .filter((s) => containsCue(s.sentence, SUGGESTION_CUES) || /^\s*(?:suggestion|recommendation)s?:/i.test(s.sentence))
      .map((s) => s.sentence),
    8,
  );
  const concerns = dedupeStrings(
    scoredSentences
      .filter((s) => containsCue(s.sentence, CONCERN_CUES))
      .map((s) => s.sentence),
    6,
  );
  const positiveFeedback = dedupeStrings(
    scoredSentences
      .filter((s) => classifySentiment(s.score) === "POSITIVE")
      .sort((a, b) => b.score - a.score)
      .map((s) => s.sentence),
    6,
  );
  const negativeFeedback = dedupeStrings(
    scoredSentences
      .filter((s) => classifySentiment(s.score) === "NEGATIVE")
      .sort((a, b) => a.score - b.score)
      .map((s) => s.sentence),
    6,
  );

  const topThemes = [...themeMap.entries()].sort((a, b) => b[1].count - a[1].count);
  const topKeywords = keywords.slice(0, 6).map((k) => k.keyword);
  const positivesPct = Math.round((positiveCount / total) * 100);
  const negativesPct = Math.round((negativeCount / total) * 100);
  const neutralsPct = Math.max(0, 100 - positivesPct - negativesPct);

  const summaryParts: string[] = [];
  if (!cleanTexts.length) {
    summaryParts.push("No open-ended responses have been collected yet for this selection.");
  } else {
    const tone =
      positivesPct >= 60 ? "predominantly positive" : negativesPct >= 45 ? "predominantly critical" : "mixed";
    summaryParts.push(
      `Analysis of ${cleanTexts.length} open-ended response${cleanTexts.length === 1 ? "" : "s"} (${sentences.length} statements) shows a ${tone} tone: ${positivesPct}% positive, ${neutralsPct}% neutral and ${negativesPct}% negative sentiment.`,
    );
    if (topThemes.length) {
      summaryParts.push(
        `The most frequently discussed themes are ${topThemes
          .slice(0, 3)
          .map(([theme, meta]) => `${theme} (${meta.count} mentions)`)
          .join(", ")}.`,
      );
    }
    if (topKeywords.length) {
      summaryParts.push(`Recurring keywords include ${topKeywords.slice(0, 5).join(", ")}.`);
    }
    if (painPoints.length) {
      summaryParts.push(`Key pain point: ${painPoints[0]}`);
    }
    if (suggestions.length) {
      summaryParts.push(`Most actionable suggestion raised: ${suggestions[0]}`);
    }
    summaryParts.push(
      negativesPct > positivesPct
        ? "Recommended next step: prioritise remediation of the issues above and re-measure satisfaction after the intervention."
        : "Recommended next step: sustain the practices respondents value while addressing the residual concerns listed.",
    );
  }

  return {
    totalTexts: cleanTexts.length,
    sentiment: [
      { label: "POSITIVE", count: positiveCount, percentage: Number(((positiveCount / total) * 100).toFixed(1)) },
      { label: "NEUTRAL", count: neutralCount, percentage: Number(((neutralCount / total) * 100).toFixed(1)) },
      { label: "NEGATIVE", count: negativeCount, percentage: Number(((negativeCount / total) * 100).toFixed(1)) },
    ],
    keywords,
    themes: topThemes.map(([theme, meta]) => ({ theme, count: meta.count, mentions: meta.mentions })),
    painPoints,
    suggestions,
    concerns,
    positiveFeedback,
    negativeFeedback,
    summary: summaryParts.join(" "),
    provider: "offline-engine",
  };
}