/* ============================================================
   ClínicaBridge — app engine
   Speech recognition scoring, virtual patient, camera encounters,
   latidos/streak progression, onboarding, builder, flashcards.
   ============================================================ */
"use strict";

// ---------------- utilities ----------------
const $ = id => document.getElementById(id);
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => dateKey(new Date());
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateKey(d); };

// escape untrusted strings before any innerHTML interpolation (titles from
// imported JSON, backups, user text) — the only defense the app needs, applied everywhere
const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function toast(msg, ms = 2600) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), ms);
}

const CONF_COLORS = ["#E4007C", "#178A5C", "#F4C542", "#17594E", "#FF74BF"];
function confetti(n = 60) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = CONF_COLORS[i % CONF_COLORS.length];
    p.style.animationDuration = (2 + Math.random() * 2.2) + "s";
    p.style.animationDelay = (Math.random() * .4) + "s";
    p.style.borderRadius = Math.random() > .5 ? "50%" : "2px";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 5200);
  }
}

// ---------------- persistent state ----------------
const LS = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

let profile = LS.get("cb_profile", null); // {name,title,goal,story,struggles[],level,daily,ntfy:{on,topic}}
let settings = LS.get("cb_settings", { dialect: "es-MX", voiceURI: "", voiceAuto: true, rate: 0.95, showEn: true, cam: true, rec: false, reveal: false, uiLang: "es" });
if (settings.uiLang !== "en") settings.uiLang = "es";
if (settings.voiceAuto === undefined) settings.voiceAuto = true;

// L(): instruction-language helper. The Spanish being LEARNED never goes
// through this — only UI chrome, prompts, and coaching do.
const L = (es, en) => settings.uiLang === "en" && en != null ? en : es;
let progress = LS.get("cb_progress", {
  latidos: 0, phrases: 0, encounters: 0, seconds: 0,
  today: { date: todayKey(), latidos: 0 },
  streak: 0, lastGoalDate: "",
  best: {},           // scenarioId -> best %
  drill: {},          // setId -> {idx: bestScore}
  days: {},           // "YYYY-MM-DD" -> latidos that day
  history: []         // [{d, id, title, acc}] newest first
});
let customScenarios = LS.get("cb_custom", []);
let scripts = LS.get("cb_scripts", []); // saved free-practice lists [{id,title,phrases[]}]

// tolerate profiles/progress saved by older versions
if (profile) {
  profile.struggles = profile.struggles || [];
  profile.story = profile.story || "";
  profile.ntfy = profile.ntfy || { on: false, topic: "" };
}
progress.days = progress.days || {};
progress.history = progress.history || [];

function saveAll() {
  LS.set("cb_profile", profile);
  LS.set("cb_settings", settings);
  LS.set("cb_progress", progress);
  LS.set("cb_custom", customScenarios);
  LS.set("cb_scripts", scripts);
}

function displayName() {
  if (!profile) return "";
  return profile.title ? `${profile.title} ${profile.name}` : profile.name;
}

// roll the daily counter if the date changed
function rollDay() {
  if (progress.today.date !== todayKey()) {
    progress.today = { date: todayKey(), latidos: 0 };
  }
  // an unbroken streak means the goal was met today or yesterday
  if (progress.streak && progress.lastGoalDate && progress.lastGoalDate < yesterdayKey()) {
    progress.streak = 0;
  }
}

function awardLatidos(n, quiet) {
  rollDay();
  progress.latidos += n;
  const before = progress.today.latidos;
  progress.today.latidos += n;
  progress.days[todayKey()] = progress.today.latidos;
  // keep the day log tidy (last ~60 days)
  const dk = Object.keys(progress.days).sort();
  while (dk.length > 60) delete progress.days[dk.shift()];
  const goal = profile ? +profile.daily : 40;
  if (before < goal && progress.today.latidos >= goal) {
    // daily goal just met -> streak logic
    if (progress.lastGoalDate === yesterdayKey()) progress.streak += 1;
    else if (progress.lastGoalDate !== todayKey()) progress.streak = 1;
    progress.lastGoalDate = todayKey();
    confetti(80);
    toast(L(`🔥 ¡Meta diaria cumplida, ${displayName()}! Racha: ${progress.streak} día${progress.streak === 1 ? "" : "s"}`,
            `🔥 Daily goal met, ${displayName()}! Streak: ${progress.streak} day${progress.streak === 1 ? "" : "s"}`));
    const mile = progress.streak > 1 && progress.streak % 7 === 0 ? ` ¡${progress.streak} días seguidos — una semana más! 🏆` : "";
    pushNtfy(`Meta diaria cumplida - ${profile ? profile.name : ""}`,
      `💗 ${progress.today.latidos} latidos hoy (meta: ${goal}). Racha: **${progress.streak} días**.${mile} ¡Sigue así!`, "tada");
  } else if (!quiet && n > 0) {
    toast(`+${n} latidos 💗`);
  }
  saveAll();
  renderHeader();
}

// ---------------- ntfy: the cheer channel ----------------
const ascii = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7E]/g, "");
function makeTopic(name) {
  const slug = norm(name || (profile ? profile.name : "") || "amiga").replace(/\s+/g, "").slice(0, 12) || "amiga";
  return `clinicabridge-${slug}-${Math.random().toString(36).slice(2, 6)}`;
}
function pushNtfy(title, body, tags = "sparkling_heart") {
  if (!profile || !profile.ntfy || !profile.ntfy.on || !profile.ntfy.topic) return;
  try {
    fetch("https://ntfy.sh/" + profile.ntfy.topic, {
      method: "POST", body,
      headers: { Title: ascii(title), Tags: tags, Priority: "default", Markdown: "yes" }
    }).catch(() => {});
  } catch {}
}
function ntfyTest(topic, name) {
  const t = topic || (profile && profile.ntfy && profile.ntfy.topic);
  const who = name || (profile ? profile.name : "");
  if (!t) return;
  try {
    fetch("https://ntfy.sh/" + t, {
      method: "POST",
      body: `¡Hola${who ? " " + who : ""}! 💗 Este es tu canal de porras de ClínicaBridge. Cada vez que cumplas tu meta o rompas un récord, te avisamos aquí. ¡Tú puedes!`,
      headers: { Title: "Porra de prueba - ClinicaBridge", Tags: "partying_face", Markdown: "yes" }
    }).then(() => toast("📣 ¡Porra enviada! Revisa tu teléfono.")).catch(() => toast("No se pudo enviar — ¿hay internet?"));
  } catch { toast("No se pudo enviar — ¿hay internet?"); }
}

// ---------------- header / home stats ----------------
const RING_LEN = 65.97;
function renderHeader() {
  rollDay();
  const goal = profile ? +profile.daily : 40;
  $("latidosN").textContent = progress.today.latidos;
  $("goalN").textContent = goal;
  const frac = Math.min(1, progress.today.latidos / goal);
  $("goalFg").style.strokeDashoffset = RING_LEN * (1 - frac);
  $("goalRing").classList.toggle("done", frac >= 1);
  $("streakN").textContent = progress.streak;
  $("statMin").textContent = Math.round(progress.seconds / 60);
  $("statPhrases").textContent = progress.phrases;
  $("statEnc").textContent = progress.encounters;
  if (profile) {
    $("heroGreet").textContent = L(`Hola, ${displayName()} · ¿pasamos consulta?`, `Hi, ${displayName()} · ready to see patients?`);
  }
}

// practice-time ticker: count seconds while in drill or sim view
setInterval(() => {
  if ($("view-drill").classList.contains("active") || $("view-sim").classList.contains("active")) {
    progress.seconds += 1;
    if (progress.seconds % 30 === 0) { saveAll(); renderHeader(); }
  }
}, 1000);

// ---------------- speech: normalization + scoring ----------------
function norm(s) {
  return (s || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}
const tokens = s => norm(s).split(" ").filter(Boolean);

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function wordSim(a, b) {
  if (a === b) return 1;
  const d = lev(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

// align target words against what was said; returns array of "hit"|"close"|"miss"|"pend"
function alignWords(targetToks, saidToks, finalPass) {
  const statuses = new Array(targetToks.length).fill(finalPass ? "miss" : "pend");
  let j = 0;
  for (let i = 0; i < targetToks.length; i++) {
    let found = -1, foundKind = null;
    const lookTo = Math.min(saidToks.length, j + 5);
    for (let k = j; k < lookTo; k++) {
      if (saidToks[k] === targetToks[i]) { found = k; foundKind = "hit"; break; }
    }
    if (found === -1) {
      for (let k = j; k < lookTo; k++) {
        if (wordSim(saidToks[k] || "", targetToks[i]) >= 0.6 && targetToks[i].length > 2) { found = k; foundKind = "close"; break; }
      }
    }
    if (found !== -1) { statuses[i] = foundKind; j = found + 1; }
  }
  return statuses;
}

function scoreFromStatuses(st) {
  if (!st.length) return 0;
  let pts = 0;
  st.forEach(s => { if (s === "hit") pts += 1; else if (s === "close") pts += 0.6; });
  return pts / st.length;
}

// best alignment across target + alternates; returns {score, statuses (for main target), saidToks}
function scorePhrase(targetEs, alts, saidText) {
  const saidToks = tokens(saidText);
  const mainToks = tokens(targetEs);
  const mainSt = alignWords(mainToks, saidToks, true);
  let best = scoreFromStatuses(mainSt);
  (alts || []).forEach(a => {
    const st = alignWords(tokens(a), saidToks, true);
    best = Math.max(best, scoreFromStatuses(st));
  });
  return { score: best, statuses: mainSt, saidToks };
}

// ---------------- speech recognition wrapper ----------------
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
const srSupported = !!SRClass;
if (!srSupported) {
  $("supportBanner").style.display = "block";
  // the talk CTAs can never work — disable them visibly instead of letting them wedge
  ["talkBtn", "drillTalk", "freeTalk"].forEach(id => { const b = $(id); if (b) { b.disabled = true; b.title = "Necesitas Chrome o Edge para hablar"; } });
}

let activeRec = null;
function listenOnce({ onInterim, onFinal, onEnd, onError }) {
  if (!srSupported) { toast(L("Tu navegador no soporta reconocimiento de voz — usa Chrome o Edge.", "Your browser doesn't support speech recognition — use Chrome or Edge.")); return null; }
  stopListening(true); // discard any straggler recognizer so it can't desync the new one
  speechSynthesis.cancel(); // never listen while the patient is mid-sentence
  const rec = new SRClass();
  rec.lang = settings.dialect;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 4;
  let finalText = "", alternatives = [];
  rec.onresult = e => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        finalText += r[0].transcript + " ";
        for (let a = 0; a < r.length; a++) alternatives.push(r[a].transcript);
      } else interim += r[0].transcript;
    }
    if (onInterim) onInterim((finalText + interim).trim());
  };
  rec.onerror = e => {
    if (e.error === "not-allowed") toast(L("Permiso de micrófono denegado — actívalo para practicar.", "Microphone permission denied — enable it to practice."));
    else if (e.error !== "no-speech" && e.error !== "aborted") toast(L("Error de micrófono: ", "Microphone error: ") + e.error);
    if (onError) onError(e.error);
  };
  rec.onend = () => {
    // a discarded (aborted) recognizer must not touch state or fire callbacks —
    // its late onend used to clear the NEW recognizer's tracking and wedge the mic
    if (rec._discard) { if (activeRec === rec) activeRec = null; return; }
    if (activeRec === rec) activeRec = null;
    if (onFinal) onFinal(finalText.trim(), alternatives);
    if (onEnd) onEnd();
  };
  try { rec.start(); activeRec = rec; } catch { /* already started */ }
  return rec;
}
function stopListening(discard) {
  if (activeRec) {
    const r = activeRec;
    activeRec = null;
    try {
      if (discard) { r._discard = true; r.abort(); }
      else r.stop(); // intentional stop: let final results flush to onFinal
    } catch {}
  }
}

