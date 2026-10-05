
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
let toastT;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } }
};

/* ---------- example (clearly marked) ---------- */
const EXAMPLE = {
  id: "example", example: true,
  title: "Lemon Rice for the Train", nativeName: "Elumichai Sadam",
  elder: { name: "Kamala", relation: "grandmother (Paati)", place: "Madurai, Tamil Nadu" },
  occasion: "Packed for long train journeys and Aadi Perukku", servings: "4", totalMinutes: 30,
  story: [
    "Every time we took the train to Chennai, I packed this in a steel tiffin. By the time we crossed Trichy, everyone in the compartment was asking for some.",
    "My mother never measured. She said, the lemon tells you when it is enough. You taste, you add, you taste again.",
    "Don't add the lemon on the stove. It turns bitter. Switch off first, then squeeze."
  ],
  whyItMatters: "In Tamil households lemon rice is the dish that travels: it keeps well without a fridge, so it goes on journeys and to temple festivals like Aadi Perukku, when families eat variety rices by the river.",
  ingredients: [
    { item: "Cooked rice, cooled", elderMeasure: "2 tumblers of raw rice", approxMeasure: "about 2 cups raw, 5 cups cooked", substitute: "Day-old rice works better than fresh" },
    { item: "Lemons", elderMeasure: "2, maybe 3", approxMeasure: "about 4 tbsp juice", substitute: "" },
    { item: "Gingelly (sesame) oil", elderMeasure: "a small ladle", approxMeasure: "about 3 tbsp", substitute: "Any neutral oil" },
    { item: "Mustard seeds", elderMeasure: "one pinch of three fingers", approxMeasure: "about 1 tsp", substitute: "" },
    { item: "Urad dal and chana dal", elderMeasure: "a spoon each", approxMeasure: "about 1 tbsp each", substitute: "" },
    { item: "Peanuts", elderMeasure: "a fistful", approxMeasure: "about 1/3 cup", substitute: "Cashews, or skip for nut allergies" },
    { item: "Curry leaves", elderMeasure: "two sprigs", approxMeasure: "about 15 leaves", substitute: "Frozen curry leaves from an Indian grocery; no real swap" },
    { item: "Green chilies, slit", elderMeasure: "2", approxMeasure: "", substitute: "Serrano" },
    { item: "Turmeric", elderMeasure: "a little, for colour", approxMeasure: "about 1/2 tsp", substitute: "" },
    { item: "Asafoetida (perungayam)", elderMeasure: "a pinch", approxMeasure: "about 1/8 tsp", substitute: "" },
    { item: "Salt", elderMeasure: "to taste", approxMeasure: "", substitute: "" }
  ],
  steps: [
    { text: "Spread the cooked rice on a plate so it cools and the grains stay separate.", cue: "Grains should not stick together when you lift them.", minutes: 10, kidTask: "Fluff the rice gently with a fork and spread it out", kidAge: "5+" },
    { text: "Squeeze the lemons into a cup and pick out the seeds.", cue: "", minutes: null, kidTask: "Squeeze the lemons and fish out every seed", kidAge: "5+" },
    { text: "Heat the oil. Add mustard seeds.", cue: "Wait till they dance and stop crackling.", minutes: null, kidTask: "", kidAge: "" },
    { text: "Add urad dal, chana dal and peanuts. Stir on low.", cue: "Until the dal turns golden and smells nutty, not brown.", minutes: 3, kidTask: "", kidAge: "" },
    { text: "Add curry leaves, green chilies, turmeric and asafoetida. Stir a few seconds.", cue: "Stand back, the leaves splutter.", minutes: null, kidTask: "Pull the curry leaves off the stems before cooking starts", kidAge: "8+" },
    { text: "Switch off the stove. Then add the lemon juice and salt to the pan.", cue: "Never squeeze lemon on a lit stove. It turns bitter.", minutes: null, kidTask: "", kidAge: "" },
    { text: "Pour the tempering over the rice and mix gently with your hand or a flat spoon. Taste and adjust lemon and salt.", cue: "The lemon tells you when it is enough.", minutes: null, kidTask: "Taste and say if it needs more lemon or salt", kidAge: "5+" },
    { text: "Rest before eating so the flavour goes into the rice.", cue: "", minutes: 15, kidTask: "Pack it in the tiffin box", kidAge: "8+" }
  ],
  tips: ["Gingelly oil is what makes it taste like home.", "It tastes better after an hour than straight away."],
  gaps: [
    { question: "How many lemons for 2 tumblers of rice, exactly? Do you squeeze them all at once?", why: "'2, maybe 3' is hard to follow without her." },
    { question: "What size is your tumbler?", why: "Tumblers vary from 150 to 250 ml." },
    { question: "Do you roast the peanuts separately first?", why: "She mentioned peanuts but not how long." }
  ],
  tags: ["South Indian", "Tamil", "travel food", "vegetarian"]
};

/* ---------- state ---------- */
const S = {
  ai: false, community: false,
  local: store.get("rk.cookbook", {}),       // id -> recipe, kept in this browser
  shared: [],                                 // approved community recipes
  current: null, currentSource: null,
  ivTurns: store.get("rk.interview", null),
  askTurns: []
};

