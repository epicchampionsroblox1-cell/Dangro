import { prisma } from "../init.js";

export const TokenRepository = {
  async create(userId, token, expiresAt) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt: new Date(expiresAt) },
    });
  },

  async findByToken(token) {
    return prisma.refreshToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
  },

  async findByUserId(userId) {
    return prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  },

  async deleteByToken(token) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  },

  async deleteAllForUser(userId) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },

  async cleanup() {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  },
};
