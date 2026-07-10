import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";

export default function ServerSettingsPanel({ server, onClose }) {
  const { state, dispatch, addToast } = useApp();
  const [serverName, setServerName] = useState(server?.name || "");
  const [serverIcon, setServerIcon] = useState(server?.icon || "");
  const [activeTab, setActiveTab] = useState("overview");
  const isOwner = server?.ownerId === state.user?.id;

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
