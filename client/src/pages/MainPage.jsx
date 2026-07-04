import React from "react";
import { useApp } from "../contexts/AppContext";
import LeftPanel from "../components/LeftPanel";
import ChatPanel from "../components/ChatPanel";
import RightPanel from "../components/RightPanel";
import SettingsPanel from "../components/SettingsPanel";
import ServerSettingsPanel from "../components/ServerSettingsPanel";
import VoiceSettingsPanel from "../components/VoiceSettingsPanel";
import ToastContainer from "../components/ToastContainer";
import CallContainer from "../components/CallContainer";

export default function MainPage() {
  const { state } = useApp();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [serverSettings, setServerSettings] = React.useState(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

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

  function getChatTarget() {
    if (state.activeChatType === "dm" && state.activeDmFriendId) {
      return "dm_" + state.activeDmFriendId;
    }
    if (state.activeChatType === "channel" && state.activeServerId && state.activeChannelId) {
      return state.activeServerId + "_" + state.activeChannelId;
    }
    return null;
  }

  return (
    <>
      <div className="app-wrapper">
        <LeftPanel
          onSettings={() => setSettingsOpen(true)}
          onVoiceSettings={() => setVoiceSettingsOpen(true)}
          onServerSettings={(server) => setServerSettings(server)}
        />
        <ChatPanel
          onStartCall={() => {
            setVoiceSettingsOpen(false);
            setCallOpen(true);
          }}
        />
        <RightPanel />
      </div>
      <ToastContainer />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {serverSettings && (
        <ServerSettingsPanel
          server={serverSettings}
          onClose={() => setServerSettings(null)}
        />
      )}
      {voiceSettingsOpen && (
        <VoiceSettingsPanel
          onClose={() => setVoiceSettingsOpen(false)}
          onStartCall={() => { setVoiceSettingsOpen(false); setCallOpen(true); }}
        />
      )}
      {callOpen && <CallContainer onClose={() => setCallOpen(false)} channelName={getCallChannel()} />}
    </>
  );
}