// ---------------- text to speech ----------------
// Voice quality lives or dies on voice CHOICE: the default pick on Windows is an
// ancient robotic SAPI voice. We rank every installed Spanish voice — Edge's
// neural "Natural" voices first, then Google's network voices — and auto-pick.
let voices = [];
const FEMALE_HINTS = ["dalia", "sabina", "paloma", "helena", "laura", "elvira", "camila", "lucia", "lucía", "ximena", "salome", "yolanda", "marina", "paulina", "abril", "beatriz", "candela", "carlota", "elena", "esmeralda", "estrella", "irene", "larissa", "renata", "sofia", "sofía", "teresa", "triana", "vera", "female"];
const MALE_HINTS = ["jorge", "raul", "raúl", "pablo", "alvaro", "álvaro", "gerardo", "liberto", "saul", "saúl", "dario", "darío", "cecilio", "luciano", "pelayo", "andres", "andrés", "arnau", "nil", "male"];
function scoreVoice(v) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (n.includes("natural")) s += 100;      // Edge neural voices
  if (n.includes("neural")) s += 80;
  if (n.includes("online")) s += 40;
  if (n.includes("google")) s += 45;        // Chrome network voices
  if (!v.localService) s += 30;             // cloud voices beat local SAPI
  const lang = v.lang.toLowerCase().replace("_", "-");
  if (lang === settings.dialect.toLowerCase()) s += 25;
  else if (lang.startsWith("es-mx") || lang.startsWith("es-us") || lang.startsWith("es-419")) s += 12;
  else if (lang.startsWith("es")) s += 8;
  return s;
}
function bestVoice(gender) {
  if (!voices.length) return null;
  let pool = voices;
  if (gender) {
    const hints = gender === "f" ? FEMALE_HINTS : MALE_HINTS;
    const g = voices.filter(v => hints.some(h => v.name.toLowerCase().includes(h)));
    if (g.length) pool = g;
  }
  return pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
}
function loadVoices() {
  voices = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("es"));
  const sel = $("setVoice");
  sel.innerHTML = "";
  if (!voices.length) { sel.innerHTML = `<option value=''>${L("(voz del sistema)", "(system voice)")}</option>`; return; }
  const best = bestVoice();
  if (settings.voiceAuto && best) settings.voiceURI = best.voiceURI;
  voices.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a)).forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI;
    o.textContent = `${v.name.replace(/^Microsoft |^Google /, "").replace(/ - .*$/, "")} (${v.lang})${best && v.voiceURI === best.voiceURI ? " ★" : ""}`;
    if (v.voiceURI === settings.voiceURI) o.selected = true;
    sel.appendChild(o);
  });
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text, opts = {}) {
  return new Promise(resolve => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    let v = null;
    if (opts.gender && settings.voiceAuto) v = bestVoice(opts.gender);
    if (!v) v = voices.find(x => x.voiceURI === settings.voiceURI) || bestVoice() || voices[0];
    if (v) u.voice = v;
    u.lang = v ? v.lang : "es-MX";
    u.rate = (opts.rate || 1) * settings.rate;
    u.pitch = opts.pitch || 1;
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ---------------- instruction-language (i18n) ----------------
// [selector, spanishHTML, englishHTML, attr?] — the map covers every string a
// zero-Spanish user needs to operate the app. Learning content stays Spanish.
const UI_MAP = [
  ["#obH1", `Te damos la bienvenida a <span style="color:#CFE5DE">Cl&iacute;nica</span><span class="rosa">Bridge</span>.<br>&iquest;C&oacute;mo te llamas?`,
            `Welcome to <span style="color:#CFE5DE">Cl&iacute;nica</span><span class="rosa">Bridge</span>.<br>What's your name?`],
  ["#obName", "Tu nombre…", "Your name…", "placeholder"],
  ["#ob1Next", "Continuar →", "Continue →"],
  ["#obH2", `&iquest;Para qu&eacute; est&aacute;s aprendiendo, <span class="rosa" id="obNameEcho"></span>?`,
            `What are you learning for, <span class="rosa" id="obNameEcho"></span>?`],
  ["#ob2Next", "Continuar →", "Continue →"],
  ["#obH3", `&iquest;Qu&eacute; se te hace <span class="rosa">dif&iacute;cil</span>?`, `What feels <span class="rosa">hard</span> right now?`],
  ["#ob3Next", "Listo →", "Done →"],
  ["#obH4", "&iquest;C&oacute;mo est&aacute; tu espa&ntilde;ol cl&iacute;nico hoy?", "How's your clinical Spanish today?"],
  ["#obH5", `Tu meta diaria de <span class="rosa">latidos</span> 💗`, `Your daily <span class="rosa">latidos</span> goal 💗`],
  ["#obH6", `&iquest;Porras en tu <span class="rosa">tel&eacute;fono</span>? 📣`, `Cheers on your <span class="rosa">phone</span>? 📣`],
  ["#obNtfyYes", `💗 S&iacute;, act&iacute;valas<small>takes 1 minute, one free app</small>`, `💗 Yes, turn them on<small>takes 1 minute, one free app</small>`],
  ["#obNtfySkip", `Ahora no<small>you can turn it on later in Ajustes ⚙️</small>`, `Not now<small>you can turn it on later in Settings ⚙️</small>`],
  ["#obNtfyTest", "📣 Enviar porra de prueba", "📣 Send a test cheer"],
  ["#obFinish", "&iexcl;Empezar! →", "Let's go! →"],
  ["#obDailyChoices .ob-choice[data-v='20'] small", "&approx; 5 min al d&iacute;a", "&approx; 5 min a day"],
  ["#obDailyChoices .ob-choice[data-v='40'] small", "&approx; 10 min al d&iacute;a", "&approx; 10 min a day"],
  ["#obDailyChoices .ob-choice[data-v='80'] small", "&approx; 20 min al d&iacute;a", "&approx; 20 min a day"],
  ["#talkBtn", `🎤 Hablar <span class="kbd">Space</span>`, `🎤 Speak <span class="kbd">Space</span>`],
  ["#hintBtn", `💡 Pista <span class="kbd">H</span>`, `💡 Hint <span class="kbd">H</span>`],
  ["#listenBtn", `🔊 O&iacute;r frase <span class="kbd">L</span>`, `🔊 Hear phrase <span class="kbd">L</span>`],
  ["#acceptBtn", `Continuar → <span class="kbd">N</span>`, `Continue → <span class="kbd">N</span>`],
  ["#simExit", "Salir", "Exit"],
  ["#pReplay", "↻ repetir", "↻ replay"],
  ["#drillTalk", `🎤 Hablar <span class="kbd">Space</span>`, `🎤 Speak <span class="kbd">Space</span>`],
  ["#drillListen", `🔊 Escuchar <span class="kbd">L</span>`, `🔊 Listen <span class="kbd">L</span>`],
  ["#drillNext", `Siguiente → <span class="kbd">N</span>`, `Next → <span class="kbd">N</span>`],
  ["#freeTalk", `🎤 Hablar <span class="kbd">Space</span>`, `🎤 Speak <span class="kbd">Space</span>`],
  ["#freeListen", `🔊 Escuchar <span class="kbd">L</span>`, `🔊 Listen <span class="kbd">L</span>`],
  ["#freeNext", `Siguiente → <span class="kbd">N</span>`, `Next → <span class="kbd">N</span>`],
  ["#freeEdit", "✏️ Editar texto", "✏️ Edit text"],
  ["#freeStart", "🎤 Empezar a practicar", "🎤 Start practicing"],
  ["#freeSaveList", "💾 Guardar en «Mi pr&aacute;ctica»", "💾 Save to «Mi pr&aacute;ctica»"],
  ["#fcAgain", "Otra vez", "Again"],
  ["#fcListen", "🔊 Escuchar", "🔊 Listen"],
  ["#fcNext", "Siguiente →", "Next →"],
  ["#bAddStep", "+ A&ntilde;adir paso", "+ Add step"],
  ["#bSave", "Guardar sala", "Save room"],
  ["#bExport", "⬇ Exportar JSON", "⬇ Export JSON"],
  ["#dbRetry", "↻ Repetir sala", "↻ Retry room"],
  ["#dbDownload", "⬇ Descargar video", "⬇ Download video"],
  ["#dbHome", "Volver a recepci&oacute;n", "Back to the lobby"],
  ["#backupSave", "💾 Guardar una copia", "💾 Save a copy"],
  ["#settingsClose", "Listo", "Done"],
  ["#pgH1", `Tus &uacute;ltimos 14 d&iacute;as <small>verde = meta cumplida</small>`, `Your last 14 days <small>green = goal met</small>`],
  ["#pgH2", `Las salas <small>tu mejor puntaje en cada una</small>`, `The rooms <small>your best score in each</small>`],
  ["#pgH3", "Tu porqu&eacute; 💌", "Your why 💌"],
  ["#pgH4", "&Uacute;ltimos encuentros", "Recent encounters"],
  ["#pgH5", `Guarda tu progreso <small lang="en">no account needed — it lives in this browser</small>`, `Save your progress <small>no account needed — it lives in this browser</small>`],
  ["#progressChip", `📈 <strong>Mi progreso</strong>`, `📈 <strong>My progress</strong>`],
];
const STAT_CHIPS = [
  ["statMin", "⏱️", "min practicados", "min practiced"],
  ["statPhrases", "🗣️", "frases", "phrases"],
  ["statEnc", "🏥", "encuentros", "encounters"],
];
function applyUILang() {
  UI_MAP.forEach(([sel, es, en, attr]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (attr) el.setAttribute(attr, L(es, en));
    else el.innerHTML = L(es, en);
  });
  STAT_CHIPS.forEach(([id, emoji, es, en]) => {
    const strong = $(id);
    if (!strong) return;
    const val = strong.textContent;
    strong.parentElement.innerHTML = `${emoji} <strong id="${id}">${val}</strong>&nbsp;${L(es, en)}`;
  });
  $("langBtnLabel").textContent = settings.uiLang === "en" ? "ES" : "EN";
  $("langBtn").title = settings.uiLang === "en" ? "Cambiar las instrucciones a español" : "Switch instructions to English";
  $("obLangEs").setAttribute("aria-pressed", String(settings.uiLang === "es"));
  $("obLangEn").setAttribute("aria-pressed", String(settings.uiLang === "en"));
  if (ob && ob.name) { const e = $("obNameEcho"); if (e) e.textContent = ob.name; }
}
function setUILang(lang) {
  settings.uiLang = lang === "en" ? "en" : "es";
  saveAll();
  applyUILang();
  renderHeader();
  if ($("view-home").classList.contains("active")) renderHome();
  if ($("view-progress").classList.contains("active")) renderProgress();
}
$("langBtn").addEventListener("click", () => {
  setUILang(settings.uiLang === "en" ? "es" : "en");
  toast(settings.uiLang === "en" ? "Instructions in English. Your Spanish practice stays Spanish. 💗" : "Instrucciones en español. 💗");
});
$("obLangEs").addEventListener("click", () => setUILang("es"));
$("obLangEn").addEventListener("click", () => setUILang("en"));

// ---------------- navigation ----------------
const VIEWS = ["home", "drill", "deck", "builder", "sim", "progress", "free"];
function show(view) {
  VIEWS.forEach(v => $("view-" + v).classList.toggle("active", v === view));
  if (view !== "sim") teardownSim();
  stopListening();
  speechSynthesis.cancel();
  if (view === "home") { renderHome(); window.scrollTo(0, 0); }
  if (view === "progress") { renderProgress(); window.scrollTo(0, 0); }
  // keep keyboard/screen-reader users oriented: focus the view they landed in
  const el = $("view-" + view);
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}
document.querySelectorAll("[data-nav]").forEach(b => b.addEventListener("click", () => show(b.dataset.nav)));
$("homeBtn").addEventListener("click", () => show("home"));
$("progressChip").addEventListener("click", () => show("progress"));
$("chipStreak").style.cursor = "pointer";
$("chipGoal").style.cursor = "pointer";
$("chipStreak").addEventListener("click", () => show("progress"));
$("chipGoal").addEventListener("click", () => show("progress"));

// ---------------- home rendering ----------------
function doorHTML(sc, custom) {
  const best = progress.best[sc.id];
  const pips = [1, 2, 3].map(i => `<span class="pip ${i <= (sc.difficulty || 1) ? "on" : ""}"></span>`).join("");
  return `
  <span class="door-holder">
  <button class="door ${custom ? "custom-door" : ""}" data-sc="${esc(sc.id)}">
    <span class="door-tab"><span class="num">${esc(sc.room) || "★"}</span><span class="sala">${custom ? "PERSONALIZADA" : "SALA"}</span><span class="knob"></span></span>
    <span class="door-body">
      <h3>${esc(sc.title)}</h3>
      <span class="en">${esc(sc.en || sc.setting || "")}</span>
      <span class="door-meta">
        <span class="pips">${pips}</span>
        <span class="best">${best != null ? `${L("mejor:", "best:")} <strong>${best}%</strong>` : L("sin intentos", "not tried yet")}</span>
      </span>
    </span>
  </button>
  ${custom ? `<button class="del-x" data-del="${esc(sc.id)}" title="Borrar sala" aria-label="Borrar sala ${esc(sc.title)}">✕</button>` : ""}
  </span>`;
}

function renderHome() {
  renderHeader();
  // rooms
  const rg = $("roomsGrid");
  rg.innerHTML =
    SCENARIOS.map(sc => doorHTML(sc, false)).join("") +
    customScenarios.map(sc => doorHTML(sc, true)).join("") +
    `<button class="door new-door" id="newDoor">＋ &nbsp;Crea tu propia sala</button>`;
  rg.querySelectorAll(".door[data-sc]").forEach(d => {
    d.addEventListener("click", () => startSim(d.dataset.sc));
    // static portrait on each door (decorative)
    const face = document.createElement("span");
    face.className = "door-face";
    d.querySelector(".door-body").appendChild(face);
    createAvatar(face, d.dataset.sc, { staticPose: true, decorative: true });
  });
  rg.querySelectorAll(".del-x[data-del]").forEach(b => b.addEventListener("click", () => {
    customScenarios = customScenarios.filter(s => s.id !== b.dataset.del);
    saveAll(); renderHome(); toast(L("Sala borrada.", "Room deleted."));
  }));
  $("newDoor").addEventListener("click", () => { openBuilder(); show("builder"); });

  // drills
  $("drillsGrid").innerHTML = DRILL_SETS.map(s => {
    const done = Object.keys(progress.drill[s.id] || {}).length;
    return `<button class="tile" data-drill="${s.id}">
      <span class="ico">${s.icon}</span>
      <span><span class="t-title">${s.title}</span><br><span class="t-sub">${s.en}</span></span>
      <span class="t-prog">${done}/${s.phrases.length}</span>
    </button>`;
  }).join("");
  document.querySelectorAll("[data-drill]").forEach(t => t.addEventListener("click", () => startDrill(t.dataset.drill)));

  // decks
  $("decksGrid").innerHTML = DECKS.map(d => `
    <button class="tile" data-deck="${d.id}">
      <span class="ico">${d.icon}</span>
      <span><span class="t-title">${d.title}</span><br><span class="t-sub">${d.en}</span></span>
      <span class="t-prog">${d.cards.length}</span>
    </button>`).join("");
  document.querySelectorAll("[data-deck]").forEach(t => t.addEventListener("click", () => startDeck(t.dataset.deck)));

  // saved free-practice lists
  $("scriptsGrid").innerHTML = scripts.map(s => `
    <span class="door-holder">
    <button class="tile" data-script="${esc(s.id)}">
      <span class="ico">📝</span>
      <span><span class="t-title">${esc(s.title)}</span><br><span class="t-sub">${s.phrases.length} ${L("frases", "phrases")}</span></span>
    </button>
    <button class="del-x" data-sdel="${esc(s.id)}" title="Borrar" aria-label="Borrar pr&aacute;ctica ${esc(s.title)}">✕</button>
    </span>`).join("") +
    `<button class="tile" id="newScript"><span class="ico">➕</span><span><span class="t-title">Nueva pr&aacute;ctica</span><br><span class="t-sub" lang="en">paste your own text</span></span></button>`;
  document.querySelectorAll("[data-script]").forEach(t => t.addEventListener("click", () => {
    const s = scripts.find(x => x.id === t.dataset.script);
    if (s) startFree(s.title, s.phrases);
  }));
  document.querySelectorAll("[data-sdel]").forEach(b => b.addEventListener("click", () => {
    scripts = scripts.filter(x => x.id !== b.dataset.sdel); saveAll(); renderHome(); toast(L("Práctica borrada.", "Practice list deleted."));
  }));
  $("newScript").addEventListener("click", () => { openFreeSetup(); show("free"); });

  renderPlan();
}

// ---------------- Tu plan de hoy (tailored from onboarding) ----------------
const STRUGGLE_LABELS = { pron: "🌀 pronunciación", listen: "👂 comprensión", gram: "🧩 gramática", vocab: "📚 vocabulario", numeros: "🔢 números y dosis", freeze: "🧊 confianza" };
function buildPlan() {
  if (!profile) return [];
  const items = [];
  const st = profile.struggles || [];
  const notMastered = allScenarios().filter(s => (progress.best[s.id] || 0) < 85);
  // 1) always: the next room to conquer, framed by her goal
  if (notMastered.length) {
    const pick = profile.level === "ceiba"
      ? notMastered.slice().sort((a, b) => (b.difficulty || 0) - (a.difficulty || 0))[0]
      : notMastered.slice().sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0))[0];
    const why = profile.goal === "osce" ? L("tu próximo caso estilo OSCE", "your next OSCE-style case")
      : profile.goal === "rotaciones" ? L("para que en el hospital te salga solo", "so it comes out automatically on the wards")
      : profile.goal === "comunidad" ? L("una conversación que alguien de tu comunidad necesita", "a conversation someone in your community needs")
      : L("tu próxima historia por dominar", "your next story to master");
    const best = progress.best[pick.id];
    items.push({ emoji: "🚪", label: `Sala ${pick.room || "★"} · ${pick.title}`, why: best ? L(`subir tu ${best}% — ${why}`, `beat your ${best}% — ${why}`) : why, run: () => startSim(pick.id) });
  }
  // 2) from her struggles
  if (st.includes("pron")) items.push({ emoji: "🌀", label: "Drill: Examen físico", why: L("puro músculo de pronunciación — dijiste que la rr y la j se resisten", "pure pronunciation muscle — you said the rr and j fight back"), run: () => startDrill("examen") });
  if (st.includes("vocab")) { const d = DECKS[Math.floor(Math.random() * DECKS.length)]; items.push({ emoji: "📚", label: `Tarjetas: ${d.title}`, why: L("5 minutos de vocabulario — para que las palabras se queden", "5 minutes of vocabulary — so the words stick"), run: () => startDeck(d.id) }); }
  if (st.includes("numeros")) items.push({ emoji: "🔢", label: "Tarjetas: Números y dosis", why: L("dosis y fechas sin titubear — tú lo pediste", "doses and dates without hesitating — you asked for this"), run: () => startDeck("numeros") });
  if (st.includes("gram")) items.push({ emoji: "🧩", label: "Drill: Historia clínica", why: L("armar preguntas completas, una y otra vez", "building complete questions, over and over"), run: () => startDrill("historia") });
  if (st.includes("listen")) { const s2 = SCENARIOS[1]; items.push({ emoji: "👂", label: `Sala 02 · ${s2.title}`, why: L("escucha a la Sra. López y usa ↻ repetir sin pena — así se entrena el oído", "listen to Sra. López and use ↻ replay freely — that's how the ear trains"), run: () => startSim(s2.id) }); }
  if (st.includes("freeze")) items.push({ emoji: "🧊", label: "Drill: Saludos y presentación", why: L("frases de arranque en automático = nunca más congelarte al entrar", "opening phrases on autopilot = never freezing at the door again"), run: () => startDrill("saludos") });
  // 3) her own material
  if (scripts.length) { const s = scripts[0]; items.push({ emoji: "📝", label: L(`Tu práctica: ${s.title}`, `Your practice: ${s.title}`), why: L("lo que TÚ quisiste trabajar", "the thing YOU chose to work on"), run: () => startFree(s.title, s.phrases) }); }
  else items.push({ emoji: "📝", label: "Práctica libre", why: L("pega tu propio guion y te lo calificamos en vivo", "paste your own script and get it graded live"), run: () => { openFreeSetup(); show("free"); } });
  return items.slice(0, 3);
}
function renderPlan() {
  const items = buildPlan();
  const block = $("planBlock");
  if (!profile || !items.length) { block.style.display = "none"; return; }
  block.style.display = "block";
  $("planTitle").textContent = L(`Tu plan de hoy, ${profile.name}`, `Your plan for today, ${profile.name}`);
  $("planGrid").innerHTML = items.map((it, i) => `
    <button class="plan-item" data-plan="${i}">
      <span class="p-emoji">${it.emoji}</span>
      <span><span class="p-label">${esc(it.label)}</span><br><span class="p-why">${esc(it.why)}</span></span>
    </button>`).join("");
  block.querySelectorAll("[data-plan]").forEach(b => b.addEventListener("click", () => items[+b.dataset.plan].run()));
}

