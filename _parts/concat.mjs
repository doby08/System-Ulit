import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const read = (p) => readFileSync(p, "utf8");
const write = (p, content) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
};

const cleanEntries = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/export const QUESTION_FRAMES[\s\S]*?=/, "")
    .replace(/^\s*\[/, "")
    .replace(/\]\s*;?\s*$/, "")
    .trim();

const frameEntries = ["_parts/frames_b.txt", "_parts/frames_c.txt", "_parts/frames_d.txt"]
  .map((p) => cleanEntries(read(p)))
  .join("\n");

write(
  "src/lib/ai/frames.ts",
  [
    read("_parts/frames_a.txt"),
    "export const QUESTION_FRAMES: QuestionFrame[] = [",
    frameEntries,
    "];",
    "",
  ].join("\n"),
);

write(
  "src/lib/ai/translate-dictionary.ts",
  ["_parts/td_a.txt", "_parts/td_b.txt"].map(read).join(""),
);

write(
  "src/lib/ai/lexicon.ts",
  ["_parts/lex_a.txt", "_parts/lex_b.txt", "_parts/lex_c.txt"].map(read).join("\n"),
);

const corpusHeader = `import {
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

`;

write("src/lib/ai/corpus.ts", corpusHeader + read("_parts/lex_d.txt"));

write("src/lib/ai/local-engine.ts", ["_parts/le_a.txt", "_parts/le_b.txt"].map(read).join("\n"));
write("src/lib/ai/questions.ts", ["_parts/q_a.txt", "_parts/q_b.txt", "_parts/q_c.txt"].map(read).join("\n\n"));
write("src/lib/ai/follow-up.ts", ["_parts/fu_a.txt", "_parts/fu_b.txt"].map(read).join("\n\n"));

write("src/lib/server/validation.ts", ["_parts/val_a.txt", "_parts/val_b.txt"].map(read).join("\n\n"));
write(
  "src/lib/server/serializers.ts",
  ["_parts/ser_a.txt", "_parts/ser_b.txt", "_parts/ser_c.txt", "_parts/ser_d.txt"].map(read).join("\n\n"),
);
write("src/lib/server/questions.ts", ["_parts/sv_a.txt", "_parts/sv_b.txt"].map(read).join("\n\n"));
write(
  "src/lib/server/surveys.ts",
  ["_parts/sur_a.txt", "_parts/sur_b.txt", "_parts/sur_c.txt", "_parts/sur_d.txt", "_parts/sur_e.txt", "_parts/sur_f.txt"]
    .map(read)
    .join("\n\n"),
);
write(
  "src/lib/server/submission.ts",
  ["_parts/sub_a.txt", "_parts/sub_b.txt", "_parts/sub_c.txt", "_parts/sub_d.txt", "_parts/sub_e.txt"]
    .map(read)
    .join("\n\n"),
);

write(
  "src/lib/server/analytics.ts",
  ["_parts/an_a.txt", "_parts/an_b.txt", "_parts/an_c.txt", "_parts/an_d.txt", "_parts/an_e.txt", "_parts/an_f.txt"]
    .map(read)
    .join("\n\n"),
);
write(
  "src/lib/server/reports.ts",
  ["_parts/rep_a.txt", "_parts/rep_b.txt", "_parts/rep_c.txt", "_parts/rep_d.txt", "_parts/rep_e.txt"]
    .map(read)
    .join("\n\n"),
);
write("src/lib/server/public-survey.ts", read("_parts/pub_a.txt"));
write(
  "prisma/seed.ts",
  ["_parts/seed_a.txt", "_parts/seed_b.txt", "_parts/seed_c.txt", "_parts/seed_d.txt", "_parts/seed_e.txt", "_parts/seed_f.txt"]
    .map(read)
    .join("\n\n"),
);
console.log("[concat] all server libraries assembled");