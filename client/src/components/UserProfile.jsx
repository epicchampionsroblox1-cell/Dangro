import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"][Math.abs(hash) % 8];
}

export default function UserProfile({ userId, onClose }) {
  const { state, dispatch } = useApp();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.users.profile(userId).then(data => {
      setProfile(data.user);
    }).catch(() => {
      const friend = state.friends.find(f => f.userId === userId);
      if (friend) {
        setProfile({
          id: friend.userId,
          username: friend.username,
          displayName: friend.displayName || friend.username,
          bio: "",
          status: friend.status,
          customStatus: friend.customStatus,
          profilePic: friend.profilePic,
          banner: "",
          createdAt: new Date().toISOString(),
          friendCount: 0,
        });
      }
    }).finally(() => setLoading(false));
  }, [userId]);

  function openDM() {
    const friend = state.friends.find(f => f.userId === userId);
    if (friend) {
      dispatch({
        type: "SET_ACTIVE_CHAT",
        payload: { activeChatType: "dm", activeDmFriendId: friend.id },
      });
      onClose();
    }
  }

  const statusClass = profile?.status === "online" ? "online" :
    profile?.status === "dnd" ? "dnd" :
    profile?.status === "idle" ? "idle" : "offline";

  if (loading) {
    return (
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-card" onClick={e => e.stopPropagation()}>
          <div className="empty-state"><div className="loading-spinner" /></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="user-profile-overlay" onClick={onClose}>
        <div className="user-profile-card" onClick={e => e.stopPropagation()}>
          <div className="empty-state">
            <div className="empty-state-title">User not found</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-overlay" onClick={onClose}>
      <div className="user-profile-card" onClick={e => e.stopPropagation()}>
        <div className="user-profile-banner" style={{
          background: profile.banner ? `url(${profile.banner}) center/cover` : `linear-gradient(135deg, ${hashColor(profile.username)}44, transparent)`,
        }}>
          {profile.banner && <img src={profile.banner} alt="" className="user-profile-banner-img" />}
        </div>
        <div className="user-profile-info">
          <div className="user-profile-avatar-wrap">
            {profile.profilePic ? (
              <img src={profile.profilePic} alt={profile.username} />
            ) : (
              <div className="initials" style={{ background: hashColor(profile.username) }}>
                {profile.username.charAt(0).toUpperCase()}
                <span className={`status-ring status-ring-lg ${statusClass}`} />
              </div>
            )}
          </div>
          <div className="user-profile-name">{profile.displayName || profile.username}</div>
          <div className="user-profile-username">@{profile.username}</div>
          {profile.bio && <div className="user-profile-bio">{profile.bio}</div>}
          <div className="user-profile-details">
            <span>{profile.status}</span>
            <span>{profile.friendCount || 0} friends</span>
            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="user-profile-actions">
            <button className="user-profile-btn primary" onClick={openDM}>Message</button>
            <button className="user-profile-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