/* Talks to this site's own server, which holds the API key and the prompts. */
async function api(path, body, signal){
  let res;
  try { res = await fetch("/api/" + path, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, signal }); }
  catch (e) { if (e?.name === "AbortError") throw { code: "cancelled" }; throw { message: "You seem to be offline. Check your connection and try again." }; }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, message: j.error || "Something went wrong. Try again." };
  return j;
}
function downloadFile(filename, text, type){
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// Shrinks a photo in the browser before upload: long side 1600px, JPEG.
function photoToBase64(file){
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      resolve({ type: "image/jpeg", data: c.toDataURL("image/jpeg", 0.85).split(",")[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject({ message: "That photo couldn't be opened. Try a JPG or PNG." }); };
    img.src = url;
  });
}
const mine = () => { const m = { ...S.local }; return Object.values(m).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)); };

/* ---------- tabs ---------- */
const views = ["capture", "cookbook", "community", "recipe"];
function show(v){
  views.forEach(n => $("#view-" + n).hidden = n !== v);
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.view === v)));
  if (v === "cookbook") renderMine();
  if (v === "community") renderCommunity();
  window.scrollTo({ top: 0 });
}
document.querySelectorAll("nav.tabs button").forEach(b => b.onclick = () => show(b.dataset.view));
let backTo = "capture";
$("#back").onclick = () => show(backTo);

/* ---------- capture: details ---------- */
const DETAIL_IDS = ["f-elder", "f-rel", "f-place", "f-lang"];
const savedDetails = store.get("rk.details", {});
DETAIL_IDS.forEach(id => { if (savedDetails[id]) $("#" + id).value = savedDetails[id]; $("#" + id).addEventListener("input", saveDetails); });
if (!$("#f-lang").value) $("#f-lang").value = "en-US";
function saveDetails(){ const d = {}; DETAIL_IDS.forEach(id => d[id] = $("#" + id).value); store.set("rk.details", d); }
function details(){
  return { elder: $("#f-elder").value.trim(), relation: $("#f-rel").value.trim(), place: $("#f-place").value.trim(), lang: langName(), langCode: langCode() };
}
let mode = "interview";
function setMode(m){
  mode = m;
  $("#mode-interview").setAttribute("aria-pressed", String(m === "interview"));
  $("#mode-paste").setAttribute("aria-pressed", String(m === "paste"));
  $("#pane-interview").hidden = m !== "interview";
  $("#pane-paste").hidden = m !== "paste";
}
$("#mode-interview").onclick = () => setMode("interview");
$("#mode-paste").onclick = () => setMode("paste");
$("#f-transcript").value = store.get("rk.transcript", "");
$("#f-transcript").addEventListener("input", e => store.set("rk.transcript", e.target.value));

/* ---------- interview agent ---------- */
const OPENER = "Hello! I'm going to help your family write this recipe down. Let's start simple: which dish are you teaching today, and when do you remember first eating it?";
const langCode = () => $("#f-lang").value || "en-US";
const langName = () => $("#f-lang").selectedOptions[0]?.textContent || "English";
const isEnglish = () => langCode().startsWith("en");
const wantEN = () => !isEnglish() && $("#v-en").checked;
function splitEN(t){ const m = String(t).split(/\n\s*EN:\s*/); return { main: m[0].trim(), en: (m[1] || "").trim() }; }

/* voice out: read questions aloud */
let voices = [];
function loadVoices(){ try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch { voices = []; } updateVoiceNote(); }
try { if (window.speechSynthesis) { loadVoices(); speechSynthesis.addEventListener?.("voiceschanged", loadVoices); } } catch {}
function pickVoice(code){
  const c = code.toLowerCase(), base = c.split("-")[0];
  return voices.find(v => v.lang.toLowerCase().replace("_", "-") === c) || voices.find(v => v.lang.toLowerCase().startsWith(base)) || null;
}
function updateVoiceNote(){
  const n = $("#v-note"); if (!n) return;
  $("#v-en-wrap").hidden = isEnglish();
  if (!window.speechSynthesis) { n.textContent = "This browser can't read aloud, so questions show as text."; $("#v-speak").disabled = true; return; }
  if (voices.length && !pickVoice(langCode())) n.textContent = `No ${langName()} voice on this device, so questions show as text. Add one in your device's text-to-speech settings.`;
  else n.textContent = "";
}
function sayNow(text){ speak(text, true); }
function speak(text, force){
  try {
    if (!window.speechSynthesis || (!force && !$("#v-speak").checked)) return;
    const v = pickVoice(langCode()); if (voices.length && !v) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = langCode(); if (v) u.voice = v; u.rate = 0.9;
    speechSynthesis.speak(u);
  } catch {}
}

/* voice in: dictation */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null, recBase = "";
function micTip(blocked){
  $("#mic-tip").textContent = (blocked ? "The microphone is blocked. Allow it in your browser's site settings and reload, or use your keyboard's microphone. " : "") +
    `To speak instead of type: on a phone, tap the microphone on your keyboard and choose ${langName()} as the keyboard language.`;
}
function micOff(){ try { rec?.stop(); } catch {} rec = null; $("#iv-mic").setAttribute("aria-pressed", "false"); $("#iv-mic span").textContent = "Speak"; }
function blockMic(){ micOff(); $("#iv-mic").hidden = true; micTip(true); }
$("#iv-mic").onclick = () => {
  if (rec) { micOff(); return; }
  try { speechSynthesis?.cancel(); } catch {}
  try {
    rec = new SR(); rec.lang = langCode(); rec.continuous = true; rec.interimResults = true;
    const inp = $("#iv-input"); recBase = inp.value ? inp.value.replace(/\s*$/, " ") : "";
    rec.onresult = e => { let fin = "", tmp = ""; for (const r of e.results) (r.isFinal ? (fin += r[0].transcript) : (tmp += r[0].transcript)); inp.value = recBase + fin + tmp; };
    rec.onerror = e => { if (["not-allowed", "service-not-allowed", "audio-capture"].includes(e.error)) blockMic(); else micOff(); };
    rec.onend = () => { if (rec) micOff(); };
    rec.start();
    $("#iv-mic").setAttribute("aria-pressed", "true"); $("#iv-mic span").textContent = "Stop";
  } catch { blockMic(); }
};
if (!SR) { $("#iv-mic").hidden = true; }
micTip(false);

