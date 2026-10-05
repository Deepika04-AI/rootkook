// Tells the page which optional features this deployment has.
import { send } from "../lib/http.js";
import { hasStore } from "../lib/store.js";

export default function handler(req, res) {
  send(res, 200, {
    ai: Boolean(process.env.ANTHROPIC_API_KEY) || process.env.MOCK_AI === "1",
    community: hasStore() && Boolean(process.env.ADMIN_KEY),
  });
}
