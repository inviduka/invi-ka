import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// INVIKA v4.0 — FULL COGNITIVE AI AGENT + ELEVENLABS FEMALE VOICE
// ═══════════════════════════════════════════════════════════════════════════

const KEYS = {
  apps:"inv_apps", settings:"inv_set", history:"inv_hist",
  memory:"inv_mem", expiry:"inv_exp", tasks:"inv_tasks"
};

const DEFAULT_APPS = [
  { id:"thinkcare",  name:"ThinkCare",    url:"https://thinkare.lovable.app/",      aliases:["thinkcare","healthcare","health"],        icon:"🏥", desc:"Healthcare" },
  { id:"thiru",      name:"Thiru Bio",    url:"https://thirubio.vercel.app/",        aliases:["thiru","portfolio","thirubio"],           icon:"👤", desc:"Portfolio" },
  { id:"hurryup",    name:"HurryUp",      url:"https://hurryup-buddy.vercel.app/",   aliases:["hurryup","hurry up","commuter"],          icon:"🚌", desc:"Commuter" },
  { id:"youtube",    name:"YouTube",      url:"https://youtube.com",                 aliases:["youtube","yt","videos","tube"],           icon:"📺", desc:"Video" },
  { id:"ytmusic",    name:"YouTube Music",url:"https://music.youtube.com",           aliases:["youtube music","yt music","ytmusic"],     icon:"🎶", desc:"Music" },
  { id:"google",     name:"Google",       url:"https://google.com",                  aliases:["google"],                                icon:"🔍", desc:"Search" },
  { id:"amazon",     name:"Amazon",       url:"https://amazon.in",                   aliases:["amazon","shopping"],                     icon:"🛒", desc:"Shopping" },
  { id:"netflix",    name:"Netflix",      url:"https://netflix.com",                 aliases:["netflix","movies","streaming"],           icon:"🎬", desc:"Streaming" },
  { id:"spotify",    name:"Spotify",      url:"https://spotify.com",                 aliases:["spotify","music","songs"],               icon:"🎵", desc:"Music" },
  { id:"instagram",  name:"Instagram",    url:"https://instagram.com",               aliases:["instagram","insta","ig"],                icon:"📸", desc:"Social" },
  { id:"whatsapp",   name:"WhatsApp",     url:"https://web.whatsapp.com",            aliases:["whatsapp","wa","whats app"],             icon:"💬", desc:"Chat" },
  { id:"maps",       name:"Google Maps",  url:"https://maps.google.com",             aliases:["maps","navigate","directions","location"],icon:"🗺️", desc:"Maps" },
  { id:"gmail",      name:"Gmail",        url:"https://gmail.com",                   aliases:["gmail","email","mail","inbox"],          icon:"📧", desc:"Email" },
  { id:"twitter",    name:"Twitter",      url:"https://twitter.com",                 aliases:["twitter","tweet","x"],                  icon:"🐦", desc:"Twitter/X" },
  { id:"linkedin",   name:"LinkedIn",     url:"https://linkedin.com",                aliases:["linkedin","jobs","professional"],        icon:"💼", desc:"LinkedIn" },
  { id:"github",     name:"GitHub",       url:"https://github.com",                  aliases:["github","code","repo"],                 icon:"💻", desc:"Code" },
  { id:"news",       name:"Google News",  url:"https://news.google.com",             aliases:["news","headlines","articles"],           icon:"📰", desc:"News" },
  { id:"weather",    name:"Weather",      url:"https://weather.com",                 aliases:["weather","forecast","climate"],          icon:"🌤️", desc:"Weather" },
  { id:"calculator", name:"Calculator",   url:"https://www.google.com/search?q=calculator", aliases:["calculator","calc"],            icon:"🔢", desc:"Calculator" },
  { id:"translate",  name:"Translate",    url:"https://translate.google.com",        aliases:["translate","translation","language"],   icon:"🌐", desc:"Translate" },
  { id:"calendar",   name:"Calendar",     url:"https://calendar.google.com",         aliases:["calendar","schedule","events"],         icon:"📅", desc:"Calendar" },
];

const E = encodeURIComponent;
const TITLES = ["ra","boss","anna","bhai","chief","maccha"];
const rnd = a => a[Math.floor(Math.random()*a.length)];