/* language change: re-ask the opening question in that language */
let openerCtl = null;
async function localizeOpener(){
  updateVoiceNote(); micTip(!!SR && $("#iv-mic").hidden);
  if (S.ivTurns.some(t => t.role === "user")) return;
  if (isEnglish() || !S.ai) { S.ivTurns = [{ role: "assistant", content: OPENER }]; renderIv(); return; }
  openerCtl?.abort(); openerCtl = new AbortController();
  const st = $("#iv-status"); st.className = "status"; st.innerHTML = `<span class="dots">Switching to ${esc(langName())}</span>`;
  try {
    const { text } = await api("opener", { lang: langName(), wantEN: wantEN() }, openerCtl.signal);
    S.ivTurns = [{ role: "assistant", content: text.trim() }]; store.set("rk.interview", S.ivTurns); renderIv(); st.textContent = "";
    speak(splitEN(text).main);
  } catch (e) { if (e?.code !== "cancelled") { st.className = "status err"; st.textContent = aiCopy(e); } }
}
$("#f-lang").addEventListener("change", () => { micOff(); localizeOpener(); });
$("#v-en").addEventListener("change", () => { if (!S.ivTurns.some(t => t.role === "user")) localizeOpener(); });
$("#v-speak").addEventListener("change", e => { if (!e.target.checked) try { speechSynthesis.cancel(); } catch {} });

function ivInit(){
  if (!Array.isArray(S.ivTurns) || !S.ivTurns.length) S.ivTurns = [{ role: "assistant", content: OPENER }];
  renderIv();
}
function renderIv(){
  const box = $("#iv-chat"), elder = details().elder || "Elder";
  box.innerHTML = S.ivTurns.map((t, i) => {
    if (t.role === "assistant") {
      const p = splitEN(t.content);
      return `<div class="bubble ai"><span class="who">RootKook</span>${esc(p.main)}${p.en ? `<span class="en">${esc(p.en)}</span>` : ""}${window.speechSynthesis ? `<button class="play" data-say="${i}">Listen again</button>` : ""}</div>`;
    }
    return `<div class="bubble me"><span class="who">${esc(elder)}</span>${esc(t.content)}</div>`;
  }).join("");
  box.querySelectorAll("[data-say]").forEach(b => b.onclick = () => sayNow(splitEN(S.ivTurns[+b.dataset.say].content).main));
  box.scrollTop = box.scrollHeight;
}
function aiCopy(e){ return e?.code === "cancelled" ? "" : (e?.message || "Something went wrong. Try again."); }
let ivBusy = false;
async function ivSend(){
  const inp = $("#iv-input"), text = inp.value.trim();
  if (!text || ivBusy) return;
  micOff();
  S.ivTurns.push({ role: "user", content: text });
  inp.value = ""; store.set("rk.interview", S.ivTurns); renderIv();
  if (!S.ai) { $("#iv-status").textContent = "Saved. Keep typing their answers, then make the card."; return; }
  ivBusy = true; $("#iv-send").disabled = true;
  const st = $("#iv-status"); st.className = "status"; st.innerHTML = '<span class="dots">Thinking</span>';
  try {
    const d = details();
    const { text: reply } = await api("interview", { details: { elder: d.elder, relation: d.relation, place: d.place, lang: d.lang }, wantEN: wantEN(), turns: S.ivTurns.slice(-40) });
    S.ivTurns.push({ role: "assistant", content: reply.trim() });
    store.set("rk.interview", S.ivTurns); renderIv(); st.textContent = "";
    speak(splitEN(reply).main);
  } catch (e) {
    st.className = "status err"; st.textContent = aiCopy(e);
  } finally { ivBusy = false; $("#iv-send").disabled = false; inp.focus(); }
}
$("#iv-send").onclick = ivSend;
$("#iv-input").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ivSend(); } });
let resetArm = false;
$("#iv-reset").onclick = () => {
  if (!resetArm) { resetArm = true; $("#iv-reset").textContent = "Tap again to clear the interview"; setTimeout(() => { resetArm = false; $("#iv-reset").textContent = "Start over"; }, 3000); return; }
  resetArm = false; $("#iv-reset").textContent = "Start over";
  S.ivTurns = [{ role: "assistant", content: OPENER }]; store.set("rk.interview", S.ivTurns); renderIv(); $("#iv-status").textContent = "";
  if (!isEnglish()) localizeOpener();
};

