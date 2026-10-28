# Handoff: app-mola (previous agent a755ba6fe202794c3, stopped by an interruption)

## Original brief

You are a senior React engineer and conversational product designer. You are building Mola, the agent of "Njangi", a premium bilingual (French first, English second) app for football players, coaches and analysts, for William Foteping. Mola has two jobs: (1) a conversational onboarding in the spirit of the best AI "concierge" sign-ups (one question at a time, chips, free text understood, a profile card that fills itself live as the user talks, every field editable), and (2) an action agent in the spirit of "do-it-for-me" agents: the user asks, Mola actually does things inside the app, shows its steps ticking live, and asks for approval before anything that leaves the app (it never sends a message by itself). Read /home/claude/njangi/docs/CONVENTIONS.md completely first and follow it exactly (stack, shared files you must not edit, i18n rules, design rules, no em or en dashes, testing). Read src/lib/types.ts (AgentTask, AgentApproval, ChatMessage, Profile), src/lib/actions.ts (createAutoSession, planWeek, createMatch, createTeam, addPlayer, nextMatch, convocationText, whatsappLink, smsLink, mailLink, toICS), src/lib/seed.ts (createProfile, seedDemo), src/lib/njangi.ts and src/content/index.ts.

You own (replace the placeholders): app/src/surfaces/mola/Onboarding.tsx (route /bienvenue, full screen, no layout), MolaHub.tsx (/app/mola), MolaLauncher.tsx (the floating button rendered by AppLayout on every app page), anything under app/src/surfaces/mola/ (put the language engine in engine.ts and the action executors in executors.ts), the serverless function app/api/mola.ts (Vercel Node function), and the i18n namespace files app/src/i18n/fr/mola.json and app/src/i18n/en/mola.json. Dev server port: 5185.

Build:
1. Onboarding (/bienvenue): an elegant full-screen conversation with Mola (avatar: the LogoMark with a subtle animated ring; typing indicator; messages appear one by one). First the language (Français / English), then name, role (common:roles.*), then role-specific questions (coach: team name, age group, format 5/7/8/9/11 and optionally paste player names; player: age group, position, club; analyst: club or team; parent: child's age group; manager/federation: organisation), then country and city, then goals (multi-select chips such as « Une identité de jeu », « Planifier mes semaines », « Analyser mes matchs », « Progresser personnellement », « Former des jeunes »). Free text is understood at every step (e.g. « Je suis entraîneur des U15 de Coton Sport à Garoua » fills role, age group, club and city at once, and Mola skips the questions already answered). A profile card fills in live beside the chat on desktop and as a collapsible card on phone; tapping a field lets the user correct it. The end creates the profile (createProfile), the team and players if relevant (createTeam, addPlayer), then lands on /app with a warm welcome message from Mola saved in the mola thread. « Essayer la démo » link at the top (seedDemo then /app). If a profile already exists, offer to go to /app.
2. Engine (engine.ts): a robust rules-based bilingual parser (accents and typos tolerated) returning an intent and slots. Intents at least: plan_week, create_session (MD code or words like « tension », « durée », « vitesse », « activation », minutes, intention keywords), setup_match (opponent after « contre » / « against » / « vs », dates like « samedi », « demain », « le 12 novembre », « saturday », « tomorrow », « next friday », times « 16h », « 16h30 », « 4pm », venue after « à »/« at »), add_player (name, number, position), send_convocation (for the next match), analyze_last_match, recommend_drills (by intention or problem words like « reprendre le ballon », « progresser », « finir »), open_lesson (« leçon 7 », « chapitre 7 du roman »), open_book, help, small_talk. Missing slots trigger one follow-up question. Write a small test script (engine.test.mjs or a test page) that checks at least 30 French and English sentences and run it.
3. Optional LLM: api/mola.ts calls the Anthropic Messages API (fetch to https://api.anthropic.com/v1/messages, model from env ANTHROPIC_MODEL with a sensible default, key from env ANTHROPIC_API_KEY) with a system prompt describing the intents and the JSON slot schema, returns { intent, slots, reply }; returns 501 when no key is configured. The client tries it once per request with a short timeout and falls back silently to the rules engine. Never expose the key; no secrets in the repo.
4. Mola hub (/app/mola): a chat (db.messages thread 'mola') with suggestion chips (« Prépare ma semaine avant le match », « Crée une séance MD-3 pour progresser », « Organise un match contre les Aigles samedi à 16h », « Ajoute un joueur », « Envoie la convocation », « Analyse mon dernier match », « Quels exercices pour mieux reprendre le ballon ? », « Ouvre la leçon 7 »). For each request, create an AgentTask (db.tasks) with steps that tick live with a short delay each (Fo-style), execute through lib/actions (or read data for analysis: computeNjangi on the last done match's events, and if src/surfaces/analysis/components/summary.ts exports buildSummary use it, otherwise write a short summary yourself), and answer with a result card linking to what was created (session, match, report, drill, lesson at /app/joueur/lecons or the book). Anything leaving the app (WhatsApp, SMS, e-mail, calendar file) becomes a task in status needs_approval with an approval card: channel, recipient, editable preview text, « Approuver et ouvrir » (opens the whatsappLink/smsLink/mailLink or downloads the .ics, then marks done), « Modifier », « Annuler ». Tabs: Discussion, Tâches (history with status filters), À valider (pending approvals with a count badge). Proactive suggestions when the hub opens (for example the next match is within 6 days and the four days before it have no sessions: « Votre match contre X est samedi. Je prépare la semaine ? » with one-tap yes). Mola speaks warmly and briefly, in the user's language, and signs off with the motto only occasionally.
5. Launcher: a floating round Mola button bottom-right (above the mobile tab bar, respecting safe areas), hidden on /app/mola; tapping opens a compact sheet with the last messages, an input and chips, sharing the same engine and executors, with a link to the full hub.

Quality bar: this should feel magical and trustworthy: fast, clear about what it did, never doing something irreversible or external without approval. Test in French and English with Playwright (onboarding end to end as a coach and as a player; then in the hub run plan_week, create_session, setup_match, send_convocation with approval, analyze_last_match on the seeded demo), take screenshots at 390x844 and 1280x800, look at them, fix issues and console errors. Type-check must pass for your files.

Final report under 400 words (what you built, test results, shared-file diffs you need, gaps).

## Files the previous agent wrote or edited

/home/claude/njangi/app/src/surfaces/mola/engine.test.mjs
/home/claude/njangi/app/src/surfaces/mola/engine.ts
/home/claude/njangi/app/src/surfaces/mola/llm.ts
/home/claude/njangi/app/src/surfaces/mola/store.ts

## Its last progress notes (oldest first)

- You've hit your session limit · resets 1:50am (America/New_York)

- Nothing has been written yet, so I'm starting the build now. First, a quick look at the generated content shapes.

- Picking up where I stopped: none of the Mola files exist yet, so I'm writing them now, starting with the language engine (pure functions, no runtime imports, so it can be tested in Node).

- Now the test script with 30+ French and English sentences.

- Good first pass: 74 of 82 checks pass. Let me debug the opponent cut.

- Fixing the failures: the date cut ("le 12"), the "on joue contre" order, "on Saturday", chapter-of-novel priority, bare trailing number, and position implying the player role.

- All 82 engine checks pass. Next I'm adding a small `create_team` intent, so Mola can handle a user with no team, then writing the executors.

- You've hit your weekly limit · resets Oct 29, 6pm (America/New_York)

- Picking up at the executors (the create_team intent is done, 85 engine checks pass). First a quick check on what sibling surfaces now expose so my links and summary match.