// ---------------- karaoke strip rendering ----------------
function renderKaraoke(el, targetEs, statuses, hidden) {
  const toks = targetEs.split(/\s+/);
  const normToks = tokens(targetEs);
  // map display tokens to normalized tokens 1:1 (punctuation-only tokens are rare in our data)
  el.innerHTML = "";
  let ni = 0;
  toks.forEach(t => {
    const nWords = tokens(t).length; // a display token may normalize to 2+ words (e.g. "sí/no")
    const span = document.createElement("span");
    span.className = "k-word";
    span.textContent = t;
    if (nWords > 0) {
      const sts = statuses ? statuses.slice(ni, ni + nWords) : null;
      const st = sts && (sts.every(x => x === "hit") ? "hit" : sts.includes("miss") ? "miss" : sts.includes("close") ? "close" : sts[0]);
      if (st === "hit") span.classList.add("hit");
      else if (st === "close") span.classList.add("close");
      else if (st === "miss") span.classList.add("miss");
      else if (hidden) span.classList.add("hidden-word");
      ni += nWords;
    }
    el.appendChild(span);
  });
}

const CHEERS = [
  { es: "¡Eso!", en: "Yes! That's it!" }, { es: "¡Perfecto!", en: "Perfect!" },
  { es: "¡Así se dice!", en: "That's how it's said!" },
  { es: "Tu paciente te entendió perfecto.", en: "Your patient understood you perfectly." },
  { es: "¡Qué bien suena!", en: "That sounded great!" }, { es: "¡Impecable!", en: "Flawless!" }
];
const NUDGES = [
  { es: "Casi — una vez más y sale.", en: "Almost — one more try and you've got it." },
  { es: "Vas bien, inténtalo otra vez.", en: "You're doing fine — try it again." },
  { es: "Escúchala otra vez y repite.", en: "Listen to it again (🔊) and repeat." },
  { es: "No te rindas, ya casi.", en: "Don't give up — you're close." }
];
function cheer() {
  const c = CHEERS[Math.floor(Math.random() * CHEERS.length)];
  return profile && Math.random() < .4 ? L(`¡Eso, ${profile.name}!`, `That's it, ${profile.name}!`) : L(c.es, c.en);
}
function nudge() { const n = NUDGES[Math.floor(Math.random() * NUDGES.length)]; return L(n.es, n.en); }