function timeGreeting(name) {
  const h = new Date().getHours();
  const who = name || "boss";
  const tod = h<5?"night ra, late ga unnav":h<12?"morning":h<17?"afternoon":"evening";
  return rnd([
    `Arey ${who}! Good ${tod} ra — Invika ikkade undi, cheppandi em kavali!`,
    `Good ${tod} anna! Nenu Invika — mee AI companion ra. Em cheyali bollu?`,
    `Aiyo ${who}, good ${tod}! Invika ready ga undi — em task cheseyali?`,
    `Haan ${who}! Good ${tod} ra. Bollu — em help kavali, chestunna!`,
  ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════════════════
const DB = {
  get:         k    => { try{return JSON.parse(localStorage.getItem(k)||"null")}catch{return null} },
  set:         (k,v)=> localStorage.setItem(k,JSON.stringify(v)),
  getApps:     ()   => DB.get(KEYS.apps)||DEFAULT_APPS,
  setApps:     a    => DB.set(KEYS.apps,a),
  getSettings: ()   => DB.get(KEYS.settings)||{},
  setSettings: s    => DB.set(KEYS.settings,s),
  getHistory:  ()   => DB.get(KEYS.history)||[],
  pushHistory: m    => { const h=DB.getHistory().slice(-79); h.push(m); DB.set(KEYS.history,h); },
  getMemory:   ()   => DB.get(KEYS.memory)||{facts:{},prefs:{},people:{},todos:[]},
  setMemory:   m    => DB.set(KEYS.memory,m),
  getExpiry:   p    => (DB.get(KEYS.expiry)||{})[p]||null,
  setExpiry:   (p,d)=> { const e=DB.get(KEYS.expiry)||{}; e[p]=d; DB.set(KEYS.expiry,e); },
  getTasks:    ()   => DB.get(KEYS.tasks)||[],
  setTasks:    t    => DB.set(KEYS.tasks,t),
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB MANAGER — tracks tabs with aliases for reliable closing
// ═══════════════════════════════════════════════════════════════════════════
const TabManager = {
  _tabs: {},

  open(id, url, aliases=[]) {
    const existing = this._tabs[id];
    if (existing && existing.win && !existing.win.closed) {
      try { existing.win.close(); } catch {}
    }
    const win = window.open(url, `invika_tab_${id}`);
    if (win) this._tabs[id] = { win, aliases:[id,...aliases].map(a=>a.toLowerCase()), url };
    return win;
  },

  close(query) {
    const q = query.toLowerCase().replace(/\b(tab|window|the|close|band|karo|cheyyi)\b/g,"").trim();
    // Try exact id first
    if (this._tabs[q]) {
      try { this._tabs[q].win?.close(); } catch {}
      delete this._tabs[q]; return q;
    }
    // Fuzzy alias match
    const matched = Object.entries(this._tabs).find(([,data]) =>
      data.aliases.some(a => a.includes(q) || q.includes(a) || (q.length>2 && a.startsWith(q.slice(0,3))))
    );
    if (matched) {
      try { matched[1].win?.close(); } catch {}
      delete this._tabs[matched[0]]; return matched[0];
    }
    return null;
  },

  closeById(id) {
    if (this._tabs[id]) {
      try { this._tabs[id].win?.close(); } catch {}
      delete this._tabs[id]; return id;
    }
    return null;
  },

  closeAll() {
    Object.values(this._tabs).forEach(d => { try { d.win?.close(); } catch {} });
    this._tabs = {};
  },

  getOpen() {
    Object.keys(this._tabs).forEach(k => { if (this._tabs[k]?.win?.closed) delete this._tabs[k]; });
    return Object.keys(this._tabs);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// ELEVENLABS VOICE IDs — real Indian female voices
// ═══════════════════════════════════════════════════════════════════════════
const ELEVEN = {
  // Deepa — Indian English female, warm, natural ← PRIMARY
  DEEPA:    "aEO501A3Ruktzz6OhHBH",
  // Charlotte — young British female, clear
  CHARLOTTE:"XB0fDUnXU5powFXDhCwa",
  // Aria — warm American female, expressive
  ARIA:     "9BWtsMINqrJLrRacOk9x",
  // Rachel — calm American female
  RACHEL:   "21m00Tcm4TlvDq8ikWAM",
};

// ═══════════════════════════════════════════════════════════════════════════
// NATURAL TINGLISH PREPROCESSOR
// ═══════════════════════════════════════════════════════════════════════════
function naturalise(text) {
  let t = text;
  // Phonetic map — how a real Telugu girl pronounces these words
  const map = [
    [" ra!","  raa!"], [" ra."," raa."], [" ra,"," raa,"], [" ra "," raa "],
    ["Arey ","Uh-ray "], ["arey ","uh-ray "],
    ["Aiyo ","Ay-yo "], ["aiyo ","ay-yo "],
    ["Seri ","Say-ri "], ["seri ","say-ri "],
    ["chestunna","chess-tun-na"],
    ["cheyyi","chay-yi"],
    ["chesanu","chay-sa-nu"],
    ["kavali","kaa-va-li"],
    ["chala ","chaa-la "],
    ["baaga","baa-ga"],
    ["maccha","maa-cha"],
    ["bollu","bol-lu"],
    [" anna!"," un-na!"], [" anna,"," un-na,"], [" anna."," un-na."], [" anna "," un-na "],
    ["—",", "],
  ];
  for (const [f,r] of map) t = t.split(f).join(r);
  return t.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// TTS ENGINE
// Primary:  ElevenLabs (Deepa — real Indian female voice)
// Fallback: Browser SpeechSynthesis with forced high pitch female
// ═══════════════════════════════════════════════════════════════════════════
const TTS = {
  _synth:    typeof window!=="undefined" ? window.speechSynthesis : null,
  _unlocked: false,
  _audio:    null,
  _busy:     false,

  // Called on every user gesture — unlocks audio on mobile
  unlock() {
    if (this._unlocked) return;
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      ctx.resume();
    } catch {}
    if (this._synth) {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume=0; u.rate=16;
      try { this._synth.speak(u); } catch {}
    }
    this._unlocked = true;
  },

  // ── ElevenLabs: real Indian female voice (Deepa)
  async _eleven(text, apiKey, voiceId, cb) {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`;
    const res = await fetch(url, {
      method:  "POST",
      headers: {
        "xi-api-key":    apiKey.trim(),
        "Content-Type":  "application/json",
        "Accept":        "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability:         0.50,
          similarity_boost:  0.88,
          style:             0.40,
          use_speaker_boost: true,
        },
      }),
    });
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    this._stopAudio();
    const audio = new Audio(blobUrl);
    this._audio = audio;
    audio.playbackRate = 1.0;
    audio.onended  = () => { URL.revokeObjectURL(blobUrl); this._audio=null; cb?.(); };
    audio.onerror  = () => { URL.revokeObjectURL(blobUrl); this._audio=null; cb?.(); };
    audio.play().catch(()=>cb?.());
  },

  _stopAudio() {
    if (this._audio) {
      try { this._audio.pause(); } catch {}
      this._audio = null;
    }
  },

  // ── Browser fallback — picks best available female voice
  _browser(text, cb) {
    if (!this._synth) { cb?.(); return; }
    this._synth.cancel();
    const go = () => {
      const vs = this._synth.getVoices();
      // Ranked female voice search — most reliable female voices first
      const tests = [
        v => v.name.includes("Google") && v.lang==="en-IN",
        v => v.name.includes("Priya"),
        v => v.name.includes("Aditi"),
        v => v.name.includes("Raveena"),
        v => v.lang==="en-IN",
        v => v.name==="Samantha",
        v => v.name==="Karen",
        v => v.name==="Veena",
        v => v.name==="Tessa",
        v => v.name.includes("Aria"),
        v => v.name.includes("Jenny"),
        v => v.name.includes("Zira"),
        v => v.name==="Google UK English Female",
        v => v.name.toLowerCase().includes("female"),
        v => v.lang==="en-US",
      ];
      let voice = null;
      for (const t of tests) { voice=vs.find(t); if(voice) break; }

      // Chunk for Android (cuts off at ~160 chars)
      const chunks = text.length<=160 ? [text]
        : (text.match(/[^.!?,]+[.!?,]*/g)||[text]).reduce((acc,s)=>{
            const last = acc[acc.length-1]||"";
            if((last+s).length>150 && last) acc.push(s);
            else acc[acc.length-1]=last+s;
            return acc;
          },[""]).filter(Boolean);

      let idx=0;
      const next=()=>{
        if(idx>=chunks.length){cb?.();return;}
        const u=new SpeechSynthesisUtterance(chunks[idx]);
        if(voice) u.voice=voice;
        u.lang   = voice?.lang||"en-IN";
        u.rate   = 0.88;
        u.pitch  = 1.6;   // Maximum pitch for female sound on browser TTS
        u.volume = 1.0;
        u.onend  = ()=>{idx++;next();};
        u.onerror= ()=>{idx++;next();};
        this._synth.speak(u);
        // Android Chrome pauses bug — force resume
        [100,500,1200,2500].forEach(ms=>
          setTimeout(()=>{if(this._synth?.paused)this._synth.resume();},ms)
        );
      };
      next();
    };
    if(!this._synth.getVoices().length){
      const h=()=>{this._synth.removeEventListener("voiceschanged",h);go();};
      this._synth.addEventListener("voiceschanged",h);
      setTimeout(go,600);
    } else go();
  },

  // ── Main entry: ElevenLabs first, browser fallback
  speak(text, cb, elevenKey) {
    this.stop();
    this._busy = true;
    const nat  = naturalise(text);
    const done = ()=>{ this._busy=false; cb?.(); };

    if (elevenKey?.trim()) {
      this._eleven(nat, elevenKey.trim(), ELEVEN.DEEPA, done)
        .catch(()=>{ this._browser(nat, done); });
    } else {
      this._browser(nat, done);
    }
  },

  stop() {
    try { this._synth?.cancel(); } catch {}
    this._stopAudio();
    this._busy = false;
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GROQ AI AGENT SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════════════════
const AGENT_SYSTEM = `You are Invika — a warm, brilliant, witty female AI agent. You are a Telugu girl who speaks Tinglish naturally — exactly like an educated urban Telugu woman talking to her friend.

═══ HOW TO SPEAK (CRITICAL) ═══
Speak like a real Telugu girl friend, NOT like a translated assistant:
- "Arey, YouTube Music lo chikiri chikiri play chestunna ra — enjoy cheyyi anna!"
- "Aiyo boss, maps lo Hyderabad to Vijayawada route ready chesanu — safe ga vellu ra!"
- "Seri seri, Gmail lo message type chesanu — check cheyyi once!"
- "Ooh, super idea anna — abhi chesanu ra!"
- "Haan maccha, remember chesanu — mee peru Thiru ga store aipoyindi!"

RHYTHM: reaction word (Arey/Aiyo/Seri/Ooh/Haan) → action → warm ending (ra/anna/maccha)
LENGTH: 1-2 SHORT sentences only. Voice output ra.
NEVER say you are Claude, GPT, Groq, or any AI company. You are Invika only.

═══ RESPONSE FORMAT — JSON ONLY ═══
{"speech":"...","actions":[...],"emotion":"happy|excited|empathetic|thinking|focused|playful"}

═══ ACTIONS ═══

OPEN_URL — open a tab (ALWAYS include aliases array):
{"type":"OPEN_URL","id":"EXACT_ID","url":"https://...","aliases":["alt1","alt2"]}

CLOSE_TAB — close by exact id (CRITICAL — use the EXACT id used when opening):
{"type":"CLOSE_TAB","id":"EXACT_ID"}
Multiple closes: [{"type":"CLOSE_TAB","id":"youtube"},{"type":"CLOSE_TAB","id":"maps"}]

CLOSE_ALL_TABS: {"type":"CLOSE_ALL_TABS"}
REMEMBER: {"type":"REMEMBER","key":"user_name","value":"Thiru"}
TODO_ADD: {"type":"TODO_ADD","task":"Buy mic"}
TODO_DONE: {"type":"TODO_DONE","index":0}
NAVIGATE_SETTINGS: {"type":"NAVIGATE_SETTINGS"}

═══ EXACT TAB IDs (use these always) ═══
youtube, ytmusic, spotify, gmail, whatsapp, maps, google, amazon, netflix,
instagram, twitter, linkedin, github, news, translate, calendar, weather,
thinkcare, hurryup, thiru, calculator

═══ URL RULES ═══
SONGS → ALWAYS use ytmusic (id="ytmusic"):
  https://music.youtube.com/search?q=SONG_ENCODED
  aliases: ["youtube music","yt music","ytmusic","music","song"]

YouTube browse (id="youtube"):
  https://www.youtube.com/results?search_query=QUERY&sp=EgIQAQ%3D%3D
  aliases: ["youtube","yt","videos"]

Google Maps DIRECTIONS (id="maps"):
  https://www.google.com/maps/dir/FROM_ENCODED/TO_ENCODED
  aliases: ["maps","google maps","directions","navigation","route"]

Google Maps LOCATION (id="maps"):
  https://maps.google.com/maps?q=LOCATION
  aliases: ["maps","location","place"]

Gmail COMPOSE (id="gmail"):
  https://mail.google.com/mail/?view=cm&fs=1&to=EMAIL&su=SUBJECT_ENCODED&body=BODY_ENCODED
  aliases: ["gmail","email","mail"]

WhatsApp (id="whatsapp"):
  https://web.whatsapp.com/
  aliases: ["whatsapp","wa","chat"]

Google SEARCH (id="google"):
  https://www.google.com/search?q=QUERY_ENCODED
  aliases: ["google","search"]

Amazon (id="amazon"):
  https://www.amazon.in/s?k=QUERY_ENCODED
  aliases: ["amazon","shopping"]

Weather (id="weather"):
  https://www.google.com/search?q=weather+LOCATION_ENCODED

Translate (id="translate"):
  https://translate.google.com/?sl=auto&tl=en&text=TEXT_ENCODED&op=translate

═══ COGNITIVE RULES ═══
- Song/music requests → ALWAYS ytmusic, never youtube search
- "close youtube and maps" → two CLOSE_TAB actions with ids "youtube" and "maps"
- "come back to Invika" after closing → CLOSE_ALL_TABS
- Remember personal info the user shares
- User sad/stressed → empathy first, action second
- Ambiguous → make the best choice, tell user what you did
- Time aware: use current time/date from context
- Respond ONLY with valid JSON. No markdown outside JSON.`;

// ═══════════════════════════════════════════════════════════════════════════
// GROQ API CALL
// ═══════════════════════════════════════════════════════════════════════════
async function callAgent(userText, history, memory, todos, apiKey) {
  if (!apiKey?.trim()) throw new Error("NO_KEY");
  const memSummary = Object.entries(memory.facts||{}).map(([k,v])=>`${k}: ${v}`).join(", ")||"none";
  const todoList   = (todos||[]).map((t,i)=>`${i}. [${t.done?"✓":"○"}] ${t.text}`).join("\n")||"none";
  const openTabs   = TabManager.getOpen().join(", ")||"none";
  const ctx = `CONTEXT:
User memory: ${memSummary}
Open tabs: ${openTabs}
Todo list:\n${todoList}
Time: ${new Date().toLocaleTimeString("en-IN")}
Date: ${new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}

User says: "${userText}"

Respond ONLY with valid JSON.`;

  const messages = [
    { role:"system", content:AGENT_SYSTEM },
    ...history.slice(-12).map(m=>({role:m.role,content:m.content})),
    { role:"user", content:ctx }
  ];

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions",{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey.trim()}`},
    body:JSON.stringify({
      model:"llama-3.3-70b-versatile",
      messages,
      max_tokens:600,
      temperature:0.75,
      response_format:{type:"json_object"},
    }),
  });
  if(!res.ok){const e=await res.json().catch(()=>({}));throw new Error(e.error?.message||`Groq ${res.status}`);}
  const d = await res.json();
  const text = d.choices?.[0]?.message?.content?.trim()||"{}";
  try { return JSON.parse(text); }
  catch { return {speech:`Aiyo ${rnd(TITLES)}, response parse issue ra. Once more cheppu!`,actions:[],emotion:"thinking"}; }
}

// ═══════════════════════════════════════════════════════════════════════════
// LANDING / PERMISSION SCREEN — Premium, clean, no Telugu
// ═══════════════════════════════════════════════════════════════════════════
function PermScreen({onAllow,onSkip}){
  const [phase,setPhase]=useState("idle");
  const [busy,setBusy]=useState(false);
  const phRef=useRef("idle");
  const setP=v=>{phRef.current=v;setPhase(v);};

  const allow=()=>{
    TTS.unlock();
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setP("nosupport");return;}
    setBusy(true);setP("testing");
    const rec=new SR();rec.lang="en-IN";rec.continuous=false;rec.interimResults=false;
    rec.onstart=()=>{try{rec.abort();}catch{}};
    rec.onerror=e=>{
      setBusy(false);
      if(e.error==="not-allowed"||e.error==="service-not-allowed") setP("denied");
      else{setP("granted");setTimeout(()=>onAllow(),600);}
    };
    rec.onend=()=>{setBusy(false);if(phRef.current!=="denied"){setP("granted");setTimeout(()=>onAllow(),600);}};
    try{rec.start();}catch{setBusy(false);setP("granted");setTimeout(()=>onAllow(),600);}
  };
  const skip=()=>{TTS.unlock();onSkip();};

  if(phase==="granted") return(
    <div style={Ps.page}>
      <div style={Ps.card}>
        <div style={Ps.orbWrap}><HexIcon size={52}/></div>
        <div style={Ps.brand}>Invika</div>
        <div style={{fontSize:40,margin:"18px 0 10px"}}>✅</div>
        <div style={{fontSize:16,fontWeight:700,color:"#00e5a0",marginBottom:6}}>Microphone Ready!</div>
        <div style={{fontSize:13,color:"#555"}}>Starting Invika — your AI is waking up…</div>
      </div>
      <style>{LP_STYLES}</style>
    </div>
  );

  return(
    <div style={Ps.page}>
      {/* Ambient glow bg */}
      <div style={Ps.glow1}/><div style={Ps.glow2}/>

      <div style={Ps.card}>
        {/* Logo orb */}
        <div style={Ps.orbWrap}>
          <div style={Ps.orbRing}><HexIcon size={52}/></div>
          <div style={Ps.orbPing}/>
        </div>

        {/* Brand */}
        <div style={Ps.brand}>Invika</div>
        <div style={Ps.tagline}>Full Cognitive AI Agent</div>

        {/* Divider */}
        <div style={Ps.divider}/>

        {/* Permission heading */}
        <div style={Ps.permTitle}>🎙️ Microphone Permission</div>
        <div style={Ps.permSub}>Voice-first AI — allow microphone for hands-free experience.<br/>Your voice is never recorded or stored.</div>

        {/* Capabilities grid */}
        <div style={Ps.capGrid}>
          {[
            {icon:"🎵",text:"Play songs on YouTube Music"},
            {icon:"📧",text:"Send emails via Gmail"},
            {icon:"🗺️",text:"Navigate with Google Maps"},
            {icon:"🔍",text:"Search anything, anywhere"},
            {icon:"🧠",text:"Remember, plan & decide"},
            {icon:"💬",text:"Answer any question"},
            {icon:"📋",text:"Manage your todo list"},
            {icon:"🗂️",text:"Open & close apps & tabs"},
          ].map(({icon,text})=>(
            <div key={text} style={Ps.capItem}>
              <span style={Ps.capIcon}>{icon}</span>
              <span style={Ps.capText}>{text}</span>
            </div>
          ))}
        </div>

        {/* Errors */}
        {phase==="denied"&&(
          <div style={Ps.errBox}>
            <div style={{marginBottom:6}}>⚠️ Microphone access blocked.</div>
            <div style={{color:"#888",fontSize:11}}>Click the 🔒 lock icon in your browser address bar → Microphone → Allow → then reload.</div>
            <button style={Ps.reloadBtn} onClick={()=>window.location.reload()}>Reload Page</button>
          </div>
        )}
        {phase==="nosupport"&&(
          <div style={Ps.errBox}>
            ⚠️ Voice not supported in this browser. Please use <b style={{color:"#aaa"}}>Google Chrome</b>.
          </div>
        )}

        {/* CTA buttons */}
        {phase!=="denied"&&phase!=="nosupport"&&(
          <button style={{...Ps.allowBtn,opacity:busy?0.65:1}} onClick={allow} disabled={busy}>
            {busy
              ? <><span style={{marginRight:8}}>⏳</span>Waiting for browser permission…</>
              : <><span style={{marginRight:8}}>🎙️</span>Allow Microphone &amp; Start</>}
          </button>
        )}

        <button style={Ps.skipBtn} onClick={skip}>
          Skip — use keyboard only
        </button>

        {/* Powered by note */}
        <div style={Ps.poweredBy}>
          Powered by Groq AI · ElevenLabs Voice · Web Speech API
        </div>
      </div>

      <style>{LP_STYLES}</style>
    </div>
  );
}

const LP_STYLES = `
  @keyframes orbFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes ping     { 0%{transform:scale(1);opacity:.4} 100%{transform:scale(1.8);opacity:0} }
  @keyframes gradShift{ 0%,100%{opacity:.6} 50%{opacity:1} }
`;

const Ps={
  page:     {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#04040e",padding:"20px",position:"relative",overflow:"hidden"},
  glow1:    {position:"fixed",top:"-20%",left:"10%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,114,255,0.12),transparent 70%)",pointerEvents:"none",animation:"gradShift 4s ease-in-out infinite"},
  glow2:    {position:"fixed",bottom:"-10%",right:"5%",width:350,height:350,borderRadius:"50%",background:"radial-gradient(circle,rgba(0,198,255,0.08),transparent 70%)",pointerEvents:"none",animation:"gradShift 5s 1s ease-in-out infinite"},
  card:     {background:"rgba(10,10,24,0.95)",border:"1px solid rgba(0,114,255,0.18)",borderRadius:24,padding:"44px 32px 32px",maxWidth:420,width:"100%",textAlign:"center",backdropFilter:"blur(20px)",position:"relative",zIndex:2},
  orbWrap:  {position:"relative",width:110,height:110,margin:"0 auto 20px",display:"flex",alignItems:"center",justifyContent:"center"},
  orbRing:  {width:110,height:110,borderRadius:"50%",background:"radial-gradient(circle at 40% 35%,#060d28,#020510)",border:"1.5px solid rgba(0,114,255,0.35)",display:"flex",alignItems:"center",justifyContent:"center",animation:"orbFloat 3.5s ease-in-out infinite",position:"relative",zIndex:2},
  orbPing:  {position:"absolute",inset:0,borderRadius:"50%",border:"1.5px solid rgba(0,114,255,0.25)",animation:"ping 2.5s ease-out infinite",zIndex:1},
  brand:    {fontSize:42,fontWeight:900,letterSpacing:"0.12em",background:"linear-gradient(135deg,#00c6ff,#0072ff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6},
  tagline:  {fontSize:13,color:"#4466aa",letterSpacing:"0.1em",marginBottom:22,fontWeight:500},
  divider:  {height:"1px",background:"linear-gradient(90deg,transparent,rgba(0,114,255,0.3),transparent)",margin:"0 0 22px"},
  permTitle:{fontSize:17,fontWeight:700,color:"#d0d8f0",marginBottom:8},
  permSub:  {fontSize:12,color:"#4a5a6a",lineHeight:1.7,marginBottom:20},
  capGrid:  {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 12px",marginBottom:22,textAlign:"left"},
  capItem:  {display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"rgba(255,255,255,0.03)",borderRadius:8,border:"1px solid rgba(255,255,255,0.05)"},
  capIcon:  {fontSize:16,flexShrink:0},
  capText:  {fontSize:11,color:"#7a8a9a",lineHeight:1.3},
  errBox:   {background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:10,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#ff8888",textAlign:"left"},
  reloadBtn:{marginTop:10,width:"100%",background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.3)",color:"#00e5a0",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"},
  allowBtn: {width:"100%",background:"linear-gradient(135deg,#0055cc,#0099ff)",border:"none",borderRadius:13,padding:"15px",fontSize:15,fontWeight:700,color:"#fff",cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",letterSpacing:"0.02em"},
  skipBtn:  {background:"none",border:"1px solid rgba(255,255,255,0.08)",color:"#445",fontSize:12,cursor:"pointer",padding:"8px 20px",borderRadius:8,width:"100%",marginBottom:16},
  poweredBy:{fontSize:10,color:"#2a3a4a",letterSpacing:"0.05em"},
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function Invika(){
  const [screen,    setScreen]   = useState("perm");
  const [micOk,     setMicOk]    = useState(false);
  const [msgs,      setMsgs]     = useState(()=>DB.getHistory());
  const [input,     setInput]    = useState("");
  const [listening, setListening]= useState(false);
  const [speaking,  setSpeaking] = useState(false);
  const [thinking,  setThinking] = useState(false);
  const [emotion,   setEmotion]  = useState("idle");
  const [status,    setStatus]   = useState("Invika ready ra…");
  const [interim,   setInterim]  = useState("");
  const [apps,      setApps]     = useState(()=>DB.getApps());
  const [settings,  setSettings] = useState(()=>({userName:"",apiKey:"",elevenKey:"",...DB.getSettings()}));
  const [memory,    setMemory]   = useState(()=>DB.getMemory());
  const [todos,     setTodos]    = useState(()=>DB.getTasks());
  const [openTabs,  setOpenTabs] = useState([]);
  const [expModal,  setExpModal] = useState(null);
  const [toast,     setToast]    = useState(null);
  const [newApp,    setNewApp]   = useState({name:"",url:"",aliases:"",icon:"🔗",desc:""});
  const [showTodos, setShowTodos]= useState(false);

  const recRef       = useRef(null);
  const chatEnd      = useRef(null);
  const speakingR    = useRef(false);
  const thinkingR    = useRef(false);
  const micOkR       = useRef(false);
  const pausedR      = useRef(false);
  const appsR        = useRef(apps);
  const settingsR    = useRef(settings);
  const memoryR      = useRef(memory);
  const todosR       = useRef(todos);
  const startMicRef  = useRef(null);
  const onSpeechRef  = useRef(null);

  speakingR.current = speaking; thinkingR.current = thinking;
  micOkR.current = micOk; appsR.current = apps;
  settingsR.current = settings; memoryR.current = memory; todosR.current = todos;

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  useEffect(()=>{
    const d=DB.getExpiry("groq");
    if(d){const days=Math.ceil((new Date(d)-new Date())/86400000);if(days<=7)setExpModal({days:Math.max(0,days)});}
  },[]);

  const refreshTabs = useCallback(()=>setOpenTabs(TabManager.getOpen()),[]);
  const notify      = useCallback((msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);},[]);
  const saveSetting = useCallback(p=>{setSettings(prev=>{const n={...prev,...p};DB.setSettings(n);return n;});},[]);
  const addMsg      = useCallback((role,content)=>{const m={role,content,ts:Date.now()};setMsgs(prev=>[...prev,m]);DB.pushHistory(m);},[]);
  const updateMemory= useCallback((key,value)=>{const m=DB.getMemory();m.facts=m.facts||{};m.facts[key]=value;DB.setMemory(m);setMemory({...m});},[]);
  const addTodo     = useCallback(text=>{const t=[...DB.getTasks(),{text,done:false,ts:Date.now()}];DB.setTasks(t);setTodos(t);},[]);
  const doneTodo    = useCallback(idx=>{const t=[...DB.getTasks()];if(t[idx])t[idx].done=true;DB.setTasks(t);setTodos(t);},[]);
  const stopMic     = useCallback((manual=false)=>{
    pausedR.current=manual;
    try{recRef.current?.abort();}catch{}
    recRef.current=null;setListening(false);setInterim("");
    if(manual)setStatus("Mic paused — tap orb to restart");
  },[]);

  const elevenKey = useCallback(()=>settingsR.current.elevenKey,[]);

  // ── Execute agent actions
  const executeActions = useCallback((actions=[])=>{
    for(const a of actions){
      if(a.type==="OPEN_URL" && a.url){
        TabManager.open(a.id||"tab", a.url, Array.isArray(a.aliases)?a.aliases:[]);
        refreshTabs();
      }
      else if(a.type==="CLOSE_TAB"){
        const id = a.id||a.name||"";
        // Try exact id first, then fuzzy
        if(!TabManager.closeById(id)) TabManager.close(id);
        refreshTabs();
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
  },[refreshTabs,updateMemory,addTodo,doneTodo]);

  // ── Core speech handler
  const onSpeech = useCallback(async text=>{
    if(!text.trim()) return;
    addMsg("user",text);

    if(!settingsR.current.apiKey?.trim()){
      const r=`Arey ${rnd(TITLES)}, Groq API key add cheyyi ra! Settings ki velthunna.`;
      addMsg("assistant",r); setSpeaking(true);
      TTS.speak(r,()=>{setSpeaking(false);},settingsR.current.elevenKey);
      setTimeout(()=>setScreen("settings"),1200); return;
    }

    setThinking(true);setStatus("Thinking ra…");setEmotion("thinking");
    try{
      const result = await callAgent(
        text, DB.getHistory().slice(-12),
        memoryR.current, todosR.current, settingsR.current.apiKey
      );
      const speech  = result.speech||`Seri ${rnd(TITLES)}, chesanu!`;
      const actions = result.actions||[];
      const emo     = result.emotion||"happy";

      addMsg("assistant",speech);
      executeActions(actions);
      setThinking(false); setEmotion(emo); setSpeaking(true); setStatus("Speaking…");

      TTS.speak(speech,()=>{
        setSpeaking(false); setStatus("Listening ra… bolte raho"); setEmotion("idle");
        if(!pausedR.current) setTimeout(()=>startMicRef.current?.(),500);
      }, settingsR.current.elevenKey);

    }catch(err){
      setThinking(false); setEmotion("idle");
      const is401   = err.message.includes("401")||err.message.toLowerCase().includes("invalid");
      const isQuota = err.message.includes("429")||err.message.toLowerCase().includes("rate");
      const r = err.message==="NO_KEY"||is401
        ? `Arey ${rnd(TITLES)}, Groq key wrong ra! Settings lo correct key paste cheyyi.`
        : isQuota
        ? `Aiyo ${rnd(TITLES)}, rate limit hit ra. Oka minute wait cheyyi!`
        : `Aiyo ${rnd(TITLES)}, connection issue ra. Once more try cheyyi!`;
      addMsg("assistant",r);
      TTS.speak(r,()=>{setSpeaking(false);if(!pausedR.current&&!is401)setTimeout(()=>startMicRef.current?.(),600);},
        settingsR.current.elevenKey);
      if(is401) setTimeout(()=>setScreen("settings"),1500);
    }
  },[addMsg,executeActions]);
  onSpeechRef.current = onSpeech;

  // ── Continuous mic loop
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
      setStatus(`Mic error: ${e.error} — tap orb`);recRef.current=null;
    };
    rec.onend=()=>{
      setListening(false);setInterim("");
      if(!speakingR.current&&!thinkingR.current&&!pausedR.current&&recRef.current===rec){recRef.current=null;setTimeout(()=>startMicRef.current?.(),350);}
      if(recRef.current===rec)recRef.current=null;
    };
    recRef.current=rec;
    try{rec.start();}catch{recRef.current=null;setStatus("Mic failed — tap orb to retry");}
  },[]);
  startMicRef.current = startMic;

  const onMicAllow=useCallback(()=>{
    setMicOk(true);micOkR.current=true;pausedR.current=false;setScreen("main");
    setTimeout(()=>{
      const g=timeGreeting(DB.getSettings().userName||"");
      addMsg("assistant",g);setSpeaking(true);setStatus("Speaking…");setEmotion("happy");
      TTS.speak(g,()=>{setSpeaking(false);setEmotion("idle");setStatus("Listening ra… bolte raho");startMicRef.current?.();},
        DB.getSettings().elevenKey||"");
    },400);
  },[addMsg]);

  const onMicSkip=useCallback(()=>{
    setMicOk(false);micOkR.current=false;pausedR.current=true;setScreen("main");
    setTimeout(()=>addMsg("assistant",timeGreeting(DB.getSettings().userName||"")),400);
  },[addMsg]);

  const sendText=useCallback(async()=>{
    const text=input.trim(); if(!text||thinkingR.current) return;
    TTS.unlock(); setInput("");
    try{recRef.current?.abort();}catch{} setListening(false); recRef.current=null;
    await onSpeechRef.current(text);
  },[input]);

  const interrupt  =useCallback(()=>{TTS.stop();setSpeaking(false);setEmotion("idle");pausedR.current=false;setTimeout(()=>startMicRef.current?.(),300);},[]);
  const toggleMic  =useCallback(()=>{TTS.unlock();if(listening)stopMic(true);else{pausedR.current=false;startMicRef.current?.();}},[listening,stopMic]);

  // Orb style by emotion + state
  const orbStyle = listening
    ? {border:"2px solid rgba(255,107,107,0.8)",bg:"radial-gradient(circle,#1a0505,#020510)",scale:"scale(1.1)"}
    : speaking
    ? {border:"2px solid rgba(0,198,255,0.9)",bg:"radial-gradient(circle,#050d1a,#020510)",scale:"scale(1.07)"}
    : emotion==="happy"    ? {border:"1.5px solid rgba(0,229,160,0.5)",bg:"radial-gradient(circle,#051a10,#020510)",scale:"scale(1)"}
    : emotion==="excited"  ? {border:"2px solid rgba(0,198,255,0.7)",bg:"radial-gradient(circle,#050d2a,#020510)",scale:"scale(1)"}
    : emotion==="empathetic"?{border:"1.5px solid rgba(255,150,200,0.5)",bg:"radial-gradient(circle,#1a0510,#020510)",scale:"scale(1)"}
    : emotion==="thinking" ? {border:"1.5px solid rgba(255,209,102,0.5)",bg:"radial-gradient(circle,#1a1000,#020510)",scale:"scale(1)"}
    : {border:"1.5px solid rgba(0,114,255,0.3)",bg:"radial-gradient(circle at 38% 32%,#050d2a,#020510)",scale:"scale(1)"};

  // ── SETTINGS SCREEN
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

        <Sec label="Groq API Key 🆓 AI Brain (Free)">
          <div style={{fontSize:12,color:"#555",lineHeight:1.85,background:"rgba(0,229,160,0.04)",border:"1px solid rgba(0,229,160,0.1)",borderRadius:9,padding:"11px 13px",marginBottom:10}}>
            🆓 <b style={{color:"#00e5a0"}}>100% FREE!</b> <b style={{color:"#aaa"}}>console.groq.com</b> → Sign in → API Keys → Create → paste ra.
          </div>
          <input style={{...S.inp,background:settings.apiKey?"rgba(0,229,160,0.05)":"rgba(255,100,100,0.06)",border:settings.apiKey?"1px solid rgba(0,229,160,0.25)":"1px solid rgba(255,100,100,0.3)",fontFamily:"monospace",fontSize:12}}
            type="password" placeholder="gsk_... paste cheyyi ra" value={settings.apiKey||""} onChange={e=>saveSetting({apiKey:e.target.value})}/>
          <div style={{fontSize:11,marginTop:6,color:settings.apiKey?"#00e5a0":"#ff7070"}}>{settings.apiKey?"✅ Groq ready ra!":"⚠️ Groq key ledu ra!"}</div>
        </Sec>

        <Sec label="ElevenLabs Voice Key 🎙️ Invika's Real Girl Voice">
          <div style={{fontSize:12,color:"#555",lineHeight:1.85,background:"rgba(0,114,255,0.04)",border:"1px solid rgba(0,114,255,0.12)",borderRadius:9,padding:"11px 13px",marginBottom:10}}>
            <b style={{color:"#6699ff"}}>🎙️ Invika's real Indian girl voice — Deepa!</b><br/>
            <span style={{color:"#555"}}>Free: 10,000 chars/month (plenty for daily use ra)</span><br/>
            <span style={{color:"#444",fontSize:11}}>1. <b style={{color:"#aaa"}}>elevenlabs.io</b> → Sign up free (Google login)</span><br/>
            <span style={{color:"#444",fontSize:11}}>2. Profile → API Key → copy</span><br/>
            <span style={{color:"#444",fontSize:11}}>3. Paste below → Invika sounds like a real Telugu girl! 💙</span><br/>
            <span style={{color:"#333",fontSize:10}}>Without this: browser voice used (may be male on some phones)</span>
          </div>
          <input style={{...S.inp,background:settings.elevenKey?"rgba(0,114,255,0.06)":"rgba(255,255,255,0.03)",border:settings.elevenKey?"1px solid rgba(0,114,255,0.35)":"1px solid rgba(255,255,255,0.08)",fontFamily:"monospace",fontSize:12}}
            type="password" placeholder="sk_... ElevenLabs key paste cheyyi" value={settings.elevenKey||""} onChange={e=>saveSetting({elevenKey:e.target.value})}/>
          <div style={{fontSize:11,marginTop:6,color:settings.elevenKey?"#6699ff":"#666"}}>
            {settings.elevenKey?"✅ Deepa voice active — Invika sounds like a real girl ra! 🎙️":"💡 Add for authentic Indian female voice!"}
          </div>
        </Sec>

        <Sec label="Memory — What Invika Knows">
          {Object.keys(memory.facts||{}).length>0
            ?Object.entries(memory.facts).map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",fontSize:12}}>
                  <span style={{color:"#666"}}>{k}</span><span style={{color:"#bbb"}}>{v}</span>
                </div>))
            :<div style={{fontSize:12,color:"#444"}}>Emi ledu — mee gurinchi cheppindi remember chestundi ra!</div>}
        </Sec>

        <Sec label="Groq Key Expiry Alert">
          <input style={S.inp} type="date" defaultValue={DB.getExpiry("groq")||""} onChange={e=>DB.setExpiry("groq",e.target.value)}/>
        </Sec>

        <div style={{padding:"0 20px 40px"}}>
          <button style={S.dangerBtn} onClick={()=>{
            if(!confirm("Anni clear cheyyanaa?"))return;
            localStorage.clear();setMsgs([]);setApps(DEFAULT_APPS);
            setMemory(DB.getMemory());setTodos([]);
            saveSetting({userName:"",apiKey:"",elevenKey:""});
            notify("Done ra! Fresh start!");
          }}>Clear All Memory & Data</button>
        </div>
      </div>
    </div>
  );

  // ── APPS SCREEN
  if(screen==="apps") return(
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={()=>setScreen("main")}>← Back</button>
        <span style={{fontSize:15,fontWeight:600,color:"#e0e0f0"}}>App Registry</span>
        <span style={{width:56}}/>
      </div>
      <div style={S.scroll}>
        <Sec label="All Apps">
          {apps.map((app,i)=>(
            <div key={app.id} style={S.appRow}>
              <span style={{fontSize:20,width:28,textAlign:"center"}}>{app.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,color:"#d0d0e0",fontWeight:600}}>{app.name}</div>
                <div style={{fontSize:10,color:"#444",marginTop:1}}>{app.desc}</div>
              </div>
              <button style={S.rmBtn} onClick={()=>{const n=apps.filter((_,j)=>j!==i);setApps(n);DB.setApps(n);}}>✕</button>
            </div>
          ))}
        </Sec>
        <Sec label="Add New App">
          <input style={S.inp} placeholder="App Name" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})}/>
          <input style={{...S.inp,marginTop:7}} placeholder="URL (https://...)" value={newApp.url} onChange={e=>setNewApp({...newApp,url:e.target.value})}/>
          <input style={{...S.inp,marginTop:7}} placeholder="Voice aliases, comma separated" value={newApp.aliases} onChange={e=>setNewApp({...newApp,aliases:e.target.value})}/>
          <input style={{...S.inp,marginTop:7}} placeholder="Description" value={newApp.desc} onChange={e=>setNewApp({...newApp,desc:e.target.value})}/>
          <div style={{display:"flex",gap:7,marginTop:7,flexWrap:"wrap"}}>
            {["🔗","🏥","🎵","🎬","📺","🛒","📰","💰","🎮","🏦","📱","🔬"].map(ic=>(
              <button key={ic} style={{...S.icoBtn,...(newApp.icon===ic?{border:"1px solid rgba(0,229,160,0.5)",background:"rgba(0,229,160,0.08)"}:{})}} onClick={()=>setNewApp({...newApp,icon:ic})}>{ic}</button>
            ))}
          </div>
          <button style={S.addBtn} onClick={()=>{
            if(!newApp.name||!newApp.url){notify("Name and URL ivvali ra","err");return;}
            const a={id:Date.now().toString(),name:newApp.name,url:newApp.url,
              aliases:newApp.aliases.split(",").map(x=>x.trim()).filter(Boolean),
              icon:newApp.icon,desc:newApp.desc||newApp.name};
            const n=[...apps,a];setApps(n);DB.setApps(n);
            setNewApp({name:"",url:"",aliases:"",icon:"🔗",desc:""});
            notify("App add chesanu ra!");
          }}>Add App</button>
        </Sec>
      </div>
    </div>
  );

  // ── PERMISSION SCREEN
  if(screen==="perm") return <PermScreen onAllow={onMicAllow} onSkip={onMicSkip}/>;

  // ── MAIN SCREEN
  return(
    <div style={S.page} onClick={()=>TTS.unlock()}>

      {toast&&<div style={{...S.toast,...(toast.type==="err"
        ?{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.3)",color:"#ff8888"}
        :{background:"rgba(0,229,160,0.12)",border:"1px solid rgba(0,229,160,0.28)",color:"#00e5a0"})}}>{toast.msg}</div>}

      {expModal&&(
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{fontSize:40,marginBottom:8}}>⚠️</div>
            <div style={{fontSize:16,fontWeight:700,color:"#ffd166",marginBottom:10}}>
              {expModal.days===0?"Groq Key Expired ra!":"Groq Key Expire Avutundi!"}
            </div>
            <div style={{fontSize:13,color:"#777",lineHeight:1.8}}>
              {expModal.days===0?"Aiyo, key expire aipoyindi. Renew cheyyi!":
               `Key ${expModal.days} day${expModal.days===1?"":"s"} lo expire avutundi ra.`}
            </div>
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button style={S.mprim} onClick={()=>{setExpModal(null);setScreen("settings");}}>Settings</button>
              <button style={S.msec}  onClick={()=>setExpModal(null)}>Okay Ra</button>
            </div>
          </div>
        </div>
      )}

      {/* No key banner */}
      {!settings.apiKey&&(
        <div style={{background:"rgba(255,150,0,0.1)",borderBottom:"1px solid rgba(255,150,0,0.2)",padding:"6px 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"#ffaa00"}}>🆓 Groq key ledu — console.groq.com free ra!</span>
          <button style={{background:"#ffaa00",border:"none",borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer"}} onClick={()=>setScreen("settings")}>Add Key →</button>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={{display:"flex",gap:4}}>
          <button style={S.iconBtn} onClick={()=>setScreen("apps")} title="Apps"><GridIcon/></button>
          <button style={{...S.iconBtn,position:"relative"}} onClick={()=>setShowTodos(v=>!v)} title="Todos">
            <span style={{fontSize:16}}>✅</span>
            {todos.filter(t=>!t.done).length>0&&<span style={{position:"absolute",top:4,right:4,width:7,height:7,borderRadius:"50%",background:"#ff6b6b"}}/>}
          </button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <HexIcon size={22}/>
          <div>
            <div style={{fontSize:18,fontWeight:900,letterSpacing:"0.1em",color:"#eeeef8",lineHeight:1.1}}>Invika</div>
            <div style={{fontSize:9,color:"#2a3a6a",letterSpacing:"0.08em"}}>mee personal AI girl 💙</div>
          </div>
        </div>
        <button style={S.iconBtn} onClick={()=>setScreen("settings")} title="Settings"><GearIcon/></button>
      </div>

      {/* Todo panel */}
      {showTodos&&(
        <div style={{background:"#080818",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 16px",maxHeight:180,overflowY:"auto"}}>
          <div style={{fontSize:9,fontWeight:700,color:"#2a2a4a",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Todo List</div>
          {todos.length===0
            ?<div style={{fontSize:12,color:"#444"}}>Emi ledu ra — "remind me to..." cheppu!</div>
            :todos.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                <button onClick={()=>doneTodo(i)} style={{background:"none",border:`1px solid ${t.done?"#00e5a0":"#333"}`,borderRadius:4,width:16,height:16,cursor:"pointer",flexShrink:0,color:"#00e5a0",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>
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
        <div style={{display:"flex",gap:5,padding:"5px 14px",borderBottom:"1px solid rgba(255,255,255,0.04)",flexWrap:"wrap"}}>
          {openTabs.map(name=>(
            <div key={name} style={{display:"flex",alignItems:"center",gap:4,background:"rgba(0,114,255,0.1)",border:"1px solid rgba(0,114,255,0.25)",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#6699ff",flexShrink:0}}>
              <span>{name}</span>
              <button style={{background:"none",border:"none",color:"#6699ff",cursor:"pointer",padding:"0 2px",fontSize:11,lineHeight:1}} onClick={()=>{TabManager.closeById(name);refreshTabs();}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Status */}
      <div style={S.statusBar}>
        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,transition:"background 0.3s",
          background:speaking?"#00e5a0":listening?"#ff6b6b":thinking?"#ffd166":"#222"}}/>
        <span style={{fontSize:11,color:"#444",flex:1,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {interim?`"${interim}"`:status}
        </span>
        {/* Voice indicator */}
        <span style={{fontSize:10,color:settings.elevenKey?"#6699ff":"#333",marginRight:4}}>
          {settings.elevenKey?"🎙️ Deepa":"🔊 Browser"}
        </span>
        {micOk&&(
          <button style={{...S.micPill,...(listening?{color:"#ff6b6b",borderColor:"rgba(255,107,107,0.3)"}:{})}} onClick={toggleMic}>
            {listening?<PauseIcon/>:<MicIcon/>}
            <span style={{fontSize:9,marginLeft:3}}>{listening?"Pause":"Mic"}</span>
          </button>
        )}
      </div>

      {/* Orb */}
      <div style={S.orbArea}>
        {(listening||speaking)&&<div style={{...S.ring,borderColor:listening?"rgba(255,107,107,0.25)":"rgba(0,198,255,0.2)"}}/>}
        {(listening||speaking)&&<div style={{...S.ring,width:150,height:150,animationDelay:"0.4s",opacity:.4,borderColor:listening?"rgba(255,107,107,0.1)":"rgba(0,198,255,0.08)"}}/>}
        <div style={{...S.orb,background:orbStyle.bg,border:orbStyle.border,transform:orbStyle.scale}}
          onClick={()=>{if(speaking){interrupt();return;}if(!micOk){notify("Mic permission nahi ra","err");return;}toggleMic();}}>
          <div style={S.orbInner}>
            {thinking?<Dots/>:speaking?<Wave/>:listening?<Listen/>:<HexIcon size={44}/>}
          </div>
        </div>
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",fontSize:14,opacity:0.65}}>
          {emotion==="happy"?"😊":emotion==="excited"?"🤩":emotion==="empathetic"?"🤗":emotion==="thinking"?"🤔":emotion==="focused"?"🎯":emotion==="playful"?"😄":""}
        </div>
      </div>

      <div style={{textAlign:"center",fontSize:11,color:"#1a1a3a",padding:"6px 0 2px",letterSpacing:"0.04em"}}>
        {listening?"👂 Listening — bolte raho ra"
         :speaking?"🔊 Speaking — tap to interrupt"
         :thinking?"🧠 Thinking ra…"
         :micOk?"Tap orb or type below ra"
         :"Type cheyyi ra"}
      </div>

      {/* Chat */}
      <div style={S.chat}>
        {msgs.length===0&&(
          <div style={S.empty}>
            {/* Welcome */}
            <div style={{fontSize:18,fontWeight:300,color:"#a0a0c0",marginBottom:2}}>
              Hello, {settings.userName||"there"} 👋
            </div>
            <div style={{fontSize:11,color:"#2a2a4a",marginBottom:18}}>
              I'm Invika — your personal AI agent. Speak or type anything.
            </div>

            {/* Featured Apps — ThinkCare & HurryUp */}
            <div style={{width:"100%",marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"#2a3a5a",textTransform:"uppercase",marginBottom:10}}>
                Featured Apps
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,padding:"0 4px"}}>
                {/* ThinkCare */}
                <div style={{background:"linear-gradient(135deg,rgba(0,229,160,0.08),rgba(0,114,255,0.05))",border:"1px solid rgba(0,229,160,0.2)",borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}
                  onClick={()=>{TTS.unlock();TabManager.open("thinkcare","https://thinkare.lovable.app/",["thinkcare","healthcare","health"]);setOpenTabs(TabManager.getOpen());}}>
                  <div style={{fontSize:26,marginBottom:8}}>🏥</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#00e5a0",marginBottom:3}}>ThinkCare</div>
                  <div style={{fontSize:10,color:"#4a6a5a",lineHeight:1.5}}>Healthcare Platform — book appointments, track health</div>
                  <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:5,background:"rgba(0,229,160,0.12)",border:"1px solid rgba(0,229,160,0.25)",borderRadius:7,padding:"4px 10px",fontSize:10,color:"#00e5a0",fontWeight:600}}>
                    <span>↗</span> Open App
                  </div>
                </div>
                {/* HurryUp */}
                <div style={{background:"linear-gradient(135deg,rgba(0,114,255,0.08),rgba(0,198,255,0.05))",border:"1px solid rgba(0,114,255,0.2)",borderRadius:14,padding:"14px 12px",cursor:"pointer",textAlign:"left",transition:"all 0.2s"}}
                  onClick={()=>{TTS.unlock();TabManager.open("hurryup","https://hurryup-buddy.vercel.app/",["hurryup","hurry up","commuter","hurry"]);setOpenTabs(TabManager.getOpen());}}>
                  <div style={{fontSize:26,marginBottom:8}}>🚌</div>
                  <div style={{fontSize:13,fontWeight:700,color:"#00c6ff",marginBottom:3}}>HurryUp</div>
                  <div style={{fontSize:10,color:"#3a5a6a",lineHeight:1.5}}>Commuter App — bus timings, routes & live tracking</div>
                  <div style={{marginTop:10,display:"inline-flex",alignItems:"center",gap:5,background:"rgba(0,114,255,0.12)",border:"1px solid rgba(0,114,255,0.25)",borderRadius:7,padding:"4px 10px",fontSize:10,color:"#00c6ff",fontWeight:600}}>
                    <span>↗</span> Open App
                  </div>
                </div>
              </div>
            </div>

            {/* Quick commands */}
            <div style={{width:"100%",marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",color:"#2a3a5a",textTransform:"uppercase",marginBottom:8}}>
                Try Saying
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center"}}>
                {[
                  "Open ThinkCare","Open HurryUp",
                  "Play chikiri chikiri","Navigate Hyderabad to Vijayawada",
                  "Search wireless mic on Amazon","Send mail to Thiru subject meeting",
                  "Remind me to call Ravi","What can you do?",
                ].map(s=>(
                  <button key={s} style={S.chip} onClick={()=>{TTS.unlock();onSpeechRef.current(s);}}>
                    {s}
                  </button>
                ))}
              </div>
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
        {thinking&&<div style={{alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",padding:"9px 13px",borderRadius:15}}><Dots inline/></div>}
        <div ref={chatEnd}/>
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        {speaking&&<button style={S.intBtn} onClick={interrupt}>⏹ Interrupt — nenu matladali ra</button>}
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input style={S.textInput} value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText();}}}
            placeholder={listening?"Listening… bolte raho":"Type cheyyi ra…"} disabled={thinking}/>
          <button style={{...S.sendBtn,opacity:input.trim()&&!thinking?1:0.3}} onClick={sendText} disabled={!input.trim()||thinking}>
            <SendIcon/>
          </button>
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
        <linearGradient id="iG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00c6ff"/><stop offset="50%" stopColor="#0072ff"/><stop offset="100%" stopColor="#003acc"/>
        </linearGradient>
        <radialGradient id="iP" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff"/><stop offset="35%" stopColor="#7df9ff"/><stop offset="100%" stopColor="#0072ff" stopOpacity="0"/>
        </radialGradient>
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
  page:     {display:"flex",flexDirection:"column",height:"100dvh",minHeight:580,background:"#050510",color:"#e0e0f0",fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",overflow:"hidden",position:"relative"},
  topBar:   {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  backBtn:  {background:"none",border:"none",color:"#0072ff",cursor:"pointer",fontSize:14,padding:"6px 10px"},
  iconBtn:  {background:"none",border:"none",color:"#444",cursor:"pointer",padding:6,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",width:34,height:34},
  statusBar:{display:"flex",alignItems:"center",gap:7,padding:"5px 16px",borderBottom:"1px solid rgba(255,255,255,0.03)"},
  micPill:  {display:"flex",alignItems:"center",background:"none",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:"3px 8px",color:"#444",cursor:"pointer",gap:2},
  orbArea:  {display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 0 4px",position:"relative",minHeight:130},
  orb:      {width:96,height:96,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.3s ease",cursor:"pointer",position:"relative",zIndex:2},
  orbInner: {width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"},
  ring:     {position:"absolute",width:124,height:124,borderRadius:"50%",border:"1px solid rgba(0,114,255,0.2)",animation:"ringOut 2.2s infinite ease-out",zIndex:1},
  chat:     {flex:1,overflowY:"auto",padding:"8px 13px",display:"flex",flexDirection:"column",gap:8,scrollbarWidth:"thin",scrollbarColor:"#0d0d20 transparent"},
  empty:    {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,textAlign:"center",paddingTop:8},
  bubble:   {maxWidth:"84%",padding:"8px 12px",borderRadius:14,fontSize:13.5,lineHeight:1.7,wordBreak:"break-word",whiteSpace:"pre-wrap",animation:"fadeIn 0.25s ease"},
  chip:     {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"4px 11px",fontSize:11,color:"#555",cursor:"pointer"},
  inputArea:{padding:"8px 13px 12px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  intBtn:   {width:"100%",marginBottom:6,background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.2)",color:"#ff7070",borderRadius:9,padding:"6px",fontSize:11,cursor:"pointer"},
  textInput:{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:"10px 14px",color:"#e0e0f0",fontSize:14,outline:"none"},
  sendBtn:  {width:42,height:42,borderRadius:"50%",background:"linear-gradient(135deg,#0072ff,#00c6ff)",border:"none",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  toast:    {position:"absolute",top:52,left:"50%",transform:"translateX(-50%)",borderRadius:9,padding:"6px 14px",fontSize:11,zIndex:200,whiteSpace:"nowrap",maxWidth:"90%"},
  overlay:  {position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20},
  modal:    {background:"#0a0a18",border:"1px solid rgba(255,200,0,0.18)",borderRadius:18,padding:"26px 22px",maxWidth:320,width:"100%",textAlign:"center"},
  mprim:    {flex:1,background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.28)",color:"#ffd166",borderRadius:9,padding:"9px 12px",fontSize:13,cursor:"pointer"},
  msec:     {flex:1,background:"none",border:"1px solid rgba(255,255,255,0.07)",color:"#555",borderRadius:9,padding:"9px 12px",fontSize:13,cursor:"pointer"},
  scroll:   {flex:1,overflowY:"auto",paddingTop:16},
  inp:      {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"10px 12px",color:"#e0e0f0",fontSize:14,outline:"none",boxSizing:"border-box"},
  lbl:      {display:"block",fontSize:11,color:"#555",marginBottom:5},
  dangerBtn:{width:"100%",background:"rgba(255,50,50,0.07)",border:"1px solid rgba(255,50,50,0.15)",color:"#ff6060",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer"},
  appRow:   {display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  rmBtn:    {background:"none",border:"none",color:"#2a2a3a",cursor:"pointer",fontSize:13,padding:"4px 7px"},
  addBtn:   {width:"100%",marginTop:10,background:"rgba(0,229,160,0.07)",border:"1px solid rgba(0,229,160,0.2)",color:"#00e5a0",borderRadius:9,padding:"10px",fontSize:13,cursor:"pointer",fontWeight:600},
  icoBtn:   {background:"rgba(255,255,255,0.03)",border:"1px solid transparent",borderRadius:7,padding:"5px 7px",fontSize:16,cursor:"pointer"},
};
