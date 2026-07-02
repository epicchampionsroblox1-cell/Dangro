import { PrismaClient } from "@prisma/client";

function buildDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if ((url.startsWith("postgresql://") || url.startsWith("postgres://")) && !url.includes("sslmode")) {
    const sep = url.includes("?") ? "&" : "?";
    const fixed = `${url}${sep}sslmode=require`;
    console.log("DATABASE_URL missing sslmode=require — injecting automatically");
    return fixed;
  }
  return url;
}

export const prisma = new PrismaClient({
  datasources: { db: { url: buildDatabaseUrl() } },
});

export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected via Prisma");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    if (process.env.DATABASE_URL) {
      console.error("DATABASE_URL is set (length=" + process.env.DATABASE_URL.length + ")");
    } else {
      console.error("DATABASE_URL is NOT set — check Render environment variables");
    }
    process.exit(1);
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
