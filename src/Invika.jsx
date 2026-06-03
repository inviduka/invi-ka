import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const APP_KEY    = "invika_apps";
const SET_KEY    = "invika_settings";
const HIST_KEY   = "invika_history";
const EXPIRY_KEY = "invika_expiry";

const DEFAULT_APPS = [
  { id:"thinkcare", name:"ThinkCare",   url:"https://thinkare.lovable.app/",      aliases:["thinkcare","healthcare","health","think care"],  icon:"🏥", desc:"Healthcare Platform" },
  { id:"thiru",     name:"Thiru Bio",   url:"https://thirubio.vercel.app/",        aliases:["thiru","thirubio","thiru bio","portfolio"],       icon:"👤", desc:"Portfolio" },
  { id:"hurryup",   name:"HurryUp",     url:"https://hurryup-buddy.vercel.app/",   aliases:["hurryup","hurry up","commuter","hurry"],          icon:"🚌", desc:"Commuter App" },
  { id:"youtube",   name:"YouTube",     url:"https://youtube.com",                 aliases:["youtube","yt","videos","tube"],                   icon:"📺", desc:"Video Platform" },
  { id:"google",    name:"Google",      url:"https://google.com",                  aliases:["google","search engine"],                        icon:"🔍", desc:"Search Engine" },
  { id:"amazon",    name:"Amazon",      url:"https://amazon.in",                   aliases:["amazon","shopping","order"],                     icon:"🛒", desc:"Shopping" },
  { id:"netflix",   name:"Netflix",     url:"https://netflix.com",                 aliases:["netflix","movies","streaming"],                   icon:"🎬", desc:"Streaming" },
  { id:"spotify",   name:"Spotify",     url:"https://spotify.com",                 aliases:["spotify","music","songs","audio"],                icon:"🎵", desc:"Music" },
  { id:"instagram", name:"Instagram",   url:"https://instagram.com",               aliases:["instagram","insta","ig"],                        icon:"📸", desc:"Social Media" },
  { id:"whatsapp",  name:"WhatsApp",    url:"https://web.whatsapp.com",            aliases:["whatsapp","whats app","wa"],                     icon:"💬", desc:"Messaging" },
  { id:"maps",      name:"Google Maps", url:"https://maps.google.com",             aliases:["maps","google maps","navigate","directions"],     icon:"🗺️", desc:"Navigation" },
  { id:"gmail",     name:"Gmail",       url:"https://gmail.com",                   aliases:["gmail","email","mail"],                          icon:"📧", desc:"Email" },
];

