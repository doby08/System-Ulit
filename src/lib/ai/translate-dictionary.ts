/**
 * Phrase-assisted translation dictionary used by the offline AI engine.
 *
 * NOTE ON SCOPE: OpenAI (when OPENAI_API_KEY is configured) performs full
 * context-aware translation. This dictionary is the deterministic fallback so the
 * multilingual feature still functions offline: it applies whole-phrase stems
 * first (preserving sentence structure and meaning) and then a domain word map.
 * The topic itself is preserved verbatim because it is usually a proper noun
 * phrase (e.g. "University Services") that should not be machine-mangled.
 */

export type PhraseRule = { pattern: RegExp; replace: string };

export const PHRASE_RULES: Record<string, PhraseRule[]> = {
  tl: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Gaano ka nasisiyahan sa $1?" },
    { pattern: /^Overall, how would you rate the quality of (.+?)\?$/i, replace: "Sa kabuuan, paano mo i-rate ang kalidad ng $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Paano mo i-rate ang $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Gaano kadali ang pag-access sa $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Gaano ka-$1 ang $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Gaano ka-$1 ang $2?" },
    { pattern: /^How clearly (.+?)\?$/i, replace: "Gaano kalinaw ang $1?" },
    { pattern: /^How quickly (.+?)\?$/i, replace: "Gaano kabilis ang $1?" },
    { pattern: /^How long (.+?)\?$/i, replace: "Gaano katagal ang $1?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Ilan ang $1?" },
    { pattern: /^How much do you trust (.+?)\?$/i, replace: "Gaano ka nagtitiwala sa $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Ano ang $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Alin ang $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Would you (.+?)\?$/i, replace: "Gusto mo bang $1?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Ilarawan ang $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Ikuwento mo ang tungkol sa $1." },
    { pattern: /^Explain (.+?)\.$/i, replace: "Ipaliwanag ang $1." },
    { pattern: /^Share your (.+?)\.$/i, replace: "Ibahagi ang $1." },
    { pattern: /^Please add any other comments or recommendations regarding (.+?)\.$/i, replace: "Magdagdag ng iba pang komento o rekomendasyon tungkol sa $1." },
  ],
  ceb: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Unsa ka kamalipay sa $1?" },
    { pattern: /^Overall, how would you rate the quality of (.+?)\?$/i, replace: "Sa kinatibuk-an, giunsa nimo pag-rate ang kalidad sa $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Giunsa nimo pag-rate ang $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Unsa ka sayon ang pag-access sa $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Unsa ka-$1 ang $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Unsa ka-$1 ang $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Pila ka $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Unsa ang $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Hain ang $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 ba?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Ilarawan ang $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isulti kanako ang bahin sa $1." },
    { pattern: /^Explain (.+?)\.$/i, replace: "Ipaliwanag ang $1." },
  ],
hil: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Pila ka ka-satisfied sa $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Paano mo i-rating ang $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Pila ka manami ang pag-access sa $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Pila ka-$1 ang $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Pila ka-$1 ang $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Pila ang $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Ano ang $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Diin ang $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 bala?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Isaysay ang $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isugid sa akon ang parte sa $1." },
  ],
  ilo: [
    { pattern: /^How satisfied are you with (.+?)\?$/i, replace: "Kasano ti pannakapnek mo iti $1?" },
    { pattern: /^How would you rate (.+?)\?$/i, replace: "Kasano ti panang-rate mo iti $1?" },
    { pattern: /^How easy is it to access (.+?)\?$/i, replace: "Kasano ti kinalaka ti panag-access iti $1?" },
    { pattern: /^How (\w+) is (.+?)\?$/i, replace: "Kasano ka-$1 ti $2?" },
    { pattern: /^How (\w+) are (.+?)\?$/i, replace: "Kasano ka-$1 dagiti $2?" },
    { pattern: /^How many (.+?)\?$/i, replace: "Mano ti $1?" },
    { pattern: /^What (.+?)\?$/i, replace: "Ania ti $1?" },
    { pattern: /^Which (.+?)\?$/i, replace: "Ania ti $1?" },
    { pattern: /^Do (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Are (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Is (.+?)\?$/i, replace: "$1 kadi?" },
    { pattern: /^Describe (.+?)\.$/i, replace: "Iladawan ti $1." },
    { pattern: /^Tell me about (.+?)\.$/i, replace: "Isalaysay mo ti maipapan iti $1." },
  ],
};

/** Domain word map applied after phrase rules (meaning-preserving substitutions). */
export const WORD_MAP: Record<string, Record<string, string>> = {
  tl: {
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga kawani",
    information: "impormasyon",
    satisfaction: "kasiyahan",
    improvement: "pagpapabuti",
    trust: "tiwala",
    waiting: "paghihintay",
    time: "oras",
    facilities: "pasilidad",
    students: "mga mag-aaral",
    faculty: "mga guro",
    process: "proseso",
    communication: "komunikasyon",
    recommendation: "rekomendasyon",
    security: "seguridad",
    privacy: "pribasiya",
  },
  ceb: {
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga trabahante",
    information: "impormasyon",
    satisfaction: "katagbawan",
    improvement: "pagpauswag",
    trust: "pagsalig",
    time: "oras",
    facilities: "pasilidad",
    students: "mga estudyante",
    process: "proseso",
  },
  hil: {
    service: "serbisyo",
    services: "mga serbisyo",
    quality: "kalidad",
    staff: "mga trabahador",
    information: "impormasyon",
    satisfaction: "kakontento",
    improvement: "pauswag",
    trust: "pagsalig",
    students: "mga estudyante",
  },
  ilo: {
    service: "serbisio",
    services: "dagiti serbisio",
    quality: "kalidad",
    staff: "dagiti trabahador",
    information: "impormasion",
    satisfaction: "pannakapnek",
    improvement: "panagpasayaat",
    trust: "panagtalek",
    students: "dagiti estudiante",
  },
};

export type TranslationResult = { text: string; applied: number; strategy: "phrase+word" | "word" | "none" };

/** Applies phrase rules then the word map. Topic nouns are preserved verbatim. */
export function phraseTranslate(text: string, language: string): TranslationResult {
  if (language === "en" || !language) return { text, applied: 0, strategy: "none" };
  const rules = PHRASE_RULES[language];
  if (!rules) return { text, applied: 0, strategy: "none" };

  let output = text;
  let phraseApplied = 0;
  for (const rule of rules) {
    if (rule.pattern.test(output)) {
      output = output.replace(rule.pattern, rule.replace);
      phraseApplied = 1;
      break;
    }
  }

  const words = WORD_MAP[language];
  let wordApplied = 0;
  if (words) {
    output = output.replace(/\b([A-Za-z]+)\b/g, (match) => {
      const replacement = words[match.toLowerCase()];
      if (!replacement) return match;
      wordApplied += 1;
      return replacement;
    });
  }

  const strategy: TranslationResult["strategy"] =
    phraseApplied || wordApplied ? (phraseApplied && wordApplied ? "phrase+word" : phraseApplied ? "phrase+word" : "word") : "none";
  return { text: output, applied: phraseApplied + wordApplied, strategy };
}

export function supportedTranslationLanguages() {
  return Object.keys(PHRASE_RULES);
}