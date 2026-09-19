/**
 * Central domain constants — interview methods, modes, languages, question types,
 * Likert scales, statuses, demographics and navigation.
 * Client-safe (no server imports).
 */
import { LIKERT_LABELS } from "@/lib/likert";

export const APP_NAME = "InterviewAI";
export const APP_FULL_NAME = "AI Interview Assistance & Survey Instrument System";
export const APP_VERSION = "2026.1.0";
export const MAX_QUESTIONS_PER_SURVEY = 50;
export const MIN_QUESTIONS_PER_SURVEY = 1;

/* -------------------------------------------------------------------------- */
/* Interview methods (EXACTLY three, per specification)                        */
/* -------------------------------------------------------------------------- */
export const INTERVIEW_METHODS = [
  {
    value: "STRUCTURED",
    label: "Structured Interview",
    short: "Structured",
    description:
      "Fixed question set presented in a controlled order. Ideal for standardized, comparable data (multiple choice, Yes/No, rating, Likert, short answer).",
    accent: "from-blue-500 to-cyan-400",
    badge: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  },
  {
    value: "SEMI_STRUCTURED",
    label: "Semi-Structured Interview",
    short: "Semi-Structured",
    description:
      "Prepared core questions with optional AI follow-up probes generated from the respondent's previous answer.",
    accent: "from-indigo-500 to-violet-500",
    badge: "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
  },
  {
    value: "UNSTRUCTURED",
    label: "Unstructured Interview",
    short: "Unstructured",
    description:
      "Open-ended conversational responses with AI analysis of sentiment, keywords, themes, pain points and suggestions.",
    accent: "from-purple-500 to-fuchsia-500",
    badge: "border-purple-400/30 bg-purple-500/10 text-purple-200",
  },
] as const;

export type InterviewMethod = (typeof INTERVIEW_METHODS)[number]["value"];

export const INTERVIEW_METHOD_VALUES = INTERVIEW_METHODS.map((m) => m.value) as InterviewMethod[];

export function interviewMethodMeta(value?: string | null) {
  return INTERVIEW_METHODS.find((m) => m.value === value) ?? INTERVIEW_METHODS[0];
}

/* -------------------------------------------------------------------------- */
/* Interview modes                                                             */
/* -------------------------------------------------------------------------- */
export const INTERVIEW_MODES = [
  {
    value: "INDIVIDUAL",
    label: "Individual",
    description: "One respondent per session — complete per-respondent tracking.",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    value: "GROUP",
    label: "Group",
    description: "Multiple respondents in one session with group name, members, session notes and group summary.",
    accent: "from-emerald-500 to-teal-400",
  },
  {
    value: "RANDOM",
    label: "Random",
    description: "Randomized order, random subset or random question-set assignment — always from the prepared question pool.",
    accent: "from-amber-500 to-orange-400",
  },
] as const;

export type InterviewMode = (typeof INTERVIEW_MODES)[number]["value"];
export const INTERVIEW_MODE_VALUES = INTERVIEW_MODES.map((m) => m.value) as InterviewMode[];

export function interviewModeMeta(value?: string | null) {
  return INTERVIEW_MODES.find((m) => m.value === value) ?? INTERVIEW_MODES[0];
}

/* -------------------------------------------------------------------------- */
/* Languages (context-aware translation support)                               */
/* -------------------------------------------------------------------------- */
export const LANGUAGES = [
  { code: "en", label: "English", native: "English", flag: "🇺🇸" },
  { code: "tl", label: "Tagalog", native: "Tagalog", flag: "🇵🇭" },
  { code: "ceb", label: "Cebuano", native: "Cebuano", flag: "🇵🇭" },
  { code: "hil", label: "Hiligaynon", native: "Hiligaynon", flag: "🇵🇭" },
  { code: "ilo", label: "Ilocano", native: "Ilocano", flag: "🇵🇭" },
] as const;

export function languageLabel(code?: string | null) {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.label : (code ?? "English").toUpperCase();
}

export function languageNative(code?: string | null) {
  const found = LANGUAGES.find((l) => l.code === code);
  return found ? found.native : (code ?? "English");
}