// ============================================================
// DRILL MODE
// ============================================================
let drill = null; // {set, idx, attempted}
function startDrill(setId) {
  const set = DRILL_SETS.find(s => s.id === setId);
  if (!set) { toast("Ese ejercicio no existe."); show("home"); return; }
  drill = { set, idx: 0 };
  show("drill");
  $("drillTitle").textContent = set.title;
  $("drillSetName").textContent = set.en.toUpperCase();
  renderDrillPhrase();
}
function renderDrillPhrase() {
  const { set, idx } = drill;
  const p = set.phrases[idx];
  $("drillCount").textContent = `${idx + 1} / ${set.phrases.length}`;
  renderKaraoke($("drillWords"), p.es, null, false);
  $("drillEn").textContent = p.en;
  $("drillScore").textContent = "";
  $("drillLive").innerHTML = L("Pulsa <b>Hablar</b> y di la frase.", "Press <b>Speak</b> and say the phrase.");
  $("drillMicDot").classList.remove("live");
  const tip = PRONUN_TIPS[(idx + set.title.length) % PRONUN_TIPS.length];
  $("drillTip").className = "tip-box";
  $("drillTip").style.display = "block";
  $("drillTip").innerHTML = `<b>${L("TIP DE PRONUNCIACIÓN", "PRONUNCIATION TIP")}</b>${L(tip.es, tip.en)}`;
}
function drillTalk() {
  if (!srSupported) { toast("Tu navegador no soporta reconocimiento de voz — usa Chrome o Edge."); return; }
  const { set, idx } = drill;
  const p = set.phrases[idx];
  $("drillTalk").classList.add("listening");
  $("drillMicDot").classList.add("live");
  $("drillLive").textContent = L("Escuchando…", "Listening…");
  listenOnce({
    onInterim: txt => {
      $("drillLive").textContent = txt || "…";
      const st = alignWords(tokens(p.es), tokens(txt), false);
      renderKaraoke($("drillWords"), p.es, st, false);
    },
    onFinal: (txt, alts) => {
      $("drillTalk").classList.remove("listening");
      $("drillMicDot").classList.remove("live");
      if (!txt && !alts.length) { $("drillLive").textContent = L("No te escuché — inténtalo otra vez.", "I didn't hear you — try again."); return; }
      let best = scorePhrase(p.es, [], txt);
      alts.forEach(a => { const s = scorePhrase(p.es, [], a); if (s.score > best.score) best = s; });
      renderKaraoke($("drillWords"), p.es, best.statuses, false);
      $("drillLive").textContent = txt || "(sin transcripción)";
      const pct = Math.round(best.score * 100);
      $("drillScore").textContent = pct + "%";
      $("drillScore").style.color = pct >= 80 ? "var(--verde-tinta)" : pct >= 50 ? "var(--ambar-tinta)" : "var(--rojo)";
      progress.phrases += 1;
      const prev = (progress.drill[drill.set.id] = progress.drill[drill.set.id] || {})[idx] || 0;
      progress.drill[drill.set.id][idx] = Math.max(prev, pct);
      awardLatidos(pct >= 80 ? 10 : pct >= 50 ? 5 : 2, true);
      $("drillTip").className = "coach-box";
      renderCoach($("drillTip"), p.es, best.statuses, best.score);
      toast(pct >= 80 ? `${cheer()} +10 latidos 💗` : nudge());
    }
  });
}
$("drillTalk").addEventListener("click", () => activeRec ? stopListening() : drillTalk());
$("drillListen").addEventListener("click", () => speak(drill.set.phrases[drill.idx].es));
$("drillNext").addEventListener("click", () => {
  drill.idx = (drill.idx + 1) % drill.set.phrases.length;
  renderDrillPhrase();
});

// ============================================================
// FLASHCARDS
// ============================================================
let deck = null; // {d, order, pos}
function startDeck(deckId) {
  const d = DECKS.find(x => x.id === deckId);
  if (!d) { toast("Ese mazo no existe."); show("home"); return; }
  const order = d.cards.map((_, i) => i).sort(() => Math.random() - .5);
  deck = { d, order, pos: 0 };
  show("deck");
  $("deckEyebrow").textContent = `${d.title.toUpperCase()} · ${d.en.toUpperCase()}`;
  renderCard();
}
function renderCard() {
  const card = deck.d.cards[deck.order[deck.pos]];
  $("flashcard").classList.remove("flipped");
  setTimeout(() => { $("fcFront").textContent = card.es; $("fcBack").textContent = card.en; }, 150);
  $("deckCount").textContent = `${deck.pos + 1} / ${deck.order.length}`;
}
$("flashcard").addEventListener("click", () => $("flashcard").classList.toggle("flipped"));
$("flashcard").addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); $("flashcard").classList.toggle("flipped"); } });
$("fcNext").addEventListener("click", () => { deck.pos = (deck.pos + 1) % deck.order.length; if (deck.pos === 0) { toast(L("¡Mazo completo! 💗", "Deck complete! 💗")); awardLatidos(5, true); } renderCard(); });
$("fcAgain").addEventListener("click", () => {
  const cur = deck.order[deck.pos];
  deck.order.push(cur);
  deck.pos = (deck.pos + 1) % deck.order.length;
  renderCard();
});
$("fcListen").addEventListener("click", () => speak(deck.d.cards[deck.order[deck.pos]].es));

// ============================================================
// COACH — constructive feedback from what was missed
// ============================================================
function coachTips(missedWords) {
  const tips = [];
  const joined = missedWords.join(" ").toLowerCase();
  if (/rr/.test(joined)) tips.push(L("La «rr» se vibra con la punta de la lengua — practica despacio: pe-rro, ca-rro.", "Roll the «rr» with the tip of your tongue — slowly at first: pe-rro, ca-rro."));
  if (/j|ge|gi/.test(joined)) tips.push(L("La «j» (y ge/gi) suena como una «h» inglesa fuerte: ojo, urgencias, gente.", "The «j» (and ge/gi) sounds like a strong English 'h': ojo, urgencias, gente."));
  if (/ñ/.test(joined)) tips.push(L("La «ñ» es como «ny» en canyon: riñón, año, mañana.", "The «ñ» is like 'ny' in canyon: riñón, año, mañana."));
  if (/ll|y/.test(joined)) tips.push(L("La «ll» y la «y» suenan igual, como la «y» de yes: pastilla, ayuda.", "«ll» and «y» sound the same, like the 'y' in yes: pastilla, ayuda."));
  if (/^h| h/.test(" " + joined)) tips.push(L("La «h» es muda — «hígado» empieza directo con la «í».", "The «h» is silent — «hígado» starts straight on the 'ee'."));
  if (/[áéíóú]/.test(joined)) tips.push(L("Ojo con el acento escrito — esa sílaba se pronuncia MÁS fuerte: corazón, análisis.", "Watch the written accent — that syllable gets the STRESS: corazón, análisis."));
  if (/ción|sión/.test(joined)) tips.push(L("Las palabras en -ción llevan la fuerza al final: presión, respiración.", "Words ending in -ción stress the end: presión, respiración."));
  return tips.slice(0, 3);
}
function renderCoach(el, targetEs, statuses, score) {
  const displayToks = targetEs.split(/\s+/).filter(t => tokens(t).length);
  const missed = displayToks.filter((_, i) => statuses[i] === "miss");
  const close = displayToks.filter((_, i) => statuses[i] === "close");
  el.style.display = "block";
  let html = `<b class="c-head">${L("TU COACH 🫀", "YOUR COACH 🫀")}</b>`;
  if (score >= 0.95) {
    html += L(`Impecable — se te entendió cada palabra. Súbele un poco a la velocidad y queda perfecto.`,
              `Flawless — every word was understood. Speed it up a touch and it's perfect.`);
  } else if (!missed.length && !close.length) {
    html += L(`¡Muy bien! Se entendió todo. Repítela una vez más con confianza y pasa a la siguiente.`,
              `Great! Everything was understood. Say it once more with confidence and move on.`);
  } else {
    if (score >= 0.7) html += L(`Vas muy bien — el mensaje se entendió. Vamos a pulir lo que faltó:`,
                                `You're doing well — the message got through. Let's polish what was missed (tap a word to hear it):`);
    else if (score >= 0.4) html += L(`Buen intento — se entendió una parte. Enfócate en estas palabras:`,
                                     `Good try — part of it was understood. Focus on these words (tap to hear them):`);
    else html += L(`Con calma — esto es lo difícil de verdad. Escucha la frase (🔊), dila en trocitos, y otra vez:`,
                   `No rush — this is the genuinely hard part. Listen to the phrase (🔊), say it in small chunks, then again:`);
    const chips = [...missed.map(w => ({ w, k: "miss" })), ...close.map(w => ({ w, k: "close" }))];
    html += `<div class="miss-chips">${chips.map(c => `<button class="miss-chip" data-say="${esc(c.w)}"${c.k === "close" ? ' style="color:var(--ambar-tinta); border-color:#E4D2A0"' : ""}>🔊 ${esc(c.w)}</button>`).join("")}</div>`;
    const tips = coachTips([...missed, ...close]);
    if (tips.length) html += `<ul>${tips.map(t => `<li>${t}</li>`).join("")}</ul>`;
  }
  el.innerHTML = html;
  el.querySelectorAll("[data-say]").forEach(ch => ch.addEventListener("click", () => speak(ch.dataset.say, { rate: 0.8 })));
}

