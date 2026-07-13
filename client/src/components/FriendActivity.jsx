import React from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

const AVATARS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];

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
  const pendingIn = state.friends.filter(f => f.status === "pending_in");
  const pendingOut = state.friends.filter(f => f.status === "pending_out");

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

  async function acceptRequest(friendId) {
    try {
      await api.friends.update(friendId, { status: "accepted" });
      dispatch({ type: "SET_FRIENDS", payload: state.friends.map(f => f.id === friendId ? { ...f, status: "online" } : f) });
      addToast("Friend request accepted", "success");
    } catch { addToast("Failed to accept request", "error"); }
  }

  async function declineRequest(friendId) {
    try {
      await api.friends.remove(friendId);
      dispatch({ type: "SET_FRIENDS", payload: state.friends.filter(f => f.id !== friendId) });
      addToast("Friend request declined", "info");
    } catch { addToast("Failed to decline request", "error"); }
  }

  async function cancelRequest(friendId) {
    try {
      await api.friends.remove(friendId);
      dispatch({ type: "SET_FRIENDS", payload: state.friends.filter(f => f.id !== friendId) });
      addToast("Friend request cancelled", "info");
    } catch { addToast("Failed to cancel request", "error"); }
  }

  return (
    <div className="friend-activity">
      <div className="fa-header">
        <span>Friends</span>
        <span className="fa-count">{friends.length} online</span>
      </div>

      {pendingIn.length > 0 && (
        <div className="fa-section">
          <div className="fa-section-title">Incoming Requests ({pendingIn.length})</div>
          {pendingIn.map(friend => (
            <div key={friend.id} className="fa-item">
              <div className="fa-avatar" style={{ backgroundColor: hashColor(friend.username) }}>
                {friend.profilePic ? (
                  <img src={friend.profilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  friend.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="fa-info">
                <div className="fa-name">{friend.username}</div>
                <div className="fa-activity">Pending friend request</div>
              </div>
              <div className="dm-item-actions">
                <button className="dm-action-btn accept" onClick={() => acceptRequest(friend.id)} title="Accept">&#10003;</button>
                <button className="dm-action-btn decline" onClick={() => declineRequest(friend.id)} title="Decline">&#10005;</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingOut.length > 0 && (
        <div className="fa-section">
          <div className="fa-section-title">Sent Requests ({pendingOut.length})</div>
          {pendingOut.map(friend => (
            <div key={friend.id} className="fa-item">
              <div className="fa-avatar" style={{ backgroundColor: hashColor(friend.username) }}>
                {friend.profilePic ? (
                  <img src={friend.profilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  friend.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="fa-info">
                <div className="fa-name">{friend.username}</div>
                <div className="fa-activity">Awaiting response</div>
              </div>
              <button className="fa-remove-btn" onClick={() => cancelRequest(friend.id)} title="Cancel Request">✕</button>
            </div>
          ))}
        </div>
      )}

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
            const sc = friend.status === "online" ? "online" :
              friend.status === "dnd" ? "dnd" :
              friend.status === "idle" ? "idle" : "offline";

            return (
              <div key={friend.id} className="fa-item">
                <div className="fa-avatar" style={{ backgroundColor: hashColor(friend.username) }} onClick={() => openDM(friend.id)}>
                  {friend.profilePic ? (
                    <img src={friend.profilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    friend.username.charAt(0).toUpperCase()
                  )}
                  <span className={"status-ring " + sc} />
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
