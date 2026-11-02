# NDAMBA changelog

## 0.4.0 (2026-11-01), the stadium lives: crowd, sound, sponsors
- Stands full everywhere (Stade du Wouri: 944 supporters, up from 406): the lower south tier leaves room for the dugouts, the upper tier runs the whole length. Every section is painted in the teams' colours at run time (crowd sheet uses the palette keys like the players): west kop and south-west in the home colours, east kop and south-east in the away colours, north stand mixed with a home majority, some neutrals in their own shirts. Flags in team colours wave on the terraces.
- Crowd animation: idle sway, a Mexican wave that goes round the ground every 30–60 s, the scoring side jumps for four seconds with its flags waving twice as fast, a ripple of fans stands up on every shot. Light mode keeps a thinned, still crowd.
- Stadium sound (setting "Ambiance du stade", on): three new original loops — hand-claps, a tam-tam / djembe section in 12/8, a crowd chant — mixed on top of the murmur and rising with the play (ball near a goal, ball speed), bursting on a shot and on a goal, settling at half time.
- Stadium music (setting "Musique du stade": off / menu / makossa / bikutsi): two original 30-second loops in makossa and bikutsi styles, synthesised in `audio/src/synth.py`. No existing song is used (the real "legends" tracks are copyrighted and cannot be bundled); the loops are originals in the spirit of those styles.
- Sponsor boards drawn at run time from `content/sponsors.json` (the title sponsor, WILLIAM FOTEPING → william-foteping.vercel.app, first; then NDAMBA, Lemon Network, Code Njangi and the original brands), shown on the sixteen boards around the pitch and as "Présenté par …" on the match intro. On the website the game reads `sponsors.json` next to `index.html`, so the admin adds a paying company by editing that file (no rebuild). Players can add their own boards in Réglages → Panneaux sponsors (kept on the device).
- Réglages laid out in two columns (sound and game on the left, controls on the right) so every row fits on screen.
- Crowd sheet / view cell-size mismatch fixed (40 px cells, recorded in crowd.json).

## 0.3.1 (2026-11-01), playability round 2
- Passing: a plain pass always finds a teammate (wide search weighted by the stick direction; a through ball keeps the narrow cone for runs into space), so the kick-off and back passes no longer go to nobody. A chevron under the teammate the assist will pick, with a dotted line, shows the pass before it is played.
- Ball always visible: a ground ring under the ball and a line to its shadow when it is in the air.
- Controller: "Configurer la manette" in Réglages records any pad's buttons (Xbox, PlayStation, Stadia, generic) for pass / shoot / through / switch / sprint / pause; with one human the first pad works whatever index the browser gave it.
- Players can no longer run into the stands (clamped to the playing area).
- Stadiums are full bowls: two-tier stands behind both touchlines and stands behind each goal (crowd thinned to a third in light mode).
- Controls hint no longer covers the stadium intro; it appears at kick-off, above the radar.

## 0.3.0 (2026-11-01), art pass
- Player rig rebuilt at 40 px cells (scale 1.42): fuller torso and limbs, knees and socks, collar ring and sleeve cuffs, eyes with whites and brows, mouth, hair caps that leave the face clear; 36 sheets regenerated; softer two-tone drop shadow.
- Grounds: calmer noise, vertical mowing stripes and painted white lines on grass, worn goalmouths only; finer laterite; fewer pebbles.
- Full stadiums: perimeter advertising boards with original brands (NDAMBA, Lemon Network, Beignets Mami, Benskin Express, Code Njangi, Le ballon voyage, Radio Quartier, Makossa FM), dugouts moved in front of the boards.
- Broadcast vignette overlay on the match (off with reduced motion); name tags and the player arrow raised for the taller sprites.

## 0.2.2 (2026-11-01), control feel ("impossible to control the ball" fixed)
- A control-feel harness (`tests/feel_tests.tscn`) drives the real HumanController with a scripted thumb through the five situations that frustrated the family: loose ball, receiving a pass, dribbling past two pressing defenders, passing with a defender charging the lane, switching when the other side plays a pass. Acceptance: collects every loose ball (avg 0.47 s), traps 22/24 passes, beats two defenders 12/16 times, completes 15/20 passes, control lands on the right player 0.02 s after an opponent pass. Before the changes it was 9/24 passes trapped and 0/16 dribbles.
- Controlled player: collection radius 13 px (AI 8.5) plus a soft magnet (24 px) that pulls a nearby ball to the feet when moving toward it or when it is arriving; first touch almost never bounces off (fail chance x0.35, threshold 260 px/s).
- Auto-run assist (setting, on): with the stick released the controlled player runs onto loose balls and passes meant for him.
- Passing: the receiver is controlled the moment the ball leaves the foot; the assist weights the stick direction most, penalises blocked lanes, and human passes are crisper (x1.15).
- Auto-switch: when the ball is loose or theirs, control goes to the teammate who will reach it, without waiting for the stick to be released.
- Dribbling has a chance: AI lunges once then waits (0.6 to 2.0 s by difficulty), a beaten tackler is stunned 0.6 s, lunges from behind rarely win, tackle odds scale with difficulty (beginner x0.6 to expert x1.2) and the dribbler moving away is harder to catch.
- Responsiveness: kick lock 0.2 s (was 0.3), acceleration +100 px/s², a tap on shoot is a real shot (0.35 power; full charge in 0.7 s), speed presets 0.70 / 0.85 / 1.0, casual difficulty by default, full-pitch zoom 1.15.
- Controller: pad name shown on the title screen, PlayStation button names in the hints when a Sony pad is detected (or chosen in Settings), light graphics mode (auto on phones/browsers: thinner, still crowd).

