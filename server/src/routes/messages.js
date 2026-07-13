import { Router } from "express";
import { prisma } from "../database/init.js";

export const messagesRouter = Router();

async function checkChatAccess(userId, chatKey) {
  if (!chatKey) return false;

  if (chatKey.startsWith("dm_")) {
    const friendId = chatKey.slice(3);
    if (friendId === userId) return true;
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId, friendId, status: "accepted" },
          { userId: friendId, friendId: userId, status: "accepted" },
        ],
      },
    });
    return !!friendship;
  }

  if (chatKey.startsWith("group_")) {
    const groupId = chatKey.slice(6);
    const member = await prisma.groupMember.findUnique({
      where: { groupId_username: { groupId, username: "" } },
    }).catch(() => null);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
    if (!user) return false;
    const groupMember = await prisma.groupMember.findUnique({
      where: { groupId_username: { groupId, username: user.username } },
    }).catch(() => null);
    return !!groupMember;
  }

  const underscoreIdx = chatKey.indexOf("_");
  if (underscoreIdx > 0) {
    const serverId = chatKey.slice(0, underscoreIdx);
    const membership = await prisma.serverMember.findUnique({
      where: { serverId_userId: { serverId, userId } },
    });
    return !!membership;
  }

  return false;
}

async function getReactions(messageId) {
  const rows = await prisma.reaction.findMany({
    where: { messageId },
    select: { emoji: true, username: true },
  });
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.emoji]) grouped[r.emoji] = [];
    grouped[r.emoji].push(r.username);
  }
  return grouped;
}

function formatMessage(msg, reactions) {
  return {
    id: msg.id,
    chatKey: msg.chatKey,
    sender: msg.sender,
    senderId: msg.senderId,
    content: msg.content,
    timestamp: msg.timestamp.toISOString(),
    editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
    isImage: msg.isImage,
    system: msg.system,
    reactions,
    replyTo: msg.replyToSender ? { sender: msg.replyToSender, content: msg.replyToContent } : null,
    attachments: typeof msg.attachments === "string" ? JSON.parse(msg.attachments) : msg.attachments || [],
  };
}

messagesRouter.get("/:chatKey", async (req, res) => {
  try {
    const { limit, before, after } = req.query;
    const pageSize = Math.min(parseInt(limit) || 50, 100);
    const chatKey = req.params.chatKey;

    const hasAccess = await checkChatAccess(req.userId, chatKey);
    if (!hasAccess) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }

    const where = { chatKey };
    const orderDir = "desc";
    let cursorId = null;

    if (before) {
      const cursorMsg = await prisma.message.findUnique({ where: { id: before }, select: { seq: true } });
      if (cursorMsg) {
        where.seq = { lt: cursorMsg.seq };
      }
    } else if (after) {
      const cursorMsg = await prisma.message.findUnique({ where: { id: after }, select: { seq: true } });
      if (cursorMsg) {
        where.seq = { gt: cursorMsg.seq };
      }
    }

    const messages = await prisma.message.findMany({
      where,
      orderBy: { seq: orderDir },
      take: pageSize + 1,
    });

    const hasMore = messages.length > pageSize;
    if (hasMore) messages.pop();

    messages.reverse();

    const total = await prisma.message.count({ where: { chatKey } });

    const formatted = await Promise.all(
      messages.map(async (msg) => {
        const reactions = await getReactions(msg.id);
        return formatMessage(msg, reactions);
      })
    );

    res.json({
      messages: formatted,
      hasMore,
      total,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    });
  } catch (err) {
    console.error("List messages error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

messagesRouter.post("/", async (req, res) => {
  try {
    const { chatKey, sender, content, isImage, replyTo, attachments } = req.body;
    if (!chatKey || !sender || !content) {
      return res.status(400).json({ error: "chatKey, sender, and content required" });
    }

    const hasAccess = await checkChatAccess(req.userId, chatKey);
    if (!hasAccess) {
      return res.status(403).json({ error: "You do not have access to this chat" });
    }

    const id = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const msg = await prisma.message.create({
      data: {
        id,
        chatKey,
        sender,
        senderId: req.userId,
        content,
        isImage: !!isImage,
        timestamp: new Date(),
        replyToSender: replyTo?.sender || null,
        replyToContent: replyTo?.content || null,
        attachments: attachments ? JSON.stringify(attachments) : "[]",
      },
    });

    const reactions = await getReactions(msg.id);
    res.status(201).json(formatMessage(msg, reactions));
  } catch (err) {
    console.error("Create message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

messagesRouter.patch("/:id", async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: "Content required" });

    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Message not found" });

    if (existing.senderId !== req.userId) {
      return res.status(403).json({ error: "You can only edit your own messages" });
    }

    const msg = await prisma.message.update({
      where: { id: req.params.id },
      data: { content, editedAt: new Date() },
    });

    const reactions = await getReactions(msg.id);
    res.json(formatMessage(msg, reactions));
  } catch (err) {
    console.error("Edit message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

messagesRouter.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Message not found" });

    if (existing.senderId !== req.userId) {
      return res.status(403).json({ error: "You can only delete your own messages" });
    }

    await prisma.message.delete({ where: { id: req.params.id } });
    res.json({ success: true, messageId: req.params.id });
  } catch (err) {
    console.error("Delete message error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