/* ---------- preserve: make the card ---------- */
function recordingText(){
  if (mode === "paste") return $("#f-transcript").value.trim();
  const d = details(), elder = d.elder || "Elder";
  return S.ivTurns.map(t => (t.role === "assistant" ? "Interviewer: " : elder + ": ") + t.content).join("\n");
}
function hasContent(){
  if (mode === "paste") return $("#f-transcript").value.trim().length > 20 || ($("#f-photo").files || []).length > 0;
  return S.ivTurns.some(t => t.role === "user");
}
function normalize(r){
  const o = r && typeof r === "object" ? r : {};
  const arr = v => Array.isArray(v) ? v : [];
  const str = v => v == null ? "" : String(v);
  return {
    id: str(o.id) || uid(),
    title: str(o.title) || "Untitled family recipe",
    nativeName: str(o.nativeName),
    elder: { name: str(o.elder?.name), relation: str(o.elder?.relation), place: str(o.elder?.place) },
    occasion: str(o.occasion), servings: str(o.servings),
    totalMinutes: Number.isFinite(+o.totalMinutes) && o.totalMinutes !== null && o.totalMinutes !== "" ? +o.totalMinutes : null,
    story: (Array.isArray(o.story) ? o.story : str(o.story).split(/\n\s*\n/)).map(str).filter(Boolean),
    whyItMatters: str(o.whyItMatters),
    ingredients: arr(o.ingredients).map(i => ({ item: str(i.item), elderMeasure: str(i.elderMeasure), approxMeasure: str(i.approxMeasure), substitute: str(i.substitute) })).filter(i => i.item),
    steps: arr(o.steps).map(s => ({ text: str(s.text), cue: str(s.cue), minutes: Number.isFinite(+s.minutes) && s.minutes !== null && s.minutes !== "" && +s.minutes > 0 ? +s.minutes : null, kidTask: str(s.kidTask), kidAge: str(s.kidAge) })).filter(s => s.text),
    tips: arr(o.tips).map(str).filter(Boolean),
    gaps: arr(o.gaps).map(g => typeof g === "string" ? { question: g, why: "" } : { question: str(g.question), why: str(g.why) }).filter(g => g.question),
    tags: arr(o.tags).map(str).filter(Boolean).slice(0, 8),
    raw: str(o.raw), savedAt: o.savedAt || Date.now(), example: !!o.example
  };
}
let pvCtl = null;
$("#btn-preserve").onclick = async () => {
  const st = $("#pv-status"); st.className = "status";
  if (pvCtl) { pvCtl.abort(); return; }
  if (!hasContent()) { st.className = "status err"; st.textContent = mode === "paste" ? "Paste or type what they said first." : "Record at least one answer first."; return; }
  const rec = recordingText(); const d = details();
  if (!S.ai) {   // no AI: keep the words as they are
    const r = normalize({ title: (d.elder ? d.elder + "'s recipe" : "Family recipe"), elder: { name: d.elder, relation: d.relation, place: d.place }, story: [rec], raw: rec,
      gaps: [{ question: "List each ingredient and how much they use.", why: "Saved without AI, so nothing was structured yet." }] });
    await saveMine(r); openRecipe(r, "mine", "capture"); toast("Saved to your cookbook as written"); return;
  }
  const photoFile = mode === "paste" ? ($("#f-photo").files || [])[0] : null;
  pvCtl = new AbortController(); const btn = $("#btn-preserve"); btn.textContent = "Stop";
  st.innerHTML = '<span class="dots">Writing the card. This takes up to a minute</span>';
  try {
    const image = photoFile ? await photoToBase64(photoFile) : null;
    const { card: out } = await api("card", { details: { elder: d.elder, relation: d.relation, place: d.place, lang: d.lang }, recording: rec, image }, pvCtl.signal);
    const r = normalize({ ...out, raw: rec });
    if (!r.elder.name) r.elder.name = d.elder; if (!r.elder.relation) r.elder.relation = d.relation; if (!r.elder.place) r.elder.place = d.place;
    await saveMine(r); st.textContent = "";
    openRecipe(r, "mine", "capture"); toast("Card made and saved to your cookbook");
  } catch (e) { st.className = "status err"; st.textContent = aiCopy(e); }
  finally { pvCtl = null; btn.textContent = S.ai ? "Make the recipe card" : "Save the story as written"; }
};

