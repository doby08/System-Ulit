/**
 * Question frame library + topic parsing used by the built-in offline AI engine.
 * Frames are topic-agnostic and interpolated with a parsed topic context so that
 * generated questions stay relevant to the administrator's prepared topic,
 * stakeholder, interview method, interview mode and language.
 */

export type FrameInteraction =
  | "SATISFACTION"
  | "QUALITY"
  | "ACCESS"
  | "COMMUNICATION"
  | "STAFF"
  | "FACILITIES"
  | "PROCESS"
  | "AWARENESS"
  | "TRUST"
  | "IMPROVEMENT"
  | "RECOMMENDATION"
  | "COMPARATIVE"
  | "BEHAVIOUR";

export type QuestionFrame = {
  id: string;
  category: string;
  type: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  text: string;
  options?: string[];
  tags: string[];
  interaction: FrameInteraction;
};

export type TopicContext = {
  topic: string;
  /** Primary subject noun phrase, e.g. "university services". */
  subject: string;
  /** Capitalised subject for sentence-initial use. */
  subjectCap: string;
  /** Stakeholder plural, lower-case, e.g. "students". */
  stakeholder: string;
  /** Stakeholder singular-ish for "as a ..." constructs. */
  stakeholderOne: string;
  fullTopic: string;
};

const LEAD_IN =
  /^(student|faculty|staff|parent|alumni|employer|customer|citizen|employee|beneficiary|community|supplier|respondent|client|patient|user)s?\s+/i;
const SATISFACTION_PREFIX =
  /(satisfaction|perception|feedback|assessment|evaluation|experience|views?|opinions?|attitudes?|sentiments?|insights?|study|survey|interview|analysis|level of\s+\w+)\s*(with|on|about|of|regarding|toward|towards|for)\s+/i;

/**
 * Extracts the real subject of a topic so questions read naturally.
 * "Student Satisfaction with University Services" -> subject "university services".
 */
export function parseTopic(topic: string, stakeholder: string): TopicContext {
  const cleanTopic = (topic || "the service").trim().replace(/\s+/g, " ");
  let subject = cleanTopic;

  const prefixMatch = cleanTopic.match(SATISFACTION_PREFIX);
  if (prefixMatch) {
    const afterPrefix = cleanTopic.slice((prefixMatch.index ?? 0) + prefixMatch[0].length).trim();
    if (afterPrefix.length > 3) subject = afterPrefix;
  } else {
    const withoutLead = cleanTopic.replace(LEAD_IN, "").trim();
    if (withoutLead.length > 3) subject = withoutLead;
  }

  subject = subject.replace(/[.?!]+$/, "").trim();
  if (!subject) subject = cleanTopic;

  const lower = subject.charAt(0).toLowerCase() + subject.slice(1);
  const stakeholderPlural = (stakeholder || "respondents").toLowerCase();
  const stakeholderOne = stakeholderPlural
    .replace(/\s*\/.*$/, "")
    .replace(/ies$/, "y")
    .replace(/s$/, "")
    .trim();

  return {
    topic: cleanTopic,
    subject: lower,
    subjectCap: lower.charAt(0).toUpperCase() + lower.slice(1),
    stakeholder: stakeholderPlural,
    stakeholderOne: stakeholderOne || "respondent",
    fullTopic: cleanTopic,
  };
}

export function interpolate(frame: string, ctx: TopicContext) {
  return frame
    .replace(/\{subjectCap\}/g, ctx.subjectCap)
    .replace(/\{subject\}/g, ctx.subject)
    .replace(/\{topic\}/g, ctx.topic)
    .replace(/\{stakeholder\}/g, ctx.stakeholder)
    .replace(/\{stakeholderOne\}/g, ctx.stakeholderOne)
    .replace(/\s+([.?!])/g, "$1")
    .trim();
}

/** Rewrites a closed question into an open-ended conversational prompt. */
export function toConversationalPrompt(text: string, ctx: TopicContext) {
  const t = text.trim();
  const rewrite = (regex: RegExp, replacement: string) => {
    const m = t.match(regex);
    return m ? replacement.replace(/\$1/g, m[1] ?? ctx.subject).replace(/\$2/g, m[2] ?? ctx.subject) : null;
  };
  return (
    rewrite(/^how satisfied are you with (.+?)\?$/i, "Tell me about your level of satisfaction with $1.") ??
    rewrite(/^overall, how would you rate the quality of (.+?)\?$/i, "Describe the quality of $1 in your own words.") ??
    rewrite(/^how would you rate the (.+?) of (.+?)\?$/i, "Share your assessment of the $1 of $2.") ??
    rewrite(/^how would you rate (.+?)\?$/i, "Talk me through your assessment of $1.") ??
    rewrite(/^how easy is it to access (.+?)\?$/i, "Describe your experience of accessing $1.") ??
    rewrite(/^how (\w+) (?:is|are) (.+?)\?$/i, "Explain how $1 $2 are, based on your own experience.") ??
    rewrite(/^how (?:much|many) (.+?)\?$/i, "Elaborate on $1.") ??
    rewrite(/^(?:would|do|did|is|are|can|have|has) (.+?)\?$/i, "Tell me more about this: $1?") ??
    `In your own words, what are your thoughts on: ${t.replace(/\?$/, "")}?`
  );
}

