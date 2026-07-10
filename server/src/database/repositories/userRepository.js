import bcrypt from "bcryptjs";
import { prisma } from "../init.js";

export const UserRepository = {
  async findById(id) {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByUsername(username) {
    return prisma.user.findUnique({ where: { username } });
  },

  async findByEmail(email) {
    if (!email) return null;
    return prisma.user.findFirst({ where: { email } });
  },

  async create({ username, email, password }) {
    const passwordHash = await bcrypt.hash(password, 12);
    return prisma.user.create({
      data: {
        username,
        email: email || "",
        passwordHash,
        displayName: username,
      },
    });
  },

  async updatePassword(id, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    return prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  },

  async updateProfile(id, fields) {
    const map = {
      display_name: "displayName",
      custom_status: "customStatus",
      profile_pic: "profilePic",
    };
    const data = {};
    for (const [snake, camel] of Object.entries(map)) {
      if (fields[snake] !== undefined) data[camel] = fields[snake];
    }
    for (const key of ["bio", "status", "theme"]) {
      if (fields[key] !== undefined) data[key] = fields[key];
    }
    if (Object.keys(data).length === 0) return this.findById(id);
    return prisma.user.update({ where: { id }, data });
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.passwordHash);
  },

  async search(query, excludeId) {
    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: excludeId } },
          {
            OR: [
              { username: { contains: query } },
              { displayName: { contains: query } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        status: true,
        customStatus: true,
        profilePic: true,
      },
      take: 20,
    });
  },
};
