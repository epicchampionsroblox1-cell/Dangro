import React, { useState, useEffect, useRef, useCallback } from "react";

const WORLD_WIDTH = 40;
const WORLD_HEIGHT = 200;
const TILE_SIZE = 20;
const PLAYER_HEIGHT = 4;

const ORES = {
  stone: { color: "#555566", hardness: 1, value: 0, name: "Stone" },
  coal: { color: "#333333", hardness: 2, value: 5, name: "Coal" },
  iron: { color: "#8B7355", hardness: 3, value: 10, name: "Iron" },
  gold: { color: "#FFD700", hardness: 4, value: 25, name: "Gold" },
  diamond: { color: "#00FFFF", hardness: 6, value: 50, name: "Diamond" },
  emerald: { color: "#50C878", hardness: 5, value: 40, name: "Emerald" },
  ruby: { color: "#E0115F", hardness: 7, value: 75, name: "Ruby" },
  bedrock: { color: "#1a1a1a", hardness: 999, value: 0, name: "Bedrock" },
};

function generateWorld(depth) {
  const world = [];
  for (let y = 0; y < depth + 30; y++) {
    const row = [];
    for (let x = 0; x < WORLD_WIDTH; x++) {
      if (y < 3) {
        row.push(null);
        continue;
      }
      if (y < 8) {
        row.push(Math.random() < 0.3 ? { type: "stone" } : null);
        continue;
      }
      const d = y - 8;
      let oreType = "stone";
      const r = Math.random();
      if (d > 80 && r < 0.02) oreType = "bedrock";
      else if (d > 60 && r < 0.03) oreType = "ruby";
      else if (d > 45 && r < 0.04) oreType = "diamond";
      else if (d > 35 && r < 0.05) oreType = "emerald";
      else if (d > 20 && r < 0.06) oreType = "gold";
      else if (d > 10 && r < 0.08) oreType = "iron";
      else if (d > 5 && r < 0.1) oreType = "coal";
      else if (r > 0.3) oreType = null;

      row.push(oreType ? { type: oreType, hp: ORES[oreType].hardness } : null);
    }
    world.push(row);
  }
  return world;
}

const PICKAXES = {
  wooden: { name: "Wooden Pickaxe", damage: 1, speed: 0.8, icon: "🪵" },
  stone: { name: "Stone Pickaxe", damage: 2, speed: 0.7, icon: "🪨" },
  iron: { name: "Iron Pickaxe", damage: 3, speed: 0.6, icon: "⛏️" },
  gold: { name: "Golden Pickaxe", damage: 2, speed: 0.4, icon: "✨" },
  diamond: { name: "Diamond Pickaxe", damage: 5, speed: 0.3, icon: "💎" },
  ruby: { name: "Ruby Pickaxe", damage: 7, speed: 0.25, icon: "🔴" },
};

const UPGRADE_COSTS = {
  iron: { gold: 50, iron: 20 },
  gold: { gold: 100, iron: 40 },
  diamond: { gold: 200, diamond: 10 },
  ruby: { gold: 500, diamond: 30, ruby: 5 },
};

