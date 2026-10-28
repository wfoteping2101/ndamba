# Handoff: app-analysis (previous agent aa8f17621f9203c97, stopped by an interruption)

## Original brief

You are a senior React engineer and football performance analyst. You are building the analysis part of "Njangi", a premium bilingual (French first, English second) app for football players, coaches and analysts, for William Foteping. Its signature feature: tag a real match live from the touchline (or from video) and get a summary of the team's playing philosophy, the Indice Njangi (did we possess with purpose?). Read /home/claude/njangi/docs/CONVENTIONS.md completely first and follow it exactly (stack, shared files you must not edit, i18n rules, design rules, no em or en dashes, testing). Read src/lib/types.ts (Match, MatchEvent, EventCode, VideoProject, VideoTag) and src/lib/njangi.ts.

You own (replace the placeholders): app/src/surfaces/analysis/AnalysisHub.tsx, LiveTagger.tsx, MatchReport.tsx, VideoList.tsx, VideoStudio.tsx, anything under app/src/surfaces/analysis/components/, the shared file app/src/lib/njangi.ts (you own it; keep its exported names computeNjangi, countEvents, NjangiResult, SUB_KEYS, DRILLS_FOR, njangiLabel, EVENT_CODES working because other surfaces import them), and the i18n namespace files app/src/i18n/fr/analysis.json and app/src/i18n/en/analysis.json. Dev server port: 5184.

The Indice Njangi formulas are being written right now in /home/claude/njangi/coach/chapters/19-mesurer-la-possession.md (five sub-indices of 0 to 20: Progression, Pénétration, Fixation, Reprise, Contrôle, computed from the event codes PASS_OK, PASS_LOST, PROG, LINE, FINAL3, BOX, FIX2, SWITCH, LOSS, REGAIN5, REGAIN, SHOT, SHOT_IN, GOAL). Check for that file at the start and again before finishing; when it exists, implement its formulas exactly in njangi.ts (keep the provisional ones if it does not exist yet and say so in your report).

Build:
1. Live tagger (/app/analyse/live/:id): full screen on a dark background, designed for one thumb on a phone at the touchline in bright sun. Top bar: our team v opponent, score, big clock with start/pause, halves (1, 2, and extra time 3, 4), exit. A grid of large, colour-coded tag buttons grouped by meaning: possession (PASS_OK, PASS_LOST, PROG, LINE), danger (FINAL3, BOX, SHOT, SHOT_IN, GOAL), fixation (FIX2, SWITCH), transitions (LOSS, REGAIN5, REGAIN), plus opponent shot and opponent goal. Each tap is saved instantly to db.events (with half and match time) and gives haptic feedback (navigator.vibrate when available) and a brief visual confirmation. After LOSS, show a 5-second countdown ring: a regain tapped within the window is recorded as REGAIN5 automatically. Optional player attribution: after a tap, a strip of the lineup's numbers appears for about 2.5 seconds; tap a number to attribute, or ignore. Undo last, an event log drawer, keyboard shortcuts on desktop (show them in a help sheet), and a live mini panel with the Indice Njangi total and the five sub-index bars updating as you tag. GOAL updates the score. « Fin du match » asks for confirmation, sets the match status to done with the score, and opens the report. Must work offline and survive a page reload (resume the clock from saved state in localStorage).
2. Match report (/app/analyse/rapport/:id): header with teams and score; a large Indice Njangi gauge (SVG) with its label (njangiLabel); the five sub-indices with bars, values out of 20 and a plain explanation of what each measures; key counts; a timeline chart (events per 5-minute bucket for us, losses and regains, goals marked); « Résumé de la philosophie de jeu »: a generated narrative in French and English (rules-based, from the sub-index levels and counts: what the team did with the ball, where it progressed or got stuck, how it reacted to losses), three strengths, three things to correct, recommended drills for the weakest sub-indices (DRILLS_FOR, linking to /app/exercices/:id), and objectives for the next week with a button « Planifier la semaine avec ces objectifs » (planWeek from src/lib/actions.ts for the team's next match, passing the intention that matches the weakest sub-index). Put the narrative generator in src/surfaces/analysis/components/summary.ts and export `buildSummary(result, lang, previous?)` so Mola and the home page can reuse it. Also: player contributions table (events by playerId), comparison with the previous analysed match, copy-as-text and print.
3. Analysis hub (/app/analyse): matches to tag live (planned: start) and analysed matches (open the report), an Indice Njangi trend chart across matches (SVG) and averages per sub-index, a short explanation of the Indice with a link to /book/methode/#ch-19, and the video projects entry.
4. Video analysis (/app/analyse/video and /app/analyse/video/:id): create a project (title, optional linked match); open a local video file with an <input type=file> (object URL; the file itself is not stored, so on reopening ask the user to pick the file again, matching by name); controls (play/pause, back and forward 5 s, frame step, speed 0.5x/1x/2x); tag buttons (the same codes plus NOTE with text) at the current time; a timeline under the video with clickable markers; a filterable clip list (seek to t minus 4 s); telestration: when paused, a drawing overlay (arrows, circles, freehand, three colours, undo, clear) and « Enregistrer l'image » saves a snapshot of the frame plus drawing as the tag's drawing (data URL, keep it reasonably small); export tags as CSV and JSON; an Indice Njangi computed from the video tags.

Quality bar: this is the feature that should make professional analysts and federation staff say "wow". Precise, fast, robust, beautiful. Test in French and English with Playwright screenshots (390x844 and 1280x800) after seeding the demo (see CONVENTIONS; the demo has a finished match id 'ma_past' with ~300 tags and an upcoming match 'ma_next'), tap through a live session in Playwright, look at the screenshots and fix issues and console errors. Type-check must pass for your files.

Final report under 400 words (what you built, the exact Indice formulas you implemented and their source, shared-file diffs you need, gaps).

## Files the previous agent wrote or edited

/home/claude/njangi/app/src/i18n/en/analysis.json
/home/claude/njangi/app/src/i18n/fr/analysis.json
/home/claude/njangi/app/src/lib/njangi.ts
/home/claude/njangi/app/src/surfaces/analysis/LiveTagger.tsx
/home/claude/njangi/app/src/surfaces/analysis/components/Sheet.tsx
/home/claude/njangi/app/src/surfaces/analysis/components/charts.tsx
/home/claude/njangi/app/src/surfaces/analysis/components/clock.ts
/home/claude/njangi/app/src/surfaces/analysis/components/codes.ts
/home/claude/njangi/app/src/surfaces/analysis/components/summary.ts

## Its last progress notes (oldest first)

- I'll start by reading the conventions and the shared files.

- Chapter 19 does not exist yet (only 00 and 09 are written). Let me check the dataviz palette validator on the group colours I plan to use, then start writing.

- Chapter 19 is not written yet (only chapters 00 and 09 exist). I'll build with the provisional formulas, structured so they can be swapped exactly, and re-check later. Starting with `njangi.ts`.

- You've hit your session limit · resets 1:50am (America/New_York)

- Now the English file with the same keys.

- Now the shared component modules: tag definitions, clock persistence, and the narrative generator.

- Now the live tagger, the centrepiece. First a small dark sheet component.

- Chapter 19 now exists. Implementing its formulas exactly, then verifying against the worked examples.

- Now update summary.ts to the chapter 19 vocabulary (conservation rate K, one-decimal totals).

- Formulas verified against both worked examples (65.1 and 68.4, plus half-time checks 9.2, 14.7, 20, 11.7). Now the live tagger.

- You've hit your weekly limit · resets Oct 29, 6pm (America/New_York)
