import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export async function initDatabase() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected via Prisma");
  } catch (err) {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  }
}

export async function closeDatabase() {
  await prisma.$disconnect();
}
