import { Router } from "express";
import { prisma } from "../database/init.js";
import { UserRepository } from "../database/repositories/userRepository.js";

export const friendsRouter = Router();

friendsRouter.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
      },
      include: {
        user: {
          select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true },
        },
        friend: {
          select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true },
        },
      },
      orderBy: { user: { username: "asc" } },
    });

    const result = friendships.map(f => {
      const u = f.userId === userId ? f.friend : f.user;
      return {
        id: f.id,
        username: u.username,
        displayName: u.displayName,
        status: f.status === "accepted" ? u.status : f.status,
        customStatus: u.customStatus,
        avatarColor: "#555",
        profilePic: u.profilePic,
      };
    });
    res.json(result);
  } catch (err) {
    console.error("List friends error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.post("/", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const targetUser = await UserRepository.findByUsername(username);
    if (!targetUser) return res.status(404).json({ error: "User not found" });
    if (targetUser.id === req.userId) return res.status(400).json({ error: "Cannot add yourself" });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: req.userId, friendId: targetUser.id },
          { userId: targetUser.id, friendId: req.userId },
        ],
      },
    });
    if (existing) return res.status(409).json({ error: "Friend request already exists" });

    const friendship = await prisma.friendship.create({
      data: { userId: req.userId, friendId: targetUser.id, status: "pending" },
    });

    res.status(201).json({
      id: friendship.id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      status: "pending_out",
      customStatus: "Waiting...",
      avatarColor: "#555",
    });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.delete("/:id", async (req, res) => {
  try {
    await prisma.friendship.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.patch("/:id", async (req, res) => {
  try {
    const { status } = req.body;
    if (status === "accepted") {
      await prisma.friendship.update({
        where: { id: req.params.id },
        data: { status: "accepted" },
      });
    }
    const friend = await prisma.friendship.findUnique({ where: { id: req.params.id } });
    res.json(friend);
  } catch (err) {
    console.error("Update friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.post("/:id/block", async (req, res) => {
  try {
    await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status: "blocked" },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Block friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.post("/:id/unblock", async (req, res) => {
  try {
    await prisma.friendship.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Unblock friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
