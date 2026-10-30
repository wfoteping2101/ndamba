# « Le Guide Ndamba » / "The Ndamba Guide": the brief for every writer

William Foteping met investors who found Ndamba "so complicated to follow". He asked for a complete guide, about 200 pages, in French and then in English: how to use the whole platform, and the purpose behind it, which is to lift the World Cup trophy within the next fifteen years. It is dedicated to his sons Kaydoudou and BriBri and to Nevada (@nevadaney10). Two complete editions: French (`guide/fr/`) and English (`guide/en/`), the same content and the same chapter numbers.

Read first: `docs/guide/FACTS.md` (football facts, calendar, honesty rules), `docs/DESIGN.md` (vocabulary of the brand), `app/src/lib/config.ts`.

## Readers

1. Investors and partners: they must understand in a few minutes what Ndamba is, who it serves, why it can matter, what exists today and what is planned.
2. Users: coaches and educators, analysts, technical directors and club managers, federations, players (young and senior) and parents. They must be able to use every screen after reading.

Every chapter serves both: it explains the purpose of a feature (why it exists, what problem of African football it solves) and then exactly how to use it, step by step, with the real labels of the interface.

## Voice and rules

- French edition: clear, warm, precise French, « vous ». Short paragraphs, plain words, no jargon without a one-line explanation. English edition: natural English (not a literal translation), "you".
- Use the exact labels of the interface in **bold** when you tell the reader what to tap or read: **Préparer la semaine**, **Démo club pro**, **À valider**. In the English edition use the English labels (the English screenshots show them). Take labels from `app/src/i18n/fr/*.json` and `app/src/i18n/en/*.json`, never from memory.
- Describe only what exists in the code today (read the component and its i18n file before writing about a screen). If a feature is planned, say « prévu » / "planned" and keep it short. When in doubt, check the code, and if still unsure, leave it out.
- No em dashes and no en dashes anywhere (use commas, colons, parentheses or full stops). No emoji. No real players except Roger Milla. No invented testimonials, users, partners or numbers.
- Sentence case for headings. No numbered markers like 01, 02 unless it is a real sequence (steps are a real sequence: use a numbered list).
- French typography is handled by the build (non-breaking spaces before ; : ! ?), just write « guillemets » with normal spaces.

## Format of a chapter file

`guide/fr/NN-slug.md` and `guide/en/NN-slug.md` (same NN and slug in both).

```
---
numero: 7
slug: exercices
titre: La bibliothèque des 64 exercices
partie: 3
resume: One or two sentences shown in the table of contents.
---

Opening paragraph (no heading): why this part of Ndamba exists, in plain words.

## A section heading

Text...

![What the screenshot shows, written as a full sentence for screen readers.](shot:pro-drills "Short caption shown under the image.")

1. First step, with the **exact label**.
2. Second step.

> [!ASTUCE] Optional title
> A practical tip.
```

