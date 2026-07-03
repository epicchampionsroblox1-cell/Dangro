import { prisma } from "../database/init.js";

const onlineUsers = new Map();
const typingTimeouts = new Map();

export function registerChatHandlers(io, socket) {
  const username = socket.username || "unknown";
  const userId = socket.userId;

  onlineUsers.set(userId, { socketId: socket.id, username, userId, status: "online" });
  io.emit("presence:update", { userId, username, status: "online" });

  socket.on("join:chat", (chatKey) => {
    socket.join(chatKey);
    socket.data.chatKey = chatKey;
  });

  socket.on("leave:chat", (chatKey) => {
    socket.leave(chatKey);
  });

  socket.on("message:send", async (data) => {
    const { chatKey, sender, content, isImage, replyTo, attachments } = data;
    if (!chatKey || !sender || !content) return;

    const id = "msg_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    try {
      await prisma.message.create({
        data: {
          id,
          chatKey,
          sender,
          content,
          isImage: !!isImage,
          timestamp: new Date(),
          replyToSender: replyTo?.sender || null,
          replyToContent: replyTo?.content || null,
          attachments: attachments ? JSON.stringify(attachments) : "[]",
        },
      });
    } catch (err) {
      console.error("Socket message:send error:", err);
    }

    const msgPayload = {
      id,
      chatKey,
      sender,
      content,
      timestamp: new Date().toISOString(),
      isImage: !!isImage,
      system: false,
      reactions: {},
      replyTo: replyTo || null,
      attachments: attachments || [],
      editedAt: null,
    };

    socket.to(chatKey).emit("message:new", msgPayload);
    socket.emit("message:sent", msgPayload);
  });

  socket.on("message:edit", async (data) => {
    const { messageId, content } = data;
    if (!messageId || !content) return;

    try {
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) return;

      await prisma.message.update({
        where: { id: messageId },
        data: { content, editedAt: new Date() },
      });

      io.to(socket.data.chatKey || "general").emit("message:updated", {
        messageId,
        content,
        editedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Socket message:edit error:", err);
    }
  });

  socket.on("message:delete", async (data) => {
    const { messageId } = data;
    if (!messageId) return;

    try {
      await prisma.message.delete({ where: { id: messageId } });
      io.to(socket.data.chatKey || "general").emit("message:deleted", { messageId });
    } catch (err) {
      console.error("Socket message:delete error:", err);
    }
  });

  socket.on("message:react", async (data) => {
    const { messageId, emoji, username } = data;
    if (!messageId || !emoji || !username) return;

    try {
      const existing = await prisma.reaction.findUnique({
        where: { messageId_emoji_username: { messageId, emoji, username } },
      });

      if (existing) {
        await prisma.reaction.delete({
          where: { messageId_emoji_username: { messageId, emoji, username } },
        });
      } else {
        await prisma.reaction.create({
          data: { messageId, emoji, username },
        });
      }

      const reactions = await prisma.reaction.findMany({
        where: { messageId },
        select: { emoji: true, username: true },
      });
      const grouped = {};
      for (const r of reactions) {
        if (!grouped[r.emoji]) grouped[r.emoji] = [];
        grouped[r.emoji].push(r.username);
      }

      io.to(socket.data.chatKey || "general").emit("message:updated", { messageId, reactions: grouped });
    } catch (err) {
      console.error("Socket message:react error:", err);
    }
  });

  socket.on("typing:start", (data) => {
    const { chatKey, username } = data;
    socket.to(chatKey).emit("typing:update", { username, isTyping: true });

    const key = chatKey + "_" + username;
    if (typingTimeouts.has(key)) clearTimeout(typingTimeouts.get(key));
    typingTimeouts.set(key, setTimeout(() => {
      socket.to(chatKey).emit("typing:update", { username, isTyping: false });
      typingTimeouts.delete(key);
    }, 4000));
  });

  socket.on("typing:stop", (data) => {
    const { chatKey, username } = data;
    socket.to(chatKey).emit("typing:update", { username, isTyping: false });

    const key = chatKey + "_" + username;
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.delete(key);
    }
  });

  socket.on("presence:status", (data) => {
    const { status } = data;
    const user = onlineUsers.get(userId);
    if (user) {
      user.status = status;
      onlineUsers.set(userId, user);
    }
    io.emit("presence:update", { userId, username, status });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(userId);
    io.emit("presence:update", { userId, username, status: "offline" });
  });
}

export function getOnlineUsers() {
  return Array.from(onlineUsers.values());
}
