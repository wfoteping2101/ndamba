# LE CODE NJANGI : l'art de posséder, architecture

How the tactical trainer is built. Read from the code on 2026-10-29 (commit `2ba8b53` plus the working tree
of that day); nothing was run. The shared engine and the Lionceaux game are described in
`docs/games/ARCHITECTURE.md`; what each mode takes from the book is in `docs/games/SOURCE-MAP-CODE-NJANGI.md`.

Paths: `njangi/` is `app/src/games/njangi/`, `engine/` is `app/src/games/engine/`, `shared/` is
`app/src/games/shared/`, `jeux.json` is `app/src/i18n/fr/jeux.json`.

## Folder layout

**Root.** `NjangiApp.tsx` holds the routes under `/jeux/code-njangi` (mounted by `app/src/App.tsx`, outside
the site and app layouts) and lazy-loads each mode. `Home.tsx` is the menu (next lesson, Indice, the six
modes). `BackdropScene.tsx` runs an AI rondo behind the menu at low quality, stops when the tab is hidden and
draws a still frame when the reader asked for reduced motion. `links.ts` builds the URLs of the static book
readers (`/book/methode/...`, `/book/tome1/...`).

**`academy/`.** `Academie.tsx` lists the 64 lessons by family with stars and the sheet's 2D diagram (the
app's `Pitch` component, `app/src/ui/index.tsx`). `Lesson.tsx` is the route `academie/:id` and exports
`LessonScreen`, the whole lesson screen (briefing, demonstration, play HUD, touch controls, result, saving),
which the Défi des dix passes reuses with its own rules.

**`drills/`.** The lesson engine, without React. `types.ts` defines a lesson's rules (`DrillGameplay`: mode,
control, opposition, touches, set length, target, scoring events, failures, mistake to coaching links).
`gameplay.ts` holds the 64 hand-written entries, re-exported by `gameplayList.ts`. `catalog.ts` joins them with
the generated `DRILLS`, sorts by family and supplies family defaults for a sheet without rules.
`scenario.ts` turns a diagram into a `World` and an ordered list of steps; `director.ts` (`SequenceDirector`)
plays those steps; `setup.ts` gives every player a brain (`assignBrains`, `UserCarrierBrain`); `scorer.ts`
(`DrillScorer`) applies the scoring, failures and mistakes; `runner.ts` (`LessonRunner`) runs the phases and
attempts, takes the user's passes and shots and builds the result; `session.ts` (`LessonSession`) adds the 3D
view, the loop, input, drawings on the grass and the state React reads.

**`reading/`.** Lecture du jeu. `situations.ts` builds a frozen situation from a sheet's picture after a few
seconds of AI play; `judge.ts` reads it with the five intentions and grades an answer; `LectureSession.ts`
shows it in 3D and runs the series of 8; `Lecture.tsx` is the screen.

**`tenpasses/`.** Défi des dix passes. `challenge.ts` builds the full-pitch picture (tome 1 lesson 40 plus
three opponents), its rules (`CHALLENGE_GAMEPLAY`) and a `Drill` wrapper around sheet G06; `DixPasses.tsx`
fills the texts in both languages and renders `LessonScreen` with the pass counter.

**`board/`.** Tableau du coach. `Tableau.tsx` is the 2D SVG editor (tools, undo, pitch sizes, templates,
share link); `BoardSession.ts` shows the board in 3D and plays its numbered actions with the lessons' director,
measuring each pass.

**`analysis/`.** Analyse vidéo. `AnalyseSession.ts` drives a ghost world from a recording (no simulation) and
draws the layers; `Analyse.tsx` lists the recordings and holds the player controls.

**`path/`.** Parcours de formation. `Parcours.tsx` only reads saved progress; it uses no engine code.

