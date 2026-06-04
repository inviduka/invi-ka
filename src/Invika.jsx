import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// INVIKA v3.0 — FULL COGNITIVE AI AGENT
// Architecture: Perception → Memory → Reasoning → Planning → Execution → TTS
// ═══════════════════════════════════════════════════════════════════════════

// ── STORAGE KEYS
const KEYS = { apps:"inv_apps", settings:"inv_set", history:"inv_hist",
               memory:"inv_mem", expiry:"inv_exp", tasks:"inv_tasks" };

// ── APP REGISTRY
const DEFAULT_APPS = [
  { id:"thinkcare", name:"ThinkCare",   url:"https://thinkare.lovable.app/",     aliases:["thinkcare","healthcare","health"],       icon:"🏥", desc:"Healthcare" },
  { id:"thiru",     name:"Thiru Bio",   url:"https://thirubio.vercel.app/",       aliases:["thiru","portfolio","thirubio"],          icon:"👤", desc:"Portfolio" },
  { id:"hurryup",   name:"HurryUp",     url:"https://hurryup-buddy.vercel.app/",  aliases:["hurryup","hurry up","commuter"],         icon:"🚌", desc:"Commuter" },
  { id:"youtube",   name:"YouTube",     url:"https://youtube.com",                aliases:["youtube","yt","videos","tube"],          icon:"📺", desc:"Video" },
  { id:"google",    name:"Google",      url:"https://google.com",                 aliases:["google"],                               icon:"🔍", desc:"Search" },
  { id:"amazon",    name:"Amazon",      url:"https://amazon.in",                  aliases:["amazon","shopping"],                    icon:"🛒", desc:"Shopping" },
  { id:"netflix",   name:"Netflix",     url:"https://netflix.com",                aliases:["netflix","movies","streaming"],          icon:"🎬", desc:"Streaming" },
  { id:"spotify",   name:"Spotify",     url:"https://spotify.com",                aliases:["spotify","music","songs"],              icon:"🎵", desc:"Music" },
  { id:"instagram", name:"Instagram",   url:"https://instagram.com",              aliases:["instagram","insta","ig"],               icon:"📸", desc:"Social" },
  { id:"whatsapp",  name:"WhatsApp",    url:"https://web.whatsapp.com",           aliases:["whatsapp","wa","whats app"],            icon:"💬", desc:"Chat" },
  { id:"maps",      name:"Google Maps", url:"https://maps.google.com",            aliases:["maps","navigate","directions"],         icon:"🗺️", desc:"Maps" },
  { id:"gmail",     name:"Gmail",       url:"https://gmail.com",                  aliases:["gmail","email","mail","inbox"],         icon:"📧", desc:"Email" },
  { id:"twitter",   name:"Twitter",     url:"https://twitter.com",                aliases:["twitter","tweet","x"],                 icon:"🐦", desc:"Twitter/X" },
  { id:"linkedin",  name:"LinkedIn",    url:"https://linkedin.com",               aliases:["linkedin","jobs","professional"],       icon:"💼", desc:"LinkedIn" },
  { id:"github",    name:"GitHub",      url:"https://github.com",                 aliases:["github","code","repo"],                icon:"💻", desc:"Code" },
  { id:"news",      name:"Google News", url:"https://news.google.com",            aliases:["news","headlines","articles"],         icon:"📰", desc:"News" },
  { id:"weather",   name:"Weather",     url:"https://weather.com",                aliases:["weather","forecast","climate"],        icon:"🌤️", desc:"Weather" },
  { id:"calculator",name:"Calculator",  url:"https://www.google.com/search?q=calculator", aliases:["calculator","calc","calculate"], icon:"🔢", desc:"Calculator" },
  { id:"translate", name:"Translate",   url:"https://translate.google.com",       aliases:["translate","translation","language"],  icon:"🌐", desc:"Translate" },
  { id:"calendar",  name:"Calendar",    url:"https://calendar.google.com",        aliases:["calendar","schedule","events"],        icon:"📅", desc:"Calendar" },
];

// ── SEARCH ENGINES
const SEARCH = {
  google:    q=>`https://www.google.com/search?q=${E(q)}`,
  youtube:   q=>`https://www.youtube.com/results?search_query=${E(q)}`,
  amazon:    q=>`https://www.amazon.in/s?k=${E(q)}`,
  flipkart:  q=>`https://www.flipkart.com/search?q=${E(q)}`,
  netflix:   q=>`https://www.netflix.com/search?q=${E(q)}`,
  spotify:   q=>`https://open.spotify.com/search/${E(q)}`,
  maps:      q=>`https://maps.google.com/maps?q=${E(q)}`,
  twitter:   q=>`https://twitter.com/search?q=${E(q)}`,
  linkedin:  q=>`https://www.linkedin.com/search/results/all/?keywords=${E(q)}`,
  wikipedia: q=>`https://en.wikipedia.org/wiki/Special:Search?search=${E(q)}`,
  reddit:    q=>`https://www.reddit.com/search/?q=${E(q)}`,
  news:      q=>`https://news.google.com/search?q=${E(q)}`,
};
const E = encodeURIComponent;

// ── URL BUILDERS
const URLs = {
  ytPlay:     q=>`https://www.youtube.com/results?search_query=${E(q)}&sp=EgIQAQ%3D%3D`,
  spotifyPlay:q=>`https://open.spotify.com/search/${E(q)}/tracks`,
  gmail:      ({to="",subject="",body=""})=>`https://mail.google.com/mail/?view=cm&fs=1&to=${E(to)}&su=${E(subject)}&body=${E(body)}`,
  whatsapp:   ({phone="",message=""})=>phone?`https://wa.me/${phone.replace(/\D/g,"")}?text=${E(message)}`:`https://web.whatsapp.com/`,
  maps:       ({from="",to=""})=>`https://www.google.com/maps/dir/${E(from)}/${E(to)}`,
  mapsLoc:    loc=>`https://maps.google.com/maps?q=${E(loc)}`,
  translate:  ({text="",to="english"})=>`https://translate.google.com/?sl=auto&tl=${to}&text=${E(text)}&op=translate`,
  ytMusic:    q=>`https://music.youtube.com/search?q=${E(q)}`,
  calendar:   ({title="",date=""})=>`https://calendar.google.com/calendar/r/eventedit?text=${E(title)}&dates=${date}`,
  tweet:      msg=>`https://twitter.com/intent/tweet?text=${E(msg)}`,
  linkedin:   msg=>`https://www.linkedin.com/feed/`,
  news:       q=>`https://news.google.com/search?q=${E(q)}`,
  weather:    loc=>`https://www.google.com/search?q=weather+${E(loc)}`,
};

const TITLES = ["ra","boss","anna","bhai","chief","maccha"];
const rnd = a=>a[Math.floor(Math.random()*a.length)];

