import { Router } from "express";
import { prisma } from "../database/init.js";

export const friendsRouter = Router();

friendsRouter.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId }, { friendId: userId }],
        NOT: { status: "blocked" },
      },
      include: {
        user: { select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true } },
        friend: { select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = friendships.map(f => {
      const isRequestor = f.userId === userId;
      const u = isRequestor ? f.friend : f.user;

      let status;
      if (f.status === "accepted") {
        status = u.status;
      } else if (f.status === "pending") {
        status = isRequestor ? "pending_out" : "pending_in";
      } else {
        status = f.status;
      }

      return {
        id: f.id,
        userId: u.id,
        username: u.username,
        displayName: u.displayName,
        status,
        customStatus: u.customStatus,
        profilePic: u.profilePic,
        direction: isRequestor ? "outgoing" : "incoming",
        createdAt: f.createdAt,
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
    const userId = req.userId;
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username is required" });

    const friendUser = await prisma.user.findUnique({ where: { username } });
    if (!friendUser) return res.status(404).json({ error: "User not found" });
    if (friendUser.id === userId) return res.status(400).json({ error: "Cannot add yourself" });

    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId: friendUser.id },
          { userId: friendUser.id, friendId: userId },
        ],
      },
    });
    if (existing) return res.status(409).json({ error: "Already friends or request pending" });

    const friendship = await prisma.friendship.create({
      data: { userId, friendId: friendUser.id, status: "pending" },
    });

    res.status(201).json({
      id: friendship.id,
      userId: friendUser.id,
      username: friendUser.username,
      displayName: friendUser.displayName,
      status: "pending_out",
      direction: "outgoing",
      createdAt: friendship.createdAt,
    });
  } catch (err) {
    console.error("Add friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.patch("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.body;

    const friendship = await prisma.friendship.findUnique({
      where: { id: req.params.id },
    });
    if (!friendship) return res.status(404).json({ error: "Friendship not found" });
    if (friendship.friendId !== userId) return res.status(403).json({ error: "Not authorized" });

    const updated = await prisma.friendship.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.json({ success: true, status: updated.status });
  } catch (err) {
    console.error("Update friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.delete("/:id", async (req, res) => {
  try {
    const userId = req.userId;
    const friendship = await prisma.friendship.findUnique({
      where: { id: req.params.id },
    });
    if (!friendship) return res.status(404).json({ error: "Friendship not found" });
    if (friendship.userId !== userId && friendship.friendId !== userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    await prisma.friendship.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Remove friend error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendsRouter.post("/:id/block", async (req, res) => {
  try {
    const friendship = await prisma.friendship.findUnique({
      where: { id: req.params.id },
    });
    if (!friendship) return res.status(404).json({ error: "Friendship not found" });

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