// ============================================================
// FREE PRACTICE — her own material, graded live
// ============================================================
let free = null; // {title, phrases, idx}
function splitPhrases(text) {
  return text.split(/\n+|(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => tokens(s).length >= 2);
}
function openFreeSetup() {
  $("freeSetup").style.display = "block";
  $("freeRun").style.display = "none";
}
function startFree(title, phrases) {
  free = { title: title || "Mi práctica", phrases, idx: 0 };
  show("free");
  $("freeSetup").style.display = "none";
  $("freeRun").style.display = "block";
  $("freeRunTitle").textContent = free.title;
  renderFreePhrase();
}
function renderFreePhrase() {
  const p = free.phrases[free.idx];
  $("freeCount").textContent = `${free.idx + 1} / ${free.phrases.length}`;
  renderKaraoke($("freeWords"), p, null, false);
  $("freeScore").textContent = "";
  $("freeLive").innerHTML = L("Pulsa <b>Hablar</b> y di la frase.", "Press <b>Speak</b> and say the phrase.");
  $("freeMicDot").classList.remove("live");
  $("freeCoach").style.display = "none";
}
function freeTalk() {
  if (!srSupported) { toast("Tu navegador no soporta reconocimiento de voz — usa Chrome o Edge."); return; }
  const p = free.phrases[free.idx];
  $("freeTalk").classList.add("listening");
  $("freeMicDot").classList.add("live");
  $("freeLive").textContent = L("Escuchando…", "Listening…");
  listenOnce({
    onInterim: txt => {
      $("freeLive").textContent = txt || "…";
      renderKaraoke($("freeWords"), p, alignWords(tokens(p), tokens(txt), false), false);
    },
    onFinal: (txt, alts) => {
      $("freeTalk").classList.remove("listening");
      $("freeMicDot").classList.remove("live");
      if (!txt && !alts.length) { $("freeLive").textContent = L("No te escuché — inténtalo otra vez, más cerca del micrófono.", "I didn't hear you — try again, closer to the mic."); return; }
      let best = scorePhrase(p, [], txt);
      alts.forEach(a => { const s = scorePhrase(p, [], a); if (s.score > best.score) best = s; });
      renderKaraoke($("freeWords"), p, best.statuses, false);
      $("freeLive").textContent = txt || "(sin transcripción)";
      const pct = Math.round(best.score * 100);
      $("freeScore").textContent = pct + "%";
      $("freeScore").style.color = pct >= 80 ? "var(--verde-tinta)" : pct >= 50 ? "var(--ambar-tinta)" : "var(--rojo)";
      renderCoach($("freeCoach"), p, best.statuses, best.score);
      progress.phrases += 1;
      awardLatidos(pct >= 80 ? 10 : pct >= 50 ? 5 : 2, true);
      if (pct >= 80) toast(cheer());
    }
  });
}
$("freeStart").addEventListener("click", () => {
  const phrases = splitPhrases($("freeText").value);
  if (!phrases.length) { toast(L("Escribe o pega al menos una frase en español.", "Type or paste at least one Spanish phrase.")); return; }
  startFree($("freeTitle").value.trim() || L("Mi práctica", "My practice"), phrases);
});
$("freeSaveList").addEventListener("click", () => {
  const phrases = splitPhrases($("freeText").value);
  if (!phrases.length) { toast(L("Escribe o pega al menos una frase primero.", "Type or paste at least one phrase first.")); return; }
  const title = $("freeTitle").value.trim() || `Mi práctica ${scripts.length + 1}`;
  scripts.unshift({ id: "s" + Date.now(), title, phrases });
  saveAll();
  toast(L(`«${title}» guardada en Mi práctica. 💗`, `«${title}» saved to Mi práctica. 💗`));
});
$("freeTalk").addEventListener("click", () => activeRec ? stopListening() : freeTalk());
$("freeListen").addEventListener("click", () => speak(free.phrases[free.idx]));
$("freeNext").addEventListener("click", () => { free.idx = (free.idx + 1) % free.phrases.length; if (free.idx === 0) toast(L("¡Lista completa! Otra vuelta refuerza. 💪", "List complete! Another lap makes it stick. 💪")); renderFreePhrase(); });
$("freeEdit").addEventListener("click", () => {
  $("freeText").value = free.phrases.join("\n");
  $("freeTitle").value = free.title;
  openFreeSetup();
});

// ============================================================
// PROGRESS VIEW + BACKUP
// ============================================================
function renderProgress() {
  rollDay();
  $("pgStreak").textContent = progress.streak;
  $("pgLatidos").textContent = progress.latidos;
  $("pgMin").textContent = Math.round(progress.seconds / 60);
  const goal = profile ? +profile.daily : 40;

  // last-14-days chart
  const days = [];
  for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(dateKey(d)); }
  const vals = days.map(k => progress.days[k] || 0);
  const max = Math.max(goal, ...vals, 1);
  $("chart14").innerHTML = days.map((k, i) => {
    const v = vals[i];
    const h = Math.max(3, Math.round(105 * v / max));
    const met = v >= goal;
    const dd = k.slice(8, 10);
    return `<div class="cbar ${met ? "goalmet" : ""} ${k === todayKey() ? "today" : ""}" title="${k}: ${v} latidos">
      <div class="fill" style="height:${h}px"></div><span class="lbl">${dd}</span></div>`;
  }).join("");
  const metDays = vals.filter(v => v >= goal).length;
  $("chartNote").textContent = metDays
    ? L(`Cumpliste tu meta de ${goal} latidos en ${metDays} de los últimos 14 días. ${metDays >= 10 ? "Eso ya es un hábito. 🌟" : metDays >= 5 ? "Se está volviendo costumbre. 💪" : "Cada día cuenta — hoy es buen día. 💗"}`,
        `You hit your ${goal}-latido goal on ${metDays} of the last 14 days. ${metDays >= 10 ? "That's a habit now. 🌟" : metDays >= 5 ? "It's becoming routine. 💪" : "Every day counts — today's a good one. 💗"}`)
    : L(`Tu meta es ${goal} latidos al día — unos 10 minutos. El primer día verde se siente increíble.`,
        `Your goal is ${goal} latidos a day — about 10 minutes. The first green day feels amazing.`);

  // per-sala bests
  $("salaProg").innerHTML = allScenarios().map(s => {
    const b = progress.best[s.id] || 0;
    return `<div class="sala-row"><span class="s-t">${s.room ? "Sala " + esc(s.room) + " · " : ""}${esc(s.title)}</span>
      <div class="s-bar"><div class="s-fill" style="width:${b}%"></div></div>
      <span class="s-v">${b ? b + "%" : "—"}</span></div>`;
  }).join("");

  // her why
  const GOALS = {
    rotaciones: L("🏥 Para mis rotaciones y la clínica", "🏥 For my rotations and clinic"),
    osce: L("📋 Para OSCEs y exámenes", "📋 For OSCEs and exams"),
    comunidad: L("❤️ Para mi comunidad", "❤️ For my community"),
    amor: L("✨ Por amor al idioma", "✨ For love of the language")
  };
  $("whyStory").textContent = profile && profile.story
    ? `«${profile.story}»`
    : L("Escribiste tu meta al empezar — aquí viviría. (O simplemente sigue practicando.)", "Your goal in your own words would live here — you can keep practicing without it.");
  $("whyChips").innerHTML = profile ? [
    `<span class="chip">${GOALS[profile.goal] || "💗"}</span>`,
    ...(profile.struggles || []).map(s => `<span class="chip">${L("trabajando:", "working on:")} ${esc(STRUGGLE_LABELS[s] || s)}</span>`)
  ].join("") : "";

  // history
  $("histList").innerHTML = progress.history.length
    ? progress.history.slice(0, 10).map(h => `<div class="hist-row"><span class="h-d">${esc(String(h.d).slice(5))}</span><span>${esc(h.title)}</span><span class="h-acc" style="color:${h.acc >= 80 ? "var(--verde-tinta)" : h.acc >= 50 ? "var(--ambar-tinta)" : "var(--rojo)"}">${+h.acc || 0}%</span></div>`).join("")
    : `<p style="color:var(--tinta-suave); font-size:.88rem">${L("Tu primer encuentro aparecerá aquí. Las salas te esperan. 🚪", "Your first encounter will show up here. The rooms are waiting. 🚪")}</p>`;
}