/* ---------- cookbook storage ---------- */
async function saveMine(r){
  r.savedAt = r.savedAt || Date.now();
  S.local[r.id] = r;
  if (!store.set("rk.cookbook", S.local)) toast("This browser won't save recipes. Download a backup.");
  renderCount();
}
async function deleteMine(id){ delete S.local[id]; store.set("rk.cookbook", S.local); renderCount(); }
function renderCount(){ const n = mine().length; $("#count-mine").textContent = n ? n : ""; }
function storeNote(){ $("#store-note").textContent = "Saved in this browser on this device. Download a backup now and then, and restore it on another phone or laptop."; }
function tileHTML(r, extra = ""){
  const by = [r.elder.name, r.elder.place].filter(Boolean).join(" · ");
  return `<button class="tile" data-id="${esc(r.id)}">
    <div class="chips">${r.example ? '<span class="chip ex">Example</span>' : ""}${r.tags.slice(0, 2).map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
    <h3>${esc(r.title)}</h3>
    ${r.nativeName ? `<span class="native" style="font-size:1rem">${esc(r.nativeName)}</span>` : ""}
    <p class="q">${esc(r.story[0] || r.whyItMatters || "")}</p>
    <span class="meta">${esc(by || "Family recipe")}${extra}</span></button>`;
}
function matches(r, q){ if (!q) return true; const h = [r.title, r.nativeName, r.elder.name, r.elder.place, r.occasion, ...r.tags].join(" ").toLowerCase(); return q.toLowerCase().split(/\s+/).every(w => h.includes(w)); }
function renderMine(){
  storeNote();
  const q = $("#q-mine").value.trim(); const list = mine().filter(r => matches(r, q));
  const box = $("#tiles-mine");
  if (!mine().length) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>No recipes yet</h3><p>Record your first one with an elder. Here's an example of what a finished card looks like.</p><div class="row" style="justify-content:center"><button class="btn primary" data-go="capture">Record a recipe</button><button class="btn" data-ex>Open the example</button></div></div>`;
  } else box.innerHTML = list.map(r => tileHTML(r)).join("") || `<p class="muted">Nothing matches "${esc(q)}".</p>`;
  box.querySelectorAll(".tile").forEach(t => t.onclick = () => { const r = mine().find(x => x.id === t.dataset.id); if (r) openRecipe(r, "mine", "cookbook"); });
  box.querySelector("[data-go]")?.addEventListener("click", () => show("capture"));
  box.querySelector("[data-ex]")?.addEventListener("click", () => openRecipe(normalize(EXAMPLE), "example", "cookbook"));
}
$("#q-mine").addEventListener("input", renderMine);

$("#btn-export").onclick = () => {
  const data = JSON.stringify({ app: "RootKook", version: 1, exportedAt: new Date().toISOString(), recipes: mine() }, null, 2);
  downloadFile("rootkook-cookbook-backup.json", data, "application/json"); toast("Backup downloaded");
};
$("#f-import").addEventListener("change", async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); const list = Array.isArray(j) ? j : j.recipes;
    if (!Array.isArray(list)) throw 0;
    let n = 0; for (const x of list) { await saveMine(normalize(x)); n++; }
    toast(`Restored ${n} recipe${n === 1 ? "" : "s"}`); renderMine();
  } catch { toast("That file isn't a RootKook backup"); }
  e.target.value = "";
});

