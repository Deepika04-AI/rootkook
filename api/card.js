// Turns an interview or transcript (and optional photo) into a structured recipe card.
import { aiHandler, bad } from "../lib/http.js";
import { claude, parseJSON, CARD_MODEL } from "../lib/anthropic.js";
import { cardPrompt, cleanCard, clip } from "../lib/prompts.js";

const MOCK = JSON.stringify({
  title: "Mock Family Recipe", nativeName: "", elder: { name: "", relation: "", place: "" }, occasion: "Sundays",
  servings: "4", totalMinutes: 30, story: ["This is a test card made without an API key."], whyItMatters: "Test mode.",
  ingredients: [{ item: "Rice", elderMeasure: "two tumblers", approxMeasure: "about 2 cups", substitute: "" }],
  steps: [{ text: "Cook the rice.", cue: "Until soft", minutes: 15, kidTask: "Rinse the rice", kidAge: "5+" }],
  tips: [], gaps: [{ question: "What size is the tumbler?", why: "Sizes vary." }], tags: ["test"],
});

export default aiHandler(async (body) => {
  const recording = clip(body.recording, 60000).trim();
  const img = body.image && typeof body.image.data === "string" ? body.image : null;
  if (!recording && !img) throw bad("Record the elder's answers or add a photo first.");
  let content = cardPrompt(body.details || {}, recording || "(Only a photo was provided.)", !!img);
  if (img) {
    const type = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(img.type) ? img.type : null;
    if (!type) throw bad("Use a JPG, PNG, WebP or GIF photo.");
    if (img.data.length > 4_000_000) throw bad("That photo is too large. Try a smaller one.");
    content = [{ type: "image", source: { type: "base64", media_type: type, data: img.data } }, { type: "text", text: content }];
  }
  const text = await claude({
    system: "You turn family recipe recordings into structured JSON recipe cards. Reply with only JSON.",
    messages: [{ role: "user", content }],
    model: CARD_MODEL(),
    maxTokens: 4000,
    mock: MOCK,
  });
  return { card: cleanCard(parseJSON(text)) };
});
