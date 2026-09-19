/**
 * AI follow-up question generation for Semi-Structured and Unstructured interviews.
 * Context-aware: uses the prepared topic, the original question, the respondent's
 * actual answer (sentiment + keywords) and the target language.
 */
import { z } from "zod";
import { chatJson, resolveProvider } from "@/lib/ai/provider";
import { parseTopic } from "@/lib/ai/frames";
import {
  NEGATIVE_WORDS,
  PAIN_CUES,
  POSITIVE_WORDS,
  SUGGESTION_CUES,
  classifySentiment,
  containsCue,
  scoreText,
  tokenize,
} from "@/lib/ai/lexicon";
import { phraseTranslate } from "@/lib/ai/translate-dictionary";
import { languageLabel } from "@/lib/constants";

export type FollowUpInput = {
  topic: string;
  stakeholder?: string;
  question: string;
  answer: string;
  interviewMethod: string;
  language: string;
  askedFollowUps?: string[];
};

export type FollowUpResult = {
  question: string;
  rationale: string;
  provider: "openai" | "offline-engine";
};

const followUpSchema = z.object({
  followUp: z.object({
    question: z.string().min(5).max(400),
    rationale: z.string().max(300).optional(),
  }),
});

/** Extracts the most informative keyword from an answer for probing. */
function keySubject(answer: string, topic: string) {
  const tokens = tokenize(answer);
  const meaningful = tokens.filter((t) => t.length > 3);
  const topicWords = new Set(tokenize(topic));
  const nonTopic = meaningful.filter((t) => !topicWords.has(t));
  return (nonTopic[0] ?? meaningful[0] ?? parseTopic(topic, "respondents").subject).trim();
}

export function buildLocalFollowUp(input: FollowUpInput): FollowUpResult {
  const { topic, question, answer, askedFollowUps = [], language } = input;
  const text = (answer ?? "").trim();
  const ctx = parseTopic(topic, input.stakeholder ?? "respondents");
  const subject = keySubject(text, topic);
  const { score } = scoreText(text);
  const sentiment = classifySentiment(score);
  const words = tokenize(text);
  const hasNegative = words.some((w) => NEGATIVE_WORDS.includes(w)) || containsCue(text, PAIN_CUES);
  const hasPositive = words.some((w) => POSITIVE_WORDS.includes(w));
  const hasSuggestion = containsCue(text, SUGGESTION_CUES);

  const candidates: { text: string; rationale: string }[] = [];

  if (text.length < 18) {
    candidates.push({
      text: `You answered briefly regarding ${subject}. Could you tell me more about your experience with ${ctx.subject}?`,
      rationale: "Answer was very short — probing for elaboration.",
    });
    candidates.push({
      text: `What is the main reason behind your answer to "${question}"?`,
      rationale: "Requesting the reasoning behind a short answer.",
    });
  }

  if (hasNegative || sentiment === "NEGATIVE") {
    candidates.push({
      text: `You mentioned a difficulty with ${subject}. Could you describe one specific situation where you experienced this with ${ctx.subject}?`,
      rationale: "Negative sentiment detected — requesting a concrete example.",
    });
    candidates.push({
      text: `What would need to change so that the problem you described about ${subject} no longer affects you?`,
      rationale: "Negative sentiment detected — exploring the desired resolution.",
    });
  }

  if (hasSuggestion) {
    candidates.push({
      text: `You suggested an improvement involving ${subject}. How urgent is that change compared with other improvements to ${ctx.subject}?`,
      rationale: "Suggestion detected — prioritisation probe.",
    });
  }

  if (hasPositive && !hasNegative) {
    candidates.push({
      text: `You described something positive about ${subject}. What exactly made that experience work well for you?`,
      rationale: "Positive sentiment detected — identifying reinforcing factors.",
    });
    candidates.push({
      text: `Would you recommend ${ctx.subject} to other ${ctx.stakeholder} for the reason you mentioned? Why?`,
      rationale: "Positive sentiment detected — exploring advocacy.",
    });
  }

  candidates.push({
    text: `You mentioned ${subject}. How does that affect your overall satisfaction with ${ctx.subject}?`,
    rationale: "General deepening probe anchored on the respondent's own words.",
  });
  candidates.push({
    text: `Can you give an example that illustrates your point about ${subject}?`,
    rationale: "Requesting an illustrative example.",
  });

  const asked = new Set(askedFollowUps.map((q) => q.trim().toLowerCase()));
  const chosen = candidates.find((candidate) => !asked.has(candidate.text.toLowerCase())) ?? candidates[0];

  const translated = language && language !== "en" ? phraseTranslate(chosen.text, language).text : chosen.text;
  return { question: translated, rationale: chosen.rationale, provider: "offline-engine" };
}

/** Generates a context-aware follow-up question (AI when available, engine otherwise). */
export async function generateFollowUp(input: FollowUpInput): Promise<FollowUpResult> {
  const provider = resolveProvider();
  const local = buildLocalFollowUp(input);

  if (provider !== "openai") return local;

  const result = await chatJson(
    {
      system: [
        "You are an experienced qualitative interviewer conducting a semi-structured or unstructured interview.",
        "Given the prepared topic, the original question and the respondent's actual answer, write ONE short, natural follow-up question that digs deeper into what the respondent actually said.",
        "Rules: never introduce an unrelated topic; reference the respondent's own wording; keep it under 30 words; be respectful and neutral; do not repeat an already-asked follow-up.",
        'Return STRICT JSON: {"followUp":{"question":"string","rationale":"string"}}',
        `Write the follow-up in ${languageLabel(input.language)} (code: ${input.language}) using natural, context-aware phrasing.`,
      ].join("\n"),
      user: [
        `Topic: ${input.topic}`,
        `Interview method: ${input.interviewMethod}`,
        `Original question: ${input.question}`,
        `Respondent answer: ${input.answer || "(no answer provided yet)"}`,
        input.askedFollowUps?.length
          ? `Already asked follow-ups:\n${input.askedFollowUps.map((q) => `- ${q}`).join("\n")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      temperature: 0.65,
      maxTokens: 400,
    },
    followUpSchema,
  );

  if (result.ok && result.data.followUp.question.trim().length > 4) {
    return {
      question: result.data.followUp.question.trim(),
      rationale: result.data.followUp.rationale?.trim() || "AI-generated context-aware follow-up.",
      provider: "openai",
    };
  }

  return local;
}

/** Sentiment/keyword enrichment persisted onto stored open-text answers. */
export function enrichAnswerText(text: string) {
  const { score } = scoreText(text);
  const words = tokenize(text).slice(0, 12);
  return {
    sentiment: classifySentiment(score),
    score,
    keywords: words.slice(0, 8),
  };
}