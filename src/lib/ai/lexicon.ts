/**
 * Lexicon used by the offline (non-LLM) text analytics engine.
 * Multilingual: English + Filipino-family markers (Tagalog, Cebuano, Hiligaynon, Ilocano).
 */

export const POSITIVE_WORDS = [
  "satisfied", "satisfaction", "happy", "good", "great", "excellent", "helpful", "fast", "quick",
  "efficient", "friendly", "clean", "easy", "convenient", "reliable", "professional", "responsive",
  "accessible", "affordable", "secure", "safe", "quality", "improved", "better", "thankful",
  "grateful", "appreciate", "accommodating", "organized", "available", "complete", "correct",
  "masaya", "magaling", "mabilis", "maayos", "madali", "matulungin", "malinis", "maganda",
  "sapat", "tiwala", "mabuti", "kompleto", "maayo", "pasalamat", "kasaligan", "madasig",
  "mabuligon", "matinlo", "naimbag", "napintas", "nasayaat", "natulong",
];

export const NEGATIVE_WORDS = [
  "dissatisfied", "unsatisfied", "poor", "bad", "worst", "slow", "delayed", "delay", "late", "dirty",
  "rude", "unhelpful", "confusing", "difficult", "hard", "expensive", "lacking", "lack", "shortage",
  "insufficient", "broken", "error", "fail", "failed", "failure", "problem", "issue", "complaint",
  "crowded", "hassle", "inconvenient", "miscommunication", "unresponsive", "unfair", "unsafe",
  "insecure", "disorganized", "unclear", "incomplete", "wrong", "inaccurate", "waste", "costly",
  "mabagal", "mahirap", "magulo", "marumi", "kulang", "sira", "problema", "reklamo", "mahal",
  "abala", "mali", "matagal", "nakakainis", "lisod", "hinay", "hugaw", "gubot", "sayop",
  "mabudlay", "malain", "gamo", "nalating", "narigat", "rugit", "kurkurang", "nangina",
];

export const NEGATION_WORDS = [
  "not", "no", "never", "none", "cannot", "without", "hindi", "wala", "dili", "indi", "di",
];

export const SUGGESTION_CUES = [
  "should", "suggest", "suggestion", "recommend", "recommendation", "improve", "improvement",
  "hope", "please", "add", "provide", "increase", "reduce", "better if", "it would be better",
  "sana", "dapat", "kailangan", "dagdagan", "bawasan", "ayusin", "pagbutihin", "kung pwede",
  "kinahanglan", "palihug", "tulungan", "tarungon", "dugangi", "kun mahimo", "buligan",
  "kasapulan", "pangngaasi", "imbag", "paaduen",
];

export const CONCERN_CUES = [
  "worry", "worried", "concern", "concerned", "afraid", "fear", "risk", "unsure", "doubt",
  "confused", "unclear", "alala", "takot", "duda", "hindi sigurado", "kabalaka", "hadlok",
  "dili sigurado", "kahadlok", "danag", "buteng", "duadua", "di sigurado",
];

export const PAIN_CUES = [
  "problem", "issue", "difficulty", "difficult", "slow", "delay", "delayed", "waiting",
  "long queue", "crowded", "lacking", "shortage", "broken", "error", "unavailable", "expensive",
  "hassle", "inconvenient", "not working", "no response", "hindi gumagana", "problema", "mabagal",
  "matagal", "pila", "siksikan", "kulang", "sira", "hindi available", "hinay", "taas pila", "huot",
  "guba", "mabudlay", "malawig", "nalating", "atiddog", "ruot", "nadadael",
];
export const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "if", "then", "than", "that", "this", "these", "those",
  "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "have", "has",
  "had", "will", "would", "shall", "should", "can", "could", "may", "might", "must", "to", "of",
  "in", "on", "at", "by", "for", "with", "about", "from", "into", "during", "before", "after",
  "above", "below", "up", "down", "out", "off", "over", "under", "again", "further", "once",
  "here", "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
  "most", "other", "some", "such", "only", "own", "same", "so", "too", "very", "just", "also",
  "i", "me", "my", "we", "our", "you", "your", "he", "him", "his", "she", "her", "it", "its",
  "they", "them", "their", "what", "which", "who", "whom", "as", "because", "while", "get",
  "got", "many", "much", "one", "two", "use", "using", "used", "really", "even", "still",
  "nag", "ang", "ng", "sa", "mga", "ko", "mo", "namin", "natin", "nila", "siya", "sila", "ito",
  "iyan", "iyon", "para", "dahil", "kung", "naman", "lang", "yung", "yong", "ako", "kami",
  "kayo", "po", "opo", "may", "meron", "wala", "na", "pa", "din", "rin", "at", "o", "kay",
  "ni", "nina", "dito", "doon", "mao", "nga", "among", "ug", "nimo", "namo", "nato", "kini",
  "kana", "kadto", "aron", "tungod", "kon", "pod", "man", "kamo", "ka", "kag", "naton", "sya",
  "ini", "ina", "adto", "bangod", "ikaw", "ti", "iti", "dagiti", "ket", "wenno", "no", "ta",
  "isuna", "isuda", "daytoy", "dayta", "idiay", "tapno",
]);

