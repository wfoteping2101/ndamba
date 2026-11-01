# NDAMBA changelog

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
