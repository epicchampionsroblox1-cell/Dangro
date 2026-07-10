import { Router } from "express";
import { prisma } from "../database/init.js";

export const friendGroupsRouter = Router();

friendGroupsRouter.get("/", async (req, res) => {
  try {
    const groups = await prisma.friendGroup.findMany({
      where: { members: { some: { userId: req.userId } } },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true } } } } },
      orderBy: { name: "asc" },
    });
    res.json(groups.map(g => ({ ...g, members: g.members.map(m => ({ ...m.user, groupMemberId: m.groupId + "_" + m.userId })) })));
  } catch (err) {
    console.error("List friend groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendGroupsRouter.post("/", async (req, res) => {
  try {
    const { name, color, memberIds } = req.body;
    if (!name) return res.status(400).json({ error: "Group name required" });
    const group = await prisma.friendGroup.create({
      data: {
        name,
        color: color || "#5865f2",
        members: {
          create: [{ userId: req.userId }, ...(memberIds || []).map(id => ({ userId: id }))],
        },
      },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true } } } } },
    });
    res.status(201).json({ ...group, members: group.members.map(m => ({ ...m.user, groupMemberId: m.groupId + "_" + m.userId })) });
  } catch (err) {
    console.error("Create friend group error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendGroupsRouter.patch("/:id", async (req, res) => {
  try {
    const { name, color } = req.body;
    const group = await prisma.friendGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = await prisma.friendGroupMember.findUnique({ where: { groupId_userId: { groupId: req.params.id, userId: req.userId } } });
    if (!isMember) return res.status(403).json({ error: "Not a member of this group" });

    const updated = await prisma.friendGroup.update({
      where: { id: req.params.id },
      data: { ...(name && { name }), ...(color && { color }) },
      include: { members: { include: { user: { select: { id: true, username: true, displayName: true, status: true, customStatus: true, profilePic: true } } } } },
    });
    res.json({ ...updated, members: updated.members.map(m => ({ ...m.user, groupMemberId: m.groupId + "_" + m.userId })) });
  } catch (err) {
    console.error("Update friend group error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendGroupsRouter.delete("/:id", async (req, res) => {
  try {
    const group = await prisma.friendGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = await prisma.friendGroupMember.findUnique({ where: { groupId_userId: { groupId: req.params.id, userId: req.userId } } });
    if (!isMember) return res.status(403).json({ error: "Not a member of this group" });

    await prisma.friendGroup.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete friend group error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendGroupsRouter.post("/:id/members", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const group = await prisma.friendGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = await prisma.friendGroupMember.findUnique({ where: { groupId_userId: { groupId: req.params.id, userId: req.userId } } });
    if (!isMember) return res.status(403).json({ error: "Not a member of this group" });

    await prisma.friendGroupMember.create({ data: { groupId: req.params.id, userId } });
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Add member to group error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

friendGroupsRouter.delete("/:id/members/:userId", async (req, res) => {
  try {
    const group = await prisma.friendGroup.findUnique({ where: { id: req.params.id } });
    if (!group) return res.status(404).json({ error: "Group not found" });

    const isMember = await prisma.friendGroupMember.findUnique({ where: { groupId_userId: { groupId: req.params.id, userId: req.userId } } });
    if (!isMember) return res.status(403).json({ error: "Not a member of this group" });

    await prisma.friendGroupMember.delete({ where: { groupId_userId: { groupId: req.params.id, userId: req.params.userId } } });
    res.json({ success: true });
  } catch (err) {
    console.error("Remove member from group error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
