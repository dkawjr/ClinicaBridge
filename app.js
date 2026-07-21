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
let settings = LS.get("cb_settings", { dialect: "es-MX", voiceURI: "", rate: 0.95, showEn: true, cam: true, rec: false, reveal: false });
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
    toast(`🔥 ¡Meta diaria cumplida, ${displayName()}! Racha: ${progress.streak} día${progress.streak === 1 ? "" : "s"}`);
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
    $("heroGreet").textContent = `Hola, ${displayName()} · ¿pasamos consulta?`;
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
if (!srSupported) $("supportBanner").style.display = "block";

let activeRec = null;
function listenOnce({ onInterim, onFinal, onEnd, onError }) {
  if (!srSupported) { toast("Tu navegador no soporta reconocimiento de voz — usa Chrome o Edge."); return null; }
  stopListening();
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
    if (e.error === "not-allowed") toast("Permiso de micrófono denegado — actívalo para practicar.");
    else if (e.error !== "no-speech" && e.error !== "aborted") toast("Error de micrófono: " + e.error);
    if (onError) onError(e.error);
  };
  rec.onend = () => {
    activeRec = null;
    if (onFinal) onFinal(finalText.trim(), alternatives);
    if (onEnd) onEnd();
  };
  try { rec.start(); activeRec = rec; } catch { /* already started */ }
  return rec;
}
function stopListening() {
  if (activeRec) { try { activeRec.stop(); } catch {} activeRec = null; }
}