// ── SEARCH URL BUILDERS — for agentic "open X and search Y" commands
const SEARCH_ENGINES = {
  google:    q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  youtube:   q => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  amazon:    q => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  flipkart:  q => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  netflix:   q => `https://www.netflix.com/search?q=${encodeURIComponent(q)}`,
  spotify:   q => `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  maps:      q => `https://maps.google.com/maps?q=${encodeURIComponent(q)}`,
  instagram: q => `https://www.instagram.com/explore/tags/${encodeURIComponent(q.replace(/\s+/g,''))}`,
  twitter:   q => `https://twitter.com/search?q=${encodeURIComponent(q)}`,
  linkedin:  q => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`,
  wikipedia: q => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  reddit:    q => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
};

const TITLES = ["ra","boss","anna","bhai","chief","maccha"];
const rnd = arr => arr[Math.floor(Math.random()*arr.length)];

function greeting(name) {
  const h = new Date().getHours();
  const tod = h<12?"morning":h<17?"afternoon":"evening";
  const who = name||"boss";
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
  getApps:     ()    => { try { return JSON.parse(localStorage.getItem(APP_KEY)||"null")||DEFAULT_APPS; } catch { return DEFAULT_APPS; } },
  setApps:     a     => localStorage.setItem(APP_KEY, JSON.stringify(a)),
  getSettings: ()    => { try { return JSON.parse(localStorage.getItem(SET_KEY)||"{}"); } catch { return {}; } },
  setSettings: s     => localStorage.setItem(SET_KEY, JSON.stringify(s)),
  getHistory:  ()    => { try { return JSON.parse(localStorage.getItem(HIST_KEY)||"[]"); } catch { return []; } },
  pushHistory: m     => { const h=DB.getHistory().slice(-59); h.push(m); localStorage.setItem(HIST_KEY,JSON.stringify(h)); },
  getExpiry:   p     => { try { return (JSON.parse(localStorage.getItem(EXPIRY_KEY)||"{}"))[p]||null; } catch { return null; } },
  setExpiry:   (p,d) => { const e=JSON.parse(localStorage.getItem(EXPIRY_KEY)||"{}"); e[p]=d; localStorage.setItem(EXPIRY_KEY,JSON.stringify(e)); },
};

// ─────────────────────────────────────────────────────────────────────────────
// AGENTIC INTENT ENGINE
// Handles: open app, open+search, navigate/directions, general AI
// ─────────────────────────────────────────────────────────────────────────────
function classifyIntent(text, apps) {
  const t = text.toLowerCase().trim();

  // ── Pattern: "open X and search for Y" / "search Y on X" / "find Y on X"
  const searchPatterns = [
    /(?:open|go to|launch)?\s*(\w[\w\s]*?)\s+(?:and\s+)?(?:search(?:\s+for)?|find|look for|look up)\s+(.+)/i,
    /(?:search|find|look for|look up)\s+(.+?)\s+(?:on|in|at|using)\s+(\w[\w\s]*)/i,
    /(?:search|find)\s+(?:for\s+)?(.+?)\s+(?:on|in)\s+(\w[\w\s]*)/i,
  ];

  for (const pat of searchPatterns) {
    const m = text.match(pat);
    if (m) {
      let site, query;
      // First pattern: site=m[1], query=m[2]
      // Second/third: query=m[1], site=m[2]
      if (pat === searchPatterns[0]) { site=m[1].trim().toLowerCase(); query=m[2].trim(); }
      else { query=m[1].trim(); site=m[2].trim().toLowerCase(); }

      // Match site to search engine
      const siteKey = Object.keys(SEARCH_ENGINES).find(k => site.includes(k));
      if (siteKey) return { type:"SEARCH", site:siteKey, query, url:SEARCH_ENGINES[siteKey](query) };

      // Match site to registered app with search
      const app = apps.find(a => [a.name.toLowerCase(),...a.aliases].some(alias => site.includes(alias)));
      if (app) {
        const appKey = Object.keys(SEARCH_ENGINES).find(k => app.name.toLowerCase().includes(k) || app.id.includes(k));
        if (appKey) return { type:"SEARCH", site:app.name, query, url:SEARCH_ENGINES[appKey](query) };
        return { type:"APP", app }; // open app even if no search URL
      }
    }
  }

  // ── Pattern: "navigate to X" / "directions to X" / "take me to X place"
  const navPattern = /(?:navigate|directions?|take me|go)\s+to\s+(.+)/i;
  const navMatch = text.match(navPattern);
  if (navMatch) {
    const dest = navMatch[1].trim();
    // Check if it's a registered app name first
    const appMatch = apps.find(a => [a.name.toLowerCase(),...a.aliases].some(alias => dest.toLowerCase().includes(alias)));
    if (!appMatch) {
      return { type:"SEARCH", site:"maps", query:dest, url:SEARCH_ENGINES.maps(dest) };
    }
  }

  // ── Pattern: open/launch + app name
  const openWords = ["open","launch","start","tolu","tereu","teresuko","peddu","show","take me to","kholo","cheyyi"];
  if (openWords.some(w => t.includes(w))) {
    for (const app of apps) {
      const names = [app.name.toLowerCase(), ...app.aliases.map(a=>a.toLowerCase())];
      if (names.some(n => t.includes(n))) return { type:"APP", app };
    }
    // "open google" without "search" — still open
    for (const [siteKey] of Object.entries(SEARCH_ENGINES)) {
      if (t.includes(siteKey)) return { type:"APP", app:{ name:siteKey, url:`https://${siteKey}.com`, desc:siteKey } };
    }
  }

  if (["settings","configure","api key"].some(w => t.includes(w))) return { type:"SETTINGS" };
  if (t.includes("clear") && ["history","memory","chat"].some(w=>t.includes(w))) return { type:"CLEAR" };
  return { type:"AI" };
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT
// ─────────────────────────────────────────────────────────────────────────────
function sysPrompt(apps, name) {
  const who = name||"boss";
  const appList = apps.map(a=>`${a.name}`).join(", ");
  return `You are Invika — a sharp, warm, witty Telugu-English (Tinglish) AI assistant, like a brilliant close Telugu friend.

TINGLISH STYLE — strictly follow:
• Mix Telugu + English in EVERY response naturally, like urban Telugu people speak.
• "Arey ${who}, that's brilliant ra! Cheyyi adhi." / "Aiyo, adhi chala easy ra!" / "Seri anna, chestunna!"
• Telugu fillers: ra, anna, bhai, arey, aiyo, seri, cheppandi, kavali, undi, ledu, chala, baaga, super, okay ra, maccha.
• SHORT responses — max 2 sentences. Voice assistant ra, not essay writer.
• Never mention any AI company or model. You are simply Invika.
• Address user as: ${who}, boss, anna, ra, maccha — rotate.
• Registered apps: ${appList}.
• ALWAYS Tinglish — never plain English or plain Telugu only.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// GROQ CALL — 100% FREE, no credit card, llama-3.3-70b
// Get free key at console.groq.com — takes 30 seconds ra!
// ─────────────────────────────────────────────────────────────────────────────
async function callAI(history, prompt, apiKey) {
  if (!apiKey || !apiKey.trim()) throw new Error("NO_KEY");
  const messages = [
    { role:"system", content:prompt },
    ...history.map(m => ({ role:m.role, content:m.content }))
  ];
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":`Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 150,
      temperature: 0.85,
    }),
  });
  if (!res.ok) {
    const e = await res.json().catch(()=>({}));
    throw new Error(e.error?.message || `Groq HTTP ${res.status}`);
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content?.trim() || "Em antunnav ra?";
}

// ─────────────────────────────────────────────────────────────────────────────
// TTS — female voice, en-IN for Tinglish
// ─────────────────────────────────────────────────────────────────────────────
const TTS = {
  _synth: typeof window !== "undefined" ? window.speechSynthesis : null,
  _pickFemaleVoice(vs) {
    const femaleNames = [
      "Google UK English Female","Google US English","Microsoft Zira",
      "Microsoft Heera","Microsoft Aria","Samantha","Karen","Moira",
      "Tessa","Veena","Fiona","Priya","Aditi","Raveena","Kajal"
    ];
    for (const name of femaleNames) {
      const v = vs.find(v2 => v2.name===name || v2.name.includes(name));
      if (v) return v;
    }
    const enIN = vs.find(v => v.lang==="en-IN");
    if (enIN) return enIN;
    const byFemale = vs.find(v => v.name.toLowerCase().includes("female"));
    if (byFemale) return byFemale;
    return vs.find(v => v.name.startsWith("Google") && v.lang.startsWith("en")) || vs[0];
  },
  speak(text, cb) {
    if (!this._synth) { cb?.(); return; }
    this.stop();
    const fire = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = this._pickFemaleVoice(this._synth.getVoices());
      u.lang  = u.voice?.lang || "en-IN";
      u.rate  = 0.97;
      u.pitch = 1.3;
      u.onend = ()=>cb?.();
      u.onerror = ()=>cb?.();
      this._synth.speak(u);
    };
    if (!this._synth.getVoices().length) {
      this._synth.addEventListener("voiceschanged", function once() {
        this._synth.removeEventListener("voiceschanged",once); fire();
      }.bind(this));
    } else fire();
  },
  stop() { this._synth?.cancel(); },
};

