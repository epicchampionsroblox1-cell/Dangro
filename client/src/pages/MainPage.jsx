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
  const { state, dispatch } = useApp();
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [serverSettings, setServerSettings] = React.useState(null);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = React.useState(false);
  const [callOpen, setCallOpen] = React.useState(false);

  const currentServer = state.servers.find(s => s.id === state.activeServerId);

  return (
    <>
      <div className="app-wrapper">
        <LeftPanel
          onSettings={() => setSettingsOpen(true)}
          onCall={() => setVoiceSettingsOpen(true)}
          onServerSettings={(server) => setServerSettings(server)}
        />
        <ChatPanel />
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
      {callOpen && <CallContainer onClose={() => setCallOpen(false)} />}
    </>
  );
}
