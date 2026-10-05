// The first interview question, translated into the elder's language.
import { aiHandler, bad } from "../lib/http.js";
import { claude, CHAT_MODEL } from "../lib/anthropic.js";
import { openerPrompt, clip } from "../lib/prompts.js";

export default aiHandler(async (body) => {
  const lang = clip(body.lang, 40).trim();
  if (!lang) throw bad("Choose a language.");
  const text = await claude({
    system: "You translate short, warm messages for a family recipe app. Reply with only the translation in the requested format.",
    messages: [{ role: "user", content: openerPrompt(lang, !!body.wantEN) }],
    model: CHAT_MODEL(),
    maxTokens: 300,
    mock: `[${lang}] Hello! Which dish are you teaching today?` + (body.wantEN ? "\nEN: Hello! Which dish are you teaching today?" : ""),
  });
  return { text: clip(text, 1500) };
});
