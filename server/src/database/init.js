import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

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
