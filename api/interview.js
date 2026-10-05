// Next interviewer question, in the elder's language.
import { aiHandler, bad } from "../lib/http.js";
import { claude, CHAT_MODEL } from "../lib/anthropic.js";
import { interviewSystem, cleanTurns, clip } from "../lib/prompts.js";

export default aiHandler(async (body) => {
  const details = body.details || {};
  const messages = cleanTurns(body.turns);
  if (!messages.length || messages[messages.length - 1].role !== "user") throw bad("Send the elder's answer first.");
  const text = await claude({
    system: interviewSystem(details, !!body.wantEN),
    messages,
    model: CHAT_MODEL(),
    maxTokens: 400,
    mock: "That sounds wonderful. How do you measure the rice, and what do you cook it in?" + (body.wantEN ? "\nEN: (mock translation)" : ""),
  });
  return { text: clip(text, 2000) };
});