// ─────────────────────────────────────────────────────────────────────────────
// MIC PERMISSION SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function PermScreen({ onAllow, onSkip }) {
  const [busy,setBusy]=useState(false);
  const [phase,setPhase]=useState("idle");
  const phaseRef=useRef("idle");
  const setP=v=>{phaseRef.current=v;setPhase(v);};

  const allow=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){setP("nosupport");return;}
    setBusy(true);setP("testing");
    const rec=new SR();rec.lang="en-IN";rec.continuous=false;rec.interimResults=false;
    rec.onstart=()=>{try{rec.abort();}catch{}};
    rec.onerror=e=>{
      setBusy(false);
      if(e.error==="not-allowed"||e.error==="service-not-allowed") setP("denied");
      else{setP("granted");setTimeout(()=>onAllow(),500);}
    };
    rec.onend=()=>{setBusy(false);if(phaseRef.current!=="denied"){setP("granted");setTimeout(()=>onAllow(),500);}};
    try{rec.start();}catch{setBusy(false);setP("granted");setTimeout(()=>onAllow(),500);}
  };

  const errMsg=phase==="denied"
    ?"Mic blocked ra. Browser lo 🔒 → Microphone → Allow. Then reload."
    :phase==="nosupport"?"Chrome use cheyyi ra — voice support ledu here.":"";

  return (
    <div style={P.page}>
      <div style={P.card}>
        <div style={P.orbRing}><div style={P.orb}><HexIcon size={48}/></div></div>
        <div style={P.brand}>Invika</div>
        <div style={P.tagline}>mee intelligent voice companion</div>
        <div style={P.divider}/>
        {phase==="granted"
          ?<><div style={{fontSize:36,marginBottom:10}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:"#00e5a0",marginBottom:6}}>Mic Ready Ra!</div>
            <div style={{fontSize:13,color:"#4a5a4a"}}>Invika starting… bolte raho!</div></>
          :<>
            <div style={P.permHead}>🎙️ Mic Permission Kavali</div>
            <div style={P.permText}>
              Invika is voice-first ra. Allow cheyyi — hands-free ga maat laadochu.<br/>
              <span style={{color:"#2a3a2a",fontSize:11}}>Mee voice never recorded or stored avvaadu.</span>
            </div>
            {errMsg&&<div style={P.errBox}>{errMsg}
              {phase==="denied"&&<button style={{marginTop:10,width:"100%",background:"rgba(0,229,160,0.1)",border:"1px solid rgba(0,229,160,0.3)",color:"#00e5a0",borderRadius:8,padding:"8px",fontSize:12,cursor:"pointer"}} onClick={()=>window.location.reload()}>Reload Page</button>}
            </div>}
            {phase!=="denied"&&phase!=="nosupport"&&
              <button style={{...P.allowBtn,opacity:busy?0.6:1}} onClick={allow} disabled={busy}>
                {busy?"Browser prompt kosam chuso…":"🎙️ Allow Microphone"}
              </button>}
            <button style={P.skipBtn} onClick={onSkip}>Skip — keyboard use chestanu</button>
          </>}
      </div>
      <style>{"@keyframes orbFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}"}</style>
    </div>
  );
}

