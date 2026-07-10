import React from "react";
import { useApp } from "../contexts/AppContext";
import socket from "../services/socket";
import { api } from "../services/api";
import FriendActivity from "../components/FriendActivity";
import GamingHub from "../components/GamingHub";
import MiningGame from "../components/MiningGame";
import ChatPanel from "../components/ChatPanel";
import RightPanel from "../components/RightPanel";
import SettingsPanel from "../components/SettingsPanel";
import ServerSettingsPanel from "../components/ServerSettingsPanel";
import VoiceSettingsPanel from "../components/VoiceSettingsPanel";
import ToastContainer from "../components/ToastContainer";
import CallContainer from "../components/CallContainer";

const AVATARS = ["#7c3aed", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#3b82f6"];
const SERVER_COLORS = ["#5865f2", "#3ba55d", "#ed4245", "#f0b232", "#a855f7", "#22d3ee", "#eb459e", "#57f287"];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

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
  const [showServerModal, setShowServerModal] = React.useState(false);
  const [showJoinModal, setShowJoinModal] = React.useState(false);
  const [showChannelModal, setShowChannelModal] = React.useState(false);
  const [serverName, setServerName] = React.useState("");
  const [serverIcon, setServerIcon] = React.useState("");
  const [channelName, setChannelName] = React.useState("");
  const [channelType, setChannelType] = React.useState("text");
  const [inviteCode, setInviteCode] = React.useState("");
  const [showStatusMenu, setShowStatusMenu] = React.useState(false);
  const [mobileChat, setMobileChat] = React.useState(false);

  React.useEffect(() => {
    if (state.activeChatType && window.innerWidth <= 480) {
      setMobileChat(true);
    }
  }, [state.activeChatType]);

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

  const statusColor = state.status === "online" ? "var(--green)" :
    state.status === "idle" ? "var(--yellow)" :
    state.status === "dnd" ? "var(--red)" : "var(--text-muted)";

  React.useEffect(() => {
    socket.on("call:incoming", (data) => {
      setIncomingCall(data);
    });
    socket.on("call:accepted", (data) => {
      addToast(`${data.username} accepted your call!`, "success");
    });
    socket.on("call:declined", (data) => {
      addToast(`${data.username} declined your call`, "info");
      setCallOpen(false);
    });
    socket.on("call:ended", (data) => {
      addToast(`${data.username} ended the call`, "info");
      setCallOpen(false);
    });
    return () => {
      socket.off("call:incoming");
      socket.off("call:accepted");
      socket.off("call:declined");
      socket.off("call:ended");
    };
  }, []);

  function acceptIncomingCall() {
    if (!incomingCall) return;
    socket.emit("call:accept", { targetId: incomingCall.from });
    setCallTarget({ incomingFrom: incomingCall.username, channelName: incomingCall.channelName });
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

  function setStatus(status) {
    dispatch({ type: "SET_PROFILE", payload: { status } });
    socket.emit("presence:status", { status });
    setShowStatusMenu(false);
    api.auth.updateProfile({ status }).catch(() => {});
  }

  const textChannels = currentServer?.channels?.filter(c => c.type !== "voice") || [];
  const voiceChannels = currentServer?.channels?.filter(c => c.type === "voice") || [];

  const hasDms = state.friends.some(f =>
    state.messages["dm_" + f.id] && state.messages["dm_" + f.id].length > 0
  );

  return (
    <>
      <div className="app-wrapper">
        <div className="hub-panel">
          <div className="hub-nav">
            <button
              className={"hub-nav-btn" + (state.activeNavTab === "friends" ? " active" : "")}
              onClick={() => dispatch({ type: "SET_NAV_TAB", payload: "friends" })}
            >Friends</button>
            <button
              className={"hub-nav-btn" + (state.activeNavTab === "dms" ? " active" : "")}
              onClick={() => dispatch({ type: "SET_NAV_TAB", payload: "dms" })}
            >DMs</button>
            <button
              className={"hub-nav-btn" + (state.activeNavTab === "servers" ? " active" : "")}
              onClick={() => {
                dispatch({ type: "SET_NAV_TAB", payload: "servers" });
                if (!currentServer && state.servers.length > 0) {
                  handleServerClick(state.servers[0]);
                }
              }}
            >Servers</button>
          </div>

          <div className="hub-content">
            {state.activeNavTab === "friends" && (
              <FriendActivity />
            )}

            {state.activeNavTab === "dms" && (
              <div className="hub-dms">
                <div className="hub-section-header">Direct Messages</div>
                {state.friends.filter(f => f.status !== "pending_in" && f.status !== "pending_out").length === 0 ? (
                  <div className="empty-state" style={{ padding: "24px 16px" }}>
                    <div className="empty-state-icon" style={{ fontSize: 32 }}>💬</div>
                    <div className="empty-state-title" style={{ fontSize: 14 }}>No friends yet</div>
                    <div className="empty-state-desc" style={{ fontSize: 12 }}>Add friends to start messaging.</div>
                  </div>
                ) : (
                  <>
                    <div className="hub-search">
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
                        const fc = friend.status === "online" ? "var(--green)" :
                          friend.status === "idle" ? "var(--yellow)" :
                          friend.status === "dnd" ? "var(--red)" : "var(--text-muted)";
                        return (
                          <div
                            key={friend.id}
                            className={"hub-dm-item" + (state.activeChatType === "dm" && state.activeDmFriendId === friend.id ? " active" : "")}
                            onClick={() => {
                              dispatch({
                                type: "SET_ACTIVE_CHAT",
                                payload: { activeChatType: "dm", activeDmFriendId: friend.id },
                              });
                            }}
                          >
                            <div className="hub-dm-avatar" style={{ backgroundColor: hashColor(friend.username) }}>
                              {friend.username.charAt(0).toUpperCase()}
                              <span className="hub-dm-status" style={{ background: fc }} />
                            </div>
                            <div className="hub-dm-info">
                              <div className="hub-dm-name">{friend.username}</div>
                              <div className="hub-dm-sub">{friend.customStatus || friend.status}</div>
                            </div>
                          </div>
                        );
                      })}
                  </>
                )}
              </div>
            )}

            {state.activeNavTab === "servers" && (
              <div className="hub-servers">
                <div className="hub-server-bar">
                  {state.servers.map((server, i) => (
                    <div
                      key={server.id}
                      className={"hub-server-icon" + (server.id === state.activeServerId ? " active" : "")}
                      onClick={() => handleServerClick(server)}
                      title={server.name}
                      style={{ backgroundColor: SERVER_COLORS[i % SERVER_COLORS.length] }}
                    >
                      {server.icon || server.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  <div className="hub-server-icon add" onClick={() => setShowServerModal(true)} title="Create Server">+</div>
                  <div className="hub-server-icon join" onClick={() => setShowJoinModal(true)} title="Join Server">🔗</div>
                </div>

                {currentServer && (
                  <div className="hub-server-channels">
                    <div className="hub-server-name">{currentServer.name}</div>

                    <div className="hub-channel-section">
                      <div className="hub-channel-header">
                        <span>Text Channels</span>
                        <button className="hub-channel-add" onClick={() => setShowChannelModal(true)}>+</button>
                      </div>
                      {textChannels.map(ch => (
                        <div
                          key={ch.id}
                          className={"hub-channel-item" + (state.activeChatType === "channel" && ch.id === state.activeChannelId ? " active" : "")}
                          onClick={() => handleChannelClick(ch)}
                        >
                          <span className="hub-channel-hash">#</span>
                          <span>{ch.name}</span>
                        </div>
                      ))}
                    </div>

                    {voiceChannels.length > 0 && (
                      <div className="hub-channel-section">
                        <div className="hub-channel-header">
                          <span>Voice Channels</span>
                        </div>
                        {voiceChannels.map(ch => (
                          <div key={ch.id} className="hub-channel-item">
                            <span className="hub-channel-hash">🔊</span>
                            <span>{ch.name}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="hub-channel-section">
                      <div className="hub-channel-item" onClick={() => setServerSettings(currentServer)}>
                        <span className="hub-channel-hash">⚙</span>
                        <span>Server Settings</span>
                      </div>
                    </div>
                  </div>
                )}

                {state.servers.length === 0 && (
                  <div className="empty-state" style={{ padding: "24px 16px" }}>
                    <div className="empty-state-icon" style={{ fontSize: 32 }}>🏠</div>
                    <div className="empty-state-title" style={{ fontSize: 14 }}>No servers yet</div>
                    <div className="empty-state-desc" style={{ fontSize: 12 }}>Create or join a server to get started.</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hub-bottom">
            <GamingHub onStartMining={() => setMiningOpen(true)} />
          </div>

          <div className="hub-profile">
            <div className="hub-profile-avatar" style={{ background: hashColor(state.displayName) }}>
              {state.displayName.charAt(0).toUpperCase()}
              <span className="status-dot" style={{ background: statusColor }} />
            </div>
            <div className="hub-profile-info" onClick={() => setShowStatusMenu(!showStatusMenu)}>
              <div className="hub-profile-name">{state.displayName}</div>
              <div className="hub-profile-status">{state.customStatus || state.status}</div>
            </div>
            <div className="hub-profile-controls">
              <button className="hub-profile-btn" onClick={() => setVoiceSettingsOpen(true)} title="Voice">🎤</button>
              <button className="hub-profile-btn" onClick={() => setShowLinkAccount(true)} title="Linked Accounts">🔗</button>
              <button className="hub-profile-btn" onClick={() => setSettingsOpen(true)} title="Settings">⚙️</button>
              <button className="hub-profile-btn" onClick={logout} title="Log Out">🚪</button>
            </div>
            {showStatusMenu && (
              <div className="status-menu">
                <div className="status-menu-item" onClick={() => setStatus("online")}>
                  <span className="status-menu-dot" style={{ background: "var(--green)" }} />
                  Online
                </div>
                <div className="status-menu-item" onClick={() => setStatus("idle")}>
                  <span className="status-menu-dot" style={{ background: "var(--yellow)" }} />
                  Away
                </div>
                <div className="status-menu-item" onClick={() => setStatus("dnd")}>
                  <span className="status-menu-dot" style={{ background: "var(--red)" }} />
                  Do Not Disturb
                </div>
                <div className="status-menu-item" onClick={() => setStatus("offline")}>
                  <span className="status-menu-dot" style={{ background: "var(--text-muted)" }} />
                  Offline
                </div>
              </div>
            )}
          </div>
        </div>

        <ChatPanel
          onStartCall={() => { setVoiceSettingsOpen(false); setCallOpen(true); setCallTarget(null); }}
          mobileChat={mobileChat}
          onMobileBack={() => setMobileChat(false)}
        />
        <RightPanel />
      </div>

      {incomingCall && (
        <div className="incoming-call-overlay">
          <div className="incoming-call-card">
            <div className="incoming-call-avatar" style={{ background: hashColor(incomingCall.username) }}>
              {incomingCall.username.charAt(0).toUpperCase()}
            </div>
            <div className="incoming-call-name">{incomingCall.username}</div>
            <div className="incoming-call-label">Incoming Voice Call</div>
            <div className="incoming-call-actions">
              <button className="incoming-call-btn decline" onClick={declineIncomingCall}>✕</button>
              <button className="incoming-call-btn accept" onClick={acceptIncomingCall}>📞</button>
            </div>
          </div>
        </div>
      )}

      {showLinkAccount && (
        <div className="link-account-modal" onClick={() => setShowLinkAccount(false)}>
          <div className="link-account-content" onClick={e => e.stopPropagation()}>
            <h3>🔗 Link Accounts</h3>
            <p>Connect your gaming and music accounts to show your activity.</p>
            <div className="link-account-option" onClick={() => {
              const linked = JSON.parse(localStorage.getItem("dangro_linked_accounts") || "{}");
              linked.spotify = !linked.spotify;
              localStorage.setItem("dangro_linked_accounts", JSON.stringify(linked));
              setShowLinkAccount(false);
            }}>
              <div className="link-account-option-icon">🎵</div>
              <div className="link-account-option-info">
                <h4>Spotify</h4>
                <p>Show what you're listening to</p>
              </div>
            </div>
            <div className="link-account-option" onClick={() => {
              const linked = JSON.parse(localStorage.getItem("dangro_linked_accounts") || "{}");
              linked.steam = !linked.steam;
              localStorage.setItem("dangro_linked_accounts", JSON.stringify(linked));
              setShowLinkAccount(false);
            }}>
              <div className="link-account-option-icon">🎮</div>
              <div className="link-account-option-info">
                <h4>Steam</h4>
                <p>Show what you're playing</p>
              </div>
            </div>
            <div className="link-account-option" onClick={() => {
              const linked = JSON.parse(localStorage.getItem("dangro_linked_accounts") || "{}");
              linked.xbox = !linked.xbox;
              localStorage.setItem("dangro_linked_accounts", JSON.stringify(linked));
              setShowLinkAccount(false);
            }}>
              <div className="link-account-option-icon">🎯</div>
              <div className="link-account-option-info">
                <h4>Xbox</h4>
                <p>Show your Xbox activity</p>
              </div>
            </div>
            <div className="link-account-option" onClick={() => {
              const linked = JSON.parse(localStorage.getItem("dangro_linked_accounts") || "{}");
              linked.playstation = !linked.playstation;
              localStorage.setItem("dangro_linked_accounts", JSON.stringify(linked));
              setShowLinkAccount(false);
            }}>
              <div className="link-account-option-icon">🔄</div>
              <div className="link-account-option-info">
                <h4>PlayStation</h4>
                <p>Show your PlayStation activity</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {serverSettings && (
        <ServerSettingsPanel server={serverSettings} onClose={() => setServerSettings(null)} />
      )}
      {voiceSettingsOpen && (
        <VoiceSettingsPanel onClose={() => setVoiceSettingsOpen(false)} />
      )}
      {callOpen && (
        <CallContainer
          onClose={() => { setCallOpen(false); setCallTarget(null); }}
          channelName={getCallChannel()}
          incomingFrom={callTarget?.incomingFrom || null}
        />
      )}
      {miningOpen && <MiningGame onClose={() => setMiningOpen(false)} />}

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
