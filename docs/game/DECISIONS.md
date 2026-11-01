# NDAMBA technical and creative decisions log

Each entry: date, decision, why, how to reverse it. Newest first.

## 2026-10-31

- **Engine: Godot 4.7.2, GDScript, Compatibility renderer.** Required for the Web export (WebGL 2), lightest on Android and on the studio PC's Iris Xe, matches the studio template. The earlier Unity prototype (`games/lionceaux-football`) is left untouched as a reference; its ideas (QA autoplay mode, book-faithful kits) were carried over. Reverse: none planned.
- **Project lives inside the Ndamba repo** (`ndamba/game`, `ndamba/art`, `ndamba/audio`, `ndamba/content`, `ndamba/docs`, `ndamba/builds`) as the mission's suggested layout asks, next to the books and the app, so the game reads the real manuscripts and drills from one place. Reverse: move `game/` to `games/ndamba-game` and point `tools/sync_game_content.py` at the new path.
- **Bépanda's club is the Requins de Bépanda, not "Bépanda Athletic".** The book (chapters 3 and 7) names the Requins, blue shirts with a shark fin. Story and world consistency win over the spec's proposal. Reverse: edit `content/gen_teams.py`, one entry.
- **Mokolo Étoiles exist as a game addition.** Tome 1 never visits Yaoundé, but the mission asks for the Yaoundé set; the team card lore says nothing that contradicts the book. The first target match was therefore Mokolo Étoiles vs Requins de Bépanda. Reverse: drop the entry.
- **Lionceaux de Bonamoussadi wear forest green.** In the book the Lionceaux play in their own clothes (ch. 3, "une équipe de chiffons"); green is BriBri's shirt. A proper kit is needed for readability in a 5v5 match. Planned: a "rags" kit mode where each player wears his own colours (Kaydoudou's yellow and red, BriBri's green 8) for story matches. Reverse: set `kit_home.pattern = "rags"` once implemented.
- **5v5 first, book matches are 8v8.** Part I plays 8v8 on the Bonamoussadi ground; the engine is built so the pitch, formation and squad size are data, and 7v7/8v8 are the next formats. Story matches will use the book's format when the larger pitch art exists.
- **Shared key-coloured sprite sheets + palette shader** instead of one sheet per team: 36 sheets cover every kit and skin combination; a team only needs colours. Kaydoudou's mismatched socks are a palette entry, not an asset.
- **Procedural rig instead of hand-placed pixels.** 8 directions x 65 frames x 36 sheets could not be hand-drawn in the time available and would drift in proportions. The rig keeps light, outline and proportions identical everywhere; its sources are editable Python. Known cost: less character in faces at this stage (see TASKS, art polish).
- **Street rules for 5v5**: kick-ins, no offside, goal kicks from the six-metre spot. Matches the mission ("don't force full professional rules onto improvised matches").
- **Accelerated clock** (3 real minutes read as 45). Children like a full-looking match; the result screen says the real length.
- **Human's AI teammates always play at the advanced profile.** A weak teammate AI makes the human's team feel broken; difficulty should bite through the opponents.
- **Web export single-threaded, no COOP/COEP headers required.** Current Godot docs recommend it and it works on Netlify/itch without header configuration (see PLATFORM_FEASIBILITY.md). Threads can be enabled later with the headers.
- **Fonts: Press Start 2P (titles, numbers) and Silkscreen (body), both OFL**, vendored with their licences in `game/assets/fonts`.
- **Audio is synthesized** (numpy) and owned outright. The music loop is explicitly a sketch; a composer brief is in the licences dossier.
- **Nkolndongo** spelling adopted for the Yaoundé neighbourhood list (Nkoldongo kept as alias), per the neighbourhoods dossier.
- **No GodotSteam yet.** Steam Input is served by Godot's native gamepad support for now; GodotSteam GDExtension 4.16.2 (MIT) is the pinned candidate when achievements or Remote Play are added.
- **Builds are not committed to git** (`builds/` is ignored): the Windows exe is 111 MB and the web wasm 40 MB. They are synced to the PC folder directly.

## 2026-11-01, v0.2 rework (after William's play test: "too fast, not enough players, campaigns missing")
- Two pitch layouts in `content/stadiums/pitch.json` (`street` 50x31 m, `full` 105x68 m), both at 8 px/m so the player sprites and the ball physics stay untouched; the stadium decides the layout, the layout decides which formats are legal (11v11 only on a full pitch, 5v5 only on a street ground). Reason: one engine, no retuning of the balance that took a day to settle.
- Game speed is a simulation time scale (0.55 / 0.70 / 0.88) with the match clock counting real seconds and sprite animation `speed_scale` following, instead of retuning every px/s constant. Tests pin the scale to 1.0 (`Game.sim_speed_override`).
- Goals are drawn at their logical width (`yf = 1.0` in `art/src/stadium.py`): the pitch is drawn top-down, so the old 3/4 squash made the mouth look narrower than the ball logic.
- Campaign flow: a campaign scene fills `Game.match_config` (+ `return_to`, `Game.pending`), the match scene's "Continue" goes to the shoot-out when a winner is needed and the score is level, then back to the campaign scene which consumes `Game.last_result` once. Saves per campaign in their own slot.
- Manager mode stays fully simulated (event model scored by the real Indice Njangi) so a season takes minutes, which is the point of training with the Code Njangi week after week.
- GDScript lesson, again: Variant lookups cannot be `:=`-inferred; label captions inside custom Controls need `set_anchors_and_offsets_preset` after `add_child`, never `size =` on an anchored label.
