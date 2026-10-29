# Ndamba games: architecture

Two games live in the Ndamba site under `/jeux`, built on one shared engine:

| Game | Route | Code | Book |
|---|---|---|---|
| LE CODE NJANGI : l'art de posséder (tactical trainer) | `/jeux/code-njangi/*` | `app/src/games/njangi/` | `coach/` (Le Code Njangi) and `coach/drills/*.json` |
| LIONCEAUX : le ballon qui voyage (story adventure) | `/jeux/lionceaux/*` | `app/src/games/lionceaux/` | `tome1/` (Lionceaux, tome 1) |

The game hub is `/jeux` (`app/src/surfaces/site/Games.tsx`, wired in `app/src/App.tsx`). The hub and both
games are lazy routes: nothing of three.js or the character files loads until a player opens them.
Game One's own architecture is in `code-njangi-architecture.md`; this file covers the shared engine and
Game Two.

## 1. The shared engine (`app/src/games/engine/`)

| Module | Role |
|---|---|
| `sim/world.ts`, `sim/ball.ts`, `sim/pitch.ts`, `sim/types.ts`, `sim/math.ts` | Fixed-step football simulation (60 Hz): players with targets, speed, acceleration and turning cost; ball physics with flight, bounce, posts and nets; passes, shots, dribbling, goals and outs as events. Pure TypeScript, no rendering, tested in `sim/sim.test.ts`. |
| `sim/lanes.ts`, `sim/tagger.ts` | Passing lanes (which line is open) and the event tagger used by the analysis modes of Game One. |
| `ai/brains.ts` | Team AI for free play: support positions, pressing, passing choices. Story actors are scripted and skip it (`meta.scripted`). |
| `input/input.ts` | Keyboard, the on-screen pad and real gamepads (standard mapping) folded into one set of actions: `pass`, `shoot`, `skill`, `sprint`, `pause`, the stick. |
| `runtime.ts` | `GameLoop`: requestAnimationFrame, fixed-step simulation with interpolation, time scale (slow motion), `catchUp` (QA only, see section 5). |
| `render/stage.ts` | The three.js renderer, scene, lights, quality tiers (`low`, `medium`, `high`, saved in `localStorage` key `ndamba.jeux.quality`), two-cascade sun shadows (a wide map and a near map that follows the camera's focus), post-processing (GTAO on high, bloom, colour grade). |
| `render/human.ts`, `render/motion.ts` | The people: skinned figures loaded from `public/jeux/humans/*.glb`, painted at runtime (skin tone, kit colours, number, stripes, mud), hair as fur shells, eyes drawn per pixel, fingers curled per pose. `Motion` drives the motion-capture clips (speed-synced locomotion, kicks timed on the strike, story poses with arm IK, head look). |
| `render/pitchView.ts`, `render/ballView.ts`, `render/overlays.ts`, `render/cameraRig.ts` | Pitch and stadium, the ball (including the story balls: Mami's leather ball, patched, signed), on-grass overlays (lanes, markers, arrows), the camera rig (cuts and glides). |
| `render/character.ts`, `render/animal.ts` | The older procedural figure (kept for its pose tests) and the goat. |
| `replay.ts`, `looks.ts` | Replays for Game One; look helpers. |
| `../shared/Manette.tsx`, `../shared/audio.ts`, `../shared/save.ts`, `../shared/ui.tsx` | The on-screen pad (console layout, drawn glyphs), synthesised sound effects and ambience (no audio files), local saves, shared game UI. |

### Characters: from open data to the screen

`app/tools/humans/` is a Blender (bpy) pipeline, run offline, that builds every figure from the
MakeHuman / MPFB2 CC0 data files (base mesh, macro targets, the game_engine rig and weights):

- `build.py <archetype>` makes a rigged body (boy, boyLean, boyBig, girl, man, woman, womanBig, oldman,
  oldwoman), cuts garments from the body (`garments.py`: football shirt, shorts, socks, boots,
  trainers, long sleeves, trousers, dress), grows hair (`hair.py`), paints skin and brows (`skin.py`),
  decimates with protected seams (hands, feet, scalp), writes `public/jeux/humans/<arch>.glb` and `.json`.
- `motions.py` retargets CMU motion capture (the cgspeed BVH release, free to use) onto the rig and
  writes `motions.bin` / `motions.json` (idle, walks, jog, run, sprint, strafes, kicks with both feet,
  celebrations, talk, sit, sitGround, slip, dance, sew, throw, laugh, mope, getUp...), with the gaze
  levelled in every clip.
- `crowd.py` makes the low-polygon crowd figures (`crowd_*.glb`).

Only the CC0 data files of MPFB2 are read; no third-party code is executed.

## 2. Game Two: Lionceaux (`app/src/games/lionceaux/`)

```
LionceauxApp.tsx      routes: title, chapters, chapter player, notebook, lessons, cast sheet, places
Chapters.tsx          the forty chapters by part (summary, illustration), which can be played, progress
ChapterPlayer.tsx     the player: canvas, subtitles, prompts, hints, the pad, choices, sketch pad
chapters/chNN.ts      one script per chapter (the book's chapter, beat by beat)
chapters/verbatim.test.ts   every subtitle must be found in its chapter of tome1
story/session.ts      runs a chapter: beats in order, lines, cameras, challenges, saves
story/choreo.ts       the director's API used by the scripts (move, pass, shot, arc, pose, say, cam...)
story/challenges.ts   the played moments (dribble, oneTouch, juggle, support, lure, run, penalty,
                      choose, ritual, sketch, drive)
story/camera.ts       framings (on, over, pose, follow, match) turned into camera poses
story/stage.ts        the place: set, World, mood (light, sky, fog, rain), props, mud
story/text.ts         fragments, display, normalisation for the verbatim check
sets/                 the places, built in code: Bonamoussadi (the red-earth pitch, mango tree,
                      Monsieur Bilé's wall, houses, drums, taxi), the family house, Mami's house,
                      the Bafoussam hill, the coach, Douala airport and the plane
cast.ts               who is who, with the looks the book and its character sheets fix
lessons.ts            the 40 « Leçons du Ballon » as playable diagrams
Notebook.tsx, LessonPlay.tsx, CastSheet.tsx, Places.tsx, SketchPad.tsx, progress.ts
```

### A chapter script

A script (`ChapterScript`) is a list of beats:

- `scene`: shots, each with a camera, actions, an optional `play` (movement, passes, shots run by the
  `Choreo`) and the lines shown as subtitles. A scene can be skipped.
- `play`: a challenge (section 3) with its own setup and ending, both scripted.
- `explore`: the player walks a place and talks to the people marked.
- `lesson`: the notebook page of the chapter (the book's « Leçon du Ballon »), then its diagram can be
  played.

Lines are written with three helpers (`chapters/helpers.ts`): `N()` narration, `S(who, ...)` a spoken
line, `T(who, ...)` a thought. A `|` joins fragments of the same chapter (the speech tags are left
out). The verbatim test fails the build if any fragment is not in the chapter's text.

`docs/games/SOURCE-MAP-LIONCEAUX.md` lists every beat of every chapter, generated from the scripts
by `node tools/lionceaux-source-map.mjs`.

## 3. Challenges: the book's outcome is locked

Every played moment is something the book's character does, and its outcome is the book's: a lost
ball, a missed penalty and a lost match are played, never changed. A wrong input never produces an
outcome the book does not have: it gets a hint and the moment waits, or it is replayed.

| Type | What the player does |
|---|---|
| `dribble` | Dribble past defenders one after the other (the Dribbler button when the defender's circle turns gold). The book's ending follows (often the ball is lost). |
| `oneTouch` | The ball comes, time slows: pass first time to the partner the book names (tap him or press Passe). |
| `juggle` | Keep the ball up between the brothers in rhythm (the ten-pass ritual); the crowd's count is the book's. |
| `support` | « Se montrer »: an opponent hides the player from the carrier; two quick steps aside open the line (red, then gold), the ball comes, give it on. |
| `lure` | « Je vais les faire bouger »: the feint draws two opponents; when both have come, the partner is alone (the lane turns gold): pass. Too early, he is still marked; too late, the ball is taken and the moment starts again. |
| `run` | A decoy run into the gold zone, dragging the marker away. |
| `penalty` | Take a penalty (side, then shot) or save one (dive). The result is the book's (a miss flies over, a save goes onto the post); a dive to the wrong side gets « Regarde bien ». |
| `choose` | A frozen picture with options: the book's choice plays; the other options are shown, locked, with the character's own reason from the book. |
| `ritual` | A gesture in steps (fist, hand on the heart, the little finger, two fingers, the bracelet, the hand on the armrest). |
| `sketch` | BriBri's notebook: draw the useful arrow between two circles, to the other side. |
| `drive` | Carry the ball to a target. |

All challenges play themselves in QA mode (`?e2e&qa`), which is how the end-to-end runs reach the end
of each chapter.

## 4. Text, languages, conventions

- Subtitles are the book's French text. Prompts, hints, button labels and menus are game text in
  `app/src/i18n/fr/lionceaux.json` (English: `app/src/i18n/en/lionceaux.json`).
- No em or en dashes and no emoji in game text; touch targets of at least 44 px; lucide icons only;
  `useDocumentTitle` on every page; reduced motion respected by the UI animations.

## 5. QA tooling

- Unit tests (Vitest): `engine/sim/sim.test.ts`, `engine/render/character.test.ts`,
  `lionceaux/chapters/verbatim.test.ts`, `lionceaux/lessons.test.ts`, `lionceaux/SketchPad.test.ts`, and
  Game One's tests (see `code-njangi-architecture.md`).
- Story flags, active in development or with `?e2e`: `?qa` (challenges play themselves, lines read
  fast), `?scene=N` (start at beat N), `?hold=<text>` (stop on the line that starts with it, for a
  screenshot of one shot), `?hq` (no automatic quality drop), `?catchup=N` (a slow software renderer
  may run up to N times more simulation per frame, so a whole chapter can be checked in a headless
  browser).
- In QA mode the session warns `[story] dead air: <beat> shot <n>` in the console when a shot's
  movement outlasts its lines (read at normal speed) by more than three seconds.
