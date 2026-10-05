// Community table. GET: approved recipes. POST: submit one for review.
import { send, readBody, rateLimit } from "../lib/http.js";
import { hasStore, redis, hgetallJSON } from "../lib/store.js";
import { cleanCard, clip } from "../lib/prompts.js";

export default async function handler(req, res) {
  if (!hasStore() || !process.env.ADMIN_KEY) return send(res, 501, { error: "The community table isn't set up on this site." });
  try {
    if (req.method === "GET") {
      const rows = await hgetallJSON("rk:approved");
      rows.sort((a, b) => (b.sharedAt || 0) - (a.sharedAt || 0));
      return send(res, 200, { recipes: rows.slice(0, 300) });
    }
    if (req.method === "POST") {
      if (await rateLimit(req)) return send(res, 429, { error: "Please wait a little before sharing again." });
      const body = await readBody(req, 300_000);
      if (body.consent !== true) return send(res, 400, { error: "Confirm the elder agreed to share this recipe." });
      const card = cleanCard(body.card);
      if (!card.title || !card.steps.length) return send(res, 400, { error: "Only finished cards with steps can be shared." });
      const pending = (await redis("HLEN", "rk:pending")) || 0;
      if (pending > 500) return send(res, 503, { error: "The review queue is full right now. Try again later." });
      const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await redis("HSET", "rk:pending", id, JSON.stringify({ card, sharedBy: clip(body.sharedBy, 60), sharedAt: Date.now() }));
      return send(res, 200, { ok: true, id });
    }
    send(res, 405, { error: "Use GET or POST." });
  } catch (e) {
    console.error("[rootkook community]", e.message);
    send(res, 500, { error: "The community table couldn't be reached. Try again." });
  }
}
