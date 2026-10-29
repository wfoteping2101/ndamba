# LE CODE NJANGI : l'art de posséder, source map

What each mode of the tactical trainer takes from William Foteping's coaching book *Le Code Njangi.
Posséder avec intention*, and what was written for the game. Read from the code and the book sources on
2026-10-29 (commit `2ba8b53` plus the working tree of that day). Nothing here was checked by running the game.

Paths: `njangi/` is `app/src/games/njangi/`, `engine/` is `app/src/games/engine/`, `shared/` is
`app/src/games/shared/`, `jeux.json` is `app/src/i18n/fr/jeux.json` (French reference; English in
`app/src/i18n/en/jeux.json`, same keys). Other paths are from the repository root.

Labels used below:

- **[BOOK]**: the book's own words or data, shown as written (a drill sheet field, a chapter sentence, a diagram).
- **[GAME]**: text written for the game (all of `jeux.json`, the `adaptation` lines of `njangi/drills/gameplay.ts`).
- **[GAME RULE]**: a scoring or judging rule made for the game, even when it is inspired by the book.

## At a glance

| Mode | Route | Book source | Main code files |
|---|---|---|---|
| Menu | `/jeux/code-njangi` (also any unknown sub-path) | Indice Njangi formula, `coach/chapters/32-mesurer-la-possession.md`; no book text | `njangi/Home.tsx`, `njangi/BackdropScene.tsx`, `njangi/NjangiApp.tsx` |
| Académie Njangi | `/jeux/code-njangi/academie`, `/jeux/code-njangi/academie/:id` | All 64 sheets `coach/drills/*.json` (via `DRILLS` in `app/src/content/drills.gen.ts`); families of chapter 31; Indice of chapter 32 | `njangi/academy/Academie.tsx`, `njangi/academy/Lesson.tsx`, `njangi/drills/*` |
| Tableau du coach | `/jeux/code-njangi/tableau` (optional `#b=<board>`) | Diagrams of the 64 sheets and of 39 « Leçons du Ballon » of tome 1 (`LESSONS` in `app/src/content/lessons.gen.ts`). Weak link otherwise | `njangi/board/Tableau.tsx`, `njangi/board/BoardSession.ts` |
| Lecture du jeu | `/jeux/code-njangi/lecture` | `coach/chapters/05-les-cinq-intentions.md`; starting pictures of 39 sheets | `njangi/reading/Lecture.tsx`, `LectureSession.ts`, `judge.ts`, `situations.ts` |
| Défi des dix passes | `/jeux/code-njangi/dix-passes` | `tome1/chapters/40-le-but-du-njangi.md` (Leçon du Ballon n°40 and its diagram) and sheet `coach/drills/G06.json` | `njangi/tenpasses/DixPasses.tsx`, `njangi/tenpasses/challenge.ts`, plus the Académie engine |
| Analyse vidéo | `/jeux/code-njangi/analyse` (optional `?dernier=<drill id>`) | The freeze frames of chapter 6 (`coach/chapters/06-la-carte.md`) and the analyst's video of chapter 33 (`33-l-analyste-njangi.md`), both cited in the intro. The tool itself is the game's | `njangi/analysis/Analyse.tsx`, `njangi/analysis/AnalyseSession.ts`, `engine/replay.ts` |
| Parcours de formation | `/jeux/code-njangi/parcours` | Sheet metadata (`skills`, `intentions`); chapter 25 (ten competences, four levels); chapter 5; chapters 4 and 7 (the two reflexes); chapter 32 | `njangi/path/Parcours.tsx`, `shared/save.ts` |

The hub page that links to the game is `/jeux` (`app/src/surfaces/site/Games.tsx`); its texts (`hub.*` in
`jeux.json`) are [GAME].

## How book material reaches the game

- Drill sheets: `coach/drills/*.json` are turned into `DRILLS` (`app/src/content/drills.gen.ts`) by
  `app/scripts/build-content.mjs`. Every field shown in the game comes from there, in French or English.