/* -------------------------------------------------------------------------- */
/* Question types                                                              */
/* -------------------------------------------------------------------------- */
export const QUESTION_TYPES = [
  { value: "LIKERT_5", label: "Likert Scale · 5-point", group: "Scale", supportsOptions: false, likert: 5 },
  { value: "LIKERT_7", label: "Likert Scale · 7-point", group: "Scale", supportsOptions: false, likert: 7 },
  { value: "RATING", label: "Rating (1–5 stars)", group: "Scale", supportsOptions: false },
  { value: "YES_NO", label: "Yes / No", group: "Closed", supportsOptions: false },
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice (single)", group: "Closed", supportsOptions: true },
  { value: "MULTI_SELECT", label: "Multiple Choice (multi-select)", group: "Closed", supportsOptions: true },
  { value: "SHORT_TEXT", label: "Short Answer", group: "Open", supportsOptions: false },
  { value: "LONG_TEXT", label: "Long / Open-ended Answer", group: "Open", supportsOptions: false },
  { value: "NUMBER", label: "Number", group: "Open", supportsOptions: false },
  { value: "DATE", label: "Date", group: "Open", supportsOptions: false },
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];
export const QUESTION_TYPE_VALUES = QUESTION_TYPES.map((q) => q.value) as QuestionType[];

export function questionTypeMeta(value?: string | null) {
  return QUESTION_TYPES.find((q) => q.value === value) ?? QUESTION_TYPES[6];
}

export function isLikertType(type?: string | null) {
  return type === "LIKERT_5" || type === "LIKERT_7";
}

export function isOpenTextType(type?: string | null) {
  return type === "SHORT_TEXT" || type === "LONG_TEXT";
}

export function likertScaleFor(type?: string | null, fallback?: number | null) {
  if (type === "LIKERT_5") return 5;
  if (type === "LIKERT_7") return 7;
  if (fallback === 5 || fallback === 7) return fallback;
  return 5;
}

export function likertLabelsFor(scale: number, language = "en") {
  const languageSet = LIKERT_LABELS[language] ?? LIKERT_LABELS.en;
  return languageSet[scale === 7 ? 7 : 5];
}

/* -------------------------------------------------------------------------- */
/* Scales, difficulty, categories                                              */
/* -------------------------------------------------------------------------- */
export const LIKERT_SCALE_OPTIONS = [
  { value: 5, label: "5-point Likert Scale", description: "Strongly Disagree → Strongly Agree" },
  { value: 7, label: "7-point Likert Scale", description: "Strongly Disagree → Strongly Agree (granular)" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "EASY", label: "Easy", color: "text-emerald-300 border-emerald-400/30 bg-emerald-500/10" },
  { value: "MEDIUM", label: "Medium", color: "text-amber-300 border-amber-400/30 bg-amber-500/10" },
  { value: "HARD", label: "Hard", color: "text-rose-300 border-rose-400/30 bg-rose-500/10" },
] as const;

export const QUESTION_CATEGORIES = [
  "Satisfaction",
  "Service Quality",
  "Accessibility",
  "Communication",
  "Facilities",
  "Staff & Support",
  "Digital Experience",
  "Process & Efficiency",
  "Awareness",
  "Trust & Safety",
  "Recommendation",
  "Improvement",
  "Demographics",
  "General",
] as const;

export function categoryColor(category?: string | null) {
  const palette = [
    "border-blue-400/30 bg-blue-500/10 text-blue-200",
    "border-indigo-400/30 bg-indigo-500/10 text-indigo-200",
    "border-purple-400/30 bg-purple-500/10 text-purple-200",
    "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
    "border-teal-400/30 bg-teal-500/10 text-teal-200",
    "border-amber-400/30 bg-amber-500/10 text-amber-200",
    "border-rose-400/30 bg-rose-500/10 text-rose-200",
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  ];
  if (!category) return palette[0];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 33 + category.charCodeAt(i)) % 9973;
  return palette[hash % palette.length];
}

/* -------------------------------------------------------------------------- */
/* Stakeholders & demographics                                                 */
/* -------------------------------------------------------------------------- */
export const STAKEHOLDER_TYPES = [
  "Students",
  "Faculty",
  "Non-teaching Staff",
  "Parents / Guardians",
  "Alumni",
  "Employers",
  "Customers",
  "Citizens / Residents",
  "Employees",
  "Beneficiaries",
  "Community Members",
  "Suppliers / Partners",
  "Other Stakeholders",
] as const;

export const AGE_GROUPS = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65 and above",
  "Prefer not to say",
] as const;

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"] as const;

export const DEMOGRAPHIC_FIELDS = [
  { key: "name", label: "Name", type: "text", defaultEnabled: true },
  { key: "respondentCode", label: "Respondent ID", type: "text", defaultEnabled: true },
  { key: "ageGroup", label: "Age group", type: "select", defaultEnabled: true },
  { key: "gender", label: "Gender", type: "select", defaultEnabled: false },
  { key: "location", label: "Location", type: "text", defaultEnabled: false },
  { key: "organization", label: "Organization / Affiliation", type: "text", defaultEnabled: false },
  { key: "email", label: "Email address", type: "text", defaultEnabled: false },
  { key: "phone", label: "Contact number", type: "text", defaultEnabled: false },
] as const;

