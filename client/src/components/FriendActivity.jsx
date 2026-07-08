import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";

const AVATARS = ["#7c3aed", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

const MOCK_ACTIVITIES = {
  playing: [
    { game: "Elden Ring", icon: "⚔️" },
    { game: "Minecraft", icon: "⛏️" },
    { game: "Valorant", icon: "🔫" },
    { game: "Hollow Knight", icon: "🪲" },
  ],
  listening: [
    { song: "Blinding Lights - The Weeknd", icon: "🎵" },
    { song: "Bohemian Rhapsody - Queen", icon: "🎸" },
    { song: "Lose Yourself - Eminem", icon: "🎤" },
    { song: "Stairway to Heaven - Led Zeppelin", icon: "🎶" },
  ],
};

export default function FriendActivity({ onLinkAccount }) {
  const { state, dispatch } = useApp();
  const [linkedAccounts, setLinkedAccounts] = useState(() => {
    const saved = localStorage.getItem("dangro_linked_accounts");
    return saved ? JSON.parse(saved) : {};
  });

  const onlineFriends = state.friends.filter(
    f => f.status !== "offline" && f.status !== "pending_in" && f.status !== "pending_out"
  );

  function getFriendActivity(friend) {
    const friendHash = friend.username.length;
    const activities = MOCK_ACTIVITIES;
    const playing = activities.playing[friendHash % activities.playing.length];
    const listening = activities.listening[friendHash % activities.listening.length];

    const hasPlaying = linkedAccounts.spotify || friendHash % 3 !== 0;

    return { playing, listening, hasPlaying };
  }

  function openDM(friendId) {
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: { activeChatType: "dm", activeDmFriendId: friendId, activeNavTab: "dms" },
    });
    const key = "dm_" + friendId;
    if (!state.messages[key]) {
      dispatch({
        type: "SET_MESSAGES",
        chatKey: key,
        payload: [{ id: "sys_dm_" + Date.now(), sender: "System", content: "Private messages with this user.", timestamp: "Just now", system: true, reactions: {}, replyTo: null }],
      });
    }
  }

  return (
    <div className="friend-activity">
      <div className="fa-header">
        <span>Friends Activity</span>
        <div className="fa-header-actions">
          <button className="fa-header-btn" onClick={onLinkAccount} title="Link Account">🔗</button>
        </div>
      </div>
      <div className="fa-list">
        {onlineFriends.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 16px" }}>
            <div className="empty-state-icon" style={{ fontSize: 32 }}>👥</div>
            <div className="empty-state-title" style={{ fontSize: 14 }}>No friends online</div>
            <div className="empty-state-desc" style={{ fontSize: 12 }}>Add friends to see their activity!</div>
          </div>
        ) : (
          onlineFriends.map(friend => {
            const activity = getFriendActivity(friend);
            const statusColor = friend.status === "online" ? "var(--green)" :
              friend.status === "idle" ? "var(--yellow)" :
              friend.status === "dnd" ? "var(--red)" : "var(--text-muted)";

            return (
              <div
                key={friend.id}
                className="fa-item"
                onClick={() => openDM(friend.id)}
              >
                <div className="fa-avatar" style={{ backgroundColor: hashColor(friend.username) }}>
                  {friend.username.charAt(0).toUpperCase()}
                  <span className="fa-status" style={{ background: statusColor }} />
                </div>
                <div className="fa-info">
                  <div className="fa-name">{friend.username}</div>
                  <div className="fa-activity">
                    <span className="fa-activity-icon">{activity.playing.icon}</span>
                    Playing {activity.playing.game}
                    {activity.hasPlaying && (
                      <>
                        <span style={{ margin: "0 4px", color: "var(--text-muted)" }}>·</span>
                        <span className="fa-activity-icon">{activity.listening.icon}</span>
                        {activity.listening.song}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
