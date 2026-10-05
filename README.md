# RootKook

An AI kitchen interviewer that helps families preserve an elder's heritage recipes and the stories behind them.

- **Voice interview in 37 languages.** RootKook asks one question at a time, out loud, in the elder's language, with an optional English line for the grandchildren. Answers can be spoken (Chrome, Edge, Safari) or typed.
- **Recipe card.** The interview, a pasted transcript or a photo of a handwritten card becomes a card that keeps the elder's words and measures, adds approximate measures, swaps for families abroad, and a safe job for children at each step.
- **Still to ask.** It lists what's unclear so the family can ask next time, then rewrites the card with the answers.
- **Cook along.** Big-text steps, timers and children's jobs.
- **Ask the recipe.** Questions while cooking, answered in the spirit of the elder's method.
- **Cookbook.** Saved in the visitor's browser, with backup, restore and printable keepsakes.
- **Community table (optional).** Families can share a recipe with the elder's permission. You approve each one before it appears.

Built by Team Cosmo (NYU Tandon) from the RootKook concept.

---

## How it works

```
public/index.html, app.js   the website people use
public/admin.html           your review queue for shared recipes
api/*.js                    small server functions; they hold the API key and the prompts
lib/*.js                    shared code: Claude calls, rate limiting, database
server.js                   runs everything locally or on any Node host
```

Visitors never see your API key. The server only does RootKook's jobs (it builds every prompt itself), limits each visitor to 60 AI requests an hour, and can stop at a daily total you choose.

---

## Put it online (about 15 minutes)

You need a GitHub account, a free Vercel account, and an Anthropic API key.

### 1. Get an Anthropic API key
1. Go to **console.anthropic.com** and sign up.
2. Add a payment method and some credit under Billing.
3. Set a monthly spend limit, so a busy month can't surprise you.
4. Create an API key and copy it (it starts with `sk-ant-`).

### 2. Put the code on GitHub
1. Create a new repository on github.com, for example `rootkook`.
2. Upload this whole folder, or with git:
   ```
   git init && git add . && git commit -m "RootKook"
   git remote add origin https://github.com/<you>/rootkook.git
   git push -u origin main
   ```

### 3. Deploy on Vercel
1. Go to **vercel.com**, sign in with GitHub, add a new project, and import the repository.
2. Leave the build settings as they are (no framework, no build command).
3. Under **Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key
   - `DAILY_CALL_CAP` = `2000` (optional; AI pauses for the day after this many requests)
4. Click **Deploy**. You get a link like `rootkook.vercel.app`. That's your public site.

### 4. Turn on the community table (optional)
1. In your Vercel project, add the **Upstash Redis** integration (free tier) from Storage or Integrations and connect it to the project. It fills in the database variables.
2. Add one more environment variable: `ADMIN_KEY` = a long password only you know.
3. Redeploy the project.
4. Shared recipes now wait in your review queue at `https://<your-site>/admin.html`.

Without these settings the Community tab is hidden.

### 5. Your own web address (optional)
Vercel's project settings let you attach a domain like `rootkook.org` if you buy one.

---

## Run it on your own computer

Needs Node.js 18 or newer. No packages to install.

```
cp .env.example .env        # then put your key in .env
npm start                   # http://localhost:3000
```

To try it without a key, set `MOCK_AI=1` in `.env`; the AI then gives canned test answers.

Any host that runs Node (Render, Railway, Fly.io, a VPS) also works with `npm start` and the same environment variables.

---

## Settings

| Variable | Needed | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Claude API key |
| `CARD_MODEL` | No | Model for writing cards (default `claude-sonnet-5-5`) |
| `CHAT_MODEL` | No | Faster model for interview questions and answers (default `claude-haiku-4-5-20251001`) |
| `RATE_LIMIT_PER_HOUR` | No | AI requests per visitor per hour (default 60) |
| `DAILY_CALL_CAP` | No | AI requests for the whole site per day (off unless set) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | For community table | Database; added by the Upstash integration |
| `ADMIN_KEY` | For community table | Password for `/admin.html` |

---

## Good to know

- **Voice.** Spoken answers use the browser's built-in speech recognition, which Chrome, Edge and Safari support and Firefox doesn't. The browser asks for microphone permission the first time. Questions are read aloud with the voices installed on the device; if a language has no voice, the question shows as text. A phone keyboard's microphone key works everywhere.
- **Privacy.** Recipes stay in the visitor's browser. Text and photos go to Anthropic only to make a card or answer a question. Only recipes a family chooses to share, and you approve, are stored on your server.
- **Costs.** Each interview question, card and answer is one API call billed to your key. Check current prices on Anthropic's pricing page, and keep a spend limit and `DAILY_CALL_CAP` on.
- **Children.** The app assumes an adult is present. Children's jobs avoid knives (under 12) and hot oil.
