/**
 * Tagalog (Filipino) language quality helpers.
 *
 * The platform must always generate questions that a Filipino respondent can read
 * easily: pure Tagalog in its simple, everyday form (no Taglish, no deep/archaic
 * words, no word-by-word translations). This module holds the single source of
 * truth for that requirement:
 *
 *  - SIMPLE_TAGALOG_STYLE_GUIDE : the instruction block injected into every AI prompt.
 *  - English-leak detection     : validates AI output before it reaches the builder.
 *  - topic rendering            : turns the parsed English topic into a natural
 *                                 Tagalog noun phrase used by the native Tagalog frames.
 */
import { tagalogNoun } from "@/lib/ai/translate-dictionary";
import type { TopicContext } from "@/lib/ai/frames";

/** Simple, everyday Tagalog vocabulary preferences shared with the AI prompts. */
export const SIMPLE_TAGALOG_STYLE_GUIDE = [
  "Write in PURE TAGALOG (Filipino). Never mix in English words \u2014 no Taglish sentences.",
  "Use SIMPLE, everyday Tagalog that any respondent can understand immediately.",
  "Avoid deep, poetic or archaic Tagalog (use \"masaya\" not \"nalulugod\"; \"galing\" not \"kahusayan\"; \"tulong\" not \"suporta\"; \"ideya\" not \"suhestiyon\"; \"problema\" not \"suliranin\"; \"puna\" not \"feedback\"; \"gamit\" not \"pag-access\").",
  "Never translate word by word \u2014 write the question the way a Filipino interviewer would actually say it.",
  "Translate the topic itself into Tagalog too (for example \"University Library Services\" \u2192 \"mga serbisyo ng aklatan ng unibersidad\").",
  "Only proper nouns, acronyms and organisation names (for example WPU, Aborlan) stay exactly as written.",
  "Answer options and help text must also be in the same simple Tagalog (Yes \u2192 Oo, No \u2192 Hindi, Strongly agree \u2192 Lubos na sang-ayon, Never \u2192 Hindi kailanman).",
  "Example of what is REQUIRED: \"Gaano ka nasisiyahan sa mga serbisyo ng aklatan?\"",
  "Example of what is FORBIDDEN: \"Gaano ka satisfied sa services ng library?\" / \"Paano mo i-rate ang performance?\"",
].join(" ");

/**
 * English words that signal Taglish when they appear inside a supposed-Tagalog
 * question. Only clear leaks are listed: terms that have a natural, everyday
 * Tagalog equivalent. Proper nouns, acronyms and borrowed words that Filipinos
 * genuinely use (email, website, online, SMS) are intentionally excluded.
 */
const ENGLISH_LEAK_WORDS = [
  "satisfaction",
  "satisfied",
  "dissatisfied",
  "service",
  "services",
  "quality",
  "improve",
  "improvement",
  "recommend",
  "recommendation",
  "feedback",
  "staff",
  "support",
  "facility",
  "facilities",
  "respondent",
  "respondents",
  "experience",
  "rating",
  "respond",
  "response",
  "trust",
  "awareness",
  "aware",
  "access",
  "accessibility",
  "communication",
  "process",
  "waiting",
  "platform",
  "platforms",
  "environment",
  "reliability",
  "reliable",
  "responsiveness",
  "convenience",
  "convenient",
  "availability",
  "available",
  "overall",
  "expectation",
  "expectations",
  "opinion",
  "comment",
  "comments",
  "suggestion",
  "suggestions",
  "challenge",
  "priority",
  "privacy",
  "safety",
  "secure",
  "courtesy",
  "professionalism",
  "knowledgeable",
  /* Structural English words that have no place in a Tagalog sentence. */
  "the",
  "this",
  "these",
  "those",
  "your",
  "you",
  "our",
  "their",
  "is",
  "are",
  "was",
  "were",
  "will",
  "would",
  "should",
  "could",
  "of",
  "and",
  "with",
  "from",
  "about",
  "into",
  "which",
  "when",
  "where",
  "why",
  "how",
  "what",
  "please",
];

const LEAK_PATTERN = new RegExp(`\\b(?:${ENGLISH_LEAK_WORDS.join("|")})\\b`, "i");

/** Returns the English words that leaked into an allegedly Tagalog string. */
export function englishLeaks(text: string): string[] {
  const found = (text ?? "").match(new RegExp(LEAK_PATTERN.source, "gi"));
  if (!found) return [];
  return [...new Set(found.map((word) => word.toLowerCase()))];
}

/** True when the text reads as Taglish (English words inside a Tagalog question). */
export function looksLikeTaglish(text: string): boolean {
  return englishLeaks(text).length > 0;
}

/** Replaces a Taglish string with a guaranteed-pure Tagalog fallback. */
export function usePureTagalog(
  text: string,
  fallback: string,
): { text: string; replaced: boolean; leaks: string[] } {
  const leaks = englishLeaks(text);
  if (!leaks.length || !fallback.trim()) return { text, replaced: false, leaks };
  return { text: fallback, replaced: true, leaks };
}