- Screenshots: `![alt](shot:NAME "caption")` where NAME is a file of `guide-shots` (list below). The build picks the French or English version automatically. Use 3 to 6 screenshots per chapter. The `-full` variants are long full-page captures: use them only when the whole page matters (the report, the week); the normal ones are one screen high.
- Callouts (one or two per chapter, not more): French `[!ASTUCE]`, `[!ATTENTION]`, `[!INVESTISSEUR]` (what this means for an investor, in two to four sentences), `[!MOLA]` (what to ask Mola to do it for you, with the exact sentence to type). English: `[!TIP]`, `[!WARNING]`, `[!INVESTOR]`, `[!MOLA]`.
- Tables are welcome when they help (GitHub markdown tables).
- Pitch diagrams: a ```schema block with the same JSON as the books (see `coach/chapters/*.md` and `tools/pitch.mjs`) is allowed but optional.

## Length

The printed guide must reach about 200 pages per edition. Target per chapter: 1,600 to 2,200 words of text (the English edition the same), plus its screenshots. The parts of the 15-year plan (chapters 22 to 26) are argued, concrete and honest, 1,800 to 2,400 words each.

## The outline (26 chapters in 9 parts, plus front matter and appendices)

Front matter (written by the lead): title page, dedication, « Comment lire ce guide » with a reading path per profile (investor in 30 minutes, coach, analyst, player, parent, director, federation), table of contents.

Part I. Comprendre Ndamba / Understanding Ndamba
1. `ndamba-en-dix-minutes` / `ndamba-in-ten-minutes`: what Ndamba is (platform + Mola + the book Le Code Njangi + the novel Lionceaux + the game Lionceaux Football), who it serves, the loop plan, train, play, analyse, learn; how the pieces connect; what exists today. Source: Landing, Library, config, the whole app.
2. `la-philosophie-njangi` / `the-njangi-philosophy`: possession with purpose; the njangi (tontine) image; the seven intentions (sortir, progresser, fixer, finir, respirer, reprendre, regarder devant); the five sub-indices and the Indice Njangi (formula in `app/src/lib/njangi.ts`, bands 35, 50, 65, 80); the MD calendar. Source: `app/src/lib/njangi.ts`, `coach/chapters/` (the method), training data.
3. `six-profils-six-chemins` / `six-profiles-six-paths`: the six roles (`common.json` roles), what each one sees on the home screen, the player tiers youth, teen, senior (`app/src/surfaces/player/tier.ts`), which plan fits which profile.
4. `la-carte-de-la-plateforme` / `the-map-of-the-platform`: the public site (home, books, premium, brand page, welcome), the app and its four groups of menus (Entraînement, Équipe, Analyse, Moi), the phone tab bar, the language switch, where the data lives (this device, backups), the football game page.

Part II. Démarrer / Getting started
5. `creer-son-espace-avec-mola` / `set-up-with-mola`: the welcome conversation at /bienvenue, the profile card, the two demos (club pro, académie U13), what a demo replaces, coming back, starting over. Source: `surfaces/mola/Onboarding.tsx`, `onboarding.ts`, `mola.json` (ob.*).
6. `accueil-navigation-reglages` / `home-navigation-settings`: the home screen of each role, the Mola dock, switching team, Settings (profile, language, teams, backup export and import, reset), the Premium page and the demo activation. Source: `player/Home.tsx` and components, `layouts/AppLayout.tsx`, `site/Settings.tsx`, `site/Pricing.tsx`.

Part III. Entraîner / Training
7. `la-bibliotheque-des-exercices` / `the-drill-library`: the 64 drills, families, intentions, intensity, filters, a drill page with its diagram and coaching points, the link with the book. Source: `training/DrillLibrary.tsx`, `DrillDetail.tsx`, `content/drills.gen.ts`.
8. `construire-une-seance` / `build-a-session`: sessions list, the session builder (blocks, minutes, intention, day of the week), adding drills, printing or sharing if it exists. Source: `training/Sessions.tsx`, `SessionBuilder.tsx`.
9. `planifier-la-semaine` / `plan-the-week`: the week planner, MD-5 to MD+1, the load (minutes x intensity), the logic of the week, **Préparer la semaine** with Mola. Source: `training/WeekPlanner.tsx`.

Part IV. L'équipe et les matchs / Team and matches
10. `effectif-et-fiche-joueur` / `squad-and-player-file`: roster, player file, the journey (parcours), observing players (Observer). Source: `team/Roster.tsx`, `PlayerDetail.tsx`, `Journey.tsx`, `Observe.tsx`, `lib/journey.ts`.
11. `preparer-un-match` / `prepare-a-match`: matches list, new match, line-up and formation, the match sheet, the call-up (convocation) prepared by Mola and approved by you. Source: `team/Matches.tsx`, `MatchSetup.tsx`, `MatchSheet.tsx`, `lib/formations.ts`.

Part V. Analyser / Analysis
12. `analyse-en-direct` / `live-analysis`: the live tagger, the event codes (PASS_OK, PROG, LINE, FINAL3, BOX, FIX2, SWITCH, LOSS, REGAIN5...), how to tag a match from the touchline, halves, corrections. Source: `analysis/LiveTagger.tsx`, `lib/njangi.ts`, `analysis.json`.
13. `rapport-et-indice-njangi` / `report-and-njangi-index`: the match report, the gauge, the five sub-indices, halves, what to train next (drills suggested), copy and print. Source: `analysis/MatchReport.tsx`.
14. `video-et-saison` / `video-and-season`: the analysis hub (season, trends), video list and video studio (import, tag, clips). Source: `analysis/AnalysisHub.tsx`, `VideoList.tsx`, `VideoStudio.tsx`.

Part VI. Le joueur et sa famille / The player and the family
15. `espace-joueur` / `player-space`: the player space, young and performance versions, challenges, the personal programme. Source: `player/PlayerSpace.tsx`, `challenges.ts`, `tier.ts`, components.
16. `lecons-carnet-parcours` / `lessons-notebook-journey`: the 40 Lessons of the Ball (from the novel), the Njangi notebook, the player journey. Source: `player/Lessons.tsx`, `lessons.ts`, `Notebook.tsx`, `Journey.tsx`.
17. `les-parents` / `parents`: what a parent sees, how to follow a child, safety and what Mola never does on its own, screen time and the books. Source: home for the parent role, player components.

Part VII. Mola
18. `mola-l-agent` / `mola-the-agent`: what Mola is, the chat, « Mola a remarqué », tasks, approvals (« Rien ne part sans vous »), the list of actions Mola can perform (read `surfaces/mola/engine.ts` and `executors.ts`), the optional AI model and the rules engine, example sentences. Source: `surfaces/mola/*`, `mola.json`, `api/mola.ts`.

Part VIII. Les livres et le jeu / The books and the game
19. `le-code-njangi` / `the-njangi-code`: the coaching book (38 chapters, 64 drills), its parts, how it feeds the app, how to read it on the site. Source: `coach/chapters/`, `app/public/book/methode/`.
20. `lionceaux-la-saga` / `lionceaux-the-saga`: the novel, tome 1 (40 chapters, 168 illustrations), the brothers, the five countries, the Lessons of the Ball, the six tomes planned, the reader. Source: `tome1/BIBLE.md`, `tome1/OUTLINE.md`, `app/public/book/tome1/`.
21. `lionceaux-football` / `lionceaux-football`: the browser game, how to play, controls, teams, where it is linked. Source: `app/public/football/index.html`.

Part IX. Porter le trophée / Lifting the trophy
22. `pourquoi-l-afrique-peut-gagner` / `why-africa-can-win`: the facts (FACTS.md), what is missing (a shared game model from academies to the national team, measurement, continuity, coach education), why a tool like Ndamba answers that.
23. `le-plan-2026-2041` / `the-2026-2041-plan`: five stages over fifteen years, with what Ndamba does at each stage and measurable milestones (targets, not results): pilot clubs and academies, a league, the federation and its youth teams (U15, U17, U20), the senior team, the three World Cups of the window (2030, 2034, 2038).
24. `le-modele-economique` / `the-business-model`: the five plans and prices (config.ts PLANS, `common.json` plans), who pays and why, free education (books and drills are never gated), federation contracts on quote, the costs, the honest state today (payments not connected).
25. `confiance-donnees-et-jeunes` / `trust-data-and-young-players`: local-first data, backups, approvals, minors, what Ndamba refuses to do, the rules of the project.
26. `feuille-de-route` / `roadmap`: what exists today (inventory), what comes next (accounts and sync, payments, staff accounts, video, tome 2...), the indicators to follow, how investors can help.

Appendices (lead): A. Quick start by profile. B. Glossary FR/EN. C. Every page of the platform (route map). D. The 64 drills (table generated from data). E. Questions and answers.

## Screenshots available (`guide-shots/fr/NAME.png` and `guide-shots/en/NAME.png`)

Look at them with the Read tool before writing about a screen: they show the real labels and the demo data.
See `guide-shots/fr/_list.txt` for the full list.
- Site: site-landing, site-landing-full, site-library, site-library-full, site-pricing, site-pricing-full, site-brand, site-brand-full, onboarding-start, onboarding-step2, book-tome1-index, book-tome1-ch01, book-methode-index, book-methode-ch01, football-page.
- Pro club demo (coach Daniel Mbarga, Étoile de la Côte, Ligue 1): pro-home(-full), pro-mola-chat, pro-mola-tasks, pro-mola-approvals, pro-mola-launcher, pro-drills(-full), pro-drill-detail(-full), pro-sessions, pro-session-builder(-full), pro-week(-full), pro-roster(-full), pro-player-detail(-full), pro-player-journey(-full), pro-observe(-full), pro-matches(-full), pro-match-new(-full), pro-match-sheet(-full), pro-match-sheet-past, pro-analysis(-full), pro-report(-full), pro-videos(-full), pro-video-studio(-full), pro-app-library, pro-app-premium, pro-settings(-full), pro-live-tagger, pro-player-home(-full), pro-player-space(-full), pro-player-own-journey, pro-analyst-home, pro-manager-home.
- U13 academy demo (Lionceaux de Bonamoussadi U13): youth-home(-full), youth-roster, youth-report, youth-week, youth-player-home(-full), youth-player-space(-full), youth-lessons(-full), youth-notebook(-full), youth-journey(-full), youth-parent-home, youth-federation-home.
- Phone: m-landing, m-pro-home, m-pro-mola, m-pro-report, m-pro-week, m-pro-live, m-youth-home, m-youth-link-chooser.
- Second pass: pro-video-new (new video project dialog), pro-video-studio-empty, pro-video-studio(-full) (with a demo video loaded: a tactical board animation, say « une vidéo de démonstration » in captions), pro-video-studio-tagged (three tags added), pro-videos-list; pro-link-chooser and youth-link-chooser (« Qui es-tu dans l'équipe ? »), pro-player-journey-linked(-full), pro-player-space-linked(-full), pro-player-home-linked(-full) (senior player Steve Ndjock linked to his file), youth-journey-linked(-full), youth-player-space-linked(-full), youth-player-home-linked(-full), youth-lessons-linked, youth-notebook-linked (young player BriBri), youth-parent-home-named(-full), youth-parent-space (parent Estelle), football-page(-full).
- Prefer the `-linked` and `-named` player and parent captures over the older ones (in the older ones the player profile carries the coach's name).

Where the files are: `/tmp/claude-0/-home-claude/3d46110d-d084-5c89-9cdb-0dfdba35d143/scratchpad/guide-shots/fr/NAME.png` and `.../guide-shots/en/NAME.png` (2560 px wide). Open them with the Read tool.

## The vision, so every chapter says the same thing

- The goal: an African nation, Cameroon first, lifts the World Cup within fifteen years. The window 2026 to 2041 holds three World Cups: 2030 (Morocco, Spain, Portugal), 2034 (Saudi Arabia), 2038 (not yet awarded). The app's mantra says « 2030 ou 2034 »; the guide says « dans les quinze prochaines années, en 2030, en 2034 ou en 2038 ».
- The thesis: talent is not what Africa lacks. What is missing is continuity: one shared game model from the first academy to the national team, coaches trained in it, and a common measurement (the Indice Njangi) so a federation can see, season after season, whether its players really possess with purpose.
- The five stages (proposed targets, written as « objectifs proposés », never as results; chapter 23 develops them, the others refer to them briefly):
  1. 2026 to 2027, « Le premier cercle » / "The first circle": pilot clubs and academies in Douala, Yaoundé and Bafoussam and in the diaspora use Ndamba every week. Targets: 20 pilot clubs and academies, 100 coaches trained in the method, 1,000 matches coded to build the first reference values of the Indice Njangi by age.
  2. 2028 to 2029, « La ligue » / "The league": a youth league adopts the shared game model; accounts, sync and payments are live; coach education modules. Targets: 300 teams, reference values per age group, the first certified Njangi coaches.
  3. 2030, « Les sélections de jeunes » / "The youth national teams": the U15, U17 and U20 work with the national game model in Ndamba (the U17 World Cup is played every year); scouting of the diaspora. Africa co-hosts the World Cup in Morocco: first visible test.
  4. 2031 to 2034, « La génération » / "The generation": the players who were 12 to 16 in 2026 reach the senior team; the Indice Njangi follows them from the academy to the national team. 2034 World Cup: target the quarter-final or better.
  5. 2035 to 2041, « Le trophée » / "The trophy": the whole pyramid speaks the same football; other African federations adopt the model; 2038 World Cup: target the trophy. By 2041 a full generation has been trained in one game model.
- Any partnership with a federation, a league or a club is a goal, never presented as signed.
