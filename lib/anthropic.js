// Calls the Anthropic Messages API. No SDK needed.
const API = "https://api.anthropic.com/v1/messages";

export const CARD_MODEL = () => process.env.CARD_MODEL || "claude-sonnet-5-5";
export const CHAT_MODEL = () => process.env.CHAT_MODEL || "claude-haiku-4-5-20251001";

function fail(status, publicMessage, detail) {
  return Object.assign(new Error(detail || publicMessage), { status, publicMessage });
}

/**
 * @param {object} o
 * @param {string} o.system   standing instructions
 * @param {Array}  o.messages [{role, content}] where content is a string or content blocks
 * @param {string} o.model
 * @param {number} o.maxTokens
 * @param {string} [o.mock]   canned reply used when MOCK_AI=1 and no key is set
 */
export async function claude({ system, messages, model, maxTokens = 1024, mock }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    if (process.env.MOCK_AI === "1" && mock !== undefined) return typeof mock === "function" ? mock() : mock;
    throw fail(503, "The AI isn't set up yet: the site owner needs to add an Anthropic API key.", "missing ANTHROPIC_API_KEY");
  }
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    if (res.status === 429 || res.status === 529) throw fail(503, "Claude is busy right now. Try again in a minute.", msg);
    if (res.status === 400 && /image/i.test(msg)) throw fail(400, "That photo couldn't be read. Try a smaller JPG or PNG.", msg);
    if (res.status === 400 && /too long|too many tokens/i.test(msg)) throw fail(400, "That's too much text at once. Trim it and try again.", msg);
    throw fail(502, "Something went wrong reaching Claude. Try again.", `anthropic ${res.status}: ${msg}`);
  }
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!text) throw fail(502, "Claude didn't answer. Try again.", "empty completion");
  return text;
}

// Pulls one JSON object out of a reply that may have a sentence or a code fence around it.
export function parseJSON(text) {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const a = body.indexOf("{"), b = body.lastIndexOf("}");
  if (a < 0 || b < a) throw fail(502, "The card came back garbled. Try again.", "no json in reply");
  try { return JSON.parse(body.slice(a, b + 1)); }
  catch { throw fail(502, "The card came back garbled. Try again.", "bad json in reply"); }
}
