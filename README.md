# ClínicaBridge 🫀

**Clinical Spanish, cara a cara.** A camera-and-voice learning app for med students:
a virtual patient speaks to you in Spanish, you answer **out loud, on camera**, and every
word you say lights up in real time — green (perfect), amber (close), red (missed).
Sister app to [SignBridge](https://github.com/dkawjr) and [PsychBridge](https://dkawjr.github.io/PsychBridge/).

## What's inside

- **Las salas — 6 full clinical encounters** behind numbered exam-room doors:
  chest pain (ED), pediatric fever, first prenatal visit, diabetes counseling,
  **pre-anesthesia consent**, and a psychiatric intake with a real safety screen.
  Each ends with an OSCE-style debrief: Comunicación, Vocabulario clave, Fluidez, Presencia.
- **Real-time speech feedback** — Web Speech API recognition (es-MX / es-US / es-ES),
  word-level karaoke scoring with accent-forgiving alignment and accepted alternate phrasings.
- **Camera encounters** — see yourself as you talk to the patient, optional **video recording**
  (download and review yourself), and an optional **Presencia** metric (on-device MediaPipe face
  detection: are you facing your patient?). Degrades gracefully if unavailable.
- **It's about YOU** — onboarding asks your name, how patients should address you
  (Doctora / Doctor / Doctore / first name), **your goal in your own words**, and what you
  struggle with (rr/j/ñ, listening, grammar, vocab, numbers, freezing up). The home screen then
  builds **Tu plan de hoy** — three tailored actions with reasons quoted back from what you said.
- **Latidos 💗, streaks 🔥, and a daily goal ring** — heartbeats earned for every phrase said well;
  confetti when you hit your goal. Honest streaks (they break if you skip a day).
- **Mi progreso 📈** — a 14-day chart (green = goal met), best score per room, encounter history,
  your "porqué" displayed to keep you going, and **one-tap backup**: save a little file, open the
  app anywhere, bring it back. No accounts.
- **Porras 📣 (cheer channel)** — optional, friendly push notifications via the free
  [ntfy](https://ntfy.sh) app: when you hit your daily goal, set a personal record, or extend a
  streak, your phone (and any study buddy subscribed to your channel) gets a sweet, specific push.
  One-minute setup, no email, no account.
- **Práctica libre 📝** — paste *anything you want to work on* (your patient-presentation script,
  phrases from clinic, a consent you keep fumbling). It splits into lines, grades each one live,
  and a **coach box** gives constructive feedback: tap missed words to hear them, plus targeted
  pronunciation tips (rr trill, silent h, -ción stress…). Save named practice lists to reuse.
- **Práctica rápida** — 48 drilled phrases across 6 sets (greetings, OLDCARTS history, exam
  commands, meds, emergencies, empathy) with the same live coaching.
- **Vocabulario** — 5 flashcard decks (60 cards) with audio, including numbers/dates/doses.
- **Crea tu propia sala** — a scenario builder with export/import JSON, so classmates can share
  custom encounters. Deep-link any room: `index.html#sim=sala5`.
- **Phone & desktop, equally pretty** — fully responsive; on mobile the sim keeps the talk button
  docked at your thumb.

## Run it

- **Easiest:** double-click `ClinicaBridge.cmd` (opens in Chrome). Or just open `index.html`
  in **Chrome or Edge** (speech recognition needs a Chromium browser; it uses the browser's
  cloud speech service, so you need internet).
- **Host it:** push to GitHub → Settings → Pages → deploy from branch. It's 100% static.
- Allow **microphone** (and camera, if you want the full encounter experience).

## Privacy

No backend, no accounts. Your name, progress, and custom scenarios live in your browser's
localStorage. Video recordings stay on your device. Speech recognition audio is processed by
your browser's speech service (Google/Microsoft). This is a practice tool, not medical advice.

## Stack

Single-page vanilla HTML/CSS/JS. Web Speech API (recognition + synthesis), getUserMedia,
MediaRecorder, optional MediaPipe Tasks Vision (CDN, lazy-loaded). Type: Archivo + IBM Plex Mono.
Palette: quirófano green × rosa mexicano.

Hecho con cariño. 💗
