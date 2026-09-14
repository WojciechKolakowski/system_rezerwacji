import { PrismaClient } from "@prisma/client";

// Jeden klient Prisma współdzielony przez apps/client, apps/admin i
// apps/worker. W dev/hot-reload (Next.js) trzymamy instancję na globalThis,
// żeby nie otwierać nowego połączenia przy każdym przeładowaniu modułu.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