const P={
  page:    {minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#07070f",padding:20},
  card:    {background:"#0c0c1a",border:"1px solid rgba(0,114,255,0.14)",borderRadius:22,padding:"40px 28px",maxWidth:370,width:"100%",textAlign:"center"},
  orbRing: {width:108,height:108,borderRadius:"50%",border:"1.5px solid rgba(0,114,255,0.28)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",animation:"orbFloat 3s ease-in-out infinite",background:"radial-gradient(circle at 38% 35%,#050d2a,#020510)"},
  orb:     {display:"flex",alignItems:"center",justifyContent:"center"},
  brand:   {fontSize:34,fontWeight:900,letterSpacing:"0.1em",color:"#e8e8f8",marginBottom:4},
  tagline: {fontSize:12,color:"#3a4a4a",marginBottom:22,letterSpacing:"0.06em"},
  divider: {height:1,background:"rgba(255,255,255,0.05)",margin:"0 0 20px"},
  permHead:{fontSize:16,fontWeight:600,color:"#c0c8c0",marginBottom:10},
  permText:{fontSize:13,color:"#4a5a4a",lineHeight:1.85,marginBottom:18},
  errBox:  {fontSize:12,color:"#ff8080",background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:9,padding:"9px 13px",marginBottom:14},
  allowBtn:{width:"100%",background:"#00e5a0",border:"none",borderRadius:13,padding:"14px",fontSize:15,fontWeight:800,color:"#000",cursor:"pointer",marginBottom:10},
  skipBtn: {background:"none",border:"none",color:"#333",fontSize:12,cursor:"pointer",padding:6},
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function Invika() {
  const [screen,     setScreen]    = useState("perm");
  const [micOk,      setMicOk]     = useState(false);
  const [msgs,       setMsgs]      = useState(()=>DB.getHistory());
  const [input,      setInput]     = useState("");
  const [listening,  setListening] = useState(false);
  const [speaking,   setSpeaking]  = useState(false);
  const [thinking,   setThinking]  = useState(false);
  const [status,     setStatus]    = useState("Invika ready ra…");
  const [interim,    setInterim]   = useState("");
  const [apps,       setApps]      = useState(()=>DB.getApps());
  const [settings,   setSettings]  = useState(()=>({userName:"",apiKey:"",...DB.getSettings()}));
  const [expModal,   setExpModal]  = useState(null);
  const [toast,      setToast]     = useState(null);
  const [newApp,     setNewApp]    = useState({name:"",url:"",aliases:"",icon:"🔗",desc:""});

  const recRef     = useRef(null);
  const chatEnd    = useRef(null);
  const speakingR  = useRef(false);
  const thinkingR  = useRef(false);
  const micOkR     = useRef(false);
  const pausedR    = useRef(false);
  const appsR      = useRef(apps);
  const settingsR  = useRef(settings);
  const startMicRef= useRef(null);
  const onSpeechRef= useRef(null);

  speakingR.current = speaking;
  thinkingR.current = thinking;
  micOkR.current    = micOk;
  appsR.current     = apps;
  settingsR.current = settings;

  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"});},[msgs]);

  useEffect(()=>{
    for(const p of["groq"]){
      const d=DB.getExpiry(p); if(!d) continue;
      const days=Math.ceil((new Date(d)-new Date())/86400000);
      if(days<=7){setExpModal({provider:p,days:Math.max(0,days)});break;}
    }
  },[]);

  const notify  = useCallback((msg,type="ok")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);},[]);
  const saveSetting = useCallback(patch=>{setSettings(prev=>{const next={...prev,...patch};DB.setSettings(next);return next;});},[]);
  const addMsg  = useCallback((role,content)=>{const m={role,content,ts:Date.now()};setMsgs(prev=>[...prev,m]);DB.pushHistory(m);},[]);

  const stopMic = useCallback((manual=false)=>{
    pausedR.current=manual;
    try{recRef.current?.abort();}catch{}
    recRef.current=null;setListening(false);setInterim("");
    if(manual) setStatus("Mic paused — tap orb to restart");
  },[]);

  // ── SPEECH HANDLER — core agentic logic
  const onSpeech = useCallback(async text=>{
    if(!text.trim()) return;
    addMsg("user",text);

    const intent = classifyIntent(text, appsR.current);

    // ── SEARCH ACTION (agentic)
    if(intent.type==="SEARCH"){
      const reply = `Seri ${rnd(TITLES)}, ${intent.site} lo "${intent.query}" search chestunna — wait cheyyi!`;
      addMsg("assistant",reply);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply,()=>{
        setSpeaking(false);
        window.open(intent.url,"_blank");
        if(!pausedR.current) setTimeout(()=>startMicRef.current?.(),500);
      });
      return;
    }

    // ── OPEN APP
    if(intent.type==="APP"){
      const reply=`Seri ${rnd(TITLES)}, ${intent.app.name} terestunna — wait cheyyi!`;
      addMsg("assistant",reply);
      setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply,()=>{
        setSpeaking(false);
        window.open(intent.app.url,"_blank");
        if(!pausedR.current) setTimeout(()=>startMicRef.current?.(),500);
      });
      return;
    }

    // ── SETTINGS
    if(intent.type==="SETTINGS"){
      const reply=`Seri ${rnd(TITLES)}, settings ki velthunna!`;
      addMsg("assistant",reply);
      TTS.speak(reply,()=>setSpeaking(false));
      setTimeout(()=>setScreen("settings"),800);
      return;
    }

    // ── CLEAR
    if(intent.type==="CLEAR"){
      localStorage.removeItem(HIST_KEY); setMsgs([]);
      const reply=`Done ${rnd(TITLES)}! Memory clear chesanu. Fresh start ra!`;
      addMsg("assistant",reply); setSpeaking(true);
      TTS.speak(reply,()=>{setSpeaking(false);if(!pausedR.current)setTimeout(()=>startMicRef.current?.(),500);});
      return;
    }

    // ── NO KEY CHECK
    if(!settingsR.current.apiKey?.trim()){
      const reply=`Arey ${rnd(TITLES)}, Groq API key add cheyyi ra! Settings ki velthunna — console.groq.com lo free ga teyyi!`;
      addMsg("assistant",reply); setSpeaking(true);
      TTS.speak(reply,()=>{setSpeaking(false);});
      setTimeout(()=>setScreen("settings"),1200);
      return;
    }

    // ── AI CALL
    setThinking(true); setStatus("Thinking ra…");
    try{
      const hist = DB.getHistory().slice(-14);
      const reply = await callAI(hist, sysPrompt(appsR.current, settingsR.current.userName), settingsR.current.apiKey);
      addMsg("assistant",reply);
      setThinking(false); setSpeaking(true); setStatus("Speaking…");
      TTS.speak(reply,()=>{setSpeaking(false);setStatus("Listening ra… bolte raho");if(!pausedR.current)setTimeout(()=>startMicRef.current?.(),500);});
    }catch(err){
      setThinking(false);
      const isNoKey = err.message==="NO_KEY";
      const is401   = err.message.includes("401")||err.message.toLowerCase().includes("invalid")||err.message.toLowerCase().includes("incorrect");
      const isQuota = err.message.includes("429")||err.message.toLowerCase().includes("quota")||err.message.toLowerCase().includes("rate");
      const errReply = isNoKey||is401
        ? `Arey ${rnd(TITLES)}, Groq key wrong undi ra! console.groq.com lo fresh key teyyi, settings lo paste cheyyi.`
        : isQuota
        ? `Aiyo ${rnd(TITLES)}, API rate limit hit aipoyindi ra. Oka minute wait cheyyi then try cheyyi!`
        : `Aiyo ${rnd(TITLES)}, connection issue ra. Check internet and try cheyyi!`;
      addMsg("assistant",errReply);
      TTS.speak(errReply,()=>{setSpeaking(false);if(!pausedR.current&&!isNoKey&&!is401)setTimeout(()=>startMicRef.current?.(),600);});
      if(isNoKey||is401) setTimeout(()=>setScreen("settings"),1500);
    }
  },[addMsg]);
  onSpeechRef.current = onSpeech;

  // ── MIC LOOP
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
        if(e.results[i].isFinal) fin+=t; else intr+=t;
      }
      if(intr) setInterim(intr);
      if(fin.trim()){setInterim("");setListening(false);setStatus("Processing…");recRef.current=null;onSpeechRef.current(fin.trim());}
    };
    rec.onerror=e=>{
      setListening(false);setInterim("");
      if(e.error==="no-speech"){recRef.current=null;if(!speakingR.current&&!thinkingR.current&&!pausedR.current)setTimeout(()=>startMicRef.current?.(),250);return;}
      if(e.error==="aborted"||e.error==="interrupted") return;
      setStatus(`Mic error: ${e.error}`);recRef.current=null;
    };
    rec.onend=()=>{
      setListening(false);setInterim("");
      if(!speakingR.current&&!thinkingR.current&&!pausedR.current&&recRef.current===rec){recRef.current=null;setTimeout(()=>startMicRef.current?.(),300);}
      if(recRef.current===rec) recRef.current=null;
    };
    recRef.current=rec;
    try{rec.start();}catch{recRef.current=null;setStatus("Mic start failed — tap orb to retry");}
  },[]);
  startMicRef.current = startMic;

  const onMicAllow = useCallback(()=>{
    setMicOk(true); micOkR.current=true; pausedR.current=false; setScreen("main");
    setTimeout(()=>{
      const g=greeting(DB.getSettings().userName||"");
      addMsg("assistant",g); setSpeaking(true); setStatus("Speaking…");
      TTS.speak(g,()=>{setSpeaking(false);setStatus("Listening ra… bolte raho");startMicRef.current?.();});
    },400);
  },[addMsg]);

  const onMicSkip = useCallback(()=>{
    setMicOk(false); micOkR.current=false; pausedR.current=true; setScreen("main");
    setTimeout(()=>addMsg("assistant",greeting(DB.getSettings().userName||"")),400);
  },[addMsg]);

  const sendText = useCallback(async()=>{
    const text=input.trim(); if(!text||thinkingR.current) return;
    setInput(""); try{recRef.current?.abort();}catch{} setListening(false); recRef.current=null;
    await onSpeechRef.current(text);
  },[input]);

  const interrupt  = useCallback(()=>{TTS.stop();setSpeaking(false);pausedR.current=false;setTimeout(()=>startMicRef.current?.(),300);},[]);
  const toggleMic  = useCallback(()=>{if(listening)stopMic(true);else{pausedR.current=false;startMicRef.current?.();}},[listening,stopMic]);

  // ── PERMISSION SCREEN
  if(screen==="perm") return <PermScreen onAllow={onMicAllow} onSkip={onMicSkip}/>;

  // ── SETTINGS
  if(screen==="settings") return (
    <div style={S.page}>
      <div style={S.topBar}>
        <button style={S.backBtn} onClick={()=>setScreen("main")}>← Back</button>
        <span style={{fontSize:15,fontWeight:600,color:"#e0e0f0"}}>Settings</span>
        <span style={{width:56}}/>
      </div>
      <div style={S.scroll}>
        <Sec label="Your Name">
          <input style={S.inp} placeholder="Mee peru — Invika use chestundi" value={settings.userName}
            onChange={e=>saveSetting({userName:e.target.value})}/>
        </Sec>

        <Sec label="Groq API Key 🆓 100% Free">
          <div style={{fontSize:12,color:"#555",marginBottom:10,lineHeight:1.8,background:"rgba(0,229,160,0.04)",borderRadius:8,padding:"10px 12px",border:"1px solid rgba(0,229,160,0.1)"}}>
            🆓 <b style={{color:"#00e5a0"}}>Groq is completely FREE ra!</b> No credit card needed.<br/>
            <span style={{color:"#666"}}>1. Go to <b style={{color:"#aaa"}}>console.groq.com</b></span><br/>
            <span style={{color:"#666"}}>2. Sign up with Google (30 seconds)</span><br/>
            <span style={{color:"#666"}}>3. API Keys → Create API Key → copy</span><br/>
            <span style={{color:"#666"}}>4. Paste below ra — done! 14,400 requests/day free 🚀</span>
          </div>
          <input style={{...S.inp,
            background:settings.apiKey?"rgba(0,229,160,0.05)":"rgba(255,100,100,0.06)",
            border:settings.apiKey?"1px solid rgba(0,229,160,0.25)":"1px solid rgba(255,100,100,0.3)",
            fontFamily:"monospace",fontSize:12}}
            type="password"
            placeholder="gsk_... paste cheyyi ra"
            value={settings.apiKey||""}
            onChange={e=>saveSetting({apiKey:e.target.value})}
          />
          <div style={{fontSize:11,marginTop:6,color:settings.apiKey?"#00e5a0":"#ff7070"}}>
            {settings.apiKey?"✅ Key set undi ra — Invika ready!":"⚠️ Key ledu ra — console.groq.com lo teyyi ra!"}
          </div>
        </Sec>

        <Sec label="API Key Expiry Alert">
          <label style={S.lbl}>Groq key expires on</label>
          <input style={S.inp} type="date" defaultValue={DB.getExpiry("groq")||""}
            onChange={e=>DB.setExpiry("groq",e.target.value)}/>
        </Sec>

        <Sec label="About Invika">
          <div style={{fontSize:13,color:"#444",lineHeight:2}}>
            <div>Invika v1.0 — Tinglish AI Assistant</div>
            <div>AI: Groq llama-3.3-70b (Free)</div>
            <div>Voice: Female en-IN (Tinglish)</div>
            <div>Agentic: search, navigate, launch</div>
          </div>
        </Sec>

        <div style={{padding:"0 20px 40px"}}>
          <button style={S.dangerBtn} onClick={()=>{
            if(!confirm("Anni clear cheyyanaa?")) return;
            localStorage.clear(); setMsgs([]); setApps(DEFAULT_APPS); saveSetting({userName:"",apiKey:""});
            notify("Done ra! Fresh start!");
          }}>Clear All Memory</button>
        </div>
      </div>
    </div>
  );

  // ── APPS SCREEN
  if(screen==="apps") return (
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
              <span style={{fontSize:22,width:30,textAlign:"center"}}>{app.icon}</span>
              <div style={{flex:1}}>
                <div style={{fontSize:14,color:"#d0d0e0",fontWeight:600}}>{app.name}</div>
                <div style={{fontSize:11,color:"#444",marginTop:2}}>{app.desc}</div>
              </div>
              <button style={S.rmBtn} onClick={()=>{const n=apps.filter((_,j)=>j!==i);setApps(n);DB.setApps(n);}}>✕</button>
            </div>
          ))}
        </Sec>
        <Sec label="Add New App">
          <input style={S.inp} placeholder="App Name" value={newApp.name} onChange={e=>setNewApp({...newApp,name:e.target.value})}/>
          <input style={{...S.inp,marginTop:8}} placeholder="URL (https://...)" value={newApp.url} onChange={e=>setNewApp({...newApp,url:e.target.value})}/>
          <input style={{...S.inp,marginTop:8}} placeholder="Voice aliases, comma separated" value={newApp.aliases} onChange={e=>setNewApp({...newApp,aliases:e.target.value})}/>
          <input style={{...S.inp,marginTop:8}} placeholder="Description" value={newApp.desc} onChange={e=>setNewApp({...newApp,desc:e.target.value})}/>
          <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
            {["🔗","🏥","🎵","🎬","📺","🛒","📰","💰","🎮","🏦","🔬","📱"].map(ic=>(
              <button key={ic} style={{...S.icoBtn,...(newApp.icon===ic?{border:"1px solid rgba(0,229,160,0.5)",background:"rgba(0,229,160,0.08)"}:{})}} onClick={()=>setNewApp({...newApp,icon:ic})}>{ic}</button>
            ))}
          </div>
          <button style={S.addBtn} onClick={()=>{
            if(!newApp.name||!newApp.url){notify("Name and URL ivvali ra","err");return;}
            const a={id:Date.now().toString(),name:newApp.name,url:newApp.url,aliases:newApp.aliases.split(",").map(x=>x.trim()).filter(Boolean),icon:newApp.icon,desc:newApp.desc};
            const n=[...apps,a];setApps(n);DB.setApps(n);
            setNewApp({name:"",url:"",aliases:"",icon:"🔗",desc:""});
            notify("App add chesanu ra!");
          }}>Add App</button>
        </Sec>
      </div>
    </div>
  );

  // ── MAIN SCREEN
  return (
    <div style={S.page}>
      {/* Toast */}
      {toast&&<div style={{...S.toast,...(toast.type==="err"?{background:"rgba(255,60,60,0.14)",border:"1px solid rgba(255,60,60,0.3)",color:"#ff8888"}:{background:"rgba(0,229,160,0.12)",border:"1px solid rgba(0,229,160,0.28)",color:"#00e5a0"})}}>{toast.msg}</div>}

      {/* Expiry modal */}
      {expModal&&(
        <div style={S.overlay}>
          <div style={S.modal}>
            <div style={{fontSize:42,marginBottom:10}}>⚠️</div>
            <div style={{fontSize:17,fontWeight:700,color:"#ffd166",marginBottom:10}}>
              {expModal.days===0?"API Key Expired ra!":"Key Expire Avutundi!"}
            </div>
            <div style={{fontSize:13,color:"#777",lineHeight:1.8}}>
              {expModal.days===0?`Aiyo ${rnd(TITLES)}, Groq key expire aipoyindi. console.groq.com lo renew cheyyi!`
                :`Groq key ${expModal.days} day${expModal.days===1?"":"s"} lo expire avutundi ${rnd(TITLES)}.`}
            </div>
            <div style={{display:"flex",gap:10,marginTop:18}}>
              <button style={S.modalPrimary} onClick={()=>{setExpModal(null);setScreen("settings");}}>Settings ki Vellu</button>
              <button style={S.modalSecondary} onClick={()=>setExpModal(null)}>Okay Ra</button>
            </div>
          </div>
        </div>
      )}

      {/* No key banner */}
      {!settings.apiKey&&(
        <div style={{background:"rgba(255,150,0,0.1)",borderBottom:"1px solid rgba(255,150,0,0.2)",padding:"7px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
          <span style={{fontSize:11,color:"#ffaa00"}}>🆓 Groq key ledu ra — console.groq.com lo free ga teyyi!</span>
          <button style={{background:"#ffaa00",border:"none",borderRadius:6,padding:"4px 11px",fontSize:11,fontWeight:700,color:"#000",cursor:"pointer",flexShrink:0}} onClick={()=>setScreen("settings")}>Add Key →</button>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <button style={S.iconBtn} onClick={()=>setScreen("apps")} title="Apps"><GridIcon/></button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <HexIcon size={24}/>
          <div>
            <div style={{fontSize:19,fontWeight:900,letterSpacing:"0.1em",color:"#eeeef8",lineHeight:1.1}}>Invika</div>
            <div style={{fontSize:9,color:"#333",letterSpacing:"0.08em"}}>mee personal AI</div>
          </div>
        </div>
        <button style={S.iconBtn} onClick={()=>setScreen("settings")} title="Settings"><GearIcon/></button>
      </div>

      {/* Status */}
      <div style={S.statusBar}>
        <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,transition:"background 0.3s",
          background:speaking?"#00e5a0":listening?"#ff6b6b":thinking?"#ffd166":"#222"}}/>
        <span style={{fontSize:12,color:"#444",flex:1,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
          {interim?`"${interim}"`:status}
        </span>
        {micOk&&(
          <button style={{...S.micPill,...(listening?{color:"#ff6b6b",borderColor:"rgba(255,107,107,0.3)"}:{})}}
            onClick={toggleMic} title={listening?"Pause mic":"Resume mic"}>
            {listening?<PauseIcon/>:<MicIcon/>}
            <span style={{fontSize:10,marginLeft:4}}>{listening?"Pause":"Mic"}</span>
          </button>
        )}
      </div>

      {/* Orb */}
      <div style={S.orbArea}>
        {(listening||speaking)&&<div style={{...S.ring,...(listening?{borderColor:"rgba(255,107,107,0.22)"}:{})}}/>}
        {listening&&<div style={{...S.ring,width:148,height:148,borderColor:"rgba(255,107,107,0.1)",animationDelay:"0.35s"}}/>}
        {speaking&&<div style={{...S.ring,width:148,height:148,borderColor:"rgba(0,114,255,0.08)",animationDelay:"0.35s"}}/>}
        <div style={{
          ...S.orb,
          ...(listening?{border:"2px solid rgba(255,107,107,0.75)",transform:"scale(1.09)"}:{}),
          ...(speaking ?{border:"2px solid rgba(0,198,255,0.9)",transform:"scale(1.06)"}:{}),
          ...(thinking ?{border:"1.5px solid rgba(255,209,102,0.5)"}:{}),
        }} onClick={()=>{if(speaking){interrupt();return;} if(!micOk){notify("Mic permission nahi ra","err");return;} toggleMic();}}>
          <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {thinking?<Dots/>:speaking?<Wave/>:listening?<Listen/>:<HexIcon size={42}/>}
          </div>
        </div>
      </div>

      {/* Hint */}
      <div style={{textAlign:"center",fontSize:11,color:"#2a2a3a",padding:"4px 0 2px",letterSpacing:"0.04em"}}>
        {listening?"👂 Listening — bolte raho ra":speaking?"🔊 Speaking — tap to interrupt":thinking?"🤔 Thinking ra…":micOk?"Tap orb — or type below ra":"Keyboard use cheyyi ra"}
      </div>

      {/* Chat */}
      <div style={S.chat}>
        {msgs.length===0&&(
          <div style={S.empty}>
            <div style={{fontSize:22,fontWeight:300,color:"#a0a0c0",marginBottom:5}}>
              Namaskaram {settings.userName||"boss"}!
            </div>
            <div style={{fontSize:12,color:"#2a2a4a",marginBottom:16}}>Speak or type — Invika ready ra.</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center"}}>
              {[
                "Open ThinkCare","Open HurryUp","Search thiru on Google",
                "Open Amazon and search mic under 500","Nuvvu evaru ra?","Open YouTube and search Telugu songs"
              ].map(s=>(
                <button key={s} style={S.chip} onClick={()=>onSpeechRef.current(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m,i)=>(
          <div key={i} style={{
            ...S.bubble,
            ...(m.role==="user"
              ?{alignSelf:"flex-end",background:"rgba(0,229,160,0.09)",border:"1px solid rgba(0,229,160,0.17)",color:"#b8edd8",borderBottomRightRadius:3}
              :{alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",color:"#c4c4dc",borderBottomLeftRadius:3})
          }}>{m.content}</div>
        ))}
        {thinking&&<div style={{alignSelf:"flex-start",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",padding:"9px 13px",borderRadius:15}}><Dots inline/></div>}
        <div ref={chatEnd}/>
      </div>

      {/* Input */}
      <div style={S.inputArea}>
        {speaking&&<button style={S.interruptBtn} onClick={interrupt}>⏹ Interrupt — nenu matladali ra</button>}
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <input style={S.textInput} value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendText();}}}
            placeholder={listening?"Listening… bolte raho":"Type cheyyi ra…"}
            disabled={thinking}
          />
          <button style={{...S.sendBtn,opacity:input.trim()&&!thinking?1:0.3}} onClick={sendText} disabled={!input.trim()||thinking}>
            <SendIcon/>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce  {0%,80%,100%{transform:scale(.4);opacity:.25}40%{transform:scale(1);opacity:1}}
        @keyframes wave    {from{transform:scaleY(.18)}to{transform:scaleY(1)}}
        @keyframes listenB {0%,100%{transform:scaleY(.28)}50%{transform:scaleY(1)}}
        @keyframes ringOut {0%{transform:scale(1);opacity:.3}100%{transform:scale(1.65);opacity:0}}
        @keyframes fadeIn  {from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Sec({label,children}){
  return <div style={{padding:"0 20px 22px"}}>
    <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.12em",color:"#2a2a4a",textTransform:"uppercase",marginBottom:9}}>{label}</div>
    {children}
  </div>;
}

function HexIcon({size}){
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
      <ellipse cx="65"  cy="72" rx="50" ry="33" fill="none" stroke="url(#invG)" strokeWidth="15" filter="url(#invGlow)"/>
      <ellipse cx="135" cy="72" rx="50" ry="33" fill="none" stroke="url(#invG)" strokeWidth="15" filter="url(#invGlow)"/>
      <ellipse cx="65"  cy="72" rx="37" ry="21" fill="#04080f"/>
      <ellipse cx="135" cy="72" rx="37" ry="21" fill="#04080f"/>
      <circle cx="65"   cy="72" r="12" fill="url(#invP)" filter="url(#invGlow)"/>
      <circle cx="65"   cy="72" r="4.5" fill="#ffffff"/>
      <circle cx="135"  cy="72" r="12" fill="url(#invP)" filter="url(#invGlow)"/>
      <circle cx="135"  cy="72" r="4.5" fill="#ffffff"/>
    </svg>
  );
}

function MicIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0014 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>; }
function PauseIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>; }
function SendIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>; }
function GridIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>; }
function GearIcon()  { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }

function Dots({inline}){
  return <div style={{display:"flex",gap:5,alignItems:"center",justifyContent:"center",padding:inline?"3px 0":0}}>
    {[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:"#00e5a0",animation:`bounce 1.2s ${i*.18}s infinite ease-in-out`}}/>)}
  </div>;
}
function Wave(){
  return <div style={{display:"flex",gap:3,alignItems:"center",justifyContent:"center"}}>
    {[2,4,7,10,13,10,7,4,2].map((h,i)=><div key={i} style={{width:3,height:h*3.6,borderRadius:3,background:"#00e5a0",animation:`wave .48s ${i*.055}s infinite ease-in-out alternate`}}/>)}
  </div>;
}
function Listen(){
  return <div style={{display:"flex",gap:4,alignItems:"center",justifyContent:"center"}}>
    {[1,2,4,5,6,5,4,2,1].map((h,i)=><div key={i} style={{width:3,height:h*5,borderRadius:3,background:"#ff6b6b",opacity:.88,animation:`listenB .65s ${i*.08}s infinite ease-in-out`}}/>)}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S={
  page:        {display:"flex",flexDirection:"column",height:"100vh",minHeight:600,background:"#07070f",color:"#e0e0f0",fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,sans-serif",overflow:"hidden",position:"relative"},
  topBar:      {display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",borderBottom:"1px solid rgba(255,255,255,0.05)"},
  backBtn:     {background:"none",border:"none",color:"#0072ff",cursor:"pointer",fontSize:14,padding:"6px 10px"},
  iconBtn:     {background:"none",border:"none",color:"#444",cursor:"pointer",padding:7,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",width:36,height:36},
  statusBar:   {display:"flex",alignItems:"center",gap:8,padding:"6px 18px",borderBottom:"1px solid rgba(255,255,255,0.03)"},
  micPill:     {display:"flex",alignItems:"center",background:"none",border:"1px solid rgba(255,255,255,0.08)",borderRadius:7,padding:"3px 8px",color:"#444",cursor:"pointer",fontSize:11,gap:2},
  orbArea:     {display:"flex",alignItems:"center",justifyContent:"center",padding:"18px 0 4px",position:"relative",minHeight:130},
  orb:         {width:98,height:98,borderRadius:"50%",background:"radial-gradient(circle at 38% 32%,#050d2a,#020510)",border:"1.5px solid rgba(0,114,255,0.3)",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.28s ease",cursor:"pointer",position:"relative",zIndex:2},
  ring:        {position:"absolute",width:126,height:126,borderRadius:"50%",border:"1px solid rgba(0,114,255,0.2)",animation:"ringOut 2s infinite ease-out",zIndex:1,animationFillMode:"both"},
  chat:        {flex:1,overflowY:"auto",padding:"10px 14px",display:"flex",flexDirection:"column",gap:9,scrollbarWidth:"thin",scrollbarColor:"#12122a transparent"},
  empty:       {display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,textAlign:"center",paddingTop:10},
  bubble:      {maxWidth:"82%",padding:"9px 13px",borderRadius:15,fontSize:14,lineHeight:1.68,wordBreak:"break-word",whiteSpace:"pre-wrap",animation:"fadeIn 0.25s ease"},
  chip:        {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:16,padding:"5px 12px",fontSize:12,color:"#555",cursor:"pointer"},
  inputArea:   {padding:"9px 14px 13px",borderTop:"1px solid rgba(255,255,255,0.05)"},
  interruptBtn:{width:"100%",marginBottom:7,background:"rgba(255,107,107,0.07)",border:"1px solid rgba(255,107,107,0.2)",color:"#ff7070",borderRadius:9,padding:"7px",fontSize:12,cursor:"pointer"},
  textInput:   {flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:22,padding:"10px 15px",color:"#e0e0f0",fontSize:14,outline:"none"},
  sendBtn:     {width:42,height:42,borderRadius:"50%",background:"#00e5a0",border:"none",color:"#000",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  toast:       {position:"absolute",top:54,left:"50%",transform:"translateX(-50%)",borderRadius:9,padding:"7px 15px",fontSize:12,zIndex:200,whiteSpace:"nowrap",maxWidth:"90%"},
  overlay:     {position:"absolute",inset:0,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,padding:20},
  modal:       {background:"#0d0d1c",border:"1px solid rgba(255,200,0,0.18)",borderRadius:18,padding:"28px 22px",maxWidth:330,width:"100%",textAlign:"center"},
  modalPrimary:{flex:1,background:"rgba(255,209,102,0.1)",border:"1px solid rgba(255,209,102,0.28)",color:"#ffd166",borderRadius:9,padding:"10px 12px",fontSize:13,cursor:"pointer"},
  modalSecondary:{flex:1,background:"none",border:"1px solid rgba(255,255,255,0.07)",color:"#555",borderRadius:9,padding:"10px 12px",fontSize:13,cursor:"pointer"},
  scroll:      {flex:1,overflowY:"auto",paddingTop:18},
  inp:         {width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"10px 13px",color:"#e0e0f0",fontSize:14,outline:"none",boxSizing:"border-box"},
  lbl:         {display:"block",fontSize:12,color:"#555",marginBottom:5},
  hint:        {fontSize:12,color:"#333",margin:"0 0 10px",lineHeight:1.7},
  dangerBtn:   {width:"100%",background:"rgba(255,50,50,0.07)",border:"1px solid rgba(255,50,50,0.17)",color:"#ff6060",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer"},
  appRow:      {display:"flex",alignItems:"center",gap:12,padding:"9px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"},
  rmBtn:       {background:"none",border:"none",color:"#2a2a3a",cursor:"pointer",fontSize:14,padding:"4px 8px"},
  addBtn:      {width:"100%",marginTop:12,background:"rgba(0,229,160,0.07)",border:"1px solid rgba(0,229,160,0.22)",color:"#00e5a0",borderRadius:9,padding:"11px",fontSize:13,cursor:"pointer",fontWeight:600},
  icoBtn:      {background:"rgba(255,255,255,0.03)",border:"1px solid transparent",borderRadius:7,padding:"5px 7px",fontSize:17,cursor:"pointer"},
};
