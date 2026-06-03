# Invika 🎙️∞

> mee personal Tinglish AI assistant — always listening, always ready ra.

Invika is a voice-first AI assistant that speaks Telugu + English (Tinglish), just like urban Telugu people talk every day. Inspired by Jarvis & Siri — continuous mic, instant Tinglish responses, app launching.

---

## 🚀 Deploy in 5 Minutes

### Step 1 — GitHub
1. Go to [github.com](https://github.com) → New repository → name it `invika` → Public
2. Upload this entire folder (drag & drop all files)
3. Commit

### Step 2 — Vercel
1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your `invika` GitHub repo
3. Click **Deploy** — done in 60 seconds ✅

### Step 3 — Add API Key
1. Open your Vercel URL
2. Tap ⚙ Settings → **AI Provider** → select **Gemini (Free)**
3. Get free key at [aistudio.google.com](https://aistudio.google.com) → Get API Key
4. Paste key → Invika is ready ra!

---

## 💻 Local Development

```bash
npm install
npm run dev
# Open http://localhost:5173
```

---

## ✨ Features

- 🎙️ Always-on mic — Jarvis style, continuous listening
- 🗣️ Tinglish responses — Telugu + English mixed naturally
- 🆓 Gemini API — completely free tier
- 🚀 App launcher — ThinkCare, HurryUp, YouTube, Netflix, Spotify
- 👩 Female voice — Indian English (en-IN)
- 🧠 Conversation memory — persists across sessions
- ⚠️ API key expiry alerts
- 📱 PWA — install on phone like a real app
- 🌙 Dark UI — premium feel

---

## 📁 Project Structure

```
invika/
├── index.html          ← App shell + PWA meta tags
├── package.json        ← React 18 + Vite
├── vite.config.js      ← Build config
├── vercel.json         ← Vercel deploy config
├── .gitignore
├── README.md
├── public/
│   ├── favicon.png           ← Browser tab icon
│   ├── apple-touch-icon.png  ← iPhone home screen icon
│   ├── invika-icon-192.png   ← Android icon
│   ├── invika-icon-512.png   ← PWA / Play Store icon
│   ├── invika-logo-1024.png  ← Full res logo
│   ├── invika-logo.svg       ← Vector logo
│   └── manifest.json         ← PWA manifest
└── src/
    ├── main.jsx        ← React entry point
    └── Invika.jsx      ← Entire application
```

---

## 🗣️ Voice Commands

| Say this | Invika does |
|---|---|
| "Nuvvu evaru ra?" | Introduces itself in Tinglish |
| "Open ThinkCare" | Opens healthcare app |
| "Open HurryUp" | Opens commuter app |
| "Oka joke cheppu" | Tells a Telugu joke |
| "Clear history" | Wipes memory |
| Tap orb | Pause / resume mic |
| Tap orb while speaking | Interrupt Invika |

---

Built with React 18 · Vite · Web Speech API · Gemini API