- Tome 1 lessons: `tome1/chapters/NN-*.md` (the `> [!CARNET] Leçon du Ballon n°NN` block and its diagram)
  become `LESSONS` (`app/src/content/lessons.gen.ts`), French only. 39 of the 40 lessons have a diagram.
- Chapters: `coach/chapters/*.md` are never imported by the game. They reach it in three ways only: links to
  the web reader (`njangi/links.ts`, pages `/book/methode/ch-NN.html` built by `tools/build_books.mjs`),
  rules re-implemented in code (`njangi/reading/judge.ts`, `engine/sim/tagger.ts`, `app/src/lib/njangi.ts`),
  and hand-written summaries in `jeux.json`.
- The Indice Njangi shown by the Menu, the Académie, the Défi and the Parcours is computed by
  `njangiFromCounts` (`app/src/lib/njangi.ts`, chapter 32 sections « L'Indice Njangi », « Les quatorze codes »,
  « Les cinq sous-indices ») from the codes tagged by `engine/sim/tagger.ts` (chapter 32 and chapter 33
  « Les quatorze boutons »). The formula is the book's; tagging a simulation automatically is the game's.

## 1. Menu

- **Player**: sees a live rondo behind the menu, the next lesson to play, an Indice, the six modes, a link to
  the book (`/book/methode/`).
- **Book material**: none shown. The backdrop rondo (`njangi/BackdropScene.tsx`, constant `SPEC`) is [GAME],
  not a sheet. « Votre Indice Njangi » is the mean of the Indice of the five most recent attempts that have one
  (`njangi/Home.tsx`), [GAME RULE] on top of the chapter 32 formula.
- **Text**: all [GAME] (`njangi.*`, `hub.codeNjangi.*`); lesson ids and titles on the « next » card are [BOOK].
- **Outcome**: none.

## 2. Académie Njangi

- **Player**: picks one of the 64 sheets (filter by family), reads the briefing, watches the numbered
  sequence played in 3D, then plays it at Facile, Normal or Difficile, controlling either the decisions
  (choose each pass) or the ball carrier. A result screen gives stars, points, an Indice and the sheet's own
  coaching lines for the mistakes seen.
- **Book material**:
  - Every sheet `coach/drills/C01.json` to `G06.json` (14 technique C, 8 rondos R, 10 position P, 8 small
    games S, 6 large games L, 6 phases F, 6 transitions T, 6 finishing G), via `DRILLS`, ordered by
    `njangi/drills/catalog.ts` (`FAMILY_ORDER`, `LESSONS_ORDERED`). The order and code letters follow the table
    of chapter 31, section « Les huit familles » (`coach/chapters/31-comment-utiliser-les-fiches.md`).
  - The starting picture and the numbered arrows are the sheet's `diagram` (or `diagram2` for two drills),
    turned into a live world by `njangi/drills/scenario.ts` and played by `njangi/drills/director.ts`.
  - The rules of each lesson are one hand-written `DrillGameplay` per sheet in `njangi/drills/gameplay.ts`
    (64 entries). Each entry lists in `source` the French sentences of its sheet that justify it: all 336
    `source` lines were found verbatim in their sheets for this map (no repo test checks this).
  - « La fiche dans le livre » links to `/book/methode/fiches-<family>.html#drill-<ID>` (`njangi/links.ts`).

| On screen | Origin |
|---|---|
| Id, title, subtitle, « Objectif », « La règle du livre » | [BOOK] sheet `title`, `subtitle`, `objective`, `rules` |
| Diagram on the card (2D) and drawn on the grass (3D), player labels | [BOOK] sheet `diagram` |
| « Ce que dit la fiche » quotes on the result screen | [BOOK] sheet `coaching[i]`, chosen through `feedback` in `gameplay.ts` |
| Family tabs and kicker (« Technique », « Rondos », ...) | [GAME] `academie.families.*` (the book says « Technique et combinaisons », etc.) |
| « Comment réussir » (for example « 6 séquences sans faute ») | [GAME RULE] `target` in `gameplay.ts`, worded by `lesson.target.*` |
| « Adaptation pour le jeu » | [GAME] `adaptation` in `gameplay.ts`, French only |
| Level names and hints, control choice, demo captions, HUD, feed, banners | [GAME] `levels`, `levelHint`, `lesson.*`, `score.*`, `mistake.*`, `fail.*`, `between.*` |
| Indice and its five sub-indices | [BOOK] formula (chapter 32), sub-index names from the `analysis` namespace |

