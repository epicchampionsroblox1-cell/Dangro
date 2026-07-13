import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../contexts/AppContext";
import { api } from "../services/api";
import socket from "../services/socket";

const SETTINGS_TABS = [
  { id: "profile", label: "Profile", icon: "\uD83D\uDC64" },
  { id: "account", label: "Account", icon: "\uD83D\uDD12" },
  { id: "appearance", label: "Appearance", icon: "\uD83C\uDFA8" },
  { id: "messages", label: "Messages", icon: "\uD83D\uDCAC" },
  { id: "notifications", label: "Notifications", icon: "\uD83D\uDD14" },
  { id: "privacy", label: "Privacy", icon: "\uD83D\uDD75" },
  { id: "shortcuts", label: "Shortcuts", icon: "\u2328\uFE0F" },
];

const COLOR_PRESETS = [
  "#5865f2", "#3ba55d", "#ed4245", "#f0b232",
  "#a855f7", "#22d3ee", "#eb459e", "#57f287",
  "#ff6b6b", "#ffa94d", "#ffd43b", "#69db7c",
  "#4dabf7", "#9775fa", "#f783ac", "#20c997",
];

const THEMES = [
  { id: "oled", name: "OLED Black", primary: "#000000", secondary: "#0a0a0a", accent: "#bb86fc" },
  { id: "dark", name: "Dark", primary: "#313338", secondary: "#2b2d31", accent: "#5865f2" },
  { id: "light", name: "Light", primary: "#ffffff", secondary: "#f2f3f5", accent: "#5865f2" },
  { id: "midnight", name: "Midnight", primary: "#0d1117", secondary: "#161b22", accent: "#58a6ff" },
  { id: "forest", name: "Forest", primary: "#1a2e1a", secondary: "#243824", accent: "#4ade80" },
  { id: "sunset", name: "Sunset", primary: "#2d1b1b", secondary: "#3d2525", accent: "#f97316" },
  { id: "ocean", name: "Ocean", primary: "#0c1a2e", secondary: "#142640", accent: "#38bdf8" },
  { id: "coffee", name: "Coffee", primary: "#2c1810", secondary: "#3e2218", accent: "#c4a882" },
  { id: "neon", name: "Neon", primary: "#0a0a0a", secondary: "#141414", accent: "#00ff88" },
  { id: "lavender", name: "Lavender", primary: "#1a1525", secondary: "#231d30", accent: "#c084fc" },
];

