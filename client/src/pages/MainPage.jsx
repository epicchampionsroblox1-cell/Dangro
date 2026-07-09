import React from "react";
import { useApp } from "../contexts/AppContext";
import socket from "../services/socket";
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

  return (
    <>
      <div className="app-wrapper">
        <div className="hub-panel">
          <FriendActivity onLinkAccount={() => setShowLinkAccount(true)} />
          <div className="hub-bottom">
            <GamingHub onStartMining={() => setMiningOpen(true)} />
          </div>
          <div className="hub-profile">
            <div className="hub-profile-avatar" style={{ background: hashColor(state.displayName) }} onClick={() => setSettingsOpen(true)}>
              {state.displayName.charAt(0).toUpperCase()}
              <span className="status-dot" style={{ background: statusColor }} />
            </div>
            <div className="hub-profile-info">
              <div className="hub-profile-name" onClick={() => setSettingsOpen(true)}>{state.displayName}</div>
              <div className="hub-profile-status">{state.customStatus || state.status}</div>
            </div>
            <div className="hub-profile-controls">
              <button className="hub-profile-btn" onClick={() => setVoiceSettingsOpen(true)} title="Voice">🎤</button>
              <button className="hub-profile-btn" onClick={() => setSettingsOpen(true)} title="Settings">⚙️</button>
              <button className="hub-profile-btn" onClick={logout} title="Log Out">🚪</button>
            </div>
          </div>
        </div>

        <ChatPanel
          onStartCall={() => { setVoiceSettingsOpen(false); setCallOpen(true); setCallTarget(null); }}
          onStartVideoCall={() => { setVoiceSettingsOpen(false); setCallOpen(true); setCallTarget(null); }}
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
        <VoiceSettingsPanel
          onClose={() => setVoiceSettingsOpen(false)}
        />
      )}
      {callOpen && (
        <CallContainer
          onClose={() => { setCallOpen(false); setCallTarget(null); }}
          channelName={getCallChannel()}
          incomingFrom={callTarget?.incomingFrom || null}
        />
      )}
      {miningOpen && <MiningGame onClose={() => setMiningOpen(false)} />}
    </>
  );
}