**Pattern shared by the 3D modes.** Each mode keeps its game in a plain class (`LessonSession`,
`LectureSession`, `BoardSession`, `AnalyseSession`) that owns a `SimView` and a `GameLoop` and exposes
`state`, `subscribe()` and `dispose()`. React mounts it with `useMounted` and reads it with `useStore`
(`useSyncExternalStore`), both in `shared/ui.tsx`, which also provides `GameFrame`, `TopBar`, `Panel`,
`RoundButton`, `Stick`, `ActionButton`, `SettingsSheet`, `NoWebGL`, `Spinner` and `usePanelInsets` (keeps the
pitch framed beside a panel). Sounds come from `shared/audio.ts` (`sfx`). `shared/Manette.tsx` is used by
Lionceaux only.

## From the book to the screen

```
coach/drills/*.json ----------+
                              |  app/scripts/build-content.mjs (npm run content, first step of npm run build)
tome1/chapters/NN-*.md -------+--> app/src/content/drills.gen.ts   DRILLS  (64 sheets, fr + en)
                                   app/src/content/lessons.gen.ts  LESSONS (40 Leçons du Ballon, fr only)

DRILLS + njangi/drills/gameplay.ts --> njangi/drills/catalog.ts (LESSONS_ORDERED, lessonDrill, gameplayFor)
   --> njangi/academy/Lesson.tsx LessonScreen
         --> njangi/drills/session.ts LessonSession  (SimView, GameLoop, Input, overlays)
               --> njangi/drills/runner.ts LessonRunner
                     scenario.ts  diagram -> World (engine/sim/pitch.ts, world.ts, engine/looks.ts)
                     director.ts  numbered arrows -> moves, passes, shots
                     setup.ts     brains (engine/ai/brains.ts)
                     scorer.ts    rules, using engine/sim/tagger.ts (the 14 codes)
                     engine/replay.ts Recorder
               result --> app/src/lib/njangi.ts njangiFromCounts (Indice, chapter 32)
         --> shared/save.ts recordDrill + saveReplay --> Home, Académie, Parcours, Analyse read them back

LESSONS[no 40] + DRILLS[G06] --> njangi/tenpasses/challenge.ts --> LessonScreen (same path as above)
DRILLS (39 sheets with opposition) --> njangi/reading/situations.ts --> judge.ts --> LectureSession
DRILLS + LESSONS diagrams --> Tableau templates --> BoardSession
coach/chapters/*.md --> tools/build_books.mjs --> app/public/book/methode/ch-NN.html (linked, never imported)
UI strings --> app/src/i18n/fr/jeux.json (namespace "jeux")
```

## Engine pieces used by each mode

| Mode | Simulation (`engine/sim/`) | Render (`engine/render/`, `engine/runtime.ts`) | AI (`engine/ai/brains.ts`) | Input | Replay (`engine/replay.ts`) |
|---|---|---|---|---|---|
| Menu backdrop | `World` via `buildScenario`, `DIFFICULTY.facile` | `SimView` (low quality, `cinematic` camera), `GameLoop` (`simulate(2)` for the still frame) | `PhaseBrain`, `CarrierBrain`, `SupportBrain`, `DefenderBrain` | none | none |
| Académie lessons, Défi | `World`, `lanes.ts` (`analysePass`, `passOptions`), `tagger.ts`, `math.ts` | `SimView`, overlays (diagram, zones, markers, lanes drawn at Facile), labels, cameras tactical, broadcast, player, free; `GameLoop` time scale 0.45 (slow demo) and 0.25 (result) | via `njangi/drills/setup.ts`: `KeeperBrain`, `PhaseBrain`, `CarrierBrain`, `SupportBrain`, `DefenderBrain`, `HoldBrain`, `ShadowBrain`, plus `UserCarrierBrain`; `meetPoint` | `engine/input/input.ts` `Input`: keyboard, gamepad, touch stick and buttons, pointer picking on the canvas | `Recorder` (20 Hz) |
| Lecture | `World`, `lanes.ts` (`analysePass`, `passOptions`, `defensiveLines`), `pitch.ts` (`inBox`) | `SimView`, overlays (lines, lanes, answer arrows), numbered labels, cameras tactical, player, free; loop frozen (time scale 0) except the 3.2 s outcome | the same brains play until the freeze; the carrier's brain is then removed | `Input` for the camera key only; answers by React key handler (1 to 9, T, Enter) and canvas pointer | none |
| Tableau | `World` via `buildScenario`, `analysePass` | `SimView` (rebuilt when the pitch size changes), overlays, labels, cameras including cinematic | ours: `KeeperBrain`, `PhaseBrain(UserCarrierBrain(HoldBrain))`; opponents `ShadowBrain` or `PhaseBrain` with `DefenderBrain` | none in the 3D view; SVG pointer events in React | none |
| Analyse | replay world; `passOptions`, `defensiveLines` for the layers | `SimView`, overlays (paths, markers, lanes, lines), cameras including cinematic; `GameLoop` with `world.step` and `simulate` disabled | none | none (React key handler: Space, arrows, C; canvas pointer to select a player) | `ReplayPlayer` (`seek`, `ballPath`, `playerPath`) |
| Académie list, Parcours | none | none (the list uses the 2D `Pitch` component) | none | none | none |

