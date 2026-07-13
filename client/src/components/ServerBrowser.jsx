import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { useApp } from "../contexts/AppContext";

export default function ServerBrowser({ onClose }) {
  const { addToast } = useApp();
  const [servers, setServers] = useState([]);
  const [query, setQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServers();
  }, []);

  async function loadServers(q) {
    setLoading(true);
    try {
      const data = await api.servers.browse(q || "");
      setServers(data);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 1 || val.trim().length === 0) {
      setTimeout(() => loadServers(val.trim()), 300);
    }
  }

  async function handleJoin(code) {
    if (!code.trim()) return;
    setJoining(true);
    try {
      await api.servers.join(code.trim());
      addToast("Joined server!", "success");
      onClose();
    } catch (e) {
      addToast(e.message || "Failed to join server", "error");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="server-browser" onClick={e => e.stopPropagation()}>
        <div className="server-browser-header">
          <h2>Server Browser</h2>
          <button className="settings-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="server-browser-body">
          <div className="server-browser-section">
            <h3>Join with Invite Code</h3>
            <div className="server-browser-invite">
              <input type="text" placeholder="Paste invite code..." value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleJoin(inviteCode); }} />
              <button onClick={() => handleJoin(inviteCode)} disabled={joining || !inviteCode.trim()}>
                {joining ? "Joining..." : "Join"}
              </button>
            </div>
          </div>
          <div className="server-browser-divider" />
          <div className="server-browser-section">
            <h3>Discover Servers</h3>
            <div className="server-browser-search">
              <input type="text" placeholder="Search servers..." value={query} onChange={handleSearch} />
            </div>
            <div className="server-browser-list">
              {loading ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="loading-spinner" />
                </div>
              ) : servers.length === 0 ? (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-state-title" style={{ fontSize: 14 }}>No servers found</div>
                  <div className="empty-state-desc" style={{ fontSize: 12 }}>Try a different search or use an invite code.</div>
                </div>
              ) : (
                servers.map(srv => (
                  <div key={srv.id} className="server-browser-item">
                    <div className="server-browser-icon">{srv.icon}</div>
                    <div className="server-browser-info">
                      <div className="server-browser-name">{srv.name}</div>
                      <div className="server-browser-desc">{srv.description}</div>
                      <div className="server-browser-meta">{srv.memberCount} members</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}