const BASE_OPTIONS = {
  channels: [
    "Email",
    "Text / SMS",
    "Social media",
    "Official website",
    "Printed materials",
    "In person",
    "Phone call",
    "Others",
  ],
  frequency: ["Daily", "Weekly", "Monthly", "A few times a year", "Rarely", "Never"],
  waiting: [
    "Under 15 minutes",
    "15–30 minutes",
    "30–60 minutes",
    "1–2 hours",
    "More than 2 hours",
    "More than a day",
  ],
  platform: [
    "Mobile app",
    "Website",
    "Physical office / counter",
    "Phone / hotline",
    "Chat or messaging",
    "Others",
  ],
  none: ["None of the above"],
};

export const QUESTION_FRAMES: QuestionFrame[] = [
{ id: "sat-1", category: "Satisfaction", type: "LIKERT_5", difficulty: "EASY", interaction: "SATISFACTION", tags: ["satisfaction", "core"], text: "How satisfied are you with {subject}?" },
  { id: "sat-2", category: "Satisfaction", type: "RATING", difficulty: "EASY", interaction: "SATISFACTION", tags: ["rating", "core"], text: "Overall, how would you rate the quality of {subject}?" },
  { id: "sat-3", category: "Satisfaction", type: "LIKERT_5", difficulty: "EASY", interaction: "SATISFACTION", tags: ["expectations"], text: "The {subject} consistently meet my needs and expectations." },
  { id: "sat-4", category: "Satisfaction", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "SATISFACTION", tags: ["value"], text: "The {subject} provide good value for the time and effort I invest." },
  { id: "sat-5", category: "Satisfaction", type: "LIKERT_7", difficulty: "MEDIUM", interaction: "SATISFACTION", tags: ["overall"], text: "Overall, I am satisfied with the quality of {subject}." },
  { id: "qual-1", category: "Service Quality", type: "RATING", difficulty: "EASY", interaction: "QUALITY", tags: ["reliability"], text: "How would you rate the reliability of {subject}?" },
  { id: "qual-2", category: "Service Quality", type: "RATING", difficulty: "EASY", interaction: "QUALITY", tags: ["responsiveness"], text: "How would you rate the responsiveness of {subject}?" },
  { id: "qual-3", category: "Service Quality", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "QUALITY", tags: ["timeliness"], text: "{subjectCap} are delivered within a reasonable time." },
  { id: "qual-4", category: "Service Quality", type: "LIKERT_7", difficulty: "MEDIUM", interaction: "QUALITY", tags: ["consistency"], text: "The quality of {subject} is consistent across every interaction." },
  { id: "qual-5", category: "Service Quality", type: "YES_NO", difficulty: "EASY", interaction: "QUALITY", tags: ["standards"], text: "Do {subject} meet the standards you expect from them?" },
  { id: "acc-1", category: "Accessibility", type: "LIKERT_5", difficulty: "EASY", interaction: "ACCESS", tags: ["access"], text: "How easy is it to access {subject}?" },
  { id: "acc-2", category: "Accessibility", type: "LIKERT_5", difficulty: "EASY", interaction: "ACCESS", tags: ["availability"], text: "How convenient are the operating hours or availability of {subject}?" },
  { id: "acc-3", category: "Accessibility", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "ACCESS", tags: ["reachability"], text: "I can reach {subject} without difficulty whenever I need them." },
  { id: "acc-4", category: "Accessibility", type: "YES_NO", difficulty: "EASY", interaction: "ACCESS", tags: ["availability"], text: "Are {subject} readily available to {stakeholder}?" },
  { id: "acc-5", category: "Accessibility", type: "RATING", difficulty: "MEDIUM", interaction: "ACCESS", tags: ["inclusion"], text: "How would you rate the accessibility of {subject} for persons with disabilities?" },
  { id: "acc-6", category: "Accessibility", type: "MULTIPLE_CHOICE", difficulty: "MEDIUM", interaction: "ACCESS", tags: ["channel"], options: BASE_OPTIONS.platform, text: "Through which channel do you usually access {subject}?" },
  { id: "com-1", category: "Communication", type: "LIKERT_5", difficulty: "EASY", interaction: "COMMUNICATION", tags: ["clarity"], text: "How clearly is information about {subject} communicated to {stakeholder}?" },
  { id: "com-2", category: "Communication", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "COMMUNICATION", tags: ["timeliness"], text: "How quickly do you receive updates regarding {subject}?" },
  { id: "com-3", category: "Communication", type: "MULTI_SELECT", difficulty: "MEDIUM", interaction: "COMMUNICATION", tags: ["channels"], options: BASE_OPTIONS.channels, text: "Which communication channels do you use to learn about {subject}?" },
  { id: "com-4", category: "Communication", type: "YES_NO", difficulty: "EASY", interaction: "COMMUNICATION", tags: ["clarity"], text: "Is the information about {subject} easy to understand?" },
  { id: "com-5", category: "Communication", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "COMMUNICATION", tags: ["feedback"], text: "I receive a clear response whenever I raise concerns about {subject}." },
{ id: "stf-1", category: "Staff & Support", type: "RATING", difficulty: "EASY", interaction: "STAFF", tags: ["courtesy"], text: "How would you rate the courtesy and professionalism of the staff handling {subject}?" },
  { id: "stf-2", category: "Staff & Support", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "STAFF", tags: ["competence"], text: "The staff are knowledgeable when {stakeholder} ask about {subject}." },
  { id: "stf-3", category: "Staff & Support", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "STAFF", tags: ["resolution"], text: "Staff resolve concerns related to {subject} promptly." },
  { id: "stf-4", category: "Staff & Support", type: "MULTIPLE_CHOICE", difficulty: "MEDIUM", interaction: "STAFF", tags: ["experience"], options: ["Excellent", "Good", "Fair", "Poor", "Very poor"], text: "How would you describe your overall experience with the staff supporting {subject}?" },
  { id: "fac-1", category: "Facilities", type: "RATING", difficulty: "EASY", interaction: "FACILITIES", tags: ["environment"], text: "How would you rate the facilities or environment associated with {subject}?" },
  { id: "fac-2", category: "Digital Experience", type: "RATING", difficulty: "EASY", interaction: "FACILITIES", tags: ["digital"], text: "How would you rate the digital platforms used for {subject}?" },
  { id: "fac-3", category: "Digital Experience", type: "LIKERT_5", difficulty: "EASY", interaction: "FACILITIES", tags: ["usability"], text: "The digital tools used for {subject} are easy to use." },
  { id: "fac-4", category: "Digital Experience", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "FACILITIES", tags: ["uptime"], text: "The digital systems supporting {subject} are available whenever I need them." },
  { id: "pro-1", category: "Process & Efficiency", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "PROCESS", tags: ["efficiency"], text: "How efficient is the process of availing {subject}?" },
  { id: "pro-2", category: "Process & Efficiency", type: "MULTIPLE_CHOICE", difficulty: "EASY", interaction: "PROCESS", tags: ["waiting"], options: BASE_OPTIONS.waiting, text: "How long do you usually wait before receiving {subject}?" },
  { id: "pro-3", category: "Process & Efficiency", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "PROCESS", tags: ["waiting"], text: "The waiting time involved in {subject} is acceptable." },
  { id: "pro-4", category: "Process & Efficiency", type: "NUMBER", difficulty: "MEDIUM", interaction: "PROCESS", tags: ["steps"], text: "How many steps or visits are normally required to complete a transaction involving {subject}?" },
  { id: "pro-5", category: "Process & Efficiency", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "PROCESS", tags: ["clarity"], text: "The requirements and procedures for {subject} are clear and easy to follow." },
{ id: "awa-1", category: "Awareness", type: "LIKERT_5", difficulty: "EASY", interaction: "AWARENESS", tags: ["awareness"], text: "How aware are you of the {subject} available to {stakeholder}?" },
  { id: "awa-2", category: "Awareness", type: "MULTI_SELECT", difficulty: "MEDIUM", interaction: "AWARENESS", tags: ["awareness"], options: ["Offered online", "Offered on-site", "Outreach activities", "Promotional campaigns", ...BASE_OPTIONS.none], text: "Which aspects of {subject} are you already aware of?" },
  { id: "awa-3", category: "Awareness", type: "LIKERT_5", difficulty: "EASY", interaction: "AWARENESS", tags: ["navigation"], text: "I know exactly where to ask questions about {subject}." },
  { id: "awa-4", category: "Awareness", type: "MULTIPLE_CHOICE", difficulty: "EASY", interaction: "AWARENESS", tags: ["frequency"], options: BASE_OPTIONS.frequency, text: "How frequently do you use {subject}?" },
  { id: "tru-1", category: "Trust & Safety", type: "LIKERT_7", difficulty: "MEDIUM", interaction: "TRUST", tags: ["fairness"], text: "How much do you trust {subject} to handle your concerns fairly?" },
  { id: "tru-2", category: "Trust & Safety", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "TRUST", tags: ["safety"], text: "How safe or secure do you feel when dealing with {subject}?" },
  { id: "tru-3", category: "Trust & Safety", type: "LIKERT_5", difficulty: "HARD", interaction: "TRUST", tags: ["privacy"], text: "My personal information is handled responsibly in transactions involving {subject}." },
  { id: "imp-1", category: "Improvement", type: "SHORT_TEXT", difficulty: "EASY", interaction: "IMPROVEMENT", tags: ["improvement", "priority"], text: "What aspect of {subject} needs the most improvement?" },
  { id: "imp-2", category: "Improvement", type: "LONG_TEXT", difficulty: "MEDIUM", interaction: "IMPROVEMENT", tags: ["challenge"], text: "What is the biggest challenge you experience with {subject}?" },
  { id: "imp-3", category: "Improvement", type: "LONG_TEXT", difficulty: "MEDIUM", interaction: "IMPROVEMENT", tags: ["suggestion"], text: "What suggestions can you give to improve {subject}?" },
  { id: "imp-4", category: "Improvement", type: "LONG_TEXT", difficulty: "HARD", interaction: "IMPROVEMENT", tags: ["change"], text: "If you could change one thing about {subject}, what would it be?" },
  { id: "imp-5", category: "Improvement", type: "LONG_TEXT", difficulty: "MEDIUM", interaction: "IMPROVEMENT", tags: ["experience"], text: "Describe the most recent positive experience you had with {subject}." },
  { id: "imp-6", category: "Improvement", type: "LONG_TEXT", difficulty: "HARD", interaction: "IMPROVEMENT", tags: ["experience", "pain"], text: "Describe a recent experience with {subject} that frustrated you." },
  { id: "imp-7", category: "Improvement", type: "LONG_TEXT", difficulty: "MEDIUM", interaction: "IMPROVEMENT", tags: ["expectation"], text: "What additional {subject} would you like to see offered in the future?" },
  { id: "rec-1", category: "Recommendation", type: "RATING", difficulty: "EASY", interaction: "RECOMMENDATION", tags: ["advocacy"], text: "How likely are you to recommend {subject} to other {stakeholder}?" },
  { id: "rec-2", category: "Recommendation", type: "LIKERT_5", difficulty: "EASY", interaction: "RECOMMENDATION", tags: ["advocacy"], text: "I would encourage other {stakeholder} to use {subject}." },
  { id: "rec-3", category: "Recommendation", type: "YES_NO", difficulty: "EASY", interaction: "RECOMMENDATION", tags: ["loyalty"], text: "Would you use {subject} again in the future?" },
  { id: "cmp-1", category: "Comparative", type: "LIKERT_5", difficulty: "MEDIUM", interaction: "COMPARATIVE", tags: ["trend"], text: "Compared to a year ago, {subject} have improved." },
  { id: "cmp-2", category: "Comparative", type: "LIKERT_7", difficulty: "HARD", interaction: "COMPARATIVE", tags: ["benchmark"], text: "Compared with similar providers or institutions, how would you rate {subject}?" },
  { id: "beh-1", category: "General", type: "LIKERT_5", difficulty: "EASY", interaction: "BEHAVIOUR", tags: ["relevance"], text: "How relevant are {subject} to your needs as {stakeholderOne}?" },
  { id: "beh-2", category: "General", type: "DATE", difficulty: "EASY", interaction: "BEHAVIOUR", tags: ["recency"], text: "When did you last use or receive {subject}?" },
  { id: "beh-3", category: "General", type: "NUMBER", difficulty: "MEDIUM", interaction: "BEHAVIOUR", tags: ["effort"], text: "On average, how many minutes do you spend on a single interaction involving {subject}?" },
  { id: "beh-4", category: "General", type: "LONG_TEXT", difficulty: "MEDIUM", interaction: "BEHAVIOUR", tags: ["motivation"], text: "What motivates you to keep using {subject}?" },
  { id: "beh-5", category: "General", type: "LONG_TEXT", difficulty: "HARD", interaction: "BEHAVIOUR", tags: ["retention"], text: "What would make you stop using {subject}?" },
  { id: "beh-6", category: "General", type: "LONG_TEXT", difficulty: "EASY", interaction: "IMPROVEMENT", tags: ["open"], text: "Please add any other comments or recommendations regarding {topic}." },
];
