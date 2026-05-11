import { prisma } from "./prisma.js";

type SyncUserInput = {
  authUserId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  major?: string | null;
  year?: number | null;
};

export async function syncAuthenticatedUser(input: SyncUserInput) {
  const fallbackName = input.email.split("@")[0];

  return prisma.user.upsert({
    where: { email: input.email },
    update: {
      name: input.name ?? fallbackName,
      avatarUrl: input.avatarUrl ?? undefined,
      major: input.major ?? undefined,
      year: input.year ?? undefined,
      isVerified: input.email.endsWith("@stanford.edu"),
    },
    create: {
      id: input.authUserId,
      email: input.email,
      name: input.name ?? fallbackName,
      avatarUrl: input.avatarUrl ?? undefined,
      major: input.major ?? undefined,
      year: input.year ?? undefined,
      isVerified: input.email.endsWith("@stanford.edu"),
    },
  });
}
