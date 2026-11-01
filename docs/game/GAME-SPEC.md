# NDAMBA, Les Lionceaux: Football des Quartiers. Game Design Bible (v0.1)

Dedicated to BriBri and Kaydoudou. A premium 2D pixel-art arcade football game about neighbourhood football in Cameroon, built in Godot 4.7 (GDScript, Compatibility renderer) for Web, Windows, Android and Steam.

Companion documents: `docs/research/*` (Batovi analysis, Cameroon neighbourhoods, platform feasibility, licences, book content map), `docs/game/DECISIONS.md`, `docs/game/CHANGELOG.md`, `docs/game/TASKS.md`, `game/README.md`.

## 1. Pillars

1. **Responsive arcade football first.** A match must feel good before anything else: instant input, readable ball, honest physics, intelligent opponents. Reference for feel: Pixel Cup Soccer (studied, not copied).
2. **Terre battue identity.** Red laterite pitches, bamboo goals, benskins, beignets stands, kids on walls, golden-hour light. Every ground is a neighbourhood, not a stadium.
3. **The Njangi.** The ball must travel, and it must know where it is going. Possession with intention is rewarded by the AI, the commentary, the academy and the campaigns.
4. **For children, loved by adults.** Simple controls option, no monetisation traps, French first and English second, nothing cruel.

## 2. Match formats and rules

- Formats: 5v5 first (complete), then 7v7 and 11v11 at larger venues (planned, same engine with larger pitch data).
- 5v5 street rules (implemented): kick-ins instead of throw-ins, corners, goal kicks from the six-metre spot, direct free kicks on fouls, penalties for fouls inside the goal area, no offside, two halves, accelerated clock (one real minute equals 15 displayed minutes, so a half reads 0 to 45).
- Half length options: 2, 3, 5 or 8 real minutes. A half ends at the next dead ball once time is up (12 s grace at most).
- Draws stand in friendlies. Cups add extra time and penalty shoot-outs (planned, Phase 6).

## 3. The pitch and the world

- World: 800 x 520 px. Pitch: 400 x 250 px at 8 px per metre (50 m x 31 m), goals 3.75 m wide and 2.1 m high (30 x 17 px).
- Camera: 640 x 360 design viewport, zoom 1.25, follows the ball with a 0.28 s velocity look-ahead and a small bias toward the attacking goal; clamped to the world; integer scaling on PC, aspect expand on 16:10 handhelds.
- Surfaces are data (`content/stadiums/surfaces.json`): terre battue, grass, sand, mud (rain on terre battue). Each defines rolling deceleration, drag, bounce restitution, bounce speed loss, player speed factor, dust intensity and dribble error. Sand and mud slow everything; grass is fast and true.
- Grounds are data (`content/stadiums/*.json`): props with world positions, crowd spots, goal style (bamboo or metal), lighting tint and a description. Bonamoussadi (book canon), Mokolo market, Bépanda, Deïdo (sand) exist today.

## 4. Ball physics (football/ball.gd)

Ground position + height + velocity + vertical velocity, 60 Hz fixed step. Gravity 78.5 px/s2 (9.81 m/s2). Rolling: constant deceleration plus proportional drag from the surface. Air: light drag only. Bounces with surface restitution and horizontal loss. Goal posts are cylinders (radius 1.6 px, height 17 px) with reflection; the crossbar deflects balls arriving between 16 and 20 px high. Prediction helpers (`predict`, `time_to_reach`) feed the AI.

## 5. Players (football/footballer.gd)

- Attributes 25 to 95: spd, acc, ctl, pas, sho, tak, pos, sta, tmw, vis, gk. They scale speed (94 to 130 px/s run, +34 to +46 sprint), acceleration, control failure on fast balls, pass and shot noise, tackle duels, keeper reach and reaction.
- States: move, kick, tackle, slide, fall, get up, jump, celebrate, sad; keepers add set, dive left/right, catch. Each maps to an animation in the rig sheet, 8 directions.
- Ball control: the ball is taken within 7.5 px of the feet when below 11 px height and not just kicked by the same player; weak controllers let fast balls bounce off. While dribbling the ball runs ahead, more when sprinting and on bad ground (dribble error), so sprinting with the ball is a risk.
- Stamina drains while sprinting and recovers while jogging; speed scales between 72% and 100%.
- Tackles: standing lunge (0.32 s) and slide (0.55 s, longer reach, then get up). Winning a duel compares tackling vs ball control; the dribbler stumbles on a lost duel; a slide from behind is a foul 55% of the time.

## 6. Controls

| Action | Keyboard | Controller | Touch |
|---|---|---|---|
| Move | WASD / arrows | Left stick / d-pad | Floating stick (left side) |
| Sprint | Shift | RB / RT | >> button |
| Pass (defending: tackle) | J | A | A |
| Shoot, hold to charge (defending: slide) | K | B | B |
| Through ball (defending: tackle) | L | X | X |
| Switch player | Space | Y | Y |
| Pause | Esc | Menu | II |

