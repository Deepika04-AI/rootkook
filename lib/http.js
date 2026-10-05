// Shared request helpers: body parsing, JSON replies, rate limiting.
import { hasStore, redis } from "./store.js";

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export async function readBody(req, maxBytes = 3_000_000) {
  if (req.body && typeof req.body === "object") return req.body; // Vercel already parsed it
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > maxBytes) throw Object.assign(new Error("too_large"), { status: 413 });
    chunks.push(c);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  return (Array.isArray(fwd) ? fwd[0] : (fwd || "")).split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}

// Per-IP hourly limit plus an optional site-wide daily cap, so a public link
// can't run up your API bill. Uses Redis when configured, memory otherwise.
const mem = new Map();
export async function rateLimit(req) {
  const perHour = Number(process.env.RATE_LIMIT_PER_HOUR || 60);
  const dailyCap = Number(process.env.DAILY_CALL_CAP || 0);
  const hour = Math.floor(Date.now() / 3_600_000);
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `rk:rl:${clientIp(req)}:${hour}`;
  const dayKey = `rk:day:${day}`;

  if (hasStore()) {
    try {
      const n = await redis("INCR", ipKey);
      if (n === 1) await redis("EXPIRE", ipKey, 3700);
      if (n > perHour) return "rate_limited";
      if (dailyCap) {
        const d = await redis("INCR", dayKey);
        if (d === 1) await redis("EXPIRE", dayKey, 90_000);
        if (d > dailyCap) return "daily_cap";
      }
      return null;
    } catch { /* fall through to memory */ }
  }
  const n = (mem.get(ipKey) || 0) + 1;
  mem.set(ipKey, n);
  if (mem.size > 5000) mem.clear();
  if (n > perHour) return "rate_limited";
  if (dailyCap) {
    const d = (mem.get(dayKey) || 0) + 1;
    mem.set(dayKey, d);
    if (d > dailyCap) return "daily_cap";
  }
  return null;
}

export function onlyPost(req, res) {
  if (req.method !== "POST") { send(res, 405, { error: "Use POST." }); return false; }
  return true;
}

// Wraps an AI endpoint: method check, body parse, rate limit, error mapping.
export function aiHandler(fn) {
  return async (req, res) => {
    if (!onlyPost(req, res)) return;
    let body;
    try { body = await readBody(req); } catch (e) { return send(res, e.status || 400, { error: "That request was too large or malformed." }); }
    const limited = await rateLimit(req);
    if (limited === "rate_limited") return send(res, 429, { error: "Lots of questions in a short time. Wait a few minutes and try again." });
    if (limited === "daily_cap") return send(res, 503, { error: "RootKook has reached today's limit. Please come back tomorrow." });
    try {
      const out = await fn(body || {});
      send(res, 200, out);
    } catch (e) {
      const status = e.status || 500;
      if (status >= 500) console.error("[rootkook]", e.message);
      send(res, status, { error: e.publicMessage || "Something went wrong reaching Claude. Try again." });
    }
  };
}

export const bad = (msg) => Object.assign(new Error(msg), { status: 400, publicMessage: msg });