$("backupSave").addEventListener("click", () => {
  const data = { app: "ClinicaBridge", v: 2, saved: todayKey(), profile, settings, progress, customScenarios, scripts };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `clinicabridge_${norm(profile ? profile.name : "progreso").replace(/\s+/g, "_")}_${todayKey()}.json`;
  a.click();
  toast(L("💾 Copia guardada — mándatela por correo o guárdala donde quieras.", "💾 Copy saved — email it to yourself or keep it anywhere."));
});
$("backupLoad").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.app !== "ClinicaBridge" || !d.profile) throw 0;
      profile = d.profile; settings = d.settings || settings; progress = d.progress || progress;
      customScenarios = d.customScenarios || []; scripts = d.scripts || [];
      if (profile) { profile.struggles = profile.struggles || []; profile.ntfy = profile.ntfy || { on: false, topic: "" }; }
      progress.days = progress.days || {}; progress.history = progress.history || [];
      saveAll();
      renderProgress(); renderHeader();
      toast(`¡Qué gusto verte de vuelta, ${displayName()}! Todo tu progreso está aquí. 💗`);
      confetti(50);
    } catch { toast("Ese archivo no parece una copia de ClínicaBridge."); }
  };
  r.readAsText(f);
  e.target.value = "";
});

// ============================================================
// SIM — the encounter
// ============================================================
let sim = null;
let camStream = null, recorder = null, recChunks = [], recURL = null, recMime = "video/webm";
let presence = { on: false, samples: 0, facing: 0, timer: null, detector: null };
let simTimerH = null;

function allScenarios() { return [...SCENARIOS, ...customScenarios]; }

async function startSim(scId) {
  const sc = allScenarios().find(s => s.id === scId);
  if (!sc || !sc.steps || !sc.steps.length) { toast(L("Esta sala no tiene pasos todavía.", "This room has no steps yet.")); return; }
  if (sim && sim.av) { sim.av.destroy(); sim.av = null; } // retry path: kill the old portrait's timers
  sim = {
    sc, i: 0,
    stepScores: [], firstTry: [], hintMult: 1, attemptsThisStep: 0,
    saidAll: [], t0: Date.now(), done: false
  };
  show("sim");
  $("debrief").style.display = "none";
  $("simStage").style.display = "grid";
  $("simRoomTag").textContent = sc.room ? `SALA ${sc.room}` : "SALA ★";
  $("simTitle").textContent = sc.title + (sc.setting ? ` · ${sc.setting}` : "");
  $("simAcc").textContent = "—";
  $("scoreFlash").textContent = "";
  const pat = sc.patient || { name: "Paciente", age: "", persona: "" };
  $("pName").textContent = pat.name;
  $("pAge").textContent = pat.age ? `${pat.age} años` : "";
  $("pPersona").textContent = pat.persona || "";
  if (sim.av) sim.av.destroy();
  sim.av = createAvatar($("avatarWrap"), sc.id, { label: pat.name });

  // timer
  clearInterval(simTimerH);
  simTimerH = setInterval(() => {
    const s = Math.floor((Date.now() - sim.t0) / 1000);
    $("simTimer").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 500);

  // reset per-encounter capture state + HUD chips
  recURL = null; recChunks = [];
  presence = { on: false, samples: 0, facing: 0, timer: null, detector: null };
  $("simRecWrap").style.display = "none";
  $("simPresenceWrap").style.display = "none";
  $("dbDownload").style.display = "none";

  await setupCamera();
  runStep();
}

async function setupCamera() {
  const camRow = $("camRow");
  camRow.innerHTML = "";
  if (!settings.cam || !navigator.mediaDevices) {
    camRow.innerHTML = `<div class="cam-off-note">📷 Cámara apagada — actívala en Ajustes para practicar tu presencia y grabarte.</div>`;
    return;
  }
  const video = document.createElement("video");
  video.id = "cam"; video.autoplay = true; video.muted = true; video.playsInline = true;
  camRow.appendChild(video);
  try {
    camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: settings.rec });
    video.srcObject = camStream;
    // recording failure must not take down the live camera — separate try
    if (settings.rec && window.MediaRecorder) {
      try {
        recChunks = []; recURL = null;
        const mime = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
        recorder = mime ? new MediaRecorder(camStream, { mimeType: mime }) : new MediaRecorder(camStream);
        recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
        recorder.start();
        $("simRecWrap").style.display = "inline-flex";
      } catch { recorder = null; $("simRecWrap").style.display = "none"; }
    } else $("simRecWrap").style.display = "none";
    startPresence(video);
  } catch (err) {
    if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
    camRow.innerHTML = `<div class="cam-off-note">📷 No pude acceder a la cámara (${esc(err.name)}). El encuentro funciona igual — solo sin video.</div>`;
  }
}

// presence: optional MediaPipe face detection; silently disabled if unavailable.
// Detector is cached across encounters so the model downloads once per session.
let faceDetectorCache = null;
async function startPresence(video) {
  presence = { on: false, samples: 0, facing: 0, timer: null, detector: null };
  try {
    if (!faceDetectorCache) {
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs");
      const files = await vision.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm");
      faceDetectorCache = await vision.FaceDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite" },
        runningMode: "VIDEO"
      });
    }
    presence.detector = faceDetectorCache;
    presence.on = true;
    $("simPresenceWrap").style.display = "inline-flex";
    presence.timer = setInterval(() => {
      if (!video.videoWidth || !presence.detector) return;
      try {
        const res = presence.detector.detectForVideo(video, performance.now());
        presence.samples++;
        const d = res.detections && res.detections[0];
        if (d) {
          const b = d.boundingBox;
          const cx = (b.originX + b.width / 2) / video.videoWidth;
          const big = b.width / video.videoWidth > 0.14;
          if (cx > 0.22 && cx < 0.78 && big) presence.facing++;
        }
        const pct = presence.samples ? Math.round(100 * presence.facing / presence.samples) : 0;
        $("simPresence").textContent = pct + "%";
      } catch {}
    }, 450);
  } catch {
    $("simPresenceWrap").style.display = "none"; // no network / unsupported — fine
  }
}

function currentStep() { return sim.sc.steps[sim.i]; }

async function runStep() {
  const st = currentStep();
  sim.hintMult = 1; sim.attemptsThisStep = 0; sim.lastScore = null;
  $("acceptBtn").disabled = true;
  $("scoreFlash").textContent = "";
  $("cueText").textContent = st.cue || "Respond in Spanish.";
  $("kEn").textContent = settings.showEn ? (st.target.en || "") : "";
  const hidden = !settings.reveal;
  $("kHintState").textContent = hidden
    ? L("palabras ocultas — se revelan al decirlas", "words hidden — they reveal as you say them")
    : L("frase visible", "phrase visible");
  renderKaraoke($("kWords"), st.target.es, null, hidden);
  $("liveTx").innerHTML = L("Pulsa <b>Hablar</b> cuando quieras.", "Press <b>Speak</b> whenever you're ready.");
  renderStepDots();
  // patient speaks
  await patientSay(st.patient.es, st.patient.en);
}

// patients address the learner the way SHE chose to be addressed
function localizeVocative(es) {
  if (!profile) return es;
  const map = { "Doctora": "doctora", "Doctor": "doctor", "Dre.": "doctore" };
  const voc = map[profile.title] || (profile.name ? profile.name.split(" ")[0] : "doctor");
  return es.replace(/\b[Dd]octora?\b/g, m => m[0] === "D" ? voc[0].toUpperCase() + voc.slice(1) : voc);
}

async function patientSay(es, en) {
  es = localizeVocative(es);
  const arc = SCENARIO_MOODS[sim.sc.id];
  const av = sim.av; // capture: a late TTS resolution must not touch a newer encounter's avatar
  if (av) {
    av.setMood((arc && arc[sim.i]) || (currentStep() && currentStep().mood) || "neutral");
    av.speak(true);
  }
  $("pSubEn").textContent = settings.showEn ? (en || "") : "";
  // typewriter subtitle in sync-ish with speech
  const el = $("pSubEs"); el.textContent = "";
  clearInterval(sim._typeH);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) el.textContent = es;
  else {
    let k = 0;
    sim._typeH = setInterval(() => { el.textContent = es.slice(0, ++k); if (k >= es.length) clearInterval(sim._typeH); }, 28);
  }
  const v = (sim.sc.patient && sim.sc.patient.voice) || {};
  await speak(es, { pitch: v.pitch || 1, rate: v.rate || 1, gender: v.gender });
  if (sim && sim.av === av && av) av.speak(false);
}

function renderStepDots() {
  $("stepDots").innerHTML = sim.sc.steps.map((_, i) =>
    `<span class="sdot ${i < sim.i ? "done" : i === sim.i ? "now" : ""}"></span>`).join("");
}

function simTalk() {
  if (!srSupported) { toast("Tu navegador no soporta reconocimiento de voz — usa Chrome o Edge."); return; }
  const st = currentStep();
  $("talkBtn").classList.add("listening");
  $("micDot").classList.add("live");
  $("liveTx").textContent = L("Escuchando…", "Listening…");
  const hidden = !settings.reveal && sim.hintMult === 1;
  listenOnce({
    onInterim: txt => {
      $("liveTx").textContent = txt || "…";
      const stt = alignWords(tokens(st.target.es), tokens(txt), false);
      renderKaraoke($("kWords"), st.target.es, stt, hidden);
    },
    onFinal: (txt, alts) => {
      $("talkBtn").classList.remove("listening");
      $("micDot").classList.remove("live");
      if (!txt && !alts.length) { $("liveTx").textContent = L("No te escuché — acércate al micrófono e inténtalo otra vez.", "I didn't hear you — get closer to the mic and try again."); return; }
      sim.attemptsThisStep++;
      let best = scorePhrase(st.target.es, st.alt, txt);
      alts.forEach(a => { const s = scorePhrase(st.target.es, st.alt, a); if (s.score > best.score) best = s; });
      const eff = best.score * sim.hintMult;
      sim.lastScore = { raw: best.score, eff };
      sim.saidAll.push(txt);
      renderKaraoke($("kWords"), st.target.es, best.statuses, false);
      $("liveTx").textContent = txt;
      const pct = Math.round(eff * 100);
      const cls = pct >= 80 ? "good" : pct >= 50 ? "mid" : "bad";
      $("scoreFlash").innerHTML = `<span class="${cls}">${pct}%</span>`;
      $("acceptBtn").disabled = false;
      progress.phrases += 1;
      awardLatidos(pct >= 80 ? 10 : pct >= 50 ? 5 : 2, true);
      if (pct >= 80) {
        toast(cheer());
        sim.autoAdvanceH = setTimeout(acceptStep, 1100);
      } else {
        toast(nudge());
      }
    }
  });
}

function acceptStep() {
  if (!sim || sim.done || $("acceptBtn").disabled) return;
  if (!$("view-sim").classList.contains("active")) return; // user already left the encounter
  clearTimeout(sim.autoAdvanceH);
  $("acceptBtn").disabled = true;
  const sc = sim.lastScore ? sim.lastScore.eff : 0;
  sim.stepScores.push(sc);
  sim.firstTry.push(sim.attemptsThisStep === 1 && sim.hintMult === 1 && sc >= 0.8);
  const avg = sim.stepScores.reduce((a, b) => a + b, 0) / sim.stepScores.length;
  $("simAcc").textContent = Math.round(avg * 100) + "%";
  sim.i++;
  if (sim.i >= sim.sc.steps.length) endSim();
  else runStep();
}

