import React, { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../contexts/AppContext";
import socket from "../services/socket";
let peerConnection = null;
let localStream = null;

export default function CallContainer({ onClose, channelName, incomingFrom, callerId }) {
  const { state, dispatch, addToast } = useApp();
  const [active, setActive] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [timer, setTimer] = useState("00:00");
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [videoOff, setVideoOff] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pendingIceRef = useRef([]);
  const chatMessagesRef = useRef(null);

  const [callTargetId] = useState(callerId || state.activeDmFriendId || state.activeServerId);
  const callChatKey = "call_chat_" + (callTargetId || "channel");
  const callMessages = state.messages[callChatKey] || [];

  useEffect(() => {
    socket.on("call:chat", (data) => {
      addToast("Call chat: " + data.sender + ": " + data.content, "info");
    });
    return () => { socket.off("call:chat"); };
  }, []);

  useEffect(() => {
    if (incomingFrom) {
      setParticipants([{ username: incomingFrom, speaking: false }]);
      setActive(true);
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (!startTimeRef.current) return;
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
        const secs = (elapsed % 60).toString().padStart(2, "0");
        setTimer(mins + ":" + secs);
      }, 1000);
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        localStreamRef.current = stream;
        localStream = stream;
      }).catch(err => {
        addToast("Could not access mic: " + err.message, "error");
      });
    } else {
      startCall();
    }
    setupSocketListeners();
    return () => {
      stopCall();
      socket.off("call:offer");
      socket.off("call:answer");
      socket.off("call:ice-candidate");
      socket.off("call:participant-joined");
      socket.off("call:participant-left");
    };
  }, []);

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [callMessages.length]);

  function setupSocketListeners() {
    socket.on("call:offer", async ({ offer, from }) => {
      if (!peerConnection) {
        await createPeerConnection(false);
      }
      try {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit("call:answer", { answer, to: from });
        for (const ice of pendingIceRef.current) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(ice));
        }
        pendingIceRef.current = [];
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    });

    socket.on("call:answer", async ({ answer }) => {
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
          console.error("Error setting answer:", e);
        }
      }
    });

    socket.on("call:ice-candidate", async ({ candidate }) => {
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      } else {
        pendingIceRef.current.push(candidate);
      }
    });

    socket.on("call:participant-joined", ({ username }) => {
      setParticipants(prev => {
        if (prev.find(p => p.username === username)) return prev;
        return [...prev, { username, speaking: false }];
      });
      addToast(`${username} joined the call`, "info");
    });

    socket.on("call:participant-left", ({ username }) => {
      setParticipants(prev => prev.filter(p => p.username !== username));
      addToast(`${username} left the call`, "info");
    });
  }

  async function createPeerConnection(isInitiator) {
    try {
      const config = {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      };
      peerConnection = new RTCPeerConnection(config);

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      peerConnection.ontrack = (event) => {
        const [remoteStream] = event.streams;
        remoteStreamRef.current = remoteStream;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate && callTargetId) {
          socket.emit("call:ice-candidate", { candidate: event.candidate, to: callTargetId });
        }
      };

      peerConnection.onconnectionstatechange = () => {
        if (peerConnection?.connectionState === "disconnected" ||
            peerConnection?.connectionState === "failed") {
          stopCall();
        }
      };

      if (isInitiator) {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        if (callTargetId) {
          socket.emit("call:offer", { offer, to: callTargetId });
        }
      }

      return peerConnection;
    } catch (e) {
      console.error("Error creating peer connection:", e);
      return null;
    }
  }

  async function startCall() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      localStream = stream;
      setActive(true);
      setParticipants([{ username: state.displayName, speaking: false }]);

      if (callTargetId) {
        socket.emit("call:start", { targetId: callTargetId, channelName });
        await createPeerConnection(true);
      }

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
      localStream = null;
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }
    setActive(false);
    setParticipants([]);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    startTimeRef.current = null;

    if (callTargetId) {
      socket.emit("call:end", { targetId: callTargetId });
    }

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
          if (peerConnection) {
            peerConnection.addTrack(videoTrack, localStreamRef.current);
          }
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
        tracks.forEach(t => {
          t.stop();
          localStreamRef.current.removeTrack(t);
        });
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
        if (peerConnection) {
          const sender = peerConnection.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(newStream.getVideoTracks()[0]);
        }
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
        if (peerConnection) {
          const sender = peerConnection.getSenders().find(s => s.track?.kind === "video");
          if (sender) sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
        setScreenSharing(true);
      } catch {}
    }
  }

  function sendCallChat() {
    const content = chatInput.trim();
    if (!content) return;
    const msg = {
      id: "call_msg_" + Date.now(),
      sender: state.displayName,
      content,
      timestamp: new Date().toISOString(),
      system: false,
    };
    const currentMsgs = state.messages[callChatKey] || [];
    dispatch({ type: "SET_MESSAGES", chatKey: callChatKey, payload: [...currentMsgs, msg] });
    socket.emit("call:chat", { targetId: callTargetId, sender: state.displayName, content });
    setChatInput("");
  }



  return (
    <div className="call-container">
      <div className="call-header">
        <div className="call-header-left">
          <span className="call-status-dot active" />
          <span id="call-status-text">Voice Connected</span>
          {channelName && <span className="call-channel-name">{channelName}</span>}
        </div>
        <div className="call-timer">{timer}</div>
        <div className="call-header-right">
          <span className="call-participant-count">{participants.length} participant{participants.length !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="call-body">
        <div className={"call-main" + (showChat ? " call-main-split" : "")}>
          <div className="call-grid" style={{ display: videoOff && !screenSharing ? "none" : "grid" }}>
            {!videoOff && (
              <div className="call-video-container">
                <video ref={localVideoRef} autoPlay muted playsInline style={{ transform: "scaleX(-1)" }}></video>
                <div className="call-video-label">{state.displayName} (you)</div>
              </div>
            )}
            {!videoOff && (
              <div className="call-video-container">
                <video ref={remoteVideoRef} autoPlay playsInline></video>
                <div className="call-video-label">
                  {participants.find(p => p.username !== state.displayName)?.username || "Remote"}
                </div>
              </div>
            )}
          </div>

          <div className="call-voice-participants" style={{ display: videoOff && !screenSharing ? "flex" : "none" }}>
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
        </div>

        {showChat && (
          <div className="call-chat">
            <div className="call-chat-header">In-Call Chat</div>
            <div className="call-chat-messages" ref={chatMessagesRef}>
              {callMessages.length === 0 ? (
                <div className="empty-state" style={{ padding: "16px" }}>
                  <div className="empty-state-title" style={{ fontSize: 12 }}>No messages in call</div>
                </div>
              ) : (
                callMessages.map(msg => (
                  <div key={msg.id} className="call-chat-msg">
                    <span className="call-chat-sender">{msg.sender}</span>
                    <span className="call-chat-text">{msg.content}</span>
                  </div>
                ))
              )}
            </div>
            <div className="call-chat-input">
              <input
                type="text" placeholder="Chat in call..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCallChat(); } }}
              />
              <button onClick={sendCallChat} disabled={!chatInput.trim()}>Send</button>
            </div>
          </div>
        )}
      </div>

      <div className="call-controls">
        <div className="call-controls-left">
          <button className={"call-control-btn" + (micMuted ? " danger" : "")} title={micMuted ? "Unmute Mic" : "Mute Mic"} onClick={toggleMic}>
            {micMuted ? "🔇" : "🎤"}
          </button>
          <button className={"call-control-btn" + (deafened ? " danger" : "")} title={deafened ? "Undeafen" : "Deafen"} onClick={toggleDeafen}>
            {deafened ? "🔇" : "🔊"}
          </button>
        </div>
        <div className="call-controls-center">
          <button className={"call-control-btn" + (videoOff ? "" : " active")} title={videoOff ? "Start Video" : "Stop Video"} onClick={toggleVideo}>
            {videoOff ? "📷" : "📹"}
          </button>
          <button className={"call-control-btn" + (screenSharing ? " active" : "")} title={screenSharing ? "Stop Sharing" : "Share Screen"} onClick={toggleScreenShare}>
            {"🖥"}
          </button>
          <button className={"call-control-btn" + (showChat ? " active" : "")} title={showChat ? "Hide Chat" : "Show Chat"} onClick={() => setShowChat(!showChat)}>
            💬
          </button>
        </div>
        <div className="call-controls-right">
          <button className="call-control-btn danger call-leave-btn" onClick={stopCall} title="Leave Voice Channel">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
