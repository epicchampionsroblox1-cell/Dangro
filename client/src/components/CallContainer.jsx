import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../contexts/AppContext";

export default function CallContainer({ onClose, channelName }) {
  const { state, addToast } = useApp();
  const [active, setActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [timer, setTimer] = useState("00:00");
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [videoOff, setVideoOff] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    startCall();
    return () => stopCall();
  }, []);

  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setActive(true);
      setParticipants([{ username: state.displayName, speaking: false }]);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs = (elapsed % 60).toString().padStart(2, "0");
        setTimer(mins + ":" + secs);
      }, 1000);
    } catch (err) {
      addToast("Could not access mic: " + err.message, "error");
      onClose();
    }
  }

  function stopCall() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setActive(false);
    setParticipants([]);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;
    addToast("Disconnected from voice channel", "info");
    onClose();
  }

  function toggleMic() {
    setMicMuted(prev => {
      const newVal = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = !newVal);
      return newVal;
    });
  }

  function toggleDeafen() {
    setDeafened(prev => {
      const newVal = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => t.enabled = newVal ? false : !micMuted);
      return newVal;
    });
  }

  function toggleVideo() {
    if (videoOff) {
      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        const videoTrack = stream.getVideoTracks()[0];
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(videoTrack);
        } else {
          localStreamRef.current = stream;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        setVideoOff(false);
      }).catch(() => {
        addToast("Camera access denied", "error");
      });
    } else {
      if (localStreamRef.current) {
        const tracks = localStreamRef.current.getVideoTracks();
        tracks.forEach(t => { t.stop(); localStreamRef.current.removeTrack(t); });
      }
      setVideoOff(true);
    }
  }

  async function toggleScreenShare() {
    if (screenSharing) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(t => t.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: !videoOff, audio: !micMuted });
        localStreamRef.current = newStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = newStream;
      } catch {}
      setScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStream.getVideoTracks()[0].addEventListener("ended", () => {
          setScreenSharing(false);
          if (!videoOff) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(s => {
              localStreamRef.current = s;
              if (localVideoRef.current) localVideoRef.current.srcObject = s;
            });
          }
        });
        localStreamRef.current = screenStream;
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setScreenSharing(true);
      } catch {}
    }
  }

  return (
    <div className="call-container">
      <div className="call-header">
        <div className="call-header-left">
          <span className="call-status-dot active" />
          <span id="call-status-text">Voice Connected</span>
          {channelName && <span className="call-channel-name">#{channelName}</span>}
        </div>
        <div className="call-timer">{timer}</div>
        <div className="call-header-right">
          <span className="call-participant-count">{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
          <button className="call-end-btn" onClick={stopCall}>Disconnect</button>
        </div>
      </div>

      <div className="call-grid" style={{ display: videoOff && !screenSharing ? "none" : "grid" }}>
        {!videoOff && (
          <div className="call-video-container">
            <video ref={localVideoRef} id="local-video" autoPlay muted playsInline style={{ transform: "scaleX(-1)" }}></video>
            <div className="call-video-label">{state.displayName}</div>
          </div>
        )}
      </div>

      <div className="call-voice-participants">
        {participants.map((p, i) => (
          <div key={i} className={"call-voice-user" + (p.speaking ? " speaking" : "")}>
            <div className="call-voice-avatar">{p.username.charAt(0).toUpperCase()}</div>
            <div className="call-voice-name">{p.username}</div>
            <div className="call-voice-indicator">
              <span className={"voice-status-dot" + (p.username === state.displayName ? (micMuted ? " muted" : " live") : " live")} />
              {p.username === state.displayName && (micMuted ? "Muted" : (deafened ? "Deafened" : "Live"))}
            </div>
          </div>
        ))}
      </div>

      <div className="call-controls">
        <div className="call-controls-left">
          <button className={"call-control-btn" + (micMuted ? " danger" : "")} title={micMuted ? "Unmute Mic" : "Mute Mic"} onClick={toggleMic}>
            {micMuted ? "\uD83D\uDD07" : "\uD83C\uDFA4"}
          </button>
          <button className={"call-control-btn" + (deafened ? " danger" : "")} title={deafened ? "Undeafen" : "Deafen"} onClick={toggleDeafen}>
            {deafened ? "\uD83D\uDD07" : "\uD83D\uDD0A"}
          </button>
        </div>
        <div className="call-controls-center">
          <button className={"call-control-btn" + (videoOff ? "" : " active")} title={videoOff ? "Start Video" : "Stop Video"} onClick={toggleVideo}>
            {videoOff ? "\uD83D\uDDF3" : "\uD83D\uDCF7"}
          </button>
          <button className={"call-control-btn" + (screenSharing ? " active" : "")} title={screenSharing ? "Stop Sharing" : "Share Screen"} onClick={toggleScreenShare}>
            {"\uD83D\uDDA5"}
          </button>
        </div>
        <div className="call-controls-right">
          <button className="call-control-btn danger call-leave-btn" onClick={stopCall} title="Leave Voice Channel">
            \u2609
          </button>
        </div>
      </div>
    </div>
  );
}
