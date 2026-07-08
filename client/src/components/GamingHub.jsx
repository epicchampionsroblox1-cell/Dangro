import React, { useState } from "react";

const DEFAULT_FAVOURITES = [
  { name: "Elden Ring", icon: "⚔️", desc: "Action RPG" },
  { name: "Minecraft", icon: "⛏️", desc: "Sandbox Survival" },
];

const DEFAULT_WISHLIST = [
  { name: "GTA VI", icon: "🚗", desc: "Coming soon..." },
  { name: "Silksong", icon: "🪲", desc: "Hollow Knight sequel" },
];

export default function GamingHub({ onStartMining }) {
  const [activeTab, setActiveTab] = useState("favourites");
  const [favourites, setFavourites] = useState(() => {
    const saved = localStorage.getItem("dangro_fav_games");
    return saved ? JSON.parse(saved) : DEFAULT_FAVOURITES;
  });
  const [wishlist, setWishlist] = useState(() => {
    const saved = localStorage.getItem("dangro_wishlist");
    return saved ? JSON.parse(saved) : DEFAULT_WISHLIST;
  });
  const [showAddGame, setShowAddGame] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGameIcon, setNewGameIcon] = useState("🎮");

  function saveFavourites(list) {
    setFavourites(list);
    localStorage.setItem("dangro_fav_games", JSON.stringify(list));
  }

  function saveWishlist(list) {
    setWishlist(list);
    localStorage.setItem("dangro_wishlist", JSON.stringify(list));
  }

  function removeFavourite(index) {
    saveFavourites(favourites.filter((_, i) => i !== index));
  }

  function removeWishlist(index) {
    saveWishlist(wishlist.filter((_, i) => i !== index));
  }

  function addGame() {
    const name = newGameName.trim();
    if (!name) return;
    const game = { name, icon: newGameIcon, desc: "Custom game" };
    if (activeTab === "favourites") {
      saveFavourites([...favourites, game]);
    } else {
      saveWishlist([...wishlist, game]);
    }
    setNewGameName("");
    setShowAddGame(false);
  }

  const ICONS = ["🎮", "⚔️", "⛏️", "🚗", "🔫", "🪲", "🏰", "🚀", "🧙", "🏎️"];

  return (
    <div className="gaming-hub">
      <div className="gh-header">
        <span>Gaming Hub</span>
      </div>
      <div className="gh-tabs">
        <button className={"gh-tab" + (activeTab === "favourites" ? " active" : "")} onClick={() => setActiveTab("favourites")}>
          ⭐ Favourites
        </button>
        <button className={"gh-tab" + (activeTab === "wishlist" ? " active" : "")} onClick={() => setActiveTab("wishlist")}>
          📋 Wishlist
        </button>
        <button className={"gh-tab" + (activeTab === "minigames" ? " active" : "")} onClick={() => setActiveTab("minigames")}>
          🎮 Mini-Games
        </button>
      </div>
      <div className="gh-content">
        {activeTab === "favourites" && (
          <>
            {favourites.map((game, i) => (
              <div key={i} className="gh-game-item">
                <div className="gh-game-icon">{game.icon}</div>
                <div className="gh-game-info">
                  <div className="gh-game-name">{game.name}</div>
                  <div className="gh-game-desc">{game.desc}</div>
                </div>
                <button className="gh-game-remove" onClick={() => removeFavourite(i)} title="Remove">✕</button>
              </div>
            ))}
            <button className="gh-add-btn" onClick={() => setShowAddGame(true)}>
              + Add Favourite Game
            </button>
          </>
        )}
        {activeTab === "wishlist" && (
          <>
            {wishlist.map((game, i) => (
              <div key={i} className="gh-game-item">
                <div className="gh-game-icon">{game.icon}</div>
                <div className="gh-game-info">
                  <div className="gh-game-name">{game.name}</div>
                  <div className="gh-game-desc">{game.desc}</div>
                </div>
                <button className="gh-game-remove" onClick={() => removeWishlist(i)} title="Remove">✕</button>
              </div>
            ))}
            <button className="gh-add-btn" onClick={() => setShowAddGame(true)}>
              + Add to Wishlist
            </button>
          </>
        )}
        {activeTab === "minigames" && (
          <>
            <button className="gh-minigame-btn" onClick={onStartMining}>
              <div className="gh-minigame-icon">⛏️</div>
              <div className="gh-minigame-info">
                <h4>Miner's Journey</h4>
                <p>Dig deep, collect ores, upgrade your pickaxe!</p>
              </div>
            </button>
            <div style={{ opacity: 0.4, pointerEvents: "none" }}>
              <div className="gh-minigame-btn">
                <div className="gh-minigame-icon">🧩</div>
                <div className="gh-minigame-info">
                  <h4>Coming Soon</h4>
                  <p>More minigames on the way!</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {showAddGame && (
        <div className="modal-overlay" onClick={() => setShowAddGame(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Add Game</h3>
            <p>Add a game to your {activeTab === "favourites" ? "favourites" : "wishlist"}.</p>
            <div className="settings-field">
              <label>Game Name</label>
              <input className="settings-input" type="text" placeholder="Enter game name..." value={newGameName} onChange={e => setNewGameName(e.target.value)} autoFocus />
            </div>
            <div className="settings-field">
              <label>Icon</label>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {ICONS.map(icon => (
                  <span key={icon} className="emoji-item" style={{
                    fontSize: 24,
                    background: icon === newGameIcon ? "var(--bg-modifier-hover)" : "transparent",
                  }} onClick={() => setNewGameIcon(icon)}>{icon}</span>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowAddGame(false)}>Cancel</button>
              <button className="modal-btn submit" onClick={addGame}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
