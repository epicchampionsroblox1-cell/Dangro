import React, { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

const SERVER_COLORS = ["#5865f2", "#3ba55d", "#ed4245", "#f0b232", "#a855f7", "#22d3ee", "#eb459e", "#57f287"];

const AVATARS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export default function LeftPanel({ onSettings, onVoiceSettings, onServerSettings }) {
  const { state, dispatch, logout, addToast } = useApp();
  const [showServerModal, setShowServerModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("");
  const [channelName, setChannelName] = useState("");
  const [channelType, setChannelType] = useState("text");
  const [inviteCode, setInviteCode] = useState("");
  const [voiceUsers, setVoiceUsers] = useState({});

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

  function handleServerClick(server) {
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: {
        activeServerId: server.id,
        activeChatType: "channel",
        activeChannelId: server.channels?.[0]?.id || null,
        activeNavTab: "servers",
      },
    });
  }

  function handleChannelClick(channel) {
    if (channel.type === "voice") {
      const key = channel.serverId + "_" + channel.id;
      setVoiceUsers(prev => ({
        ...prev,
        [key]: prev[key] ? null : [{ username: state.displayName, speaking: false }],
      }));
      addToast(channel.name + (voiceUsers[key] ? " - Left" : " - Connected"), "info");
      return;
    }
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: { activeChatType: "channel", activeChannelId: channel.id },
    });
  }

  function goHome() {
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: { activeNavTab: "dms", activeServerId: null, activeChatType: null, activeChannelId: null, activeDmFriendId: null },
    });
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

  async function createServer() {
    const name = serverName.trim();
    if (!name) return;
    try {
      const server = await api.servers.create(name, serverIcon || undefined);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      dispatch({
        type: "SET_ACTIVE_CHAT",
        payload: { activeServerId: server.id, activeChatType: "channel", activeChannelId: "general", activeNavTab: "servers" },
      });
      setShowServerModal(false);
      setServerName("");
      setServerIcon("");
      addToast("Server created!", "success");
    } catch (e) {
      addToast(e.message || "Failed to create server", "error");
    }
  }

  async function createChannel() {
    const name = channelName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    if (!name || !state.activeServerId) return;
    try {
      await api.channels.create(state.activeServerId, name, channelType);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      if (channelType === "text") {
        dispatch({
          type: "SET_ACTIVE_CHAT",
          payload: { activeChatType: "channel", activeChannelId: name },
        });
      }
      setShowChannelModal(false);
      setChannelName("");
      addToast("Channel created!", "success");
    } catch (e) {
      addToast(e.message || "Failed to create channel", "error");
    }
  }

  async function joinServer() {
    const code = inviteCode.trim();
    if (!code) return;
    try {
      const server = await api.servers.join(code);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      dispatch({
        type: "SET_ACTIVE_CHAT",
        payload: { activeServerId: server.id, activeChatType: "channel", activeChannelId: "general", activeNavTab: "servers" },
      });
      setShowJoinModal(false);
      setInviteCode("");
      addToast("Joined server!", "success");
    } catch (e) {
      addToast(e.message || "Failed to join server", "error");
    }
  }

  const textChannels = currentServer?.channels?.filter(c => c.type !== "voice") || [];
  const voiceChannels = currentServer?.channels?.filter(c => c.type === "voice") || [];

  const statusClass = state.status === "online" ? "online" :
    state.status === "idle" ? "idle" :
    state.status === "dnd" ? "dnd" : "offline";

  const onlineFriends = state.friends.filter(f => f.status !== "offline" && f.status !== "pending_in" && f.status !== "pending_out");

  return (
    <>
      <div className="server-bar">
        <div className={"server-bar-icon home-icon" + (state.activeNavTab === "dms" ? " active" : "")} onClick={goHome} title="Home">
          D
        </div>
        <div className="server-bar-divider" />
        {state.servers.map((server, i) => (
          <div
            key={server.id}
            className={"server-bar-icon" + (server.id === state.activeServerId && state.activeNavTab === "servers" ? " active" : "")}
            onClick={() => handleServerClick(server)}
            title={server.name}
            style={{ backgroundColor: SERVER_COLORS[i % SERVER_COLORS.length] }}
          >
            {server.icon || server.name.charAt(0).toUpperCase()}
          </div>
        ))}
        <div className="server-bar-icon" onClick={() => setShowServerModal(true)} title="Add Server" style={{ background: "var(--bg-surface)", color: "var(--accent-green)", fontSize: 24 }}>
          +
        </div>
        <div className="server-bar-icon" onClick={() => setShowJoinModal(true)} title="Join Server" style={{ background: "var(--bg-surface)", color: "var(--accent)", fontSize: 18, marginTop: 2 }}>
          &#128279;
        </div>
      </div>

      <div className="left-panel">
        <div className="left-panel-header">
          <h2>{currentServer && state.activeNavTab === "servers" ? currentServer.name : "Direct Messages"}</h2>
        </div>

        <div className="left-panel-content">
          {currentServer && state.activeNavTab === "servers" ? (
            <>
              <div className="channel-section">
                <div className="channel-section-header">
                  <span className="arrow">&#9660;</span>
                  Text Channels
                  <button className="channel-add-btn" onClick={() => setShowChannelModal(true)}>+</button>
                </div>
                {textChannels.map(ch => (
                  <div
                    key={ch.id}
                    className={"channel-item" + (state.activeChatType === "channel" && ch.id === state.activeChannelId ? " active" : "")}
                    onClick={() => handleChannelClick(ch)}
                  >
                    <span className="hash">#</span>
                    <span className="name">{ch.name}</span>
                  </div>
                ))}
              </div>

              {voiceChannels.length > 0 && (
                <div className="channel-section" style={{ marginTop: 8 }}>
                  <div className="channel-section-header">
                    <span className="arrow">&#9660;</span>
                    Voice Channels
                  </div>
                  {voiceChannels.map(ch => {
                    const key = ch.serverId + "_" + ch.id;
                    const users = voiceUsers[key];
                    return (
                      <div key={ch.id}>
                        <div
                          className={"channel-item" + (users ? " active" : "")}
                          onClick={() => handleChannelClick(ch)}
                        >
                          <span className="hash">&#128266;</span>
                          <span className="name">{ch.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="channel-section" style={{ marginTop: 12, padding: "0 8px" }}>
                <div className="channel-section-header">
                  <span>Server Options</span>
                </div>
                <div className="channel-item" onClick={() => onServerSettings?.(currentServer)}>
                  <span className="hash">&#9881;</span>
                  <span className="name">Server Settings</span>
                </div>
              </div>
            </>
          ) : (
            <div className="dm-left-section">
              <div className="dm-left-section-header">
                <span>Online Friends</span>
                <span className="dm-left-count">{onlineFriends.length}</span>
              </div>
              {onlineFriends.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px 16px" }}>
                  <div className="empty-state-title" style={{ fontSize: 13 }}>No friends online</div>
                  <div className="empty-state-desc" style={{ fontSize: 11 }}>Add friends to start chatting.</div>
                </div>
              ) : (
                onlineFriends.map(friend => {
                  const fc = friend.status === "online" ? "online" :
                    friend.status === "dnd" ? "dnd" :
                    friend.status === "idle" ? "idle" : "offline";
                  return (
                    <div
                      key={friend.id}
                      className={"dm-item" + (state.activeChatType === "dm" && state.activeDmFriendId === friend.id ? " active" : "")}
                      onClick={() => openDM(friend.id)}
                      style={{ padding: "6px 12px" }}
                    >
                      <div className="dm-avatar" style={{ backgroundColor: hashColor(friend.username), width: 28, height: 28, fontSize: 11 }}>
                        {friend.username.charAt(0).toUpperCase()}
                        <span className={"status-ring status-ring-sm " + fc} />
                      </div>
                      <div className="dm-info" style={{ marginLeft: 8 }}>
                        <div className="dm-username" style={{ fontSize: 13 }}>{friend.username}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="user-profile">
          <div className="user-avatar" style={{ background: hashColor(state.displayName) }}>
            {state.profilePic ? (
              <img src={state.profilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              state.displayName.charAt(0).toUpperCase()
            )}
            <span className={"status-ring " + statusClass} />
          </div>
          <div className="user-info">
            <div className="user-name">{state.displayName}</div>
            <div className="user-status-text">{state.customStatus || state.status}</div>
          </div>
          <div className="user-controls">
            <button className="user-control-btn" onClick={onVoiceSettings} title="Voice Settings">&#128266;</button>
            <button className="user-control-btn" onClick={onSettings} title="Settings">&#9881;</button>
            <button className="user-control-btn" onClick={logout} title="Log Out">&#128682;</button>
          </div>
        </div>
      </div>

      {showServerModal && (
        <div className="modal-overlay" onClick={() => setShowServerModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Create Server</h3>
            <p>Create a new server for you and your friends.</p>
            <div className="settings-field">
              <label>Server Name</label>
              <input className="settings-input" type="text" placeholder="My Server" value={serverName} onChange={e => setServerName(e.target.value)} />
            </div>
            <div className="settings-field">
              <label>Icon Letter</label>
              <input className="settings-input" type="text" placeholder="D" value={serverIcon} onChange={e => setServerIcon(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowServerModal(false)}>Cancel</button>
              <button className="modal-btn submit" onClick={createServer}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showChannelModal && (
        <div className="modal-overlay" onClick={() => setShowChannelModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Create Channel</h3>
            <div className="settings-field">
              <label>Channel Name</label>
              <input className="settings-input" type="text" placeholder="new-channel" value={channelName} onChange={e => setChannelName(e.target.value)} />
            </div>
            <div className="settings-field">
              <label>Type</label>
              <select className="settings-select" value={channelType} onChange={e => setChannelType(e.target.value)}>
                <option value="text">Text</option>
                <option value="voice">Voice</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowChannelModal(false)}>Cancel</button>
              <button className="modal-btn submit" onClick={createChannel}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Join Server</h3>
            <p>Enter an invite code to join a server.</p>
            <div className="settings-field">
              <label>Invite Code</label>
              <input className="settings-input" type="text" placeholder="Paste invite code..." value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button className="modal-btn submit" onClick={joinServer}>Join</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
