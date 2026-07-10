import React, { useMemo, Suspense, lazy } from "react";
import { useApp, getActiveChatKey } from "../contexts/AppContext";
import socket from "../services/socket";
import { api } from "../services/api";
import FriendActivity from "../components/FriendActivity";
import GamingHub from "../components/GamingHub";
import ChatPanel from "../components/ChatPanel";
import ToastContainer from "../components/ToastContainer";
import Clock from "../components/Clock";

const SettingsPanel = lazy(() => import("../components/SettingsPanel"));
const ServerSettingsPanel = lazy(() => import("../components/ServerSettingsPanel"));
const VoiceSettingsPanel = lazy(() => import("../components/VoiceSettingsPanel"));
const CallContainer = lazy(() => import("../components/CallContainer"));
const ImagePopup = lazy(() => import("../components/ImagePopup"));
const UserProfile = lazy(() => import("../components/UserProfile"));
const MiningGame = lazy(() => import("../components/MiningGame"));

const AVATARS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];
const SERVER_COLORS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

const ACTIVITY_PLACEHOLDERS = [
  { icon: "🎵", title: "Spotify", desc: "Not listening to anything" },
  { icon: "🎮", title: "Game Activity", desc: "No game detected" },
  { icon: "📺", title: "YouTube", desc: "No video playing" },
];