Every 3D screen checks WebGL first (`hasWebGL` in `shared/ui.tsx`) and shows `NoWebGL` without it; the menu
backdrop simply stays empty.

## Persistence

- **IndexedDB `ndamba-jeux`** (Dexie, version 1), defined in `shared/save.ts`, separate from the app's
  database `njangi`. Tables: `drills` (`DrillProgress` per lesson id: levels won, best points, best Indice,
  attempts), `attempts` (`AttemptLog`, indexed by game, key, time), `replays` (`ReplayRow`, only the 6 newest
  are kept), `story` (Lionceaux), `kv`. If IndexedDB fails once, every later call uses an in-memory copy for
  the rest of the session. Nothing is sent to a server and nothing is linked to the app's profile.
- **Writers.** `Lesson.tsx` calls `recordDrill` (which also logs an attempt) and `saveReplay` once per result,
  for Académie lessons (key = drill id) and the Défi (key `DIX`). `Lecture.tsx` calls `logAttempt` with key
  `lecture` when a series ends. `Tableau.tsx` keeps the last board in `kv` (`tableau.last`) and can put a board
  in the address as `#b=<base64url JSON>`.
- **Readers.** `Home.tsx`, `Academie.tsx` and `Parcours.tsx` (`allDrillProgress`), `Home.tsx` and
  `Parcours.tsx` (`recentAttempts`), `Analyse.tsx` (`listReplays`), `Tableau.tsx` (`getKV`).
- **localStorage**: `ndamba.jeux.audio` (`shared/audio.ts`), `ndamba.jeux.quality` (written by
  `SettingsSheet` in `shared/ui.tsx`, read by `detectQuality` in `engine/render/stage.ts`), `ndamba.jeux.keys`
  (read by `engine/input/input.ts`; nothing writes it), and the site's language key `njangi.lang`.

## Internationalisation

- All game text goes through `useT('jeux')`: `app/src/i18n/fr/jeux.json` (reference) and
  `app/src/i18n/en/jeux.json`. The English file was added to the working tree during this review
  (2026-10-29, still untracked in git); it has the same 402 keys as the French one. Until it is committed, a
  build from the repository has no English game text and i18next falls back to French
  (`fallbackLng: 'fr'` in `app/src/i18n/index.ts`), around English drill texts.
- Other namespaces: `analysis` (`sub.<key>.name`, sub-index names on the lesson result) and `common`
  (`skills.*`, `intentions.*` in Parcours); both exist in French and English.
- Drill texts are picked with `lang === 'en' ? d.en : d.fr` in each component (not the `drillText` helper of
  `app/src/content/index.ts`). `DixPasses.tsx` builds both languages with
  `i18n.t(key, { lng, ns: 'jeux', returnObjects: true })`.
- Plurals use i18next suffixes (`lesson.hud.attempts_one/_other`, `lecture.points_one/_other`,
  `tableau.lines_one/_other`).
- Text outside i18n: the `adaptation` lines of `njangi/drills/gameplay.ts` (French), tome 1 lesson titles in
  Tableau templates (French), the carrier label in `LectureSession.ts`, the speed labels in `Analyse.tsx`.

