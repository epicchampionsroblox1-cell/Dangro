import React from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

const AVATARS = ["#7c3aed", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#f97316"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export default function FriendActivity() {
  const { state, dispatch, addToast } = useApp();

  const friends = state.friends.filter(
    f => f.status !== "pending_in" && f.status !== "pending_out"
  );

  const query = state.friendSearchQuery.trim().toLowerCase();
  const visible = query
    ? friends.filter(f => f.username.toLowerCase().includes(query))
    : friends;

  async function openDM(friendId) {
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: { activeChatType: "dm", activeDmFriendId: friendId, activeNavTab: "dms" },
    });
  }

  async function removeFriend(friendId, username) {
    if (!window.confirm("Remove @" + username + "?")) return;
    try {
      await api.friends.remove(friendId);
      dispatch({ type: "SET_FRIENDS", payload: state.friends.filter(f => f.id !== friendId) });
      addToast("Removed @" + username, "info");
      if (state.activeChatType === "dm" && state.activeDmFriendId === friendId) {
        dispatch({
          type: "SET_ACTIVE_CHAT",
          payload: { activeChatType: null, activeDmFriendId: null, activeServerId: null, activeChannelId: null },
        });
      }
    } catch {}
  }

  return (
    <div className="friend-activity">
      <div className="fa-header">
        <span>Friends</span>
        <span className="fa-count">{friends.length} total</span>
      </div>
      <div className="hub-search">
        <input type="text" placeholder="Search friends..." value={state.friendSearchQuery}
          onChange={e => dispatch({ type: "SET_FRIEND_SEARCH", payload: e.target.value })} />
      </div>
      <div className="fa-list">
        {visible.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 16px" }}>
            <div className="empty-state-icon" style={{ fontSize: 32 }}>👥</div>
            <div className="empty-state-title" style={{ fontSize: 14 }}>
              {query ? "No friends match your search" : "No friends yet"}
            </div>
            <div className="empty-state-desc" style={{ fontSize: 12 }}>Add friends using their username to start chatting!</div>
          </div>
        ) : (
          visible.map(friend => {
            const statusColor = friend.status === "online" ? "var(--green)" :
              friend.status === "idle" ? "var(--yellow)" :
              friend.status === "dnd" ? "var(--red)" : "var(--text-muted)";

            return (
              <div key={friend.id} className="fa-item">
                <div className="fa-avatar" style={{ backgroundColor: hashColor(friend.username) }} onClick={() => openDM(friend.id)}>
                  {friend.username.charAt(0).toUpperCase()}
                  <span className="fa-status" style={{ background: statusColor }} />
                </div>
                <div className="fa-info" onClick={() => openDM(friend.id)}>
                  <div className="fa-name">{friend.username}</div>
                  <div className="fa-activity">{friend.customStatus || friend.status}</div>
                </div>
                <button className="fa-remove-btn" onClick={() => removeFriend(friend.id, friend.username)} title="Remove Friend">✕</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
