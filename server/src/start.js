import { execSync } from "child_process";

function ensureSsl(url) {
  if (!url) return url;
  if ((url.startsWith("postgresql://") || url.startsWith("postgres://")) && !url.includes("sslmode")) {
    const sep = url.includes("?") ? "&" : "?";
    const fixed = `${url}${sep}sslmode=require`;
    console.log("[start] Injected sslmode=require into DATABASE_URL");
    return fixed;
  }
  return url;
}

process.env.DATABASE_URL = ensureSsl(process.env.DATABASE_URL);

console.log("[start] Running database migrations...");
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: process.cwd() });
  console.log("[start] Migrations complete");
} catch (err) {
  console.error("[start] Migration failed:", err.message);
  process.exit(1);
}

console.log("[start] Starting server...");
await import("./index.js");