function useHint() {
  const st = currentStep();
  sim.hintMult = Math.min(sim.hintMult, 0.75);
  $("kHintState").textContent = L("pista usada — frase visible (–25%)", "hint used — phrase revealed (–25%)");
  renderKaraoke($("kWords"), st.target.es, null, false);
}
function useListen() {
  const st = currentStep();
  sim.hintMult = Math.min(sim.hintMult, 0.9);
  speak(st.target.es);
}

$("talkBtn").addEventListener("click", () => activeRec ? stopListening() : simTalk());
$("hintBtn").addEventListener("click", useHint);
$("listenBtn").addEventListener("click", useListen);
$("acceptBtn").addEventListener("click", acceptStep);
$("pReplay").addEventListener("click", () => { const st = currentStep(); if (st) patientSay(st.patient.es, st.patient.en); });
$("pToggleEn").addEventListener("click", () => { settings.showEn = !settings.showEn; $("setEn").checked = settings.showEn; saveAll(); const st = currentStep(); if (st) { $("pSubEn").textContent = settings.showEn ? st.patient.en : ""; $("kEn").textContent = settings.showEn ? st.target.en : ""; } });
$("simExit").addEventListener("click", () => show("home"));

function endSim() {
  sim.done = true;
  progress.encounters += 1;
  const acc = Math.round(100 * sim.stepScores.reduce((a, b) => a + b, 0) / sim.stepScores.length);
  // vocab usage
  const saidNorm = norm(sim.saidAll.join(" "));
  let vTotal = 0, vUsed = 0;
  sim.sc.steps.forEach(st => (st.vocab || []).forEach(v => { vTotal++; if (saidNorm.includes(norm(v))) vUsed++; }));
  const vocabPct = vTotal ? Math.round(100 * vUsed / vTotal) : null;
  const fluPct = Math.round(100 * sim.firstTry.filter(Boolean).length / sim.firstTry.length);
  const presPct = presence.on && presence.samples > 4 ? Math.round(100 * presence.facing / presence.samples) : null;
  const prevBest = progress.best[sim.sc.id] || 0;
  progress.best[sim.sc.id] = Math.max(prevBest, acc);
  progress.history.unshift({ d: todayKey(), id: sim.sc.id, title: sim.sc.title, acc });
  progress.history = progress.history.slice(0, 30);
  awardLatidos(15, true);
  saveAll();
  const isRecord = acc > prevBest && prevBest > 0;
  pushNtfy(
    `Sala completada - ${sim.sc.title}`,
    `🏥 ${profile ? profile.name : ""} terminó **${sim.sc.title}** con **${acc}%** de precisión` +
    (isRecord ? ` — ¡nuevo récord personal! (antes ${prevBest}%) 🏆` : "") +
    `. Racha: ${progress.streak} días · ${progress.today.latidos} latidos hoy.`,
    isRecord ? "trophy" : "hospital"
  );

  // stop capture
  stopCaptureKeepURL();

  // render debrief
  $("simStage").style.display = "none";
  $("debrief").style.display = "block";
  const name = displayName();
  const verdict = acc >= 85 ? L(`¡Excelente, ${name}!`, `Excellent, ${name}!`) : acc >= 70 ? L(`¡Muy bien, ${name}!`, `Very good, ${name}!`) : acc >= 50 ? L(`En camino, ${name}.`, `Getting there, ${name}.`) : L(`Sigue practicando, ${name}.`, `Keep practicing, ${name}.`);
  $("dbVerdict").textContent = verdict;
  $("dbSub").textContent = acc > prevBest && prevBest > 0
    ? L(`Nuevo récord personal en esta sala — antes ${prevBest}%.`, `New personal record in this room — previously ${prevBest}%.`)
    : L(`${sim.sc.title} · ${sim.sc.steps.length} intercambios · +15 latidos por completar la sala.`, `${sim.sc.title} · ${sim.sc.steps.length} exchanges · +15 latidos for completing the room.`);
  const setBar = (fillId, valId, pct) => {
    $(valId).textContent = pct != null ? pct + "%" : "n/a";
    requestAnimationFrame(() => { $(fillId).style.width = (pct || 0) + "%"; });
  };
  setBar("dbAcc", "dbAccV", acc);
  setBar("dbVocab", "dbVocabV", vocabPct);
  setBar("dbFlu", "dbFluV", fluPct);
  $("dbPresRow").style.display = presPct != null ? "grid" : "none";
  if (presPct != null) setBar("dbPres", "dbPresV", presPct);

  // missed phrases
  const missed = sim.sc.steps.filter((st, i) => sim.stepScores[i] < 0.6);
  const mh = L("FRASES PARA REPASAR", "PHRASES TO REVIEW");
  $("dbMissed").innerHTML = missed.length
    ? `<h4>${mh}</h4><ul>` + missed.map(st => `<li><b>${esc(st.target.es)}</b><br><span lang="en">${esc(st.target.en || "")}</span></li>`).join("") + `</ul>`
    : `<h4>${mh}</h4><p style="color:var(--sim-texto-suave)">${L("Ninguna — dominaste todas las frases. 🎉", "None — you nailed every phrase. 🎉")}</p>`;

  $("dbDownload").style.display = recURL ? "inline-flex" : "none";
  if (acc >= 70) confetti(acc >= 85 ? 110 : 60);
}

function stopCaptureKeepURL() {
  clearInterval(simTimerH);
  if (presence.timer) { clearInterval(presence.timer); presence.timer = null; }
  if (recorder && recorder.state !== "inactive") {
    const mime = recMime = recorder.mimeType || "video/webm";
    recorder.onstop = () => {
      if (recChunks.length) recURL = URL.createObjectURL(new Blob(recChunks, { type: mime }));
      $("dbDownload").style.display = recURL && sim && sim.done ? "inline-flex" : "none";
    };
    recorder.stop();
  }
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  recorder = null;
}

function teardownSim() {
  clearInterval(simTimerH);
  if (sim) {
    clearTimeout(sim.autoAdvanceH);
    clearInterval(sim._typeH);
    sim.done = true;
    if (sim.av) { sim.av.destroy(); sim.av = null; }
  }
  $("acceptBtn").disabled = true;
  if (presence.timer) { clearInterval(presence.timer); presence.timer = null; }
  presence.detector = null; // keep faceDetectorCache for the next encounter
  if (recorder && recorder.state !== "inactive") { try { recorder.stop(); } catch {} }
  recorder = null;
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
}

$("dbRetry").addEventListener("click", () => startSim(sim.sc.id));
$("dbHome").addEventListener("click", () => show("home"));
$("dbDownload").addEventListener("click", () => {
  if (!recURL) return;
  const a = document.createElement("a");
  a.href = recURL;
  a.download = `encuentro_${sim.sc.id}_${todayKey()}.${recMime.includes("mp4") ? "mp4" : "webm"}`;
  a.click();
});

// ============================================================
// BUILDER
// ============================================================
function stepBlockHTML(n, s = {}) {
  const uid = `st${n}_${Math.random().toString(36).slice(2, 6)}`;
  return `<div class="step-block">
    <span class="step-n">PASO ${n}</span>
    <button class="mini-btn rm-step" aria-label="Quitar paso" style="border-color:var(--linea); color:var(--tinta-suave)">✕</button>
    <div class="form-grid" style="margin-top:10px">
      <div><label class="f-label" for="${uid}p">El paciente dice (ES)</label><input id="${uid}p" class="f-in s-pes" value="${esc(s.pes || "")}" placeholder="Me duele mucho la espalda."></div>
      <div><label class="f-label" for="${uid}pe">Patient line (EN)</label><input id="${uid}pe" class="f-in s-pen" value="${esc(s.pen || "")}" placeholder="My back hurts a lot."></div>
      <div class="full"><label class="f-label" for="${uid}c">Your move (cue, EN)</label><input id="${uid}c" class="f-in s-cue" value="${esc(s.cue || "")}" placeholder="Ask when it started and what makes it worse."></div>
      <div><label class="f-label" for="${uid}t">Respuesta objetivo (ES)</label><input id="${uid}t" class="f-in s-tes" value="${esc(s.tes || "")}" placeholder="¿Cuándo comenzó? ¿Qué lo empeora?"></div>
      <div><label class="f-label" for="${uid}te">Target (EN)</label><input id="${uid}te" class="f-in s-ten" value="${esc(s.ten || "")}" placeholder="When did it start? What makes it worse?"></div>
      <div class="full"><label class="f-label" for="${uid}a">Alternates (ES, separa con | )</label><input id="${uid}a" class="f-in s-alt" value="${esc(s.alt || "")}" placeholder="¿Desde cuándo le duele? | ¿Cuándo empezó el dolor?"></div>
    </div>
  </div>`;
}
function openBuilder() {
  ["bTitle", "bEn", "bName", "bAge", "bPersona"].forEach(id => $(id).value = "");
  $("bSteps").innerHTML = stepBlockHTML(1) + stepBlockHTML(2);
  wireStepBlocks();
}
function wireStepBlocks() {
  $("bSteps").querySelectorAll(".rm-step").forEach(b => b.onclick = () => {
    if ($("bSteps").children.length > 1) { b.closest(".step-block").remove(); renumberSteps(); }
  });
}
function renumberSteps() {
  [...$("bSteps").querySelectorAll(".step-n")].forEach((el, i) => el.textContent = `PASO ${i + 1}`);
}
$("bAddStep").addEventListener("click", () => {
  $("bSteps").insertAdjacentHTML("beforeend", stepBlockHTML($("bSteps").children.length + 1));
  wireStepBlocks();
});
function collectScenario() {
  const steps = [...$("bSteps").querySelectorAll(".step-block")].map(b => ({
    patient: { es: b.querySelector(".s-pes").value.trim(), en: b.querySelector(".s-pen").value.trim() },
    cue: b.querySelector(".s-cue").value.trim(),
    target: { es: b.querySelector(".s-tes").value.trim(), en: b.querySelector(".s-ten").value.trim() },
    alt: b.querySelector(".s-alt").value.split("|").map(x => x.trim()).filter(Boolean),
    vocab: []
  })).filter(s => s.patient.es && s.target.es);
  if (!$("bTitle").value.trim() || !steps.length) return null;
  return {
    id: "custom_" + Date.now(),
    room: "", title: $("bTitle").value.trim(), en: $("bEn").value.trim(),
    setting: "Sala personalizada", difficulty: 2,
    patient: { name: $("bName").value.trim() || "Paciente", age: $("bAge").value.trim(), persona: $("bPersona").value.trim(), voice: {} },
    steps
  };
}
$("bSave").addEventListener("click", () => {
  const sc = collectScenario();
  if (!sc) { toast(L("Ponle un título y al menos un paso completo (paciente + respuesta).", "Give it a title and at least one complete step (patient line + response).")); return; }
  customScenarios.push(sc);
  saveAll();
  toast(L(`Sala «${sc.title}» guardada. ¡A practicar!`, `Room «${sc.title}» saved. Go practice!`));
  show("home");
});
$("bExport").addEventListener("click", () => {
  const sc = collectScenario();
  if (!sc) { toast("Completa la sala antes de exportar."); return; }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(sc, null, 2)], { type: "application/json" }));
  a.download = `clinicabridge_${norm(sc.title).replace(/\s+/g, "_")}.json`;
  a.click();
});
$("bImport").addEventListener("change", e => {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const sc = JSON.parse(r.result);
      if (!sc.title || !Array.isArray(sc.steps) || !sc.steps.length) throw 0;
      sc.id = "custom_" + Date.now();
      customScenarios.push(sc);
      saveAll();
      toast(`Sala «${sc.title}» importada.`);
      show("home");
    } catch { toast("Ese archivo no parece una sala de ClínicaBridge."); }
  };
  r.readAsText(f);
  e.target.value = "";
});

