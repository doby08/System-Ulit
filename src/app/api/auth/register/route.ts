import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/server/auth";
import { ApiError, fail, ok, readJson } from "@/lib/server/api";
import { registerSchema } from "@/lib/server/validation";

/** POST /api/auth/register — create a new administrator account. */
export async function POST(request: NextRequest) {
  try {
    const body = await readJson(request, registerSchema);

    const username = body.username.trim();
    const emailRaw = body.email?.trim() ?? "";
    const email = emailRaw === "" ? null : emailRaw;

    const passwordCheck = validatePasswordStrength(body.password);
    if (!passwordCheck.valid) {
      throw new ApiError(
        `Password must include ${passwordCheck.problems.join(", ")}.`,
        400,
        { code: "WEAK_PASSWORD", details: passwordCheck.problems },
      );
    }

    const orConditions: { username?: { equals: string }; email?: { equals: string } }[] = [
      { username: { equals: username } },
    ];
    if (email) orConditions.push({ email: { equals: email } });
    const existing = await prisma.user.findFirst({
      where: { OR: orConditions },
    });
    if (existing) {
      throw new ApiError("Username or email is already in use.", 409, { code: "CONFLICT" });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        username,
        fullName: body.fullName.trim(),
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        avatarColor: "#6366F1",
        organization: body.organization?.trim() ? body.organization.trim() : null,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        avatarColor: true,
        organization: true,
        lastLoginAt: true,
      },
    });

    return ok({ user });
  } catch (error) {
    return fail(error);
  }
}
