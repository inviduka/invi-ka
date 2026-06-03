import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const APP_KEY    = "invika_apps";
const SET_KEY    = "invika_settings";
const HIST_KEY   = "invika_history";
const EXPIRY_KEY = "invika_expiry";

const DEFAULT_APPS = [
  { id:"thinkcare", name:"ThinkCare", url:"https://thinkare.lovable.app/",     aliases:["thinkcare","healthcare","health","think care"], icon:"🏥", desc:"Healthcare Platform" },
  { id:"hurryup",   name:"HurryUp",   url:"https://hurryup-buddy.vercel.app/", aliases:["hurryup","hurry up","commuter","hurry"],         icon:"🚌", desc:"Commuter App" },
  { id:"youtube",   name:"YouTube",   url:"https://youtube.com",               aliases:["youtube","yt","videos","tube"],                  icon:"📺", desc:"Video Platform" },
  { id:"netflix",   name:"Netflix",   url:"https://netflix.com",               aliases:["netflix","movies","streaming"],                  icon:"🎬", desc:"Streaming" },
  { id:"spotify",   name:"Spotify",   url:"https://spotify.com",               aliases:["spotify","music","songs","audio"],               icon:"🎵", desc:"Music" },
];

const CALL_WORDS  = ["open","launch","start","tolu","tereu","teresuko","peddu","chupinchu","show","take me","kholo"];
const TITLES      = ["ra","boss","anna","bhai","chief","maccha"];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function greeting(name) {
  const h   = new Date().getHours();
  const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const who = name || "boss";
  return rnd([
    `Hey ${who}! Good ${tod} ra. Nenu Invika — mee personal AI. Cheppandi, em kavali?`,
    `Good ${tod} ${who}! Invika ready ga undi. Emi cheyamantav ra?`,
    `Aiyo ${who}, finally vachav! Good ${tod} ra. Em help kavali?`,
    `${who}! Good ${tod}. Mee Invika — always ready ra. Bollu, em cheyali?`,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const DB = {
  getApps:     ()    => { try { return JSON.parse(localStorage.getItem(APP_KEY)||"null") || DEFAULT_APPS; } catch { return DEFAULT_APPS; } },
  setApps:     (a)   => localStorage.setItem(APP_KEY, JSON.stringify(a)),
  getSettings: ()    => { try { return JSON.parse(localStorage.getItem(SET_KEY)||"{}"); } catch { return {}; } },
  setSettings: (s)   => localStorage.setItem(SET_KEY, JSON.stringify(s)),
  getHistory:  ()    => { try { return JSON.parse(localStorage.getItem(HIST_KEY)||"[]"); } catch { return []; } },
  pushHistory: (m)   => { const h = DB.getHistory().slice(-59); h.push(m); localStorage.setItem(HIST_KEY, JSON.stringify(h)); },
  getExpiry:   (p)   => { try { return (JSON.parse(localStorage.getItem(EXPIRY_KEY)||"{}"))[p] || null; } catch { return null; } },
  setExpiry:   (p,d) => { const e = JSON.parse(localStorage.getItem(EXPIRY_KEY)||"{}"); e[p]=d; localStorage.setItem(EXPIRY_KEY, JSON.stringify(e)); },
};

// ─────────────────────────────────────────────────────────────────────────────
// INTENT
// ─────────────────────────────────────────────────────────────────────────────
function classify(text, apps) {
  const t = text.toLowerCase().trim();
  if (CALL_WORDS.some(w => t.includes(w))) {
    for (const app of apps) {
      const names = [app.name.toLowerCase(), ...app.aliases.map(a=>a.toLowerCase())];
      if (names.some(n => t.includes(n))) return { type:"APP", app };
    }
  }
  if (["settings","configure","api key","setup key"].some(w => t.includes(w))) return { type:"SETTINGS" };
  if (t.includes("clear") && ["history","memory","chat"].some(w=>t.includes(w))) return { type:"CLEAR" };
  return { type:"AI" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT  — Tinglish personality, no AI brand mentions
// ─────────────────────────────────────────────────────────────────────────────
function sysPrompt(apps, name) {
  const who     = name || "boss";
  const appList = apps.map(a=>`${a.name}`).join(", ");
  return `You are Invika — a sharp, warm, witty Telugu-English (Tinglish) AI assistant, like a brilliant close Telugu friend.

TINGLISH STYLE RULES — follow these strictly:
• Every response must mix Telugu + English naturally, exactly how urban Telugu people speak.
• Examples of correct Tinglish:
  - "Arey ${who}, that's a brilliant idea ra! Cheyyi adhi, it'll work for sure."
  - "Aiyo, adhi chala easy ra! Oka 5 minutes lo cheseyochu."
  - "Seri seri anna, chestunna — just wait cheyyi."
  - "Arey boss, Google lo search cheyyi ra, chala results vasthayi."
• Telugu filler words to weave in naturally: ra, anna, bhai, arey, aiyo, seri, cheppandi, kavali, undi, ledu, antunnav, chusav, chala, baaga, super, okay ra, maccha, ikkade, akkade, emi, ento, ela, avunu, kaadu.
• Keep every response SHORT — max 2-3 sentences. This is a voice assistant.
• Never mention any AI company, model, or platform. You are simply Invika.
• Address the user as: ${who}, boss, anna, ra, maccha — rotate naturally.
• Available apps to open if asked: ${appList}.
• Match user's energy: if they're excited, be excited; if they're curious, be thoughtful.
• For greetings respond warmly in Tinglish. For jokes, make Telugu-culture jokes.
• NEVER respond in plain English or plain Telugu only — always Tinglish blend.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CALL
// ─────────────────────────────────────────────────────────────────────────────
// ── GEMINI (Free — gemini-2.0-flash via v1beta)
async function callGemini(history, prompt, apiKey) {
  if (!apiKey || !apiKey.trim()) throw new Error("NO_KEY");

  // Build contents — prepend system prompt as first user+model exchange
  const contents = [
    { role: "user",  parts: [{ text: "System instructions: " + prompt + "\n\nUnderstood. I will follow these instructions." }] },
    { role: "model", parts: [{ text: "Understood ra! I am Invika, ready to help in Tinglish." }] },
  ];
  for (const m of history) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }

  // Try gemini-2.0-flash first (latest free model), fallback to gemini-1.5-flash
  const models = ["gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-1.5-flash"];
  let lastError = null;

  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: { maxOutputTokens: 400, temperature: 0.85 },
          }),
        }
      );
      if (!r.ok) {
        const e = await r.json().catch(()=>({}));
        lastError = new Error(e.error?.message || `Gemini HTTP ${r.status}`);
        // Model not found — try next
        if (r.status === 404 || (e.error?.message||"").includes("not found")) continue;
        throw lastError;
      }
      const d = await r.json();
      const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) { lastError = new Error("Gemini empty response ra"); continue; }
      return text;
    } catch (err) {
      if (err.message === "NO_KEY") throw err;
      lastError = err;
      // Only continue loop for model-not-found type errors
      if (!err.message.includes("not found") && !err.message.includes("404")) throw err;
    }
  }
  throw lastError || new Error("All Gemini models failed ra");
}

// ── OPENAI (GPT-4o-mini — cheap and fast)
async function callOpenAI(history, prompt, apiKey) {
  if (!apiKey || !apiKey.trim()) throw new Error("NO_KEY");
  const messages = [{ role: "system", content: prompt }, ...history];
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey.trim()}` },
    body: JSON.stringify({ model: "gpt-4o-mini", messages, max_tokens: 400, temperature: 0.85 }),
  });
  if (!r.ok) { const e = await r.json().catch(()=>({})); throw new Error(e.error?.message || `OpenAI HTTP ${r.status}`); }
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "Em antunnav ra?";
}

// ── UNIFIED CALLER
async function callAI(history, prompt, apiKey, provider = "gemini") {
  if (!apiKey || !apiKey.trim()) throw new Error("NO_KEY");
  if (provider === "openai") return callOpenAI(history, prompt, apiKey);
  return callGemini(history, prompt, apiKey); // default = gemini
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — en-IN for Tinglish, interruptible
// ─────────────────────────────────────────────────────────────────────────────
const TTS = {
  _synth: typeof window !== "undefined" ? window.speechSynthesis : null,

  _pickFemaleVoice(vs) {
    // Priority list — female voice names across Chrome/Windows/Mac/Android
    const femaleNames = [
      "Google UK English Female", "Google US English", "Google हिन्दी",
      "Microsoft Zira", "Microsoft Heera", "Microsoft Aria",
      "Samantha", "Karen", "Moira", "Tessa", "Veena", "Fiona",
      "Priya", "Aditi", "Raveena", "Kajal"
    ];
    // 1. Exact name match
    for (const name of femaleNames) {
      const v = vs.find(v2 => v2.name === name || v2.name.includes(name));
      if (v) return v;
    }
    // 2. en-IN voices are usually female (Priya, Aditi on Chrome)
    const enIN = vs.find(v => v.lang === "en-IN");
    if (enIN) return enIN;
    // 3. Any voice with "female" anywhere in the name
    const byFemale = vs.find(v => v.name.toLowerCase().includes("female"));
    if (byFemale) return byFemale;
    // 4. Google voices tend to be female
    const google = vs.find(v => v.name.startsWith("Google") && v.lang.startsWith("en"));
    if (google) return google;
    // 5. Last resort
    return vs.find(v => v.lang.startsWith("en")) || vs[0];
  },

  speak(text, cb) {
    if (!this._synth) { cb?.(); return; }
    this.stop();
    const fire = () => {
      const u   = new SpeechSynthesisUtterance(text);
      const vs  = this._synth.getVoices();
      u.voice   = this._pickFemaleVoice(vs);
      u.lang    = u.voice?.lang || "en-IN";
      u.rate    = 0.97;
      u.pitch   = 1.3;   // raised pitch for feminine tone
      u.onend   = () => cb?.();
      u.onerror = () => cb?.();
      this._synth.speak(u);
    };
    if (!this._synth.getVoices().length) {
      this._synth.addEventListener("voiceschanged", function once() {
        this._synth.removeEventListener("voiceschanged", once); fire();
      }.bind(this));
    } else fire();
  },
  stop() { this._synth?.cancel(); },
};

// ─────────────────────────────────────────────────────────────────────────────
// MIC PERMISSION SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function PermScreen({ onAllow, onSkip }) {
  const [busy,  setBusy]  = useState(false);
  const [phase, setPhase] = useState("idle");
  const phaseRef = useRef("idle");
  const setP = (v) => { phaseRef.current = v; setPhase(v); };

  // Use SpeechRecognition to request mic — works in sandboxed iframes
  // where navigator.mediaDevices.getUserMedia is blocked.
  const allow = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setP("nosupport"); return; }
    setBusy(true);
    setP("testing");
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      // Mic granted — abort test session and proceed
      try { rec.abort(); } catch {}
    };

    rec.onerror = (e) => {
      setBusy(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setP("denied");
      } else {
        // aborted (by us), no-speech, network — all mean mic IS allowed
        setP("granted");
        setTimeout(() => onAllow(), 500);
      }
    };

    rec.onend = () => {
      setBusy(false);
      if (phaseRef.current !== "denied") {
        setP("granted");
        setTimeout(() => onAllow(), 500);
      }
    };

    try { rec.start(); } catch {
      setBusy(false);
      setP("granted");
      setTimeout(() => onAllow(), 500);
    }
  };

  const errMsg =
    phase === "denied"     ? "Mic blocked ra. Browser address bar lo 🔒 click cheyyi → Site Settings → Microphone → Allow. Then reload cheyyi." :
    phase === "nosupport"  ? "Voice support ledu ra. Chrome use cheyyi — it works perfectly." : "";

  return (
    <div style={P.page}>
      <div style={P.card}>
        <div style={P.orbRing}>
          <div style={P.orb}><HexIcon size={48} /></div>
        </div>
        <div style={P.brand}>Invika</div>
        <div style={P.tagline}>mee intelligent voice companion</div>
        <div style={P.divider}/>

        {phase === "granted" ? (
          <>
            <div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:"#00e5a0",marginBottom:6}}>Mic Ready Ra!</div>
            <div style={{fontSize:13,color:"#4a5a4a"}}>Invika starting… bolte raho!</div>
          </>
        ) : (
          <>
            <div style={P.permHead}>🎙️ Mic Permission Kavali</div>
            <div style={P.permText}>
              Invika is voice-first ra. Allow cheyyi — hands-free ga maat laadochu.<br/>
              <span style={{color:"#2a3a2a",fontSize:11}}>Mee voice never recorded or stored avvaadu.</span>
            </div>

            {errMsg && (
              <div style={P.errBox}>
                {errMsg}
                {phase === "denied" && (
                  <button style={{marginTop:10,width:"100%",background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.3)",color:"#00e5a0",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}}
                    onClick={()=>window.location.reload()}>
                    Reload Page
                  </button>
                )}
              </div>
            )}

            {phase !== "denied" && phase !== "nosupport" && (
              <button style={{...P.allowBtn,opacity:busy?0.6:1}} onClick={allow} disabled={busy}>
                {busy ? "Browser prompt kosam chuso…" : "🎙️ Allow Microphone"}
              </button>
            )}
            <button style={P.skipBtn} onClick={onSkip}>
              Skip — keyboard use chestanu
            </button>
          </>
        )}
      </div>
      <style>{"@keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}"}</style>
    </div>
  );
}