/** Stakeholder words rendered as simple Tagalog plurals. */
const STAKEHOLDER_MAP: Record<string, string> = {
  student: "mga mag-aaral",
  students: "mga mag-aaral",
  learner: "mga mag-aaral",
  learners: "mga mag-aaral",
  pupil: "mga mag-aaral",
  pupils: "mga mag-aaral",
  faculty: "mga guro",
  teacher: "mga guro",
  teachers: "mga guro",
  instructor: "mga guro",
  instructors: "mga guro",
  professor: "mga propesor",
  professors: "mga propesor",
  staff: "mga kawani",
  employee: "mga kawani",
  employees: "mga kawani",
  personnel: "mga kawani",
  parent: "mga magulang",
  parents: "mga magulang",
  guardian: "mga magulang",
  guardians: "mga magulang",
  alumni: "mga alumni",
  alumnus: "mga alumni",
  graduate: "mga nagtapos",
  graduates: "mga nagtapos",
  employer: "mga employer",
  employers: "mga employer",
  customer: "mga kostumer",
  customers: "mga kostumer",
  client: "mga kliyente",
  clients: "mga kliyente",
  citizen: "mga mamamayan",
  citizens: "mga mamamayan",
  resident: "mga residente",
  residents: "mga residente",
  community: "mga mamamayan",
  patient: "mga pasyente",
  patients: "mga pasyente",
  beneficiary: "mga benepisyaryo",
  beneficiaries: "mga benepisyaryo",
  respondent: "mga sumasagot",
  respondents: "mga sumasagot",
  user: "mga gumagamit",
  users: "mga gumagamit",
  supplier: "mga tagapagtustos",
  suppliers: "mga tagapagtustos",
  visitor: "mga bisita",
  visitors: "mga bisita",
};

/** "Students" -> "mga mag-aaral"; unknown stakeholders keep their original wording. */
export function tagalogStakeholder(stakeholder: string): string {
  const first = (stakeholder || "")
    .toLowerCase()
    .replace(/\s*\/.*$/, "")
    .replace(/[()]/g, " ")
    .trim()
    .split(/[\s,]+/)[0];
  if (!first) return "mga sumasagot";
  return STAKEHOLDER_MAP[first] ?? STAKEHOLDER_MAP[first.replace(/s$/, "")] ?? stakeholder.trim();
}

/** Singular form of a Tagalog stakeholder ("mga mag-aaral" -> "mag-aaral"). */
function tagalogStakeholderOne(plural: string) {
  const singular = plural.replace(/^mga\s+/, "").trim();
  return singular || "sumasagot";
}

const TOPIC_HEAD_MAP: Record<string, string> = {
  satisfaction: "Kasiyahan",
  perception: "Pananaw",
  feedback: "Puna",
  assessment: "Pagsusuri",
  evaluation: "Pagsusuri",
  experience: "Karanasan",
  view: "Pananaw",
  opinion: "Opinyon",
  attitude: "Saloobin",
  sentiment: "Saloobin",
  insight: "Pananaw",
  study: "Pag-aaral",
  survey: "Pag-aaral",
  interview: "Panayam",
  analysis: "Pagsusuri",
  level: "Antas",
};

const TOPIC_PATTERN =
  /^(.+?)\s+(satisfaction|perceptions?|feedback|assessment|evaluation|experience|views?|opinions?|attitudes?|sentiments?|insights?|study|survey|interview|analysis)\s+(?:with|on|about|of|regarding|toward|towards|for)\s+(.+)$/i;
const LEAD_STAKEHOLDER =
  /^(?:student|faculty|staff|parent|alumni|employer|customer|citizen|employee|beneficiary|community|respondent|client|patient|user|resident|visitor)s?\s+/i;

function capFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Renders the parsed English topic/context in simple Tagalog so the native Tagalog
 * frames never need the English topic string.
 * "Student Satisfaction with University Library Services"
 *   -> topic "Kasiyahan ng mga mag-aaral sa mga serbisyo ng aklatan ng unibersidad",
 *      subject "mga serbisyo ng aklatan ng unibersidad", stakeholder "mga mag-aaral".
 */
export function tagalogTopicContext(ctx: TopicContext): TopicContext {
  const subject = (ctx.subject?.trim() || ctx.topic).trim();
  const stakeholder = tagalogStakeholder(ctx.stakeholder);
  const clean = ctx.topic.replace(/\s+/g, " ").trim();
  const subjectTl = tagalogNoun(subject);

  let topic = subjectTl;
  const match = clean.match(TOPIC_PATTERN);
  if (match) {
    const key = match[2].toLowerCase().replace(/s$/, "");
    const head = TOPIC_HEAD_MAP[key] ?? "Pagsusuri";
    const who = tagalogStakeholder(match[1]);
    topic = `${head} ng ${who} sa ${tagalogNoun(match[3])}`;
  } else if (LEAD_STAKEHOLDER.test(clean)) {
    topic = tagalogNoun(clean.replace(LEAD_STAKEHOLDER, ""));
  }

  return {
    topic,
    subject: subjectTl,
    subjectCap: capFirst(subjectTl),
    stakeholder,
    stakeholderOne: tagalogStakeholderOne(stakeholder),
    fullTopic: topic,
  };
}

