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
- **Duolingo-grade progression, our way** — onboarding asks your name and how patients should
  address you (Doctora / Doctor / Doctore / first name); you earn **latidos 💗** (heartbeats)
  toward a daily goal ring; streaks 🔥 and confetti when you hit it.
- **Práctica rápida** — 48 drilled phrases across 6 sets (greetings, OLDCARTS history, exam
  commands, meds, emergencies, empathy) with pronunciation tips.
- **Vocabulario** — 4 flashcard decks (48 cards) with audio.
- **Crea tu propia sala** — a scenario builder with export/import JSON, so classmates can share
  custom encounters. Deep-link any room: `index.html#sim=sala5`.

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
