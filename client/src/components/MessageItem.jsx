import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";
import socket from "../services/socket";

const AVATARS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

function getSenderColor(sender, myMsgColor) {
  const myName = localStorage.getItem("dangro_display_name") || "";
  if (myMsgColor && sender === myName) return myMsgColor;
  const saved = localStorage.getItem("dangro_user_colors_" + sender);
  if (saved) return saved;
  const baseColors = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55", "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c", "#4dabf7", "#9775fa", "#f783ac", "#20c997"];
  const idx = Math.abs(sender.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % baseColors.length;
  const color = baseColors[idx];
  const usedColors = JSON.parse(localStorage.getItem("dangro_used_colors") || "{}");
  if (usedColors[color] && usedColors[color] !== sender) {
    return baseColors[(baseColors.indexOf(color) + 1) % baseColors.length];
  }
  usedColors[color] = sender;
  localStorage.setItem("dangro_used_colors", JSON.stringify(usedColors));
  localStorage.setItem("dangro_user_colors_" + sender, color);
  return color;
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    const now = new Date();
    const opts = { hour: "numeric", minute: "2-digit", hour12: true };
    if (d.toDateString() !== now.toDateString()) { opts.month = "short"; opts.day = "numeric"; }
    return d.toLocaleString("en-US", opts);
  } catch { return ts; }
}

function highlightText(text, query) {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="search-highlight">{part}</mark>
      : part
  );
}

export default function MessageItem({ msg, onReply }) {
  const { state, dispatch, addToast } = useApp();
  const isMe = msg.sender === state.displayName;
  const senderColor = getSenderColor(msg.sender, state.msgColor);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content || "");
  const editRef = useRef(null);
  const query = state.chatSearchQuery.trim().toLowerCase();

  useEffect(() => { if (editing) editRef.current?.focus(); }, [editing]);

  function isImageUrl(url) {
    if (!url) return false;
    return /\.(jpeg|jpg|gif|png|webp|bmp)(\?.*)?$/i.test(url) ||
      url.startsWith("https://images.unsplash.com/") || url.startsWith("https://i.imgur.com/");
  }

  async function handleReact(emoji) {
    if (!state.user) return;
    socket.emit("message:react", { messageId: msg.id, emoji, username: state.displayName });
    setShowReactionPicker(false);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this message?")) return;
    try {
      await api.messages.remove(msg.id);
      socket.emit("message:delete", { messageId: msg.id });
    } catch { addToast("Failed to delete message", "error"); }
  }

  async function handleEdit() {
    const content = editContent.trim();
    if (!content || content === msg.content) { setEditing(false); return; }
    try {
      await api.messages.edit(msg.id, content);
      socket.emit("message:edit", { messageId: msg.id, content });
      setEditing(false);
    } catch { addToast("Failed to edit message", "error"); }
  }

  function handleEditKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(); }
    if (e.key === "Escape") { setEditing(false); setEditContent(msg.content); }
  }

  function openProfile() {
    if (msg.senderId) {
      dispatch({ type: "SET_PROFILE_MODAL", payload: msg.senderId });
    }
  }

  function openImage(src) {
    dispatch({ type: "SET_IMAGE_POPUP", payload: src });
  }

  const reactions = msg.reactions || {};
  const attachments = msg.attachments || [];

  if (msg.system) {
    return (
      <div className="message system-msg" data-msg-id={msg.id}>
        <span>{msg.content}</span>
      </div>
    );
  }

  return (
    <div className="message" data-msg-id={msg.id}>
      <div className="msg-avatar" style={{ backgroundColor: senderColor }} onClick={openProfile}>
        {msg.sender.charAt(0).toUpperCase()}
      </div>
      <div className="msg-body">
        <div className="msg-header">
          <span className="msg-sender" style={{ color: senderColor }} onClick={openProfile}>{msg.sender}</span>
          <span className="msg-timestamp">{formatTime(msg.timestamp)}</span>
          {msg.editedAt && <span className="msg-timestamp msg-edited">(edited)</span>}
        </div>
        {msg.replyTo && (
          <div className="msg-reply-to">
            <span className="msg-reply-to-sender">{msg.replyTo.sender}</span>
            <span className="msg-reply-to-content">{msg.replyTo.content?.substring(0, 60)}</span>
          </div>
        )}
        {editing ? (
          <div className="msg-edit-box">
            <input ref={editRef} type="text" className="msg-edit-input" value={editContent}
              onChange={e => setEditContent(e.target.value)} onKeyDown={handleEditKey} />
            <div className="msg-edit-actions">
              <span className="msg-edit-hint">Esc to cancel &middot; Enter to save</span>
            </div>
          </div>
        ) : (
          <div className="msg-content">
            {msg.content && msg.content !== " " && (query ? highlightText(msg.content, query) : msg.content)}
          </div>
        )}
        {attachments.length > 0 && (
          <div className="msg-attachments">
            {attachments.map((att, i) => (
              <div key={i} className="msg-attachment">
                {att.type === "image" || isImageUrl(att.url) ? (
                  <img src={att.url} alt={att.name} className="msg-image" onClick={() => openImage(att.url)} />
                ) : att.type === "video" ? (
                  <video src={att.url} controls className="msg-video" />
                ) : (
                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="msg-file">
                    <span className="msg-file-icon">&#128206;</span>
                    <span className="msg-file-name">{att.name}</span>
                    <span className="msg-file-size">{Math.round(att.size / 1024)}KB</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        {Object.keys(reactions).length > 0 && (
          <div className="msg-reactions">
            {Object.entries(reactions).map(([emoji, users]) => (
              <span key={emoji} className={"msg-reaction" + (users.includes(state.displayName) ? " active" : "")}
                onClick={() => handleReact(emoji)}>
                {emoji} <span className="msg-reaction-count">{users.length}</span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="msg-actions">
        <button className="msg-action-btn" onClick={() => onReply(msg)} title="Reply">&#128257;</button>
        <button className="msg-action-btn" onClick={() => handleReact("\uD83D\uDC4D")} title="Like">&#128077;</button>
        <button className="msg-action-btn" onClick={() => setShowReactionPicker(!showReactionPicker)} title="React">&#128525;</button>
        {isMe && (
          <>
            <button className="msg-action-btn" onClick={() => { setEditing(true); setEditContent(msg.content); }} title="Edit">&#9998;</button>
            <button className="msg-action-btn" onClick={handleDelete} title="Delete">&#128465;</button>
          </>
        )}
      </div>
      {showReactionPicker && (
        <div className="quick-reactions">
          {["\uD83D\uDC4D", "\uD83D\uDC4E", "\u2764\uFE0F", "\uD83D\uDE02", "\uD83D\uDE0E", "\uD83D\uDE21", "\uD83D\uDE0A", "\uD83D\uDE28"].map(emoji => (
            <span key={emoji} className="quick-reaction" onClick={() => handleReact(emoji)}>{emoji}</span>
          ))}
        </div>
      )}
    </div>
  );
}
