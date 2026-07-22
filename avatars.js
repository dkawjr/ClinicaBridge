/* ============================================================
   ClínicaBridge — Retratos
   A layered, animated SVG portrait system for the virtual patients.
   Each patient is a parameterized bust: breathing body, swaying head,
   blinking eyes, viseme-cycling mouth, and emotional brow/mouth states.
   No external assets — everything is drawn here.
   ============================================================ */
"use strict";

/* ------------------------------------------------------------
   Character definitions
   skin/skinD: base + shadow · hair/hairD: base + depth
   top: clothing base · topD: clothing depth · bg: backdrop tint
   ------------------------------------------------------------ */
const AV_CHARACTERS = {
  sala1: { // Sr. Ramírez, 58 — ED, chest pain
    skin: "#B07B55", skinD: "#8F5F3F", hair: "#4A4A50", hairD: "#35353B",
    top: "#31567D", topD: "#264460", bg: "#F3E4D3",
    style: "short", brows: 7, mustache: true, lines: true, blush: 0.10, lip: "#7E4B3A"
  },
  sala2: { // Sra. López, 31 — worried mom
    skin: "#C98F63", skinD: "#A56F49", hair: "#2E2226", hairD: "#1E1518",
    top: "#2E7D74", topD: "#1F5F58", bg: "#E8F0E9",
    style: "ponytail", brows: 5, earrings: true, blush: 0.22, lip: "#8E4A44", dots: "#DDF0EC"
  },
  sala3: { // Sra. García, 24 — first pregnancy
    skin: "#E0A57C", skinD: "#BC8259", hair: "#43302A", hairD: "#2E1F1B",
    top: "#D96C57", topD: "#B85344", bg: "#FBE9E4",
    style: "long", brows: 5, earrings: true, blush: 0.30, lip: "#A34E42"
  },
  sala4: { // Sr. Torres, 61 — diabetes
    skin: "#7C4E33", skinD: "#603A25", hair: "#9A9AA0", hairD: "#7C7C84",
    top: "#8A9BAE", topD: "#6E8093", bg: "#EAECF2",
    style: "balding", brows: 6, glasses: true, lines: true, blush: 0.08, lip: "#5C3527"
  },
  sala5: { // Sra. Delgado, 45 — pre-op, hospital gown
    skin: "#D9976F", skinD: "#B4774F", hair: "#54423C", hairD: "#3D2F2A",
    top: "#7FB8AE", topD: "#639C92", bg: "#E6EFF0",
    style: "wavy", brows: 5, earrings: true, lines: false, blush: 0.16, lip: "#96524A", gown: true, grayStreak: true
  },
  sala6: { // Srta. Vega, 19 — student, hoodie
    skin: "#EDB98A", skinD: "#C99463", hair: "#241B20", hairD: "#160F13",
    top: "#9D8BC2", topD: "#8071A5", bg: "#EFEAF6",
    style: "bangs", brows: 4.5, young: true, blush: 0.20, lip: "#A65B52", hoodie: true
  }
};

/* deterministic generic character for custom scenarios */
function avCustomCharacter(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const skins = [["#C98F63", "#A56F49"], ["#E0A57C", "#BC8259"], ["#8A5A3B", "#6C4429"], ["#EDB98A", "#C99463"]];
  const hairs = [["#2E2226", "#1E1518"], ["#4A4A50", "#35353B"], ["#43302A", "#2E1F1B"]];
  const tops  = [["#2E7D74", "#1F5F58"], ["#31567D", "#264460"], ["#9D8BC2", "#8071A5"], ["#D96C57", "#B85344"]];
  const s = skins[h % skins.length], hr = hairs[(h >>> 2) % hairs.length], t = tops[(h >>> 4) % tops.length];
  return {
    skin: s[0], skinD: s[1], hair: hr[0], hairD: hr[1], top: t[0], topD: t[1],
    bg: "#EFECE5", style: (h >>> 6) % 2 ? "short" : "wavy", brows: 5.5, blush: 0.15, lip: "#8E4A44"
  };
}

