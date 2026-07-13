import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../database/init.js";

export const serversRouter = Router();

function canModerate(server, userId) {
  if (server.ownerId === userId) return true;
  try {
    const coOwners = JSON.parse(server.coOwnerIds || "[]");
    if (coOwners.includes(userId)) return true;
  } catch {}
  return false;
}

serversRouter.get("/", async (req, res) => {
  try {
    const userId = req.userId;
    const memberships = await prisma.serverMember.findMany({
      where: { userId },
      include: {
        server: {
          include: {
            channels: { orderBy: { position: "asc" } },
            _count: { select: { members: true } },
          },
        },
      },
      orderBy: { server: { name: "asc" } },
    });
    const servers = memberships.map(m => ({
      ...m.server,
      channels: m.server.channels,
      memberCount: m.server._count.members,
    }));
    res.json(servers);
  } catch (err) {
    console.error("List servers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/", async (req, res) => {
  try {
    const { name, icon } = req.body;
    if (!name) return res.status(400).json({ error: "Server name required" });
    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "_" + Date.now();
    const inviteCode = crypto.randomBytes(6).toString("hex");

    await prisma.server.create({
      data: {
        id,
        name,
        icon: icon || id.charAt(0).toUpperCase(),
        ownerId: req.userId,
        inviteCode,
        members: { create: { userId: req.userId } },
        channels: { create: { id: "general", name: "general", position: 0 } },
      },
    });

    const server = await prisma.server.findUnique({
      where: { id },
      include: {
        channels: { orderBy: { position: "asc" } },
        _count: { select: { members: true } },
      },
    });
    res.status(201).json({ ...server, memberCount: server._count.members });
  } catch (err) {
    console.error("Create server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public server listing for server browser
const PUBLIC_SERVERS = [
  { id: "gaming-hub", name: "Gaming Hub", icon: "🎮", memberCount: 234, description: "The ultimate gaming community - discuss, play, and compete!" },
  { id: "music-lovers", name: "Music Lovers", icon: "🎵", memberCount: 156, description: "Share your favorite tunes, discover new artists, and jam together." },
  { id: "dev-corner", name: "Dev Corner", icon: "💻", memberCount: 189, description: "A place for developers to share code, ask questions, and collaborate." },
  { id: "art-studio", name: "Art Studio", icon: "🎨", memberCount: 98, description: "Showcase your artwork, get feedback, and find inspiration." },
  { id: "movie-night", name: "Movie Night", icon: "🎬", memberCount: 145, description: "Weekly movie screenings, discussions, and film recommendations." },
  { id: "book-club", name: "Book Club", icon: "📚", memberCount: 67, description: "Read together, discuss chapters, and share your favorite books." },
];

serversRouter.get("/browse", async (req, res) => {
  try {
    const { q } = req.query;
    let results = [...PUBLIC_SERVERS];
    if (q && q.trim()) {
      const query = q.toLowerCase().trim();
      results = results.filter(s => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query));
    }
    res.json(results);
  } catch (err) {
    console.error("Browse servers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.get("/:id", async (req, res) => {
  try {
    const server = await prisma.server.findUnique({
      where: { id: req.params.id },
      include: {
        channels: { orderBy: { position: "asc" } },
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true },
            },
          },
        },
      },
    });
    if (!server) return res.status(404).json({ error: "Server not found" });
    const result = { ...server, members: server.members.map(m => m.user) };
    res.json(result);
  } catch (err) {
    console.error("Get server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.patch("/:id", async (req, res) => {
  try {
    const { name, icon } = req.body;
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId !== req.userId) return res.status(403).json({ error: "Only the server owner can edit this server" });

    const data = {};
    if (name) data.name = name;
    if (icon !== undefined) data.icon = icon;

    const updated = await prisma.server.update({
      where: { id: req.params.id },
      data,
      include: { channels: { orderBy: { position: "asc" } } },
    });
    res.json(updated);
  } catch (err) {
    console.error("Update server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.delete("/:id", async (req, res) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId !== req.userId) return res.status(403).json({ error: "Only the server owner can delete this server" });

    await prisma.server.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/join/:code", async (req, res) => {
  try {
    const server = await prisma.server.findUnique({ where: { inviteCode: req.params.code } });
    if (!server) return res.status(404).json({ error: "Invalid invite code" });

    const bans = JSON.parse(server.bannedIds || "[]");
    if (bans.includes(req.userId)) return res.status(403).json({ error: "You are banned from this server" });

    const existing = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId: server.id, userId: req.userId } },
    });
    if (existing) return res.status(409).json({ error: "Already a member of this server" });

    await prisma.serverMember.create({
      data: { serverId: server.id, userId: req.userId },
    });

    const result = await prisma.server.findUnique({
      where: { id: server.id },
      include: { channels: { orderBy: { position: "asc" } } },
    });
    res.json(result);
  } catch (err) {
    console.error("Join server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/:id/leave", async (req, res) => {
  try {
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId === req.userId) {
      return res.status(400).json({ error: "Server owner cannot leave. Transfer ownership or delete the server." });
    }

    await prisma.serverMember.delete({
      where: { serverId_userId: { serverId: req.params.id, userId: req.userId } },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Leave server error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Moderation routes (owner/co-owner only) ---

serversRouter.post("/:id/kick", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (!canModerate(server, req.userId)) return res.status(403).json({ error: "Not authorized" });
    if (targetUserId === server.ownerId) return res.status(400).json({ error: "Cannot kick the server owner" });

    await prisma.serverMember.delete({
      where: { serverId_userId: { serverId: req.params.id, userId: targetUserId } },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Kick member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/:id/ban", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (!canModerate(server, req.userId)) return res.status(403).json({ error: "Not authorized" });
    if (targetUserId === server.ownerId) return res.status(400).json({ error: "Cannot ban the server owner" });

    try {
      await prisma.serverMember.delete({
        where: { serverId_userId: { serverId: req.params.id, userId: targetUserId } },
      });
    } catch {}

    const bans = JSON.parse(server.bannedIds || "[]");
    if (!bans.includes(targetUserId)) {
      bans.push(targetUserId);
      await prisma.server.update({ where: { id: req.params.id }, data: { bannedIds: JSON.stringify(bans) } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Ban member error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/:id/unban", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (!canModerate(server, req.userId)) return res.status(403).json({ error: "Not authorized" });

    const bans = JSON.parse(server.bannedIds || "[]");
    const filtered = bans.filter(id => id !== targetUserId);
    if (filtered.length < bans.length) {
      await prisma.server.update({ where: { id: req.params.id }, data: { bannedIds: JSON.stringify(filtered) } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Unban error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/:id/set-coowner", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId !== req.userId) return res.status(403).json({ error: "Only the owner can set co-owners" });

    const coOwners = JSON.parse(server.coOwnerIds || "[]");
    if (!coOwners.includes(targetUserId)) {
      coOwners.push(targetUserId);
      await prisma.server.update({ where: { id: req.params.id }, data: { coOwnerIds: JSON.stringify(coOwners) } });
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Set co-owner error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

serversRouter.post("/:id/remove-coowner", async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "targetUserId required" });
    const server = await prisma.server.findUnique({ where: { id: req.params.id } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId !== req.userId) return res.status(403).json({ error: "Only the owner can remove co-owners" });

    const coOwners = JSON.parse(server.coOwnerIds || "[]");
    const filtered = coOwners.filter(id => id !== targetUserId);
    await prisma.server.update({ where: { id: req.params.id }, data: { coOwnerIds: JSON.stringify(filtered) } });
    res.json({ success: true });
  } catch (err) {
    console.error("Remove co-owner error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