export default function SettingsPanel({ onClose }) {
  const { state, dispatch, logout, addToast } = useApp();
  const [tab, setTab] = useState("profile");
  const [displayName, setDisplayName] = useState(state.displayName);
  const [bio, setBio] = useState(state.bio);
  const [profilePic, setProfilePic] = useState(state.profilePic);
  const [status, setStatus] = useState(state.status);
  const [customStatus, setCustomStatus] = useState(state.customStatus);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [theme, setTheme] = useState("oled");
  const [banner, setBanner] = useState(state.banner || "");
  const [msgColor, setMsgColor] = useState(state.msgColor || "#ffffff");
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyFriends, setNotifyFriends] = useState(true);
  const [notifySounds, setNotifySounds] = useState(true);
  const [privacyDMs, setPrivacyDMs] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setDisplayName(state.displayName);
    setBio(state.bio);
    setStatus(state.status);
    setCustomStatus(state.customStatus);
  }, [state]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dangro_theme") || "oled";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("dangro_msg_color") || "#ffffff";
    setMsgColor(saved);
  }, []);

  async function handleBannerUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.upload.file(file, (progress) => {
        dispatch({ type: "SET_UPLOAD_PROGRESS", payload: progress });
      });
      setBanner(result.url);
      addToast("Banner uploaded!", "success");
    } catch {
      addToast("Upload failed", "error");
    } finally {
      dispatch({ type: "SET_UPLOAD_PROGRESS", payload: null });
    }
  }

  function applyTheme(themeId) {
    const t = THEMES.find(th => th.id === themeId);
    if (!t) return;
    const root = document.documentElement;
    if (themeId === "light") {
      root.setAttribute("data-theme", "light");
    } else if (themeId === "dark") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", themeId);
      root.style.setProperty("--bg-primary", t.primary);
      root.style.setProperty("--bg-secondary", t.secondary);
      root.style.setProperty("--accent", t.accent);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await api.upload.file(file, (progress) => {
        dispatch({ type: "SET_UPLOAD_PROGRESS", payload: progress });
      });
      setProfilePic(result.url);
      addToast("Profile photo uploaded!", "success");
    } catch {
      addToast("Upload failed", "error");
    } finally {
      dispatch({ type: "SET_UPLOAD_PROGRESS", payload: null });
    }
  }

  async function saveProfile() {
    try {
      const bannerVal = banner.trim() || state.banner;
      const picVal = profilePic || state.profilePic;
      await api.auth.updateProfile({
        displayName: displayName.trim() || state.displayName,
        bio: bio.trim(),
        banner: bannerVal,
        profilePic: picVal,
        status,
        customStatus: customStatus.trim(),
        theme,
      });
      dispatch({
        type: "SET_PROFILE",
        payload: {
          displayName: displayName.trim() || state.displayName,
          bio: bio.trim(),
          banner: bannerVal,
          profilePic: picVal,
          status,
          customStatus: customStatus.trim(),
        },
      });
      socket.emit("profile:updated", { profilePic: picVal, banner: bannerVal });
      addToast("Settings saved!", "success");
    } catch (e) {
      addToast(e.message || "Failed to save settings", "error");
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      addToast("Fill in both password fields", "error");
      return;
    }
    if (newPassword.length < 6) {
      addToast("Password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast("Passwords do not match", "error");
      return;
    }
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      addToast("Password updated! Please log in again.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      addToast(e.message || "Failed to change password", "error");
    }
  }

  function handleThemeChange(newTheme) {
    setTheme(newTheme);
    applyTheme(newTheme);
    localStorage.setItem("dangro_theme", newTheme);
  }

  function handleMsgColorChange(color) {
    setMsgColor(color);
    localStorage.setItem("dangro_msg_color", color);
    dispatch({ type: "SET_PROFILE", payload: { msgColor: color } });
  }

  return (
    <div className="settings-panel" onClick={onClose}>
      <div className="settings-content" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>&#10005;</button>
        </div>
        <div className="settings-layout">
          <div className="settings-sidebar">
            {SETTINGS_TABS.map(t => (
              <button
                key={t.id}
                className={"settings-tab" + (tab === t.id ? " active" : "")}
                onClick={() => setTab(t.id)}
              >
                <span className="settings-tab-icon">{t.icon}</span>
                <span className="settings-tab-label">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="settings-body">
            {tab === "profile" && (
              <div className="settings-section">
                <h3>Profile</h3>
                <div className="settings-profile-pic">
                  <div className="settings-avatar" style={{
                    backgroundColor: profilePic ? "transparent" : undefined,
                  }}>
                    {profilePic ? (
                      <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      state.displayName.charAt(0).toUpperCase() || "U"
                    )}
                  </div>
                  <button className="settings-btn" onClick={() => fileInputRef.current?.click()}>Upload Photo</button>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
                  {profilePic && (
                    <button className="settings-btn" onClick={() => { setProfilePic(""); addToast("Profile photo removed", "info"); }} style={{ color: "var(--red)" }}>Remove</button>
                  )}
                </div>
                <div className="settings-field">
                  <label>Display Name</label>
                  <input type="text" className="settings-input" value={displayName} onChange={e => setDisplayName(e.target.value)} />
                </div>
                <div className="settings-field">
                  <label>Banner Image</label>
                  <button className="settings-btn" onClick={() => { const el = document.createElement("input"); el.type = "file"; el.accept = "image/*"; el.onchange = handleBannerUpload; el.click(); }}>Upload Banner</button>
                  {banner && <div style={{ marginTop: 8, width: "100%", height: 80, borderRadius: "var(--radius-sm)", background: `url(${banner}) center/cover`, border: "1px solid var(--border-color)" }} />}
                </div>
                <div className="settings-field">
                  <label>Bio</label>
                  <textarea className="settings-textarea" placeholder="Tell us about yourself..." rows="3" value={bio} onChange={e => setBio(e.target.value)} />
                </div>
                <div className="settings-field">
                  <label>Status</label>
                  <select className="settings-select" value={status} onChange={e => setStatus(e.target.value)}>
                    <option value="online">Online</option>
                    <option value="idle">Idle</option>
                    <option value="dnd">Do Not Disturb</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="settings-field">
                  <label>Custom Status</label>
                  <input type="text" className="settings-input" placeholder="What's on your mind?" value={customStatus} onChange={e => setCustomStatus(e.target.value)} />
                </div>
              </div>
            )}

            {tab === "account" && (
              <div className="settings-section">
                <h3>Account</h3>
                <div className="settings-info-row">
                  <span>Username</span>
                  <span className="settings-info-value">{state.user?.username}</span>
                </div>
                <div className="settings-info-row">
                  <span>Email</span>
                  <span className="settings-info-value">{state.user?.email || "Not set"}</span>
                </div>
                <hr className="settings-divider" />
                <div className="settings-field">
                  <label>Current Password</label>
                  <input type="password" className="settings-input" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </div>
                <div className="settings-field">
                  <label>New Password</label>
                  <input type="password" className="settings-input" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="settings-field">
                  <label>Confirm New Password</label>
                  <input type="password" className="settings-input" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <button className="settings-btn" onClick={changePassword}>Change Password</button>
              </div>
            )}

            {tab === "appearance" && (
              <div className="settings-section">
                <h3>Appearance</h3>
                <div className="settings-theme-options" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      className={"settings-theme-card" + (theme === t.id ? " active" : "")}
                      onClick={() => handleThemeChange(t.id)}
                      style={{ border: theme === t.id ? "2px solid var(--accent)" : "2px solid var(--border-color)" }}
                    >
                      <div className="settings-theme-preview" style={{
                        background: t.id === "light"
                          ? "linear-gradient(135deg, #ffffff 50%, #e3e5e8 50%)"
                          : `linear-gradient(135deg, ${t.primary} 50%, ${t.secondary} 50%)`,
                      }} />
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>
                <h3>Color Customization</h3>
                <div className="settings-field">
                  <label>Accent Color</label>
                  <input type="color" className="settings-color-input" value={theme === "dark" ? "#5865f2" : theme === "light" ? "#5865f2" : "#58a6ff"}
                    onChange={e => {
                      document.documentElement.style.setProperty("--accent", e.target.value);
                      localStorage.setItem("dangro_accent", e.target.value);
                    }} />
                </div>
                <div className="settings-field">
                  <label>Background Intensity</label>
                  <input type="range" className="settings-slider" min="0" max="100" defaultValue={50}
                    onChange={e => {
                      const v = e.target.value;
                      document.documentElement.style.setProperty("--bg-dim", v + "%");
                    }} />
                </div>
              </div>
            )}

            {tab === "messages" && (
              <div className="settings-section">
                <h3>Message Appearance</h3>
                <div className="settings-field">
                  <label>Your Message Color</label>
                  <div className="msg-color-picker">
                    <input type="color" className="settings-color-input" value={msgColor} onChange={e => handleMsgColorChange(e.target.value)} />
                    <span className="msg-color-preview" style={{
                      background: msgColor,
                      width: 32, height: 32, borderRadius: 8, display: "inline-block", verticalAlign: "middle", marginLeft: 8, border: "1px solid var(--border-color)"
                    }} />
                    <span className="msg-color-hex" style={{ marginLeft: 8, fontSize: 12, color: "var(--text-muted)" }}>{msgColor}</span>
                  </div>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                  This color will be used for your username in messages. If someone else has the same color, theirs will shift slightly.
                </p>
                <div className="settings-field" style={{ marginTop: 16 }}>
                  <label>Quick Colors</label>
                  <div className="msg-color-presets">
                    {COLOR_PRESETS.map(color => (
                      <button
                        key={color}
                        className={"msg-color-preset" + (msgColor === color ? " active" : "")}
                        style={{ background: color }}
                        onClick={() => handleMsgColorChange(color)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "notifications" && (
              <div className="settings-section">
                <h3>Notification Settings</h3>
                <label className="settings-toggle">
                  <span>Message notifications</span>
                  <input type="checkbox" checked={notifyMessages} onChange={e => setNotifyMessages(e.target.checked)} />
                </label>
                <label className="settings-toggle">
                  <span>Friend request notifications</span>
                  <input type="checkbox" checked={notifyFriends} onChange={e => setNotifyFriends(e.target.checked)} />
                </label>
                <label className="settings-toggle">
                  <span>Sound effects</span>
                  <input type="checkbox" checked={notifySounds} onChange={e => setNotifySounds(e.target.checked)} />
                </label>
              </div>
            )}

            {tab === "privacy" && (
              <div className="settings-section">
                <h3>Privacy Settings</h3>
                <label className="settings-toggle">
                  <span>Allow direct messages from everyone</span>
                  <input type="checkbox" checked={privacyDMs} onChange={e => setPrivacyDMs(e.target.checked)} />
                </label>
              </div>
            )}

            {tab === "shortcuts" && (
              <div className="settings-section">
                <h3>Keyboard Shortcuts</h3>
                <div className="shortcut-list">
                  {[
                    { keys: "Enter", desc: "Send message" },
                    { keys: "Shift + Enter", desc: "New line" },
                    { keys: "Escape", desc: "Cancel reply / Close picker" },
                    { keys: "Ctrl + K", desc: "Quick switcher" },
                    { keys: "Ctrl + ,", desc: "Settings" },
                    { keys: "Up arrow", desc: "Edit last message" },
                  ].map((s, i) => (
                    <div key={i} className="shortcut-item">
                      <span className="shortcut-desc">{s.desc}</span>
                      <kbd className="shortcut-keys">{s.keys}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(tab === "profile" || tab === "account") && (
              <button className="settings-btn settings-save-btn" onClick={saveProfile}>Save Changes</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
