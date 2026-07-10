import { prisma } from "../database/init.js";

const userSockets = new Map();
const typingTimeouts = new Map();

export function registerChatHandlers(io, socket) {
  const username = socket.username || "unknown";
  const userId = socket.userId;

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Map());
  }
  userSockets.get(userId).set(socket.id, { socketId: socket.id, username, userId, status: "online" });

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
          senderId: userId,
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
      senderId: userId,
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

      io.to(existing.chatKey).emit("message:updated", {
        messageId,
        chatKey: existing.chatKey,
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
      const existing = await prisma.message.findUnique({ where: { id: messageId } });
      if (!existing) return;

      await prisma.message.delete({ where: { id: messageId } });
      io.to(existing.chatKey).emit("message:deleted", { messageId, chatKey: existing.chatKey });
    } catch (err) {
      console.error("Socket message:delete error:", err);
    }
  });

  socket.on("message:react", async (data) => {
    const { messageId, emoji, username } = data;
    if (!messageId || !emoji || !username) return;

    try {
      const msg = await prisma.message.findUnique({ where: { id: messageId } });
      if (!msg) return;

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

      io.to(msg.chatKey).emit("message:updated", { messageId, chatKey: msg.chatKey, reactions: grouped });
    } catch (err) {
      console.error("Socket message:react error:", err);
    }
  });

  socket.on("typing:start", (data) => {
    const { chatKey, username } = data;
    socket.to(chatKey).emit("typing:update", { chatKey, username, isTyping: true });

    const key = chatKey + "_" + username;
    if (typingTimeouts.has(key)) clearTimeout(typingTimeouts.get(key));
    typingTimeouts.set(key, setTimeout(() => {
      socket.to(chatKey).emit("typing:update", { chatKey, username, isTyping: false });
      typingTimeouts.delete(key);
    }, 4000));
  });

  socket.on("typing:stop", (data) => {
    const { chatKey, username } = data;
    socket.to(chatKey).emit("typing:update", { chatKey, username, isTyping: false });

    const key = chatKey + "_" + username;
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.delete(key);
    }
  });

  socket.on("presence:status", (data) => {
    const { status } = data;
    const sockets = userSockets.get(userId);
    if (sockets) {
      for (const s of sockets.values()) {
        s.status = status;
      }
    }
    io.emit("presence:update", { userId, username, status });
  });

  socket.on("call:chat", ({ targetId, sender, content }) => {
    const targetSockets = userSockets.get(targetId);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:chat", { sender, content });
      }
    }
  });

  // WebRTC Call Signaling
  socket.on("call:start", ({ targetId, channelName }) => {
    const targetSockets = userSockets.get(targetId);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:incoming", {
          from: userId,
          username,
          channelName,
        });
      }
    }
  });

  socket.on("call:accept", ({ targetId }) => {
    const targetSockets = userSockets.get(targetId);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:accepted", { from: userId, username });
      }
    }
    // Notify all other participants
    io.to(socket.data.chatKey || "global").emit("call:participant-joined", { username });
  });

  socket.on("call:decline", ({ targetId }) => {
    const targetSockets = userSockets.get(targetId);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:declined", { from: userId, username });
      }
    }
  });

  socket.on("call:end", ({ targetId }) => {
    const targetSockets = userSockets.get(targetId);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:ended", { from: userId, username });
      }
    }
    io.to(socket.data.chatKey || "global").emit("call:participant-left", { username });
  });

  // WebRTC signaling relay
  socket.on("call:offer", ({ offer, to }) => {
    const targetSockets = userSockets.get(to);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:offer", { offer, from: userId });
      }
    }
  });

  socket.on("call:answer", ({ answer, to }) => {
    const targetSockets = userSockets.get(to);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:answer", { answer });
      }
    }
  });

  socket.on("call:ice-candidate", ({ candidate, to }) => {
    const targetSockets = userSockets.get(to);
    if (targetSockets) {
      for (const s of targetSockets.values()) {
        io.to(s.socketId).emit("call:ice-candidate", { candidate });
      }
    }
  });

  // Profile change propagation
  socket.on("profile:updated", (data) => {
    io.emit("profile:updated", { userId, username, ...data });
  });

  // Voice channel join/leave
  socket.on("voice:join", ({ channelId, serverId }) => {
    const room = "voice_" + serverId + "_" + channelId;
    socket.join(room);
    socket.to(room).emit("voice:user-joined", { userId, username });
    socket.data.voiceRoom = room;
  });

  socket.on("voice:leave", ({ channelId, serverId }) => {
    const room = "voice_" + serverId + "_" + channelId;
    socket.leave(room);
    socket.to(room).emit("voice:user-left", { userId, username });
    socket.data.voiceRoom = null;
  });

  socket.on("voice:speaking", ({ channelId, serverId, speaking }) => {
    const room = "voice_" + serverId + "_" + channelId;
    socket.to(room).emit("voice:speaking", { userId, username, speaking });
  });

  socket.on("disconnect", () => {
    if (socket.data.voiceRoom) {
      io.to(socket.data.voiceRoom).emit("voice:user-left", { userId, username });
    }
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSockets.delete(userId);
        io.emit("presence:update", { userId, username, status: "offline" });
      }
    }
  });
}

export function getOnlineUsers() {
  const users = [];
  for (const [userId, sockets] of userSockets) {
    const first = sockets.values().next().value;
    if (first) users.push(first);
  }
  return users;
}