// ---------------- text to speech ----------------
let voices = [];
function loadVoices() {
  voices = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith("es"));
  const sel = $("setVoice");
  sel.innerHTML = "";
  if (!voices.length) { sel.innerHTML = "<option value=''>(voz del sistema)</option>"; return; }
  voices.forEach(v => {
    const o = document.createElement("option");
    o.value = v.voiceURI; o.textContent = `${v.name} (${v.lang})`;
    if (v.voiceURI === settings.voiceURI) o.selected = true;
    sel.appendChild(o);
  });
  if (!settings.voiceURI && voices[0]) settings.voiceURI = voices[0].voiceURI;
}
speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text, opts = {}) {
  return new Promise(resolve => {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voices.find(x => x.voiceURI === settings.voiceURI) || voices[0];
    if (v) u.voice = v;
    u.lang = v ? v.lang : "es-MX";
    u.rate = (opts.rate || 1) * settings.rate;
    u.pitch = opts.pitch || 1;
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

// ---------------- navigation ----------------
const VIEWS = ["home", "drill", "deck", "builder", "sim", "progress", "free"];
function show(view) {
  VIEWS.forEach(v => $("view-" + v).classList.toggle("active", v === view));
  if (view !== "sim") teardownSim();
  stopListening();
  speechSynthesis.cancel();
  if (view === "home") { renderHome(); window.scrollTo(0, 0); }
  if (view === "progress") { renderProgress(); window.scrollTo(0, 0); }
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
  <button class="door ${custom ? "custom-door" : ""}" data-sc="${sc.id}">
    <span class="door-tab"><span class="num">${sc.room || "★"}</span><span class="sala">${custom ? "PERSONALIZADA" : "SALA"}</span><span class="knob"></span></span>
    <span class="door-body">
      <h3>${sc.title}</h3>
      <span class="en">${sc.en || sc.setting || ""}</span>
      <span class="door-meta">
        <span class="pips">${pips}</span>
        <span class="best">${best != null ? `mejor: <strong>${best}%</strong>` : "sin intentos"}</span>
      </span>
    </span>
    ${custom ? `<span class="del-x" data-del="${sc.id}" title="Borrar sala" role="button">✕</span>` : ""}
  </button>`;
}

function renderHome() {
  renderHeader();
  // rooms
  const rg = $("roomsGrid");
  rg.innerHTML =
    SCENARIOS.map(sc => doorHTML(sc, false)).join("") +
    customScenarios.map(sc => doorHTML(sc, true)).join("") +
    `<button class="door new-door" id="newDoor">＋ &nbsp;Crea tu propia sala</button>`;
  rg.querySelectorAll(".door[data-sc]").forEach(d => d.addEventListener("click", e => {
    const del = e.target.closest("[data-del]");
    if (del) {
      e.stopPropagation();
      customScenarios = customScenarios.filter(s => s.id !== del.dataset.del);
      saveAll(); renderHome(); toast("Sala borrada.");
      return;
    }
    startSim(d.dataset.sc);
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
    <button class="tile" data-script="${s.id}">
      <span class="ico">📝</span>
      <span><span class="t-title">${s.title}</span><br><span class="t-sub">${s.phrases.length} frases</span></span>
      <span class="t-prog script-tile-del" data-sdel="${s.id}" title="Borrar">✕</span>
    </button>`).join("") +
    `<button class="tile" id="newScript"><span class="ico">➕</span><span><span class="t-title">Nueva pr&aacute;ctica</span><br><span class="t-sub">paste your own text</span></span></button>`;
  document.querySelectorAll("[data-script]").forEach(t => t.addEventListener("click", e => {
    const del = e.target.closest("[data-sdel]");
    if (del) { e.stopPropagation(); scripts = scripts.filter(x => x.id !== del.dataset.sdel); saveAll(); renderHome(); toast("Práctica borrada."); return; }
    const s = scripts.find(x => x.id === t.dataset.script);
    if (s) startFree(s.title, s.phrases);
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
    const why = profile.goal === "osce" ? "tu próximo caso estilo OSCE"
      : profile.goal === "rotaciones" ? "para que en el hospital te salga solo"
      : profile.goal === "comunidad" ? "una conversación que alguien de tu comunidad necesita"
      : "tu próxima historia por dominar";
    const best = progress.best[pick.id];
    items.push({ emoji: "🚪", label: `Sala ${pick.room || "★"} · ${pick.title}`, why: best ? `subir tu ${best}% — ${why}` : why, run: () => startSim(pick.id) });
  }
  // 2) from her struggles
  if (st.includes("pron")) items.push({ emoji: "🌀", label: "Drill: Examen físico", why: "puro músculo de pronunciación — dijiste que la rr y la j se resisten", run: () => startDrill("examen") });
  if (st.includes("vocab")) { const d = DECKS[Math.floor(Math.random() * DECKS.length)]; items.push({ emoji: "📚", label: `Tarjetas: ${d.title}`, why: "5 minutos de vocabulario — para que las palabras se queden", run: () => startDeck(d.id) }); }
  if (st.includes("numeros")) items.push({ emoji: "🔢", label: "Tarjetas: Números y dosis", why: "dosis y fechas sin titubear — tú lo pediste", run: () => startDeck("numeros") });
  if (st.includes("gram")) items.push({ emoji: "🧩", label: "Drill: Historia clínica", why: "armar preguntas completas, una y otra vez", run: () => startDrill("historia") });
  if (st.includes("listen")) { const s2 = SCENARIOS[1]; items.push({ emoji: "👂", label: `Sala 02 · ${s2.title}`, why: "escucha a la Sra. López y usa ↻ repetir sin pena — así se entrena el oído", run: () => startSim(s2.id) }); }
  if (st.includes("freeze")) items.push({ emoji: "🧊", label: "Drill: Saludos y presentación", why: "frases de arranque en automático = nunca más congelarte al entrar", run: () => startDrill("saludos") });
  // 3) her own material
  if (scripts.length) { const s = scripts[0]; items.push({ emoji: "📝", label: `Tu práctica: ${s.title}`, why: "lo que TÚ quisiste trabajar", run: () => startFree(s.title, s.phrases) }); }
  else items.push({ emoji: "📝", label: "Práctica libre", why: "pega tu propio guion y te lo calificamos en vivo", run: () => { openFreeSetup(); show("free"); } });
  return items.slice(0, 3);
}
function renderPlan() {
  const items = buildPlan();
  const block = $("planBlock");
  if (!profile || !items.length) { block.style.display = "none"; return; }
  block.style.display = "block";
  $("planTitle").textContent = `Tu plan de hoy, ${profile.name}`;
  $("planGrid").innerHTML = items.map((it, i) => `
    <button class="plan-item" data-plan="${i}">
      <span class="p-emoji">${it.emoji}</span>
      <span><span class="p-label">${it.label}</span><br><span class="p-why">${it.why}</span></span>
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
    const hasWord = tokens(t).length > 0;
    const span = document.createElement("span");
    span.className = "k-word";
    span.textContent = t;
    if (hasWord) {
      const st = statuses ? statuses[ni] : null;
      if (st === "hit") span.classList.add("hit");
      else if (st === "close") span.classList.add("close");
      else if (st === "miss") span.classList.add("miss");
      else if (hidden) span.classList.add("hidden-word");
      ni++;
    }
    el.appendChild(span);
  });
}

const CHEERS = ["¡Eso!", "¡Perfecto!", "¡Así se dice!", "Tu paciente te entendió perfecto.", "¡Qué bien suena!", "¡Impecable!"];
const NUDGES = ["Casi — una vez más y sale.", "Vas bien, inténtalo otra vez.", "Escúchala otra vez y repite.", "No te rindas, ya casi."];
function cheer() { const c = CHEERS[Math.floor(Math.random() * CHEERS.length)]; return profile && Math.random() < .4 ? `¡Eso, ${profile.name}!` : c; }
function nudge() { return NUDGES[Math.floor(Math.random() * NUDGES.length)]; }

// ============================================================
// DRILL MODE
// ============================================================
let drill = null; // {set, idx, attempted}
function startDrill(setId) {
  const set = DRILL_SETS.find(s => s.id === setId);
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
  $("drillLive").innerHTML = "Pulsa <b>Hablar</b> y di la frase.";
  $("drillMicDot").classList.remove("live");
  const tip = PRONUN_TIPS[(idx + set.title.length) % PRONUN_TIPS.length];
  $("drillTip").className = "tip-box";
  $("drillTip").style.display = "block";
  $("drillTip").innerHTML = `<b>TIP DE PRONUNCIACIÓN</b>${tip}`;
}
function drillTalk() {
  const { set, idx } = drill;
  const p = set.phrases[idx];
  $("drillTalk").classList.add("listening");
  $("drillMicDot").classList.add("live");
  $("drillLive").textContent = "Escuchando…";
  listenOnce({
    onInterim: txt => {
      $("drillLive").textContent = txt || "…";
      const st = alignWords(tokens(p.es), tokens(txt), false);
      renderKaraoke($("drillWords"), p.es, st, false);
    },
    onFinal: (txt, alts) => {
      $("drillTalk").classList.remove("listening");
      $("drillMicDot").classList.remove("live");
      if (!txt && !alts.length) { $("drillLive").textContent = "No te escuché — inténtalo otra vez."; return; }
      let best = scorePhrase(p.es, [], txt);
      alts.forEach(a => { const s = scorePhrase(p.es, [], a); if (s.score > best.score) best = s; });
      renderKaraoke($("drillWords"), p.es, best.statuses, false);
      $("drillLive").textContent = txt || "(sin transcripción)";
      const pct = Math.round(best.score * 100);
      $("drillScore").textContent = pct + "%";
      $("drillScore").style.color = pct >= 80 ? "var(--verde-vital)" : pct >= 50 ? "var(--ambar)" : "var(--rojo)";
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
$("fcNext").addEventListener("click", () => { deck.pos = (deck.pos + 1) % deck.order.length; if (deck.pos === 0) { toast("¡Mazo completo! 💗"); awardLatidos(5, true); } renderCard(); });
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
  if (/rr/.test(joined)) tips.push("La «rr» se vibra con la punta de la lengua — practica despacio: pe-rro, ca-rro.");
  if (/j|ge|gi/.test(joined)) tips.push("La «j» (y ge/gi) suena como una «h» inglesa fuerte: ojo, urgencias, gente.");
  if (/ñ/.test(joined)) tips.push("La «ñ» es como «ny» en canyon: riñón, año, mañana.");
  if (/ll|y/.test(joined)) tips.push("La «ll» y la «y» suenan igual, como la «y» de yes: pastilla, ayuda.");
  if (/^h| h/.test(" " + joined)) tips.push("La «h» es muda — «hígado» empieza directo con la «í».");
  if (/[áéíóú]/.test(joined)) tips.push("Ojo con el acento escrito — esa sílaba se pronuncia MÁS fuerte: corazón, análisis.");
  if (/ción|sión/.test(joined)) tips.push("Las palabras en -ción llevan la fuerza al final: presión, respiración.");
  return tips.slice(0, 3);
}
function renderCoach(el, targetEs, statuses, score) {
  const displayToks = targetEs.split(/\s+/).filter(t => tokens(t).length);
  const missed = displayToks.filter((_, i) => statuses[i] === "miss");
  const close = displayToks.filter((_, i) => statuses[i] === "close");
  el.style.display = "block";
  let html = `<b class="c-head">TU COACH 🫀</b>`;
  if (score >= 0.95) {
    html += `Impecable — se te entendió cada palabra. Súbele un poco a la velocidad y queda perfecto.`;
  } else if (!missed.length && !close.length) {
    html += `¡Muy bien! Se entendió todo. Repítela una vez más con confianza y pasa a la siguiente.`;
  } else {
    if (score >= 0.7) html += `Vas muy bien — el mensaje se entendió. Vamos a pulir lo que faltó:`;
    else if (score >= 0.4) html += `Buen intento — se entendió una parte. Enfócate en estas palabras:`;
    else html += `Tranquila, esto es lo difícil de verdad. Escucha la frase (🔊), dila en trocitos, y otra vez:`;
    const chips = [...missed.map(w => ({ w, k: "miss" })), ...close.map(w => ({ w, k: "close" }))];
    html += `<div class="miss-chips">${chips.map(c => `<span class="miss-chip" data-say="${c.w.replace(/"/g, "")}"${c.k === "close" ? ' style="color:var(--ambar); border-color:#E4D2A0"' : ""}>🔊 ${c.w}</span>`).join("")}</div>`;
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
  $("freeLive").innerHTML = "Pulsa <b>Hablar</b> y di la frase.";
  $("freeMicDot").classList.remove("live");
  $("freeCoach").style.display = "none";
}
function freeTalk() {
  const p = free.phrases[free.idx];
  $("freeTalk").classList.add("listening");
  $("freeMicDot").classList.add("live");
  $("freeLive").textContent = "Escuchando…";
  listenOnce({
    onInterim: txt => {
      $("freeLive").textContent = txt || "…";
      renderKaraoke($("freeWords"), p, alignWords(tokens(p), tokens(txt), false), false);
    },
    onFinal: (txt, alts) => {
      $("freeTalk").classList.remove("listening");
      $("freeMicDot").classList.remove("live");
      if (!txt && !alts.length) { $("freeLive").textContent = "No te escuché — inténtalo otra vez, más cerca del micrófono."; return; }
      let best = scorePhrase(p, [], txt);
      alts.forEach(a => { const s = scorePhrase(p, [], a); if (s.score > best.score) best = s; });
      renderKaraoke($("freeWords"), p, best.statuses, false);
      $("freeLive").textContent = txt || "(sin transcripción)";
      const pct = Math.round(best.score * 100);
      $("freeScore").textContent = pct + "%";
      $("freeScore").style.color = pct >= 80 ? "var(--verde-vital)" : pct >= 50 ? "var(--ambar)" : "var(--rojo)";
      renderCoach($("freeCoach"), p, best.statuses, best.score);
      progress.phrases += 1;
      awardLatidos(pct >= 80 ? 10 : pct >= 50 ? 5 : 2, true);
      if (pct >= 80) toast(cheer());
    }
  });
}
$("freeStart").addEventListener("click", () => {
  const phrases = splitPhrases($("freeText").value);
  if (!phrases.length) { toast("Escribe o pega al menos una frase en español."); return; }
  startFree($("freeTitle").value.trim() || "Mi práctica", phrases);
});
$("freeSaveList").addEventListener("click", () => {
  const phrases = splitPhrases($("freeText").value);
  if (!phrases.length) { toast("Escribe o pega al menos una frase primero."); return; }
  const title = $("freeTitle").value.trim() || `Mi práctica ${scripts.length + 1}`;
  scripts.unshift({ id: "s" + Date.now(), title, phrases });
  saveAll();
  toast(`«${title}» guardada en Mi práctica. 💗`);
});
$("freeTalk").addEventListener("click", () => activeRec ? stopListening() : freeTalk());
$("freeListen").addEventListener("click", () => speak(free.phrases[free.idx]));
$("freeNext").addEventListener("click", () => { free.idx = (free.idx + 1) % free.phrases.length; if (free.idx === 0) toast("¡Lista completa! Otra vuelta refuerza. 💪"); renderFreePhrase(); });
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
    ? `Cumpliste tu meta de ${goal} latidos en ${metDays} de los últimos 14 días. ${metDays >= 10 ? "Eso ya es un hábito. 🌟" : metDays >= 5 ? "Se está volviendo costumbre. 💪" : "Cada día cuenta — hoy es buen día. 💗"}`
    : `Tu meta es ${goal} latidos al día — unos 10 minutos. El primer día verde se siente increíble.`;

  // per-sala bests
  $("salaProg").innerHTML = allScenarios().map(s => {
    const b = progress.best[s.id] || 0;
    return `<div class="sala-row"><span class="s-t">${s.room ? "Sala " + s.room + " · " : ""}${s.title}</span>
      <div class="s-bar"><div class="s-fill" style="width:${b}%"></div></div>
      <span class="s-v">${b ? b + "%" : "—"}</span></div>`;
  }).join("");

  // her why
  const GOALS = { rotaciones: "🏥 Para mis rotaciones y la clínica", osce: "📋 Para OSCEs y exámenes", comunidad: "❤️ Para mi comunidad", amor: "✨ Por amor al idioma" };
  $("whyStory").textContent = profile && profile.story
    ? `«${profile.story}»`
    : "Escribiste tu meta al empezar — aquí viviría. (Puedes contárnosla de nuevo borrando tu perfil… o simplemente sigue practicando.)";
  $("whyChips").innerHTML = profile ? [
    `<span class="chip">${GOALS[profile.goal] || "💗 Aprender"}</span>`,
    ...(profile.struggles || []).map(s => `<span class="chip">trabajando: ${STRUGGLE_LABELS[s] || s}</span>`)
  ].join("") : "";

  // history
  $("histList").innerHTML = progress.history.length
    ? progress.history.slice(0, 10).map(h => `<div class="hist-row"><span class="h-d">${h.d.slice(5)}</span><span>${h.title}</span><span class="h-acc" style="color:${h.acc >= 80 ? "var(--verde-vital)" : h.acc >= 50 ? "var(--ambar)" : "var(--rojo)"}">${h.acc}%</span></div>`).join("")
    : `<p style="color:var(--tinta-suave); font-size:.88rem">Tu primer encuentro aparecerá aquí. Las salas te esperan. 🚪</p>`;
}

$("backupSave").addEventListener("click", () => {
  const data = { app: "ClinicaBridge", v: 2, saved: todayKey(), profile, settings, progress, customScenarios, scripts };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `clinicabridge_${norm(profile ? profile.name : "progreso").replace(/\s+/g, "_")}_${todayKey()}.json`;
  a.click();
  toast("💾 Copia guardada — mándatela por correo o guárdala donde quieras.");
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
      toast(`¡Bienvenida de vuelta, ${displayName()}! Todo tu progreso está aquí. 💗`);
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
let camStream = null, recorder = null, recChunks = [], recURL = null;
let presence = { on: false, samples: 0, facing: 0, timer: null, detector: null };
let simTimerH = null;

function allScenarios() { return [...SCENARIOS, ...customScenarios]; }

async function startSim(scId) {
  const sc = allScenarios().find(s => s.id === scId);
  if (!sc || !sc.steps || !sc.steps.length) { toast("Esta sala no tiene pasos todavía."); return; }
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
  $("avatarInitials").textContent = (pat.name || "P").replace(/^(Sr\.|Sra\.|Srta\.)\s*/i, "").slice(0, 1).toUpperCase();

  // timer
  clearInterval(simTimerH);
  simTimerH = setInterval(() => {
    const s = Math.floor((Date.now() - sim.t0) / 1000);
    $("simTimer").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }, 500);

  // reset per-encounter capture state + HUD chips
  recURL = null; recChunks = [];
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
    if (settings.rec && window.MediaRecorder) {
      recChunks = []; recURL = null;
      recorder = new MediaRecorder(camStream);
      recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
      recorder.start();
      $("simRecWrap").style.display = "inline-flex";
    } else $("simRecWrap").style.display = "none";
    startPresence(video);
  } catch (err) {
    camRow.innerHTML = `<div class="cam-off-note">📷 No pude acceder a la cámara (${err.name}). El encuentro funciona igual — solo sin video.</div>`;
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
  $("kHintState").textContent = hidden ? "palabras ocultas — se revelan al decirlas" : "frase visible";
  renderKaraoke($("kWords"), st.target.es, null, hidden);
  $("liveTx").innerHTML = "Pulsa <b>Hablar</b> cuando estés listo.";
  renderStepDots();
  // patient speaks
  await patientSay(st.patient.es, st.patient.en);
}

async function patientSay(es, en) {
  $("avatarWrap").parentElement.classList.add("speaking");
  $("pSubEn").textContent = settings.showEn ? (en || "") : "";
  // typewriter subtitle in sync-ish with speech
  const el = $("pSubEs"); el.textContent = "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) el.textContent = es;
  else {
    let k = 0;
    const h = setInterval(() => { el.textContent = es.slice(0, ++k); if (k >= es.length) clearInterval(h); }, 28);
  }
  const v = (sim.sc.patient && sim.sc.patient.voice) || {};
  await speak(es, { pitch: v.pitch || 1, rate: v.rate || 1 });
  $("avatarWrap").parentElement.classList.remove("speaking");
}

function renderStepDots() {
  $("stepDots").innerHTML = sim.sc.steps.map((_, i) =>
    `<span class="sdot ${i < sim.i ? "done" : i === sim.i ? "now" : ""}"></span>`).join("");
}

function simTalk() {
  const st = currentStep();
  $("talkBtn").classList.add("listening");
  $("micDot").classList.add("live");
  $("liveTx").textContent = "Escuchando…";
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
      if (!txt && !alts.length) { $("liveTx").textContent = "No te escuché — acércate al micrófono e inténtalo otra vez."; return; }
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
        setTimeout(acceptStep, 1100);
      } else {
        toast(nudge());
      }
    }
  });
}

function acceptStep() {
  if (!sim || sim.done || $("acceptBtn").disabled) return;
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
  $("kHintState").textContent = "pista usada — frase visible (–25%)";
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
  const verdict = acc >= 85 ? `¡Excelente, ${name}!` : acc >= 70 ? `¡Muy bien, ${name}!` : acc >= 50 ? `En camino, ${name}.` : `Sigue practicando, ${name}.`;
  $("dbVerdict").textContent = verdict;
  $("dbSub").textContent = acc > prevBest && prevBest > 0
    ? `Nuevo récord personal en esta sala — antes ${prevBest}%.`
    : `${sim.sc.title} · ${sim.sc.steps.length} intercambios · +15 latidos por completar la sala.`;
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
  $("dbMissed").innerHTML = missed.length
    ? `<h4>FRASES PARA REPASAR</h4><ul>` + missed.map(st => `<li><b>${st.target.es}</b><br>${st.target.en || ""}</li>`).join("") + `</ul>`
    : `<h4>FRASES PARA REPASAR</h4><p style="color:var(--sim-texto-suave)">Ninguna — dominaste todas las frases. 🎉</p>`;

  $("dbDownload").style.display = recURL ? "inline-flex" : "none";
  if (acc >= 70) confetti(acc >= 85 ? 110 : 60);
}

function stopCaptureKeepURL() {
  clearInterval(simTimerH);
  if (presence.timer) { clearInterval(presence.timer); presence.timer = null; }
  if (recorder && recorder.state !== "inactive") {
    recorder.onstop = () => {
      if (recChunks.length) recURL = URL.createObjectURL(new Blob(recChunks, { type: "video/webm" }));
      $("dbDownload").style.display = recURL && sim && sim.done ? "inline-flex" : "none";
    };
    recorder.stop();
  }
  if (camStream) { camStream.getTracks().forEach(t => t.stop()); camStream = null; }
  recorder = null;
}

function teardownSim() {
  clearInterval(simTimerH);
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
  a.download = `encuentro_${sim.sc.id}_${todayKey()}.webm`;
  a.click();
});

// ============================================================
// BUILDER
// ============================================================
function stepBlockHTML(n, s = {}) {
  return `<div class="step-block">
    <span class="step-n">PASO ${n}</span>
    <button class="mini-btn rm-step" style="border-color:var(--linea); color:var(--tinta-suave)">✕</button>
    <div class="form-grid" style="margin-top:10px">
      <div><label class="f-label">El paciente dice (ES)</label><input class="f-in s-pes" value="${s.pes || ""}" placeholder="Me duele mucho la espalda."></div>
      <div><label class="f-label">Patient line (EN)</label><input class="f-in s-pen" value="${s.pen || ""}" placeholder="My back hurts a lot."></div>
      <div class="full"><label class="f-label">Your move (cue, EN)</label><input class="f-in s-cue" value="${s.cue || ""}" placeholder="Ask when it started and what makes it worse."></div>
      <div><label class="f-label">Respuesta objetivo (ES)</label><input class="f-in s-tes" value="${s.tes || ""}" placeholder="¿Cuándo comenzó? ¿Qué lo empeora?"></div>
      <div><label class="f-label">Target (EN)</label><input class="f-in s-ten" value="${s.ten || ""}" placeholder="When did it start? What makes it worse?"></div>
      <div class="full"><label class="f-label">Alternates (ES, separa con | )</label><input class="f-in s-alt" value="${s.alt || ""}" placeholder="¿Desde cuándo le duele? | ¿Cuándo empezó el dolor?"></div>
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
  if (!sc) { toast("Ponle un título y al menos un paso completo (paciente + respuesta)."); return; }
  customScenarios.push(sc);
  saveAll();
  toast(`Sala «${sc.title}» guardada. ¡A practicar!`);
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
$("setNtfy").addEventListener("change", () => {
  if (!profile) { $("setNtfy").checked = false; return; }
  profile.ntfy = profile.ntfy || { on: false, topic: "" };
  profile.ntfy.on = $("setNtfy").checked;
  if (profile.ntfy.on && !profile.ntfy.topic) profile.ntfy.topic = makeTopic();
  saveAll();
  refreshNtfyRow();
});
$("setNtfyTest").addEventListener("click", ntfyTest);
$("settingsClose").addEventListener("click", () => {
  settings.dialect = $("setDialect").value;
  settings.voiceURI = $("setVoice").value;
  settings.rate = +$("setRate").value;
  settings.showEn = $("setEn").checked;
  settings.cam = $("setCam").checked;
  settings.rec = $("setRec").checked;
  settings.reveal = $("setReveal").checked;
  saveAll();
  $("settingsModal").close();
  toast("Ajustes guardados.");
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
function startOnboarding() {
  $("onboard").classList.add("active");
  obShow(1);
  setTimeout(() => $("obName").focus(), 300);
}
function wireChoices(containerId, cb) {
  $(containerId).querySelectorAll(".ob-choice").forEach(b => b.addEventListener("click", () => {
    $(containerId).querySelectorAll(".ob-choice").forEach(x => x.classList.remove("sel"));
    b.classList.add("sel");
    cb(b.dataset.v);
  }));
}
// 1 — name + how patients address her
wireChoices("obTitleChoices", v => { ob.title = v; });
$("ob1Next").addEventListener("click", () => {
  const n = $("obName").value.trim();
  if (!n) { toast("Dinos tu nombre para empezar 💗"); $("obName").focus(); return; }
  ob.name = n.replace(/\s+/g, " ");
  if (ob.title === null) ob.title = "";
  $("obNameEcho").textContent = ob.name;
  obShow(2);
});
$("obName").addEventListener("keydown", e => { if (e.key === "Enter") $("ob1Next").click(); });
// 2 — goal + her own words
wireChoices("obGoalChoices", v => { ob.goal = v; });
$("ob2Next").addEventListener("click", () => {
  if (!ob.goal) { toast("Elige una — ¿para qué estás aprendiendo?"); return; }
  ob.story = $("obStory").value.trim();
  obShow(3);
});
// 3 — struggles (multi-select)
$("obStruggleChoices").querySelectorAll(".ob-choice").forEach(b => b.addEventListener("click", () => {
  b.classList.toggle("sel");
  const v = b.dataset.v;
  ob.struggles = b.classList.contains("sel") ? [...ob.struggles, v] : ob.struggles.filter(x => x !== v);
}));
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
  confetti(90);
  const openers = {
    rotaciones: "Tus pacientes de las salas te están esperando.",
    osce: "Cada sala termina con tu informe estilo OSCE.",
    comunidad: "Cada frase que aprendes es alguien que se sentirá escuchado.",
    amor: "Pues vamos a hablarlo bonito."
  };
  toast(`¡Bienvenida a bordo, ${displayName()}! ${openers[ob.goal] || ""}`, 4200);
  renderHome();
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener("keydown", e => {
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