/* ------------------------------------------------------------
   SVG builder
   viewBox 0 0 320 380 · head center ≈ (160,150) · bust portrait
   ------------------------------------------------------------ */
function avBuildSVG(c, uid) {
  const S = c.skin, SD = c.skinD, H = c.hair, HD = c.hairD, T = c.top, TD = c.topD;

  /* ---- hair per style: [behindBody, behindFace, frontOfFace] ---- */
  let hairBack = "", hairFront = "";
  if (c.style === "short") {
    hairFront = `
      <path d="M92,150 C90,94 118,56 160,56 C202,56 230,94 228,150
               C226,132 220,119 210,111 C196,99 178,93 160,93
               C142,93 124,99 110,111 C100,119 94,132 92,150 Z" fill="${H}"/>
      <path d="M116,102 C124,88 140,79 160,78 C148,84 132,92 124,106 Z" fill="${HD}" opacity=".45"/>`;
  } else if (c.style === "balding") {
    hairFront = `
      <path d="M92,150 C92,116 100,92 116,78 C112,96 110,110 110,124 C104,132 96,140 92,150 Z" fill="${H}"/>
      <path d="M228,150 C228,116 220,92 204,78 C208,96 210,110 210,124 C216,132 224,140 228,150 Z" fill="${H}"/>
      <path d="M118,84 C132,70 148,64 160,64 C172,64 188,70 202,84 C188,76 172,72 160,72 C148,72 132,76 118,84 Z" fill="${H}" opacity=".85"/>`;
  } else if (c.style === "ponytail") {
    hairBack = `
      <path d="M236,104 C258,112 266,140 258,168 C252,190 238,202 228,204 C236,184 238,160 232,140 Z" fill="${HD}"/>
      <circle cx="240" cy="112" r="17" fill="${H}"/>`;
    hairFront = `
      <path d="M90,158 C86,96 116,54 160,54 C204,54 234,96 230,158
               C226,132 218,114 204,104 C210,118 211,127 210,136
               C198,108 180,96 160,96 C136,96 116,110 108,140
               C106,128 107,118 112,106 C99,116 93,134 90,158 Z" fill="${H}"/>
      <path d="M112,106 C124,88 142,78 162,78 C148,84 132,94 124,110 Z" fill="${HD}" opacity=".45"/>`;
  } else if (c.style === "long") {
    hairBack = `
      <path d="M96,120 C82,160 78,220 84,268 C90,300 106,314 122,318 C112,290 110,250 112,214 Z" fill="${HD}"/>
      <path d="M224,120 C238,160 242,220 236,268 C230,300 214,314 198,318 C208,290 210,250 208,214 Z" fill="${HD}"/>`;
    hairFront = `
      <path d="M90,160 C84,96 116,52 160,52 C204,52 236,96 230,160
               C228,130 220,112 208,102 C212,116 213,126 212,136
               C206,110 190,94 168,92 L163,102 L157,92
               C135,94 116,110 110,138 C108,126 109,116 114,102
               C101,112 93,130 90,160 Z" fill="${H}"/>
      <path d="M92,150 C90,190 92,230 100,258 C92,236 86,196 88,162 Z" fill="${H}"/>
      <path d="M228,150 C230,190 228,230 220,258 C228,236 234,196 232,162 Z" fill="${H}"/>`;
  } else if (c.style === "wavy") {
    hairBack = `
      <path d="M94,116 C80,150 76,196 82,232 C86,252 96,262 108,264 C102,270 104,278 112,280
               C104,252 102,214 106,182 Z" fill="${HD}"/>
      <path d="M226,116 C240,150 244,196 238,232 C234,252 224,262 212,264 C218,270 216,278 208,280
               C216,252 218,214 214,182 Z" fill="${HD}"/>`;
    hairFront = `
      <path d="M90,158 C86,98 116,54 160,54 C204,54 234,98 230,158
               C227,132 219,114 206,104 C211,117 212,126 211,135
               C201,108 182,95 160,95 C137,95 117,110 109,138
               C108,127 109,117 114,104 C101,114 93,132 90,158 Z" fill="${H}"/>
      ${c.grayStreak ? `<path d="M122,98 C130,88 140,82 150,80 C142,92 138,106 137,122 C132,114 126,106 122,98 Z" fill="#B9ABA4" opacity=".8"/>` : ""}`;
  } else if (c.style === "bangs") {
    hairBack = `
      <path d="M96,120 C84,164 82,226 88,272 C92,296 104,306 116,308 C108,282 106,244 108,208 Z" fill="${HD}"/>
      <path d="M224,120 C236,164 238,226 232,272 C228,296 216,306 204,308 C212,282 214,244 212,208 Z" fill="${HD}"/>`;
    hairFront = `
      <path d="M90,156 C86,94 116,52 160,52 C204,52 234,94 230,156
               C229,120 220,102 206,94 C213,106 214,116 210,128
               C206,110 196,98 186,92 C192,102 194,114 192,124
               C180,106 170,98 160,96 C150,98 140,106 128,124
               C126,114 128,102 134,92 C124,98 114,110 110,128
               C106,116 107,106 114,94 C100,102 91,120 90,156 Z" fill="${H}"/>`;
  }

  /* ---- clothing ---- */
  let clothing = `
    <path d="M56,382 C56,316 104,284 160,284 C216,284 264,316 264,382 Z" fill="${T}"/>
    <path d="M56,382 C58,340 74,312 100,298 C88,318 82,348 82,382 Z" fill="${TD}" opacity=".55"/>
    <path d="M264,382 C262,340 246,312 220,298 C232,318 238,348 238,382 Z" fill="${TD}" opacity=".55"/>`;
  if (c.gown) {
    clothing += `
      <path d="M132,292 L160,316 L188,292" fill="none" stroke="${TD}" stroke-width="5" stroke-linecap="round"/>
      ${[[104,330],[136,346],[168,352],[200,346],[228,326],[120,368],[160,376],[204,366]]
        .map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${TD}" opacity=".6"/>`).join("")}`;
  } else if (c.hoodie) {
    clothing += `
      <path d="M108,300 C120,282 140,272 160,272 C180,272 200,282 212,300 C196,292 178,288 160,288 C142,288 124,292 108,300 Z" fill="${TD}"/>
      <path d="M146,300 L144,336 M174,300 L176,336" stroke="${TD}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="144" cy="340" r="3.5" fill="${TD}"/><circle cx="176" cy="340" r="3.5" fill="${TD}"/>`;
  } else if (c.dots) {
    clothing += [[100,330],[130,318],[124,356],[160,340],[196,318],[190,356],[222,334],[160,372]]
      .map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${c.dots}" opacity=".7"/>`).join("");
    clothing += `<path d="M138,288 C146,300 174,300 182,288 L172,284 C168,292 152,292 148,284 Z" fill="${TD}"/>`;
  } else if (c.style === "short" || c.style === "balding") {
    clothing += `
      <path d="M134,288 L152,306 L160,294 L168,306 L186,288 L178,282 L160,300 L142,282 Z" fill="${TD}"/>
      <circle cx="160" cy="316" r="2.6" fill="${TD}"/><circle cx="160" cy="334" r="2.6" fill="${TD}"/>`;
  }

  /* ---- optional face details ---- */
  const mustache = c.mustache ? `
    <path d="M136,196 C144,188 154,186 160,188 C166,186 176,188 184,196 C176,201 166,200 160,197 C154,200 144,201 136,196 Z" fill="${H}"/>` : "";
  const glasses = c.glasses ? `
    <g stroke="#2F2F36" stroke-width="3.4" fill="rgba(255,255,255,.12)">
      <rect x="112" y="138" width="42" height="30" rx="12"/>
      <rect x="166" y="138" width="42" height="30" rx="12"/>
      <path d="M154,150 C158,146 162,146 166,150" fill="none"/>
      <path d="M112,150 L96,146 M208,150 L224,146" fill="none"/>
    </g>` : "";
  const earrings = c.earrings ? `
    <circle cx="93" cy="176" r="3.2" fill="#E8C36A"/><circle cx="227" cy="176" r="3.2" fill="#E8C36A"/>` : "";
  const lines = c.lines ? `
    <g stroke="${SD}" stroke-width="2" stroke-linecap="round" fill="none" opacity=".30">
      <path d="M134,106 Q160,100 186,106"/>
      <path d="M138,116 Q160,111 182,116"/>
      <path d="M128,192 Q124,200 126,208"/>
      <path d="M192,192 Q196,200 194,208"/>
    </g>` : "";

  const eyeR = c.young ? 1.12 : 1;

  return `
<svg class="retrato" viewBox="0 0 320 380" role="img" style="--bh:${Math.min(0.38, (c.blush || 0.15) * 2.2).toFixed(2)}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="avbg${uid}" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="${c.bg}"/>
    </radialGradient>
    <linearGradient id="avskin${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${S}"/><stop offset="100%" stop-color="${avShade(S, -8)}"/>
    </linearGradient>
    <radialGradient id="aviris${uid}" cx="42%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#7A5A44"/><stop offset="100%" stop-color="#38271C"/>
    </radialGradient>
    <clipPath id="avclip${uid}"><circle cx="160" cy="176" r="152"/></clipPath>
  </defs>

  <circle class="av-halo" cx="160" cy="176" r="149" fill="none" stroke="#E4007C" stroke-width="5" opacity="0"/>
  <circle cx="160" cy="176" r="152" fill="url(#avbg${uid})"/>
  <g clip-path="url(#avclip${uid})">
    <g class="av-body">
      ${hairBack}
      <path d="M118,310 C118,272 136,252 160,252 C184,252 202,272 202,310 Z" fill="${S}"/>
      <path d="M144,214 L176,214 L176,266 C176,276 144,276 144,266 Z" fill="${S}"/>
      <path d="M144,214 L176,214 L176,236 C166,244 154,244 144,236 Z" fill="${SD}" opacity=".55"/>
      ${clothing}
    </g>
    <g class="av-head">
      <ellipse cx="92" cy="160" rx="11" ry="17" fill="${S}"/>
      <ellipse cx="228" cy="160" rx="11" ry="17" fill="${S}"/>
      <ellipse cx="92" cy="160" rx="5" ry="9" fill="${SD}" opacity=".45"/>
      <ellipse cx="228" cy="160" rx="5" ry="9" fill="${SD}" opacity=".45"/>
      <path d="M160,64 C116,64 92,98 92,152 C92,208 120,242 160,242 C200,242 228,208 228,152 C228,98 204,64 160,64 Z" fill="url(#avskin${uid})"/>
      ${lines}
      <ellipse class="av-blushL" cx="124" cy="180" rx="12" ry="6.5" fill="#D96A5A" opacity="${c.blush}"/>
      <ellipse class="av-blushR" cx="196" cy="180" rx="12" ry="6.5" fill="#D96A5A" opacity="${c.blush}"/>

      <g class="av-brow av-browL" style="transform-origin:134px 133px">
        <path d="M116,136 Q134,127 152,134" fill="none" stroke="${HD}" stroke-width="${c.brows}" stroke-linecap="round"/>
      </g>
      <g class="av-brow av-browR" style="transform-origin:186px 133px">
        <path d="M168,134 Q186,127 204,136" fill="none" stroke="${HD}" stroke-width="${c.brows}" stroke-linecap="round"/>
      </g>

      <g class="av-eye av-eyeL" style="transform-origin:134px 153px">
        <ellipse cx="134" cy="153" rx="${12.5 * eyeR}" ry="${8.5 * eyeR}" fill="#FDFBF7"/>
        <g class="av-gaze">
          <circle cx="134" cy="153.5" r="${6.2 * eyeR}" fill="url(#aviris${uid})"/>
          <circle cx="134" cy="153.5" r="${2.9 * eyeR}" fill="#17100B"/>
          <circle cx="131.8" cy="151" r="1.7" fill="#FFF" opacity=".9"/>
        </g>
        <path d="M121,150 Q134,142 147,150" fill="none" stroke="${SD}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
        <rect class="av-lid" x="119" y="140" width="30" height="17" fill="${S}" style="transform-origin:134px 141px; transform:scaleY(0)"/>
      </g>
      <g class="av-eye av-eyeR" style="transform-origin:186px 153px">
        <ellipse cx="186" cy="153" rx="${12.5 * eyeR}" ry="${8.5 * eyeR}" fill="#FDFBF7"/>
        <g class="av-gaze">
          <circle cx="186" cy="153.5" r="${6.2 * eyeR}" fill="url(#aviris${uid})"/>
          <circle cx="186" cy="153.5" r="${2.9 * eyeR}" fill="#17100B"/>
          <circle cx="183.8" cy="151" r="1.7" fill="#FFF" opacity=".9"/>
        </g>
        <path d="M173,150 Q186,142 199,150" fill="none" stroke="${SD}" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
        <rect class="av-lid" x="171" y="140" width="30" height="17" fill="${S}" style="transform-origin:186px 141px; transform:scaleY(0)"/>
      </g>

      <path d="M160,160 C159,168 158,174 157,178" fill="none" stroke="${SD}" stroke-width="2.4" stroke-linecap="round" opacity=".4"/>
      <path d="M153,181 Q160,187 167,181" fill="none" stroke="${SD}" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>

      <g class="av-mouth" data-viseme="closed" style="transform-origin:160px 207px">
        <path class="m-closed" d="M144,206 Q160,213 176,206" fill="none" stroke="${c.lip}" stroke-width="4.5" stroke-linecap="round"/>
        <path class="m-press" d="M147,208 Q160,206 173,208 M150,208 Q160,212 170,208" fill="none" stroke="${c.lip}" stroke-width="3.8" stroke-linecap="round"/>
        <path class="m-smile" d="M141,203 Q160,220 179,203 Q160,211 141,203 Z" fill="${c.lip}"/>
        <path class="m-frown" d="M145,210 Q160,201 175,210" fill="none" stroke="${c.lip}" stroke-width="4.5" stroke-linecap="round"/>
        <path class="m-grim" d="M142,205 L178,205 M146,205 Q160,212 174,205" fill="none" stroke="${c.lip}" stroke-width="4" stroke-linecap="round"/>
        <ellipse class="m-small" cx="160" cy="208" rx="7" ry="5" fill="#5C2B26"/>
        <g class="m-mid">
          <ellipse cx="160" cy="209" rx="11" ry="8" fill="#4A211D"/>
          <path d="M151,204 Q160,208 169,204 L169,206 Q160,210 151,206 Z" fill="#FFF" opacity=".92"/>
        </g>
        <g class="m-wide">
          <path d="M143,203 Q160,199 177,203 Q174,221 160,221 Q146,221 143,203 Z" fill="#421C18"/>
          <path d="M147,203 Q160,206 173,203 L172,208 Q160,211 148,208 Z" fill="#FFF" opacity=".92"/>
          <ellipse cx="160" cy="216" rx="7" ry="3.5" fill="#B4574E"/>
        </g>
        <ellipse class="m-oh" cx="160" cy="208" rx="7.5" ry="9" fill="#4A211D"/>
      </g>
      ${mustache}
      ${hairFront}
      ${glasses}
      ${earrings}
    </g>
  </g>
</svg>`;
}

