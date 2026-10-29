# Ndamba games: progress

Branch `jeux` (not merged into `main`, not deployed). Updated 2026-10-29.

## Done

### Shared engine
- Football simulation (ball physics, players, AI brains, lanes, Indice tagging) with unit tests.
- Realistic people: nine archetypes built from MPFB2 CC0 data by `app/tools/humans/`, motion capture
  (CMU) retargeted, fur-shell hair, eyes, fingers, garments cut from the body; story poses with arm IK
  (point, wave, fist, hand on heart, palm, hold, open arms, microphone, embrace, drumming, armrest),
  lying and sitting holds, figures resting on furniture.
- Rendering: quality tiers, two-cascade shadows, GTAO, bloom, broadcast grade, crowds of real figures.
- Input: keyboard, the on-screen pad in the console layout (drawn glyphs, no logos), real gamepads.
- Sound: synthesised effects (kicks, whistle, net, post, thunder, mud, drums, jet engines), ambiences.

### LE CODE NJANGI (`/jeux/code-njangi`)
- Académie (the 64 drill sheets: brief, 3D demonstration, attempt, scoring, book feedback), Tableau du
  coach, Lecture du jeu, Défi des dix passes, Analyse vidéo, Parcours.
- Fixed on 2026-10-29: support mistakes `no_angle` and `same_line` detected, « held too long » only when
  a partner is free, progress counts the 64 sheets only, stars agree, the Défi's rules are labelled as
  the game's, eight-minute recordings, decimal mark per language. See `code-njangi-architecture.md`,
  « Known gaps », for what is left.

### LIONCEAUX (`/jeux/lionceaux`)
- Story engine: beats, verbatim subtitles (tested), cameras, choreography, sets, moods, saves, the
  notebook (« Leçons du Ballon »), the forty lessons playable as diagrams, cast and places sheets.
- Part I scripted from the book, chapters 1 to 8 (see `SOURCE-MAP-LIONCEAUX.md`): 113 beats, 29 played
  moments, 1,222 subtitle lines, every one the book's words, every outcome the book's.
- Part II begun: chapter 9, « La neige de Waldorf », scripted (20 beats, 4 played moments, 172 lines):
  the snow, the neighbours and Biscuit, the yellow bus, the class, Mrs. Patterson's card, the basement
  juggling, the futsal gym with Diego (one touch, the « semelle caramel »). New places for Part II:
  Waldorf under the snow (street and school field), the house with its basement, the classroom, the
  school bus, the community centre gym. Winter clothes for every body (long sleeves, trousers, padded
  coats, ankle socks, claquettes) and a straight bob haircut.
- Chapters 10 to 40 are listed with the book's summary and illustration, their « Leçon du Ballon » is
  playable, and « Lire le chapitre » opens the book; they are not scripted as story yet.

### Site
- `/jeux` hub with both games; both games free, no account.
- Book readers: tome 1 chapters 1 to 9 end with « Jouer ce chapitre dans le jeu Lionceaux »; both book
  indexes link to their game. The games link back to the book chapters and drill sheets.
- English UI text for both games (`app/src/i18n/en/jeux.json`, `en/lionceaux.json`). Lionceaux
  subtitles stay in French (the book exists in French only).

## Checks and how they were run

- `npx tsc --noEmit -p tsconfig.app.json`: no errors.
- `npx vitest run`: 9 test files, 36 tests passed, 3 skipped (debug helpers).
- Story flow: each chapter played end to end in headless Chromium (software WebGL) with
  `?e2e&qa&catchup=4` (the challenges play themselves), watching for page errors, stalls and dead air.
  Results are listed below.
- Screens: desktop 1280 x 720, tablet and phone sizes (see the final report).

## Story flow results

Each chapter played from its first beat to its lesson in headless Chromium (software WebGL, 1280 x 720)
with `?e2e&qa&catchup=4`; « stall » means 25 s without a change of state, « dead air » 7 s of picture
without a subtitle.

| Chapter | Result | Notes |
|---|---|---|
| 4 | completed (474 s) | no page error |
| 5 | completed (405 s) | no page error |
| 6 | completed (369 s) | no page error |
| 7 | completed (724 s) | one stall during the ten passes (slow software frames), it went on by itself |
| 8 | completed (790 s) | one dead-air warning in the cabin, shot fixed afterwards |
| 9 | completed (633 s) | the gym dribble was slow under autoplay (fixed: a beaten defender no longer keeps the ball); one dead-air warning in the basement juggling |

Chapters 1 to 3 were last played end to end on an earlier build; they are re-run with each release.

## Known issues and limits

- Performance on real phones and GPUs is untested here: every check ran on a software renderer. The
  game lowers its quality tier on its own if frames run slow.
- Hugs are approximations (arms in a ring, no contact solving); seat and bed contact is approximate.
- Lionceaux chapters 10 to 40 are not scripted as story yet (Part II continues with ch10, « Les tryouts »).
- Some extras the book does not describe (classmates, futsal players) are generic children in plain
  winter clothes; the dog Biscuit is a simple model.
- ESLint cannot run in this checkout (`@eslint/js` is missing from the dependencies).