## Tests

Vitest, configured by `app/vitest.config.ts` (`src/games/**/*.test.ts`, Node environment). `app/package.json`
has no `test` script, so they run with `npx vitest run` from `app/`. They were not run for this document.

| File | What it covers |
|---|---|
| `njangi/drills/demo.test.ts` | Every sheet's numbered sequence plays to the end as a demonstration, for seeds 11, 23 and 5 (64 x 3 runs). |
| `njangi/drills/lessons.test.ts` | A bot plays every lesson at Normal (or `BOT_LEVEL`) through `LessonRunner`; each must reach its result screen within 420 simulated seconds. Winning is not required (`LESSON_REPORT` prints the wins). `BOT_ONE=<ids>` runs one lesson verbosely instead. Timeout 300 s. |
| `njangi/drills/demoDebug.test.ts` | Debug harnesses (`DEMO_DEBUG`, `DEMO_TRACE`), skipped unless those variables are set; no assertions. |
| `njangi/reading/judge.test.ts` | A free man beyond a line makes Progresser valid and a forced pass scores less; a carrier at the box edge should Finir (4 points for the shot); 12 freeze frames are built with our player on the ball and a best answer; the pool has more than 20 sheets. |
| `njangi/tenpasses/challenge.test.ts` | The Défi's demonstration plays to the end; play starts with the ball at our keeper; six outfield opponents. |
| `engine/sim/sim.test.ts` | Ball physics, a pass completed and tagged PASS_OK + PROG, a pass cut out, lane margins, line breaking, and the chapter 32 worked example (Indice 65.1). |
| `engine/render/character.test.ts` | Every hair style, kit and build of the procedural figure builds. |

Not covered: individual scoring rules of `scorer.ts`, `shared/save.ts`, `BoardSession`, `AnalyseSession` and
the record and replay round trip, `Parcours`, i18n completeness, and the claim that `source` lines are verbatim.
`Lesson.tsx` and `Lecture.tsx` expose `window.__lesson` and `window.__lecture` (in development or with `?e2e`)
for browser tests, but no end-to-end spec is in the repository.

## Known gaps

1. English game text was missing from git: `app/src/i18n/en/jeux.json` appeared in the working tree during this
   review but is untracked; without it English players see French menus, briefings, HUD and results.
   **Fixed: `app/src/i18n/en/jeux.json` is committed with the same keys as the French file.**
2. The `adaptation` line of every lesson is French only and shown in English too
   (`njangi/drills/gameplay.ts`, displayed by `njangi/academy/Lesson.tsx`).
3. Tableau templates show tome 1 lesson titles in French whatever the language (`njangi/board/Tableau.tsx`,
   from `app/src/content/lessons.gen.ts`).
4. Hard-coded label `'Ball'` / `'Ballon'` instead of i18n (`njangi/reading/LectureSession.ts`, line 79).
5. Analyse speed labels use a French decimal comma in both languages (`njangi/analysis/Analyse.tsx`,
   `String(v).replace('.', ',')`).
   **Fixed: the comma is used in French only.**
6. Mistakes `no_angle` (30 links) and `same_line` (7 links) are declared and linked to coaching lines in
   `njangi/drills/gameplay.ts` but never detected by `njangi/drills/scorer.ts` or `runner.ts`, so those
   coaching lines can never appear.
   **Fixed: `scorer.supportShape` flags `no_angle` (an opponent close to the receiver on the line of the pass) and `same_line` (a team-mate between the passer and the receiver) when the user passes.**
7. The per-level mapping to the sheets' regressions and progressions (`levels` in all 64 entries) is never
   read; `njangi/drills/types.ts` (lines 88 and 106) says the game offers them, but levels only change the AI
   (`DIFFICULTY` in `engine/sim/types.ts`) and the lane drawing at Facile (`njangi/drills/session.ts`).
8. `restart` is mostly unused: only `other_team_keeps` changes behaviour (`njangi/drills/scorer.ts`, line 366);
   `reset`, `coach_ball` and `keeper_ball` all rebuild the starting picture (`njangi/drills/runner.ts`,
   `nextAttempt`).