function avShade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v * (1 + pct / 100))));
  return "#" + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(x => x.toString(16).padStart(2, "0")).join("");
}

/* ------------------------------------------------------------
   Controller: mood, blinking, speaking, idle motion
   ------------------------------------------------------------ */
const AV_MOODS = ["neutral", "pain", "worried", "scared", "sad", "relieved", "happy"];
let avUID = 0;

function createAvatar(container, key, opts = {}) {
  const c = AV_CHARACTERS[key] || avCustomCharacter(String(key));
  const uid = ++avUID;
  container.innerHTML = avBuildSVG(c, uid);
  const svg = container.querySelector("svg");
  svg.classList.add("av-live");
  if (opts.staticPose) svg.classList.add("av-static");
  if (opts.decorative) { svg.setAttribute("aria-hidden", "true"); svg.removeAttribute("role"); }
  else svg.setAttribute("aria-label", opts.label ? `Retrato de ${opts.label}` : "Retrato del paciente");
  const mouth = svg.querySelector(".av-mouth");
  const lids = svg.querySelectorAll(".av-lid");
  const reduceQ = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = reduceQ.matches;
  const onReduceChange = e => {
    reduce = e.matches;
    if (reduce) { clearTimeout(blinkT); clearTimeout(visemeT); restLids(); setViseme(MOUTH_IDLE[mood]); }
    else { scheduleBlink(); if (speaking) speakLoop(); }
  };
  try { reduceQ.addEventListener("change", onReduceChange); } catch {}

  let mood = "neutral", speaking = false, destroyed = false;
  let blinkT = null, visemeT = null;

  const MOUTH_IDLE = { neutral: "closed", pain: "grim", worried: "press", scared: "small", sad: "frown", relieved: "smile", happy: "smile" };
  const SQUINT = { pain: 0.55, sad: 0.28, worried: 0.12 }; // partial upper-lid closure per mood
  const VISEMES = ["small", "mid", "wide", "oh", "mid", "small", "wide"];

  function setViseme(v) { if (!destroyed) mouth.setAttribute("data-viseme", v); }
  function restLids() { lids.forEach(l => l.style.transform = `scaleY(${SQUINT[mood] || 0})`); }

  function applyMood(m) {
    mood = AV_MOODS.includes(m) ? m : "neutral";
    AV_MOODS.forEach(x => svg.classList.remove("mood-" + x));
    svg.classList.add("mood-" + mood);
    // let the lid squint settle at the same pace as the brows, then restore fast-blink timing
    svg.classList.add("mood-shift");
    restLids();
    setTimeout(() => { if (!destroyed) svg.classList.remove("mood-shift"); }, 420);
    if (!speaking) setViseme(MOUTH_IDLE[mood]);
  }

  function blinkOnce() {
    lids.forEach(l => l.style.transform = "scaleY(1)");
    setTimeout(() => { if (!destroyed) restLids(); }, 130);
  }
  function scheduleBlink() {
    if (destroyed || opts.staticPose) return;
    blinkT = setTimeout(() => { blinkOnce(); scheduleBlink(); }, 2600 + Math.random() * 3200);
  }

  function speakLoop() {
    if (destroyed || !speaking) return;
    setViseme(Math.random() < 0.12 ? "closed" : VISEMES[Math.floor(Math.random() * VISEMES.length)]);
    visemeT = setTimeout(speakLoop, 80 + Math.random() * 90);
  }

  if (!opts.staticPose && !reduce) scheduleBlink();
  applyMood(opts.mood || "neutral");

  return {
    el: svg,
    setMood: applyMood,
    speak(on) {
      speaking = !!on;
      svg.classList.toggle("av-speaking", speaking);
      clearTimeout(visemeT);
      if (speaking && !reduce) speakLoop();
      else setViseme(MOUTH_IDLE[mood]);
    },
    destroy() {
      destroyed = true;
      clearTimeout(blinkT); clearTimeout(visemeT);
      try { reduceQ.removeEventListener("change", onReduceChange); } catch {}
      container.innerHTML = "";
    }
  };
}
