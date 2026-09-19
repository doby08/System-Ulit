import { PrismaClient } from "@prisma/client";

/**
 * Single PrismaClient instance per process (avoids exhausting DB connections
 * during Next.js dev hot-reloads / serverless invocations).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

/** Runtime provider detection — lets shared code adapt (e.g. case-insensitive search). */
export const isPostgres = () =>
  (process.env.DATABASE_URL ?? "").startsWith("postgres");