Not shown in the game: the sheets' `organisation`, `progressions`, `regressions`, `measure`, `story`, and the
`source` lines.

**Scoring** (all [GAME RULE], `njangi/drills/runner.ts` and `njangi/drills/scorer.ts`):

- Each lesson has a `mode` (keepball 15, phase 15, ssg 13, transition 8, pattern 7, finishing 6), a set
  length (`duration`: 120 s for 40 lessons, 150 s for 22, one of 90 s, one of 60 s; the sheets' set lengths
  are shortened) and a `target`: points (31 lessons), attempts (27), sequences (3), goals (2), regains (1).
  The target values are chosen by the game; for example C01's sheet measures « Circuits complets sans faute
  en 2 minutes » and the game asks for 6.
- Points come from the `scoring` events detected in play (`ScoreEvent` in `njangi/drills/types.ts`): goal,
  goal after a qualifying action, zone entry, n passes in a row, line crossed, split pass, pausa, third man,
  switch, regain within 5 s, every player touched, a named player touched, sequence completed, shot on target.
  Several reuse the book's codes from the tagger (LINE, FIX2, SWITCH, SHOT_IN, REGAIN5).
- Pattern lessons: the user must play each pass of the numbered sequence to the expected receiver; a wrong
  receiver is refused with a hint. A completed sequence earns its `sequence` points.
- Attempts targets: an attempt ends on a terminal event, a failure listed in `fail`, or its time limit
  (`attemptSeconds`, else 12 to 30 s from the area size). It succeeds with at least `successNeeds` points
  (default 1). The lesson ends when the needed successes are reached, can no longer be reached, the attempts
  run out, or the set time ends.
- Other targets: success as soon as the target is reached; otherwise judged when the set time ends.
- Result: success at a level saves that level as done (one star per level on the Académie card); the result
  screen shows `level index + 1` stars on success. The Indice is computed only if the user's team had at least
  4 actions (PASS_OK + PASS_LOST + LOSS). Mistakes are detected by game heuristics (for example the ball held
  over 3.2 s, although the message adds « alors qu'un partenaire était libre », which the code does not check;
  a lost pass whose lane margin was under 0.15 s); « more than five seconds to win it back » follows the book's
  5 seconds (chapter 7, « Reprendre : les 5 secondes »). Two mistakes the sheets point to, `no_angle` and
  `same_line`, are never detected, so the coaching lines linked to them never appear.

## 3. Défi des dix passes

- **Player**: on the full pitch, starts every attempt from our keeper, must complete at least ten passes and
  score, against six outfield opponents and a keeper. A running counter shows passes and how many of our
  eleven touched the ball. It reuses the Académie lesson screen (`LessonScreen` in `njangi/academy/Lesson.tsx`).
- **Book material**:
  - `tome1/chapters/40-le-but-du-njangi.md`, « Leçon du Ballon n°40 : Le but du Njangi » (line 327): its
    diagram (`LESSONS` entry `no: 40`: keeper F, ten outfield players, eleven numbered passes, three defenders
    and a keeper) is the starting picture (`challengeSpec()` in `njangi/tenpasses/challenge.ts`).
  - `coach/drills/G06.json` « Le but du Njangi »: rule « Le ballon part du gardien et passe par au moins 8 joueurs
    différents avant le tir », rule « Partie 2 : à chaque perte, la séquence repart du gardien », organisation
    « Partie 2 : 4 à 6 adversaires ». Its coaching lines 2, 1 and 4 are used as feedback. The lesson's link
    goes to `/book/tome1/ch-40.html`.
  - The comment in `challenge.ts` and the on-screen adaptation both say the count of ten passes is the game's rule.