## 0.2.0 (2026-11-01), "Ndamba Soccer Pixel": 11-a-side, campaigns
- 11v11 on a full-size 105x68 m pitch (new `full` layout, 1140x760 world, proper markings), three stadiums with terraces, floodlights, dugouts and a crowd of 100+ (Stade du Wouri, Stade de la Colline, Stade des Hauts-Plateaux); 7v7 and 5v5 remain on the neighbourhood grounds. Formats are data-driven (lineup/lineup7/lineup11, formation/formation7/formation11) and squads have 18 players.
- Twenty-eight teams (ten Douala, eighteen Yaoundé: Mfandena, Elig-Essono, Tsinga, Étoudi, Nlongkak, Cité Verte, Biyem-Assi, École de Police, Emana, Elig-Edzoa, Odza, Melen, Messa-Si, Olembé, Ngousso, Tongolo, Mvog-Mbi plus Mokolo): four more Douala clubs (Aigles d'Akwa, Port de Bonabéri, Carrefour Ndokoti, Rois de New-Bell) and the three Part I opponents of the novel (Gars de la Pharmacie, Aigles de Makepe, Cobras de Bonabéri).
- Game speed setting (slow / medium / fast; medium by default) applied as a simulation time scale, with the clock still counting real time and the sprite animations following the pace. Default halves 4 minutes.
- HUD rebuilt in the FC style: clock bug with stacked scores, radar, player plates (number, name, stamina pips), name tags over the controlled player and the ball carrier (setting "player names"), labelled touch buttons (PASSE / TIR / GESTE / SPRINT / JOUEUR) and a larger stick.
- Stadium intro: nine-second camera fly-over along the stands with the ground card (name, city, capacity, format) then the two line-ups; any press skips it. QA flag `--intro` keeps it in autoplay.
- Goals are drawn at their logical width (the 3/4 squash no longer narrows the mouth).
- Campaigns: "Les Lionceaux" story (8 chapters mapped from tome 1 with their own opponent, ground, format, weather, objective and lesson), "Ligue des Quartiers" (16 teams, 8 Douala + 8 Yaoundé with yours always in, double round robin of 30 matchdays, other fixtures quick-simulated), "Coupe des Quartiers" (16 teams, round of 16 to final, playable penalty shoot-out scene), "Carrière d'entraîneur" (manager mode: three divisions of 16 clubs, train a Ligue 3 club with the Code Njangi drills, matches simulated by an event model scored with the real Indice Njangi, promotions to Ligue 1 and the 16-team continental cup), "Académie Njangi" (library of the 64 drills with drawn diagrams and a done list).
- Save slots: league, cup, story, manager, academy; results flow back to the campaign screen (`Game.pending`, `return_to`).
- Tests: 2,600+ checks (11v11 match, campaigns, story judge, quick sim, shoot-out) plus separate manager UI and academy test scenes; screenshot helper `tests/screenshot.tscn`.

## 0.1.0 (2026-10-31), first playable
- New Godot 4.7 project `game/` with the complete 5v5 match loop: human vs CPU, CPU vs CPU, friendly setup, result screen, pause, settings, FR/EN.
- Four neighbourhood teams and four grounds; terre battue, grass, sand and rain (mud) surface physics.
- Original pixel-art pipeline (`art/src`) producing every player sheet, ground, prop and crowd; palette-swap shader for kits and skin tones.
- Original synthesized audio (`audio/src`).
- Team AI with five difficulty profiles, goalkeepers with reactions, dives, catches and distribution.
- Rules: kick-off, kick-ins, corners, goal kicks, direct free kicks, penalties (from fouls), goals and crossbar, two halves, accelerated clock, stats.
- Touch overlay for phones and mobile browsers; gamepad and keyboard maps.
- Headless test suite (471 checks) and QA autoplay mode with screenshots.
- Web (PWA, single-threaded) and Windows exports; Android preset prepared (build on the PC).
- Research dossiers under `docs/research`, bible and logs under `docs/game`.