/* ---------- recipe view ---------- */
function openRecipe(r, source, from){
  S.current = r; S.currentSource = source; S.askTurns = []; backTo = from || "cookbook";
  renderRecipe(); show("recipe");
}
function fmtMin(m){ if (!m) return ""; return m >= 60 ? `${Math.floor(m / 60)} hr${m % 60 ? " " + (m % 60) + " min" : ""}` : m + " min"; }
function renderRecipe(){
  const r = S.current, src = S.currentSource;
  const by = [r.elder.name && `As taught by ${r.elder.name}${r.elder.relation ? `, ${r.elder.relation}` : ""}`, r.elder.place].filter(Boolean).join(" · ");
  const meta = [r.occasion, r.servings && `Serves ${r.servings}`, fmtMin(r.totalMinutes)].filter(Boolean);
  $("#recipe-card").innerHTML = `<article class="card">
    <div class="card-head">
      <div class="chips">${r.example ? '<span class="chip ex">Example card</span>' : ""}${src === "community" ? '<span class="chip ex">Community table</span>' : ""}${r.tags.map(t => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <h2>${esc(r.title)}</h2>
      ${r.nativeName ? `<span class="native">${esc(r.nativeName)}</span>` : ""}
      ${by ? `<span class="byline">${esc(by)}</span>` : ""}
      ${meta.length ? `<span class="muted small">${meta.map(esc).join(" · ")}</span>` : ""}
    </div>
    ${r.story.length ? `<div class="ruled" aria-label="Story in their words">${r.story.map(p => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
    ${r.whyItMatters ? `<div class="why"><span class="label">Why the family makes it</span><p>${esc(r.whyItMatters)}</p></div>` : ""}
    <div class="card-body">
      <div class="sec"><span class="label">Ingredients · their measure</span>
        <ul class="ing">${r.ingredients.map(i => `<li><span class="name">${esc(i.item)}</span><span class="em">${esc(i.elderMeasure)}</span>${i.approxMeasure ? `<span class="ap">${esc(i.approxMeasure)}</span>` : ""}${i.substitute ? `<span class="sub"><b>Abroad:</b> ${esc(i.substitute)}</span>` : ""}</li>`).join("") || '<li class="muted">No ingredients recorded yet.</li>'}</ul>
      </div>
      <div class="sec"><span class="label">Method</span>
        <ol class="method">${r.steps.map(s => `<li><div><div>${esc(s.text)}${s.minutes ? ` <span class="mins">· ${fmtMin(s.minutes)}</span>` : ""}</div>${s.cue ? `<div class="cue">“${esc(s.cue)}”</div>` : ""}${s.kidTask ? `<div class="kid"><b>Child's job${s.kidAge ? ` (${esc(s.kidAge)})` : ""}:</b> ${esc(s.kidTask)}</div>` : ""}</div></li>`).join("") || '<li class="muted">No steps recorded yet.</li>'}</ol>
        ${r.tips.length ? `<span class="label" style="margin-top:6px">Their tips</span><ul class="tips">${r.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </div>
    </div>
    <div class="card-actions">
      <button class="btn primary" id="a-cook" ${r.steps.length ? "" : "disabled"}>Cook along</button>
      <button class="btn" id="a-shop">Copy shopping list</button>
      <button class="btn" id="a-keep">Download keepsake</button>
      <button class="btn" id="a-print">Print</button>
      ${src === "mine" ? `<button class="btn" id="a-share">Share to community table</button><button class="btn ghost danger" id="a-del" style="margin-left:auto">Delete</button>` : ""}
      ${src !== "mine" ? `<button class="btn" id="a-save">Save a copy to my cookbook</button>` : ""}
    </div>
    <div id="card-confirm" style="padding:0 24px 14px;background:var(--sunk)" hidden></div>
  </article>`;
  wireCard();
  renderSide();
}
function shoppingText(r){ return `${r.title} — shopping list\n` + r.ingredients.map(i => `☐ ${i.item}${i.approxMeasure ? ` (${i.approxMeasure.replace(/^about\s*/i, "~")})` : i.elderMeasure ? ` (${i.elderMeasure})` : ""}`).join("\n"); }
function confirmBox(html, onYes, yesLabel){
  const c = $("#card-confirm"); c.hidden = false;
  c.innerHTML = `<div class="confirm">${html}<button class="btn primary" id="cf-yes">${esc(yesLabel)}</button><button class="btn ghost" id="cf-no">Cancel</button></div>`;
  $("#cf-no").onclick = () => c.hidden = true;
  $("#cf-yes").onclick = async () => { const ok = await onYes(); if (ok !== false) c.hidden = true; };
}
function wireCard(){
  const r = S.current;
  $("#a-cook").onclick = () => openCook(r);
  $("#a-shop").onclick = async () => {
    const t = shoppingText(r);
    try { await navigator.clipboard.writeText(t); toast("Shopping list copied"); }
    catch { confirmBox(`<textarea readonly style="width:100%;min-height:140px">${esc(t)}</textarea>`, () => true, "Done"); $("#card-confirm textarea").select(); }
  };
  $("#a-keep").onclick = () => keepsake(r);
  $("#a-del") && ($("#a-del").onclick = () => confirmBox(`<span>Delete “${esc(r.title)}” from your cookbook?</span>`, async () => { await deleteMine(r.id); toast("Deleted"); show("cookbook"); }, "Delete"));
  $("#a-save") && ($("#a-save").onclick = async () => { const c = normalize({ ...r, id: uid(), example: false, savedAt: Date.now() }); await saveMine(c); S.current = c; S.currentSource = "mine"; renderRecipe(); toast("Saved to your cookbook"); });
  $("#a-print").onclick = () => window.print();
  $("#a-share") && ($("#a-share").onclick = () => {
    if (!S.community) { toast("The community table isn't switched on for this site"); return; }
    confirmBox(`<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="cf-perm" style="margin-top:4px"> <span>${esc(r.elder.name || "The elder")} said it's OK to share this recipe and story with other families.</span></label>`, async () => {
      if (!$("#cf-perm").checked) { toast("Tick the box to confirm permission"); return false; }
      try { const { raw, savedAt, example, ...card } = r; await api("community", { card, consent: true }); toast("Sent for review. It appears on the table once approved."); }
      catch (e) { toast(aiCopy(e)); return false; }
    }, "Share");
  });
}

/* side panel: gaps + ask */
function renderSide(){
  const r = S.current, editable = S.currentSource === "mine";
  const gapsHTML = r.gaps.length ? `<section class="panel">
      <div><span class="label">Still to ask</span><h3>Questions for next time you cook together</h3></div>
      ${r.gaps.map((g, i) => `<div class="gap-item"><span class="q">${esc(g.question)}</span>${g.why ? `<span class="w">${esc(g.why)}</span>` : ""}${editable ? `<input id="gap-${i}" placeholder="Their answer">` : ""}</div>`).join("")}
      ${editable ? `<div class="row"><button class="btn" id="gap-go" ${S.ai ? "" : "disabled"}>Update the card</button><span class="status" id="gap-status"></span></div>` : ""}
      ${!editable && S.currentSource === "example" ? '<p class="muted small">On your own cards you can type the answers here and RootKook rewrites the card.</p>' : ""}
    </section>` : "";
  $("#recipe-side").innerHTML = gapsHTML + `<section class="panel ask">
      <div><span class="label">Ask the recipe</span><h3>Stuck mid-cook?</h3></div>
      <div class="chat" id="ask-chat"><div class="bubble ai"><span class="who">RootKook</span>Ask about swaps, timing, scaling it up for a party, or what a step means.</div></div>
      <div class="composer"><textarea id="ask-input" placeholder="e.g. Can I make it with brown rice?"></textarea><button class="btn" id="ask-send" ${S.ai ? "" : "disabled"}>Ask</button></div>
      <span class="status" id="ask-status">${S.ai ? "" : "The AI isn't switched on for this site yet."}</span>
    </section>`;
  if (editable && r.gaps.length) $("#gap-go").onclick = fillGaps;
  $("#ask-send").onclick = ask;
  $("#ask-input").addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } });
}
function cardJSON(r){ const { raw, savedAt, example, ...rest } = r; return JSON.stringify(rest); }
async function fillGaps(){
  const r = S.current, st = $("#gap-status");
  const answers = r.gaps.map((g, i) => ({ q: g.question, a: ($("#gap-" + i)?.value || "").trim() })).filter(x => x.a);
  if (!answers.length) { st.className = "status err"; st.textContent = "Type at least one answer."; return; }
  const btn = $("#gap-go"); btn.disabled = true; st.className = "status"; st.innerHTML = '<span class="dots">Updating</span>';
  try {
    const { raw, savedAt, example, ...card } = r;
    const { card: out } = await api("gaps", { card, answers });
    const nr = normalize({ ...out, id: r.id, raw: r.raw, savedAt: Date.now() });
    await saveMine(nr); S.current = nr; renderRecipe(); toast("Card updated");
  } catch (e) { st.className = "status err"; st.textContent = aiCopy(e); btn.disabled = false; }
}
let askBusy = false;
async function ask(){
  const inp = $("#ask-input"), q = inp.value.trim(); if (!q || askBusy || !S.ai) return;
  const chat = $("#ask-chat"), st = $("#ask-status"); askBusy = true; inp.value = "";
  S.askTurns.push({ role: "user", content: q });
  chat.insertAdjacentHTML("beforeend", `<div class="bubble me" style="font-family:var(--f-body);font-size:1rem;color:var(--ink)"><span class="who">You</span>${esc(q)}</div>`);
  const b = document.createElement("div"); b.className = "bubble ai"; b.innerHTML = '<span class="who">RootKook</span><span class="t"></span>';
  st.className = "status"; st.innerHTML = '<span class="dots">Thinking</span>'; chat.scrollTop = 1e9;
  try {
    const { raw, savedAt, example, ...card } = S.current;
    const { text } = await api("ask", { card, turns: S.askTurns.slice(-12) });
    b.querySelector(".t").textContent = text; chat.append(b); st.textContent = ""; chat.scrollTop = 1e9;
    S.askTurns.push({ role: "assistant", content: text });
  } catch (e) { S.askTurns.pop(); b.remove(); st.className = "status err"; st.textContent = aiCopy(e); }
  finally { askBusy = false; }
}

/* keepsake download */
function keepsake(r){
  const by = [r.elder.name && `As taught by ${r.elder.name}${r.elder.relation ? ", " + r.elder.relation : ""}`, r.elder.place].filter(Boolean).join(" · ");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(r.title)}</title>
<style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 20px;color:#1b2a3a;line-height:1.6}h1{margin:0}.n{font-style:italic;color:#20406b;font-size:1.2em}.by{color:#566476}.story{border-left:3px solid #d4513b;padding:4px 18px;margin:24px 0;font-style:italic;color:#20406b}h2{font-size:1rem;letter-spacing:.08em;text-transform:uppercase;color:#566476;margin-top:28px}li{margin-bottom:6px}.c{color:#20406b;font-style:italic}.k{color:#2f7d4f;font-size:.92em}.s{color:#566476;font-size:.9em}</style></head><body>
<h1>${esc(r.title)}</h1>${r.nativeName ? `<div class="n">${esc(r.nativeName)}</div>` : ""}<div class="by">${esc(by)}</div>
${r.story.length ? `<div class="story">${r.story.map(p => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
${r.whyItMatters ? `<p>${esc(r.whyItMatters)}</p>` : ""}
<h2>Ingredients</h2><ul>${r.ingredients.map(i => `<li><b>${esc(i.item)}</b>: ${esc(i.elderMeasure)}${i.approxMeasure ? ` <span class="s">(${esc(i.approxMeasure)})</span>` : ""}${i.substitute ? `<br><span class="s">Abroad: ${esc(i.substitute)}</span>` : ""}</li>`).join("")}</ul>
<h2>Method</h2><ol>${r.steps.map(s => `<li>${esc(s.text)}${s.cue ? `<br><span class="c">“${esc(s.cue)}”</span>` : ""}${s.kidTask ? `<br><span class="k">Child's job: ${esc(s.kidTask)}</span>` : ""}</li>`).join("")}</ol>
${r.tips.length ? `<h2>Tips</h2><ul>${r.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
<p class="s" style="margin-top:40px">Preserved with RootKook · ${new Date().toLocaleDateString()}</p></body></html>`;
  downloadFile((r.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "recipe") + ".html", html, "text/html"); toast("Keepsake downloaded");
}

/* ---------- cook-along ---------- */
const C = { r: null, i: 0, timer: null, left: 0, lock: null };
function openCook(r){ C.r = r; C.i = 0; $("#cook").hidden = false; document.body.style.overflow = "hidden"; renderCook();
  try { navigator.wakeLock?.request("screen").then(l => C.lock = l).catch(() => {}); } catch {} }
function closeCook(){ stopTimer(); $("#cook").hidden = true; document.body.style.overflow = ""; try { C.lock?.release(); } catch {} C.lock = null; }
function stopTimer(){ clearInterval(C.timer); C.timer = null; }
const pad = n => String(n).padStart(2, "0");
function renderCook(){
  stopTimer();
  const r = C.r, total = r.steps.length + 1, i = C.i;
  $("#cook-title").textContent = r.title;
  $("#cook-count").textContent = i === 0 ? "Get ready" : `Step ${i} of ${r.steps.length}`;
  $("#cook-bar").style.width = (i / (total - 1)) * 100 + "%";
  $("#cook-prev").disabled = i === 0;
  $("#cook-next").textContent = i === total - 1 ? "Finish" : (i === 0 ? "Start cooking" : "Next");
  const m = $("#cook-main");
  if (i === 0) {
    const kids = r.steps.filter(s => s.kidTask).length;
    m.innerHTML = `<div class="cook-step">Gather everything first.</div>
      <p class="muted">Tick things off as you set them out.${kids ? ` There ${kids === 1 ? "is 1 job" : `are ${kids} jobs`} for the children in this recipe.` : ""}</p>
      <ul class="checklist">${r.ingredients.map((x, k) => `<li><label><input type="checkbox" id="ck-${k}"><span><b>${esc(x.item)}</b> · <span class="em">${esc(x.elderMeasure)}</span>${x.approxMeasure ? ` <span class="muted small">(${esc(x.approxMeasure)})</span>` : ""}</span></label></li>`).join("")}</ul>`;
    return;
  }
  const s = r.steps[i - 1];
  m.innerHTML = `<div class="cook-step">${esc(s.text)}</div>
    ${s.cue ? `<div class="cook-cue">“${esc(s.cue)}”${r.elder.name ? ` <span class="muted small" style="font-family:var(--f-body)">· ${esc(r.elder.name)}</span>` : ""}</div>` : ""}
    ${s.minutes ? `<div class="timer" id="timer"><span class="t" id="t-val">${pad(s.minutes)}:00</span><button class="btn" id="t-go">Start ${fmtMin(s.minutes)} timer</button></div>` : ""}
    ${s.kidTask ? `<div class="cook-kid"><span class="label" style="color:var(--ok)">Child's job${s.kidAge ? ` · ages ${esc(s.kidAge)}` : ""}</span><div style="font-size:1.15rem;margin-top:2px">${esc(s.kidTask)}</div></div>` : ""}`;
  if (s.minutes) {
    C.left = Math.round(s.minutes * 60);
    $("#t-go").onclick = () => {
      if (C.timer) { stopTimer(); $("#t-go").textContent = "Resume"; return; }
      $("#t-go").textContent = "Pause";
      C.timer = setInterval(() => {
        C.left--; const el = $("#t-val"); if (!el) return stopTimer();
        el.textContent = `${pad(Math.floor(Math.max(C.left, 0) / 60))}:${pad(Math.max(C.left, 0) % 60)}`;
        if (C.left <= 0) { stopTimer(); $("#timer").classList.add("done"); $("#t-go").textContent = "Time's up"; beep(); }
      }, 1000);
    };
  }
}
function beep(){ try { const a = new (window.AudioContext || window.webkitAudioContext)(); [0, .35, .7].forEach(t => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; g.gain.value = .15; o.connect(g); g.connect(a.destination); o.start(a.currentTime + t); o.stop(a.currentTime + t + .2); }); } catch {} }
$("#cook-prev").onclick = () => { if (C.i > 0) { C.i--; renderCook(); } };
$("#cook-next").onclick = () => { if (C.i < C.r.steps.length) { C.i++; renderCook(); } else { closeCook(); toast("Well cooked! Take a photo with them."); } };
$("#cook-close").onclick = closeCook;
document.addEventListener("keydown", e => { if ($("#cook").hidden) return; if (e.key === "Escape") closeCook(); if (e.key === "ArrowRight") $("#cook-next").click(); if (e.key === "ArrowLeft") $("#cook-prev").click(); });

/* ---------- community ---------- */
let commNote = "Loading the community table…";
async function loadCommunity(){
  try { const { recipes } = await api("community"); S.shared = (recipes || []).map(x => ({ id: x.id, recipe: normalize({ ...x.card, id: x.id }) })); commNote = ""; }
  catch { commNote = "The community table couldn't load right now."; }
  if (!$("#view-community").hidden) renderCommunity();
}
function renderCommunity(){
  const box = $("#tiles-comm"), q = $("#q-comm").value.trim();
  if (!S.shared.length) { box.innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>No shared recipes yet</h3><p>${esc(commNote)}</p><p>Open a card in your cookbook and choose “Share to community table” to be the first. A volunteer checks each one before it appears.</p></div>`; return; }
  const list = S.shared.filter(c => matches(c.recipe, q));
  box.innerHTML = list.map(c => tileHTML(c.recipe)).join("") || `<p class="muted">Nothing matches "${esc(q)}".</p>`;
  box.querySelectorAll(".tile").forEach(t => t.onclick = () => { const c = S.shared.find(x => x.recipe.id === t.dataset.id); if (c) openRecipe(c.recipe, "community", "community"); });
}
$("#q-comm").addEventListener("input", renderCommunity);
$("#open-example").onclick = () => openRecipe(normalize(EXAMPLE), "example", "capture");

/* ---------- AI availability ---------- */
function disableAI(){
  S.ai = false;
  $("#ai-note").hidden = false;
  $("#ai-note").textContent = "The AI helper isn't switched on for this site yet. You can still record answers and save the story as written.";
  $("#btn-preserve").textContent = "Save the story as written";
}

/* ---------- boot ---------- */
ivInit(); renderCount(); setMode("interview"); updateVoiceNote();
$("#photo-field").hidden = false;
(async () => {
  let cfg = { ai: false, community: false };
  try { cfg = await api("config"); } catch {}
  S.ai = !!cfg.ai; S.community = !!cfg.community;
  if (!S.ai) disableAI();
  else if (!isEnglish() && !S.ivTurns.some(t => t.role === "user") && S.ivTurns[0]?.content === OPENER) localizeOpener();
  if (S.community) loadCommunity(); else $("#tab-community").hidden = true;
})();
})();