9. The `held_too_long` message says a partner was free, but `njangi/drills/scorer.ts` (`update`) only checks
   the time held (3.2 s).
   **Fixed: the message is given only when a team-mate has an open lane (`passOptions`, margin above 0.45 s).**
10. `njangi/drills/catalog.ts` says a sheet without rules is « flagged as such », but the `fallback` flag is
    never shown (latent today: all 64 sheets have rules).
11. The Défi is saved as lesson `DIX` in the `drills` table, and `njangi/academy/Academie.tsx` (line 22) and
    `njangi/Home.tsx` (line 28) count every row, so « 65 sur 64 réussis » is possible.
   **Fixed: the counts use `LESSON_IDS` (the 64 sheets only).**
12. `shared/save.ts` (line 21) documents the Défi key as `'dix-passes'`; the code writes `DIX`.
   **Fixed: the comment now says `DIX`.**
13. Stars disagree: the result screen shows `level index + 1` (`njangi/academy/Lesson.tsx`, line 273), the
    Académie card counts the levels won (`njangi/academy/Academie.tsx`).
   **Fixed: both show the best level won (one star for Facile, two for Normal, three for Difficile).**
14. On the last lesson and in the Défi, the result button labelled « Voir la démonstration » opens the
    briefing (`njangi/academy/Lesson.tsx`, line 323).
   **Fixed: that button now reads « Revoir la consigne ».**
15. An unknown lesson id shows an empty screen with only the top bar (`NotFound` in
    `njangi/academy/Lesson.tsx`, lines 29 to 32).
16. The Défi's game-written rules appear under the heading « La règle du livre » (`lesson.rules`, rendered by
    `njangi/academy/Lesson.tsx` with `dix.rules`), and its browser title starts with `DIX`.
   **Fixed: the Défi passes `rulesLabel` (« La règle du jeu ») and its own tab title.**
17. The Analyse intro (`analyse.intro` in `jeux.json`) and `njangi/analysis/AnalyseSession.ts` cite chapter 6
    for freeze frames; the book's video analysis is chapter 33.
   **Fixed: the intro now cites the freeze frames of chapter 6 and the analyst's video of chapter 33.**
18. Recordings stop after 4 minutes (`MAX_SAMPLES`, `engine/replay.ts` line 12) while a Défi can last longer
    (5 attempts of up to 70 s, set of 600 s); attempt boundaries (`cuts`) are recorded but not used by Analyse.
   **Fixed: recordings now keep eight minutes (`MAX_SAMPLES`), enough for the five attempts of a Défi.**
19. The Lecture maximum is hard-coded as `/ 32` in `njangi/path/Parcours.tsx` (line 107) instead of being
    derived from `SERIES_LENGTH` (`njangi/reading/LectureSession.ts`, line 14).
   **Fixed: the Lecture attempt stores its maximum (`max` in `AttemptLog`) and Parcours shows it.**
20. Changing the graphics quality in the settings sheet only saves it (`shared/ui.tsx`); the running view keeps
    its quality until the next screen is built (`engine/render/stage.ts`, `detectQuality`).
21. No controls screen: most `keys.*` strings, `settings.reducedMotion`, `settings.controls`,
    `lesson.result.backToList`, `academie.levelDone`, `lesson.hud.time` and `lesson.sprint` in `jeux.json` are
    unused, and `saveBindings` in `engine/input/input.ts` is never called. `getReplay` in `shared/save.ts` is
    unused too.
22. A no-op `useEffect(() => {}, [])` in `njangi/BackdropScene.tsx` (line 51).
   **Fixed: removed.**
23. Stale headers: `app/scripts/build-content.mjs` (line 4) still says « the 50 drills of La Méthode Njangi »;
    `app/src/lib/njangi.ts` sets `NJANGI_SOURCE = 'chapter19'` (line 26) while its header cites chapter 32.
24. Test gaps listed above, and no `test` script in `app/package.json`.