/** Theme taxonomy — keyword sets mapped to human-readable insight themes. */
export const THEME_RULES: { theme: string; keywords: string[] }[] = [
  { theme: "Service Quality", keywords: ["quality", "reliable", "reliability", "consistent", "standard", "performance", "kalidad", "dekalidad"] },
  { theme: "Access & Availability", keywords: ["access", "accessibility", "available", "availability", "hours", "schedule", "reach", "location", "queue", "waiting", "pila", "oras", "abli"] },
  { theme: "Communication & Information", keywords: ["information", "communication", "announcement", "update", "clear", "clarity", "instructions", "notice", "feedback", "impormasyon", "abiso", "pahibalo", "pakaammo"] },
  { theme: "Staff & Support", keywords: ["staff", "personnel", "employee", "attitude", "courteous", "polite", "friendly", "helpful", "support", "assistance", "kawani", "guro", "trabahante", "empleyado"] },
  { theme: "Facilities & Environment", keywords: ["facility", "facilities", "room", "classroom", "building", "comfort", "cleanliness", "dirty", "parking", "equipment", "pasilidad", "sala", "gusali", "lawak"] },
  { theme: "Digital Experience", keywords: ["system", "website", "portal", "app", "online", "internet", "wifi", "computer", "digital", "technology", "login", "server", "sistema"] },
  { theme: "Process & Efficiency", keywords: ["process", "procedure", "requirement", "requirements", "steps", "transaction", "document", "documents", "efficiency", "efficient", "proseso", "pamamaraan", "dokumento"] },
  { theme: "Cost & Affordability", keywords: ["cost", "fee", "fees", "price", "expensive", "affordable", "budget", "payment", "bayad", "gastos", "presyo", "mahal"] },
  { theme: "Trust, Safety & Privacy", keywords: ["trust", "safe", "safety", "security", "privacy", "data", "confidential", "fair", "tiwala", "seguridad", "pribasiya", "ligtas"] },
  { theme: "Satisfaction & Experience", keywords: ["satisfied", "satisfaction", "happy", "experience", "expectation", "recommend", "kasiyahan", "karanasan", "rekomendasyon", "katagbawan"] },
];
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?;])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^['-]+|['-]+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
}

const POSITIVE_SET = new Set(POSITIVE_WORDS);
const NEGATIVE_SET = new Set(NEGATIVE_WORDS);
const NEGATION_SET = new Set(NEGATION_WORDS);

/** Lexicon sentiment score for a span of text (negation-aware). */
export function scoreText(text: string) {
  const tokens = tokenize(text);
  const positive: string[] = [];
  const negative: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prev = tokens[i - 1];
    const negated = prev ? NEGATION_SET.has(prev) : false;
    if (POSITIVE_SET.has(token)) {
      if (negated) negative.push(token);
      else positive.push(token);
    } else if (NEGATIVE_SET.has(token)) {
      if (negated) positive.push(token);
      else negative.push(token);
    }
  }
  const raw = positive.length - negative.length;
  const magnitude = positive.length + negative.length;
  const normalized = magnitude ? Math.max(-1, Math.min(1, raw / Math.sqrt(magnitude + 1))) : 0;
  const score = raw >= 0 ? normalized * 0.55 + Math.min(0.45, magnitude * 0.12) : normalized * 0.55 - Math.min(0.45, magnitude * 0.12);
  return { score: Number(score.toFixed(3)), positive, negative, magnitude };
}

export function classifySentiment(score: number): "POSITIVE" | "NEUTRAL" | "NEGATIVE" {
  if (score >= 0.18) return "POSITIVE";
  if (score <= -0.18) return "NEGATIVE";
  return "NEUTRAL";
}

export function containsCue(text: string, cues: string[]): boolean {
  const lower = text.toLowerCase();
  return cues.some((cue) => lower.includes(cue));
}

export function detectThemes(text: string): string[] {
  const lower = text.toLowerCase();
  return THEME_RULES.filter((rule) => rule.keywords.some((keyword) => lower.includes(keyword))).map(
    (rule) => rule.theme,
  );
}

/** Frequency-ranked unigrams + bigrams (bigrams score higher for readability). */
export function extractPhrases(texts: string[], limit = 20) {
  const unigrams = new Map<string, number>();
  const bigrams = new Map<string, number>();
  for (const text of texts) {
    const tokens = tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      unigrams.set(token, (unigrams.get(token) ?? 0) + 1);
      if (i < tokens.length - 1) {
        const gram = `${token} ${tokens[i + 1]}`;
        bigrams.set(gram, (bigrams.get(gram) ?? 0) + 1);
      }
    }
  }
  const combined: { phrase: string; count: number }[] = [];
  for (const [phrase, count] of bigrams) {
    if (count >= 2) combined.push({ phrase, count: count + 1 });
  }
  for (const [phrase, count] of unigrams) {
    if (count >= 2) combined.push({ phrase, count });
  }
  const seen = new Set<string>();
  return combined
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
    .filter((entry) => {
      const root = entry.phrase.split(" ").pop() ?? entry.phrase;
      if (seen.has(root)) return false;
      seen.add(root);
      return true;
    })
    .slice(0, limit);
}

export function dedupeStrings(values: string[], limit = 8, maxLength = 220) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length < 6) continue;
    const key = clean.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean.length > maxLength ? `${clean.slice(0, maxLength - 1)}…` : clean);
    if (out.length >= limit) break;
  }
  return out;
}