// ============================================================
// SETTINGS
// ============================================================
function refreshNtfyRow() {
  const on = !!(profile && profile.ntfy && profile.ntfy.on);
  $("setNtfy").checked = on;
  $("ntfyDetail").style.display = on ? "block" : "none";
  if (on) $("setTopic").textContent = profile.ntfy.topic;
}
$("settingsBtn").addEventListener("click", () => {
  $("setUiLang").value = settings.uiLang;
  $("setDialect").value = settings.dialect;
  $("setRate").value = settings.rate;
  $("setEn").checked = settings.showEn;
  $("setCam").checked = settings.cam;
  $("setRec").checked = settings.rec;
  $("setReveal").checked = settings.reveal;
  refreshNtfyRow();
  loadVoices();
  $("settingsModal").showModal();
});
$("setUiLang").addEventListener("change", () => setUILang($("setUiLang").value));
$("setVoiceTest").addEventListener("click", () => {
  const uri = $("setVoice").value;
  const prev = { uri: settings.voiceURI, auto: settings.voiceAuto };
  settings.voiceURI = uri; settings.voiceAuto = false;
  speak("Hola, mucho gusto. Soy su paciente virtual. ¿Cómo está usted hoy?").then(() => {
    settings.voiceURI = prev.uri; settings.voiceAuto = prev.auto;
  });
});
$("setNtfy").addEventListener("change", () => {
  if (!profile) { $("setNtfy").checked = false; return; }
  profile.ntfy = profile.ntfy || { on: false, topic: "" };
  profile.ntfy.on = $("setNtfy").checked;
  if (profile.ntfy.on && !profile.ntfy.topic) profile.ntfy.topic = makeTopic();
  saveAll();
  refreshNtfyRow();
});
$("setNtfyTest").addEventListener("click", () => ntfyTest());
$("settingsClose").addEventListener("click", () => {
  settings.dialect = $("setDialect").value;
  if ($("setVoice").value && $("setVoice").value !== settings.voiceURI) {
    settings.voiceURI = $("setVoice").value;
    settings.voiceAuto = false; // she picked one herself — respect it
  }
  settings.rate = +$("setRate").value;
  settings.showEn = $("setEn").checked;
  settings.cam = $("setCam").checked;
  settings.rec = $("setRec").checked;
  settings.reveal = $("setReveal").checked;
  saveAll();
  $("settingsModal").close();
  toast(L("Ajustes guardados.", "Settings saved."));
});

// ============================================================
// ONBOARDING
// ============================================================
const ob = { step: 1, name: "", title: null, goal: "", story: "", struggles: [], level: "", daily: "", ntfyOn: false, topic: "" };
function obShow(n) {
  ob.step = n;
  [1, 2, 3, 4, 5, 6].forEach(i => $("ob" + i).classList.toggle("on", i === n));
  document.querySelectorAll(".ob-dot").forEach((d, i) => d.classList.toggle("on", i === n - 1));
}
function setChromeInert(on) {
  // while onboarding covers the app, keep the header/main out of the tab order
  document.querySelectorAll("header.app-header, main").forEach(el => {
    if (on) el.setAttribute("inert", ""); else el.removeAttribute("inert");
  });
}
function startOnboarding() {
  $("onboard").classList.add("active");
  $("onboard").setAttribute("role", "dialog");
  $("onboard").setAttribute("aria-modal", "true");
  $("onboard").setAttribute("aria-label", "Bienvenida y configuración");
  setChromeInert(true);
  obShow(1);
  setTimeout(() => $("obName").focus(), 300);
}
function wireChoices(containerId, cb) {
  $(containerId).querySelectorAll(".ob-choice").forEach(b => {
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      $(containerId).querySelectorAll(".ob-choice").forEach(x => { x.classList.remove("sel"); x.setAttribute("aria-pressed", "false"); });
      b.classList.add("sel");
      b.setAttribute("aria-pressed", "true");
      cb(b.dataset.v);
    });
  });
}
// 1 — name + how patients address her
wireChoices("obTitleChoices", v => { ob.title = v; });
$("ob1Next").addEventListener("click", () => {
  const n = $("obName").value.trim();
  if (!n) { toast(L("Dinos tu nombre para empezar 💗", "Tell us your name to get started 💗")); $("obName").focus(); return; }
  ob.name = n.replace(/\s+/g, " ");
  if (ob.title === null) ob.title = "";
  $("obNameEcho").textContent = ob.name;
  obShow(2);
});
$("obName").addEventListener("keydown", e => { if (e.key === "Enter") $("ob1Next").click(); });
// 2 — goal + her own words
wireChoices("obGoalChoices", v => { ob.goal = v; });
$("ob2Next").addEventListener("click", () => {
  if (!ob.goal) { toast(L("Elige una — ¿para qué estás aprendiendo?", "Pick one — what are you learning for?")); return; }
  ob.story = $("obStory").value.trim();
  obShow(3);
});
// 3 — struggles (multi-select)
$("obStruggleChoices").querySelectorAll(".ob-choice").forEach(b => {
  b.setAttribute("aria-pressed", "false");
  b.addEventListener("click", () => {
    b.classList.toggle("sel");
    b.setAttribute("aria-pressed", String(b.classList.contains("sel")));
    const v = b.dataset.v;
    ob.struggles = b.classList.contains("sel") ? [...ob.struggles, v] : ob.struggles.filter(x => x !== v);
  });
});
$("ob3Next").addEventListener("click", () => obShow(4));
// 4 — level, 5 — daily goal
wireChoices("obLevelChoices", v => { ob.level = v; setTimeout(() => obShow(5), 250); });
wireChoices("obDailyChoices", v => { ob.daily = v; setTimeout(() => obShow(6), 250); });
// 6 — cheer channel
$("obNtfyYes").addEventListener("click", () => {
  ob.ntfyOn = true;
  if (!ob.topic) ob.topic = makeTopic(ob.name);
  $("obNtfyYes").classList.add("sel");
  $("obNtfySkip").classList.remove("sel");
  $("obTopic").textContent = ob.topic;
  $("obTopicLink").href = "https://ntfy.sh/" + ob.topic;
  $("obNtfyCard").style.display = "block";
});
$("obNtfyTest").addEventListener("click", () => ntfyTest(ob.topic, ob.name));
$("obNtfySkip").addEventListener("click", () => { ob.ntfyOn = false; finishOnboarding(); });
$("obFinish").addEventListener("click", finishOnboarding);
function finishOnboarding() {
  profile = {
    name: ob.name, title: ob.title, goal: ob.goal, story: ob.story,
    struggles: ob.struggles, level: ob.level, daily: +(ob.daily || 40),
    ntfy: { on: ob.ntfyOn, topic: ob.ntfyOn ? ob.topic : "" }
  };
  settings.reveal = ob.level === "semilla";
  saveAll();
  $("onboard").classList.remove("active");
  setChromeInert(false);
  confetti(90);
  const openers = {
    rotaciones: L("Tus pacientes de las salas te están esperando.", "Your patients in the rooms are waiting for you."),
    osce: L("Cada sala termina con tu informe estilo OSCE.", "Every room ends with your OSCE-style report."),
    comunidad: L("Cada frase que aprendes es alguien que se sentirá escuchado.", "Every phrase you learn is someone who'll feel heard."),
    amor: L("Pues vamos a hablarlo bonito.", "Then let's speak it beautifully.")
  };
  toast(L(`Te damos la bienvenida a bordo, ${displayName()}.`, `Welcome aboard, ${displayName()}.`) + " " + (openers[ob.goal] || ""), 4200);
  renderHome();
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener("keydown", e => {
  if (e.repeat) return; // held keys must not machine-gun the mic toggle
  const tag = (document.activeElement || {}).tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if ($("onboard").classList.contains("active")) return;
  const inSim = $("view-sim").classList.contains("active") && $("debrief").style.display === "none";
  const inDrill = $("view-drill").classList.contains("active");
  const inFree = $("view-free").classList.contains("active") && $("freeRun").style.display !== "none";
  if (e.key === " " && (inSim || inDrill || inFree)) {
    e.preventDefault();
    if (inSim) (activeRec ? stopListening() : simTalk());
    else if (inDrill) (activeRec ? stopListening() : drillTalk());
    else (activeRec ? stopListening() : freeTalk());
  } else if ((e.key === "l" || e.key === "L") && inSim) useListen();
  else if ((e.key === "l" || e.key === "L") && inDrill) $("drillListen").click();
  else if ((e.key === "l" || e.key === "L") && inFree) $("freeListen").click();
  else if ((e.key === "h" || e.key === "H") && inSim) useHint();
  else if ((e.key === "n" || e.key === "N") && inSim) acceptStep();
  else if ((e.key === "n" || e.key === "N") && inDrill) $("drillNext").click();
  else if ((e.key === "n" || e.key === "N") && inFree) $("freeNext").click();
  else if (e.key === "Escape" && $("view-sim").classList.contains("active")) show("home");
});

// ============================================================
// BOOT
// ============================================================
rollDay();
applyUILang();
renderHome();
if (!profile || !profile.name) startOnboarding();
else {
  renderHeader();
  // deep links: index.html#sim=sala1 or #drill=historia (shareable rooms)
  const h = location.hash.slice(1);
  const [k, v] = h.split("=");
  if (k === "sim" && v) startSim(v);
  else if (k === "drill" && v) startDrill(v);
  else if (k === "progress") show("progress");
}
