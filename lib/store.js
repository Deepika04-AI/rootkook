// Tiny Upstash Redis client over its REST API. No dependencies.
// Works with either the Upstash env names or the Vercel KV names.
const URL_ = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

export const hasStore = () => Boolean(URL_ && TOKEN);

export async function redis(...command) {
  if (!hasStore()) throw new Error("store_not_configured");
  const res = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error("store_error: " + (data.error || res.status));
  return data.result;
}

// HGETALL returns [field, value, field, value, ...]
export async function hgetallJSON(key) {
  const flat = (await redis("HGETALL", key)) || [];
  const out = [];
  for (let i = 0; i < flat.length; i += 2) {
    try { out.push({ id: flat[i], ...JSON.parse(flat[i + 1]) }); } catch { /* skip bad rows */ }
  }
  return out;
}
