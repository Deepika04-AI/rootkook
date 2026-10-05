// Local server for development and for hosts other than Vercel (Render, Railway, a VPS).
// Run:  ANTHROPIC_API_KEY=sk-ant-... node server.js   then open http://localhost:3000
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

// Load .env if present (no dependency needed).
try {
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const routes = {};
for (const f of fs.readdirSync(path.join(root, "api"))) if (f.endsWith(".js")) routes["/api/" + f.slice(0, -3)] = (await import("./api/" + f)).default;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  if (routes[url.pathname]) {
    try { await routes[url.pathname](req, res); } catch (e) { console.error(e); if (!res.headersSent) { res.statusCode = 500; res.end("{}"); } }
    return;
  }
  let file = path.normalize(path.join(root, "public", url.pathname === "/" ? "index.html" : url.pathname));
  if (!file.startsWith(path.join(root, "public"))) { res.statusCode = 403; return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end("Not found"); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(buf);
  });
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => console.log(`RootKook running at http://localhost:${port}`));