Aim assist (default on) snaps passes to the best teammate in a 55 degree cone and shots to the goal mouth; off, the cone is narrower and shots can miss by up to 30 px. Simple controls (kids): the pass button shoots when close to goal. Auto-switch picks the player closest to where the ball is going when the current one is clearly further and the stick has been released. Touch controls are resizable, dimmable, left-handed switchable.

## 7. AI (football/ai.gd, keeper.gd, team.gd)

- Team coordinator assigns jobs every tick: with_ball, support, chase, press, cover, mark, hold. Formation anchors (1-2-1-1 or 1-1-1-2) shift toward the ball and forward in possession.
- Carrier decisions: shoot when inside range with an open angle (probabilistic), pass to the best-scored teammate (progression, freedom, blocked lanes, teamwork), through ball to runners, dribble while steering around defenders, clear under heavy pressure. Holding too long is penalised.
- Difficulty profiles (beginner to expert) change reaction time (0.55 s to 0.12 s), aim noise, pass error, shooting range, pressing distance, interception quality and a small speed factor (0.84 to 1.06). Physics never changes. The human's own AI teammates always play at the advanced profile.
- Goalkeepers: stand on the ball-to-goal line 6 to 16 px off the line, slide across for balls in reach, dive for the rest after a skill-scaled reaction, come out for loose balls in the box, smother carriers within 20 px, distribute to the freest forward teammate or kick long.
- Balance target (measured by `tests/debug_match.tscn`): 3 to 6 goals and 20 to 35 shots per 3-minute 5v5 match between equal teams.

## 8. Presentation

- HUD: scoreboard with kit colours, accelerated clock, half, event banners (goal, corner, kick-in, free kick), commentary ticker (French and English lines keyed `com.*` in `content/strings.json`), controls hint on the first match, pause menu, result screen with possession, shots, on target, passes, tackles, corners, fouls and scorers.
- Crowd reacts to goals (cheer animation, roar with drums). Dust puffs on terre battue, splashes in rain.
- Audio: synthesized originals (kicks, bounce, whistles, catch, tackle, crowd loop, goal roar, UI) and a placeholder-quality original music sketch for the title. A composer brief lives in `docs/research/REFERENCES_AND_LICENSES.md`.
- Title screen: a live CPU vs CPU match at Bonamoussadi behind the menu. Dedication screen at boot.

## 9. Content model

- `content/teams/*.json`: identity (name, short, city, neighbourhood, colours, crest id, kits home/away/gk with pattern), style, formation, strength, rivals, home ground, bilingual lore, players (bilingual-neutral fictional names, role, number, skin, hair, attributes, optional `socks_mismatch` for Kaydoudou), lineup. Generated by `content/gen_teams.py` from curated identities; re-running never reshuffles.
- `content/stadiums/*.json`, `surfaces.json`, `pitch.json`: see section 3.
- `content/academy/drills_index.json`: the 64 Njangi drills with tiers (built from `coach/drills/*.json`, never retyped).
- `game/content/` is the copy the engine reads (`res://content`). Run `tools/sync_game_content.py` after editing the sources.

## 10. Art pipeline

- `art/src/rig.py`: a parametric 3D stick skeleton rendered to 3/4-view pixel art, 8 directions, all animations; materials painted in key colours; `art/src/palettes.json` holds keys, skin tones and hair colours. `art/src/gen_players.py` writes one sheet per hair style x kit pattern (plain, stripes, hoops, sash, halves, spots) plus keeper sheets. The game recolours sheets at runtime with `shaders/palette.gdshader`.
- `art/src/stadium.py`: ground textures per surface (value noise, worn centre, grass tufts, pebbles, chalk lines painted by hand with wear), goals, houses, mango and palm trees, poles, chairs, benches, vendor stand, benskins, mural wall, crowd sheet (rig-based figures sitting or standing, idle and cheer), ball, dust.
- Review sheets go to `art/previews/`. Nothing is traced from any existing game or photograph.

## 11. Roadmap (phases from the mission)

Done: 0 research, 1 bible and content, 2 art benchmark, 3 playable 5v5 (human vs CPU, CPU vs CPU), 4 cross-platform controls (keyboard, gamepad, touch overlay, web), first Web and Windows exports, headless test suite, QA autoplay with screenshots.
Next: 5 more teams and grounds (Aigles de Makepe, Cobras de Bonabéri, Yaoundé set), 6 Coupe des Quartiers, 7 Ligue des Quartiers, 8 Académie Njangi (Tier 1 drills first), 9 Les Lionceaux story (Part I chapters), 10 world map, 11 wiki, 12 polish (rig detail pass, GK dive art, celebrations, weather), 13 Android build on the PC, 14 Steam and Play preparation.