export default function MiningGame({ onClose }) {
  const canvasRef = useRef(null);
  const [world, setWorld] = useState(() => generateWorld(50));
  const [playerY, setPlayerY] = useState(0);
  const [playerX, setPlayerX] = useState(Math.floor(WORLD_WIDTH / 2));
  const [inventory, setInventory] = useState({ coal: 0, iron: 0, gold: 0, diamond: 0, emerald: 0, ruby: 0 });
  const [pickaxe, setPickaxe] = useState("wooden");
  const [mining, setMining] = useState(false);
  const [mineProgress, setMineProgress] = useState(0);
  const [depth, setDepth] = useState(0);
  const [showInventory, setShowInventory] = useState(false);
  const [message, setMessage] = useState("");
  const [shakeX, setShakeX] = useState(0);
  const [shakeY, setShakeY] = useState(0);
  const lastFrameRef = useRef(0);
  const miningTargetRef = useRef(null);
  const worldRef = useRef(world);
  const playerYRef = useRef(playerY);
  const keysRef = useRef({});

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    playerYRef.current = playerY;
  }, [playerY]);

  function addOre(type, count = 1) {
    setInventory(prev => ({ ...prev, [type]: (prev[type] || 0) + count }));
    setMessage(`+${count} ${ORES[type]?.name || type}!`);
    setTimeout(() => setMessage(""), 1500);
  }

  function getPickaxeDamage() {
    return PICKAXES[pickaxe]?.damage || 1;
  }

  function getMineSpeed() {
    return PICKAXES[pickaxe]?.speed || 1;
  }

  function canUpgrade(target) {
    const costs = UPGRADE_COSTS[target];
    if (!costs) return false;
    return Object.entries(costs).every(([ore, amount]) => (inventory[ore] || 0) >= amount);
  }

  function doUpgrade(target) {
    if (!canUpgrade(target)) {
      setMessage("Not enough materials!");
      setTimeout(() => setMessage(""), 1500);
      return;
    }
    const costs = UPGRADE_COSTS[target];
    const newInv = { ...inventory };
    Object.entries(costs).forEach(([ore, amount]) => {
      newInv[ore] = (newInv[ore] || 0) - amount;
    });
    setInventory(newInv);
    const pickaxeKeys = Object.keys(PICKAXES);
    const idx = pickaxeKeys.indexOf(target);
    setPickaxe(pickaxeKeys[idx]);
    setMessage(`Upgraded to ${PICKAXES[target].name}!`);
    setTimeout(() => setMessage(""), 2000);
  }

  const mineTile = useCallback((wx, wy) => {
    const w = worldRef.current;
    if (!w[wy] || !w[wy][wx] || !w[wy][wx].hp) return;
    const dmg = getPickaxeDamage();
    const speed = getMineSpeed();

    const newWorld = w.map(row => [...row]);
    const tile = { ...newWorld[wy][wx] };
    tile.hp -= dmg;
    if (tile.hp <= 0) {
      const oreType = tile.type;
      if (oreType === "bedrock") {
        setMessage("Can't break bedrock!");
        setTimeout(() => setMessage(""), 1500);
        return;
      }
      addOre(oreType);
      newWorld[wy][wx] = null;
      setShakeX(4);
      setShakeY(2);
      setTimeout(() => { setShakeX(0); setShakeY(0); }, 100);
    } else {
      newWorld[wy][wx] = tile;
    }
    setWorld(newWorld);
    setMineProgress(0);
  }, [pickaxe, inventory]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.key] = true;
      if (e.key === "e" || e.key === "E") setShowInventory(prev => !prev);
    };
    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  useEffect(() => {
    let animId;
    let lastTime = 0;

    function gameLoop(time) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const keys = keysRef.current;
      let dx = 0;
      let dy = 0;
      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx = -1;
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx = 1;
      if (keys["ArrowUp"] || keys["w"] || keys["W"]) dy = -1;
      if (keys["ArrowDown"] || keys["s"] || keys["S"]) dy = 1;
      if (keys[" "] || keys["Space"]) {
        setMining(true);
      } else {
        setMining(false);
        setMineProgress(0);
      }

      const speed = 4;
      const currentPlayerY = playerYRef.current;

      if (dx !== 0 || dy !== 0) {
        let nx = playerX + dx * speed * dt;
        let ny = currentPlayerY + dy * speed * dt;

        nx = Math.max(0, Math.min(WORLD_WIDTH - 1, nx));
        ny = Math.max(0, ny);

        setPlayerX(nx);
        if (ny !== currentPlayerY) {
          setPlayerY(ny);
          if (ny > depth) setDepth(Math.floor(ny));
        }
      }

      renderCanvas();
      animId = requestAnimationFrame(gameLoop);
    }

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [playerX, world, pickaxe, depth]);

  function renderCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.save();
    ctx.translate(shakeX * (Math.random() - 0.5), shakeY * (Math.random() - 0.5));

    const camY = Math.max(0, playerY - H / TILE_SIZE / 2 + 2);

    const startRow = Math.floor(camY);
    const endRow = Math.min(startRow + Math.ceil(H / TILE_SIZE) + 1, worldRef.current.length);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, "#0a0a2e");
    skyGrad.addColorStop(0.3, "#1a1a3e");
    skyGrad.addColorStop(0.6, "#2a1a1a");
    skyGrad.addColorStop(1, "#1a0a0a");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137 + 50) % W;
      const sy = (i * 97 + 30) % (H * 0.3);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Tiles
    for (let row = startRow; row < endRow; row++) {
      if (row < 0 || row >= worldRef.current.length) continue;
      const worldRow = worldRef.current[row];
      if (!worldRow) continue;
      for (let x = 0; x < WORLD_WIDTH; x++) {
        const tile = worldRow[x];
        const px = x * TILE_SIZE;
        const py = (row - camY) * TILE_SIZE;

        if (tile && tile.type) {
          const oreInfo = ORES[tile.type];
          ctx.fillStyle = oreInfo?.color || "#555";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          ctx.strokeStyle = "rgba(0,0,0,0.3)";
          ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);

          if (tile.type !== "stone" && tile.type !== "bedrock") {
            const cx = px + TILE_SIZE / 2;
            const cy = py + TILE_SIZE / 2;
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            ctx.beginPath();
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Player
    const playerPX = playerX * TILE_SIZE;
    const playerPY = (playerY - camY) * TILE_SIZE;

    // Body
    ctx.fillStyle = "#7c3aed";
    ctx.fillRect(playerPX - 6, playerPY - 12, 12, 24);

    // Head
    ctx.fillStyle = "#f5d6b8";
    ctx.beginPath();
    ctx.arc(playerPX, playerPY - 18, 8, 0, Math.PI * 2);
    ctx.fill();

    // Hat
    ctx.fillStyle = "#4a1a8a";
    ctx.fillRect(playerPX - 8, playerPY - 28, 16, 6);
    ctx.fillRect(playerPX - 4, playerPY - 34, 8, 8);

    // Pickaxe
    ctx.strokeStyle = "#8B7355";
    ctx.lineWidth = 3;
    const pickAngle = mining ? -Math.PI / 3 : -Math.PI / 6;
    ctx.save();
    ctx.translate(playerPX + 8, playerPY - 6);
    ctx.rotate(pickAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(20, 0);
    ctx.stroke();

    ctx.fillStyle = "#aaa";
    ctx.fillRect(18, -4, 8, 8);
    ctx.restore();

    // Mining progress bar
    if (mining) {
      const targetTile = worldRef.current[Math.floor(playerY + 1)]?.[Math.floor(playerX)];
      if (targetTile && targetTile.hp && targetTile.hp > 0) {
        const w = worldRef.current;
        const idx = Math.floor(playerY + 1);
        const tileWx = Math.floor(playerX);
        if (w[idx]?.[tileWx]) {
          const maxHp = ORES[w[idx][tileWx].type]?.hardness || 1;
          const currentHp = w[idx][tileWx].hp;
          const progress = 1 - currentHp / maxHp;
          const barX = playerPX - 20;
          const barY = playerPY - 40;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(barX, barY, 40, 4);
          ctx.fillStyle = "var(--accent-green)";
          ctx.fillRect(barX, barY, 40 * progress, 4);
        }
      }
    }

    ctx.restore();
  }

  const totalValue = Object.entries(inventory).reduce((sum, [ore, count]) => sum + (ORES[ore]?.value || 0) * count, 0);
  const currentPickaxe = PICKAXES[pickaxe];
  const pickaxeKeys = Object.keys(PICKAXES);
  const currentPickIdx = pickaxeKeys.indexOf(pickaxe);
  const nextPickaxe = pickaxeKeys[currentPickIdx + 1];

  return (
    <div className="mining-game-overlay">
      <canvas
        ref={canvasRef}
        className="mining-game-canvas"
        width={WORLD_WIDTH * TILE_SIZE}
        height={800}
        onClick={() => {
          if (!mining) return;
          const wx = Math.floor(playerX);
          const wy = Math.floor(playerY + 1);
          if (wy < worldRef.current.length && worldRef.current[wy]?.[wx]) {
            mineTile(wx, wy);
          }
        }}
      />

      <div className="mining-game-hud">
        <div>Depth: <span>{depth}m</span></div>
        <div>Pickaxe: <span>{currentPickaxe.icon} {currentPickaxe.name}</span></div>
        <div>⛏️ Damage: <span>{currentPickaxe.damage}</span></div>
        <div>💰 Value: <span>{totalValue}g</span></div>
        {message && <div style={{ color: "var(--accent-green)", marginTop: 4 }}>{message}</div>}
      </div>

      {showInventory && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(0,0,0,0.85)", border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12, padding: 16, minWidth: 180,
          color: "#fff", zIndex: 10,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>🎒 Inventory</h3>
          {Object.entries(inventory).filter(([, count]) => count > 0).length === 0 ? (
            <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>Empty - start mining!</p>
          ) : (
            Object.entries(inventory).filter(([, count]) => count > 0).map(([ore, count]) => (
              <div key={ore} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "2px 0" }}>
                <span>{ORES[ore]?.color ? <span style={{ color: ORES[ore].color }}>■</span> : null} {ORES[ore]?.name || ore}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))
          )}
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <span>💰 Total Value</span>
              <span style={{ fontWeight: 700, color: "var(--accent-yellow)" }}>{totalValue}g</span>
            </div>
          </div>
          {nextPickaxe && UPGRADE_COSTS[nextPickaxe] && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>Upgrade to {PICKAXES[nextPickaxe].name}:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(UPGRADE_COSTS[nextPickaxe]).map(([ore, amount]) => (
                  <span key={ore} style={{
                    fontSize: 11, padding: "2px 6px", borderRadius: 4,
                    background: (inventory[ore] || 0) >= amount ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                    color: (inventory[ore] || 0) >= amount ? "var(--green)" : "var(--red)",
                  }}>
                    {(inventory[ore] || 0)}/{amount} {ORES[ore]?.name || ore}
                  </span>
                ))}
              </div>
              <button
                className="mining-game-btn primary"
                style={{ width: "100%", marginTop: 8, justifyContent: "center" }}
                onClick={() => doUpgrade(nextPickaxe)}
                disabled={!canUpgrade(nextPickaxe)}
              >
                Upgrade (E)
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mining-game-bar">
        <button className="mining-game-btn danger" onClick={onClose}>
          🚪 Exit
        </button>
        <button
          className={"mining-game-btn" + (showInventory ? " primary" : "")}
          onClick={() => setShowInventory(prev => !prev)}
        >
          🎒 Inventory ({Object.entries(inventory).filter(([, c]) => c > 0).length})
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", gap: 12 }}>
          <span>← → ↑ ↓ Move</span>
          <span>Space Mine</span>
          <span>E Inventory</span>
        </div>
      </div>
    </div>
  );
}
