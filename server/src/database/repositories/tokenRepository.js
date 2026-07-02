import { prisma } from "../init.js";

export const TokenRepository = {
  create(userId, token, expiresAt) {
    return prisma.refreshToken.create({
      data: { userId, token, expiresAt: new Date(expiresAt) },
    });
  },

  findByToken(token) {
    return prisma.refreshToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
  },

  findByUserId(userId) {
    return prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
  },

  deleteByToken(token) {
    return prisma.refreshToken.deleteMany({ where: { token } });
  },

  deleteAllForUser(userId) {
    return prisma.refreshToken.deleteMany({ where: { userId } });
  },

  cleanup() {
    return prisma.refreshToken.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  },
};
