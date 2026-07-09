import React from "react";
import { useApp } from "../contexts/AppContext";

export default function RightPanel() {
  const { state } = useApp();

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

  return (
    <div className="right-panel" style={{ display: !currentServer || state.activeNavTab !== "servers" ? "none" : "flex" }}>
      <div className="right-panel-header">
        <h2>Members</h2>
      </div>
      <div className="right-panel-content">
        <div className="right-section-header">
          <span>Online — {currentServer?.members?.length || 0}</span>
        </div>
        {currentServer?.members?.map(member => (
          <div key={member.id} className="member-item">
            <div className="member-avatar" style={{ background: "#5865f2" }}>
              {member.username.charAt(0).toUpperCase()}
            </div>
            <span className="member-name">{member.display_name || member.username}</span>
            <span className="member-status" style={{
              background: member.status === "online" ? "var(--green)" :
                member.status === "idle" ? "var(--yellow)" :
                member.status === "dnd" ? "var(--red)" : "var(--text-muted)"
            }} />
          </div>
        ))}
        {(!currentServer || !currentServer.members || currentServer.members.length === 0) && (
          <div className="empty-state" style={{ padding: "24px 16px" }}>
            <div className="empty-state-title" style={{ fontSize: 13 }}>No members yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