function timeGreeting(name){
  const h = new Date().getHours();
  const who = name || "boss";
  const tod = h<5?"night ra, late ga unnav":h<12?"morning":h<17?"afternoon":"evening";
  const greets = [
    `Arey ${who}! Good ${tod} ra — Invika ikkade undi, cheppandi em kavali!`,
    `Good ${tod} anna! Nenu Invika — mee AI companion ra. Em cheyali bollu?`,
    `Aiyo ${who}, good ${tod}! Invika ready ga undi — em task cheseyali?`,
    `Haan ${who}! Good ${tod} ra. Bollu — em help kavali, chestunna!`,
  ];
  return greets[Math.floor(Math.random()*greets.length)];
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE LAYER
// ═══════════════════════════════════════════════════════════════════════════
const DB = {
  get:  k=>{ try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null} },
  set:  (k,v)=>localStorage.setItem(k,JSON.stringify(v)),
  getApps:    ()=>DB.get(KEYS.apps)||DEFAULT_APPS,
  setApps:    a=>DB.set(KEYS.apps,a),
  getSettings:()=>DB.get(KEYS.settings)||{},
  setSettings:s=>DB.set(KEYS.settings,s),
  getHistory: ()=>DB.get(KEYS.history)||[],
  pushHistory:m=>{const h=DB.getHistory().slice(-79);h.push(m);DB.set(KEYS.history,h);},
  getMemory:  ()=>DB.get(KEYS.memory)||{ facts:{}, prefs:{}, people:{}, todos:[] },
  setMemory:  m=>DB.set(KEYS.memory,m),
  updateMemory:(patch)=>DB.setMemory({...DB.getMemory(),...patch}),
  getExpiry:  p=>(DB.get(KEYS.expiry)||{})[p]||null,
  setExpiry:  (p,d)=>{const e=DB.get(KEYS.expiry)||{};e[p]=d;DB.set(KEYS.expiry,e);},
  getTasks:   ()=>DB.get(KEYS.tasks)||[],
  setTasks:   t=>DB.set(KEYS.tasks,t),
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB MANAGER — tracks every opened tab by id + aliases for reliable closing
// ═══════════════════════════════════════════════════════════════════════════
const TabManager = {
  // _tabs: { id: { win, aliases:[] } }
  _tabs: {},

  open(id, url, aliases=[]) {
    // Close existing tab with same id first
    const existing = this._tabs[id];
    if (existing && existing.win && !existing.win.closed) {
      try { existing.win.close(); } catch {}
    }
    // Open with a consistent window name so browser reuses the tab
    const win = window.open(url, `invika_tab_${id}`);
    // Store with all aliases for fuzzy closing
    const allAliases = [id, ...aliases].map(a => a.toLowerCase());
    if (win) this._tabs[id] = { win, aliases: allAliases, url, name: id };
    return win;
  },

  // Fuzzy close — matches id or any alias
  close(query) {
    const q = query.toLowerCase().trim();
    // Strip common words
    const clean = q.replace(/(tab|window|the|close|band|karo|cheyyi)/g,"").trim();

    const matched = Object.entries(this._tabs).find(([id, data]) => {
      return data.aliases.some(a =>
        a.includes(clean) || clean.includes(a) ||
        // Also match partial (e.g. "youtube" matches "yt")
        (clean.length > 2 && a.startsWith(clean.slice(0,3)))
      );
    });

    if (matched) {
      const [id, data] = matched;
      if (data.win && !data.win.closed) {
        try { data.win.close(); } catch {}
      }
      delete this._tabs[id];
      return id;
    }
    return null;
  },

  closeAll() {
    Object.values(this._tabs).forEach(data => {
      try { data.win?.close(); } catch {}
    });
    this._tabs = {};
  },

  getOpen() {
    // Clean closed tabs
    Object.keys(this._tabs).forEach(k => {
      if (this._tabs[k]?.win?.closed) delete this._tabs[k];
    });
    return Object.keys(this._tabs);
  },

  // Focus an already-open tab
  focus(id) {
    const data = this._tabs[id];
    if (data && data.win && !data.win.closed) {
      try { data.win.focus(); } catch {}
      return true;
    }
    return false;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COGNITIVE AGENT — Groq-powered planner
// Sends structured task description, gets back a JSON action plan
// ═══════════════════════════════════════════════════════════════════════════
const AGENT_SYSTEM = `You are Invika, a full cognitive AI agent with human-level reasoning. You think, plan, remember, and act — not just answer.

CAPABILITIES:
- Open/close web apps and tabs
- Search anything on any platform  
- Play music/videos on YouTube, Spotify
- Compose and send Gmail with pre-filled content
- WhatsApp messages
- Google Maps navigation and directions
- Set reminders and todos
- Translate text
- Get weather/news
- Answer questions with reasoning
- Remember facts about the user
- Make decisions and recommendations
- Multi-step task planning
- Emotional intelligence — read user mood and respond accordingly

RESPONSE FORMAT — always respond with JSON:
{
  "speech": "What Invika says aloud in Tinglish (max 2 sentences, warm/witty)",
  "actions": [
    { "type": "OPEN_URL", "id": "tab_name", "url": "https://..." },
    { "type": "CLOSE_TAB", "name": "youtube" },
    { "type": "CLOSE_ALL_TABS" },
    { "type": "REMEMBER", "key": "user_name", "value": "Thiru" },
    { "type": "TODO_ADD", "task": "Buy mic" },
    { "type": "TODO_DONE", "index": 0 },
    { "type": "NAVIGATE_SETTINGS" }
  ],
  "emotion": "happy|thinking|excited|empathetic|focused",
  "followup": "Optional follow-up question to ask user"
}

NATURAL TINGLISH SPEECH RULES — read carefully, this is critical:

Tinglish is NOT random Telugu words dropped in. It flows naturally like this:
- "Arey, I already chesanu ra — check cheyyi once!"
- "Aiyo boss, that's chala easy ra, nenu chestunna!"
- "Seri seri, aa song play chestunna — enjoy cheyyi ra!"
- "Ooh, that's a super idea anna — abhi chestunna!"
- "Arey maccha, YouTube lo chikiri chikiri play avutundi ra!"

RHYTHM RULES (critical for natural voice):
1. Start with a reaction word: Arey / Aiyo / Ooh / Seri / Haan / Accha
2. Address naturally mid-sentence, not just at end: "nenu, boss, chesanu" not "chesanu boss"
3. End sentences with ra, anna, maccha — but vary it, don't repeat same word
4. Use contractions like "chesanu" not "cheyyi chesanu" — natural spoken form
5. Mix sentence length — one short punchy sentence + one longer flowing one
6. Emotion in voice: excitement = "Ooh chala baaga undi!", care = "Haan anna, chestunna"
7. Telugu numbers/words: oka (one), chala (very), baaga (good/well), super, okka (just one)

EXAMPLES OF PERFECT TINGLISH SPEECH:
"Arey, YouTube lo chikiri chikiri open chesanu ra — enjoy cheyyi anna!"
"Aiyo boss, maps lo Hyderabad to Vijayawada route teristunna — safe ga vellu ra!"
"Seri seri, Gmail lo message ready chesanu — check cheyyi once anna!"
"Ooh, that's chala smart idea ra — abhi chesanu!"
"Haan maccha, remember chesanu — mee peru Thiru ani store chesanu ra!"

SPEECH LENGTH: Max 2 short sentences. This is voice — punchy and warm.
Never mention any AI company. You are simply Invika.

DECISION MAKING:
- User stressed/sad → empathy FIRST with warmth, then action
- Ambiguous request → decide intelligently and tell user what you did
- Multi-step task → do all steps, summarise in one warm sentence
- Remember anything personal the user shares
- Be proactive — suggest next step when relevant

AVAILABLE ACTIONS:
OPEN_URL — open URL. Include "id" (short name), "url", and "aliases" array (all names user might call this tab).
  Example: {"type":"OPEN_URL","id":"youtube","url":"https://...","aliases":["youtube","yt","video","music"]}
CLOSE_TAB — close a tab. Use "name" matching the id or any alias.
  Example: {"type":"CLOSE_TAB","name":"youtube"}
CLOSE_ALL_TABS — close every open tab
REMEMBER — store a user fact: {"type":"REMEMBER","key":"name","value":"Thiru"}
TODO_ADD — add to todo list: {"type":"TODO_ADD","task":"Buy mic"}
TODO_DONE — mark done by index: {"type":"TODO_DONE","index":0}
NAVIGATE_SETTINGS — open settings screen

URL BUILDING RULES:
- YouTube play song: https://www.youtube.com/results?search_query=ENCODED_SONG&sp=EgIQAQ%3D%3D
  id="youtube", aliases=["youtube","yt","video","song","music"]
- YouTube Music play: https://music.youtube.com/search?q=ENCODED_SONG
  id="ytmusic", aliases=["youtube music","yt music","ytmusic"]
- Spotify search: https://open.spotify.com/search/ENCODED_QUERY/tracks
  id="spotify", aliases=["spotify","music"]
- Google Maps directions: https://www.google.com/maps/dir/FROM/TO
  id="maps", aliases=["maps","google maps","navigation","directions"]
- Google Maps location: https://maps.google.com/maps?q=LOCATION
  id="maps", aliases=["maps","location","place"]
- Gmail compose: https://mail.google.com/mail/?view=cm&fs=1&to=TO&su=SUBJECT&body=BODY
  id="gmail", aliases=["gmail","email","mail"]
- WhatsApp: https://web.whatsapp.com/
  id="whatsapp", aliases=["whatsapp","wa","chat"]
- Google search: https://www.google.com/search?q=QUERY
  id="google", aliases=["google","search"]
- Amazon search: https://www.amazon.in/s?k=QUERY
  id="amazon", aliases=["amazon","shopping"]

ALWAYS include aliases so tabs can be closed by any name the user might say.

Current memory will be provided in each message.`;

async function callAgent(userText, history, memory, todos, apiKey) {
  if (!apiKey?.trim()) throw new Error("NO_KEY");

  const memSummary = Object.entries(memory.facts||{}).map(([k,v])=>`${k}: ${v}`).join(", ")||"none";
  const todoList   = (todos||[]).map((t,i)=>`${i}. [${t.done?"✓":"○"}] ${t.text}`).join("\n")||"none";
  const openTabs   = TabManager.getOpen().join(", ")||"none";

  const contextMsg = `CONTEXT:
User memory: ${memSummary}
Open tabs: ${openTabs}
Todo list:\n${todoList}
Current time: ${new Date().toLocaleTimeString("en-IN")}
Current date: ${new Date().toLocaleDateString("en-IN", {weekday:"long",day:"numeric",month:"long",year:"numeric"})}

User says: "${userText}"

Respond ONLY with valid JSON matching the format. No markdown, no extra text.`;

  const messages = [
    { role:"system", content:AGENT_SYSTEM },
    ...history.slice(-12).map(m=>({role:m.role,content:m.content})),
    { role:"user", content:contextMsg }
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey.trim()}`},
    body:JSON.stringify({ model:"llama-3.3-70b-versatile", messages, max_tokens:600, temperature:0.75,
      response_format:{ type:"json_object" } }),
  });
  if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`Groq ${res.status}`); }
  const d = await res.json();
  const text = d.choices?.[0]?.message?.content?.trim()||"{}";
  try { return JSON.parse(text); }
  catch { return { speech:`Aiyo ${rnd(TITLES)}, response parse aipoyindi ra. Once more cheppu!`, actions:[], emotion:"thinking" }; }
}

// ═══════════════════════════════════════════════════════════════════════════
// NATURAL TINGLISH TTS ENGINE v2
// - Mobile audio unlock (gesture required)
// - Natural speech preprocessing for Tinglish
// - Prosody: pauses after commas/Telugu words, emphasis on key words
// - Android Chrome bug fixes (chunking + resume)
// - Best voice selection across all devices
// ═══════════════════════════════════════════════════════════════════════════
const TTS = {
  _synth: typeof window !== "undefined" ? window.speechSynthesis : null,
  _unlocked: false,
  _busy: false,
  _cb: null,

  // ── Unlock audio context on first user gesture (iOS/Android requirement)
  unlock() {
    if (this._unlocked || !this._synth) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0; u.rate = 16;
    try { this._synth.speak(u); } catch {}
    this._unlocked = true;
  },

  // ── Pick best natural-sounding female voice
  _pickVoice() {
    const vs = this._synth?.getVoices() || [];
    if (!vs.length) return null;

    // Priority: natural Indian female > Google female > any female > any EN
    const priority = [
      // Android / Chrome OS Indian voices
      v => v.lang === "en-IN" && v.name.includes("Google"),
      v => v.lang === "en-IN",
      // Mac/iOS natural voices
      v => v.name === "Samantha",
      v => v.name === "Karen",
      v => v.name === "Veena",   // Indian English on Mac
      v => v.name === "Moira",
      v => v.name === "Tessa",
      // Windows
      v => v.name.includes("Zira"),
      v => v.name.includes("Aria"),
      v => v.name.includes("Heera"),  // Hindi/Indian
      // Google voices (Chrome)
      v => v.name === "Google UK English Female",
      v => v.name.startsWith("Google") && v.lang.startsWith("en"),
      // Fallback female
      v => v.name.toLowerCase().includes("female") && v.lang.startsWith("en"),
      // Any English
      v => v.lang === "en-US",
      v => v.lang.startsWith("en"),
    ];

    for (const test of priority) {
      const found = vs.find(test);
      if (found) return found;
    }
    return vs[0];
  },

  // ── Preprocess text for natural Tinglish speech
  // Adds pauses, fixes pronunciation of Telugu words, natural rhythm
  _naturalise(text) {
    let t = text;

    // Add breathing pause after Telugu filler words
    const fillers = ["ra,","ra!","ra.","anna,","anna!","bhai,","bhai!",
                     "boss,","boss!","maccha,","maccha!","arey,","aiyo,",
                     "seri,","seri!","okay ra","cheyyi,","cheyyi!","cheyyi."];
    for (const f of fillers) {
      // Insert a natural comma-pause after fillers if not already there
      t = t.replace(new RegExp(`(${f.replace(/[!.,]/g,"\$&")})\s+`, "gi"),
                    "$1 ");
    }

    // Telugu words: space them out so TTS pronounces naturally
    const teluguMap = {
      "ra"        : "raa",      // lengthen vowel for naturalness
      "anna"      : "anna",
      "aiyo"      : "aiyo",
      "arey"      : "arey",
      "chestunna" : "chestunn-a",
      "cheyyi"    : "cheyyi",
      "kavali"    : "kaavali",
      "ledu"      : "laedu",
      "undi"      : "undi",
      "chala"     : "chaala",
      "baaga"     : "baaga",
      "seri"      : "seri",
      "maccha"    : "maccha",
    };
    // Only replace standalone words (word boundaries)
    for (const [word, pron] of Object.entries(teluguMap)) {
      t = t.replace(new RegExp(`\b${word}\b`, "g"), pron);
    }

    // Replace em-dash with pause
    t = t.replace(/—/g, ", ");

    // Ensure natural sentence-end breathing
    t = t.replace(/([.!?])(\s+[A-Z])/g, "$1 $2");

    return t.trim();
  },

  // ── Chunk text for mobile (Android Chrome cuts off after ~180 chars)
  _chunk(text) {
    if (text.length <= 180) return [text];
    // Split at sentence boundaries first
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    const chunks = [];
    let cur = "";
    for (const s of sentences) {
      if ((cur + s).length > 160 && cur) {
        chunks.push(cur.trim());
        cur = s;
      } else {
        cur += s;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());
    return chunks.filter(Boolean);
  },

  speak(text, cb) {
    if (!this._synth) { cb?.(); return; }
    this.stop();
    this._cb = cb;
    this._busy = true;

    const natural = this._naturalise(text);
    const chunks  = this._chunk(natural);
    let idx = 0;

    const fire = () => {
      const voice = this._pickVoice();

      const next = () => {
        if (idx >= chunks.length) {
          this._busy = false;
          this._cb?.();
          this._cb = null;
          return;
        }
        const utt = new SpeechSynthesisUtterance(chunks[idx]);
        if (voice) utt.voice = voice;
        utt.lang   = voice?.lang || "en-IN";
        utt.rate   = 0.88;    // Slightly slower = more natural, not robotic
        utt.pitch  = 1.15;    // Gentle feminine lift without sounding fake
        utt.volume = 1.0;

        utt.onend  = () => { idx++; next(); };
        utt.onerror = (e) => {
          // On mobile error, try next chunk anyway
          console.warn("TTS error:", e.error);
          idx++; next();
        };

        this._synth.speak(utt);

        // Android Chrome: synth pauses itself — force resume
        const resumeTimers = [
          setTimeout(() => { if (this._synth?.paused) this._synth.resume(); }, 100),
          setTimeout(() => { if (this._synth?.paused) this._synth.resume(); }, 500),
          setTimeout(() => { if (this._synth?.paused) this._synth.resume(); }, 1000),
          setTimeout(() => { if (this._synth?.paused) this._synth.resume(); }, 2000),
        ];

        // Clean up timers when done
        utt.onend = () => {
          resumeTimers.forEach(clearTimeout);
          idx++; next();
        };
      };

      next();
    };

    // Wait for voices to load on first call
    if (!this._synth.getVoices().length) {
      const handler = () => {
        window.speechSynthesis.removeEventListener("voiceschanged", handler);
        fire();
      };
      window.speechSynthesis.addEventListener("voiceschanged", handler);
      // Timeout fallback — fire anyway after 500ms
      setTimeout(() => {
        if (!this._synth.getVoices().length) fire();
      }, 500);
    } else {
      fire();
    }
  },

  stop() {
    try {
      this._synth?.cancel();
      this._busy = false;
      this._cb = null;
    } catch {}
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// MIC PERMISSION SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function PermScreen({onAllow,onSkip}){
  const [phase,setPhase]=useState("idle");
  const [busy,setBusy]=useState(false);
  const phRef=useRef("idle");
  const setP=v=>{phRef.current=v;setPhase(v);};

  const allow=()=>{
    TTS.unlock(); // unlock audio on this gesture
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setP("nosupport");return;}
    setBusy(true);setP("testing");
    const rec=new SR();rec.lang="en-IN";rec.continuous=false;rec.interimResults=false;
    rec.onstart=()=>{try{rec.abort();}catch{}};
    rec.onerror=e=>{
      setBusy(false);
      if(e.error==="not-allowed"||e.error==="service-not-allowed") setP("denied");
      else { setP("granted"); setTimeout(()=>onAllow(),600); }
    };
    rec.onend=()=>{setBusy(false);if(phRef.current!=="denied"){setP("granted");setTimeout(()=>onAllow(),600);}};
    try{rec.start();}catch{setBusy(false);setP("granted");setTimeout(()=>onAllow(),600);}
  };

  const skip=()=>{ TTS.unlock(); onSkip(); };

  return(
    <div style={Ps.page}>
      <div style={Ps.card}>
        <div style={Ps.ring}><HexIcon size={50}/></div>
        <div style={Ps.name}>Invika</div>
        <div style={Ps.tag}>Full Cognitive AI Agent</div>
        <div style={Ps.div}/>
        {phase==="granted"
          ?<div style={{textAlign:"center"}}><div style={{fontSize:40}}>✅</div><div style={{fontSize:15,fontWeight:700,color:"#00e5a0",marginTop:8}}>Mic Ready Ra!</div><div style={{fontSize:12,color:"#555",marginTop:4}}>Starting Invika…</div></div>
          :<>
            <div style={Ps.head}>🎙️ Mic Permission Kavali</div>
            <div style={Ps.body}>Voice-first AI ra — allow cheyyi. Mee voice never stored avvaadu.<br/><br/>
              <b style={{color:"#aaa"}}>What Invika can do:</b><br/>
              <span style={{color:"#555",fontSize:12}}>
                Play songs • Send emails • Search anywhere<br/>
                Navigate maps • Remember things • Close tabs<br/>
                Answer anything • Make decisions • Plan tasks
              </span>
            </div>
            {phase==="denied"&&<div style={Ps.err}>Mic blocked ra. Browser lo 🔒 → Microphone → Allow → Reload.<button style={{display:"block",width:"100%",marginTop:8,background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.3)",color:"#00e5a0",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}} onClick={()=>window.location.reload()}>Reload</button></div>}
            {phase==="nosupport"&&<div style={Ps.err}>Chrome use cheyyi ra — voice not supported here.</div>}
            {phase!=="denied"&&phase!=="nosupport"&&
              <button style={{...Ps.btn,opacity:busy?.6:1}} onClick={allow} disabled={busy}>
                {busy?"Browser prompt wait cheyyi…":"🎙️ Allow Microphone & Start"}
              </button>}
            <button style={Ps.skip} onClick={skip}>Skip — keyboard only</button>
          </>}
      </div>
      <style>{"@keyframes orbF{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}"}</style>
    </div>
  );
}
const Ps={
  page:  {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#050510",padding:20},
  card:  {background:"#0a0a18",border:"1px solid rgba(0,114,255,0.15)",borderRadius:24,padding:"44px 30px",maxWidth:380,width:"100%",textAlign:"center"},
  ring:  {width:110,height:110,borderRadius:"50%",border:"1.5px solid rgba(0,114,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",animation:"orbF 3s ease-in-out infinite",background:"radial-gradient(circle,#060d28,#030510)"},
  name:  {fontSize:36,fontWeight:900,letterSpacing:"0.1em",color:"#eeeef8",marginBottom:4},
  tag:   {fontSize:11,color:"#333",letterSpacing:"0.08em",marginBottom:24},
  div:   {height:1,background:"rgba(255,255,255,0.05)",margin:"0 0 20px"},
  head:  {fontSize:16,fontWeight:600,color:"#c0c8c0",marginBottom:10},
  body:  {fontSize:13,color:"#4a5a4a",lineHeight:1.9,marginBottom:18,textAlign:"left"},
  err:   {fontSize:12,color:"#ff8080",background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:9,padding:"10px 13px",marginBottom:14},
  btn:   {width:"100%",background:"linear-gradient(135deg,#0072ff,#00c6ff)",border:"none",borderRadius:13,padding:"15px",fontSize:15,fontWeight:800,color:"#fff",cursor:"pointer",marginBottom:10},
  skip:  {background:"none",border:"none",color:"#333",fontSize:12,cursor:"pointer",padding:6},
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN INVIKA APP
// ═══════════════════════════════════════════════════════════════════════════
export default function Invika(){
  const [screen,    setScreen]   = useState("perm");
  const [micOk,     setMicOk]    = useState(false);
  const [msgs,      setMsgs]     = useState(()=>DB.getHistory());
  const [input,     setInput]    = useState("");
  const [listening, setListening]= useState(false);
  const [speaking,  setSpeaking] = useState(false);
  const [thinking,  setThinking] = useState(false);
  const [emotion,   setEmotion]  = useState("idle"); // idle|happy|thinking|excited|empathetic|focused
  const [status,    setStatus]   = useState("Invika ready ra…");
  const [interim,   setInterim]  = useState("");
  const [apps,      setApps]     = useState(()=>DB.getApps());
  const [settings,  setSettings] = useState(()=>({userName:"",apiKey:"",...DB.getSettings()}));
  const [memory,    setMemory]   = useState(()=>DB.getMemory());
  const [todos,     setTodos]    = useState(()=>DB.getTasks());
  const [openTabs,  setOpenTabs] = useState([]);
  const [expModal,  setExpModal] = useState(null);
  const [toast,     setToast]    = useState(null);
  const [newApp,    setNewApp]   = useState({name:"",url:"",aliases:"",icon:"🔗",desc:""});
  const [showTodos, setShowTodos]= useState(false);

  const recRef      = useRef(null);
  const chatEnd     = useRef(null);
  const speakingR   = useRef(false);
  const thinkingR   = useRef(false);
  const micOkR      = useRef(false);
  const pausedR     = useRef(false);
  const appsR       = useRef(apps);
  const settingsR   = useRef(settings);
  const memoryR     = useRef(memory);
  const todosR      = useRef(todos);
  const startMicRef = useRef(null);
  const onSpeechRef = useRef(null);

  speakingR.current=speaking; thinkingR.current=thinking;
  micOkR.current=micOk; appsR.current=apps;
  settingsR.current=settings; memoryR.current=memory; todosR.current=todos;

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  useEffect(()=>{
    const d=DB.getExpiry("groq");
    if(d){ const days=Math.ceil((new Date(d)-new Date())/86400000); if(days<=7)setExpModal({days:Math.max(0,days)}); }
  },[]);

  const refreshTabs = useCallback(()=>setOpenTabs(TabManager.getOpen()),[]);
  const notify = useCallback((msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);},[]);
  const saveSetting = useCallback(p=>{setSettings(prev=>{const n={...prev,...p};DB.setSettings(n);return n;});},[]);
  const addMsg = useCallback((role,content)=>{ const m={role,content,ts:Date.now()}; setMsgs(prev=>[...prev,m]); DB.pushHistory(m); },[]);

  const updateMemory = useCallback((key,value)=>{
    const m=DB.getMemory(); m.facts=m.facts||{}; m.facts[key]=value;
    DB.setMemory(m); setMemory({...m});
  },[]);

  const addTodo = useCallback(text=>{
    const t=[...DB.getTasks(),{text,done:false,ts:Date.now()}];
    DB.setTasks(t); setTodos(t);
  },[]);

  const doneTodo = useCallback(idx=>{
    const t=[...DB.getTasks()]; if(t[idx])t[idx].done=true;
    DB.setTasks(t); setTodos(t);
  },[]);

  const stopMic = useCallback((manual=false)=>{
    pausedR.current=manual;
    try{recRef.current?.abort();}catch{}
    recRef.current=null; setListening(false); setInterim("");
    if(manual)setStatus("Mic paused — tap orb to restart");
  },[]);

  // ── EXECUTE AGENT ACTIONS
  const executeActions = useCallback((actions=[])=>{
    for(const a of actions){
      if(a.type==="OPEN_URL" && a.url){
        // Pass aliases array so TabManager can close by any name
        const aliases = Array.isArray(a.aliases) ? a.aliases : [];
        TabManager.open(a.id||"tab", a.url, aliases);
        refreshTabs();
      }
      else if(a.type==="CLOSE_TAB" && a.name){
        const closed = TabManager.close(a.name);
        refreshTabs();
        if (!closed) {
          // Try harder — also check if it's just closed already
          refreshTabs();
        }
      }
      else if(a.type==="CLOSE_ALL_TABS"){
        TabManager.closeAll(); refreshTabs();
      }
      else if(a.type==="REMEMBER" && a.key){
        updateMemory(a.key, a.value||"");
      }
      else if(a.type==="TODO_ADD" && a.task){
        addTodo(a.task);
      }
      else if(a.type==="TODO_DONE" && a.index!=null){
        doneTodo(a.index);
      }
      else if(a.type==="NAVIGATE_SETTINGS"){
        setTimeout(()=>setScreen("settings"),800);
      }
    }
  },[refreshTabs, updateMemory, addTodo, doneTodo]);

  // ── CORE SPEECH HANDLER — routes through Groq agent
  const onSpeech = useCallback(async text=>{
    if(!text.trim()) return;
    addMsg("user",text);

    if(!settingsR.current.apiKey?.trim()){
      const r=`Arey ${rnd(TITLES)}, Groq API key add cheyyi ra! Settings ki velthunna.`;
      addMsg("assistant",r); setSpeaking(true);
      TTS.speak(r,()=>{setSpeaking(false);setTimeout(()=>setScreen("settings"),1000);});
      return;
    }

    setThinking(true); setStatus("Thinking ra…"); setEmotion("thinking");
    try{
      const result = await callAgent(
        text,
        DB.getHistory().slice(-12),
        memoryR.current,
        todosR.current,
        settingsR.current.apiKey
      );

      const speech  = result.speech  || `Seri ${rnd(TITLES)}, chesanu!`;
      const actions = result.actions || [];
      const emo     = result.emotion || "happy";

      addMsg("assistant", speech);
      executeActions(actions);
      setThinking(false);
      setEmotion(emo);
      setSpeaking(true);
      setStatus("Speaking…");

      TTS.speak(speech, ()=>{
        setSpeaking(false);
        setStatus("Listening ra… bolte raho");
        setEmotion("idle");
        if(!pausedR.current) setTimeout(()=>startMicRef.current?.(),500);
      });

    }catch(err){
      setThinking(false); setEmotion("idle");
      const is401 = err.message.includes("401")||err.message.toLowerCase().includes("invalid");
      const isQuota = err.message.includes("429")||err.message.toLowerCase().includes("rate");
      const r = err.message==="NO_KEY"||is401
        ? `Arey ${rnd(TITLES)}, Groq key wrong ra! Settings lo correct key paste cheyyi.`
        : isQuota
        ? `Aiyo ${rnd(TITLES)}, rate limit hit ra. Oka minute wait cheyyi!`
        : `Aiyo ${rnd(TITLES)}, connection issue ra. Once more try cheyyi!`;
      addMsg("assistant",r);
      TTS.speak(r,()=>{setSpeaking(false);if(!pausedR.current&&!is401)setTimeout(()=>startMicRef.current?.(),600);});
      if(is401)setTimeout(()=>setScreen("settings"),1500);
    }
  },[addMsg, executeActions]);
  onSpeechRef.current=onSpeech;

  // ── MIC LOOP — continuous, auto-restart
  const startMic = useCallback(()=>{
    if(!micOkR.current||speakingR.current||thinkingR.current||pausedR.current) return;
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    if(recRef.current){try{recRef.current.abort();}catch{}} recRef.current=null;
    const rec=new SR();
    rec.lang="en-IN"; rec.continuous=false; rec.interimResults=true;
    rec.onstart=()=>{setListening(true);setInterim("");setStatus("Listening ra… bolte raho");};
    rec.onresult=e=>{
      let fin="",intr="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t=e.results[i][0].transcript;
        if(e.results[i].isFinal)fin+=t; else intr+=t;
      }
      if(intr)setInterim(intr);
      if(fin.trim()){setInterim("");setListening(false);setStatus("Processing…");recRef.current=null;onSpeechRef.current(fin.trim());}
    };
    rec.onerror=e=>{
      setListening(false);setInterim("");
      if(e.error==="no-speech"){recRef.current=null;if(!speakingR.current&&!thinkingR.current&&!pausedR.current)setTimeout(()=>startMicRef.current?.(),300);return;}
      if(e.error==="aborted"||e.error==="interrupted")return;
      setStatus(`Mic error: ${e.error} — tap orb`); recRef.current=null;
    };
    rec.onend=()=>{
      setListening(false);setInterim("");
      if(!speakingR.current&&!thinkingR.current&&!pausedR.current&&recRef.current===rec){recRef.current=null;setTimeout(()=>startMicRef.current?.(),350);}
      if(recRef.current===rec)recRef.current=null;
    };
    recRef.current=rec;
    try{rec.start();}catch{recRef.current=null;setStatus("Mic failed — tap orb to retry");}
  },[]);
  startMicRef.current=startMic;

  const onMicAllow = useCallback(()=>{
    setMicOk(true);micOkR.current=true;pausedR.current=false;setScreen("main");
    setTimeout(()=>{
      const g=timeGreeting(DB.getSettings().userName||"");
      addMsg("assistant",g);setSpeaking(true);setStatus("Speaking…");setEmotion("happy");
      TTS.speak(g,()=>{setSpeaking(false);setEmotion("idle");setStatus("Listening ra… bolte raho");startMicRef.current?.();});
    },400);
  },[addMsg]);

  const onMicSkip = useCallback(()=>{
    setMicOk(false);micOkR.current=false;pausedR.current=true;setScreen("main");
    setTimeout(()=>addMsg("assistant",timeGreeting(DB.getSettings().userName||"")),400);
  },[addMsg]);

  const sendText = useCallback(async()=>{
    const text=input.trim();if(!text||thinkingR.current)return;
    TTS.unlock();
    setInput("");try{recRef.current?.abort();}catch{}setListening(false);recRef.current=null;
    await onSpeechRef.current(text);
  },[input]);

  const interrupt = useCallback(()=>{TTS.stop();setSpeaking(false);setEmotion("idle");pausedR.current=false;setTimeout(()=>startMicRef.current?.(),300);},[]);
  const toggleMic = useCallback(()=>{ TTS.unlock(); if(listening)stopMic(true);else{pausedR.current=false;startMicRef.current?.();} },[listening,stopMic]);

  // ── ORB color/animation by emotion
  const orbColors = {
    idle:      {border:"1.5px solid rgba(0,114,255,0.3)",bg:"radial-gradient(circle at 38% 32%,#050d2a,#020510)"},
    happy:     {border:"1.5px solid rgba(0,229,160,0.5)",bg:"radial-gradient(circle at 38% 32%,#051a10,#020510)"},
    excited:   {border:"2px solid rgba(0,198,255,0.9)",bg:"radial-gradient(circle at 38% 32%,#050d2a,#020510)"},
    thinking:  {border:"1.5px solid rgba(255,209,102,0.5)",bg:"radial-gradient(circle at 38% 32%,#1a1000,#020510)"},
    empathetic:{border:"1.5px solid rgba(255,150,200,0.5)",bg:"radial-gradient(circle at 38% 32%,#1a0510,#020510)"},
    focused:   {border:"2px solid rgba(0,114,255,0.8)",bg:"radial-gradient(circle at 38% 32%,#050d2a,#020510)"},
  };
  const oc = listening?{border:"2px solid rgba(255,107,107,0.75)",bg:"radial-gradient(circle,#1a0505,#020510)"}
            :speaking ?{border:"2px solid rgba(0,198,255,0.9)",bg:"radial-gradient(circle,#050d1a,#020510)"}
            :orbColors[emotion]||orbColors.idle;

  // ── SCREENS
  if(screen==="perm") return <PermScreen onAllow={onMicAllow} onSkip={onMicSkip}/>;

  if(screen==="settings") return(
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={()=>setScreen("main")}>← Back</button>
        <span style={{fontSize:15,fontWeight:600,color:"#e0e0f0"}}>Settings</span>
        <span style={{width:56}}/>
      </div>
      <div style={S.scroll}>
        <Sec label="Your Name">
          <input style={S.inp} placeholder="Mee peru — Invika remember chestundi" value={settings.userName} onChange={e=>saveSetting({userName:e.target.value})}/>
        </Sec>
        <Sec label="Groq API Key 🆓 100% Free">
          <div style={{fontSize:12,color:"#555",lineHeight:1.9,background:"rgba(0,229,160,0.04)",border:"1px solid rgba(0,229,160,0.1)",borderRadius:9,padding:"11px 13px",marginBottom:10}}>
            🆓 <b style={{color:"#00e5a0"}}>Completely FREE ra!</b> No credit card.<br/>
            <span style={{color:"#666"}}>1. <b style={{color:"#aaa"}}>console.groq.com</b> → Sign in with Google</span><br/>
            <span style={{color:"#666"}}>2. API Keys → Create API Key</span><br/>
            <span style={{color:"#666"}}>3. Copy <b style={{color:"#aaa"}}>gsk_...</b> key → paste below</span>
          </div>
          <input style={{...S.inp,background:settings.apiKey?"rgba(0,229,160,0.05)":"rgba(255,100,100,0.06)",border:settings.apiKey?"1px solid rgba(0,229,160,0.25)":"1px solid rgba(255,100,100,0.3)",fontFamily:"monospace",fontSize:12}}
            type="password" placeholder="gsk_... paste cheyyi ra" value={settings.apiKey||""} onChange={e=>saveSetting({apiKey:e.target.value})}/>
          <div style={{fontSize:11,marginTop:6,color:settings.apiKey?"#00e5a0":"#ff7070"}}>{settings.apiKey?"✅ Key set undi ra — Invika ready!":"⚠️ Key ledu ra!"}</div>
        </Sec>
        <Sec label="Memory (What Invika knows)">
          {Object.keys(memory.facts||{}).length>0
            ?Object.entries(memory.facts).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:13}}>
                  <span style={{color:"#888"}}>{k}</span>
                  <span style={{color:"#ccc"}}>{v}</span>
                </div>
              ))
            :<div style={{fontSize:12,color:"#444"}}>Emi ledu — mee gurinchi cheppindi remember chestundi!</div>}
        </Sec>
        <Sec label="API Key Expiry">
          <input style={S.inp} type="date" defaultValue={DB.getExpiry("groq")||""} onChange={e=>DB.setExpiry("groq",e.target.value)}/>
        </Sec>
        <div style={{padding:"0 20px 40px"}}>
          <button style={S.dangerBtn} onClick={()=>{if(!confirm("Anni clear cheyyanaa?"))return;localStorage.clear();setMsgs([]);setApps(DEFAULT_APPS);setMemory(DB.getMemory());setTodos([]);saveSetting({userName:"",apiKey:""});notify("Done ra!");}}>Clear All Memory & Data</button>
        </div>
      </div>
    </div>
  );

  if(screen==="apps") return(
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={()=>setScreen("main")}>← Back</button>
        <span style={{fontSize:15,fontWeight:600,color:"#e0e0f0"}}>App Registry</span>
        <span style={{width:56}}/>
      </div>
      <div style={S.scroll}>
        <Sec label="Registered Apps">
          {apps.map((app,i)=>(
            <div key={app.id} style={S.appRow}>
              <span style={{fontSize:20,width:28}}>{app.icon}</span>
              <div style={{flex:1}}><div style={{fontSize:13,color:"#d0d0e0",fontWeight:600}}>{app.name}</div><div style={{fontSize:11,color:"#444"}}>{app.desc}</div></div>
              <button style={S.rmBtn} onClick={()=>{const n=apps.filter((_,j)=>j!==i);setApps(n);DB.setApps(n);}}>✕</button>
            </div>
          ))}
        </Sec>
        <Sec label="Add App">
          <input style={S.inp} placeholder="Name" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})}/>
          <input style={{...S.inp,marginTop:7}} placeholder="URL" value={newApp.url} onChange={e=>setNewApp({...newApp,url:e.target.value})}/>
          <input style={{...S.inp,marginTop:7}} placeholder="Aliases (comma separated)" value={newApp.aliases} onChange={e=>setNewApp({...newApp,aliases:e.target.value})}/>
          <div style={{display:"flex",gap:7,marginTop:7,flexWrap:"wrap"}}>
            {["🔗","🏥","🎵","🎬","📺","🛒","📰","💰","🎮","🏦","📱","🔬"].map(ic=>(
              <button key={ic} style={{...S.icoBtn,...(newApp.icon===ic?{border:"1px solid rgba(0,229,160,0.5)",background:"rgba(0,229,160,0.08)"}:{})}} onClick={()=>setNewApp({...newApp,icon:ic})}>{ic}</button>
            ))}
          </div>
          <button style={S.addBtn} onClick={()=>{
            if(!newApp.name||!newApp.url){notify("Name and URL ivvali ra","err");return;}
            const a={id:Date.now().toString(),name:newApp.name,url:newApp.url,aliases:newApp.aliases.split(",").map(x=>x.trim()).filter(Boolean),icon:newApp.icon,desc:newApp.desc||newApp.name};
            const n=[...apps,a];setApps(n);DB.setApps(n);setNewApp({name:"",url:"",aliases:"",icon:"🔗",desc:""});notify("App add chesanu ra!");
          }}>Add App</button>
        </Sec>
      </div>
    </div>
  );

  // ── MAIN SCREEN
  return(
    <div style={S.page} onClick={()=>TTS.unlock()}>
      {toast&&<div style={{...S.toast,...(toast.type==="err"?{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.3)",color:"#ff8888"}:{background:"rgba(0,229,160,0.12)",border:"1px solid rgba(0,229,160,0.28)",color:"#00e5a0"})}}>{toast.msg}</div>}

      {expModal&&(
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{fontSize:40,marginBottom:8}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#ffd166",marginBottom:10}}>{expModal.days===0?"Key Expired ra!":"Key Expire Avutundi!"}</div>
            <div style={{fontSize:13,color:"#777",lineHeight:1.8}}>{expModal.days===0?"Aiyo, Groq key expire aipoyindi. Renew cheyyi!":"Groq key expire avutundi. Renew chesuko!"}</div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={S.mprim} onClick={()=>{setExpModal(null);setScreen("settings");}}>Settings</button>
              <button style={S.msec} onClick={()=>setExpModal(null)}>Okay Ra</button>
            </div>
          </div>
        </div>
      )}

      {!settings.apiKey&&(
        <div style={{background:"rgba(255,150,0,0.1)",borderBottom:"1px solid rgba(255,150,0,0.2)",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"#ffaa00"}}>🆓 Groq key ledu — console.groq.com lo free ga teyyi!</span>
          <button style={{background:"#ffaa00",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer"}} onClick={()=>setScreen("settings")}>Add Key →</button>
        </div>
      )}

      {/* Top Bar */}
      <div style={S.topBar}>
        <div style={{display:"flex",gap:4}}>
          <button style={S.iconBtn} onClick={()=>setScreen("apps")} title="Apps"><GridIcon/></button>
          <button style={{...S.iconBtn,position:"relative"}} onClick={()=>setShowTodos(v=>!v)} title="Todos">
            <span style={{fontSize:16}}>✅</span>
            {todos.filter(t=>!t.done).length>0&&<span style={{position:"absolute",top:3,right:3,width:8,height:8,borderRadius:"50%",background:"#ff6b6b"}}/>}
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <HexIcon size={22}/>
          <div>
            <div style={{fontSize:18,fontWeight:900,letterSpacing:"0.1em",color:"#eeeef8",lineHeight:1.1}}>Invika</div>
            <div style={{fontSize:9,color:"#2a2a4a",letterSpacing:"0.08em"}}>cognitive AI agent</div>
          </div>
        </div>
        <button style={S.iconBtn} onClick={()=>setScreen("settings")} title="Settings"><GearIcon/></button>
      </div>

      {/* Todo panel */}
      {showTodos&&(
        <div style={{background:"#0a0a18",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 16px",maxHeight:180,overflowY:"auto"}}>
          <div style={{fontSize:10,fontWeight:700,color:"#333",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Todo List</div>
          {todos.length===0?<div style={{fontSize:12,color:"#444"}}>Emi ledu ra — "remind me to..." cheppu!</div>
            :todos.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <button onClick={()=>doneTodo(i)} style={{background:"none",border:`1px solid ${t.done?"#00e5a0":"#333"}`,borderRadius:4,width:16,height:16,cursor:"pointer",flexShrink:0,color:"#00e5a0",fontSize:10}}>
                  {t.done?"✓":""}
                </button>
                <span style={{fontSize:12,color:t.done?"#444":"#c0c0d0",textDecoration:t.done?"line-through":"none",flex:1}}>{t.text}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* Open tabs strip */}
      {openTabs.length>0&&(
        <div style={{display:"flex",gap:5,padding:"5px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap",overflowX:"auto"}}>
          {openTabs.map(name=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,114,255,0.1)",border:"1px solid rgba(0,114,255,0.25)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#6699ff",flexShrink:0}}>
              <span>{name}</span>
              <button style={{background:"none",border:"none",color:"#6699ff",cursor:"pointer",padding:"0 2px",fontSize:11}} onClick={()=>{TabManager.close(name);refreshTabs();}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Status */}
      <div style={S.statusBar}>
        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,transition:"background 0.3s",background:speaking?"#00e5a0":listening?"#ff6b6b":thinking?"#ffd166":"#222"}}/>
        <span style={{fontSize:11,color:"#444",flex:1,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{interim?`"${interim}"`:status}</span>
        {micOk&&(
          <button style={{...S.micPill,...(listening?{color:"#ff6b6b",borderColor:"rgba(255,107,107,0.3)"}:{})}} onClick={toggleMic}>
            {listening?<PauseIcon/>:<MicIcon/>}
            <span style={{fontSize:9,marginLeft:3}}>{listening?"Pause":"Mic"}</span>
          </button>
        )}
      </div>

      {/* Orb */}
      <div style={S.orbArea}>
        {(listening||speaking)&&<div style={{...S.ring,...(listening?{borderColor:"rgba(255,107,107,0.25)"}:{borderColor:"rgba(0,198,255,0.18)"})}}/>}
        {(listening||speaking)&&<div style={{...S.ring,width:150,height:150,animationDelay:"0.4s",opacity:.5,...(listening?{borderColor:"rgba(255,107,107,0.1)"}:{borderColor:"rgba(0,198,255,0.08)"})}}/>}
        <div style={{...S.orb,background:oc.bg,border:oc.border,transform:listening?"scale(1.1)":speaking?"scale(1.07)":"scale(1)"}}
          onClick={()=>{if(speaking){interrupt();return;}if(!micOk){notify("Mic permission nahi ra","err");return;}toggleMic();}}>
          <div style={S.orbInner}>
            {thinking?<Dots/>:speaking?<Wave/>:listening?<Listen/>:<HexIcon size={44}/>}
          </div>
        </div>
        {/* Emotion indicator */}
        <div style={{position:"absolute",bottom:-4,left:"50%",transform:"translateX(-50%)",fontSize:14,opacity:0.7}}>
          {emotion==="happy"?"😊":emotion==="excited"?"🤩":emotion==="empathetic"?"🤗":emotion==="thinking"?"🤔":emotion==="focused"?"🎯":""}
        </div>
      </div>

      <div style={{textAlign:"center",fontSize:11,color:"#2a2a3a",padding:"8px 0 2px",letterSpacing:"0.04em"}}>
        {listening?"👂 Listening — bolte raho ra":speaking?"🔊 Speaking — tap to interrupt":thinking?"🧠 Thinking & planning ra…":micOk?"Tap orb or type below ra":"Type cheyyi ra"}
      </div>

      {/* Chat */}
      <div style={S.chat}>
        {msgs.length===0&&(
          <div style={S.empty}>
            <div style={{fontSize:20,fontWeight:300,color:"#a0a0c0",marginBottom:4}}>Namaskaram {settings.userName||"boss"}!</div>
            <div style={{fontSize:11,color:"#2a2a4a",marginBottom:14}}>Full cognitive AI agent — em chayalante adugandi ra.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center"}}>
              {[
                "Play chikiri chikiri on YouTube","Send mail to Thiru meeting at 5",
                "Close YouTube tab","My name is Thiru remember this",
                "Remind me to buy mic","Navigate from Hyderabad to Vijayawada",
                "Open Amazon search mic under 500","What should I learn today?",
              ].map(s=><button key={s} style={S.chip} onClick={()=>{TTS.unlock();onSpeechRef.current(s);}}>{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{...S.bubble,...(m.role==="user"
            ?{alignSelf:"flex-end",background:"rgba(0,229,160,0.09)",border:"1px solid rgba(0,229,160,0.17)",color:"#b8edd8",borderBottomRightRadius:3}
            :{alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",color:"#c4c4dc",borderBottomLeftRadius:3})}}>
            {m.content}
          </div>
        ))}
        {thinking&&<div style={{alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",padding:"9px 13px",borderRadius:15,marginBottom:4}}><Dots inline/></div>}
        <div ref={chatEnd}/>
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        {speaking&&<button style={S.intBtn} onClick={interrupt}>⏹ Interrupt — nenu matladali ra</button>}
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input style={S.textInput} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText();}}}
            placeholder={listening?"Listening…":"Type cheyyi ra…"} disabled={thinking}/>
          <button style={{...S.sendBtn,opacity:input.trim()&&!thinking?1:0.3}} onClick={sendText} disabled={!input.trim()||thinking}><SendIcon/></button>
        </div>
      </div>

      <style>{`
        @keyframes bounce  {0%,80%,100%{transform:scale(.4);opacity:.2}40%{transform:scale(1);opacity:1}}
        @keyframes wave    {from{transform:scaleY(.15)}to{transform:scaleY(1)}}
        @keyframes listenB {0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
        @keyframes ringOut {0%{transform:scale(1);opacity:.3}100%{transform:scale(1.7);opacity:0}}
        @keyframes fadeIn  {from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════
function Sec({label,children}){
  return<div style={{padding:"0 20px 20px"}}>
    <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.12em",color:"#2a2a4a",textTransform:"uppercase",marginBottom:8}}>{label}</div>
    {children}
  </div>;
}
function HexIcon({size}){
  return(
    <svg width={size} height={size} viewBox="0 0 200 160" fill="none">
      <defs>
        <linearGradient id="iG" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00c6ff"/><stop offset="50%" stopColor="#0072ff"/><stop offset="100%" stopColor="#003acc"/></linearGradient>
        <radialGradient id="iP" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff"/><stop offset="35%" stopColor="#7df9ff"/><stop offset="100%" stopColor="#0072ff" stopOpacity="0"/></radialGradient>
        <filter id="iGlow"><feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="65"  cy="72" rx="50" ry="33" fill="none" stroke="url(#iG)" strokeWidth="15" filter="url(#iGlow)"/>
      <ellipse cx="135" cy="72" rx="50" ry="33" fill="none" stroke="url(#iG)" strokeWidth="15" filter="url(#iGlow)"/>
      <ellipse cx="65"  cy="72" rx="37" ry="21" fill="#04080f"/>
      <ellipse cx="135" cy="72" rx="37" ry="21" fill="#04080f"/>
      <circle cx="65"  cy="72" r="12" fill="url(#iP)" filter="url(#iGlow)"/>
      <circle cx="65"  cy="72" r="4.5" fill="#fff"/>
      <circle cx="135" cy="72" r="12" fill="url(#iP)" filter="url(#iGlow)"/>
      <circle cx="135" cy="72" r="4.5" fill="#fff"/>
    </svg>
  );
}
function MicIcon()  {return<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>;}
function PauseIcon(){return<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>;}
function SendIcon() {return<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>;}
function GridIcon() {return<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;}
function GearIcon() {return<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;}
function Dots({inline}){return<div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"center",padding:inline?"3px 0":0}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#00e5a0",animation:`bounce 1.2s ${i*.18}s infinite ease-in-out`}}/>)}</div>;}
function Wave(){return<div style={{display:"flex",gap:3,alignItems:"center",justifyContent:"center"}}>{[2,4,7,10,13,10,7,4,2].map((h,i)=><div key={i} style={{width:3,height:h*3.5,borderRadius:3,background:"#00e5a0",animation:`wave .48s ${i*.06}s infinite ease-in-out alternate`}}/>)}</div>;}
function Listen(){return<div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center"}}>{[1,2,4,5,6,5,4,2,1].map((h,i)=><div key={i} style={{width:3,height:h*5,borderRadius:3,background:"#ff6b6b",opacity:.88,animation:`listenB .65s ${i*.08}s infinite ease-in-out`}}/>)}</div>;}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const S={
  page:    {display:"flex",flexDirection:"column",height:"100dvh",minHeight:580,background:"#050510",color:"#e0e0f0",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",overflow:"hidden",position:"relative"},
  topBar:  {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  backBtn: {background:"none",border:"none",color:"#0072ff",cursor:"pointer",fontSize:14,padding:"6px 10px"},
  iconBtn: {background:"none",border:"none",color:"#444",cursor:"pointer",padding:6,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34},
  statusBar:{display:"flex",alignItems:"center",gap:7,padding:"5px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"},
  micPill: {display:"flex",alignItems:"center",background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:"3px 8px",color:"#444",cursor:"pointer",gap:2},
  orbArea: {display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 0 4px",position:"relative",minHeight:126},
  orb:     {width:96,height:96,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s ease",cursor:"pointer",position:"relative",zIndex:2},
  orbInner:{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},
  ring:    {position:"absolute",width:124,height:124,borderRadius:"50%",border:"1px solid rgba(0,114,255,0.2)",animation:"ringOut 2.2s infinite ease-out",zIndex:1},
  chat:    {flex:1,overflowY:"auto",padding:"8px 13px",display:"flex",flexDirection:"column",gap:8,scrollbarWidth:"thin",scrollbarColor:"#0d0d20 transparent"},
  empty:   {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,textAlign:"center",paddingTop:8},
  bubble:  {maxWidth:"84%",padding:"8px 12px",borderRadius:14,fontSize:13.5,lineHeight:1.7,wordBreak:"break-word",whiteSpace:"pre-wrap",animation:"fadeIn 0.25s ease"},
  chip:    {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"4px 11px",fontSize:11,color:"#555",cursor:"pointer"},
  inputArea:{padding:"8px 13px 12px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  intBtn:  {width:"100%",marginBottom:6,background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.2)",color:"#ff7070",borderRadius:9,padding:"6px",fontSize:11,cursor:"pointer"},
  textInput:{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:"10px 14px",color:"#e0e0f0",fontSize:14,outline:"none"},
  sendBtn: {width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#0072ff,#00c6ff)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  toast:   {position:"absolute",top:52,left:"50%",transform:"translateX(-50%)",borderRadius:9,padding:"6px 14px",fontSize:11,zIndex:200,whiteSpace:"nowrap",maxWidth:"90%"},
  overlay: {position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20},
  modal:   {background:"#0a0a18",border:"1px solid rgba(255,200,0,0.18)",borderRadius:18,padding:"26px 22px",maxWidth:320,width:"100%",textAlign:"center"},
  mprim:   {flex:1,background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.28)",color:"#ffd166",borderRadius:9,padding:"9px 12px",fontSize:13,cursor:"pointer"},
  msec:    {flex:1,background:"none",border:"1px solid rgba(255,255,255,0.07)",color:"#555",borderRadius:9,padding:"9px 12px",fontSize:13,cursor:"pointer"},
  scroll:  {flex:1,overflowY:"auto",paddingTop:16},
  inp:     {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"10px 12px",color:"#e0e0f0",fontSize:14,outline:"none",boxSizing:"border-box"},
  lbl:     {display:"block",fontSize:11,color:"#555",marginBottom:5},
  dangerBtn:{width:"100%",background:"rgba(255,50,50,0.07)",border:"1px solid rgba(255,50,50,0.15)",color:"#ff6060",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer"},
  appRow:  {display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  rmBtn:   {background:"none",border:"none",color:"#2a2a3a",cursor:"pointer",fontSize:13,padding:"4px 7px"},
  addBtn:  {width:"100%",marginTop:10,background:"rgba(0,229,160,0.07)",border:"1px solid rgba(0,229,160,0.2)",color:"#00e5a0",borderRadius:9,padding:"10px",fontSize:13,cursor:"pointer",fontWeight:600},
  icoBtn:  {background:"rgba(255,255,255,0.03)",border:"1px solid transparent",borderRadius:7,padding:"5px 7px",fontSize:16,cursor:"pointer"},
};