const P = {
  page:     { minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#07070f", padding:20 },
  card:     { background:"#0c0c1a", border:"1px solid rgba(0,229,160,0.12)", borderRadius:22, padding:"40px 28px", maxWidth:370, width:"100%", textAlign:"center" },
  orbRing:  { width:108, height:108, borderRadius:"50%", border:"1.5px solid rgba(0,229,160,0.25)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px", animation:"orbFloat 3s ease-in-out infinite", background:"radial-gradient(circle at 38% 35%,#0d2820,#060b12)" },
  orb:      { display:"flex", alignItems:"center", justifyContent:"center" },
  brand:    { fontSize:34, fontWeight:900, letterSpacing:"0.1em", color:"#e8e8f8", marginBottom:4 },
  tagline:  { fontSize:12, color:"#3a4a4a", marginBottom:22, letterSpacing:"0.06em" },
  divider:  { height:1, background:"rgba(255,255,255,0.05)", margin:"0 0 20px" },
  permHead: { fontSize:16, fontWeight:600, color:"#c0c8c0", marginBottom:10 },
  permText: { fontSize:13, color:"#4a5a4a", lineHeight:1.85, marginBottom:18 },
  errBox:   { fontSize:12, color:"#ff8080", background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.2)", borderRadius:9, padding:"9px 13px", marginBottom:14 },
  allowBtn: { width:"100%", background:"#00e5a0", border:"none", borderRadius:13, padding:"14px", fontSize:15, fontWeight:800, color:"#000", cursor:"pointer", marginBottom:10, letterSpacing:"0.02em" },
  skipBtn:  { background:"none", border:"none", color:"#333", fontSize:12, cursor:"pointer", padding:6 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function Invika() {
  // ── State
  const [screen,      setScreen]     = useState("perm");
  const [micOk,       setMicOk]      = useState(false);
  const [msgs,        setMsgs]       = useState(() => DB.getHistory());
  const [input,       setInput]      = useState("");
  const [listening,   setListening]  = useState(false);
  const [speaking,    setSpeaking]   = useState(false);
  const [thinking,    setThinking]   = useState(false);
  const [status,      setStatus]     = useState("Invika ready ra…");
  const [interim,     setInterim]    = useState("");
  const [apps,        setApps]       = useState(() => DB.getApps());
  const [settings,    setSettings]   = useState(() => ({ userName:"", apiKey:"", provider:"gemini", ...DB.getSettings() }));
  const [expModal,    setExpModal]   = useState(null);
  const [toast,       setToast]      = useState(null);
  const [newApp,      setNewApp]     = useState({ name:"",url:"",aliases:"",icon:"🔗",desc:"" });

  // ── Stable refs — avoid stale closure issues in async/callback chains
  const recRef       = useRef(null);
  const chatEnd      = useRef(null);
  const speakingR    = useRef(false);
  const thinkingR    = useRef(false);
  const micOkR       = useRef(false);
  const pausedR      = useRef(false);   // user manually paused mic
  const appsR        = useRef(apps);
  const settingsR    = useRef(settings);
  const msgsR        = useRef(msgs);

  // Keep refs in sync with state
  speakingR.current  = speaking;
  thinkingR.current  = thinking;
  micOkR.current     = micOk;
  appsR.current      = apps;
  settingsR.current  = settings;
  msgsR.current      = msgs;

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  // Expiry check on mount
  useEffect(() => {
    for (const p of ["gemini","openai","claude"]) {
      const d = DB.getExpiry(p);
      if (!d) continue;
      const days = Math.ceil((new Date(d) - new Date()) / 86400000);
      if (days <= 7) { setExpModal({ provider:p, days:Math.max(0,days) }); break; }
    }
  }, []);

  // ── Helpers
  const notify = useCallback((msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const saveSetting = useCallback((patch) => {
    setSettings(prev => { const next = {...prev,...patch}; DB.setSettings(next); return next; });
  }, []);

  const addMsg = useCallback((role, content) => {
    const m = { role, content, ts:Date.now() };
    setMsgs(prev => [...prev, m]);
    DB.pushHistory(m);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MIC ENGINE — self-restarting loop using refs so no stale closure issues
  // ─────────────────────────────────────────────────────────────────────────
  // Forward-declare so onSpeech can reference startMic
  const startMicRef = useRef(null);

  const stopMic = useCallback((manual=false) => {
    pausedR.current = manual;
    try { recRef.current?.abort(); } catch {}
    recRef.current = null;
    setListening(false);
    setInterim("");
    if (manual) setStatus("Mic paused — tap orb to restart");
  }, []);

  // Process a finalised transcript
  const onSpeech = useCallback(async (text) => {
    if (!text.trim()) return;
    addMsg("user", text);

    const intent = classify(text, appsR.current);

    // ── OPEN APP
    if (intent.type === "APP") {
      const reply = `Seri ${rnd(TITLES)}, ${intent.app.name} terestunna — wait cheyyi!`;
      addMsg("assistant", reply);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply, () => {
        setSpeaking(false);
        window.open(intent.app.url, "_blank");
        if (!pausedR.current) setTimeout(() => startMicRef.current?.(), 500);
      });
      return;
    }

    // ── OPEN SETTINGS
    if (intent.type === "SETTINGS") {
      const reply = `Seri ${rnd(TITLES)}, settings ki velthunna!`;
      addMsg("assistant", reply);
      setSpeaking(true);
      TTS.speak(reply, () => { setSpeaking(false); });
      setTimeout(() => setScreen("settings"), 800);
      return;
    }

    // ── CLEAR MEMORY
    if (intent.type === "CLEAR") {
      localStorage.removeItem(HIST_KEY);
      setMsgs([]);
      const reply = `Done ${rnd(TITLES)}! Memory anni clear chesanu. Fresh start ra!`;
      addMsg("assistant", reply);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply, () => {
        setSpeaking(false);
        if (!pausedR.current) setTimeout(() => startMicRef.current?.(), 500);
      });
      return;
    }

    // ── GENERAL AI — check key first
    if (!settingsR.current.apiKey || !settingsR.current.apiKey.trim()) {
      const noKeyReply = `Arey ${rnd(TITLES)}, API key add cheyyi ra! Settings ki velthunna — key paste chesthe ready!`;
      addMsg("assistant", noKeyReply);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(noKeyReply, () => { setSpeaking(false); setTimeout(() => setScreen("settings"), 800); });
      return;
    }

    setThinking(true); setStatus("Thinking ra…");
    try {
      // Build history from stable ref — always latest
      const hist = DB.getHistory().slice(-14).map(m => ({ role:m.role, content:m.content }));
      const reply = await callAI(hist, sysPrompt(appsR.current, settingsR.current.userName), settingsR.current.apiKey, settingsR.current.provider || "gemini");
      addMsg("assistant", reply);
      setThinking(false);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply, () => {
        setSpeaking(false);
        setStatus("Listening ra… bolte raho");
        if (!pausedR.current) setTimeout(() => startMicRef.current?.(), 500);
      });
    } catch (err) {
      setThinking(false);
      const isNoKey = err.message === "NO_KEY";
      const isQuota = err.message.toLowerCase().includes("quota") || err.message.toLowerCase().includes("rate") || err.message.toLowerCase().includes("429");
      const errReply = isNoKey
        ? `Arey ${rnd(TITLES)}, API key set cheyyi ra! Settings ki velthunna — key add chesthe maat laadochu.`
        : isQuota
        ? `Aiyo ${rnd(TITLES)}, API quota exceed aipoyindi ra! Gemini free tier limit hit aipoyindi. Oka minute wait cheyyi, then try cheyyi — or new key teyyi aistudio.google.com lo.`
        : `Aiyo ${rnd(TITLES)}, connection issue ra. Once more try cheyyi!`;
      addMsg("assistant", errReply);
      TTS.speak(errReply, () => {
        setSpeaking(false);
        if (!pausedR.current && !isNoKey) setTimeout(() => startMicRef.current?.(), 600);
      });
      if (isNoKey) setTimeout(() => setScreen("settings"), 1200);
      else notify(err.message, "err");
    }
  }, [addMsg, notify]);

  // Store onSpeech in ref so startMic always calls the latest version
  const onSpeechRef = useRef(onSpeech);
  onSpeechRef.current = onSpeech;

  // The mic loop — always references refs, never closes over stale state
  const startMic = useCallback(() => {
    if (!micOkR.current) return;
    if (speakingR.current || thinkingR.current) return;
    if (pausedR.current) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // Abort any existing session cleanly
    if (recRef.current) {
      try { recRef.current.abort(); } catch {}
      recRef.current = null;
    }

    const rec = new SR();
    rec.lang           = "en-IN";  // en-IN handles Telugu+English mixed speech best
    rec.continuous     = false;    // One utterance → restart: more reliable than true continuous
    rec.interimResults = true;

    rec.onstart = () => {
      setListening(true);
      setInterim("");
      setStatus("Listening ra… bolte raho");
    };

    rec.onresult = (e) => {
      let fin = "", intr = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t; else intr += t;
      }
      if (intr) setInterim(intr);
      if (fin.trim()) {
        setInterim("");
        setListening(false);
        setStatus("Processing…");
        recRef.current = null;
        onSpeechRef.current(fin.trim());
      }
    };

    rec.onerror = (e) => {
      setListening(false);
      setInterim("");
      if (e.error === "no-speech") {
        // Silence — just restart quietly
        recRef.current = null;
        if (!speakingR.current && !thinkingR.current && !pausedR.current) {
          setTimeout(() => startMicRef.current?.(), 250);
        }
        return;
      }
      if (e.error === "aborted" || e.error === "interrupted") return;
      setStatus(`Mic error: ${e.error} — tap orb to retry`);
      recRef.current = null;
    };

    rec.onend = () => {
      setListening(false);
      setInterim("");
      // If we ended without a final result and nobody stopped us, restart
      if (!speakingR.current && !thinkingR.current && !pausedR.current && recRef.current === rec) {
        recRef.current = null;
        setTimeout(() => startMicRef.current?.(), 300);
      }
      if (recRef.current === rec) recRef.current = null;
    };

    recRef.current = rec;
    try { rec.start(); } catch (ex) {
      recRef.current = null;
      setStatus("Mic start failed — tap orb to retry");
    }
  }, []); // no deps — everything via refs

  // Store in ref so onSpeech callbacks can always call latest version
  startMicRef.current = startMic;

  // ── After mic granted: greet → speak → listen
  const onMicAllow = useCallback(() => {
    setMicOk(true);
    micOkR.current = true;
    pausedR.current = false;
    setScreen("main");
    setTimeout(() => {
      const g = greeting(DB.getSettings().userName || "");
      addMsg("assistant", g);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(g, () => {
        setSpeaking(false);
        setStatus("Listening ra… bolte raho");
        startMicRef.current?.();
      });
    }, 400);
  }, [addMsg]);

  const onMicSkip = useCallback(() => {
    setMicOk(false);
    micOkR.current = false;
    pausedR.current = true;
    setScreen("main");
    setTimeout(() => {
      const g = greeting(DB.getSettings().userName || "");
      addMsg("assistant", g);
    }, 400);
  }, [addMsg]);

  // ── Text input send
  const sendText = useCallback(async () => {
    const text = input.trim();
    if (!text || thinkingR.current) return;
    setInput("");
    // Pause mic while we process typed input
    try { recRef.current?.abort(); } catch {}
    setListening(false);
    recRef.current = null;
    await onSpeechRef.current(text);
  }, [input]);

  // Interrupt speech & take over mic
  const interrupt = useCallback(() => {
    TTS.stop();
    setSpeaking(false);
    pausedR.current = false;
    setTimeout(() => startMicRef.current?.(), 300);
  }, []);

  // Toggle mic manually
  const toggleMic = useCallback(() => {
    if (listening) {
      stopMic(true);
    } else {
      pausedR.current = false;
      startMicRef.current?.();
    }
  }, [listening, stopMic]);

  // ── RENDER PERMISSION SCREEN
  if (screen === "perm") return <PermScreen onAllow={onMicAllow} onSkip={onMicSkip} />;

  // ── RENDER SETTINGS
  if (screen === "settings") return (
    <div style={S.page}>
      <TopBar title="Settings" onBack={() => setScreen("main")} />
      <div style={S.scroll}>
        <Sec label="Your Name">
          <input style={S.inp} placeholder="Mee peru cheppu — Invika use chestundi" value={settings.userName}
            onChange={e => saveSetting({ userName:e.target.value })} />
        </Sec>
        <Sec label="AI Provider & API Key ⚡">
          {/* Provider selector */}
          <div style={{display:"flex",gap:8,marginBottom:14}}>
            {[["gemini","✦ Gemini","Free!"],["openai","◎ OpenAI","Paid"]].map(([id,label,badge])=>(
              <button key={id} onClick={()=>saveSetting({provider:id,apiKey:""})}
                style={{flex:1,padding:"10px 8px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:600,
                  background:settings.provider===id?"rgba(0,229,160,0.12)":"rgba(255,255,255,0.03)",
                  border:settings.provider===id?"1.5px solid rgba(0,229,160,0.5)":"1px solid rgba(255,255,255,0.08)",
                  color:settings.provider===id?"#00e5a0":"#555"}}>
                {label}
                <span style={{display:"block",fontSize:10,fontWeight:400,marginTop:2,color:settings.provider===id?"#00c080":id==="gemini"?"#4caf50":"#888"}}>{badge}</span>
              </button>
            ))}
          </div>

          {/* Key instructions */}
          <div style={{fontSize:12,color:"#555",marginBottom:10,lineHeight:1.8,background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 12px"}}>
            {settings.provider==="gemini"
              ? <span>🆓 <b style={{color:"#aaa"}}>Gemini is FREE ra!</b><br/>aistudio.google.com → Sign in → Get API Key → Copy paste cheyyi below.</span>
              : <span>💳 <b style={{color:"#aaa"}}>OpenAI is paid ra.</b><br/>platform.openai.com → API Keys → Create key → paste cheyyi.</span>
            }
          </div>

          <input style={{...S.inp,
            background:settings.apiKey?"rgba(0,229,160,0.05)":"rgba(255,100,100,0.06)",
            border:settings.apiKey?"1px solid rgba(0,229,160,0.25)":"1px solid rgba(255,100,100,0.3)",
            fontFamily:"monospace",fontSize:12}}
            type="password"
            placeholder={settings.provider==="gemini"?"AIza... paste cheyyi ra":"sk-proj-... paste cheyyi ra"}
            value={settings.apiKey||""}
            onChange={e=>saveSetting({apiKey:e.target.value})}
          />
          <div style={{fontSize:11,marginTop:6,color:settings.apiKey?"#00e5a0":"#ff7070"}}>
            {settings.apiKey ? "✅ Key set undi ra — Invika ready!" : "⚠️ Key ledu ra — add chesthe Invika work avutundi!"}
          </div>
        </Sec>

        <Sec label="API Key Expiry Alerts">
          <p style={S.hint}>Set expiry dates ra — Invika warns you before they die.</p>
          {["gemini","openai","claude"].map(p => (
            <div key={p} style={{marginBottom:10}}>
              <label style={S.lbl}>{p === "gemini" ? "Gemini" : p === "openai" ? "OpenAI" : "Claude"} key expires on</label>
              <input style={S.inp} type="date" defaultValue={DB.getExpiry(p)||""}
                onChange={e => DB.setExpiry(p, e.target.value)} />
            </div>
          ))}
        </Sec>
        <Sec label="About Invika">
          <div style={{fontSize:13,color:"#444",lineHeight:2}}>
            <div>Invika v1.0 — Tinglish AI Assistant</div>
            <div>Voice: Female en-IN (Tinglish optimised)</div>
            <div>Always-on mic loop — Jarvis style ra</div>
          </div>
        </Sec>
        <div style={{padding:"0 20px 40px"}}>
          <button style={S.dangerBtn} onClick={() => {
            if (!confirm("Anni clear cheyyanaa? Sure?")) return;
            localStorage.clear();
            setMsgs([]); setApps(DEFAULT_APPS); saveSetting({ userName:"" });
            notify("Done ra! Fresh start!");
          }}>Clear All Memory</button>
        </div>
      </div>
    </div>
  );

  // ── RENDER APPS
  if (screen === "apps") return (
    <div style={S.page}>
      <TopBar title="Apps Registry" onBack={() => setScreen("main")} />
      <div style={S.scroll}>
        <Sec label="Registered Apps">
          {apps.map((app, i) => (
            <div key={app.id} style={S.appRow}>
              <span style={{fontSize:22,width:32,textAlign:"center"}}>{app.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:"#d0d0e0",fontWeight:600}}>{app.name}</div>
                <div style={{fontSize:11,color:"#3a3a5a",marginTop:2}}>{app.desc}</div>
              </div>
              <button style={S.rmBtn} onClick={() => { const n=apps.filter((_,j)=>j!==i); setApps(n); DB.setApps(n); }}>✕</button>
            </div>
          ))}
        </Sec>
        <Sec label="App Add Cheyyi">
          <input style={S.inp} placeholder="App Name" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})} />
          <input style={{...S.inp,marginTop:8}} placeholder="URL (https://...)" value={newApp.url} onChange={e=>setNewApp({...newApp,url:e.target.value})} />
          <input style={{...S.inp,marginTop:8}} placeholder="Voice aliases, comma separated" value={newApp.aliases} onChange={e=>setNewApp({...newApp,aliases:e.target.value})} />
          <input style={{...S.inp,marginTop:8}} placeholder="Description" value={newApp.desc} onChange={e=>setNewApp({...newApp,desc:e.target.value})} />
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            {["🔗","🏥","🎵","🎬","📺","🛒","📰","💰","🎮","🏦","🔬","📱"].map(ic => (
              <button key={ic} style={{...S.icoBtn,...(newApp.icon===ic?{border:"1px solid rgba(0,229,160,0.5)",background:"rgba(0,229,160,0.08)"}:{})}} onClick={()=>setNewApp({...newApp,icon:ic})}>{ic}</button>
            ))}
          </div>
          <button style={S.addBtn} onClick={() => {
            if (!newApp.name || !newApp.url) { notify("Name and URL ivvali ra","err"); return; }
            const a = { id:Date.now().toString(), name:newApp.name, url:newApp.url, aliases:newApp.aliases.split(",").map(x=>x.trim()).filter(Boolean), icon:newApp.icon, desc:newApp.desc };
            const n = [...apps, a]; setApps(n); DB.setApps(n);
            setNewApp({ name:"",url:"",aliases:"",icon:"🔗",desc:"" });
            notify("App add chesanu ra!");
          }}>Add App</button>
        </Sec>
      </div>
    </div>
  );

  // ── RENDER MAIN
  return (
    <div style={S.page}>

      {/* Toast */}
      {toast && <div style={{...S.toast,...(toast.type==="err"?{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.3)",color:"#ff8888"}:{background:"rgba(0,229,160,0.12)",border:"1px solid rgba(0,229,160,0.28)",color:"#00e5a0"})}}>{toast.msg}</div>}

      {/* Expiry Modal */}
      {expModal && (
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{fontSize:42,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:17,fontWeight:700,color:"#ffd166",marginBottom:10}}>
              {expModal.days === 0 ? "API Key Expire Aipoyindi ra!" : "Key Expire Avutundi Anna!"}
            </div>
            <div style={{fontSize:13,color:"#777",lineHeight:1.8}}>
              {expModal.days === 0
                ? `Aiyo ${rnd(TITLES)}, mee ${expModal.provider} API key expire aipoyindi. Update cheyyi!`
                : `${expModal.provider} key ${expModal.days} day${expModal.days===1?"":"s"} lo expire avutundi ${rnd(TITLES)}. Renew chesuko!`}
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={S.modalPrimary} onClick={()=>{setExpModal(null);setScreen("settings");}}>Settings ki Vellu</button>
              <button style={S.modalSecondary} onClick={()=>setExpModal(null)}>Okay Ra</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={() => setScreen("apps")} title="Apps">
          <GridIcon />
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <HexIcon size={24} />
          <div>
            <div style={{fontSize:19,fontWeight:900,letterSpacing:"0.1em",color:"#eeeef8",lineHeight:1.1}}>Invika</div>
            <div style={{fontSize:9,color:"#333",letterSpacing:"0.08em"}}>mee personal AI</div>
          </div>
        </div>
        <button style={S.iconBtn} onClick={() => setScreen("settings")} title="Settings">
          <GearIcon />
        </button>
      </div>

      {/* No API Key Banner */}
      {!settings.apiKey && (
        <div style={{background:"rgba(255,150,0,0.1)",borderBottom:"1px solid rgba(255,150,0,0.2)",padding:"7px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <span style={{fontSize:11,color:"#ffaa00"}}>⚡ API key ledu ra — Gemini free ga dorikutundi!</span>
          <button style={{background:"#ffaa00",border:"none",borderRadius:6,padding:"4px 11px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",flexShrink:0}}
            onClick={()=>setScreen("settings")}>Add Free Key →</button>
        </div>
      )}

      {/* Status bar */}
      <div style={S.statusBar}>
        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,transition:"background 0.3s",
          background: speaking?"#00e5a0" : listening?"#ff6b6b" : thinking?"#ffd166" : "#222"}} />
        <span style={{fontSize:12,color:"#444",flex:1,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {interim ? `"${interim}"` : status}
        </span>
        {micOk && (
          <button style={{...S.micPill,...(listening?{color:"#ff6b6b",borderColor:"rgba(255,107,107,0.3)"}:{})}}
            onClick={toggleMic} title={listening?"Pause mic":"Resume mic"}>
            {listening ? <PauseIcon /> : <MicIcon />}
            <span style={{fontSize:10,marginLeft:4}}>{listening?"Pause":"Mic"}</span>
          </button>
        )}
      </div>

      {/* ORB — the heart of Invika */}
      <div style={S.orbArea}>
        {(listening||speaking) && <div style={{...S.ring,...(listening?{borderColor:"rgba(255,107,107,0.22)"}:{})}}/>}
        {listening && <div style={{...S.ring,width:148,height:148,borderColor:"rgba(255,107,107,0.1)",animationDelay:"0.35s"}}/>}
        {speaking  && <div style={{...S.ring,width:148,height:148,borderColor:"rgba(0,229,160,0.08)",animationDelay:"0.35s"}}/>}

        <div style={{
          ...S.orb,
          ...(listening ? {border:"2px solid rgba(255,107,107,0.75)",transform:"scale(1.09)"} : {}),
          ...(speaking  ? {border:"2px solid rgba(0,198,255,0.9)",transform:"scale(1.06)"} : {}),
          ...(thinking  ? {border:"1.5px solid rgba(255,209,102,0.5)"} : {}),
        }} onClick={() => {
          if (speaking) { interrupt(); return; }
          if (!micOk)   { notify("Mic permission nahi ra — keyboard use cheyyi","err"); return; }
          toggleMic();
        }}>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {thinking  ? <Dots />   :
             speaking  ? <Wave />   :
             listening ? <Listen /> :
             <HexIcon size={42} />}
          </div>
        </div>
      </div>

      {/* Orb hint text */}
      <div style={{textAlign:"center",fontSize:11,color:"#2a2a3a",padding:"4px 0 2px",letterSpacing:"0.04em"}}>
        {listening ? "👂 Listening — bolte raho ra" :
         speaking  ? "🔊 Speaking — tap to interrupt" :
         thinking  ? "🤔 Thinking ra, wait cheyyi…"  :
         micOk     ? "Tap orb — or type below ra"    : "Keyboard use cheyyi ra"}
      </div>

      {/* Chat */}
      <div style={S.chat}>
        {msgs.length === 0 && (
          <div style={S.empty}>
            <div style={{fontSize:22,fontWeight:300,color:"#a0a0c0",marginBottom:5}}>
              Namaskaram {settings.userName || "boss"}!
            </div>
            <div style={{fontSize:12,color:"#2a2a4a",marginBottom:16}}>Speak or type — Invika ready ra.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
              {["Nuvvu evaru ra?","Open ThinkCare","Oka joke cheppu","Open HurryUp","Em cheyagalav?","Weather ela undi?"].map(s => (
                <button key={s} style={S.chip} onClick={() => onSpeechRef.current(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} style={{
            ...S.bubble,
            ...(m.role==="user"
              ? {alignSelf:"flex-end",background:"rgba(0,229,160,0.09)",border:"1px solid rgba(0,229,160,0.17)",color:"#b8edd8",borderBottomRightRadius:3}
              : {alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",color:"#c4c4dc",borderBottomLeftRadius:3})
          }}>{m.content}</div>
        ))}
        {thinking && (
          <div style={{...S.bubble,alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)"}}>
            <Dots inline />
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        {speaking && (
          <button style={S.interruptBtn} onClick={interrupt}>
            ⏹ Interrupt — nenu matladali ra
          </button>
        )}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input style={S.textInput} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendText(); } }}
            placeholder={listening ? "Listening… bolte raho" : "Type cheyyi ra…"}
            disabled={thinking}
          />
          <button style={{...S.sendBtn,opacity:input.trim()&&!thinking?1:0.35}} onClick={sendText} disabled={!input.trim()||thinking}>
            <SendIcon />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce   {0%,80%,100%{transform:scale(.4);opacity:.25}40%{transform:scale(1);opacity:1}}
        @keyframes wave     {from{transform:scaleY(.18)}to{transform:scaleY(1)}}
        @keyframes listenB  {0%,100%{transform:scaleY(.28)}50%{transform:scaleY(1)}}
        @keyframes ringOut  {0%{transform:scale(1);opacity:.28}100%{transform:scale(1.6);opacity:0}}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function TopBar({ title, onBack }) {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
      <button style={{background:"none",border:"none",color:"#00e5a0",cursor:"pointer",fontSize:14,padding:"6px 10px"}} onClick={onBack}>← Back</button>
      <span style={{fontSize:15,fontWeight:600,color:"#e0e0f0"}}>{title}</span>
      <span style={{width:60}}/>
    </div>
  );
}

function Sec({ label, children }) {
  return (
    <div style={{padding:"0 20px 22px"}}>
      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#2a2a4a",textTransform:"uppercase",marginBottom:9}}>{label}</div>
      {children}
    </div>
  );
}

function HexIcon({ size }) {
  // Invika brand logo — infinity with two glowing eyes (blue)
  return (
    <svg width={size} height={size} viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="invG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c6ff"/>
          <stop offset="50%" stopColor="#0072ff"/>
          <stop offset="100%" stopColor="#003acc"/>
        </linearGradient>
        <radialGradient id="invP" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="35%" stopColor="#7df9ff"/>
          <stop offset="100%" stopColor="#0072ff" stopOpacity="0"/>
        </radialGradient>
        <filter id="invGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Left loop */}
      <ellipse cx="65" cy="72" rx="50" ry="33" fill="none" stroke="url(#invG)" strokeWidth="15" filter="url(#invGlow)"/>
      {/* Right loop */}
      <ellipse cx="135" cy="72" rx="50" ry="33" fill="none" stroke="url(#invG)" strokeWidth="15" filter="url(#invGlow)"/>
      {/* Inner dark fills */}
      <ellipse cx="65"  cy="72" rx="37" ry="21" fill="#04080f"/>
      <ellipse cx="135" cy="72" rx="37" ry="21" fill="#04080f"/>
      {/* Left eye */}
      <circle cx="65"  cy="72" r="12" fill="url(#invP)" filter="url(#invGlow)"/>
      <circle cx="65"  cy="72" r="4.5" fill="#ffffff"/>
      {/* Right eye */}
      <circle cx="135" cy="72" r="12" fill="url(#invP)" filter="url(#invGlow)"/>
      <circle cx="135" cy="72" r="4.5" fill="#ffffff"/>
    </svg>
  );
}
function MicIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>; }
function PauseIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>; }
function SendIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>; }
function GridIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function GearIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }

function Dots({ inline }) {
  return (
    <div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"center",padding:inline?"3px 0":0}}>
      {[0,1,2].map(i => <div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#00e5a0",animation:`bounce 1.2s ${i*.18}s infinite ease-in-out`}}/>)}
    </div>
  );
}

function Wave() {
  return (
    <div style={{display:"flex",gap:3,alignItems:"center",justifyContent:"center"}}>
      {[2,4,7,10,13,10,7,4,2].map((h,i) => (
        <div key={i} style={{width:3,height:h*3.6,borderRadius:3,background:"#00e5a0",animation:`wave .48s ${i*.055}s infinite ease-in-out alternate`}}/>
      ))}
    </div>
  );
}

function Listen() {
  return (
    <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center"}}>
      {[1,2,4,5,6,5,4,2,1].map((h,i) => (
        <div key={i} style={{width:3,height:h*5,borderRadius:3,background:"#ff6b6b",opacity:.88,animation:`listenB .65s ${i*.08}s infinite ease-in-out`}}/>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page:         {display:"flex",flexDirection:"column",height:"100vh",minHeight:600,background:"#07070f",color:"#e0e0f0",fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",overflow:"hidden",position:"relative"},
  topBar:       {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  iconBtn:      {background:"none",border:"none",color:"#444",cursor:"pointer",padding:7,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36},
  statusBar:    {display:"flex",alignItems:"center",gap:8,padding:"6px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)"},
  micPill:      {display:"flex",alignItems:"center",background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"3px 8px",color:"#444",cursor:"pointer",fontSize:11,gap:2},
  orbArea:      {display:"flex",alignItems:"center",justifyContent:"center",padding:"18px 0 4px",position:"relative",minHeight:130},
  orb:          {width:98,height:98,borderRadius:"50%",background:"radial-gradient(circle at 38% 32%,#0d2218,#050810)",border:"1.5px solid rgba(0,229,160,0.17)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.28s ease",cursor:"pointer",position:"relative",zIndex:2},
  ring:         {position:"absolute",width:126,height:126,borderRadius:"50%",border:"1px solid rgba(0,229,160,0.2)",animation:"ringOut 2s infinite ease-out",zIndex:1,animationFillMode:"both"},
  chat:         {flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:9,scrollbarWidth:"thin",scrollbarColor:"#12122a transparent"},
  empty:        {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,textAlign:"center",paddingTop:10},
  bubble:       {maxWidth:"82%",padding:"9px 13px",borderRadius:15,fontSize:14,lineHeight:1.68,wordBreak:"break-word",whiteSpace:"pre-wrap"},
  chip:         {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"5px 12px",fontSize:12,color:"#555",cursor:"pointer"},
  inputArea:    {padding:"9px 14px 13px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  interruptBtn: {width:"100%",marginBottom:7,background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.2)",color:"#ff7070",borderRadius:9,padding:"7px",fontSize:12,cursor:"pointer"},
  textInput:    {flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:"10px 15px",color:"#e0e0f0",fontSize:14,outline:"none"},
  sendBtn:      {width:42,height:42,borderRadius:"50%",background:"#00e5a0",border:"none",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"opacity 0.2s"},
  toast:        {position:"absolute",top:54,left:"50%",transform:"translateX(-50%)",borderRadius:9,padding:"7px 15px",fontSize:12,zIndex:200,whiteSpace:"nowrap",maxWidth:"90%"},
  overlay:      {position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20},
  modal:        {background:"#0d0d1c",border:"1px solid rgba(255,200,0,0.18)",borderRadius:18,padding:"28px 22px",maxWidth:330,width:"100%",textAlign:"center"},
  modalPrimary: {flex:1,background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.28)",color:"#ffd166",borderRadius:9,padding:"10px 12px",fontSize:13,cursor:"pointer"},
  modalSecondary:{flex:1,background:"none",border:"1px solid rgba(255,255,255,0.07)",color:"#555",borderRadius:9,padding:"10px 12px",fontSize:13,cursor:"pointer"},
  scroll:       {flex:1,overflowY:"auto",paddingTop:18},
  inp:          {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"10px 13px",color:"#e0e0f0",fontSize:14,outline:"none",boxSizing:"border-box"},
  lbl:          {display:"block",fontSize:12,color:"#555",marginBottom:5},
  hint:         {fontSize:12,color:"#333",margin:"0 0 10px",lineHeight:1.7},
  dangerBtn:    {width:"100%",background:"rgba(255,50,50,0.07)",border:"1px solid rgba(255,50,50,0.17)",color:"#ff6060",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer"},
  appRow:       {display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  rmBtn:        {background:"none",border:"none",color:"#2a2a3a",cursor:"pointer",fontSize:14,padding:"4px 8px"},
  addBtn:       {width:"100%",marginTop:12,background:"rgba(0,229,160,0.07)",border:"1px solid rgba(0,229,160,0.22)",color:"#00e5a0",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer",fontWeight:600},
  icoBtn:       {background:"rgba(255,255,255,0.03)",border:"1px solid transparent",borderRadius:7,padding:"5px 7px",fontSize:17,cursor:"pointer"},
};
