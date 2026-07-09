import React, { useState, useEffect, useRef } from "react";
import { useApp } from "../contexts/AppContext";

export default function VoiceSettingsPanel({ onClose }) {
  const { addToast } = useApp();
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedInput, setSelectedInput] = useState("");
  const [selectedOutput, setSelectedOutput] = useState("");
  const [inputVolume, setInputVolume] = useState(80);
  const [outputVolume, setOutputVolume] = useState(100);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [micActive, setMicActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const testStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioInputs = devices.filter(d => d.kind === "audioinput");
      const audioOutputs = devices.filter(d => d.kind === "audiooutput");
      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);
      if (audioInputs.length > 0) setSelectedInput(audioInputs[0].deviceId);
      if (audioOutputs.length > 0) setSelectedOutput(audioOutputs[0].deviceId);
    }).catch(() => {});
    return () => {
      stopMicTest();
    };
  }, []);

  function startMicTest() {
    if (micActive) return;
    navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: selectedInput ? { exact: selectedInput } : undefined,
        echoCancellation: echoCancellation,
        noiseSuppression: noiseSuppression,
      }
    }).then(stream => {
      testStreamRef.current = stream;
      setMicActive(true);
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function updateLevel() {
        if (!audioCtx) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = Array.from(dataArray).reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round(avg * 2)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();
    }).catch(err => {
      addToast("Mic access denied: " + err.message, "error");
    });
  }

  function stopMicTest() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = null;
    if (testStreamRef.current) {
      testStreamRef.current.getTracks().forEach(t => t.stop());
      testStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setMicActive(false);
    setMicLevel(0);
  }

  return (
    <div className="settings-panel" onClick={onClose}>
      <div className="settings-content voice-settings-content" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Voice Settings</h2>
          <button className="settings-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="settings-layout">
          <div className="settings-sidebar">
            <button className="settings-tab active">
              <span className="settings-tab-icon">&#127908;</span>
              <span className="settings-tab-label">Voice & Video</span>
            </button>
          </div>
          <div className="settings-body">
            <div className="settings-section">
              <h3>Voice Settings</h3>

              <div className="settings-field">
                <label>Input Device</label>
                <select className="settings-select" value={selectedInput} onChange={e => { setSelectedInput(e.target.value); if (micActive) { stopMicTest(); } }}>
                  {inputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || "Microphone " + (inputDevices.indexOf(d) + 1)}</option>
                  ))}
                  {inputDevices.length === 0 && <option value="">No input devices found</option>}
                </select>
              </div>

              <div className="settings-field">
                <label>Output Device</label>
                <select className="settings-select" value={selectedOutput} onChange={e => setSelectedOutput(e.target.value)}>
                  {outputDevices.map(d => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || "Speaker " + (outputDevices.indexOf(d) + 1)}</option>
                  ))}
                  {outputDevices.length === 0 && <option value="">No output devices found</option>}
                </select>
              </div>

              <div className="settings-field">
                <label>Input Volume: {inputVolume}%</label>
                <input type="range" min="0" max="100" value={inputVolume} onChange={e => setInputVolume(Number(e.target.value))} className="settings-slider" />
              </div>

              <div className="settings-field">
                <label>Output Volume: {outputVolume}%</label>
                <input type="range" min="0" max="100" value={outputVolume} onChange={e => setOutputVolume(Number(e.target.value))} className="settings-slider" />
              </div>

              <hr className="settings-divider" />

              <div className="settings-field">
                <label>Mic Test</label>
                <div className="mic-test-area">
                  <button className={"settings-btn" + (micActive ? " danger" : "")} onClick={micActive ? stopMicTest : startMicTest}>
                    {micActive ? "Stop Test" : "Test Microphone"}
                  </button>
                  {micActive && (
                    <div className="mic-level-bar">
                      <div className="mic-level-fill" style={{ width: micLevel + "%" }} />
                    </div>
                  )}
                </div>
              </div>

              <hr className="settings-divider" />

              <label className="settings-toggle">
                <span>Echo Cancellation</span>
                <input type="checkbox" checked={echoCancellation} onChange={e => setEchoCancellation(e.target.checked)} />
              </label>

              <label className="settings-toggle">
                <span>Noise Suppression</span>
                <input type="checkbox" checked={noiseSuppression} onChange={e => setNoiseSuppression(e.target.checked)} />
              </label>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
