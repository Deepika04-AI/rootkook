// Moderation for the community table. Needs the ADMIN_KEY in the x-admin-key header.
import crypto from "node:crypto";
import { send, readBody } from "../lib/http.js";
import { hasStore, redis, hgetallJSON } from "../lib/store.js";

function authorized(req) {
  const want = process.env.ADMIN_KEY || "";
  const got = String(req.headers["x-admin-key"] || "");
  if (!want || got.length !== want.length) return false;
  return crypto.timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export default async function handler(req, res) {
  if (!hasStore() || !process.env.ADMIN_KEY) return send(res, 501, { error: "The community table isn't set up on this site." });
  if (!authorized(req)) return send(res, 401, { error: "Wrong admin password." });
  try {
    if (req.method === "GET") {
      const [pending, approved] = await Promise.all([hgetallJSON("rk:pending"), hgetallJSON("rk:approved")]);
      return send(res, 200, { pending, approved });
    }
    if (req.method === "POST") {
      const { action, id } = await readBody(req, 10_000);
      if (!/^c[a-z0-9]+$/.test(String(id || ""))) return send(res, 400, { error: "Bad id." });
      if (action === "approve") {
        const row = await redis("HGET", "rk:pending", id);
        if (!row) return send(res, 404, { error: "Not in the review queue." });
        await redis("HSET", "rk:approved", id, row);
        await redis("HDEL", "rk:pending", id);
      } else if (action === "reject") {
        await redis("HDEL", "rk:pending", id);
      } else if (action === "remove") {
        await redis("HDEL", "rk:approved", id);
      } else return send(res, 400, { error: "Unknown action." });
      return send(res, 200, { ok: true });
    }
    send(res, 405, { error: "Use GET or POST." });
  } catch (e) {
    console.error("[rootkook admin]", e.message);
    send(res, 500, { error: "Couldn't reach the database." });
  }
}
