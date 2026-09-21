/**
 * Guarantees that the default administrator account exists and can sign in.
 *
 *   npm run admin:ensure    create/repair the admin (never touches a password)
 *   npm run admin:reset     also resets the password to SEED_ADMIN_PASSWORD
 *
 * The lookup is CASE-INSENSITIVE, so an existing "admin" / "Admin" / "ADMIN" row is
 * repaired in place instead of a duplicate being created (two accounts that differ
 * only by capitalisation break sign-in, because login matches either of them).
 *
 * Runs automatically before `npm run dev` (npm "predev" hook) so local development
 * can never end up locked out of the admin panel.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const resetPassword = process.argv.includes("--reset-password");
const username = process.env.SEED_ADMIN_USERNAME ?? "Admin";
const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
const fullName = process.env.SEED_ADMIN_NAME ?? "System Administrator";
const email = process.env.SEED_ADMIN_EMAIL ?? "admin@aiis.local";

async function main() {
  const needle = username.trim().toLowerCase();
  const emailNeedle = email.trim().toLowerCase();

  const candidates = await prisma.user.findMany({
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });
  const existing = candidates.find(
    (user) =>
      user.username.trim().toLowerCase() === needle ||
      (user.email ? user.email.trim().toLowerCase() === emailNeedle : false),
  );

  if (existing) {
    const data = {
      role: "ADMIN",
      isActive: true,
      ...(existing.username !== username ? { username } : {}),
      ...(existing.email ? {} : { email }),
    };
    if (resetPassword) data.passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: existing.id }, data });
    console.log(
      `[ensure-admin] Administrator "${username}" is ready (account repaired, role ADMIN, active).` +
        (resetPassword
          ? ` Password reset to the value of SEED_ADMIN_PASSWORD (${password}).`
          : " Existing password kept."),
    );
    return;
  }

  await prisma.user.create({
    data: {
      username,
      fullName,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      isActive: true,
      avatarColor: "#6366F1",
      organization: "InterviewAI Platform",
    },
  });
  console.log(
    `[ensure-admin] Created administrator "${username}". Password: ${password} (from SEED_ADMIN_PASSWORD).`,
  );
}

main()
  .catch((error) => {
    // Never block the dev server: a missing database (e.g. before `db push`) or an
    // unreachable Postgres instance must not stop `npm run dev` from starting.
    console.warn("[ensure-admin] skipped:", error instanceof Error ? error.message : error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
