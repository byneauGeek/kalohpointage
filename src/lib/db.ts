import { PrismaClient } from "@prisma/client";

// Singleton Prisma Client : evite d'ouvrir une nouvelle connexion a chaque
// rechargement en developpement (Next.js recharge les modules a chaud).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
