// Answers a cook's question about one recipe card.
import { aiHandler, bad } from "../lib/http.js";
import { claude, CHAT_MODEL } from "../lib/anthropic.js";
import { askSystem, cleanCard, cleanTurns, clip } from "../lib/prompts.js";

export default aiHandler(async (body) => {
  const messages = cleanTurns(body.turns, 12, 1500);
  if (!messages.length || messages[messages.length - 1].role !== "user") throw bad("Type a question first.");
  const text = await claude({
    system: askSystem(JSON.stringify(cleanCard(body.card))),
    messages,
    model: CHAT_MODEL(),
    maxTokens: 400,
    mock: "Test mode: yes, brown rice works, but cook it a little longer.",
  });
  return { text: clip(text, 2000) };
});
