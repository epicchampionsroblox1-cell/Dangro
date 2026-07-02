import { Router } from "express";
import { prisma } from "../database/init.js";

export const channelsRouter = Router();

channelsRouter.post("/", async (req, res) => {
  try {
    const { serverId, name, type, category } = req.body;
    if (!serverId || !name) return res.status(400).json({ error: "serverId and name required" });

    const member = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ error: "Not a member of this server" });

    const id = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    const existing = await prisma.channel.findUnique({
      where: { id_serverId: { id, serverId } },
    });
    if (existing) return res.status(409).json({ error: "Channel already exists" });

    const channelType = type === "voice" ? "voice" : "text";
    const lastChannel = await prisma.channel.findFirst({
      where: { serverId },
      orderBy: { position: "desc" },
    });
    const position = (lastChannel?.position ?? -1) + 1;

    const channel = await prisma.channel.create({
      data: { id, serverId, name, type: channelType, category: category || "", position },
    });
    res.status(201).json(channel);
  } catch (err) {
    console.error("Create channel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

channelsRouter.delete("/:serverId/:channelId", async (req, res) => {
  try {
    const { serverId, channelId } = req.params;
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    if (!server) return res.status(404).json({ error: "Server not found" });
    if (server.ownerId !== req.userId) return res.status(403).json({ error: "Only the server owner can delete channels" });

    await prisma.channel.delete({
      where: { id_serverId: { id: channelId, serverId } },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete channel error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
