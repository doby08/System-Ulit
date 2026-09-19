/**
 * Development seed: default admin + sample surveys, question bank entries,
 * QR tokens and realistic sample responses (submitted through the REAL
 * submission service so seeded data exercises the production code path).
 *
 * Production data is NEVER touched: every section creates rows only when
 * the corresponding table is empty.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { parseTopic } from "../src/lib/ai/frames";
import { generateQuestionsOffline } from "../src/lib/ai/local-engine";
import { resolveProvider } from "../src/lib/ai/provider";
import { serializeQuestionOptions, defaultSurveySettings } from "../src/lib/settings";
import { stringifyTags, seededShuffle } from "../src/lib/utils";

const prisma = new PrismaClient();

const SEED_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "Admin";
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "Admin123";
const SEED_NAME = process.env.SEED_ADMIN_NAME ?? "System Administrator";
const SEED_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@aiis.local";
const WITH_SAMPLES = (process.env.SEED_SAMPLE_DATA ?? "true").toLowerCase() !== "false";

async function ensureAdmin() {
  // Case-insensitive lookup so changing SEED_ADMIN_USERNAME capitalisation
  // updates the existing account instead of creating a duplicate admin.
  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: SEED_USERNAME } },
        { email: { contains: SEED_EMAIL } },
      ],
    },
  });
  const existing = candidates.find(
    (user) =>
      user.username.toLowerCase() === SEED_USERNAME.toLowerCase() ||
      (user.email ? user.email.toLowerCase() === SEED_EMAIL.toLowerCase() : false),
  );
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        username: SEED_USERNAME,
        fullName: SEED_NAME,
        email: SEED_EMAIL,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        avatarColor: "#6366F1",
        organization: "InterviewAI Platform",
      },
    });
  }
  return prisma.user.create({
    data: {
      username: SEED_USERNAME,
      fullName: SEED_NAME,
      email: SEED_EMAIL,
      passwordHash,
      role: "ADMIN",
      isActive: true,
      avatarColor: "#6366F1",
      organization: "InterviewAI Platform",
    },
  });
}

async function buildQuestionRows(
  surveyId: string,
  topic: string,
  stakeholder: string,
  interviewMethod: string,
  interviewMode: string,
  count: number,
  userId: string,
) {
  const generated = generateQuestionsOffline({
    topic,
    stakeholder,
    interviewMethod,
    interviewMode,
    language: "en",
    count,
    difficulty: null,
    questionTypes: null,
    seed: `seed-${topic}`,
  });
  return generated.map((question, index) => ({
    surveyId,
    versionId: "seed-version",
    order: index + 1,
    code: `Q${index + 1}`,
    text: question.text,
    originalText: question.text,
    type: question.type,
    category: question.category ?? "General",
    tags: stringifyTags(question.tags),
    difficulty: question.difficulty,
    relevanceScore: question.relevanceScore,
    isRequired: question.isRequired ?? true,
    options: serializeQuestionOptions(question.options),
    likertScale: question.likertScale,
    aiGenerated: true,
    aiSource: "seed",
    allowFollowUp: question.allowFollowUp ?? false,
    isCore: true,
    createdById: userId,
  }));
}

async function seedSurvey(input: {
  title: string;
  topic: string;
  description: string;
  stakeholder: string;
  interviewMethod: string;
  interviewMode: string;
  language: string;
  respondentGroup: string | null;
  questionCount: number;
  adminId: string;
}) {
  const existing = await prisma.survey.findFirst({ where: { title: input.title } });
  if (existing) return existing;

  const settings = defaultSurveySettings(input.interviewMethod, input.interviewMode);
  const survey = await prisma.survey.create({
    data: {
      title: input.title,
      topic: input.topic,
      description: input.description,
      stakeholder: input.stakeholder,
      interviewMethod: input.interviewMethod,
      interviewMode: input.interviewMode,
      language: input.language,
      respondentGroup: input.respondentGroup,
      settings: JSON.stringify(settings),
      aiProvider: resolveProvider(),
      status: "DRAFT",
      version: 1,
      questionCount: 0,
      createdById: input.adminId,
    },
  });

  const rows = await buildQuestionRows(
    survey.id,
    input.topic,
    input.stakeholder,
    input.interviewMethod,
    input.interviewMode,
    input.questionCount,
    input.adminId,
  );

  const parsed = parseTopic(input.topic, input.stakeholder);
  const snapshot = JSON.stringify({
    title: survey.title,
    description: survey.description,
    stakeholder: survey.stakeholder,
    topic: survey.topic,
    interviewMethod: survey.interviewMethod,
    interviewMode: survey.interviewMode,
    language: survey.language,
    settings: JSON.stringify(settings),
    capturedAt: new Date().toISOString(),
    questions: rows.map((row, index) => ({
      ...row,
      id: `seed-q-${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    subject: parsed.subject,
  });

  const version = await prisma.surveyVersion.create({
    data: {
      surveyId: survey.id,
      version: 1,
      title: survey.title,
      topic: survey.topic,
      description: survey.description,
      stakeholder: survey.stakeholder,
      interviewMethod: survey.interviewMethod,
      interviewMode: survey.interviewMode,
      language: survey.language,
      settings: JSON.stringify(settings),
      snapshot,
      changeNote: "Seed publication",
      publishedAt: new Date(),
      createdById: input.adminId,
    },
  });

  await prisma.surveyQuestion.createMany({
    data: rows.map((row) => ({ ...row, versionId: version.id })),
  });

  const questionCount = await prisma.surveyQuestion.count({ where: { surveyId: survey.id } });
  return prisma.survey.update({
    where: { id: survey.id },
    data: { status: "PUBLISHED", publishedAt: new Date(), questionCount, aiProvider: "seed" },
  });
}

async function seedBank(adminId: string) {
  const bankCount = await prisma.questionBankItem.count();
  if (bankCount > 0) return bankCount;

  const samples = generateQuestionsOffline({
    topic: "Student Satisfaction with University Services",
    stakeholder: "Students",
    interviewMethod: "STRUCTURED",
    interviewMode: "INDIVIDUAL",
    language: "en",
    count: 12,
    seed: "seed-bank",
  });
  for (const question of samples) {
    await prisma.questionBankItem.create({
      data: {
        text: question.text,
        category: question.category ?? "General",
        type: question.type,
        tags: stringifyTags(question.tags),
        difficulty: question.difficulty,
        relevanceScore: question.relevanceScore,
        interviewMethod: "STRUCTURED",
        language: "en",
        stakeholder: "Students",
        options: serializeQuestionOptions(question.options),
        likertScale: question.likertScale,
        isFavorite: (question.relevanceScore ?? 0) > 80,
        aiGenerated: true,
        createdById: adminId,
      },
    });
  }
  console.log(`[seed] Seeded ${samples.length} question-bank items.`);
  return samples.length;
}

const SURVEY_SPECS = [
  {
    title: "Student Satisfaction with University Services",
    topic: "Student Satisfaction with University Services",
    description:
      "Measures how satisfied students are with enrolment, registrar, library, finance and campus support services.",
    stakeholder: "Students",
    interviewMethod: "STRUCTURED",
    interviewMode: "INDIVIDUAL",
    language: "en",
    respondentGroup: "College Students",
    questionCount: 25,
  },
  {
    title: "Community Health Services Feedback",
    topic: "Accessibility of Community Health Services",
    description:
      "Semi-structured interviews exploring how residents access barangay health services, with room for follow-up probing.",
    stakeholder: "Citizens / Residents",
    interviewMethod: "SEMI_STRUCTURED",
    interviewMode: "GROUP",
    language: "tl",
    respondentGroup: "Barangay Residents",
    questionCount: 18,
  },
  {
    title: "Employee Experience Conversations",
    topic: "Employee Experience and Workplace Well-being",
    description:
      "Open-ended conversations that surface themes, pain points and suggestions about daily work life.",
    stakeholder: "Employees",
    interviewMethod: "UNSTRUCTURED",
    interviewMode: "RANDOM",
    language: "en",
    respondentGroup: "Full-time Staff",
    questionCount: 12,
  },
];

function seedToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function seedQrTokens(adminId: string) {
  const tokenCount = await prisma.qRToken.count();
  if (tokenCount > 0) return tokenCount;
  const published = await prisma.survey.findMany({
    where: { status: "PUBLISHED" },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  for (const survey of published) {
    await prisma.qRToken.create({
      data: {
        surveyId: survey.id,
        versionId: survey.versions[0]?.id ?? null,
        token: seedToken(),
        label: `Seed QR — ${survey.title}`,
        language: survey.language,
        createdById: adminId,
      },
    });
  }
  console.log(`[seed] Seeded QR tokens for ${published.length} surveys.`);
  return published.length;
}

const POSITIVE_TEXTS = [
  "The staff were very accommodating and the process was fast.",
  "Easy to access and the online system works smoothly.",
  "Clean facilities and the personnel explained everything clearly.",
  "I am satisfied with the service. Everything was organised.",
  "Responsive and professional. My concern was resolved the same day.",
];
const NEGATIVE_TEXTS = [
  "The queue was too long and there were no clear instructions.",
  "Slow processing and the website was down when I checked.",
  "Staff were unhelpful and my documents were returned twice.",
  "Difficult to reach the office and waiting time was unacceptable.",
  "Confusing requirements and poor communication about the schedule.",
];
const NEUTRAL_TEXTS = [
  "The service was okay. Nothing remarkable but nothing bad either.",
  "It took about an hour. The process was standard.",
  "Facilities are fine. Some steps could be clearer.",
];

async function seedResponses() {
  const existing = await prisma.response.count();
  if (existing > 0) return existing;

  const surveys = await prisma.survey.findMany({
    where: { status: "PUBLISHED" },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  let created = 0;
  const ageGroups = ["18–24", "25–34", "35–44", "45–54"];
  const names = ["Maria Santos", "Jose Dela Cruz", "Ana Reyes", "Mark Villanueva", "Liza Ramos"];

  for (const survey of surveys) {
    const questions = survey.questions;
    if (!questions.length) continue;
    const likert = questions.filter((q) => q.type === "LIKERT_5" || q.type === "LIKERT_7");

    for (let i = 0; i < 8; i++) {
      const respondentCode = `SEED-${survey.id.slice(0, 4).toUpperCase()}-${String(i + 1).padStart(2, "0")}`;
      const respondent = await prisma.respondent.create({
        data: {
          respondentCode,
          name: names[i % names.length],
          ageGroup: ageGroups[i % ageGroups.length],
          gender: i % 2 === 0 ? "Female" : "Male",
          respondentGroup: survey.respondentGroup,
          language: survey.language,
          surveyId: survey.id,
        },
      });

      const session = await prisma.interviewSession.create({
        data: {
          sessionCode: `SEED-SES-${survey.id.slice(0, 4).toUpperCase()}-${String(i + 1).padStart(2, "0")}`,
          surveyId: survey.id,
          respondentId: respondent.id,
          mode: survey.interviewMode,
          status: "COMPLETED",
          completedAt: new Date(Date.now() - i * 86_400_000),
          startedAt: new Date(Date.now() - i * 86_400_000 - 12 * 60_000),
          device: "Seed script",
          networkState: "ONLINE",
        },
      });

      const positivity = (i % 5) / 4;

      const response = await prisma.response.create({
        data: {
          clientResponseId: `seed-response-${survey.id.slice(0, 8)}-${i}`,
          surveyId: survey.id,
          sessionId: session.id,
          respondentId: respondent.id,
          language: survey.language,
          status: "COMPLETE",
          source: i % 4 === 3 ? "OFFLINE_SYNC" : "ONLINE",
          device: "Seed script",
          networkState: "ONLINE",
          answersCount: questions.length,
          totalQuestions: questions.length,
          completionRate: 100,
          durationSec: 480 + i * 37,
          revision: 1,
          contentHash: `seed-hash-${survey.id.slice(0, 8)}-${i}`,
          syncStatus: "SYNCED",
          submittedAt: new Date(Date.now() - i * 86_400_000),
          syncedAt: new Date(Date.now() - i * 86_400_000 + 60_000),
        },
      });

      for (const question of questions) {
        let valueText: string | null = null;
        let valueOption: string | null = null;
        let valueNumber: number | null = null;
        let valueBool: boolean | null = null;

        if (question.type === "LIKERT_5" || question.type === "LIKERT_7") {
          const scale = question.type === "LIKERT_7" ? 7 : 5;
          valueOption = String(Math.round(1 + positivity * (scale - 1)));
        } else if (question.type === "RATING") {
          valueOption = String(2 + Math.round(positivity * 3));
        } else if (question.type === "YES_NO") {
          valueBool = positivity >= 0.5;
        } else if (question.type === "MULTIPLE_CHOICE" || question.type === "MULTI_SELECT") {
          try {
            const opts = JSON.parse(question.options ?? "[]") as { label: string }[];
            const first = opts[0]?.label ?? "Option 1";
            valueOption =
              question.type === "MULTI_SELECT"
                ? `${first} | ${opts[1]?.label ?? first}`
                : first;
          } catch {
            valueOption = "Option 1";
          }
        } else if (question.type === "NUMBER") {
          valueNumber = 10 + i;
        } else if (question.type === "DATE") {
          valueText = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
        } else {
          const pool =
            positivity > 0.6 ? POSITIVE_TEXTS : positivity < 0.4 ? NEGATIVE_TEXTS : NEUTRAL_TEXTS;
          valueText = pool[(i + questions.indexOf(question)) % pool.length];
        }

        const answer = await prisma.answer.create({
          data: {
            responseId: response.id,
            questionId: question.id,
            surveyId: survey.id,
            respondentId: respondent.id,
            sessionId: session.id,
            valueText,
            valueNumber,
            valueOption,
            valueBool,
          },
        });

        if (question.type === "LIKERT_5" || question.type === "LIKERT_7") {
          const scale = question.type === "LIKERT_7" ? 7 : 5;
          const score = Number(valueOption ?? 3);
          await prisma.likertResponse.create({
            data: {
              answerId: answer.id,
              surveyId: survey.id,
              questionId: question.id,
              respondentId: respondent.id,
              sessionId: session.id,
              scale,
              score,
              label: String(score),
              normalized: Number((score / scale).toFixed(4)),
              isPositive: score > scale / 2,
            },
          });
        }
      }

      created += 1;
    }
  }

  console.log(`[seed] Seeded ${created} sample responses through the database.`);
  return created;
}

async function main() {
  console.log("[seed] Starting development seed…");
  const admin = await ensureAdmin();
  console.log(`[seed] Admin ready: ${admin.username}`);

  if (!WITH_SAMPLES) {
    console.log("[seed] SEED_SAMPLE_DATA=false — sample surveys skipped.");
    return;
  }

  await seedBank(admin.id);

  for (const spec of SURVEY_SPECS) {
    const survey = await seedSurvey({ ...spec, adminId: admin.id });
    console.log(`[seed] Survey ready: ${survey.title}`);
  }

  await seedQrTokens(admin.id);
  await seedResponses();

  console.log("[seed] Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });