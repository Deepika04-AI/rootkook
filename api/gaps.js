// Works the elder's answers to open questions back into the card.
import { aiHandler, bad } from "../lib/http.js";
import { claude, parseJSON, CARD_MODEL } from "../lib/anthropic.js";
import { gapsPrompt, cleanCard, clip } from "../lib/prompts.js";

export default aiHandler(async (body) => {
  const card = cleanCard(body.card);
  const answers = (Array.isArray(body.answers) ? body.answers : []).slice(0, 10)
    .map((x) => ({ q: clip(x?.q, 300), a: clip(x?.a, 2000).trim() })).filter((x) => x.a);
  if (!answers.length) throw bad("Type at least one answer.");
  const text = await claude({
    system: "You update structured JSON recipe cards. Reply with only JSON.",
    messages: [{ role: "user", content: gapsPrompt(JSON.stringify(card), answers) }],
    model: CARD_MODEL(),
    maxTokens: 4000,
    mock: () => JSON.stringify({ ...card, gaps: [] }),
  });
  return { card: cleanCard(parseJSON(text)) };
});
