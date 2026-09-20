import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const username = "Admin";
  const password = "admin123";
  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findFirst({
    where: { username: { equals: username } },
  });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        username,
        fullName: "System Administrator",
        email: "admin@aiis.local",
        passwordHash,
        role: "ADMIN",
        isActive: true,
        avatarColor: "#6366F1",
        organization: "InterviewAI Platform",
      },
    });
    console.log("[ensure-admin] Updated existing admin: " + username);
  } else {
    await prisma.user.create({
      data: {
        username,
        fullName: "System Administrator",
        email: "admin@aiis.local",
        passwordHash,
        role: "ADMIN",
        isActive: true,
        avatarColor: "#6366F1",
        organization: "InterviewAI Platform",
      },
    });
    console.log("[ensure-admin] Created admin: " + username);
  }
}

main()
  .catch((e) => {
    console.error("[ensure-admin] Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