| On screen | Origin |
|---|---|
| Title, subtitle, objective | [GAME] `dix.title`, `dix.subtitle`, `dix.objective` (the subtitle reuses the book's title « Le but du Njangi ») |
| Five rules | [GAME] `dix.rules`, paraphrasing G06; shown under the Académie heading « La règle du livre », which is misleading here |
| « Adaptation pour le jeu » | [GAME] `dix.adaptation` (says which rules are the game's) |
| Coaching quotes on the result screen | [BOOK] G06 `coaching` 2, 1, 4 |
| Pitch, our eleven and three defenders | [BOOK] lesson 40 diagram; the three extra opponents `o1` to `o3` (`BLOCK`) are [GAME] |
| Pass and player counter, family kicker « Finition » | [GAME] |

The line « Onze joueurs, onze touches. Personne n'a gardé la caisse. » is cited in `challenge.ts` but not shown.

**Scoring** ([GAME RULE], `CHALLENGE_GAMEPLAY`): five attempts of at most 70 s each (set length 600 s); a goal
after at least ten completed passes in the possession earns 2 points, everyone (outfield) touching the ball
earns 1; an attempt succeeds with 2 points, so only a goal after ten passes counts; one success out of five
wins. A loss, a ball out, a save or the time limit ends the attempt, and the next one restarts from the keeper.
The result is saved like a lesson under the id `DIX`.

## 4. Lecture du jeu

- **Player**: a series of 8 frozen situations. For each: name the intention (one of five), then tap the
  receiver or the goal; read the verdict drawn on the grass; optionally watch the action played out. A summary
  closes the series. The first series of a day is the same for everyone that day; « Nouvelle série » is random.
- **Book material**:
  - `coach/chapters/05-les-cinq-intentions.md`: the question « Que prépare ta passe ? » (line 31) and « On ne juge
    pas la direction du ballon. On juge son intention. » (line 33), section « Une passe se juge à ce qu'elle
    prépare »; the « Déclencheurs » paragraphs of the sections « Sortir » (line 41), « Progresser » (78),
    « Fixer » (94), « Finir » (135), « Respirer » (173). `njangi/reading/judge.ts` turns them into geometry. The
    intro and summary link to `/book/methode/ch-05.html`.
  - Situations (`njangi/reading/situations.ts`, `POOL`) start from the `diagram` of the 39 sheets of the
    position, small game, large game, phase, transition and finishing families that have at least two
    opponents and three of ours: F01 to F06, G02, G04, G05, L01 to L06, P01 to P10, S01 to S08, T01 to T06.
    The AI then plays a few seconds before the freeze, so the frozen picture is not the book's.

| On screen | Origin |
|---|---|
| « Que prépare ta passe ? » | [BOOK] chapter 5 line 31 (also chapter 2, line 58) |
| Intention names Sortir, Progresser, Fixer, Finir, Respirer | [BOOK] chapter 5 section titles |
| Intention short labels (« Sortir du pressing », ...) | [GAME] `intentions.*.short` |
| Line under each verdict (`intentions.*.book`) | [GAME] summary of the chapter 5 triggers, with two verbatim quotes: « Sortir court est un moyen, pas un dogme. » (line 41) and « respirer n'est pas subir, c'est faire courir l'adversaire » (line 175) |
| Notes `forcedLine`, `sidewaysGood` | [GAME] paraphrases of chapter 5 line 82 (Progresser, « Erreurs fréquentes ») and chapter 2 line 58 |
| Other notes, grades, checks, steps, summary lines | [GAME] `lecture.*` |
| Caption above the question (drill id and title) | [BOOK] sheet title |

**Scoring** ([GAME RULE], `judge()` in `judge.ts`): 1 point each for an intention that is possible here, the
strongest intention, a choice that serves the chosen intention, an open lane; 4 per situation, 32 per series.
A series counts as a success at 60 % of the maximum; the summary text changes at 75 % and 50 %. Which
intentions are « possible » uses game thresholds (for example own zone = first 36 % of the length, pressed =
two opponents within 12 m or pressure above 0.4). The strongest intention is taken in the order Finir, Sortir,
Progresser, Fixer, Respirer: that order is the game's. The book's Respirer triggers (after a long effort, a
disorganised team, a score to protect, heat) cannot be read from a frozen picture; the game uses « a safe pass
exists and we are not in our own box under pressure » instead.

## 5. Tableau du coach

- **Player**: draws a situation on a 2D board (players of both teams and neutrals, ball holder, numbered
  passes, runs, dribbles, shots), picks a pitch size, then plays it in 3D against mannequins or active
  defenders at three levels. The board can be shared as a link and is restored on return.
- **Book material**: the template list loads the `diagram` of any of the 64 sheets (`DRILLS`) or of the 39
  tome 1 lessons that have one (`LESSONS`); the notation (`DiagramSpec`, numbered arrows) is the books'. No
  chapter is cited or linked. Beyond the templates, the link to the book is weak.
- **Text**: template labels are [BOOK] titles (drill title in the current language; lesson titles in French
  only, inside the [GAME] pattern « Leçon du Ballon n°{{n}} : {{title}} »). The starter board (`STARTER`),
  tools, help, sizes and pass report are [GAME] (`tableau.*`). The 2D board is drawn by `Tableau.tsx` itself, not
  by the books' diagram renderer.
- **Outcome** ([GAME RULE], no score, nothing saved but the board): the numbered actions run with the
  Académie director; the run ends « done » or « failed » with a reason. Each pass is measured when struck
  (`analysePass`): lane margin in seconds (open above 0.35 s, tight above 0, else closed by a named opponent),
  lines crossed, completed or lost.

## 6. Analyse vidéo

- **Player**: picks one of the six most recent recordings (Académie lessons and Défi attempts), then replays
  it in 3D: play, pause, speeds 0.25x to 2x, frame steps of 0.05 s, jumps between events, layers for the ball
  path, the carrier's passing lanes, opponent lines and a tapped player's path.
- **Book material**: none shown. The intro (`analyse.intro`) refers to « les arrêts sur image du chapitre 6 et
  la vidéo de l'analyste du chapitre 33 ». Chapter 6 (`06-la-carte.md`) uses freeze frames (lines 72 and 171);
  the book's video work is chapter 33 (`33-l-analyste-njangi.md`, « Après le match : la vidéo »). The opponent
  lines and lanes are game measurements. Weak link; no book link on screen.
- **Text**: all [GAME] (`analyse.*`); recording titles are the drill id and title at save time.
- **Outcome**: none.

## 7. Parcours de formation

- **Player**: reads progress per competence and per intention, an Indice trend, the last Lecture score, the
  Défi status, and a suggested next lesson.
- **Book material**: each sheet's `skills` and `intentions` lists (data from `coach/drills/*.json`); the ten
  competences and their four levels of chapter 25 (`25-les-dix-competences.md`, « Comment utiliser les grilles »,
  sections « 1. Scan » to « 10. Prise de décision »); the five intentions of chapter 5 plus the two reflexes
  Reprendre and Regarder devant (chapter 4, « La perte : Reprendre », « La récupération : Regarder devant »;
  chapter 7). Only chapter 5 is linked.
- **Text**: competence and intention names come from the app's `common` vocabulary (book terms); headings,
  hints and the closing note are [GAME]. The note says the levels measure the game, not the coach's assessment,
  which matches chapter 25's rule that players are assessed in play.
- **Outcome** ([GAME RULE]): per competence, stars won on the lessons that train it divided by three times
  their number; level 1 to 4 by quarters (below 0.25, 0.5, 0.75). Intentions: same share and lessons done. Next
  lesson: the first lesson of the weakest competence not yet won at Normal. Indice trend: last 12 attempts with
  an Indice. Lecture: last series out of 32. Défi: won, or the number of tries.

## Weak or unclear links to the book

- Tableau du coach: only the diagrams come from the books; the 3D test and pass measures are the game's.
- Analyse vidéo: replays the player's own attempts; the intro cites chapters 6 (freeze frames) and 33 (video).
- Défi des dix passes: built on the novel's lesson 40 and sheet G06, but the ten-pass rule, the extra
  opponents and the scoring are the game's (stated on screen).
- Lecture du jeu: the intentions and their triggers are the book's; thresholds, the priority order and the
  Respirer substitute are the game's.
- The Menu's backdrop rondo is not a sheet.