export default function MainPage() {
  const { state, dispatch, logout, addToast } = useApp();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [serverSettings, setServerSettings] = React.useState(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);
  const [callTarget, setCallTarget] = React.useState(null);
  const [miningOpen, setMiningOpen] = React.useState(false);
  const [showLinkAccount, setShowLinkAccount] = React.useState(false);
  const [incomingCall, setIncomingCall] = React.useState(null);
  const [incomingCallerId, setIncomingCallerId] = React.useState(null);
  const [showServerModal, setShowServerModal] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [serverName, setServerName] = React.useState("");
  const [serverIcon, setServerIcon] = React.useState("");
  const [channelName, setChannelName] = React.useState("");
  const [channelType, setChannelType] = React.useState("text");
  const [inviteCode, setInviteCode] = React.useState("");
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

  const statusClass = state.status === "online" ? "online" :
    state.status === "dnd" ? "dnd" :
    state.status === "idle" ? "idle" : "offline";

  React.useEffect(() => {
    socket.on("call:incoming", (data) => setIncomingCall(data));
    socket.on("call:accepted", (data) => { addToast(`${data.username} accepted your call!`, "success"); });
    socket.on("call:declined", (data) => { addToast(`${data.username} declined your call`, "info"); setCallOpen(false); });
    socket.on("call:ended", (data) => { addToast(`${data.username} ended the call`, "info"); setCallOpen(false); });
    return () => {
      socket.off("call:incoming"); socket.off("call:accepted"); socket.off("call:declined"); socket.off("call:ended");
    };
  }, []);

  function acceptIncomingCall() {
    if (!incomingCall) return;
    socket.emit("call:accept", { targetId: incomingCall.from });
    setCallTarget({ incomingFrom: incomingCall.username, channelName: incomingCall.channelName, callerId: incomingCall.from });
    setCallOpen(true);
    setIncomingCall(null);
  }

  function declineIncomingCall() {
    if (!incomingCall) return;
    socket.emit("call:decline", { targetId: incomingCall.from });
    setIncomingCall(null);
  }

  function getCallChannel() {
    if (state.activeChatType === "dm") {
      const friend = state.friends.find(f => f.id === state.activeDmFriendId);
      return friend ? "@" + friend.username : null;
    }
    if (state.activeChatType === "channel") {
      const channel = currentServer?.channels?.find(c => c.id === state.activeChannelId);
      return channel ? "#" + channel.name : null;
    }
    return null;
  }

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
    dispatch({
      type: "SET_ACTIVE_CHAT",
      payload: { activeChatType: "channel", activeChannelId: channel.id },
    });
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

  async function createChannel() {
    const name = channelName.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "");
    if (!name || !state.activeServerId) return;
    try {
      await api.channels.create(state.activeServerId, name, channelType);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      if (channelType === "text") dispatch({ type: "SET_ACTIVE_CHAT", payload: { activeChatType: "channel", activeChannelId: name } });
      setShowChannelModal(false);
      setChannelName("");
      addToast("Channel created!", "success");
    } catch (e) {
      addToast(e.message || "Failed to create channel", "error");
    }
  }

  function setStatus(status) {
    dispatch({ type: "SET_PROFILE", payload: { status } });
    socket.emit("presence:status", { status });
    setShowStatusMenu(false);
    api.auth.updateProfile({ status }).catch(() => {});
  }

  const textChannels = currentServer?.channels?.filter(c => c.type !== "voice") || [];
  const voiceChannels = currentServer?.channels?.filter(c => c.type === "voice") || [];

  const unreadCount = useMemo(() => {
    const activeKey = getActiveChatKey(state);
    let total = 0;
    for (const [chatKey, msgs] of Object.entries(state.messages)) {
      if (chatKey === activeKey) continue;
      if (!Array.isArray(msgs) || msgs.length === 0) continue;
      if (chatKey.startsWith("call_")) continue;
      const lastRead = state.lastReadTimestamps[chatKey];
      if (lastRead) {
        const count = msgs.filter(m => !m.senderId || m.senderId !== state.user?.id).filter(m => new Date(m.timestamp) > new Date(lastRead)).length;
        total += count;
      } else {
        const count = msgs.filter(m => !m.senderId || m.senderId !== state.user?.id).length;
        if (count > 0) total += count;
      }
    }
    return total;
  }, [state.messages, state.lastReadTimestamps, state.activeChatType, state.activeDmFriendId, state.activeChannelId, state.user?.id]);

  return (
    <>
      <main className="app-wrapper">
        {/* TOP BAR - Server bar */}
        <div className="top-bar">
          <div className="top-bar-logo" onClick={() => dispatch({ type: "SET_ACTIVE_CHAT", payload: { activeNavTab: "friends", activeServerId: null, activeChatType: null, activeChannelId: null, activeDmFriendId: null } })}>
            D
            {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </div>
          <div className="top-bar-divider" />
          {state.servers.map((server, i) => (
            <div
              key={server.id}
              className={"top-bar-server" + (server.id === state.activeServerId && state.activeNavTab === "servers" ? " active" : "")}
              onClick={() => handleServerClick(server)}
              title={server.name}
              style={{ backgroundColor: SERVER_COLORS[i % SERVER_COLORS.length] }}
            >
              {server.icon || server.name.charAt(0).toUpperCase()}
            </div>
          ))}
          <div className="top-bar-server add-server" onClick={() => setShowServerModal(true)} title="Create Server">+</div>
          <div className="top-bar-server join-server" onClick={() => setShowJoinModal(true)} title="Join Server">&#128279;</div>
        </div>

        {/* LEFT PANEL - Activity / Friends / DMs / Servers */}
        <div className="left-panel">
          <div className="left-panel-header">
            <h2>{state.activeNavTab === "friends" ? "Activity" :
                  state.activeNavTab === "dms" ? "Direct Messages" :
                  state.activeNavTab === "servers" && currentServer ? currentServer.name : "Dangro"}</h2>
          </div>
          <div className="left-panel-content">
            {/* Nav tabs */}
            <div className="dm-subtabs" style={{ marginBottom: 8 }}>
              <button className={"dm-subtab" + (state.activeNavTab === "friends" ? " active" : "")}
                onClick={() => dispatch({ type: "SET_NAV_TAB", payload: "friends" })}>Feed</button>
              <button className={"dm-subtab" + (state.activeNavTab === "dms" ? " active" : "")}
                onClick={() => dispatch({ type: "SET_NAV_TAB", payload: "dms" })}>DMs</button>
              <button className={"dm-subtab" + (state.activeNavTab === "servers" ? " active" : "")}
                onClick={() => {
                  dispatch({ type: "SET_NAV_TAB", payload: "servers" });
                  if (!currentServer && state.servers.length > 0) handleServerClick(state.servers[0]);
                }}>Servers</button>
            </div>

            {state.activeNavTab === "friends" && (
              <>
                <FriendActivity />
                <GamingHub onStartMining={() => setMiningOpen(true)} />
              </>
            )}

            {state.activeNavTab === "dms" && (
              <div className="dm-section">
                <div className="dm-section-header">Direct Messages</div>
                {state.friends.filter(f => f.status !== "pending_in" && f.status !== "pending_out").length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">&#128172;</div>
                    <div className="empty-state-title">No friends yet</div>
                    <div className="empty-state-desc">Add friends using the Feed tab.</div>
                  </div>
                ) : (
                  <>
                    <div className="dm-friend-search">
                      <input type="text" placeholder="Search friends..." value={state.friendSearchQuery}
                        onChange={e => dispatch({ type: "SET_FRIEND_SEARCH", payload: e.target.value })} />
                    </div>
                    {state.friends
                      .filter(f => f.status !== "pending_in" && f.status !== "pending_out")
                      .filter(f => {
                        const q = state.friendSearchQuery.trim().toLowerCase();
                        return !q || f.username.toLowerCase().includes(q);
                      })
                      .map(friend => {
                        const fc = friend.status === "online" ? "online" :
                          friend.status === "dnd" ? "dnd" :
                          friend.status === "idle" ? "idle" : "offline";
                        return (
                          <div
                            key={friend.id}
                            className={"dm-item" + (state.activeChatType === "dm" && state.activeDmFriendId === friend.id ? " active" : "")}
                            onClick={() => {
                              dispatch({ type: "SET_ACTIVE_CHAT", payload: { activeChatType: "dm", activeDmFriendId: friend.id } });
                            }}
                          >
                            <div className="dm-avatar" style={{ backgroundColor: hashColor(friend.username) }}>
                              {friend.username.charAt(0).toUpperCase()}
                              <span className={`status-ring status-ring-sm ${fc}`} />
                            </div>
                            <div className="dm-info">
                              <div className="dm-username">{friend.username}</div>
                              <div className="dm-status">{friend.customStatus || friend.status}</div>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            )}

            {state.activeNavTab === "servers" && currentServer && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {textChannels.map(ch => (
                  <div
                    key={ch.id}
                    className={"dm-item" + (state.activeChatType === "channel" && ch.id === state.activeChannelId ? " active" : "")}
                    onClick={() => handleChannelClick(ch)}
                  >
                    <span style={{ color: "var(--text-muted)", width: 20, textAlign: "center" }}>#</span>
                    <span>{ch.name}</span>
                  </div>
                ))}
                {voiceChannels.map(ch => (
                  <div key={ch.id} className="dm-item">
                    <span style={{ color: "var(--text-muted)", width: 20, textAlign: "center" }}>&#128266;</span>
                    <span>{ch.name}</span>
                  </div>
                ))}
                <div style={{ height: 12 }} />
                <div className="dm-item" onClick={() => setShowChannelModal(true)}>
                  <span style={{ color: "var(--text-muted)", fontSize: 18, width: 20, textAlign: "center" }}>+</span>
                  <span style={{ color: "var(--text-muted)" }}>Add Channel</span>
                </div>
                <div className="dm-item" onClick={() => setServerSettings(currentServer)}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>&#9881;</span>
                  <span>Server Settings</span>
                </div>
              </div>
            )}

            {state.activeNavTab === "servers" && !currentServer && state.servers.length > 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">&#127987;</div>
                <div className="empty-state-title">Select a server</div>
                <div className="empty-state-desc">Click a server from the top bar.</div>
              </div>
            )}

            {state.activeNavTab === "servers" && state.servers.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">&#127968;</div>
                <div className="empty-state-title">No servers</div>
                <div className="empty-state-desc">Create or join a server to get started.</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL - Chat Area */}
        <ChatPanel
          onStartCall={() => { setVoiceSettingsOpen(false); setCallOpen(true); setCallTarget(null); }}
          onSettings={() => setSettingsOpen(true)}
        />

        {/* BOTTOM BAR - User/Settings/Clock */}
        <div className="bottom-bar" style={{ position: "relative" }}>
          <div className="bottom-bar-left" onClick={() => setShowStatusMenu(!showStatusMenu)}>
            <div className="bottom-bar-avatar" style={{ background: hashColor(state.displayName) }}>
              {state.profilePic ? (
                <img src={state.profilePic} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                state.displayName.charAt(0).toUpperCase()
              )}
              <span className={`status-ring ${statusClass}`} />
            </div>
            <div className="bottom-bar-info">
              <div className="bottom-bar-name">{state.displayName}</div>
              <div className="bottom-bar-status">{state.customStatus || state.status}</div>
            </div>
          </div>

          {showStatusMenu && (
            <div className="status-menu">
              <div className="status-menu-item" onClick={() => setStatus("online")}>
                <span className="status-menu-dot" style={{ background: "var(--green)" }} />
                Online
              </div>
              <div className="status-menu-item" onClick={() => setStatus("idle")}>
                <span className="status-menu-dot" style={{ background: "var(--blue)" }} />
                Idle
              </div>
              <div className="status-menu-item" onClick={() => setStatus("dnd")}>
                <span className="status-menu-dot" style={{ background: "var(--red)" }} />
                Do Not Disturb
              </div>
              <div className="status-menu-item" onClick={() => setStatus("offline")}>
                <span className="status-menu-dot" style={{ background: "var(--grey)" }} />
                Offline
              </div>
              <div className="status-menu-item" onClick={() => setShowLinkAccount(true)}>
                <span style={{ fontSize: 14 }}>🔗</span>
                Link Accounts
              </div>
            </div>
          )}

          <div className="bottom-bar-right">
            <Clock />
            <button className="bottom-bar-btn" onClick={() => setVoiceSettingsOpen(true)} title="Voice">&#128266;</button>
            <button className="bottom-bar-btn" onClick={() => setSettingsOpen(true)} title="Settings">&#9881;</button>
            <button className="bottom-bar-btn" onClick={logout} title="Log Out">&#128682;</button>
          </div>
        </div>
      </main>

      {/* IMAGE POPUP */}
      {state.imagePopup && (
        <Suspense fallback={null}>
          <ImagePopup src={state.imagePopup} onClose={() => dispatch({ type: "SET_IMAGE_POPUP", payload: null })} />
        </Suspense>
      )}

      {/* USER PROFILE */}
      {state.profileModalUser && (
        <Suspense fallback={null}>
          <UserProfile userId={state.profileModalUser} onClose={() => dispatch({ type: "SET_PROFILE_MODAL", payload: null })} />
        </Suspense>
      )}

      {/* INCOMING CALL */}
      {incomingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="incoming-call-avatar" style={{ background: hashColor(incomingCall.username) }}>
              {incomingCall.username.charAt(0).toUpperCase()}
            </div>
            <div className="incoming-call-name">{incomingCall.username}</div>
            <div className="incoming-call-label">Incoming Voice Call</div>
            <div className="incoming-call-actions">
              <button className="incoming-call-btn decline" onClick={declineIncomingCall}>&#10005;</button>
              <button className="incoming-call-btn accept" onClick={acceptIncomingCall}>&#128222;</button>
            </div>
          </div>
        </div>
      )}

      {/* LINK ACCOUNT */}
      {showLinkAccount && (
        <div className="link-account-modal" onClick={() => setShowLinkAccount(false)}>
          <div className="link-account-content" onClick={e => e.stopPropagation()}>
            <h3>Link Accounts</h3>
            <p>Connect your gaming and music accounts to show your activity.</p>
            {[
              { icon: "🎵", name: "Spotify", desc: "Show what you're listening to" },
              { icon: "🎮", name: "Steam", desc: "Show what you're playing" },
              { icon: "🎯", name: "Xbox", desc: "Show your Xbox activity" },
              { icon: "🔄", name: "PlayStation", desc: "Show your PlayStation activity" },
            ].map(item => (
              <div key={item.name} className="link-account-option" onClick={() => {
                const linked = JSON.parse(localStorage.getItem("dangro_linked_accounts") || "{}");
                linked[item.name.toLowerCase()] = !linked[item.name.toLowerCase()];
                localStorage.setItem("dangro_linked_accounts", JSON.stringify(linked));
                setShowLinkAccount(false);
              }}>
                <div className="link-account-option-icon">{item.icon}</div>
                <div className="link-account-option-info">
                  <h4>{item.name}</h4>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS */}
      <ToastContainer />
      {settingsOpen && <Suspense fallback={null}><SettingsPanel onClose={() => setSettingsOpen(false)} /></Suspense>}
      {serverSettings && <Suspense fallback={null}><ServerSettingsPanel server={serverSettings} onClose={() => setServerSettings(null)} /></Suspense>}
      {voiceSettingsOpen && <Suspense fallback={null}><VoiceSettingsPanel onClose={() => setVoiceSettingsOpen(false)} /></Suspense>}
      {callOpen && (
<<<<<<< HEAD
        <CallContainer
          onClose={() => { setCallOpen(false); setCallTarget(null); }}
          channelName={getCallChannel()}
          incomingFrom={callTarget?.incomingFrom || null}
          callerId={callTarget?.callerId || null}
        />
=======
        <Suspense fallback={null}>
          <CallContainer
            onClose={() => { setCallOpen(false); setCallTarget(null); }}
            channelName={getCallChannel()}
            incomingFrom={callTarget?.incomingFrom || null}
          />
        </Suspense>
>>>>>>> 04d2317fe2d090a787bd60a875e264e9fccb82d5
      )}
      {miningOpen && <Suspense fallback={null}><MiningGame onClose={() => setMiningOpen(false)} /></Suspense>}

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
    </>
  );
}