/* -------------------------------------------------------------------------- */
/* Statuses                                                                    */
/* -------------------------------------------------------------------------- */
export const SURVEY_STATUSES = [
  { value: "DRAFT", label: "Draft", color: "border-slate-400/30 bg-slate-500/10 text-slate-200" },
  { value: "PUBLISHED", label: "Published", color: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" },
  { value: "CLOSED", label: "Closed", color: "border-amber-400/30 bg-amber-500/10 text-amber-200" },
  { value: "ARCHIVED", label: "Archived", color: "border-slate-500/30 bg-slate-700/20 text-slate-400" },
] as const;

export function surveyStatusMeta(value?: string | null) {
  return SURVEY_STATUSES.find((s) => s.value === value) ?? SURVEY_STATUSES[0];
}

export const SYNC_STATES = [
  { value: "ONLINE", label: "Online", color: "text-emerald-300", dot: "bg-emerald-400" },
  { value: "OFFLINE", label: "Offline", color: "text-rose-300", dot: "bg-rose-400" },
  { value: "SYNCING", label: "Syncing", color: "text-cyan-300", dot: "bg-cyan-400" },
  { value: "SYNCED", label: "Synced", color: "text-emerald-300", dot: "bg-emerald-400" },
  { value: "PENDING", label: "Sync pending", color: "text-amber-300", dot: "bg-amber-400" },
  { value: "FAILED", label: "Sync failed", color: "text-rose-300", dot: "bg-rose-400" },
  { value: "CONFLICT", label: "Conflict", color: "text-orange-300", dot: "bg-orange-400" },
] as const;

export function syncStateMeta(value?: string | null) {
  return SYNC_STATES.find((s) => s.value === value) ?? SYNC_STATES[0];
}

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */
export const SIDEBAR_NAV = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard", description: "Live operational overview" },
  { href: "/admin/surveys/new", label: "Create Interview/Survey", icon: "Plus", description: "AI-assisted builder" },
  { href: "/admin/surveys", label: "My Interviews & Surveys", icon: "ClipboardList", description: "Manage & publish" },
  { href: "/admin/sessions", label: "Active Sessions", icon: "Activity", description: "Live interview sessions" },
  { href: "/admin/respondents", label: "Respondents", icon: "Users", description: "Respondent directory" },
  { href: "/admin/question-bank", label: "Question Bank", icon: "Library", description: "Reusable validated questions" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3", description: "Real-time response analytics" },
  { href: "/admin/ai-insights", label: "AI Insights", icon: "Sparkles", description: "Sentiment, themes & summary" },
  { href: "/admin/qr-codes", label: "QR Interview", icon: "QrCode", description: "Publish & share surveys" },
  { href: "/admin/offline-sync", label: "Offline Data & Sync", icon: "RefreshCw", description: "Sync status & conflicts" },
  { href: "/admin/reports", label: "Reports", icon: "FileText", description: "PDF / Word / Excel reports" },
  { href: "/admin/settings", label: "Settings", icon: "Settings", description: "Profile, security, AI" },
] as const;

export const SIDEBAR_SECONDARY_NAV = [
  { href: "/admin/help", label: "Help & Support", icon: "LifeBuoy", description: "Guides & troubleshooting" },
  { href: "/admin/profile", label: "My Profile", icon: "Users", description: "Account & preferences" },
] as const;

export const QUICK_ACTIONS = [
  { href: "/admin/surveys/new", label: "Create Interview/Survey", icon: "Plus", accent: "from-blue-500 to-cyan-400" },
  { href: "/admin/question-bank", label: "Question Bank", icon: "Library", accent: "from-cyan-500 to-teal-400" },
  { href: "/admin/analytics", label: "Analytics", icon: "BarChart3", accent: "from-amber-500 to-orange-400" },
  { href: "/admin/qr-codes", label: "QR Interview", icon: "QrCode", accent: "from-purple-500 to-fuchsia-500" },
  { href: "/admin/offline-sync", label: "Offline & Sync", icon: "RefreshCw", accent: "from-sky-500 to-blue-500" },
  { href: "/admin/reports", label: "Reports", icon: "FileText", accent: "from-rose-500 to-pink-500" },
] as const;

export const REPORT_TYPES = [
  { value: "SUMMARY", label: "Summary Report", description: "Executive overview with key metrics, charts and AI summary." },
  { value: "DETAILED", label: "Detailed Report", description: "Every question, distribution, Likert scoring and raw responses." },
  { value: "COMPARATIVE", label: "Comparative Report", description: "Compare respondent groups, interview methods and time periods." },
] as const;

export function reportTypeMeta(value?: string | null) {
  return REPORT_TYPES.find((r) => r.value === value) ?? REPORT_TYPES[0];
}