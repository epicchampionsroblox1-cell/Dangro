import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

export default function ServerSettingsPanel({ server, onClose }) {
  const { state, dispatch, addToast } = useApp();
  const [serverName, setServerName] = useState(server?.name || "");
  const [serverIcon, setServerIcon] = useState(server?.icon || "");
  const [activeTab, setActiveTab] = useState("overview");
  const [memberSearch, setMemberSearch] = useState("");
  const [members, setMembers] = useState([]);
  const [bannedUsers, setBannedUsers] = useState([]);
  const isOwner = server?.ownerId === state.user?.id;
  const isCoOwner = (() => {
    if (isOwner) return false;
    try {
      const co = JSON.parse(server?.coOwnerIds || "[]");
      return co.includes(state.user?.id);
    } catch { return false; }
  })();
  const canMod = isOwner || isCoOwner;

  useEffect(() => {
    if (server && canMod) {
      api.servers.get(server.id).then(srv => {
        setMembers(srv.members || []);
      }).catch(() => {});
    }
  }, [server?.id]);

  useEffect(() => {
    if (server) {
      setServerName(server.name);
      setServerIcon(server.icon || "");
    }
  }, [server]);

  async function handleSave() {
    const name = serverName.trim();
    if (!name) {
      addToast("Server name cannot be empty", "error");
      return;
    }
    try {
      const updated = await api.servers.update(server.id, { name, icon: serverIcon || undefined });
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      addToast("Server settings saved!", "success");
    } catch (e) {
      addToast(e.message || "Failed to update server", "error");
    }
  }

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete " + server.name + "? This action cannot be undone.")) return;
    try {
      await api.servers.remove(server.id);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      dispatch({
        type: "SET_ACTIVE_CHAT",
        payload: { activeServerId: null, activeChatType: null, activeChannelId: null, activeNavTab: "dms" },
      });
      addToast("Server deleted", "info");
      onClose();
    } catch (e) {
      addToast(e.message || "Failed to delete server", "error");
    }
  }

  function hashColor(str) {
    const AVATARS = ["#007aff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ff9500", "#5ac8fa", "#ff2d55"];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return AVATARS[Math.abs(hash) % AVATARS.length];
  }

  async function handleKick(targetUserId, username) {
    if (!window.confirm(`Kick @${username} from ${server.name}?`)) return;
    try {
      await api.servers.kick(server.id, targetUserId);
      setMembers(prev => prev.filter(m => m.id !== targetUserId));
      addToast(`Kicked @${username}`, "info");
    } catch (e) { addToast(e.message || "Failed to kick member", "error"); }
  }

  async function handleBan(targetUserId, username) {
    if (!window.confirm(`Ban @${username} from ${server.name}? They will be kicked and cannot rejoin.`)) return;
    try {
      await api.servers.ban(server.id, targetUserId);
      setMembers(prev => prev.filter(m => m.id !== targetUserId));
      addToast(`Banned @${username}`, "info");
    } catch (e) { addToast(e.message || "Failed to ban member", "error"); }
  }

  async function handleSetCoOwner(targetUserId, username) {
    if (!window.confirm(`Make @${username} a co-owner?`)) return;
    try {
      await api.servers.setCoOwner(server.id, targetUserId);
      addToast(`@${username} is now a co-owner`, "success");
    } catch (e) { addToast(e.message || "Failed to set co-owner", "error"); }
  }

  async function handleRemoveCoOwner(targetUserId, username) {
    if (!window.confirm(`Remove @${username} as co-owner?`)) return;
    try {
      await api.servers.removeCoOwner(server.id, targetUserId);
      addToast(`@${username} is no longer a co-owner`, "info");
    } catch (e) { addToast(e.message || "Failed to remove co-owner", "error"); }
  }

  async function handleLeave() {
    if (!window.confirm("Leave " + server.name + "?")) return;
    try {
      await api.servers.leave(server.id);
      const servers = await api.servers.list();
      dispatch({ type: "SET_SERVERS", payload: servers });
      dispatch({
        type: "SET_ACTIVE_CHAT",
        payload: { activeServerId: null, activeChatType: null, activeChannelId: null, activeNavTab: "dms" },
      });
      addToast("Left server", "info");
      onClose();
    } catch (e) {
      addToast(e.message || "Failed to leave server", "error");
    }
  }

  return (
    <div className="settings-panel" onClick={onClose}>
      <div className="settings-content" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Server Settings - {server?.name}</h2>
          <button className="settings-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="settings-layout">
          <div className="settings-sidebar">
            <button className={"settings-tab" + (activeTab === "overview" ? " active" : "")} onClick={() => setActiveTab("overview")}>
              <span className="settings-tab-icon">&#9881;</span>
              <span className="settings-tab-label">Overview</span>
            </button>
            {canMod && (
              <button className={"settings-tab" + (activeTab === "members" ? " active" : "")} onClick={() => setActiveTab("members")}>
                <span className="settings-tab-icon">&#128101;</span>
                <span className="settings-tab-label">Members</span>
              </button>
            )}
            {isOwner && (
              <button className={"settings-tab" + (activeTab === "coowners" ? " active" : "")} onClick={() => setActiveTab("coowners")}>
                <span className="settings-tab-icon">&#128081;</span>
                <span className="settings-tab-label">Co-Owners</span>
              </button>
            )}
            {canMod && (
              <button className={"settings-tab" + (activeTab === "bans" ? " active" : "")} onClick={() => setActiveTab("bans")}>
                <span className="settings-tab-icon">&#128683;</span>
                <span className="settings-tab-label">Bans</span>
              </button>
            )}
            {isOwner && (
              <button className={"settings-tab" + (activeTab === "delete" ? " active" : "")} onClick={() => setActiveTab("delete")} style={{ color: "var(--red)" }}>
                <span className="settings-tab-icon">&#128465;</span>
                <span className="settings-tab-label">Delete Server</span>
              </button>
            )}
            {!isOwner && (
              <button className={"settings-tab" + (activeTab === "leave" ? " active" : "")} onClick={() => setActiveTab("leave")} style={{ color: "var(--red)" }}>
                <span className="settings-tab-icon">&#128682;</span>
                <span className="settings-tab-label">Leave Server</span>
              </button>
            )}
          </div>
          <div className="settings-body">
            {activeTab === "overview" && (
              <div className="settings-section">
                <h3>Server Overview</h3>
                <div className="settings-info-row">
                  <span>Server ID</span>
                  <span className="settings-info-value" style={{ fontSize: 11 }}>{server?.id}</span>
                </div>
                <div className="settings-info-row">
                  <span>Owner</span>
                  <span className="settings-info-value">{isOwner ? "You" : "Server owner"}</span>
                </div>
                <div className="settings-field">
                  <label>Server Name</label>
                  <input className="settings-input" type="text" value={serverName} onChange={e => setServerName(e.target.value)} disabled={!isOwner} />
                </div>
                <div className="settings-field">
                  <label>Icon Letter</label>
                  <input className="settings-input" type="text" maxLength="1" placeholder={server?.name?.charAt(0)?.toUpperCase()} value={serverIcon} onChange={e => setServerIcon(e.target.value)} disabled={!isOwner} />
                </div>
                <div className="settings-info-row">
                  <span>Invite Code</span>
                  <span className="settings-info-value" style={{ fontSize: 11, userSelect: "all" }}>{server?.inviteCode}</span>
                </div>
                <div className="settings-info-row">
                  <span>Member Count</span>
                  <span className="settings-info-value">{server?.memberCount || server?.members?.length || 0}</span>
                </div>
                {isOwner && (
                  <button className="settings-btn settings-save-btn" onClick={handleSave} style={{ marginTop: 16 }}>Save Changes</button>
                )}
              </div>
            )}
            {activeTab === "members" && canMod && (
              <div className="settings-section">
                <h3>Server Members ({members.length})</h3>
                <div className="settings-field">
                  <input className="settings-input" type="text" placeholder="Search members..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
                </div>
                <div className="server-member-list">
                  {members.filter(m => {
                    if (!memberSearch.trim()) return true;
                    return m.username?.toLowerCase().includes(memberSearch.toLowerCase());
                  }).map(m => (
                    <div key={m.id} className="server-member-item">
                      <div className="server-member-avatar" style={{ background: hashColor(m.username) }}>
                        {m.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="server-member-info">
                        <div className="server-member-name">
                          {m.username}
                          {m.id === server?.ownerId && <span className="server-member-badge owner">Owner</span>}
                          {(() => { try { return JSON.parse(server?.coOwnerIds || "[]").includes(m.id) ? <span className="server-member-badge coowner">Co-Owner</span> : null; } catch { return null; }})()}
                        </div>
                      </div>
                      <div className="server-member-actions">
                        {m.id !== server?.ownerId && m.id !== state.user?.id && (
                          <>
                            <button className="mod-btn danger" onClick={() => handleKick(m.id, m.username)} title="Kick">&#128682;</button>
                            <button className="mod-btn danger" onClick={() => handleBan(m.id, m.username)} title="Ban">&#128683;</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "coowners" && isOwner && (
              <div className="settings-section">
                <h3>Co-Owner Management</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: 12 }}>
                  Co-owners can moderate (kick, ban, timeout) but cannot delete the server or manage co-owners.
                </p>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Current Co-Owners</h4>
                <div className="server-member-list">
                  {members.filter(m => { try { return JSON.parse(server?.coOwnerIds || "[]").includes(m.id); } catch { return false; }}).map(m => (
                    <div key={m.id} className="server-member-item">
                      <div className="server-member-avatar" style={{ background: hashColor(m.username) }}>
                        {m.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="server-member-info">
                        <div className="server-member-name">{m.username}</div>
                      </div>
                      <button className="mod-btn danger" onClick={() => handleRemoveCoOwner(m.id, m.username)} title="Remove Co-Owner">✕</button>
                    </div>
                  ))}
                  {members.filter(m => { try { return JSON.parse(server?.coOwnerIds || "[]").includes(m.id); } catch { return false; }}).length === 0 && (
                    <div className="empty-state" style={{ padding: 16 }}>
                      <div className="empty-state-title" style={{ fontSize: 12 }}>No co-owners set</div>
                    </div>
                  )}
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: "16px 0 8px" }}>Add Co-Owner</h4>
                <div className="server-member-list">
                  {members.filter(m => {
                    if (m.id === server?.ownerId) return false;
                    try { return !JSON.parse(server?.coOwnerIds || "[]").includes(m.id); } catch { return true; }
                  }).map(m => (
                    <div key={m.id} className="server-member-item">
                      <div className="server-member-avatar" style={{ background: hashColor(m.username) }}>
                        {m.username?.charAt(0).toUpperCase()}
                      </div>
                      <div className="server-member-info">
                        <div className="server-member-name">{m.username}</div>
                      </div>
                      <button className="mod-btn primary" onClick={() => handleSetCoOwner(m.id, m.username)} title="Make Co-Owner">&#128081;</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeTab === "bans" && canMod && (
              <div className="settings-section">
                <h3>Banned Users</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 16, fontSize: 12 }}>
                  Banned users cannot join the server. Unban them to allow re-entry.
                </p>
                <div className="server-member-list">
                  {bannedUsers.length === 0 ? (
                    <div className="empty-state" style={{ padding: 16 }}>
                      <div className="empty-state-title" style={{ fontSize: 12 }}>No banned users</div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
            {activeTab === "delete" && isOwner && (
              <div className="settings-section">
                <h3 style={{ color: "var(--red)" }}>Delete Server</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                  Deleting <strong>{server?.name}</strong> will permanently remove all channels, messages, and data. This cannot be undone.
                </p>
                <button className="settings-btn danger" onClick={handleDelete} style={{ background: "var(--red)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}>
                  Delete Server
                </button>
              </div>
            )}
            {activeTab === "leave" && !isOwner && (
              <div className="settings-section">
                <h3 style={{ color: "var(--red)" }}>Leave Server</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.5 }}>
                  Are you sure you want to leave <strong>{server?.name}</strong>? You'll need a new invite to rejoin.
                </p>
                <button className="settings-btn danger" onClick={handleLeave} style={{ background: "var(--red)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 4, fontWeight: 600, cursor: "pointer" }}>
                  Leave Server
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
