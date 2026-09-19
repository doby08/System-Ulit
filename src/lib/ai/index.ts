/**
 * AI layer barrel export.
 * Everything here is SERVER-ONLY: it reads process.env.AI_* / OPENAI_API_KEY.
 */
export {
  aiModel,
  chatJson,
  chatText,
  hasOpenAIKey,
  resolveProvider,
  type ProviderMode,
} from "@/lib/ai/provider";
export {
  generateQuestionsOffline,
  generateSingleQuestionOffline,
  regenerateQuestionTextOffline,
  type GenerateOptions,
} from "@/lib/ai/local-engine";
export { generateQuestionSet, regenerateQuestion, type GenerateResult } from "@/lib/ai/questions";
export {
  buildLocalFollowUp,
  enrichAnswerText,
  generateFollowUp,
  type FollowUpInput,
  type FollowUpResult,
} from "@/lib/ai/follow-up";
export {
  isTranslationSupported,
  translateBatch,
  translateSurveyFields,
  translateText,
  TRANSLATION_LANGUAGE_CODES,
  type TranslateResult,
} from "@/lib/ai/translate";
export {
  analyzeOpenEnded,
  buildExecutiveSummary,
  enrichAnswersWithSentiment,
  type InsightOptions,
  type InsightResult,
} from "@/lib/ai/insights";
export { analyzeCorpus, type CorpusAnalysis } from "@/lib/ai/corpus";
export { parseTopic, type TopicContext } from "@/lib/ai/frames";
