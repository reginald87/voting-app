import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// SQLite single-writer locking is the #1 lock/crash risk under concurrent
// load. WAL mode lets readers proceed during writes and busy_timeout makes
// writers wait instead of failing with SQLITE_BUSY. The __applyPragmas flag
// ensures we only run these once per process.
declare global {
  // eslint-disable-next-line no-var
  var __bmuPragmasApplied: boolean | undefined;
}

async function applyPragmas(client: PrismaClient) {
  if (globalThis.__bmuPragmasApplied) return;
  globalThis.__bmuPragmasApplied = true;
  try {
    // SQLite setting-PRAGMAs return the new value, so use $queryRawUnsafe.
    await client.$queryRawUnsafe(`PRAGMA journal_mode = WAL;`);
    await client.$queryRawUnsafe(`PRAGMA busy_timeout = 30000;`);
    await client.$queryRawUnsafe(`PRAGMA synchronous = NORMAL;`);
  } catch {
    // Non-fatal: the app still works, just with more lock contention.
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

if (globalThis.__bmuPragmasApplied === undefined) {
  applyPragmas(prisma);
}
